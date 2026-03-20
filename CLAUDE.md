# CLAUDE.md

## 프로젝트 개요
웹사이트/커뮤니티 게시판을 주기적으로 크롤링하여 키워드 매칭 게시물을 감지하고 iMessage/Email/Slack으로 알림을 보내는 개인용 모니터링 서비스. Mac 상시 구동 용도.

## 기술 스택
- Backend: Node.js + Express + TypeScript (tsx로 실행)
- DB: SQLite (sql.js, 파일 기반 `data/monitor.db`)
- Frontend: React 19 + Vite (`web-ui/` 디렉토리)
- AI: Claude API - 셀렉터 자동 분석, 게시물 요약
- Scheduler: node-cron

## 개발 명령어
```bash
npm run dev              # 백엔드 실행 (tsx watch, port 3847)
cd web-ui && npm run build  # 프론트엔드 빌드 (백엔드가 dist/ 서빙)
cd web-ui && npm run dev    # 프론트엔드 개발서버 (port 5173, API 프록시)
```

## 주요 설계 결정
- 게시글 중복 판별: external_id (원본 게시글 번호) 우선, URL 폴백
- 크롤링 매 실행마다 crawl_logs 테이블에 이력 기록 (total_found, new_posts, matched_posts)
- 소스 등록 시 즉시 1회 크롤링 실행 후 cron 스케줄 시작
- CSS 셀렉터는 2단계: row(전체 행) + 상대경로(title, link, postId, author)
- .env에서 ANTHROPIC_API_KEY 로드 (dotenv/config)

## 알림 채널 설정
알림 채널(iMessage/Email/Slack)의 수신자/인증 정보는 .env가 아닌 DB(notification_settings 테이블)에서 Web UI를 통해 관리.
.env.example의 알림 관련 항목은 레거시 참고용.

## 프론트엔드 빌드 필수
프론트엔드 변경 후 반드시 `cd web-ui && npm run build` 실행. 백엔드가 `web-ui/dist/`를 정적 파일로 서빙.
