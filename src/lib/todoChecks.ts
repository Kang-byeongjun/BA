import type { PatternId } from './intervalReport'
import { loadFromStorage, saveToStorage } from './storage'

/**
 * todoChecks — "다음 측정까지 이것만"의 체크 상태. 구간 끝 날짜(YYYY-MM-DD)를 키로 저장한다.
 * 다음 단계의 "지난 피드백 실천 체크"가 쓸 수 있게 할 일 문장도 함께 남긴다.
 */

// storage.ts가 접두사(ai-diet-app:)를 붙인다
export const TODO_CHECKS_KEY = 'todoChecks'

export interface TodoItem {
  id: PatternId
  text: string
}
export interface TodoCheck extends TodoItem {
  checked: boolean
}
export type TodoChecks = Record<string, TodoCheck[]>

const pad2 = (n: number) => String(n).padStart(2, '0')
export function intervalKey(endTimestamp: number): string {
  const d = new Date(endTimestamp)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function loadTodoChecks(): TodoChecks {
  const raw = loadFromStorage<unknown>(TODO_CHECKS_KEY, {})
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as TodoChecks) : {}
}

export function checkedIds(key: string): Set<PatternId> {
  const list = loadTodoChecks()[key]
  return new Set(Array.isArray(list) ? list.filter((t) => t?.checked === true).map((t) => t.id) : [])
}

/** 지금 보이는 할 일 전체를 체크 상태와 함께 저장한다(다른 구간의 기록은 그대로) */
export function saveTodoChecks(key: string, todos: TodoItem[], checked: Set<PatternId>): void {
  saveToStorage<TodoChecks>(TODO_CHECKS_KEY, {
    ...loadTodoChecks(),
    [key]: todos.map(({ id, text }) => ({ id, text, checked: checked.has(id) })),
  })
}
