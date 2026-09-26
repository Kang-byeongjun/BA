/**
 * 음식 검색용 mock 영양 데이터베이스 (100g 기준).
 *
 * 실제 서비스 연결 지점: 이 배열과 searchFoodDatabase()를 실제 식품 영양 DB
 * (예: 식약처 식품영양성분DB, Edamam/USDA API 등) 조회로 교체하면 된다.
 * 수치는 프로토타입 데모용 추정치이며 실제 영양 성분과 다를 수 있다.
 */
export type FoodCategory = '한식' | '중식' | '일식' | '양식' | '분식' | '디저트' | '음료' | '과일' | '채소' | '재료'

export interface FoodDbEntry {
  id: string
  name: string
  category: FoodCategory
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number
}

export const FOOD_DATABASE: FoodDbEntry[] = [
  // ---------------------------------------------------------------------
  // 재료 (단백질/곡류/기본 식재료)
  // ---------------------------------------------------------------------
  { id: 'chicken-breast', name: '닭가슴살', category: '재료', caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0 },
  { id: 'chicken-thigh', name: '닭다리살', category: '재료', caloriesPer100g: 200, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 10.9, fiberPer100g: 0 },
  { id: 'brown-rice', name: '현미밥', category: '재료', caloriesPer100g: 152, proteinPer100g: 3.2, carbsPer100g: 32, fatPer100g: 1.2, fiberPer100g: 1.9 },
  { id: 'white-rice', name: '흰쌀밥', category: '재료', caloriesPer100g: 143, proteinPer100g: 2.5, carbsPer100g: 31, fatPer100g: 0.3, fiberPer100g: 0.4 },
  { id: 'multigrain-rice', name: '잡곡밥', category: '재료', caloriesPer100g: 140, proteinPer100g: 3, carbsPer100g: 30, fatPer100g: 1, fiberPer100g: 2.2 },
  { id: 'salmon', name: '연어', category: '재료', caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, fiberPer100g: 0 },
  { id: 'avocado', name: '아보카도', category: '재료', caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15, fiberPer100g: 7 },
  { id: 'tofu', name: '두부', category: '재료', caloriesPer100g: 76, proteinPer100g: 8, carbsPer100g: 1.9, fatPer100g: 4.8, fiberPer100g: 0.3 },
  { id: 'egg', name: '달걀', category: '재료', caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, fiberPer100g: 0 },
  { id: 'greek-yogurt', name: '그릭요거트', category: '재료', caloriesPer100g: 97, proteinPer100g: 9, carbsPer100g: 3.6, fatPer100g: 5, fiberPer100g: 0 },
  { id: 'yogurt-plain', name: '플레인 요거트', category: '재료', caloriesPer100g: 61, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3, fiberPer100g: 0 },
  { id: 'sweet-potato', name: '고구마', category: '재료', caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1, fiberPer100g: 3 },
  { id: 'oatmeal', name: '오트밀', category: '재료', caloriesPer100g: 68, proteinPer100g: 2.4, carbsPer100g: 12, fatPer100g: 1.4, fiberPer100g: 1.7 },
  { id: 'almond', name: '아몬드', category: '재료', caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50, fiberPer100g: 12 },
  { id: 'beef-sirloin', name: '소고기 등심', category: '재료', caloriesPer100g: 250, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 17, fiberPer100g: 0 },
  { id: 'beef-tenderloin', name: '소고기 안심', category: '재료', caloriesPer100g: 200, proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 10, fiberPer100g: 0 },
  { id: 'milk', name: '우유', category: '재료', caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, fiberPer100g: 0 },
  { id: 'soy-milk', name: '두유', category: '재료', caloriesPer100g: 54, proteinPer100g: 3.3, carbsPer100g: 5, fatPer100g: 2, fiberPer100g: 0.6 },
  { id: 'bread', name: '식빵', category: '재료', caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2, fiberPer100g: 2.7 },
  { id: 'shrimp', name: '새우', category: '재료', caloriesPer100g: 99, proteinPer100g: 24, carbsPer100g: 0.2, fatPer100g: 0.3, fiberPer100g: 0 },
  { id: 'tuna-can', name: '참치캔', category: '재료', caloriesPer100g: 132, proteinPer100g: 28, carbsPer100g: 0, fatPer100g: 1, fiberPer100g: 0 },
  { id: 'mixed-nuts', name: '견과류믹스', category: '재료', caloriesPer100g: 600, proteinPer100g: 20, carbsPer100g: 20, fatPer100g: 50, fiberPer100g: 8 },
  { id: 'pork-tenderloin', name: '돼지고기 안심', category: '재료', caloriesPer100g: 143, proteinPer100g: 21, carbsPer100g: 0, fatPer100g: 6, fiberPer100g: 0 },
  { id: 'duck-smoked', name: '훈제오리', category: '재료', caloriesPer100g: 250, proteinPer100g: 18, carbsPer100g: 1, fatPer100g: 19, fiberPer100g: 0 },
  { id: 'sausage', name: '소시지', category: '재료', caloriesPer100g: 300, proteinPer100g: 12, carbsPer100g: 3, fatPer100g: 27, fiberPer100g: 0 },
  { id: 'vienna-sausage', name: '비엔나소시지', category: '재료', caloriesPer100g: 250, proteinPer100g: 11, carbsPer100g: 3, fatPer100g: 21, fiberPer100g: 0 },
  { id: 'frankfurter-sausage', name: '프랑크소시지', category: '재료', caloriesPer100g: 320, proteinPer100g: 13, carbsPer100g: 2, fatPer100g: 28, fiberPer100g: 0 },
  { id: 'bacon', name: '베이컨', category: '재료', caloriesPer100g: 380, proteinPer100g: 12, carbsPer100g: 1, fatPer100g: 37, fiberPer100g: 0 },
  { id: 'ham', name: '햄', category: '재료', caloriesPer100g: 210, proteinPer100g: 15, carbsPer100g: 3, fatPer100g: 15, fiberPer100g: 0 },

  // ---------------------------------------------------------------------
  // 한식
  // ---------------------------------------------------------------------
  { id: 'kimchi-jjigae', name: '김치찌개', category: '한식', caloriesPer100g: 90, proteinPer100g: 6, carbsPer100g: 5, fatPer100g: 5, fiberPer100g: 1.5 },
  { id: 'doenjang-jjigae', name: '된장찌개', category: '한식', caloriesPer100g: 45, proteinPer100g: 4, carbsPer100g: 3, fatPer100g: 2, fiberPer100g: 1 },
  { id: 'sundubu-jjigae', name: '순두부찌개', category: '한식', caloriesPer100g: 70, proteinPer100g: 6, carbsPer100g: 4, fatPer100g: 4, fiberPer100g: 1 },
  { id: 'bibimbap', name: '비빔밥', category: '한식', caloriesPer100g: 190, proteinPer100g: 6, carbsPer100g: 32, fatPer100g: 4, fiberPer100g: 3 },
  { id: 'bulgogi', name: '불고기', category: '한식', caloriesPer100g: 180, proteinPer100g: 20, carbsPer100g: 6, fatPer100g: 9, fiberPer100g: 0.5 },
  { id: 'galbitang', name: '갈비탕', category: '한식', caloriesPer100g: 120, proteinPer100g: 12, carbsPer100g: 3, fatPer100g: 7, fiberPer100g: 0.3 },
  { id: 'samgyetang', name: '삼계탕', category: '한식', caloriesPer100g: 150, proteinPer100g: 15, carbsPer100g: 4, fatPer100g: 8, fiberPer100g: 0.3 },
  { id: 'gimbap', name: '김밥', category: '한식', caloriesPer100g: 160, proteinPer100g: 5, carbsPer100g: 28, fatPer100g: 3, fiberPer100g: 1.5 },
  { id: 'tteokbokki', name: '떡볶이', category: '한식', caloriesPer100g: 190, proteinPer100g: 4, carbsPer100g: 38, fatPer100g: 2, fiberPer100g: 1.5 },
  { id: 'japchae', name: '잡채', category: '한식', caloriesPer100g: 150, proteinPer100g: 3, carbsPer100g: 22, fatPer100g: 6, fiberPer100g: 1.5 },
  { id: 'yukgaejang', name: '육개장', category: '한식', caloriesPer100g: 100, proteinPer100g: 10, carbsPer100g: 5, fatPer100g: 5, fiberPer100g: 1 },
  { id: 'mul-naengmyeon', name: '물냉면', category: '한식', caloriesPer100g: 110, proteinPer100g: 4, carbsPer100g: 22, fatPer100g: 1, fiberPer100g: 1.2 },
  { id: 'bibim-naengmyeon', name: '비빔냉면', category: '한식', caloriesPer100g: 150, proteinPer100g: 5, carbsPer100g: 28, fatPer100g: 2, fiberPer100g: 1.5 },
  { id: 'kalguksu', name: '칼국수', category: '한식', caloriesPer100g: 110, proteinPer100g: 4, carbsPer100g: 20, fatPer100g: 2, fiberPer100g: 1 },
  { id: 'pork-belly', name: '삼겹살', category: '한식', caloriesPer100g: 331, proteinPer100g: 17, carbsPer100g: 0, fatPer100g: 28, fiberPer100g: 0 },
  { id: 'pork-jeyuk', name: '제육볶음', category: '한식', caloriesPer100g: 210, proteinPer100g: 18, carbsPer100g: 9, fatPer100g: 13, fiberPer100g: 1 },
  { id: 'dak-galbi', name: '닭갈비', category: '한식', caloriesPer100g: 180, proteinPer100g: 16, carbsPer100g: 10, fatPer100g: 8, fiberPer100g: 1 },
  { id: 'gopchang-jeongol', name: '곱창전골', category: '한식', caloriesPer100g: 200, proteinPer100g: 14, carbsPer100g: 5, fatPer100g: 14, fiberPer100g: 1 },
  { id: 'gamjatang', name: '감자탕', category: '한식', caloriesPer100g: 150, proteinPer100g: 12, carbsPer100g: 6, fatPer100g: 9, fiberPer100g: 1 },
  { id: 'budae-jjigae', name: '부대찌개', category: '한식', caloriesPer100g: 140, proteinPer100g: 9, carbsPer100g: 8, fatPer100g: 8, fiberPer100g: 1 },
  { id: 'kongnamul-gukbap', name: '콩나물국밥', category: '한식', caloriesPer100g: 70, proteinPer100g: 4, carbsPer100g: 12, fatPer100g: 1, fiberPer100g: 1.5 },
  { id: 'seolleongtang', name: '설렁탕', category: '한식', caloriesPer100g: 90, proteinPer100g: 10, carbsPer100g: 2, fatPer100g: 4, fiberPer100g: 0.2 },
  { id: 'galbi-jjim', name: '갈비찜', category: '한식', caloriesPer100g: 220, proteinPer100g: 18, carbsPer100g: 8, fatPer100g: 13, fiberPer100g: 0.5 },
  { id: 'yangnyeom-galbi', name: '양념갈비', category: '한식', caloriesPer100g: 260, proteinPer100g: 20, carbsPer100g: 6, fatPer100g: 17, fiberPer100g: 0.3 },
  { id: 'namul-muchim', name: '나물무침', category: '한식', caloriesPer100g: 45, proteinPer100g: 2, carbsPer100g: 6, fatPer100g: 2, fiberPer100g: 2.5 },
  { id: 'gyeran-jjim', name: '계란찜', category: '한식', caloriesPer100g: 110, proteinPer100g: 9, carbsPer100g: 2, fatPer100g: 7, fiberPer100g: 0 },
  { id: 'miyeok-guk', name: '미역국', category: '한식', caloriesPer100g: 35, proteinPer100g: 3, carbsPer100g: 3, fatPer100g: 1, fiberPer100g: 1 },
  { id: 'nakji-bokkeum', name: '낙지볶음', category: '한식', caloriesPer100g: 130, proteinPer100g: 15, carbsPer100g: 8, fatPer100g: 4, fiberPer100g: 1 },
  { id: 'agu-jjim', name: '아귀찜', category: '한식', caloriesPer100g: 110, proteinPer100g: 14, carbsPer100g: 7, fatPer100g: 3, fiberPer100g: 1.5 },
  { id: 'sundae', name: '순대', category: '한식', caloriesPer100g: 165, proteinPer100g: 9, carbsPer100g: 17, fatPer100g: 7, fiberPer100g: 0.5 },
  { id: 'jokbal', name: '족발', category: '한식', caloriesPer100g: 280, proteinPer100g: 22, carbsPer100g: 1, fatPer100g: 20, fiberPer100g: 0 },
  { id: 'bossam', name: '보쌈', category: '한식', caloriesPer100g: 230, proteinPer100g: 20, carbsPer100g: 3, fatPer100g: 15, fiberPer100g: 0 },
  { id: 'pajeon', name: '파전', category: '한식', caloriesPer100g: 200, proteinPer100g: 7, carbsPer100g: 22, fatPer100g: 9, fiberPer100g: 1 },
  { id: 'bibim-guksu', name: '비빔국수', category: '한식', caloriesPer100g: 160, proteinPer100g: 5, carbsPer100g: 30, fatPer100g: 2, fiberPer100g: 1.5 },
  { id: 'kongguksu', name: '콩국수', category: '한식', caloriesPer100g: 140, proteinPer100g: 8, carbsPer100g: 18, fatPer100g: 4, fiberPer100g: 2 },
  { id: 'chueotang', name: '추어탕', category: '한식', caloriesPer100g: 90, proteinPer100g: 10, carbsPer100g: 4, fatPer100g: 3, fiberPer100g: 1 },
  { id: 'maeuntang', name: '매운탕', category: '한식', caloriesPer100g: 90, proteinPer100g: 12, carbsPer100g: 4, fatPer100g: 3, fiberPer100g: 1 },
  { id: 'dubu-jorim', name: '두부조림', category: '한식', caloriesPer100g: 100, proteinPer100g: 9, carbsPer100g: 4, fatPer100g: 6, fiberPer100g: 0.5 },
  { id: 'siraegi-guk', name: '시래기국', category: '한식', caloriesPer100g: 40, proteinPer100g: 3, carbsPer100g: 4, fatPer100g: 1, fiberPer100g: 2 },
  { id: 'kimchi', name: '김치', category: '한식', caloriesPer100g: 15, proteinPer100g: 1.1, carbsPer100g: 2.4, fatPer100g: 0.5, fiberPer100g: 1.6 },
  { id: 'kkakdugi', name: '깍두기', category: '한식', caloriesPer100g: 20, proteinPer100g: 1, carbsPer100g: 4, fatPer100g: 0.2, fiberPer100g: 1.5 },
  { id: 'sausage-vegetable-stirfry', name: '소시지야채볶음', category: '한식', caloriesPer100g: 190, proteinPer100g: 9, carbsPer100g: 10, fatPer100g: 13, fiberPer100g: 1.5 },

  // ---------------------------------------------------------------------
  // 중식
  // ---------------------------------------------------------------------
  { id: 'jjajangmyeon', name: '짜장면', category: '중식', caloriesPer100g: 200, proteinPer100g: 6, carbsPer100g: 32, fatPer100g: 6, fiberPer100g: 1.5 },
  { id: 'jjamppong', name: '짬뽕', category: '중식', caloriesPer100g: 130, proteinPer100g: 8, carbsPer100g: 15, fatPer100g: 4, fiberPer100g: 1.5 },
  { id: 'tangsuyuk', name: '탕수육', category: '중식', caloriesPer100g: 260, proteinPer100g: 12, carbsPer100g: 22, fatPer100g: 14, fiberPer100g: 1 },
  { id: 'mapo-tofu', name: '마파두부', category: '중식', caloriesPer100g: 130, proteinPer100g: 8, carbsPer100g: 6, fatPer100g: 9, fiberPer100g: 1 },
  { id: 'yangjangpi', name: '양장피', category: '중식', caloriesPer100g: 150, proteinPer100g: 9, carbsPer100g: 15, fatPer100g: 6, fiberPer100g: 1 },
  { id: 'dongpo-rou', name: '동파육', category: '중식', caloriesPer100g: 320, proteinPer100g: 15, carbsPer100g: 3, fatPer100g: 28, fiberPer100g: 0 },
  { id: 'kkanpunggi', name: '깐풍기', category: '중식', caloriesPer100g: 240, proteinPer100g: 15, carbsPer100g: 18, fatPer100g: 13, fiberPer100g: 0.5 },
  { id: 'yurinji', name: '유린기', category: '중식', caloriesPer100g: 210, proteinPer100g: 17, carbsPer100g: 14, fatPer100g: 10, fiberPer100g: 0.5 },
  { id: 'gochu-japchae', name: '고추잡채', category: '중식', caloriesPer100g: 150, proteinPer100g: 10, carbsPer100g: 10, fatPer100g: 8, fiberPer100g: 1.5 },
  { id: 'chinese-fried-rice', name: '중식볶음밥', category: '중식', caloriesPer100g: 200, proteinPer100g: 6, carbsPer100g: 30, fatPer100g: 6, fiberPer100g: 1 },
  { id: 'palbochae', name: '팔보채', category: '중식', caloriesPer100g: 120, proteinPer100g: 10, carbsPer100g: 8, fatPer100g: 5, fiberPer100g: 1.5 },
  { id: 'jeongabok', name: '전가복', category: '중식', caloriesPer100g: 140, proteinPer100g: 12, carbsPer100g: 8, fatPer100g: 7, fiberPer100g: 1 },
  { id: 'malatang', name: '마라탕', category: '중식', caloriesPer100g: 110, proteinPer100g: 7, carbsPer100g: 8, fatPer100g: 6, fiberPer100g: 1.5 },
  { id: 'malaxiangguo', name: '마라샹궈', category: '중식', caloriesPer100g: 220, proteinPer100g: 12, carbsPer100g: 10, fatPer100g: 15, fiberPer100g: 1.5 },
  { id: 'dimsum', name: '딤섬', category: '중식', caloriesPer100g: 180, proteinPer100g: 8, carbsPer100g: 20, fatPer100g: 7, fiberPer100g: 1 },
  { id: 'gunmandu', name: '군만두', category: '중식', caloriesPer100g: 220, proteinPer100g: 8, carbsPer100g: 24, fatPer100g: 10, fiberPer100g: 1.2 },
  { id: 'lajiji', name: '라조기', category: '중식', caloriesPer100g: 230, proteinPer100g: 16, carbsPer100g: 14, fatPer100g: 12, fiberPer100g: 0.5 },
  { id: 'cream-shrimp', name: '크림새우', category: '중식', caloriesPer100g: 250, proteinPer100g: 12, carbsPer100g: 12, fatPer100g: 17, fiberPer100g: 0.3 },
  { id: 'chili-shrimp', name: '칠리새우', category: '중식', caloriesPer100g: 150, proteinPer100g: 15, carbsPer100g: 10, fatPer100g: 5, fiberPer100g: 0.5 },
  { id: 'ganshao-shrimp', name: '깐쇼새우', category: '중식', caloriesPer100g: 170, proteinPer100g: 16, carbsPer100g: 12, fatPer100g: 6, fiberPer100g: 0.5 },
  { id: 'niurou-mian', name: '우육면', category: '중식', caloriesPer100g: 120, proteinPer100g: 8, carbsPer100g: 18, fatPer100g: 3, fiberPer100g: 1 },
  { id: 'hotpot', name: '훠궈', category: '중식', caloriesPer100g: 180, proteinPer100g: 14, carbsPer100g: 4, fatPer100g: 12, fiberPer100g: 0.5 },
  { id: 'wonton-noodle', name: '완탕면', category: '중식', caloriesPer100g: 110, proteinPer100g: 7, carbsPer100g: 16, fatPer100g: 2, fiberPer100g: 1 },
  { id: 'egg-fried-rice', name: '계란볶음밥', category: '중식', caloriesPer100g: 190, proteinPer100g: 6, carbsPer100g: 28, fatPer100g: 6, fiberPer100g: 1 },

  // ---------------------------------------------------------------------
  // 일식
  // ---------------------------------------------------------------------
  { id: 'sushi-salmon', name: '연어초밥', category: '일식', caloriesPer100g: 145, proteinPer100g: 10, carbsPer100g: 12, fatPer100g: 6, fiberPer100g: 2 },
  { id: 'sushi-tuna', name: '참치초밥', category: '일식', caloriesPer100g: 130, proteinPer100g: 14, carbsPer100g: 12, fatPer100g: 2, fiberPer100g: 2 },
  { id: 'sushi-shrimp', name: '새우초밥', category: '일식', caloriesPer100g: 120, proteinPer100g: 10, carbsPer100g: 14, fatPer100g: 2, fiberPer100g: 1.5 },
  { id: 'udon', name: '우동', category: '일식', caloriesPer100g: 110, proteinPer100g: 4, carbsPer100g: 22, fatPer100g: 1, fiberPer100g: 1 },
  { id: 'soba', name: '소바', category: '일식', caloriesPer100g: 100, proteinPer100g: 4, carbsPer100g: 20, fatPer100g: 1, fiberPer100g: 1.5 },
  { id: 'tonkotsu-ramen', name: '돈코츠라멘', category: '일식', caloriesPer100g: 180, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 7, fiberPer100g: 1 },
  { id: 'gyudon', name: '규동', category: '일식', caloriesPer100g: 180, proteinPer100g: 10, carbsPer100g: 22, fatPer100g: 6, fiberPer100g: 1 },
  { id: 'katsudon', name: '가츠동', category: '일식', caloriesPer100g: 210, proteinPer100g: 12, carbsPer100g: 25, fatPer100g: 7, fiberPer100g: 1 },
  { id: 'oyakodon', name: '오야코동', category: '일식', caloriesPer100g: 160, proteinPer100g: 11, carbsPer100g: 20, fatPer100g: 4, fiberPer100g: 1 },
  { id: 'tendon', name: '텐동', category: '일식', caloriesPer100g: 200, proteinPer100g: 8, carbsPer100g: 28, fatPer100g: 7, fiberPer100g: 1 },
  { id: 'tonkatsu', name: '돈카츠', category: '일식', caloriesPer100g: 300, proteinPer100g: 15, carbsPer100g: 18, fatPer100g: 20, fiberPer100g: 1 },
  { id: 'karaage', name: '치킨가라아게', category: '일식', caloriesPer100g: 260, proteinPer100g: 17, carbsPer100g: 12, fatPer100g: 17, fiberPer100g: 0.5 },
  { id: 'takoyaki', name: '타코야키', category: '일식', caloriesPer100g: 210, proteinPer100g: 7, carbsPer100g: 22, fatPer100g: 10, fiberPer100g: 1 },
  { id: 'okonomiyaki', name: '오코노미야키', category: '일식', caloriesPer100g: 190, proteinPer100g: 8, carbsPer100g: 20, fatPer100g: 9, fiberPer100g: 1.5 },
  { id: 'hoedeopbap', name: '회덮밥', category: '일식', caloriesPer100g: 160, proteinPer100g: 14, carbsPer100g: 20, fatPer100g: 2, fiberPer100g: 1.5 },
  { id: 'salmon-don', name: '연어덮밥', category: '일식', caloriesPer100g: 180, proteinPer100g: 14, carbsPer100g: 20, fatPer100g: 5, fiberPer100g: 1 },
  { id: 'unadon', name: '우나기동', category: '일식', caloriesPer100g: 220, proteinPer100g: 14, carbsPer100g: 22, fatPer100g: 9, fiberPer100g: 0.5 },
  { id: 'miso-soup', name: '미소시루', category: '일식', caloriesPer100g: 30, proteinPer100g: 3, carbsPer100g: 3, fatPer100g: 1, fiberPer100g: 1 },
  { id: 'onigiri', name: '오니기리', category: '일식', caloriesPer100g: 170, proteinPer100g: 4, carbsPer100g: 35, fatPer100g: 1, fiberPer100g: 0.7 },
  { id: 'edamame', name: '에다마메', category: '일식', caloriesPer100g: 120, proteinPer100g: 11, carbsPer100g: 10, fatPer100g: 5, fiberPer100g: 5 },
  { id: 'yakitori', name: '야키토리', category: '일식', caloriesPer100g: 200, proteinPer100g: 18, carbsPer100g: 4, fatPer100g: 13, fiberPer100g: 0.3 },
  { id: 'shabu-shabu', name: '샤브샤브', category: '일식', caloriesPer100g: 130, proteinPer100g: 12, carbsPer100g: 6, fatPer100g: 7, fiberPer100g: 1.5 },
  { id: 'gyukatsu', name: '규카츠', category: '일식', caloriesPer100g: 280, proteinPer100g: 16, carbsPer100g: 15, fatPer100g: 18, fiberPer100g: 0.5 },
  { id: 'nabe', name: '나베', category: '일식', caloriesPer100g: 100, proteinPer100g: 9, carbsPer100g: 6, fatPer100g: 5, fiberPer100g: 1 },
  { id: 'poke-salmon', name: '연어 포케', category: '일식', caloriesPer100g: 145, proteinPer100g: 10, carbsPer100g: 12, fatPer100g: 6, fiberPer100g: 2 },

  // ---------------------------------------------------------------------
  // 양식
  // ---------------------------------------------------------------------
  { id: 'carbonara', name: '까르보나라 파스타', category: '양식', caloriesPer100g: 210, proteinPer100g: 8, carbsPer100g: 24, fatPer100g: 9, fiberPer100g: 1 },
  { id: 'tomato-pasta', name: '토마토 파스타', category: '양식', caloriesPer100g: 150, proteinPer100g: 5, carbsPer100g: 26, fatPer100g: 3, fiberPer100g: 2 },
  { id: 'alfredo-pasta', name: '알프레도 파스타', category: '양식', caloriesPer100g: 220, proteinPer100g: 7, carbsPer100g: 24, fatPer100g: 11, fiberPer100g: 1 },
  { id: 'margherita-pizza', name: '마르게리타 피자', category: '양식', caloriesPer100g: 250, proteinPer100g: 10, carbsPer100g: 30, fatPer100g: 10, fiberPer100g: 2 },
  { id: 'pepperoni-pizza', name: '페퍼로니 피자', category: '양식', caloriesPer100g: 280, proteinPer100g: 12, carbsPer100g: 28, fatPer100g: 14, fiberPer100g: 1.8 },
  { id: 'risotto', name: '리조또', category: '양식', caloriesPer100g: 170, proteinPer100g: 4, carbsPer100g: 26, fatPer100g: 5, fiberPer100g: 1 },
  { id: 'caesar-salad', name: '시저샐러드', category: '양식', caloriesPer100g: 150, proteinPer100g: 6, carbsPer100g: 8, fatPer100g: 11, fiberPer100g: 2 },
  { id: 'green-salad', name: '그린샐러드', category: '양식', caloriesPer100g: 40, proteinPer100g: 2, carbsPer100g: 5, fatPer100g: 1.5, fiberPer100g: 2 },
  { id: 'salisbury-steak', name: '함박스테이크', category: '양식', caloriesPer100g: 220, proteinPer100g: 15, carbsPer100g: 10, fatPer100g: 14, fiberPer100g: 0.5 },
  { id: 'omelette', name: '오믈렛', category: '양식', caloriesPer100g: 160, proteinPer100g: 12, carbsPer100g: 2, fatPer100g: 12, fiberPer100g: 0 },
  { id: 'cream-soup', name: '크림수프', category: '양식', caloriesPer100g: 90, proteinPer100g: 3, carbsPer100g: 8, fatPer100g: 5, fiberPer100g: 0.5 },
  { id: 'potato-soup', name: '감자스프', category: '양식', caloriesPer100g: 80, proteinPer100g: 2, carbsPer100g: 12, fatPer100g: 3, fiberPer100g: 1 },
  { id: 'gratin', name: '그라탕', category: '양식', caloriesPer100g: 190, proteinPer100g: 8, carbsPer100g: 18, fatPer100g: 10, fiberPer100g: 1 },
  { id: 'lasagna', name: '라자냐', category: '양식', caloriesPer100g: 200, proteinPer100g: 10, carbsPer100g: 18, fatPer100g: 10, fiberPer100g: 1.2 },
  { id: 'grilled-chicken-breast', name: '치킨브레스트구이', category: '양식', caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0 },
  { id: 'salmon-steak', name: '연어스테이크', category: '양식', caloriesPer100g: 210, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 14, fiberPer100g: 0 },
  { id: 'cheeseburger', name: '치즈버거', category: '양식', caloriesPer100g: 290, proteinPer100g: 15, carbsPer100g: 24, fatPer100g: 16, fiberPer100g: 1.2 },
  { id: 'french-fries', name: '프렌치프라이', category: '양식', caloriesPer100g: 310, proteinPer100g: 3, carbsPer100g: 41, fatPer100g: 15, fiberPer100g: 3.5 },
  { id: 'hotdog', name: '핫도그', category: '양식', caloriesPer100g: 260, proteinPer100g: 10, carbsPer100g: 20, fatPer100g: 15, fiberPer100g: 1 },
  { id: 'blt-sandwich', name: 'BLT 샌드위치', category: '양식', caloriesPer100g: 250, proteinPer100g: 10, carbsPer100g: 26, fatPer100g: 12, fiberPer100g: 1.5 },
  { id: 'club-sandwich', name: '클럽샌드위치', category: '양식', caloriesPer100g: 230, proteinPer100g: 14, carbsPer100g: 24, fatPer100g: 8, fiberPer100g: 1.5 },
  { id: 'bagel', name: '베이글', category: '양식', caloriesPer100g: 250, proteinPer100g: 10, carbsPer100g: 48, fatPer100g: 1.5, fiberPer100g: 2 },
  { id: 'croissant', name: '크루아상', category: '양식', caloriesPer100g: 400, proteinPer100g: 8, carbsPer100g: 45, fatPer100g: 21, fiberPer100g: 2.5 },
  { id: 'pancake', name: '팬케이크', category: '양식', caloriesPer100g: 230, proteinPer100g: 6, carbsPer100g: 38, fatPer100g: 7, fiberPer100g: 1 },
  { id: 'waffle', name: '와플', category: '양식', caloriesPer100g: 290, proteinPer100g: 7, carbsPer100g: 40, fatPer100g: 12, fiberPer100g: 1.5 },
  { id: 'greek-salad', name: '그릭샐러드', category: '양식', caloriesPer100g: 110, proteinPer100g: 5, carbsPer100g: 6, fatPer100g: 8, fiberPer100g: 2 },
  { id: 'meatball-pasta', name: '미트볼 파스타', category: '양식', caloriesPer100g: 190, proteinPer100g: 10, carbsPer100g: 22, fatPer100g: 7, fiberPer100g: 1.5 },
  { id: 'clam-chowder', name: '클램차우더', category: '양식', caloriesPer100g: 100, proteinPer100g: 6, carbsPer100g: 10, fatPer100g: 4, fiberPer100g: 0.5 },
  { id: 'garlic-bread', name: '갈릭브레드', category: '양식', caloriesPer100g: 320, proteinPer100g: 7, carbsPer100g: 40, fatPer100g: 14, fiberPer100g: 2 },
  { id: 'bbq-ribs', name: 'BBQ 폭립', category: '양식', caloriesPer100g: 300, proteinPer100g: 20, carbsPer100g: 10, fatPer100g: 20, fiberPer100g: 0.3 },
  { id: 'roast-chicken', name: '로스트치킨', category: '양식', caloriesPer100g: 190, proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 9, fiberPer100g: 0 },
  { id: 'pilaf', name: '필라프', category: '양식', caloriesPer100g: 160, proteinPer100g: 4, carbsPer100g: 28, fatPer100g: 3, fiberPer100g: 1 },
  { id: 'cobb-salad', name: '콥샐러드', category: '양식', caloriesPer100g: 130, proteinPer100g: 10, carbsPer100g: 6, fatPer100g: 8, fiberPer100g: 2 },

  // ---------------------------------------------------------------------
  // 분식
  // ---------------------------------------------------------------------
  { id: 'ramen-instant', name: '라면', category: '분식', caloriesPer100g: 138, proteinPer100g: 3, carbsPer100g: 20, fatPer100g: 5, fiberPer100g: 1 },
  { id: 'twigim', name: '튀김모둠', category: '분식', caloriesPer100g: 250, proteinPer100g: 6, carbsPer100g: 25, fatPer100g: 14, fiberPer100g: 1.5 },
  { id: 'gimmari', name: '김말이튀김', category: '분식', caloriesPer100g: 220, proteinPer100g: 5, carbsPer100g: 22, fatPer100g: 12, fiberPer100g: 1 },
  { id: 'eomuk-tang', name: '어묵탕', category: '분식', caloriesPer100g: 80, proteinPer100g: 7, carbsPer100g: 8, fatPer100g: 2, fiberPer100g: 0.5 },
  { id: 'hotbar', name: '핫바', category: '분식', caloriesPer100g: 200, proteinPer100g: 10, carbsPer100g: 12, fatPer100g: 12, fiberPer100g: 0.5 },
  { id: 'rabokki', name: '라볶이', category: '분식', caloriesPer100g: 200, proteinPer100g: 5, carbsPer100g: 32, fatPer100g: 6, fiberPer100g: 1.5 },
  { id: 'gyeranppang', name: '계란빵', category: '분식', caloriesPer100g: 220, proteinPer100g: 8, carbsPer100g: 26, fatPer100g: 8, fiberPer100g: 0.5 },
  { id: 'bungeoppang', name: '붕어빵', category: '분식', caloriesPer100g: 220, proteinPer100g: 5, carbsPer100g: 42, fatPer100g: 3, fiberPer100g: 1.5 },
  { id: 'hotteok', name: '호떡', category: '분식', caloriesPer100g: 260, proteinPer100g: 4, carbsPer100g: 45, fatPer100g: 7, fiberPer100g: 1 },
  { id: 'sugar-toast', name: '설탕버터토스트', category: '분식', caloriesPer100g: 300, proteinPer100g: 6, carbsPer100g: 45, fatPer100g: 10, fiberPer100g: 1 },

  // ---------------------------------------------------------------------
  // 디저트
  // ---------------------------------------------------------------------
  { id: 'chocolate-cake', name: '초코케이크', category: '디저트', caloriesPer100g: 380, proteinPer100g: 5, carbsPer100g: 45, fatPer100g: 20, fiberPer100g: 2 },
  { id: 'cheesecake', name: '치즈케이크', category: '디저트', caloriesPer100g: 320, proteinPer100g: 6, carbsPer100g: 28, fatPer100g: 21, fiberPer100g: 0.5 },
  { id: 'macaron', name: '마카롱', category: '디저트', caloriesPer100g: 400, proteinPer100g: 6, carbsPer100g: 55, fatPer100g: 18, fiberPer100g: 1 },
  { id: 'donut', name: '도넛', category: '디저트', caloriesPer100g: 370, proteinPer100g: 5, carbsPer100g: 48, fatPer100g: 18, fiberPer100g: 1 },
  { id: 'ice-cream', name: '아이스크림', category: '디저트', caloriesPer100g: 210, proteinPer100g: 4, carbsPer100g: 24, fatPer100g: 11, fiberPer100g: 0.5 },
  { id: 'patbingsu', name: '팥빙수', category: '디저트', caloriesPer100g: 150, proteinPer100g: 4, carbsPer100g: 30, fatPer100g: 2, fiberPer100g: 2 },
  { id: 'tiramisu', name: '티라미수', category: '디저트', caloriesPer100g: 300, proteinPer100g: 5, carbsPer100g: 30, fatPer100g: 18, fiberPer100g: 0.5 },
  { id: 'cookie', name: '쿠키', category: '디저트', caloriesPer100g: 480, proteinPer100g: 6, carbsPer100g: 60, fatPer100g: 24, fiberPer100g: 2 },
  { id: 'apple-pie', name: '애플파이', category: '디저트', caloriesPer100g: 260, proteinPer100g: 3, carbsPer100g: 38, fatPer100g: 11, fiberPer100g: 1.5 },
  { id: 'brownie', name: '브라우니', category: '디저트', caloriesPer100g: 400, proteinPer100g: 5, carbsPer100g: 50, fatPer100g: 20, fiberPer100g: 2 },
  { id: 'jelly', name: '젤리', category: '디저트', caloriesPer100g: 320, proteinPer100g: 4, carbsPer100g: 78, fatPer100g: 0, fiberPer100g: 0 },
  { id: 'pudding', name: '푸딩', category: '디저트', caloriesPer100g: 150, proteinPer100g: 4, carbsPer100g: 20, fatPer100g: 6, fiberPer100g: 0 },

  // ---------------------------------------------------------------------
  // 음료
  // ---------------------------------------------------------------------
  { id: 'americano', name: '아메리카노', category: '음료', caloriesPer100g: 2, proteinPer100g: 0.1, carbsPer100g: 0.3, fatPer100g: 0, fiberPer100g: 0 },
  { id: 'cafe-latte', name: '카페라떼', category: '음료', caloriesPer100g: 60, proteinPer100g: 3, carbsPer100g: 5, fatPer100g: 3, fiberPer100g: 0 },
  { id: 'cola', name: '콜라', category: '음료', caloriesPer100g: 42, proteinPer100g: 0, carbsPer100g: 10.6, fatPer100g: 0, fiberPer100g: 0 },
  { id: 'orange-juice', name: '오렌지주스', category: '음료', caloriesPer100g: 45, proteinPer100g: 0.7, carbsPer100g: 10, fatPer100g: 0.2, fiberPer100g: 0.2 },
  { id: 'strawberry-smoothie', name: '딸기 스무디', category: '음료', caloriesPer100g: 70, proteinPer100g: 1, carbsPer100g: 16, fatPer100g: 0.5, fiberPer100g: 1 },
  { id: 'milk-tea', name: '밀크티', category: '음료', caloriesPer100g: 55, proteinPer100g: 1.5, carbsPer100g: 9, fatPer100g: 1.5, fiberPer100g: 0 },
  { id: 'sports-drink', name: '이온음료', category: '음료', caloriesPer100g: 25, proteinPer100g: 0, carbsPer100g: 6, fatPer100g: 0, fiberPer100g: 0 },
  { id: 'green-tea', name: '녹차', category: '음료', caloriesPer100g: 1, proteinPer100g: 0, carbsPer100g: 0.2, fatPer100g: 0, fiberPer100g: 0 },
  { id: 'yogurt-smoothie', name: '요거트 스무디', category: '음료', caloriesPer100g: 90, proteinPer100g: 3, carbsPer100g: 15, fatPer100g: 2, fiberPer100g: 0.5 },

  // ---------------------------------------------------------------------
  // 과일
  // ---------------------------------------------------------------------
  { id: 'banana', name: '바나나', category: '과일', caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, fiberPer100g: 2.6 },
  { id: 'apple', name: '사과', category: '과일', caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, fiberPer100g: 2.4 },
  { id: 'grape', name: '포도', category: '과일', caloriesPer100g: 69, proteinPer100g: 0.7, carbsPer100g: 18, fatPer100g: 0.2, fiberPer100g: 0.9 },
  { id: 'strawberry', name: '딸기', category: '과일', caloriesPer100g: 33, proteinPer100g: 0.7, carbsPer100g: 8, fatPer100g: 0.3, fiberPer100g: 2 },
  { id: 'watermelon', name: '수박', category: '과일', caloriesPer100g: 30, proteinPer100g: 0.6, carbsPer100g: 8, fatPer100g: 0.2, fiberPer100g: 0.4 },
  { id: 'orange', name: '오렌지', category: '과일', caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1, fiberPer100g: 2.4 },
  { id: 'pear', name: '배', category: '과일', caloriesPer100g: 57, proteinPer100g: 0.4, carbsPer100g: 15, fatPer100g: 0.1, fiberPer100g: 3.1 },
  { id: 'kiwi', name: '키위', category: '과일', caloriesPer100g: 61, proteinPer100g: 1.1, carbsPer100g: 15, fatPer100g: 0.5, fiberPer100g: 3 },
  { id: 'mango', name: '망고', category: '과일', caloriesPer100g: 60, proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4, fiberPer100g: 1.6 },
  { id: 'blueberry', name: '블루베리', category: '과일', caloriesPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14, fatPer100g: 0.3, fiberPer100g: 2.4 },
  { id: 'pineapple', name: '파인애플', category: '과일', caloriesPer100g: 50, proteinPer100g: 0.5, carbsPer100g: 13, fatPer100g: 0.1, fiberPer100g: 1.4 },
  { id: 'peach', name: '복숭아', category: '과일', caloriesPer100g: 39, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.3, fiberPer100g: 1.5 },
  { id: 'grapefruit', name: '자몽', category: '과일', caloriesPer100g: 42, proteinPer100g: 0.8, carbsPer100g: 11, fatPer100g: 0.1, fiberPer100g: 1.6 },
  { id: 'cherry', name: '체리', category: '과일', caloriesPer100g: 63, proteinPer100g: 1.1, carbsPer100g: 16, fatPer100g: 0.2, fiberPer100g: 2.1 },

  // ---------------------------------------------------------------------
  // 채소
  // ---------------------------------------------------------------------
  { id: 'broccoli', name: '브로콜리', category: '채소', caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4, fiberPer100g: 2.6 },
  { id: 'potato', name: '감자', category: '채소', caloriesPer100g: 77, proteinPer100g: 2, carbsPer100g: 17, fatPer100g: 0.1, fiberPer100g: 2.2 },
  { id: 'spinach', name: '시금치', category: '채소', caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 2.2 },
  { id: 'tomato', name: '토마토', category: '채소', caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, fiberPer100g: 1.2 },
  { id: 'cabbage', name: '양배추', category: '채소', caloriesPer100g: 25, proteinPer100g: 1.3, carbsPer100g: 6, fatPer100g: 0.1, fiberPer100g: 2.5 },
  { id: 'cucumber', name: '오이', category: '채소', caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, fiberPer100g: 0.5 },
  { id: 'carrot', name: '당근', category: '채소', caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2, fiberPer100g: 2.8 },
  { id: 'eggplant', name: '가지', category: '채소', caloriesPer100g: 25, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.2, fiberPer100g: 3 },
  { id: 'paprika', name: '파프리카', category: '채소', caloriesPer100g: 31, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.3, fiberPer100g: 2.1 },
  { id: 'mushroom', name: '양송이버섯', category: '채소', caloriesPer100g: 22, proteinPer100g: 3.1, carbsPer100g: 3.3, fatPer100g: 0.3, fiberPer100g: 1 },
  { id: 'bean-sprout', name: '콩나물', category: '채소', caloriesPer100g: 30, proteinPer100g: 3, carbsPer100g: 4, fatPer100g: 0.5, fiberPer100g: 2.5 },
  { id: 'zucchini', name: '애호박', category: '채소', caloriesPer100g: 20, proteinPer100g: 1.2, carbsPer100g: 4, fatPer100g: 0.2, fiberPer100g: 1 },
  { id: 'radish', name: '무', category: '채소', caloriesPer100g: 18, proteinPer100g: 0.6, carbsPer100g: 4, fatPer100g: 0.1, fiberPer100g: 1.6 },
]

export function searchFoodDatabase(query: string, limit = 6): FoodDbEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return FOOD_DATABASE.filter((f) => f.name.toLowerCase().includes(q)).slice(0, limit)
}
