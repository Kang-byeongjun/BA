import { useState } from 'react'
import type { PatternId } from '../../lib/intervalReport'
import { checkedIds, saveTodoChecks, type TodoItem } from '../../lib/todoChecks'

interface Props {
  /** 구간 끝 날짜 키. 바뀌면 부모가 key를 바꿔 새로 그린다 */
  storageKey: string
  /** 최대 2개(식단 1 + 운동 1) */
  todos: TodoItem[]
}

// "다음 측정까지 이것만" 할 일 카드. 체크 상태는 기기에 저장한다.
export default function TrendTodoCard({ storageKey, todos }: Props) {
  const [checked, setChecked] = useState(() => checkedIds(storageKey))

  const toggle = (id: PatternId) => {
    const next = new Set(checked)
    if (!next.delete(id)) next.add(id)
    setChecked(next)
    saveTodoChecks(storageKey, todos, next)
  }

  return (
    <section className="rounded-2xl bg-primary p-4 text-white shadow-lg shadow-primary/25">
      <h3 className="text-base font-bold">다음 측정까지 이것만</h3>
      <ul className="mt-2 space-y-1">
        {todos.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-center gap-3 py-1.5">
              <input type="checkbox" checked={checked.has(t.id)} onChange={() => toggle(t.id)} className="h-5 w-5 shrink-0 accent-white" />
              <span className={`min-w-0 text-sm font-medium ${checked.has(t.id) ? 'text-white/60 line-through' : ''}`}>{t.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
