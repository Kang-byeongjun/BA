# AI 식단 & 운동 관리 앱 (프로토타입)

InBody 데이터와 개인 목적을 기반으로 하루 영양 목표를 산출하고, 음식 사진을 촬영하면 AI가 분석했다고 가정하여 섭취 영양소를 기록·시각화하는 모바일 우선 웹 앱 프로토타입입니다. 실제 InBody API와 AI Vision API는 아직 연결되어 있지 않으며, Mock 데이터로 전체 서비스 흐름을 체험할 수 있습니다.

## 실행 방법

```bash
npm install
npm run dev       # 개발 서버 실행 (http://localhost:5173)
npm run build     # 타입 체크 + 프로덕션 빌드 (dist/)
npm run preview   # 빌드 결과 미리보기
npm run lint      # oxlint 정적 분석
```

모바일 화면 비율로 디자인되어 있으므로, 브라우저 개발자 도구의 기기 툴바(모바일 뷰)로 열어보는 것을 권장합니다. 데스크톱 너비에서는 실제 스마트폰처럼 중앙에 프레임 형태로 렌더링됩니다.

처음 실행하면 온보딩(목적 선택 → InBody 입력 → 목표 확인)이 나타나며, 첫 화면의 "데모 데이터로 바로 체험하기" 버튼을 누르면 아침·점심을 이미 먹은 상태의 데모 계정으로 바로 전체 기능을 체험할 수 있습니다.

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
src/
├── types/               # 전역 타입 정의 (UserProfile, NutritionTarget, Meal, Workout ...)
├── data/
│   └── mockData.ts       # 데모 프로필, AI 음식 분석 mock 결과, 추천 음식 풀
├── lib/                  # 순수 로직 (컴포넌트와 분리되어 재사용/교체 용이)
│   ├── nutrition.ts      # 목표 산출, 섭취율/상태 계산, 규칙 기반 피드백·추천 로직
│   ├── time.ts           # 타이머 포맷, 날짜 포맷 유틸
│   ├── storage.ts        # localStorage 래퍼
│   └── id.ts
├── context/
│   └── AppContext.tsx    # useReducer 기반 전역 상태 + localStorage 동기화
├── components/
│   ├── layout/           # MobileShell(폰 프레임), BottomNav
│   ├── onboarding/       # GoalSelect, InBodyInput, InBodyScanCapture/Flow, NutritionTargetReview, OnboardingFlow
│   ├── common/           # PhotoCaptureView, AnalyzingLoader (음식 촬영·InBody 스캔이 공유하는 카메라/로딩 UI)
│   ├── dashboard/        # Dashboard, CalorieSummary, NutritionBar, FeedbackPanel, RecommendationCard
│   ├── food/             # FoodCamera, AnalyzingLoader, FoodAnalysis, FoodCaptureFlow(오케스트레이터)
│   ├── meals/            # MealHistory, MealDetailModal
│   ├── workout/          # WorkoutTypeSelect, WorkoutTimerView, WorkoutComplete, WorkoutHistory, WorkoutScreen
│   └── profile/          # Profile
├── App.tsx               # 온보딩 여부 분기 + 탭 네비게이션 + 카메라 오버레이 라우팅
└── main.tsx
```

### 상태 관리 & 영속성

- 별도 라이브러리 없이 `React Context + useReducer`로 구성했습니다 (`src/context/AppContext.tsx`).
- `profile`, `nutritionTarget`, `meals`, `workouts`, `activeWorkout`(진행 중인 운동), `pendingWorkout`(저장 대기 중인 완료 기록), `onboarded` 값을 각각 `localStorage`에 동기화하여 새로고침해도 유지됩니다.
- 운동 타이머는 `setInterval`로 숫자를 단순 누적하지 않고, **세션 시작 시각(`segmentStart`) + 누적 시간(`accumulatedMs`)** 을 저장한 뒤 화면을 그릴 때마다 `Date.now()`와의 차이로 경과 시간을 계산합니다. 이 방식 덕분에 화면 전환/새로고침 이후에도 정확한 시간이 복구됩니다.

## Mock 데이터 위치

| 목적 | 위치 |
| --- | --- |
| 데모 사용자 프로필 / 목표 / 초기 식사 기록 | `src/data/mockData.ts` → `DEMO_PROFILE`, `DEMO_NUTRITION_TARGET`, `buildDemoMeals()` |
| AI 음식 분석 결과 (3종, 랜덤 반환) | `src/data/mockData.ts` → `FOOD_ANALYSIS_MOCKS`, `getRandomFoodAnalysis()` |
| InBody 결과지 사진 AI 분석 결과 (3종, 랜덤 반환) | `src/data/mockData.ts` → `INBODY_ANALYSIS_MOCKS`, `getRandomInBodyAnalysis()` |
| 음식 이름 검색용 영양 DB (자동완성, 약 200개) | `src/data/foodDatabase.ts` → `FOOD_DATABASE`, `searchFoodDatabase()` (한식/중식/일식/양식/분식/디저트/음료/과일/채소/재료 카테고리) |
| 부족 영양소 기반 추천 음식 풀 | `src/data/mockData.ts` → `RECOMMENDATION_FOODS` |
| InBody 기반 목표 산출 공식(모의 알고리즘) | `src/lib/nutrition.ts` → `generateNutritionTarget()` |
| 섭취량 대비 상태(부족/적정/목표 근접/초과) 판정 | `src/lib/nutrition.ts` → `getNutritionStatus()` |
| 규칙 기반 AI 피드백 문구 | `src/lib/nutrition.ts` → `generateFeedback()` |

## 향후 실제 API 연결 지점

### 1. AI Vision 음식 분석 API
- 위치: `src/components/food/FoodCaptureFlow.tsx` 의 `handleCapture()`
- 현재: 이미지를 촬영/업로드하면 `setTimeout` + `getRandomFoodAnalysis()`로 1.8초 후 mock 결과 3종 중 하나를 반환합니다.
- 연결 방법: 캡처된 이미지(`imageDataUrl`)를 실제 Vision API(예: 자체 서버의 이미지 분석 엔드포인트)로 업로드하고, 응답을 `FoodAnalysisResult` 타입(`src/types/index.ts`)에 맞춰 매핑하면 됩니다. 로딩 UI(`AnalyzingLoader`)와 결과 수정 UI(`FoodAnalysis`)는 그대로 재사용 가능합니다.
- 음식명 자동완성: `FoodAnalysis.tsx`에서 음식명을 다시 입력하면 `src/data/foodDatabase.ts`의 `searchFoodDatabase()`로 후보를 검색해 보여주고, 선택하면 100g당 영양 밀도로 칼로리가 자동 재계산됩니다. 실제 서비스에서는 `searchFoodDatabase()`를 식품 영양 DB API 조회로 교체하면 됩니다.

### 2. InBody 연동 API
- 위치: `src/components/onboarding/InBodyInput.tsx`, `src/components/onboarding/InBodyScanFlow.tsx`, `src/lib/nutrition.ts` 의 `generateNutritionTarget()`
- 현재: 사용자가 InBody 수치를 직접 입력하거나(수동), "InBody 결과지 사진으로 자동 입력" 버튼으로 결과지 사진을 촬영/업로드하면 `InBodyScanFlow`가 `setTimeout` + `getRandomInBodyAnalysis()`로 mock 수치를 생성해 폼에 채워줍니다. 이후 간단한 공식(활동계수·목적별 단백질 비율 등)으로 목표를 계산합니다.
- 연결 방법:
  - **결과지 사진 OCR/분석**: `InBodyScanFlow.tsx`의 `handleCapture()` 안 `setTimeout` + `getRandomInBodyAnalysis()`를, 촬영된 이미지를 서버로 전송해 수치를 추출하는 실제 OCR/비전 API 호출로 교체합니다. 응답을 `InBodyAnalysisResult` 타입(`src/data/mockData.ts`)에 맞추면 로딩 UI·결과 확인 화면은 그대로 재사용됩니다.
  - **기기/서비스 직접 연동**: InBody 기기·서비스 API에서 바로 값을 받아올 수 있다면 `InBodyInput`의 수동 입력 폼 대신 해당 API 호출로 `UserProfile`을 자동으로 채우면 됩니다.
  - `generateNutritionTarget()`을 서버의 영양 목표 산출 API 호출로 교체하면, 사용자가 결과를 직접 수정하는 `NutritionTargetReview` 단계는 그대로 유지할 수 있습니다.

### 3. Health / Fitness API (웨어러블 연동)
- 위치: `src/types/index.ts` 의 `Workout` / `ActiveWorkoutSession` 타입, `src/context/AppContext.tsx` 의 운동 관련 액션
- 현재: 앱 내 타이머로만 운동 시간을 측정하며, 칼로리 소모량은 계산하지 않습니다.
- 연결 방법: `Workout` 타입에 `caloriesBurned`, `heartRateAvg`, `source`(manual/healthkit/googlefit 등) 같은 필드를 추가하고, Apple HealthKit / Google Fit / 웨어러블 SDK에서 받아온 세션을 동일한 `Workout` 구조로 변환해 `dispatch({ type: 'SAVE_PENDING_WORKOUT' })` 대신 별도의 `IMPORT_WORKOUT` 액션으로 추가하면 기존 `WorkoutHistory` UI를 그대로 재사용할 수 있습니다.

## 알려진 제한 사항

- 이 세션 환경에서는 Chrome 브라우저 자동화 도구가 연결되어 있지 않아, 실제 브라우저 클릭 테스트 대신 `npm run build`(TypeScript 컴파일 + Vite 빌드)와 `npm run lint`로 정적 검증만 수행했습니다. 실행 후 실제 기기/브라우저에서 카메라 권한, 반응형 레이아웃 등을 확인해보시기 바랍니다.
- 사진 촬영은 웹에서는 `<input type="file" capture="environment">`를 사용합니다(모바일 브라우저에서는 네이티브 카메라 앱, 데스크톱에서는 파일 선택 창). 네이티브 앱(Capacitor)에서는 `@capacitor/camera`를 사용하도록 코드는 연동해뒀지만, 이 환경에는 Android Studio/Xcode가 없어 실제 기기·에뮬레이터에서의 동작은 검증하지 못했습니다. Android Studio(또는 Mac + Xcode)에서 직접 빌드해 확인해보시기 바랍니다.
