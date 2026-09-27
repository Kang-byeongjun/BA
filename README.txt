# AI 식단 & 운동 관리 앱 (프로토타입)

InBody 데이터와 개인 목적을 기반으로 하루 영양 목표를 산출하고, 음식 사진을 촬영하면 AI(Claude Vision)가 음식과 양을 분석해 섭취 영양소를 기록·시각화하는 모바일 우선 웹 앱 프로토타입입니다. InBody 결과지 사진 분석과 음식 사진 분석은 서버(Vercel Function)를 거쳐 실제 이미지를 Claude Vision으로 분석하며, 데모 모드에서만 예시(mock) 결과를 사용합니다.

## 실행 방법

```bash
npm install
cp .env.example .env.local   # 그리고 ANTHROPIC_API_KEY 를 채우세요 (실제 AI 분석에 필요, git에 커밋되지 않음)
npm run dev       # 개발 서버 실행 (http://localhost:5173) — /api/* 도 함께 제공
npm run build     # 타입 체크 + 프로덕션 빌드 (dist/)
npm test          # 서버·서비스·화면 흐름 테스트
npm run lint      # oxlint 정적 분석
```

`npm run preview`는 /api 함수를 제공하지 않으므로 AI 분석을 확인하려면 `npm run dev` 또는 배포 환경을 사용하세요.

모바일 화면 비율로 디자인되어 있으므로, 브라우저 개발자 도구의 기기 툴바(모바일 뷰)로 열어보는 것을 권장합니다. 데스크톱 너비에서는 실제 스마트폰처럼 중앙에 프레임 형태로 렌더링됩니다.

처음 실행하면 온보딩(목적 선택 → InBody 입력 → 목표 확인)이 나타납니다. 첫 화면의 "데모 데이터로 바로 체험하기" 버튼을 누르면 아침·점심을 이미 먹은 상태의 데모 계정으로 시작하며, 이 경우 AI 분석은 API Key 없이도 볼 수 있는 예시(mock) 결과입니다(마이 탭에서 실제 AI로 전환 가능).

## 팀원에게 프로토타입 공유하기

스토어 심사 없이 팀 내부에서 바로 써볼 수 있는 방법입니다. 현재 바로 쓸 수 있는 건 방법 A(웹 링크)뿐입니다.

### 방법 A. 웹 링크로 공유 (가장 빠름)

**현재 배포된 URL: https://ai-diet-fitness-app-three.vercel.app** (Vercel 팀 `ba-662c`)

이 URL을 그대로 팀원에게 공유하면 휴대폰 브라우저로 바로 열립니다(카메라도 동작). 홈 화면에 "추가"하면 앱처럼 아이콘이 생깁니다.

코드를 수정한 뒤 이 URL에 반영(재배포)하려면 본인이 직접 실행해야 합니다(Vercel 로그인 필요).

```bash
vercel login            # 최초 1회. 브라우저 인증
npx vercel --prod       # 프로젝트 폴더에서 실행 → 빌드 후 프로덕션 URL 갱신
```

주의 사항:
- 반드시 Claude Code의 `!` 명령이 아니라 **별도로 연 터미널 창**에서 실행하세요. 로그인 같은 대화형 과정이 자동화된 채널에서는 동작하지 않습니다.
- Windows PowerShell에서 "스크립트를 실행할 수 없습니다" 오류가 나면 `npx` 대신 `npx.cmd`를 쓰거나 명령 프롬프트(cmd)에서 실행하세요.

### 방법 B. Android APK를 GitHub Actions로 클라우드 빌드 (현재 미완성)

Android Studio 없이 실제 설치용 APK를 클라우드에서 만들려는 워크플로우(`.github/workflows/android-build.yml`)가 있지만, **현재는 "Sync Capacitor Android project" 단계에서 실패하는 상태**입니다. 원인은 아직 확인하지 못했습니다(GitHub Actions 로그는 저장소 소유자만 볼 수 있어, 실제 에러 메시지를 확인해야 합니다).

- push 시 자동 실행은 꺼두었고, 저장소의 **Actions** 탭 → "Build Android APK" → **Run workflow**로 수동 실행만 가능합니다.
- 다시 시도하려면 실패한 실행의 "Sync Capacitor Android project" 단계 로그를 확인해 원인을 먼저 해결해야 합니다.
- 성공하면 실행 페이지 하단 **Artifacts**에서 `app-debug-apk`를 내려받아 팀원에게 전달합니다(Android 팀원은 "출처를 알 수 없는 앱 설치 허용" 필요). 디버그 서명이라 Play 스토어 업로드는 안 되고, 릴리즈 서명은 `android/keystore.properties`로 별도 설정해야 합니다.
- 그 전까지 Android 앱이 필요하면 Android Studio가 있는 PC에서 `npm run cap:sync` → `npm run cap:open:android`로 직접 빌드하세요.

### 방법 C. iOS

Mac + Xcode가 있어야 하며, 팀원 실기기 설치는 사실상 유료 Apple Developer 계정($99/년) + TestFlight가 표준입니다(무료 계정은 기기당 7일마다 재설치 필요). Mac이 준비되면 `npm run cap:open:ios`로 Xcode를 열고, "Automatically manage signing"으로 서명한 뒤 TestFlight에 업로드하면 됩니다.

## 팀원이 코드를 수정하려면

배포된 URL은 빌드 결과물일 뿐이라 URL만으로는 수정할 수 없습니다. 소스 코드는 GitHub 저장소(`https://github.com/Kang-byeongjun/BA`)에 있습니다.

```bash
git clone https://github.com/Kang-byeongjun/BA.git
cd BA
npm install
npm run dev                      # 로컬 확인 (http://localhost:5173)
git checkout -b feature/이름       # 브랜치에서 작업
git add . && git commit -m "..."
git push -u origin feature/이름
```

- 저장소가 비공개라면 소유자가 GitHub Settings → Collaborators에서 팀원을 초대해야 합니다.
- 수정한 내용을 공유 URL에 반영하려면 소유자가 `main`에 합친 뒤 위의 `npx vercel --prod`로 재배포합니다. Vercel에 GitHub 로그인 연결을 추가하고 Git 저장소를 연결하면(프로젝트 Settings → Git) push할 때 자동 배포되도록 바꿀 수 있습니다.
- Vercel Hobby(무료) 플랜은 팀원 초대와 다른 사람의 커밋 자동 배포에 제한이 있을 수 있습니다. 그 경우 팀원이 각자 자기 Vercel 계정에 배포하거나 Pro 플랜을 사용하세요.

## Android / iOS 앱으로 실행하기 (Capacitor)

이 프로젝트는 [Capacitor](https://capacitorjs.com/)로 감싸져 있어 웹 코드를 그대로 실제 Android/iOS 네이티브 앱으로 빌드할 수 있습니다. `android/`, `ios/` 폴더가 이미 생성되어 있고, 카메라 촬영 UI(`src/components/common/PhotoCaptureView.tsx`)는 네이티브 앱에서 실행될 때 `@capacitor/camera` 플러그인으로 기기 카메라/사진첩을 직접 호출하도록 이미 연동되어 있습니다(웹/PWA에서는 기존 `<input type="file">` 방식 그대로 동작).

```bash
npm run cap:sync          # 웹 빌드(dist) 후 android/ios 프로젝트에 최신 코드 동기화
npm run cap:open:android  # Android Studio로 android/ 프로젝트 열기
npm run cap:open:ios      # Xcode로 ios/ 프로젝트 열기 (macOS 전용)
```

코드를 수정할 때마다 `npm run cap:sync`를 실행한 뒤 Android Studio/Xcode에서 다시 실행(▶)하면 됩니다.

**필요 환경 (중요)**
- **Android**: [Android Studio](https://developer.android.com/studio) 설치가 필요합니다(JDK, Android SDK 포함). 이 프로젝트를 만든 현재 환경에는 Android Studio가 설치되어 있지 않아 `android/` 프로젝트 스캐폴딩까지만 완료했고, 실제 APK 빌드/에뮬레이터 실행은 직접 Android Studio에서 진행해야 합니다.
- **iOS**: Xcode는 **macOS에서만** 실행되므로, iOS 앱 빌드·시뮬레이터 실행·기기 설치는 반드시 Mac이 있어야 합니다. `ios/` 프로젝트 파일 자체는 Windows에서도 생성해뒀지만, 여기서 컴파일까지 검증할 수는 없었습니다. Mac이 없다면 Ionic Appflow, Codemagic, GitHub Actions macOS 러너 같은 클라우드 빌드 서비스로 우회할 수 있습니다.
- 카메라 권한 문구는 이미 설정되어 있습니다: iOS는 `ios/App/App/Info.plist`의 `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription`, Android는 `@capacitor/camera` 플러그인이 매니페스트 병합 시 카메라 권한을 자동으로 추가합니다.
### 앱 아이콘 / 스플래시 화면

플레이스홀더 아이콘(에메랄드 배경 + "AI" 워드마크)을 만들어 Android/iOS/PWA 전체 사이즈로 이미 생성해뒀습니다.

- 소스: `assets/icon-source.svg`, `assets/splash-source.svg` (원본 SVG, 여기를 실제 로고로 교체하세요)
- `assets/icon.png`(1024×1024), `assets/splash.png`·`splash-dark.png`(2732×2732): 위 SVG를 래스터화한 PNG
- 로고를 교체한 뒤 아래 명령 한 번으로 Android(`mipmap-*`, adaptive icon), iOS(`Assets.xcassets`), PWA(`assets/pwa-icons/`) 아이콘을 전부 재생성할 수 있습니다.

```bash
npm run assets:generate   # assets/*-source.svg → PNG 변환 후 전 플랫폼 아이콘/스플래시 재생성
```

### 릴리즈 서명 (Android)

- `android/keystore.properties.example`에 키스토어 생성 방법과 필요한 값(스토어 경로/비밀번호/별칭)이 정리되어 있습니다.
- 이 파일을 복사해 `android/keystore.properties`로 저장하고 실제 값을 채우면, `android/app/build.gradle`이 이를 자동으로 읽어 릴리즈 빌드에 서명합니다. 파일이 없으면 릴리즈 빌드는 서명되지 않은 채로 만들어지며 스토어에는 업로드할 수 없습니다.
- `keystore.properties`, `*.jks`, `*.keystore`는 `.gitignore`에 등록되어 있어 실수로 커밋되지 않습니다. **비밀번호와 키스토어 파일은 절대 저장소에 올리지 말고 안전한 곳에 별도 백업하세요.**
- iOS는 Xcode의 "Automatically manage signing" 기능을 사용하면 Apple Developer 계정 연결만으로 인증서/프로비저닝 프로파일이 자동 관리됩니다.

### 개인정보처리방침 초안

- `legal/privacy-policy.html`에 스토어 제출용 개인정보처리방침 초안(한국어)을 작성해뒀습니다. 수집 정보, 카메라 권한 사용 목적, 로컬 저장 방식, 삭제 방법 등을 담고 있습니다.
- **주의**: 이 문서는 초안 템플릿입니다. `[회사명]`, `[연락처 이메일]` 등 노란 배경으로 표시된 부분을 실제 정보로 채우고, 실제 서비스 정책(특히 AI 분석 서버를 실제로 연결하는 시점)에 맞게 내용을 업데이트한 뒤, 가능하면 법률 검토를 거치세요.
- 앱스토어/플레이스토어는 개인정보처리방침을 **공개적으로 접근 가능한 URL**로 요구합니다. 이 HTML 파일을 GitHub Pages, 직접 보유한 도메인, 또는 다른 정적 호스팅에 올려 URL을 확보하세요.

## 프로젝트 구조

```
api/                      # Vercel Serverless Function (서버 전용 — API Key는 여기서만 사용)
├── analyze-inbody.ts     #   POST /api/analyze-inbody  InBody 결과지 이미지 → 수치 추출
└── analyze-food.ts       #   POST /api/analyze-food    음식 이미지 → 음식 종류·예상 중량
server/                   # 서버 로직 (api/ 와 로컬 개발 서버가 함께 사용)
├── handlers.ts           #   요청 검증 → 이미지 검증 → Claude Vision → 결과 검증 → 응답
├── vision.ts             #   Anthropic SDK 호출(구조화 출력) + SDK 에러 → 사용자용 에러 코드 변환
├── prompts.ts            #   InBody / 음식 Vision 프롬프트
├── normalize.ts          #   모델 출력 검증(비현실적인 값 제거, 이미지 종류 확인)
├── image.ts              #   base64/용량/형식(매직 넘버) 검증
├── config.ts             #   모델 ID(ANTHROPIC_MODEL), 한도, 타임아웃
└── __tests__/            #   서버 테스트 (가짜 Anthropic 클라이언트 사용)
shared/                   # 서버·클라이언트 공용 (타입, 에러 코드와 한국어 메시지)
src/
├── types/                # 전역 타입 (UserProfile, NutritionTarget, Meal, Workout ...)
├── data/
│   ├── mockData.ts       # 데모 프로필, 데모 모드 전용 mock 분석 결과, 추천 음식 풀
│   └── foodDatabase.ts   # 임시 영양 데이터셋 (약 200개, 100g 기준 추정치)
├── services/             # 비즈니스 로직 계층
│   ├── analysisApi.ts        # 서버 API 호출 (타임아웃/취소/에러 코드 처리)
│   ├── foodVisionService.ts  # 음식 사진 → 음식 종류 + 예상 중량 (real | mock)
│   ├── inBodyVisionService.ts# InBody 사진 → 체성분 수치 (real | mock)
│   ├── nutritionService.ts   # 음식 이름 → 영양 DB 연결, 중량 기반 영양소 계산 (NutritionProvider 인터페이스)
│   ├── mealService.ts        # 분석 결과 → 편집 가능한 행 → 식사 기록(Meal)
│   ├── nutritionTargetService.ts # InBody + 목표 → 하루 영양 목표
│   └── __tests__/
├── lib/                  # 순수 유틸 (imagePrep: 브라우저 이미지 리사이즈, nutrition: 피드백/추천, aiMode 등)
├── context/AppContext.tsx# useReducer 전역 상태 + localStorage 동기화
├── components/           # layout, onboarding, dashboard, food, meals, workout, profile, common
└── App.tsx / main.tsx
```

### 상태 관리 & 영속성

- 별도 라이브러리 없이 `React Context + useReducer`로 구성했습니다 (`src/context/AppContext.tsx`).
- `profile`, `nutritionTarget`, `meals`, `workouts`, `activeWorkout`, `pendingWorkout`, `onboarded`, `isDemo`, `aiMode` 를 각각 `localStorage`에 동기화하여 새로고침해도 유지됩니다.
- 운동 타이머는 세션 시작 시각 + 누적 시간을 저장하고 `Date.now()` 차이로 경과 시간을 계산하므로 화면 전환/새로고침 후에도 정확합니다.

## 실제 AI 분석 구조 (Claude Vision)

```
[InBody]  사진 → 브라우저에서 리사이즈(긴 변 1568px JPEG) → POST /api/analyze-inbody → Claude Vision
          → 구조화 JSON → 서버 검증(범위·이미지 종류) → "AI가 분석한 InBody 정보" 확인/수정 → 프로필 저장 → 영양 목표 재계산
[음식]    사진 → 브라우저에서 리사이즈 → POST /api/analyze-food → Claude Vision → 음식 종류 + 예상 중량(g)
          → 확인/수정(이름·중량·추가·삭제) → nutritionService가 영양 DB로 영양소 계산 → 식사 저장 → 대시보드 진행 바·피드백·추천
```

- **AI는 "무엇이, 얼마나 있는지"만 식별**하고, 칼로리·영양소 숫자는 `nutritionService`가 영양 데이터셋으로 계산합니다. 사용자가 이름/중량을 고치면 즉시 재계산됩니다.
- **API Key는 서버(`api/`, `server/`)에서만** 사용합니다. 브라우저 코드는 Anthropic을 직접 호출하지 않으며 빌드 결과물에도 키가 포함되지 않습니다.
- 사진을 서버에 저장하지 않습니다(분석 후 폐기). 앱에는 식사 목록 표시용 작은 썸네일만 기기에 저장되고, InBody 사진은 어디에도 저장하지 않습니다.
- **실패해도 mock으로 몰래 대체하지 않습니다.** API Key 없음, 용량 초과, 지원하지 않는 형식, 음식/InBody가 아닌 사진, 이미지 품질 불량, JSON 파싱 실패, 타임아웃, 네트워크 오류, 일부 값만 읽은 경우 등을 구분해 한국어 안내와 다음 행동(다시 시도/다시 촬영)을 보여줍니다.
- 모델은 기본 `claude-opus-5`이며 `ANTHROPIC_MODEL` 환경변수로 코드 수정 없이 교체할 수 있습니다.
- **Mock은 데모 모드에서만** 쓰입니다. 첫 화면의 "데모 데이터로 바로 체험하기"로 시작하면 예시 결과가 나오고(화면에 "데모 모드" 표시), 마이 탭에서 "실제 AI 분석"으로 바꿔 실제 AI를 써볼 수 있습니다. 일반 시작(온보딩)은 항상 실제 AI입니다.

### 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 필수 | Anthropic API Key (서버 전용, `VITE_` 접두사를 붙이지 마세요) |
| `ANTHROPIC_MODEL` | 선택 | 사용할 모델 ID. 기본값 `claude-opus-5` (이미지 입력 지원 모델이어야 함) |
| `ANTHROPIC_EFFORT` | 선택 | `low`/`medium`/`high`/`xhigh`/`max`/`none`. 기본값 `medium` (미지원 모델에는 자동으로 보내지 않음) |

- **로컬**: `.env.example`을 `.env.local`로 복사해 값을 채우고 `npm run dev` (개발 서버가 같은 `/api/*` 를 제공합니다). `.env*` 파일은 git에 커밋되지 않습니다.
- **Vercel**: 프로젝트 Settings → Environment Variables 에 위 이름으로 등록(Production 포함, 미리보기 배포에 쓰려면 Preview도 체크) → **재배포**해야 반영됩니다.

### 테스트

```bash
npm test    # 서버(요청 검증·에러 매핑·결과 검증) + 서비스(영양 계산·API 클라이언트) + 화면 흐름(업로드→분석→수정→저장, 오류 화면)
```

실제 Anthropic API는 호출하지 않고(가짜 클라이언트/응답 사용) 동작을 검증합니다. 실제 사진으로 확인하는 방법은 아래 "실제 AI 동작 확인 방법"을 참고하세요.

### 실제 AI 동작 확인 방법

1. `.env.local`에 `ANTHROPIC_API_KEY=...` 를 넣고 `npm run dev` (또는 Vercel에 환경변수 설정 후 재배포).
2. **InBody**: 처음 실행 → 목적 선택 → "InBody 결과지 사진으로 자동 입력" → 실제 결과지 사진 → "AI가 분석한 InBody 정보"에서 값 확인·수정 → 적용 → 영양 목표 확인. (마이 탭의 "결과지 사진으로 업데이트"로도 가능)
3. **음식**: 하단 촬영 버튼 → 실제 음식 사진 → 인식된 음식/중량 확인·수정 → "식사 기록하기" → 홈의 진행 바·"방금 기록했어요" 확인.
4. **오류 확인**: 음식이 아닌 사진 / InBody가 아닌 사진 / 키를 지운 상태에서 각각 안내 문구가 나오고 가짜 결과가 표시되지 않는지 확인.
5. 배포 후 함수 연결 확인: `curl -X POST https://<배포 URL>/api/analyze-food -H "Content-Type: application/json" -d "{}"` → JSON(`{"ok":false,...}`)이 오면 함수가 정상 배포된 것입니다 (HTML/404면 함수가 배포되지 않은 것).

### 보안 참고

- `/api/analyze-*` 는 인증이 없어 **URL을 아는 누구나 호출**할 수 있고, 호출마다 Anthropic 사용량이 발생합니다. 팀 공유용이라면 Vercel의 Deployment Protection(비밀번호/Vercel 인증)을 켜고, Anthropic 콘솔에서 월 사용 한도를 설정하세요. 정식 서비스 전에는 로그인과 호출 횟수 제한이 필요합니다.
- 서버 로그에는 이미지·API Key를 남기지 않고 에러 코드와 원인 요약만 남깁니다.

## Mock 데이터 위치

| 목적 | 위치 |
| --- | --- |
| 데모 사용자 프로필 / 목표 / 초기 식사 기록 | `src/data/mockData.ts` → `DEMO_PROFILE`, `DEMO_NUTRITION_TARGET`, `buildDemoMeals()` |
| **데모 모드 전용** 분석 결과 (음식·InBody 각 3종) | `src/data/mockData.ts` → `FOOD_ANALYSIS_MOCKS`, `INBODY_ANALYSIS_MOCKS` (실제 응답과 같은 형태, 영양소 숫자 없음) |
| 임시 영양 데이터셋 (약 200개, 100g 기준 추정치) | `src/data/foodDatabase.ts` → 향후 식약처 식품영양성분DB 등으로 교체 (`nutritionService`의 `NutritionProvider` 인터페이스) |
| 부족 영양소 기반 추천 음식 풀 | `src/data/mockData.ts` → `RECOMMENDATION_FOODS` |
| InBody 기반 목표 산출 공식 | `src/services/nutritionTargetService.ts` → `generateNutritionTarget()` |
| 섭취량 대비 상태 판정 / 규칙 기반 피드백·추천 | `src/lib/nutrition.ts` |

## 향후 연결 지점

- **영양 DB**: `src/services/nutritionService.ts` 의 `NutritionProvider`(`match`, `search`)를 구현한 새 Provider로 `localNutritionProvider`를 교체합니다. (예: 식약처 식품영양성분 DB API — AI 이름 매칭은 서버에서 처리하는 것을 권장)
- **InBody 기기/서비스 직접 연동**: `InBodyInput`의 수동 입력/사진 스캔 대신 API로 `UserProfile`을 채웁니다. 목표 계산은 `nutritionTargetService`를 서버 API로 교체할 수 있습니다.
- **Health / Fitness API (웨어러블)**: `src/types/index.ts`의 `Workout` 타입에 `caloriesBurned`, `heartRateAvg`, `source` 등을 추가하고, HealthKit/Google Fit 세션을 `Workout` 구조로 변환하는 `IMPORT_WORKOUT` 액션을 추가하면 `WorkoutHistory` UI를 그대로 재사용할 수 있습니다.

## 알려진 제한 사항

- **실제 사진으로 Claude가 분석한 결과는 아직 검증하지 못했습니다.** 개발 환경에 API Key를 사용할 수 없어, 서버 로직·에러 처리·화면 흐름은 가짜 응답으로 검증했고 인증 오류(가짜 키)까지의 실제 요청 경로만 확인했습니다. 실제 사진의 인식 정확도(특히 InBody 소수점, 음식 중량 추정)는 직접 테스트해 프롬프트를 조정해야 합니다.
- 음식 중량은 사진만으로 정확히 알 수 없어 **추정값**이며, 영양소는 임시 영양 데이터셋(추정치) 기준입니다. 영양 DB에 없는 음식은 사용자가 이름을 검색해 선택해야 기록할 수 있습니다.
- Chrome 브라우저 자동화 도구가 연결되어 있지 않아 실제 브라우저/기기에서의 클릭 테스트는 하지 못했고, jsdom 기반 화면 테스트로 대체했습니다. 카메라 권한, 반응형 레이아웃, 이미지 리사이즈(Canvas)는 실제 기기에서 확인이 필요합니다.
- Android/iOS 네이티브 앱(Capacitor)에서는 `/api/*` 가 상대 경로라 서버에 연결되지 않습니다. 네이티브 앱에서 AI 분석을 쓰려면 API 절대 주소와 CORS 설정이 추가로 필요합니다(미구현). 웹(배포 URL)에서는 동작합니다.
- 사진 촬영은 웹에서는 `<input type="file" capture>`(모바일 브라우저는 카메라 앱, 데스크톱은 파일 선택), 네이티브 앱에서는 `@capacitor/camera`를 사용합니다. 네이티브 실기기 동작은 검증하지 못했습니다.
- Vercel Function의 요청 본문 한도는 4.5MB라, 서버 전송 전 이미지를 브라우저에서 압축합니다(HEIC 등 브라우저가 열 수 없는 형식은 지원하지 않는다고 안내).
