import { X } from 'lucide-react'

interface UpdateItem {
  title: string
  detail: string
}

interface UpdateGroup {
  emoji: string
  title: string
  items: UpdateItem[]
}

// 팀원 데모용 변경 내역. 전문 용어 없이 "사용자에게 뭐가 달라지는지" 중심으로 쓴다.
// 날짜가 바뀔 때마다 코드에서 직접 갱신한다(별도 CMS 없음).
const UPDATE_GROUPS: UpdateGroup[] = [
  {
    emoji: '🎯',
    title: '영양 목표가 더 믿을 만해졌어요',
    items: [
      {
        title: '단백질·탄수화물·지방 권장량을 논문 기준으로 다시 계산',
        detail: '실제 스포츠영양학 연구에서 쓰는 계산법을 적용했어요. 운동을 많이 하는 사람과 거의 안 하는 사람의 권장량도 이제 다르게 나와요.',
      },
      {
        title: '"이 숫자는 어떻게 나왔나요?" 버튼 추가',
        detail: '마이페이지에서 내 목표가 왜 이렇게 계산됐는지 바로 확인할 수 있어요.',
      },
    ],
  },
  {
    emoji: '📸',
    title: '사진으로 기록하기가 더 쉬워졌어요',
    items: [
      {
        title: '그램 수 대신 크기 버튼으로 간편하게 수정',
        detail: 'AI가 추정한 양이 안 맞을 때 "적게/보통/많이/아주 많이" 버튼만 누르면 돼요. 직접 숫자 입력 안 해도 돼요.',
      },
      {
        title: '영양 피드백을 더 이해하기 쉽게',
        detail: '정확한 그램 수 대신 "목표의 몇 %를 채웠는지"로 보여줘서 한눈에 들어와요.',
      },
      {
        title: 'AI가 확신 못 한 항목은 알려드려요',
        detail: '사진 인식이 애매했던 음식이 있으면 대시보드에서 바로 확인하라고 알려줘요.',
      },
    ],
  },
  {
    emoji: '🍱',
    title: '식사 추천을 재료 단위로 단순화',
    items: [
      {
        title: '복잡한 요리 대신 항상 "이 재료만 더 드세요" 식으로 추천',
        detail: '완성 요리를 추천하면 못 먹는 음식이거나 만들기 번거로울 수 있어요. 이제는 지금 식단에 더하기만 하면 되는 재료로만 추천해드려요.',
      },
      {
        title: '추천 가능한 재료 종류 2배 넘게 확대',
        detail: '단백질·견과류·곡류 등 재료를 대폭 추가했어요.',
      },
    ],
  },
  {
    emoji: '🐛',
    title: '써보다가 발견해서 고친 오류',
    items: [
      {
        title: '운동 정보 수정이 안 되던 문제 해결',
        detail: '온보딩 때 운동 정보를 건너뛴 사람은 나중에 마이페이지에서 운동 정보를 설정할 방법이 없었어요. 이제 가능해요.',
      },
      {
        title: '목표 계산 설명이랑 실제 숫자가 다르던 부분 수정',
        detail: '"어떻게 나온 숫자인지" 설명과 실제 화면 숫자가 가끔 안 맞던 걸 맞췄어요.',
      },
      {
        title: '"아침" 칸에 기록했는데 "간식"으로 들어가던 문제 해결',
        detail: '어느 끼니 칸에서 "+추가"를 눌렀는지를 이제 제대로 기억해서, 시간과 상관없이 선택한 끼니로 정확히 기록돼요.',
      },
      {
        title: '부족한 영양소가 여러 개인데 추천은 1개만 나오던 문제 해결',
        detail: '예전엔 가장 부족한 영양소 하나만 3개를 꽉 채워서 보여줬어요. 이제는 부족한 영양소들을 골고루 한 칸씩 보여주고, 자리가 남을 때만 더 채워요.',
      },
      {
        title: '양념치킨처럼 흔한 음식이 DB에 없어서 기록이 막히던 문제 완화',
        detail: '양념치킨·후라이드치킨 등 자주 먹는 치킨 메뉴를 DB에 추가했어요. 그래도 DB에 없는 음식을 만나면, 삭제하지 않고 "영양정보 직접 입력"으로 칼로리·영양소를 입력해서 그대로 기록에 포함시킬 수 있어요.',
      },
      {
        title: '회식 메뉴(곱창·막창·피자 등)도 인식되게 추가',
        detail: '곱창구이·막창구이·닭발·골뱅이소면 같은 안주류와 고구마피자·불고기피자 같은 한국식 피자를 DB에 추가했어요.',
      },
      {
        title: '프랜차이즈 메뉴는 브랜드 공식 수치로 더 정확하게',
        detail: 'BBQ 황금올리브치킨, 교촌 허니콤보를 브랜드 공식 영양정보 기준으로 추가했어요. "치킨"으로 검색하면 양념치킨 같은 일반 메뉴와 함께 브랜드 메뉴도 뜨고, 어느 브랜드인지 태그로 보여줘요.',
      },
      {
        title: '자주 찾는 브랜드 메뉴 10개 추가',
        detail: 'bhc 뿌링클, 굽네치킨 고추바사삭, 맘스터치 싸이버거, 버거킹 와퍼, 맥도날드 빅맥, 롯데리아 불고기버거, 도미노피자 포테이토피자, 서브웨이 이탈리안비엠티, 파리바게뜨 단팥빵, 배스킨라빈스 싱글레귤러를 추가했어요. "버거"·"피자"처럼 종류로 검색하면 브랜드 메뉴도 같이 떠요.',
      },
      {
        title: '브랜드별 메뉴를 베스트셀러 중심으로 더 늘렸어요',
        detail: 'BBQ·교촌·bhc·굽네치킨·버거킹·맥도날드·롯데리아·도미노피자·맘스터치·서브웨이·파리바게뜨·배스킨라빈스 등 12개 브랜드에서 많이 찾는 메뉴를 추가로 넣었어요(치킨 반반·콤보, 버거 세트, 피자, 빵, 아이스크림 등). 브랜드마다 추가된 개수는 공식 자료가 있는 만큼 달라요.',
      },
      {
        title: 'KFC·네네치킨·처갓집양념치킨·한솥도시락·노브랜드버거·피자헛·이삭토스트·죠스떡볶이·던킨도너츠 추가',
        detail: '자주 먹는 브랜드 9곳의 대표 메뉴를 새로 추가했어요. 믿을 만한 자료가 없던 미스터피자는 수치가 들어맞지 않아 이번에는 빼뒀어요.',
      },
      {
        title: 'BBQ·교촌·bhc·굽네치킨·네네치킨 메뉴를 더 늘렸어요',
        detail: '콘소메안심치킨, 교촌신화, 뿌링클콤보, 커링클, 오븐바사삭 등 13개를 추가했어요. 다른 브랜드들은 믿을 만한 자료를 더 못 찾아서 이번엔 못 늘렸어요.',
      },
      {
        title: '브랜드 공식 홈페이지에서 메뉴 29개를 더 가져왔어요',
        detail: '서브웨이·맘스터치·롯데리아·버거킹·맥도날드·KFC·파리바게뜨·배스킨라빈스 공식 영양정보를 하나씩 확인해서 추가했어요. 도미노피자·피자헛·한솥도시락·이삭토스트·죠스떡볶이·처갓집·던킨도너츠·노브랜드버거는 공식 사이트에서도 충분한 영양정보를 못 찾아서 이번엔 그대로 뒀어요.',
      },
      {
        title: '스타벅스·투썸플레이스·메가MGC커피·뚜레쥬르·크리스피크림도넛·엽기떡볶이·신전떡볶이·아웃백·설빙 9개 브랜드 신규 추가',
        detail: '카페·베이커리·도넛·떡볶이·패밀리레스토랑·빙수 카테고리를 새로 채웠어요. 브랜드마다 대표 메뉴 5개씩, 총 45개를 공식 사이트와 교차 확인한 자료로 추가했어요.',
      },
      {
        title: '편의점 삼각김밥(CU·GS25)·고기구이 전문점(하남돼지집) 추가',
        detail: 'CU·GS25는 식품의약품안전처 공식 영양성분 데이터베이스(K-FIND)에서 제조사 기준으로 확인한 수치를 썼고, 하남돼지집은 믿을 만한 자료로 교차 확인된 메뉴만 골랐어요. 같이 검토했던 새마을식당은 공식 홈페이지와 여러 자료를 찾아봤지만 메뉴별 영양정보를 공개하지 않아서, 이번엔 추가하지 못했어요.',
      },
    ],
  },
]

interface Props {
  onClose: () => void
}

export default function UpdatesPanel({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm">
      <div className="mt-auto flex max-h-[88vh] flex-col rounded-t-3xl bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">What's New</p>
            <h2 className="text-lg font-bold text-slate-900">최근 업데이트 노트</h2>
          </div>
          <button onClick={onClose} aria-label="닫기" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {UPDATE_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <span>{group.emoji}</span>
                {group.title}
              </p>
              <div className="space-y-2.5">
                {group.items.map((item) => (
                  <div key={item.title} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 px-5 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
