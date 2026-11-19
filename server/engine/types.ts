import { z } from 'zod';

// ---------- 코드값 (온보딩질문 시트의 코드와 동일) ----------
export const Goal = z.enum(['DIET', 'MUSCLE', 'FITNESS', 'UNSURE']);
export const Experience = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export const PainPart = z.enum(['LOWBACK', 'KNEE', 'SHOULDER']);
export const FocusGroup = z.enum(['CHEST', 'SHOULDER', 'BACK', 'ARM', 'LEGS', 'ABS']);
export const Frequency = z.enum(['FREQ_2', 'FREQ_3', 'FREQ_4P']);
export const TimeSlot = z.enum(['TIME_30', 'TIME_60', 'TIME_90']);

export type Goal = z.infer<typeof Goal>;
export type ResolvedGoal = Exclude<Goal, 'UNSURE'>;
export type Experience = z.infer<typeof Experience>;
export type PainPart = z.infer<typeof PainPart>;
export type FocusGroup = z.infer<typeof FocusGroup>;
export type Frequency = z.infer<typeof Frequency>;
export type TimeSlot = z.infer<typeof TimeSlot>;
export type MuscleGroup = FocusGroup | 'CARDIO';
export type BurdenLevel = 'HIGH' | 'MID' | 'NONE';

// ---------- 요청 ----------
export const WorkoutRequest = z.object({
  goal: Goal,
  focus: z.array(FocusGroup).max(2).default([]),
  experience: Experience,
  pain: z.array(PainPart).default([]),
  frequency: Frequency,
  time: TimeSlot,
  // Zod 4: .default()는 값을 검사 없이 그대로 쓰므로, 빈 객체를 넣고 안쪽 기본값(weak)까지 채우려면 .prefault()를 쓴다
  inbody: z.object({
    /** 취약 구획 여부. 판정 기준은 아직 미정이라 상위(인바디 연동)에서 계산해 넘긴다 */
    weak: z.object({ arm: z.boolean(), trunk: z.boolean(), leg: z.boolean() }).default({ arm: false, trunk: false, leg: false }),
    /** 지방·근육 조절 권장치(kg). goal이 UNSURE일 때만 필요. 음수 = 감소 권장 */
    fatAdjustKg: z.number().optional(),
    muscleAdjustKg: z.number().optional(),
  }).prefault({}),
});
export type WorkoutRequest = z.infer<typeof WorkoutRequest>;
/** 요청 본문으로 보낼 때의 타입(기본값이 있는 필드는 생략 가능) */
export type WorkoutRequestInput = z.input<typeof WorkoutRequest>;

// ---------- 종목 DB ----------
export interface Exercise {
  id: string;
  name: string;
  type: 'STRENGTH' | 'CARDIO';
  group: MuscleGroup;
  subArea: string;
  secondary: string[];
  joint: 'MULTI' | 'SINGLE' | 'ISOMETRIC' | null;
  size: 'LARGE' | 'SMALL' | null;
  equipment: string;
  difficulty: 1 | 2 | 3;
  burden: Record<PainPart, BurdenLevel>;
  altId: string | null;
  note: string;
}

export interface Candidate {
  exercise: Exercise;
  score: number;
  /** 부담 수준이 MID인 부위(사용자 통증 부위 중). 비어 있으면 주의 없음 */
  cautionParts: PainPart[];
}

export interface Prescription {
  setsMin: number; setsMax: number; repsMin: number; repsMax: number;
  rirMin: number; rirMax: number; restMin: number; restMax: number;
  summary: string; note: string;
}

export interface DayFrame {
  day: number;
  label: string;
  groups: MuscleGroup[];          // 이 일차의 대상 근육군(유산소 제외)
  count: number;                  // 권장 근력 종목 수 (종목수계산기 값)
  range: [number, number];        // 허용 범위
  requiredGroups: FocusGroup[];   // 통째로 빠지면 안 되는 근육군
  cardio: boolean;                // 유산소 1종목을 맨 뒤에 추가
}
export interface Frame { days: DayFrame[]; prescription: Prescription; }

// ---------- LLM 출력 (V1·V11: 엄격 스키마, 수치 필드가 있으면 실패) ----------
// Zod 4: .strict() 대신 z.strictObject()를 쓴다 (정의되지 않은 키가 있으면 실패)
export const LlmOutput = z.strictObject({
  days: z.array(z.strictObject({
    day: z.number().int().min(1),
    exercises: z.array(z.strictObject({ id: z.string(), reason: z.string().min(1) })),
  })).min(1),
  summary: z.string().min(1),
});
export type LlmOutput = z.infer<typeof LlmOutput>;

// ---------- 검증 ----------
export interface Issue { code: string; message: string; }
export interface ValidationResult { hard: Issue[]; warnings: Issue[]; routine?: LlmOutput; }

// ---------- 결과 ----------
export interface RoutineExercise {
  order: number;
  id: string;
  name: string;
  group: MuscleGroup;
  reason: string;
  /** 주의 문구(시스템이 부착). 있으면 화면에 ⚠ 표시 */
  caution: { parts: PainPart[]; text: string; alternativeId: string | null } | null;
  prescription: Pick<Prescription, 'setsMin' | 'setsMax' | 'repsMin' | 'repsMax' | 'rirMin' | 'rirMax' | 'restMin' | 'restMax'> | null;
}
export interface WorkoutResult {
  resolvedGoal: ResolvedGoal;
  goalReason: string | null;
  source: 'llm' | 'fallback';
  attempts: number;
  attemptErrors: Issue[][];
  days: { day: number; label: string; exercises: RoutineExercise[] }[];
  summary: string;
  warnings: Issue[];
  prescriptionNote: string;
}
