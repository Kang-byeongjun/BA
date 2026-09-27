const PREFIX = 'ai-diet-app:'

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // localStorage 사용 불가 환경(프라이빗 모드 등)에서는 조용히 무시
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  profile: 'profile',
  nutritionTarget: 'nutritionTarget',
  meals: 'meals',
  workouts: 'workouts',
  activeWorkout: 'activeWorkout',
  pendingWorkout: 'pendingWorkout',
  onboarded: 'onboarded',
  isDemo: 'isDemo',
  aiMode: 'aiMode',
} as const
