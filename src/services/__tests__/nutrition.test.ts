import { describe, expect, it } from 'vitest'
import type { FoodExtraction } from '../../../shared/analysis'
import { FOOD_DATABASE } from '../../data/foodDatabase'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { MEAL_COMBOS } from '../../data/mealCombos'
import { buildMeal, createEmptyRow, createRowsFromExtraction, summarizeRows } from '../mealService'
import {
  calculateNutrients,
  computeGoalFit,
  localNutritionProvider,
  resolveMealCombo,
  roundNutrients,
  sumNutrients,
} from '../nutritionService'
import { describeNutritionRationale, generateNutritionTarget, mergeInBodyMeasurements } from '../nutritionTargetService'
import { DEMO_PROFILE, DEMO_WORKOUT_PROFILE } from '../../data/mockData'
import type { WorkoutProfile } from '../../types'

function findCombo(id: string) {
  const combo = MEAL_COMBOS.find((c) => c.id === id)
  if (!combo) throw new Error(`combo not found: ${id}`)
  return combo
}

const extraction: FoodExtraction = {
  isFood: true,
  mealName: '닭가슴살 현미밥 브로콜리',
  foods: [
    { name: '닭가슴살', estimatedGrams: 120, cookingMethod: 'grilled', confidence: 0.91 },
    { name: '현미밥', estimatedGrams: 180, cookingMethod: null, confidence: 0.84 },
    { name: '브로콜리', estimatedGrams: 70, cookingMethod: 'steamed', confidence: 0.8 },
  ],
  overallConfidence: 0.85,
  warnings: [],
}

describe('nutritionService: 이름 → 영양 DB 연결', () => {
  it('정확히 일치하는 이름을 연결한다', () => {
    expect(localNutritionProvider.match('닭가슴살')).toMatchObject({ matchType: 'exact', entry: { id: 'chicken-breast' } })
    expect(localNutritionProvider.match('현미밥')).toMatchObject({ matchType: 'exact', entry: { id: 'brown-rice' } })
  })

  it('띄어쓰기/기호 차이는 무시한다', () => {
    expect(localNutritionProvider.match('연어 포케').entry?.id).toBe('poke-salmon')
    expect(localNutritionProvider.match('BLT 샌드위치').entry?.id).toBe('blt-sandwich')
  })

  it('별칭을 연결한다', () => {
    expect(localNutritionProvider.match('계란')).toMatchObject({ matchType: 'exact', entry: { id: 'egg' } })
    expect(localNutritionProvider.match('공기밥')).toMatchObject({ matchType: 'exact', entry: { id: 'white-rice' } })
  })

  it('수식어가 붙은 이름은 부분 일치로 연결한다', () => {
    expect(localNutritionProvider.match('구운 닭가슴살')).toMatchObject({ matchType: 'partial', entry: { id: 'chicken-breast' } })
  })

  it('DB에 없는 음식은 임의로 만들지 않고 none을 반환한다', () => {
    expect(localNutritionProvider.match('정체불명 특별 메뉴')).toEqual({ entry: null, matchType: 'none' })
    expect(localNutritionProvider.match('')).toEqual({ entry: null, matchType: 'none' })
  })

  it('이번에 확장한 아침 메뉴도 DB에서 바로 연결된다', () => {
    expect(localNutritionProvider.match('북엇국')).toMatchObject({ matchType: 'exact', entry: { id: 'bugeo-guk' } })
    expect(localNutritionProvider.match('전복죽')).toMatchObject({ matchType: 'exact', entry: { id: 'jeonbokjuk' } })
    expect(localNutritionProvider.match('시리얼')).toMatchObject({ matchType: 'exact', entry: { id: 'cereal' } })
    expect(localNutritionProvider.match('아보카도토스트')).toMatchObject({ matchType: 'exact', entry: { id: 'avocado-toast' } })
    expect(localNutritionProvider.match('북어국')).toMatchObject({ matchType: 'exact', entry: { id: 'bugeo-guk' } }) // 별칭
  })

  it('한국식 치킨(배달 치킨)도 DB에서 바로 연결된다', () => {
    expect(localNutritionProvider.match('양념치킨')).toMatchObject({ matchType: 'exact', entry: { id: 'yangnyeom-chicken' } })
    expect(localNutritionProvider.match('후라이드치킨')).toMatchObject({ matchType: 'exact', entry: { id: 'fried-chicken' } })
  })

  it('회식에서 흔한 음식(곱창·피자·안주류)도 DB에서 바로 연결된다', () => {
    expect(localNutritionProvider.match('곱창구이')).toMatchObject({ matchType: 'exact', entry: { id: 'gopchang-grilled' } })
    expect(localNutritionProvider.match('막창구이')).toMatchObject({ matchType: 'exact', entry: { id: 'makchang-grilled' } })
    expect(localNutritionProvider.match('닭발')).toMatchObject({ matchType: 'exact', entry: { id: 'dakbal' } })
    expect(localNutritionProvider.match('고구마피자')).toMatchObject({ matchType: 'exact', entry: { id: 'sweet-potato-pizza' } })
    expect(localNutritionProvider.match('불고기피자')).toMatchObject({ matchType: 'exact', entry: { id: 'bulgogi-pizza' } })
    expect(localNutritionProvider.match('콤비네이션피자')).toMatchObject({ matchType: 'exact', entry: { id: 'combination-pizza' } })
  })

  it('브랜드 공식 메뉴는 이름이 정확히 일치하면 연결되고, brand 필드로 어느 브랜드인지 알 수 있다', () => {
    expect(localNutritionProvider.match('황금올리브치킨')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bbq-golden-olive-chicken', brand: 'BBQ' },
    })
    expect(localNutritionProvider.match('허니콤보')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'kyochon-honey-combo', brand: '교촌' },
    })
  })

  it('"치킨"으로 검색하면 브랜드 메뉴(허니콤보 등 이름에 "치킨"이 없는 것)도 함께 나온다', () => {
    const results = localNutritionProvider.search('치킨', 8)
    const ids = results.map((r) => r.id)
    expect(ids).toContain('bbq-golden-olive-chicken')
    expect(ids).toContain('kyochon-honey-combo')
  })

  it('이번에 추가한 10개 브랜드 메뉴도 이름으로 바로 연결된다', () => {
    expect(localNutritionProvider.match('뿌링클')).toMatchObject({ matchType: 'exact', entry: { id: 'bhc-ppuringkle', brand: 'bhc' } })
    expect(localNutritionProvider.match('고추바사삭')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'goobne-spicy-chicken', brand: '굽네치킨' },
    })
    expect(localNutritionProvider.match('싸이버거')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'momstouch-sai-burger', brand: '맘스터치' },
    })
    expect(localNutritionProvider.match('와퍼')).toMatchObject({ matchType: 'exact', entry: { id: 'burgerking-whopper', brand: '버거킹' } })
    expect(localNutritionProvider.match('빅맥')).toMatchObject({ matchType: 'exact', entry: { id: 'mcdonalds-bigmac', brand: '맥도날드' } })
    expect(localNutritionProvider.match('이탈리안비엠티')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'subway-italian-bmt', brand: '서브웨이' },
    })
    expect(localNutritionProvider.match('단팥빵')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'parisbaguette-red-bean-bread', brand: '파리바게뜨' },
    })
    expect(localNutritionProvider.match('싱글레귤러')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'baskinrobbins-single-regular', brand: '배스킨라빈스' },
    })
  })

  it('브랜드별 변형(롯데리아 불고기버거·도미노 포테이토피자)은 기존 일반 메뉴와 이름이 겹치지 않는다', () => {
    expect(localNutritionProvider.match('불고기버거(롯데리아)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'lotteria-bulgogi-burger', brand: '롯데리아' },
    })
    expect(localNutritionProvider.match('불고기버거')).toMatchObject({ matchType: 'exact', entry: { id: 'bulgogi-burger' } })
    expect(localNutritionProvider.match('포테이토피자(도미노)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'dominos-potato-pizza', brand: '도미노피자' },
    })
    expect(localNutritionProvider.match('포테이토피자')).toMatchObject({ matchType: 'exact', entry: { id: 'potato-pizza' } })
  })

  it('"버거"로 검색하면 브랜드 버거 4종이 모두 나온다', () => {
    const ids = localNutritionProvider.search('버거', 10).map((r) => r.id)
    expect(ids).toContain('momstouch-sai-burger')
    expect(ids).toContain('burgerking-whopper')
    expect(ids).toContain('mcdonalds-bigmac')
    expect(ids).toContain('lotteria-bulgogi-burger')
  })

  it('12개 브랜드를 5~8개 메뉴로 확장한 치킨 브랜드 메뉴가 이름으로 바로 연결된다', () => {
    expect(localNutritionProvider.match('후라이드치킨(BBQ)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bbq-fried-chicken', brand: 'BBQ' },
    })
    expect(localNutritionProvider.match('양념치킨(BBQ)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bbq-yangnyeom-chicken', brand: 'BBQ' },
    })
    expect(localNutritionProvider.match('자메이카통다리구이')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bbq-jamaica-chicken-leg', brand: 'BBQ' },
    })
    expect(localNutritionProvider.match('황금올리브치킨순살')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bbq-golden-olive-boneless', brand: 'BBQ' },
    })
    expect(localNutritionProvider.match('교촌오리지날')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'kyochon-original', brand: '교촌' },
    })
    expect(localNutritionProvider.match('레드콤보')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'kyochon-red-combo', brand: '교촌' },
    })
    expect(localNutritionProvider.match('레드콤보윙')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'kyochon-red-combo-wing', brand: '교촌' },
    })
    expect(localNutritionProvider.match('반반콤보')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'kyochon-half-half-combo', brand: '교촌' },
    })
    expect(localNutritionProvider.match('맛초킹')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bhc-matchoking', brand: 'bhc' },
    })
    expect(localNutritionProvider.match('골드킹')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bhc-goldking', brand: 'bhc' },
    })
    expect(localNutritionProvider.match('볼케이노')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'goobne-volcano', brand: '굽네치킨' },
    })
    expect(localNutritionProvider.match('오리지널')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'goobne-original', brand: '굽네치킨' },
    })
    expect(localNutritionProvider.match('갈비천왕')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'goobne-galbi-king', brand: '굽네치킨' },
    })
  })

  it('확장된 버거·피자·샌드위치 브랜드 메뉴가 이름으로 바로 연결된다', () => {
    expect(localNutritionProvider.match('딥치즈버거')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'momstouch-deep-cheese-burger', brand: '맘스터치' },
    })
    expect(localNutritionProvider.match('치즈와퍼')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'burgerking-cheese-whopper', brand: '버거킹' },
    })
    expect(localNutritionProvider.match('불고기와퍼')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'burgerking-bulgogi-whopper', brand: '버거킹' },
    })
    expect(localNutritionProvider.match('통새우와퍼주니어')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'burgerking-shrimp-whopper-jr', brand: '버거킹' },
    })
    expect(localNutritionProvider.match('상하이스파이시치킨버거')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'mcdonalds-shanghai-spicy-chicken', brand: '맥도날드' },
    })
    expect(localNutritionProvider.match('한우불고기버거')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'lotteria-hanwoo-bulgogi-burger', brand: '롯데리아' },
    })
    expect(localNutritionProvider.match('리아새우')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'lotteria-ria-shrimp', brand: '롯데리아' },
    })
    expect(localNutritionProvider.match('페퍼로니피자(도미노)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'dominos-pepperoni-pizza', brand: '도미노피자' },
    })
    expect(localNutritionProvider.match('불고기피자(도미노)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'dominos-bulgogi-pizza', brand: '도미노피자' },
    })
    expect(localNutritionProvider.match('터키베이컨아보카도')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'subway-turkey-bacon-avocado', brand: '서브웨이' },
    })
  })

  it('확장된 베이커리·아이스크림 브랜드 메뉴가 이름으로 바로 연결된다', () => {
    expect(localNutritionProvider.match('크로와상')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'parisbaguette-croissant', brand: '파리바게뜨' },
    })
    expect(localNutritionProvider.match('소보로빵')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'parisbaguette-sobolo-bread', brand: '파리바게뜨' },
    })
    expect(localNutritionProvider.match('우유식빵')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'parisbaguette-milk-bread', brand: '파리바게뜨' },
    })
    expect(localNutritionProvider.match('아몬드봉봉')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'baskinrobbins-almond-bonbon', brand: '배스킨라빈스' },
    })
    expect(localNutritionProvider.match('체리쥬빌레')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'baskinrobbins-cherry-jubilee', brand: '배스킨라빈스' },
    })
  })

  it('"치킨"으로 검색하면 확장된 브랜드 치킨 메뉴들도 함께 나온다', () => {
    const ids = localNutritionProvider.search('치킨', 20).map((r) => r.id)
    expect(ids).toContain('bbq-fried-chicken')
    expect(ids).toContain('bbq-yangnyeom-chicken')
    expect(ids).toContain('bbq-golden-olive-boneless')
  })

  it('"피자"로 검색하면 도미노 브랜드 피자 2종이 모두 나온다', () => {
    const ids = localNutritionProvider.search('피자', 10).map((r) => r.id)
    expect(ids).toContain('dominos-pepperoni-pizza')
    expect(ids).toContain('dominos-bulgogi-pizza')
  })

  it('새로 추가한 10개 브랜드(KFC·네네치킨·처갓집·한솥도시락·노브랜드버거·피자헛·이삭토스트·죠스떡볶이·던킨도너츠) 메뉴가 이름으로 바로 연결된다', () => {
    expect(localNutritionProvider.match('오리지널치킨(KFC)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'kfc-original-chicken', brand: 'KFC' },
    })
    expect(localNutritionProvider.match('쇼킹핫양념치킨')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'nene-shocking-hot-yangnyeom', brand: '네네치킨' },
    })
    expect(localNutritionProvider.match('후라이드치킨(처갓집)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'cheogajip-fried-chicken', brand: '처갓집양념치킨' },
    })
    expect(localNutritionProvider.match('후라이드치킨')).toMatchObject({ matchType: 'exact', entry: { id: 'fried-chicken' } })
    expect(localNutritionProvider.match('메가치킨마요')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'hansot-mega-chicken-mayo', brand: '한솥도시락' },
    })
    expect(localNutritionProvider.match('바베큐볼')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'nobrand-bbq-ball', brand: '노브랜드버거' },
    })
    expect(localNutritionProvider.match('토핑킹피자')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'pizzahut-topping-king', brand: '피자헛' },
    })
    expect(localNutritionProvider.match('햄치즈토스트')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'isaac-toast-ham-cheese', brand: '이삭토스트' },
    })
    expect(localNutritionProvider.match('떡볶이(죠스떡볶이)')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'jaws-tteokbokki', brand: '죠스떡볶이' },
    })
    expect(localNutritionProvider.match('떡볶이')).toMatchObject({ matchType: 'exact', entry: { id: 'tteokbokki' } })
    expect(localNutritionProvider.match('허니후리터')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'dunkin-honey-fritter', brand: '던킨도너츠' },
    })
  })

  it('"치킨"으로 검색하면 새로 추가한 브랜드 치킨 메뉴도 함께 나온다', () => {
    const ids = localNutritionProvider.search('치킨', 60).map((r) => r.id)
    expect(ids).toContain('kfc-original-chicken')
    expect(ids).toContain('nene-shocking-hot-yangnyeom')
    expect(ids).toContain('cheogajip-fried-chicken')
    expect(ids).toContain('nobrand-bbq-ball')
  })

  it('브랜드당 메뉴를 추가로 늘린 13개 신규 항목이 이름으로 바로 연결된다', () => {
    expect(localNutritionProvider.match('콘소메안심치킨')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bbq-consomme-ansim-chicken', brand: 'BBQ' },
    })
    expect(localNutritionProvider.match('황금올리브속안심')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bbq-golden-olive-ansim', brand: 'BBQ' },
    })
    expect(localNutritionProvider.match('교촌신화')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'kyochon-shinhwa', brand: '교촌' },
    })
    expect(localNutritionProvider.match('뿌링클콤보')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bhc-ppuringkle-combo', brand: 'bhc' },
    })
    expect(localNutritionProvider.match('커링클')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bhc-curlingkle', brand: 'bhc' },
    })
    expect(localNutritionProvider.match('뿌링감자')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'bhc-ppuring-potato', brand: 'bhc' },
    })
    expect(localNutritionProvider.match('오븐바사삭')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'goobne-oven-basasak', brand: '굽네치킨' },
    })
    expect(localNutritionProvider.match('남해마늘바사삭')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'goobne-namhae-garlic-basasak', brand: '굽네치킨' },
    })
    expect(localNutritionProvider.match('바질&토마토피자')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'goobne-basil-tomato-pizza', brand: '굽네치킨' },
    })
    expect(localNutritionProvider.match('통다리살치킨')).toMatchObject({
      matchType: 'exact',
      entry: { id: 'nene-thigh-chicken', brand: '네네치킨' },
    })
  })
})

describe('브랜드 공식 사이트(영양정보표)에서 가져온 추가 메뉴 29개가 DB에 정확히 들어있다', () => {
  const expectedIds = [
    'subway-rotisserie-bbq-chicken',
    'subway-chicken-teriyaki',
    'subway-tuna',
    'subway-steak-cheese',
    'momstouch-nashville-hot-chicken-burger',
    'momstouch-arrabbiata-cheese-burger',
    'momstouch-sai-flex-burger',
    'momstouch-bul-sai-burger',
    'lotteria-hot-crispy-chicken-burger',
    'lotteria-miracle-burger',
    'lotteria-classic-cheese-burger',
    'lotteria-hawaiian-mozzarella-burger',
    'burgerking-long-chicken-burger',
    'burgerking-cheeseburger',
    'burgerking-nugget-king-10',
    'burgerking-cheese-fries',
    'parisbaguette-milk-calcium-cake',
    'parisbaguette-pave-chocolate-cake',
    'parisbaguette-basque-cheesecake',
    'parisbaguette-shine-muscat-rare-cheesecake',
    'baskinrobbins-monster-crunch-cookie',
    'baskinrobbins-chocolate',
    'baskinrobbins-mint-chocolate-chip',
    'baskinrobbins-ny-cheesecake',
    'mcdonalds-mcchicken',
    'mcdonalds-bulgogi-burger',
    'mcdonalds-quarter-pounder-cheese',
    'mcdonalds-double-quarter-pounder-cheese',
    'kfc-hot-crispy-chicken',
    'kfc-got-yangnyeom-chicken',
    'kfc-got-soy-chicken',
    'kfc-zinger-burger',
  ]

  it('모든 id가 FOOD_DATABASE에 정확히 하나씩 존재하고 brand가 지정돼 있다', () => {
    for (const id of expectedIds) {
      const matches = FOOD_DATABASE.filter((f) => f.id === id)
      expect(matches, `id "${id}"가 정확히 1개 있어야 함`).toHaveLength(1)
      expect(matches[0].brand, `id "${id}"는 brand가 있어야 함`).toBeTruthy()
    }
  })

  it('모든 항목이 단백질×4+탄수화물×4+지방×9 ≈ 열량(10% 이내)을 만족한다', () => {
    for (const id of expectedIds) {
      const entry = FOOD_DATABASE.find((f) => f.id === id)!
      const estimated = entry.proteinPer100g * 4 + entry.carbsPer100g * 4 + entry.fatPer100g * 9
      const diffRatio = Math.abs(estimated - entry.caloriesPer100g) / entry.caloriesPer100g
      expect(diffRatio, `id "${id}": 추정 ${estimated}kcal vs 표기 ${entry.caloriesPer100g}kcal`).toBeLessThan(0.1)
    }
  })

  it('이름으로 검색하면 브랜드 태그와 함께 뜬다 (대표 샘플)', () => {
    expect(localNutritionProvider.match('참치(서브웨이)')).toMatchObject({
      matchType: 'exact',
      entry: { brand: '서브웨이' },
    })
    expect(localNutritionProvider.match('징거')).toMatchObject({
      matchType: 'exact',
      entry: { brand: 'KFC' },
    })
    expect(localNutritionProvider.match('클래식치즈버거')).toMatchObject({
      matchType: 'exact',
      entry: { brand: '롯데리아' },
    })
    expect(localNutritionProvider.match('뉴욕치즈케이크')).toMatchObject({
      matchType: 'exact',
      entry: { brand: '배스킨라빈스' },
    })
  })
})

describe('새 브랜드 9곳(스타벅스·뚜레쥬르·크리스피크림도넛·엽기떡볶이·신전떡볶이·투썸플레이스·메가MGC커피·아웃백·설빙) 대표 메뉴 5개씩', () => {
  const expectedIds = [
    'yupddeok-rose-tteokbokki',
    'yupddeok-original',
    'yupddeok-dakbokkeumtang',
    'yupddeok-crispy-cheese-mandu',
    'yupddeok-mala-tteokbokki',
    'sinjeon-tteokbokki',
    'sinjeon-cheese-tteokbokki',
    'sinjeon-cheese-gimbap',
    'sinjeon-spicy-chicken',
    'sinjeon-fried-fishcake',
    'outback-bushman-bread',
    'outback-jim-boomba-steak',
    'outback-mushroom-soup',
    'outback-garden-salad',
    'outback-toowoomba-pasta',
    'tlj-rice-cake',
    'tlj-soboro-bread',
    'tlj-mocha-bread',
    'tlj-red-bean-bread',
    'tlj-strawberry-paradise',
    'kkd-original-glazed',
    'kkd-choco-maximum',
    'kkd-caramel-pretzel',
    'kkd-hwangchijeu-please',
    'kkd-berry-much',
    'sulbing-mini-bungeoppang',
    'sulbing-choco-chip-icecream',
    'sulbing-injeolmi-pint',
    'sulbing-black-sesame-latte',
    'sulbing-mango-ade',
    'twosome-brown-rice-nurungji-chip',
    'twosome-white-butter-cookie',
    'twosome-apple-mint-tea',
    'twosome-citrus-bouquet',
    'twosome-belt-sandwich',
    'mega-cheesecake',
    'mega-red-bean-gelato',
    'mega-blue-lemon-ade',
    'mega-mint-frappe',
    'mega-espresso',
    'starbucks-americano',
    'starbucks-cafe-latte',
    'starbucks-caramel-macchiato',
    'starbucks-vanilla-latte',
    'starbucks-cafe-mocha',
  ]

  it('9개 브랜드 각각 정확히 5개씩, id 45개 전부 FOOD_DATABASE에 brand와 함께 존재한다', () => {
    expect(expectedIds).toHaveLength(45)
    const byBrand = new Map<string, number>()
    for (const id of expectedIds) {
      const matches = FOOD_DATABASE.filter((f) => f.id === id)
      expect(matches, `id "${id}"가 정확히 1개 있어야 함`).toHaveLength(1)
      const brand = matches[0].brand
      expect(brand, `id "${id}"는 brand가 있어야 함`).toBeTruthy()
      byBrand.set(brand!, (byBrand.get(brand!) ?? 0) + 1)
    }
    for (const [brand, count] of byBrand) {
      expect(count, `브랜드 "${brand}"는 5개여야 함`).toBe(5)
    }
    expect(byBrand.size).toBe(9)
  })

  it('모든 항목이 단백질×4+탄수화물×4+지방×9 ≈ 열량(16% 이내)을 만족한다', () => {
    for (const id of expectedIds) {
      const entry = FOOD_DATABASE.find((f) => f.id === id)!
      const estimated = entry.proteinPer100g * 4 + entry.carbsPer100g * 4 + entry.fatPer100g * 9
      const diffRatio = Math.abs(estimated - entry.caloriesPer100g) / entry.caloriesPer100g
      expect(diffRatio, `id "${id}": 추정 ${estimated}kcal vs 표기 ${entry.caloriesPer100g}kcal`).toBeLessThan(0.16)
    }
  })

  it('이름으로 검색하면 브랜드 태그와 함께 뜬다 (대표 샘플)', () => {
    expect(localNutritionProvider.match('카페라떼(스타벅스)')).toMatchObject({
      matchType: 'exact',
      entry: { brand: '스타벅스' },
    })
    expect(localNutritionProvider.match('로제떡볶이(엽기떡볶이)')).toMatchObject({
      matchType: 'exact',
      entry: { brand: '엽기떡볶이' },
    })
    expect(localNutritionProvider.match('떡볶이(신전떡볶이)')).toMatchObject({
      matchType: 'exact',
      entry: { brand: '신전떡볶이' },
    })
    expect(localNutritionProvider.match('오리지널 글레이즈드')).toMatchObject({
      matchType: 'exact',
      entry: { brand: '크리스피크림도넛' },
    })
    expect(localNutritionProvider.match('부쉬맨브레드')).toMatchObject({
      matchType: 'exact',
      entry: { brand: '아웃백' },
    })
  })

  it('"떡볶이"로 검색하면 엽기떡볶이·신전떡볶이·죠스떡볶이 브랜드 메뉴가 모두 뜬다', () => {
    const ids = localNutritionProvider.search('떡볶이', 30).map((r) => r.id)
    expect(ids).toContain('yupddeok-rose-tteokbokki')
    expect(ids).toContain('sinjeon-tteokbokki')
    expect(ids).toContain('jaws-tteokbokki')
  })
})

describe('nutritionService: 계산', () => {
  it('100g당 영양소 × 중량으로 계산한다', () => {
    const chicken = FOOD_DATABASE.find((f) => f.id === 'chicken-breast')!
    const n = calculateNutrients(chicken, 120)
    expect(n.calories).toBeCloseTo(198)
    expect(n.protein).toBeCloseTo(37.2)
  })

  it('중량을 바꾸면 영양소가 비례해서 다시 계산된다', () => {
    const rice = FOOD_DATABASE.find((f) => f.id === 'brown-rice')!
    expect(calculateNutrients(rice, 200).calories).toBeCloseTo(calculateNutrients(rice, 100).calories * 2)
    expect(calculateNutrients(rice, 0).calories).toBe(0)
  })

  it('합산 후 반올림한다', () => {
    const total = roundNutrients(
      sumNutrients([
        { calories: 10.4, protein: 1.4, carbohydrates: 1.4, fat: 1.4, fiber: 1.4 },
        { calories: 10.4, protein: 1.4, carbohydrates: 1.4, fat: 1.4, fiber: 1.4 },
      ]),
    )
    expect(total).toEqual({ calories: 21, protein: 3, carbohydrates: 3, fat: 3, fiber: 3 })
  })
})

describe('mealService', () => {
  it('AI 분석 결과(음식+중량)를 행으로 바꾸고 영양 DB와 연결한다', () => {
    const rows = createRowsFromExtraction(extraction)
    expect(rows.map((r) => [r.name, r.grams, r.entry?.id])).toEqual([
      ['닭가슴살', 120, 'chicken-breast'],
      ['현미밥', 180, 'brown-rice'],
      ['브로콜리', 70, 'broccoli'],
    ])
    const summary = summarizeRows(rows)
    expect(summary.unresolvedCount).toBe(0)
    // 198 + 273.6 + 23.8 = 495.4
    expect(summary.totals.calories).toBe(495)
  })

  it('중량을 수정하면 총 영양소가 다시 계산된다', () => {
    const rows = createRowsFromExtraction(extraction)
    const before = summarizeRows(rows).totals.calories
    const edited = rows.map((r) => (r.name === '현미밥' ? { ...r, grams: 90 } : r))
    const after = summarizeRows(edited).totals.calories
    expect(after).toBeLessThan(before)
    // 현미밥 90g 감소분 ≈ 137kcal (반올림 오차 ±1 허용)
    expect(Math.abs(before - after - 137)).toBeLessThanOrEqual(1)
  })

  it('영양 정보를 찾지 못한 음식은 계산에서 빠지고 unresolved로 집계된다', () => {
    const rows = createRowsFromExtraction({ ...extraction, foods: [...extraction.foods, { name: '정체불명 요리', estimatedGrams: 100, cookingMethod: null, confidence: 0.3 }] })
    const summary = summarizeRows(rows)
    expect(summary.unresolvedCount).toBe(1)
    expect(() => buildMeal({ title: 't', slot: '점심', rows, thumbnail: null })).toThrow()
  })

  it('이름이 비어있는 행은 무시한다', () => {
    const rows = [...createRowsFromExtraction(extraction), createEmptyRow()]
    const summary = summarizeRows(rows)
    expect(summary.activeCount).toBe(3)
    expect(summary.unresolvedCount).toBe(0)
  })

  it('식사 기록(Meal)을 만든다 — 총합은 화면 표시값과 같다', () => {
    const rows = createRowsFromExtraction(extraction)
    const meal = buildMeal({ title: '  ', slot: '저녁', rows, thumbnail: 'data:image/jpeg;base64,xx' })
    const totals = summarizeRows(rows).totals
    expect(meal).toMatchObject({ title: '식사 기록', slot: '저녁', image: 'data:image/jpeg;base64,xx', ...totals })
    expect(meal.foods.map((f) => f.amount)).toEqual(['120g', '180g', '70g'])
    expect(meal.foods).toHaveLength(3)
  })

  it('신뢰도가 낮은 추정 중량을 사용자가 고치지 않고 저장하면 hasLowConfidencePortions가 true다', () => {
    const lowConfidenceExtraction: FoodExtraction = {
      ...extraction,
      foods: [{ name: '닭가슴살', estimatedGrams: 120, cookingMethod: 'grilled', confidence: 0.4 }],
    }
    const rows = createRowsFromExtraction(lowConfidenceExtraction)
    const meal = buildMeal({ title: '식사', slot: '저녁', rows, thumbnail: null })
    expect(meal.hasLowConfidencePortions).toBe(true)
  })

  it('신뢰도가 낮아도 사용자가 그램 수를 직접 고치면 hasLowConfidencePortions가 false다', () => {
    const lowConfidenceExtraction: FoodExtraction = {
      ...extraction,
      foods: [{ name: '닭가슴살', estimatedGrams: 120, cookingMethod: 'grilled', confidence: 0.4 }],
    }
    const rows = createRowsFromExtraction(lowConfidenceExtraction).map((r) => ({ ...r, grams: 150 }))
    const meal = buildMeal({ title: '식사', slot: '저녁', rows, thumbnail: null })
    expect(meal.hasLowConfidencePortions).toBe(false)
  })

  it('신뢰도가 높으면 고치지 않아도 hasLowConfidencePortions가 false다', () => {
    const rows = createRowsFromExtraction(extraction)
    const meal = buildMeal({ title: '식사', slot: '저녁', rows, thumbnail: null })
    expect(meal.hasLowConfidencePortions).toBe(false)
  })
})

describe('nutritionTargetService', () => {
  it('InBody 측정값 중 값이 있는 항목만 프로필에 반영한다', () => {
    const merged = mergeInBodyMeasurements(DEMO_PROFILE, {
      weight: 80,
      skeletalMuscleMass: null,
      bodyFatMass: null,
      bodyFatPercentage: 20.5,
      bodyWater: null,
      proteinMass: null,
      mineralMass: null,
      basalMetabolicRate: 1800,
    })
    expect(merged).toMatchObject({ weight: 80, bodyFatPercentage: 20.5, basalMetabolicRate: 1800 })
    expect(merged.skeletalMuscleMass).toBe(DEMO_PROFILE.skeletalMuscleMass)
    expect(merged.bodyFatMass).toBe(DEMO_PROFILE.bodyFatMass)
  })

  it('InBody 데이터나 목표가 바뀌면 목표가 달라진다', () => {
    const base = generateNutritionTarget(DEMO_PROFILE)
    const heavier = generateNutritionTarget({ ...DEMO_PROFILE, weight: 90, basalMetabolicRate: 1900 })
    const muscle = generateNutritionTarget({ ...DEMO_PROFILE, goal: 'muscle_gain' })
    expect(heavier.protein).toBeGreaterThan(base.protein)
    expect(heavier.calories).toBeGreaterThan(base.calories)
    expect(muscle.calories).toBeGreaterThan(base.calories)
  })

  it('체지방량이 있으면 체중이 아니라 제지방량(체중-체지방량) 기준으로 단백질을 계산한다', () => {
    // DEMO_PROFILE: weight 75, bodyFatMass 13.5, bodyFatPercentage 18(보통), goal fat_loss
    // → 제지방량 61.5 × 2.6(Helms et al. 2014, 보통 체지방률 구간) = 159.9 → 160
    const target = generateNutritionTarget(DEMO_PROFILE)
    expect(target.protein).toBe(160)
  })

  it('체지방감량은 체지방률이 낮을수록(=더 마름) 제지방량당 단백질 계수를 더 높게 쓴다(Helms et al. 2014)', () => {
    // 체지방률 10(male 기준 낮음) → 2.6이 아니라 3.0 적용, 28(male 기준 높음) → 2.3 적용
    const lowBodyFat = generateNutritionTarget({ ...DEMO_PROFILE, bodyFatPercentage: 10 })
    const highBodyFat = generateNutritionTarget({ ...DEMO_PROFILE, bodyFatPercentage: 28 })
    expect(lowBodyFat.protein).toBeGreaterThan(highBodyFat.protein)
    // 둘 다 같은 제지방량(61.5kg)이므로 계수 차이(3.0 vs 2.3)만큼 그대로 비례한다
    expect(lowBodyFat.protein).toBe(Math.round(61.5 * 3.0))
    expect(highBodyFat.protein).toBe(Math.round(61.5 * 2.3))
  })

  it('체지방량이 없으면(간편 온보딩) 체중 기준으로 되돌아간다', () => {
    // weight 75, goal fat_loss → 75 × 1.6 = 120 (체지방량 있을 때의 160보다 작다)
    const target = generateNutritionTarget({ ...DEMO_PROFILE, bodyFatMass: null })
    expect(target.protein).toBe(120)
  })

  it('체지방감량 칼로리 보정은 체중 대비 "주당 변화율(%)"을 7,700kcal/kg으로 역산한다', () => {
    // weight 75, 체지방률 20(보통) → 0.5%/주 → 75*0.005*7700/7 = 412.5 → 413kcal 적자
    // 운동 프로필 없음(workoutProfile 미지정) → 훈련량 "가벼움"으로 간주 → 활동계수 1.375
    // tdee = 1650*1.375 = 2268.75 → 2268.75-413=1855.75 → 10kcal 단위 반올림 → 1860
    const target = generateNutritionTarget({ ...DEMO_PROFILE, bodyFatPercentage: 20 })
    expect(target.calories).toBe(1860)
  })

  it('체지방률이 성별 기준 높은 편이면 체지방감량 목표 변화율을 더 공격적으로 잡는다(0.5%→0.7%/주)', () => {
    const base = generateNutritionTarget({ ...DEMO_PROFILE, bodyFatPercentage: 20 }) // 중간값, 0.5%/주
    const highBodyFat = generateNutritionTarget({ ...DEMO_PROFILE, bodyFatPercentage: 28 }) // male 25 이상, 0.7%/주
    expect(highBodyFat.calories).toBeLessThan(base.calories)
    expect(base.calories - highBodyFat.calories).toBe(170)
  })

  it('체지방률이 성별 기준 낮은 편이면 근손실 방지를 위해 변화율을 늦춘다(0.5%→0.3%/주)', () => {
    const base = generateNutritionTarget({ ...DEMO_PROFILE, bodyFatPercentage: 20 })
    const lowBodyFat = generateNutritionTarget({ ...DEMO_PROFILE, bodyFatPercentage: 10 }) // male 12 미만, 0.3%/주
    expect(lowBodyFat.calories).toBeGreaterThan(base.calories)
    expect(lowBodyFat.calories - base.calories).toBe(160)
  })

  it('근육증가도 체지방률이 높은 편이면 더 보수적인 잉여(0.25%→0.15%/주)를 쓴다', () => {
    const normal = generateNutritionTarget({ ...DEMO_PROFILE, goal: 'muscle_gain', bodyFatPercentage: 20 })
    const highBodyFat = generateNutritionTarget({ ...DEMO_PROFILE, goal: 'muscle_gain', bodyFatPercentage: 28 })
    expect(highBodyFat.calories).toBeLessThan(normal.calories)
  })

  it('체지방감량 목적이 아니면(체중유지) 체지방률과 무관하게 칼로리 보정이 없다', () => {
    const maintained = generateNutritionTarget({ ...DEMO_PROFILE, goal: 'weight_maintain', bodyFatPercentage: 28 })
    const maintainedNoData = generateNutritionTarget({ ...DEMO_PROFILE, goal: 'weight_maintain', bodyFatPercentage: null })
    expect(maintained.calories).toBe(maintainedNoData.calories)
  })

  it('체중이 매우 크거나 작아도 하루 보정폭은 ±750kcal를 넘지 않는다(안전장치)', () => {
    const veryHeavy = generateNutritionTarget({ ...DEMO_PROFILE, weight: 300, bodyFatPercentage: 28 })
    // 운동 프로필 없음 → 훈련량 "가벼움" → 활동계수 1.375 (고정 1.4 아님)
    const tdee = DEMO_PROFILE.basalMetabolicRate * 1.375
    expect(tdee - veryHeavy.calories).toBeLessThanOrEqual(760) // 750 보정 + 10kcal 반올림 여유
  })
})

describe('generateNutritionTarget — 탄수화물/지방 산출 근거(ACSM 운동량 기준 g/kg + IOM AMDR)', () => {
  // bodyFatMass를 비워서 단백질을 체중 기준 고정값(1.4g/kg)으로 두고, 운동량에 따른 탄수화물 변화만 본다.
  const baseProfile = {
    ...DEMO_PROFILE,
    goal: 'weight_maintain' as const,
    bodyFatMass: null,
    basalMetabolicRate: 2000,
    weight: 70,
  }
  const moderateWorkout: WorkoutProfile = { ...DEMO_WORKOUT_PROFILE, weeklyFrequency: 4, sessionDuration: 60 }
  const highWorkout: WorkoutProfile = { ...DEMO_WORKOUT_PROFILE, weeklyFrequency: 6, sessionDuration: 90 }

  it('운동 프로필이 없으면 "가벼운 운동량"으로 간주하고, 운동량이 많을수록 탄수화물 목표가 커진다', () => {
    const none = generateNutritionTarget(baseProfile, null)
    const moderate = generateNutritionTarget(baseProfile, moderateWorkout)
    const high = generateNutritionTarget(baseProfile, highWorkout)
    expect(none.carbohydrates).toBeLessThan(moderate.carbohydrates)
    expect(moderate.carbohydrates).toBeLessThan(high.carbohydrates)
  })

  it('describeNutritionRationale — 체지방감량·보통 체지방률이면 Helms et al. 출처와 실제 적용 계수(2.6g/kg)를 함께 보여준다', () => {
    const rationale = describeNutritionRationale(DEMO_PROFILE, DEMO_WORKOUT_PROFILE)
    expect(rationale.protein.summary).toContain('2.6g/kg')
    expect(rationale.protein.citation).toContain('Helms')
    expect(rationale.carbohydrates.citation).toContain('ACSM')
    expect(rationale.fat.citation).toContain('IOM')
    expect(rationale.fiber.citation).toContain('IOM')
  })

  it('운동량과 무관하게 지방은 항상 총열량의 20~35% 부근(IOM AMDR)에 머문다', () => {
    for (const workoutProfile of [null, moderateWorkout, highWorkout]) {
      const target = generateNutritionTarget(baseProfile, workoutProfile)
      const fatRatio = (target.fat * 9) / target.calories
      expect(fatRatio).toBeGreaterThanOrEqual(0.19) // 그램 반올림 오차 허용
      expect(fatRatio).toBeLessThanOrEqual(0.36)
    }
  })

  it('탄수화물 요구량이 커서 지방이 AMDR 하한 아래로 내려갈 상황이면 탄수화물을 줄여 지방 하한을 지킨다', () => {
    // DEMO_PROFILE 기본 시나리오: 체지방감량이라 단백질 비중이 높고 칼로리가 낮아, 운동량이 적어도 탄수화물 요구가 남는 칼로리보다 크다
    const target = generateNutritionTarget(DEMO_PROFILE, null)
    const fatRatio = (target.fat * 9) / target.calories
    expect(fatRatio).toBeGreaterThanOrEqual(0.19)
  })
})

describe('computeGoalFit — 식사 조합이 어떤 식단 목적에 어울리는지 자동 판정', () => {
  it('고단백 저지방 조합은 체지방감량에 어울린다', () => {
    // 단백질 40g, 지방 5g, 칼로리 300 → proteinToFat 8, proteinPct 53%
    const fits = computeGoalFit({ calories: 300, protein: 40, carbohydrates: 10, fat: 5, fiber: 2 })
    expect(fits).toContain('fat_loss')
  })

  it('지방이 지배적인 조합은 체지방감량·체중유지 어디에도 어울리지 않는다', () => {
    // 삼겹살 구이 양배추쌈과 비슷한 비율 — 단백질 27g, 지방 42g, 칼로리 520
    const fits = computeGoalFit({ calories: 520, protein: 27, carbohydrates: 6, fat: 42, fiber: 2.5 })
    expect(fits).not.toContain('fat_loss')
    expect(fits).not.toContain('weight_maintain')
  })

  it('칼로리가 0 이하면 아무 목적에도 매칭하지 않는다(0으로 나누기 방지)', () => {
    expect(computeGoalFit({ calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 })).toEqual([])
  })

  it('실제 조합: 닭가슴살 현미밥 브로콜리는 체지방감량·근육증가 둘 다에 어울린다', () => {
    const { nutrients } = resolveMealCombo(findCombo('combo-chicken-rice-broccoli'))
    const fits = computeGoalFit(nutrients)
    expect(fits).toContain('fat_loss')
    expect(fits).toContain('muscle_gain')
  })

  it('실제 조합: 삼겹살 구이는 근육증가(벌크용)에만 어울리고 체중유지엔 어울리지 않는다', () => {
    const { nutrients } = resolveMealCombo(findCombo('combo-porkbelly-cabbage'))
    const fits = computeGoalFit(nutrients)
    expect(fits).toEqual(['muscle_gain'])
  })

  it('실제 조합: 아보카도 토스트는 지방 비중이 높아 특정 목적에 어울리지 않는다(중립)', () => {
    const { nutrients } = resolveMealCombo(findCombo('combo-avocado-toast'))
    const fits = computeGoalFit(nutrients)
    expect(fits).toEqual([])
  })
})

describe('AI 분석 방식 결정', () => {
  it('mock은 데모 모드에서 mock을 선택했을 때만 사용한다', () => {
    expect(resolveAnalysisMode(true, 'mock')).toBe('mock')
    expect(resolveAnalysisMode(true, 'real')).toBe('real')
    // 데모가 아니면 저장된 값이 mock이어도 항상 실제 AI
    expect(resolveAnalysisMode(false, 'mock')).toBe('real')
    expect(resolveAnalysisMode(false, 'real')).toBe('real')
  })
})
