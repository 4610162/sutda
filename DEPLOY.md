# 섯다 게임 v2 — 배포 가이드 (Convex + Vercel)

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프런트엔드 | Vue 3 + Vite + TailwindCSS |
| 백엔드 / DB | Convex (실시간 구독, serverless functions) |
| 호스팅 | Vercel (프런트) + Convex Cloud (백엔드) |

---

## 순서 요약

1. Convex 프로젝트 초기화
2. 로컬 개발 (`npx convex dev`)
3. GitHub Push
4. Convex 프로덕션 배포 (`npx convex deploy`)
5. Vercel 프런트엔드 배포

---

## 1. 사전 준비 — 의존성 설치

```bash
# 프로젝트 루트에서
cd /home/dlxorals212/project/sutda-game

# 루트(convex CLI) 의존성
npm install

# 프런트엔드 의존성
cd frontend && npm install && cd ..
```

---

## 2. Convex 프로젝트 초기화 (최초 1회)

```bash
# 프로젝트 루트에서
npx convex dev
```

최초 실행 시 브라우저가 열리며 Convex 계정 로그인/가입을 안내합니다.
로그인 후 프로젝트 이름을 입력하면 아래 파일들이 자동 생성됩니다:

```
convex/_generated/         ← 자동 생성 (커밋 불필요)
convex.json                ← 프로젝트 설정 (커밋 필요)
```

---

## 3. 로컬 개발 및 테스트

### 방법 A — 한 번에 실행 (권장)

```bash
# 프로젝트 루트에서 — Convex dev + Vue dev server 동시 실행
npm run dev
```

| 서비스 | URL |
|--------|-----|
| 프런트엔드 | http://localhost:5173 |
| Convex 대시보드 | https://dashboard.convex.dev |

### 방법 B — 개별 실행

터미널 1 (Convex 로컬 서버):
```bash
npx convex dev
```

터미널 2 (Vue 개발 서버):
```bash
cd frontend && npm run dev
```

### 환경변수 설정

`npx convex dev` 첫 실행 시 `.env.local`에 `CONVEX_DEPLOYMENT` 값이 자동 저장됩니다.
프런트엔드용 `.env` 파일 생성:

```bash
# frontend/.env (로컬용)
# npx convex dev 실행 후 터미널에 출력된 URL을 복사하세요
echo "VITE_CONVEX_URL=https://<your-deployment>.convex.cloud" > frontend/.env
```

---

## 4. Convex 프로덕션 배포

```bash
# 프로젝트 루트에서
npx convex deploy
```

배포 완료 후 출력 예시:
```
✓ Deployed Convex functions to production
  URL: https://happy-animal-123.convex.cloud
```

이 URL이 `VITE_CONVEX_URL` 환경변수 값입니다.

---

## 5. GitHub Push

```bash
cd /home/dlxorals212/project/sutda-game

git add .
git commit -m "v2: PartyKit → Convex 전환, 섯다 고도화"
git push origin main
```

`.gitignore`에 추가 권장:
```
convex/_generated/
frontend/.env
.env.local
```

---

## 6. Vercel 프런트엔드 배포

### 방법 A — Vercel 웹사이트 연동 (권장)

1. [vercel.com](https://vercel.com) 로그인 (GitHub 계정)
2. **Add New Project** → GitHub 저장소 `sutda-game` 선택
3. 빌드 설정:

   | 항목 | 값 |
   |------|-----|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | `Vite` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. **Environment Variables** 탭에서 추가:

   | 변수명 | 값 |
   |--------|-----|
   | `VITE_CONVEX_URL` | `https://<your-deployment>.convex.cloud` |

5. **Deploy** 클릭

이후 `main` 브랜치 push 시 자동 재배포됩니다.

### 방법 B — CLI 배포

```bash
npm i -g vercel
vercel login

cd /home/dlxorals212/project/sutda-game/frontend
vercel --prod \
  --env VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
```

---

## 환경변수 정리

| 파일 위치 | 변수명 | 로컬 값 | 프로덕션 값 |
|-----------|--------|---------|------------|
| `frontend/.env` | `VITE_CONVEX_URL` | `https://<dev>.convex.cloud` | `https://<prod>.convex.cloud` |

> `frontend/.env`는 `.gitignore`에 포함하세요.
> Vercel 환경변수는 대시보드에서 별도 설정합니다.

---

## 재배포 시

### Convex 함수(서버 로직) 변경 후

```bash
npx convex deploy
```

### 프런트엔드 변경 후

GitHub push 시 Vercel 자동 재배포됩니다.

---

## Convex 대시보드 활용

| 기능 | URL |
|------|-----|
| 데이터 조회/수정 | https://dashboard.convex.dev → Data |
| 함수 실행 로그 | https://dashboard.convex.dev → Logs |
| 스케줄러/Cron 설정 | https://dashboard.convex.dev → Schedules |

---

## 게임 규칙 요약 (v2)

| 항목 | 값 |
|------|-----|
| 초기 자본금 | 100,000원 |
| 기본 베팅 (앤티) | 2,000원 |
| 카드 덱 | 24장(월 1~12, 2장씩) × 2세트 = 48장 |
| 광패 월 | 1월(히카리), 3월(히카리), 8월(히카리) |
| 베팅 액션 | 하프(½), 쿼터(¼), **콜(Call·즉시쇼다운)**, 다이 |
| 세션 | 판 종료 후 잔액 유지, 레디 버튼으로 다음 판 진행 |
