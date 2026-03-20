# WebMonitor

웹사이트/커뮤니티 게시판을 주기적으로 크롤링하여 키워드에 해당하는 새 게시물을 감지하고, iMessage/Email/Slack으로 알림을 보내는 개인용 모니터링 서비스입니다.

Mac에서 상시 구동하며 사용하도록 설계되었습니다.

## 주요 기능

- **HTML/RSS 크롤링** - 게시판 HTML 페이지와 RSS 피드 모두 지원
- **AI 셀렉터 자동 분석** - URL만 입력하면 Claude API가 CSS 셀렉터를 자동 감지
- **키워드 매칭** - 등록한 키워드가 포함된 게시물만 필터링하여 알림
- **게시글 ID 기반 중복 방지** - 원본 게시글 번호(external_id)로 중복 알림 차단
- **AI 요약** - 새 게시물 내용을 Claude API로 2-3문장 자동 요약
- **다채널 알림** - iMessage (macOS), Email (SMTP), Slack Webhook
- **크롤링 주기 조절** - 소스별 1분~1440분 설정 (기본 5분)
- **크롤링 이력** - 매 실행마다 수집/신규/매칭 결과를 로그로 기록
- **Web UI** - React 기반 관리 대시보드

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (sql.js) |
| Frontend | React 19, Vite, React Router |
| AI | Claude API (@anthropic-ai/sdk) |
| Crawler | Axios, Cheerio, rss-parser |
| Scheduler | node-cron |

## 시작하기

### 사전 요구사항

- Node.js 18+
- Anthropic API Key (AI 분석/요약 기능)

### 설치

```bash
# 의존성 설치
npm install
cd web-ui && npm install && cd ..

# 환경변수 설정
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY 입력
```

### 실행

```bash
# 프론트엔드 빌드
cd web-ui && npm run build && cd ..

# 서버 실행 (개발)
npm run dev

# 서버 실행 (프로덕션)
npm run build
npm start
```

서버 실행 후 **http://localhost:3847** 에서 Web UI에 접속합니다.

### 사용 흐름

1. **알림 설정** - 알림 설정 페이지에서 iMessage/Email/Slack 중 사용할 채널 활성화
2. **소스 등록** - 모니터링 소스 페이지에서 URL과 키워드 등록
   - HTML 게시판: URL 입력 후 "자동 분석"으로 셀렉터 감지, 또는 수동 입력
   - RSS: URL만 입력하면 됨
3. **모니터링** - 등록 즉시 1회 크롤링 후, 설정한 주기마다 자동 크롤링
4. **확인** - 크롤링 이력, 감지된 게시물, 알림 이력 페이지에서 결과 확인

## 프로젝트 구조

```
web-monitor/
├── src/
│   ├── index.ts                 # 엔트리포인트
│   ├── db/index.ts              # SQLite DB (sql.js)
│   ├── crawler/
│   │   ├── html-crawler.ts      # HTML 게시판 크롤러
│   │   ├── rss-crawler.ts       # RSS 피드 크롤러
│   │   ├── selector-analyzer.ts # AI CSS 셀렉터 분석
│   │   └── content-summarizer.ts# AI 게시물 요약
│   ├── scheduler/index.ts       # cron 스케줄러
│   ├── notifier/
│   │   ├── index.ts             # 알림 디스패처
│   │   ├── imessage.ts          # iMessage (AppleScript)
│   │   ├── email.ts             # Email (SMTP)
│   │   └── slack.ts             # Slack Webhook
│   └── web/
│       ├── server.ts            # Express 서버
│       └── api/                 # REST API 라우터
├── web-ui/                      # React 프론트엔드
│   └── src/
│       ├── App.tsx
│       ├── api.ts               # API 클라이언트
│       └── pages/               # 페이지 컴포넌트
├── data/                        # SQLite DB 파일 (gitignore)
├── .env.example
└── package.json
```

## CSS 셀렉터 입력 가이드

셀렉터는 2단계로 동작합니다:

1. **row** - 모든 게시글 행을 선택하는 셀렉터 (`nth-child` 제거)
2. **title, link, postId, author** - row 기준 상대 경로

예시 (네이버 카페):

| 필드 | 셀렉터 |
|------|--------|
| row | `#cafe_content > div.article-board > table > tbody > tr` |
| title | `td.td_article > div.board-list > div > a` |
| link | `td.td_article > div.board-list > div > a` |
| postId | `td.td_article > div.board-number > div` |
| author | `td.td_name > div > table a` |

## 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Claude API 키 (필수) | - |
| `PORT` | 웹 서버 포트 | 3847 |

알림 채널 설정은 Web UI의 알림 설정 페이지에서 관리합니다.

## 라이선스

MIT
