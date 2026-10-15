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

// 팀원 데모용 변경 내역. 날짜가 바뀔 때마다 코드에서 직접 갱신한다(별도 CMS 없음).
const UPDATE_GROUPS: UpdateGroup[] = [
  {
    emoji: '🔬',
    title: '영양 목표 신뢰성 — 논문 근거 반영',
    items: [
      {
        title: '단백질·탄수화물·지방 계수에 실제 문헌 근거 반영',
        detail: 'ISSN Position Stand(2017), ACSM·AND·DC 공동성명(2016), Helms et al.(2014), IOM AMDR을 적용. 체지방감량의 단백질 계수는 체지방률별로 세분화(2.3~3.0g/kg).',
      },
      {
        title: '칼로리 계산용 활동계수를 운동량 기반으로 개인화',
        detail: '모든 사용자에게 똑같이 적용되던 고정값(1.4)을 없애고, 운동 프로필(주당 횟수×시간)에 맞춰 Mifflin-St Jeor 표준 단계를 적용.',
      },
      {
        title: '"이 숫자는 어떻게 나왔나요?" 근거 보기 추가',
        detail: '마이페이지·온보딩 목표 확인 화면에서 실제 적용된 계수와 출처 문헌을 그 자리에서 확인 가능.',
      },
    ],
  },
  {
    emoji: '📸',
    title: '사진 인식 신뢰성 보완',
    items: [
      {
        title: '크기 버튼으로 간편 보정',
        detail: '그램 수가 가늠 안 될 때 "적게/보통/많이/아주 많이" 버튼으로 AI 추정치를 배율 조정.',
      },
      {
        title: '피드백 메시지를 퍼센트 중심으로 전환',
        detail: '정확한 그램 수 대신 달성률(%) 중심 메시지로 바꾸고, 그램 수는 5g 단위로 뭉뚱그린 보조 정보로만 노출.',
      },
      {
        title: '저신뢰도 항목 주의 배너',
        detail: 'AI 추정 신뢰도가 낮고 사용자가 고치지 않은 항목이 있으면 대시보드에 안내 표시.',
      },
    ],
  },
  {
    emoji: '🍱',
    title: '식단 추천 유연성',
    items: [
      {
        title: '"식단 유형" 옵션 추가',
        detail: '매번 비슷한 식단만 먹는 사용자를 위해, 완성 요리 조합 대신 재료 단위로 보충 추천하는 모드 추가.',
      },
      {
        title: '재료 데이터베이스 확장',
        detail: '재료 카테고리 29개 → 64개로 확장 (단백질/견과류/곡류 등 보강).',
      },
    ],
  },
  {
    emoji: '🐛',
    title: '실제 구동 중 발견해 고친 버그',
    items: [
      {
        title: '운동 프로필 없을 때 "수정" 버튼 먹통 수정',
        detail: '온보딩에서 운동 프로필을 안 거친 사용자는 마이페이지에서 운동 프로필을 영영 설정할 수 없던 문제.',
      },
      {
        title: '근거 문구와 실제 숫자 불일치 수정',
        detail: '탄수화물 근거 설명이 AMDR 클램프 적용 전 수치를 보여주던 문제 — 이제 실제 적용값과 항상 일치.',
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">개발자 모드</p>
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
