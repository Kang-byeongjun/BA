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
