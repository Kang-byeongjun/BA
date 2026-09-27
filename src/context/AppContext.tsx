import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { buildDemoMeals, DEMO_NUTRITION_TARGET, DEMO_PROFILE } from '../data/mockData'
import { generateId } from '../lib/id'
import type { AiMode } from '../lib/aiMode'
import { loadFromStorage, removeFromStorage, saveToStorage, STORAGE_KEYS } from '../lib/storage'
import type {
  ActiveWorkoutSession,
  Meal,
  NutritionTarget,
  UserProfile,
  Workout,
  WorkoutType,
} from '../types'

interface AppState {
  onboarded: boolean
  // 데모 데이터로 시작한 상태인지. 데모 모드에서만 mock AI 분석을 쓸 수 있다.
  isDemo: boolean
  // 데모 모드에서 사용할 AI 분석 방식. 데모가 아니면 항상 실제 AI를 사용한다.
  aiMode: AiMode
  profile: UserProfile | null
  nutritionTarget: NutritionTarget | null
  meals: Meal[]
  workouts: Workout[]
  activeWorkout: ActiveWorkoutSession | null
  pendingWorkout: Workout | null
}

type Action =
  | { type: 'COMPLETE_ONBOARDING'; profile: UserProfile; nutritionTarget: NutritionTarget }
  | { type: 'LOAD_DEMO' }
  | { type: 'SET_AI_MODE'; aiMode: AiMode }
  | { type: 'UPDATE_NUTRITION_TARGET'; target: NutritionTarget }
  | { type: 'UPDATE_PROFILE'; profile: UserProfile }
  | { type: 'ADD_MEAL'; meal: Meal }
  | { type: 'DELETE_MEAL'; id: string }
  | { type: 'START_WORKOUT'; workoutType: WorkoutType }
  | { type: 'PAUSE_WORKOUT' }
  | { type: 'RESUME_WORKOUT' }
  | { type: 'FINISH_WORKOUT' }
  | { type: 'RESET_ACTIVE_WORKOUT' }
  | { type: 'SAVE_PENDING_WORKOUT' }
  | { type: 'DISCARD_PENDING_WORKOUT' }
  | { type: 'RESET_APP' }

function initState(): AppState {
  return {
    onboarded: loadFromStorage(STORAGE_KEYS.onboarded, false),
    isDemo: loadFromStorage(STORAGE_KEYS.isDemo, false),
    aiMode: loadFromStorage<AiMode>(STORAGE_KEYS.aiMode, 'real'),
    profile: loadFromStorage<UserProfile | null>(STORAGE_KEYS.profile, null),
    nutritionTarget: loadFromStorage<NutritionTarget | null>(STORAGE_KEYS.nutritionTarget, null),
    meals: loadFromStorage<Meal[]>(STORAGE_KEYS.meals, []),
    workouts: loadFromStorage<Workout[]>(STORAGE_KEYS.workouts, []),
    activeWorkout: loadFromStorage<ActiveWorkoutSession | null>(STORAGE_KEYS.activeWorkout, null),
    pendingWorkout: loadFromStorage<Workout | null>(STORAGE_KEYS.pendingWorkout, null),
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        onboarded: true,
        isDemo: false,
        aiMode: 'real',
        profile: action.profile,
        nutritionTarget: action.nutritionTarget,
      }

    case 'LOAD_DEMO':
      return {
        ...state,
        onboarded: true,
        isDemo: true,
        aiMode: 'mock',
        profile: DEMO_PROFILE,
        nutritionTarget: DEMO_NUTRITION_TARGET,
        meals: buildDemoMeals(),
      }

    case 'SET_AI_MODE':
      return { ...state, aiMode: action.aiMode }

    case 'UPDATE_NUTRITION_TARGET':
      return { ...state, nutritionTarget: action.target }

    case 'UPDATE_PROFILE':
      return { ...state, profile: action.profile }

    case 'ADD_MEAL':
      return { ...state, meals: [action.meal, ...state.meals] }

    case 'DELETE_MEAL':
      return { ...state, meals: state.meals.filter((m) => m.id !== action.id) }

    case 'START_WORKOUT':
      return {
        ...state,
        activeWorkout: {
          type: action.workoutType,
          segmentStart: Date.now(),
          accumulatedMs: 0,
          status: 'running',
        },
      }

    case 'PAUSE_WORKOUT': {
      const active = state.activeWorkout
      if (!active || active.status !== 'running') return state
      const elapsed = active.accumulatedMs + (Date.now() - active.segmentStart)
      return {
        ...state,
        activeWorkout: { ...active, accumulatedMs: elapsed, status: 'paused' },
      }
    }

    case 'RESUME_WORKOUT': {
      const active = state.activeWorkout
      if (!active || active.status !== 'paused') return state
      return {
        ...state,
        activeWorkout: { ...active, segmentStart: Date.now(), status: 'running' },
      }
    }

    case 'FINISH_WORKOUT': {
      const active = state.activeWorkout
      if (!active) return state
      const totalMs =
        active.accumulatedMs + (active.status === 'running' ? Date.now() - active.segmentStart : 0)
      const endTime = Date.now()
      const startTime = endTime - totalMs
      const workout: Workout = {
        id: generateId('workout'),
        type: active.type,
        startTime,
        endTime,
        duration: Math.round(totalMs / 1000),
      }
      return { ...state, activeWorkout: null, pendingWorkout: workout }
    }

    case 'RESET_ACTIVE_WORKOUT':
      return { ...state, activeWorkout: null }

    case 'SAVE_PENDING_WORKOUT': {
      if (!state.pendingWorkout) return state
      return {
        ...state,
        workouts: [state.pendingWorkout, ...state.workouts],
        pendingWorkout: null,
      }
    }

    case 'DISCARD_PENDING_WORKOUT':
      return { ...state, pendingWorkout: null }

    case 'RESET_APP':
      return {
        onboarded: false,
        isDemo: false,
        aiMode: 'real',
        profile: null,
        nutritionTarget: null,
        meals: [],
        workouts: [],
        activeWorkout: null,
        pendingWorkout: null,
      }

    default:
      return state
  }
}

interface AppContextValue extends AppState {
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.onboarded, state.onboarded)
  }, [state.onboarded])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.isDemo, state.isDemo)
  }, [state.isDemo])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.aiMode, state.aiMode)
  }, [state.aiMode])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.profile, state.profile)
  }, [state.profile])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.nutritionTarget, state.nutritionTarget)
  }, [state.nutritionTarget])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.meals, state.meals)
  }, [state.meals])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.workouts, state.workouts)
  }, [state.workouts])

  useEffect(() => {
    if (state.activeWorkout) {
      saveToStorage(STORAGE_KEYS.activeWorkout, state.activeWorkout)
    } else {
      removeFromStorage(STORAGE_KEYS.activeWorkout)
    }
  }, [state.activeWorkout])

  useEffect(() => {
    if (state.pendingWorkout) {
      saveToStorage(STORAGE_KEYS.pendingWorkout, state.pendingWorkout)
    } else {
      removeFromStorage(STORAGE_KEYS.pendingWorkout)
    }
  }, [state.pendingWorkout])

  const value = useMemo<AppContextValue>(() => ({ ...state, dispatch }), [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp은 AppProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
