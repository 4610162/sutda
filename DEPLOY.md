# 배포 가이드

## 순서 요약

1. PartyKit Cloud 배포 (백엔드)
2. GitHub Push
3. Vercel 배포 (프론트엔드)

---

## 1. PartyKit Cloud 배포

### 로그인

```bash
cd /home/dlxorals212/project/sutda-game/partykit
npx partykit login
```

브라우저에서 GitHub 계정으로 인증 후, 터미널에 성공 메시지가 뜨면 확인:

```bash
npx partykit whoami
# → 로그인된 GitHub 계정명 출력
```

### 배포

```bash
cd /home/dlxorals212/project/sutda-game/partykit
npx partykit deploy
```

배포 완료 시 아래와 같은 URL이 출력됩니다:

```
✅ Deployed to https://sutda-game-server.{github-username}.partykit.dev
```

이 URL을 메모해 두세요. 프론트엔드 환경변수에 사용합니다.

---

## 2. GitHub Push

### 저장소 생성 (최초 1회)

GitHub 웹사이트에서 새 Repository 생성 후:

```bash
cd /home/dlxorals212/project/sutda-game

git init
git add .
git commit -m "Initial commit: 섯다 멀티플레이어 게임"

git remote add origin https://github.com/{github-username}/sutda-game.git
git branch -M main
git push -u origin main
```

### 이후 변경사항 Push

```bash
git add .
git commit -m "변경 내용 설명"
git push
```

---

## 3. Vercel 배포

### 방법 A — Vercel 웹사이트 연동 (권장)

1. [vercel.com](https://vercel.com) 로그인 (GitHub 계정)
2. **Add New Project** → GitHub 저장소 `sutda-game` 선택
3. 설정 입력:

   | 항목 | 값 |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | `Vite` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. **Environment Variables** 탭에서 추가:

   | 변수명 | 값 |
   |---|---|
   | `VITE_PARTY_URL` | `sutda-game-server.{github-username}.partykit.dev` |

5. **Deploy** 클릭

이후 `main` 브랜치에 push할 때마다 자동 재배포됩니다.

### 방법 B — CLI 배포

```bash
# Vercel CLI 설치 (최초 1회)
npm i -g vercel

# 로그인
vercel login

# 프론트엔드 배포
cd /home/dlxorals212/project/sutda-game/frontend

# 환경변수 설정
echo "VITE_PARTY_URL=sutda-game-server.{github-username}.partykit.dev" > .env

# 배포
vercel --prod
```

---

## 환경변수 정리

| 위치 | 변수명 | 로컬 값 | 배포 값 |
|---|---|---|---|
| `frontend/.env` | `VITE_PARTY_URL` | `localhost:1999` | `sutda-game-server.{username}.partykit.dev` |

> `frontend/.env` 파일은 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다.
> Vercel 환경변수는 대시보드에서 별도로 설정해야 합니다.

---

## 재배포 시

### PartyKit 서버 코드 변경 후

```bash
cd /home/dlxorals212/project/sutda-game/partykit
npx partykit deploy
```

### 프론트엔드 코드 변경 후

GitHub push만 하면 Vercel이 자동 재배포합니다 (방법 A 사용 시):

```bash
git add .
git commit -m "프론트엔드 수정"
git push
```
