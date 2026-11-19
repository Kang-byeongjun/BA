import { ArrowDown, ArrowUp } from 'lucide-react'

interface ExampleField {
  label: string
  unit: string
  current: number
  delta: number
}

// 실제 측정이 2회 이상 쌓이기 전까지, "측정하면 이런 모습으로 보여요"를 보여주는 샘플 숫자.
// 실제 사용자 데이터가 아니므로 항상 예시 표시(배지/흐림 처리)와 함께 써야 한다.
const EXAMPLE_FIELDS: ExampleField[] = [
  { label: '체중', unit: 'kg', current: 69.4, delta: -0.8 },
  { label: '골격근량', unit: 'kg', current: 28.6, delta: 0.3 },
  { label: '체지방량', unit: 'kg', current: 15.2, delta: -0.6 },
  { label: '체지방률', unit: '%', current: 21.8, delta: -0.5 },
]

export default function ExampleInBodyGrid() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {EXAMPLE_FIELDS.map((f) => {
        const isUp = f.delta > 0
        return (
          <div key={f.label} className="rounded-lg bg-white px-3 py-2">
            <p className="text-xs text-slate-500">{f.label}</p>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-slate-800">
                {f.current}
                {f.unit}
              </p>
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-rose-500' : 'text-sky-600'}`}>
                {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {isUp ? '+' : ''}
                {f.delta}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
