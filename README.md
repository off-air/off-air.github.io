# OFF-AIR — 버추얼 크리에이터 기억 아카이브

버추얼 크리에이터의 활동을 기억하고 보존하는 반응형 웹 아카이브입니다.

- 공식 공개 주소: https://off-air.github.io
- 관리자 주소: https://off-air-vtuber-archive-admin.lununs.workers.dev/admin

## 운영 구조

- GitHub의 `main` 브랜치를 코드 원본으로 관리하고 공개 화면은 GitHub Pages에 배포합니다.
- Cloudflare Worker는 기록·이미지·제보·관리자 기능을 제공하는 운영 서버로 사용합니다.
- 기록·기억 집계·제보는 Cloudflare D1에, 프로필 및 갤러리 이미지는 Cloudflare R2에 저장합니다.
- 코드 배포와 운영 데이터는 분리되어 있으므로 새 버전을 배포해도 기록과 이미지는 유지됩니다.

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm ci
npm run dev
```

브라우저에서 표시되는 로컬 주소를 열어 확인합니다.

## 포함된 기능

- 기록 검색 및 최근 활동순·오래된 기록순·이름순 정렬
- 기록 카드에서 상세 화면 전환
- `기억하고 있어요`의 방문자별 선택과 전체 집계를 D1 데이터베이스에 보관
- 제보 내용을 D1 데이터베이스에 접수하는 폼
- 관리자 키 인증 후 기록을 서버에 저장하는 편집 화면
- 접수된 제보를 검토하고 처리 상태를 변경하는 관리자 제보함
- 개별 기록과 소개·제보·데이터 안내의 공유 가능한 실제 주소
- 보안 응답 헤더와 요청 횟수 제한 데이터 자동 정리
- 격자·목록 보기와 페이지당 표시 개수 선택
- 활동 종료·소식 두절·무기한 휴식 분류
- 프로필 및 갤러리 이미지의 최적화된 썸네일 제공

## 자동 배포 준비

GitHub 저장소의 Actions secrets에 아래 두 값을 등록합니다.

- `CLOUDFLARE_ACCOUNT_ID`: 배포 대상 Cloudflare 계정 ID
- `CLOUDFLARE_API_TOKEN`: Workers·D1·R2 배포 권한을 가진 전용 API 토큰

Cloudflare Worker에는 `YEOJEONHI_ADMIN_TOKEN`을 secret으로 별도 설정해야 관리자 저장 기능을 사용할 수 있습니다. 이 값은 GitHub 저장소나 소스 파일에 넣지 않습니다.

`main`에 반영된 변경은 검사 후 자동 배포됩니다. Pull Request에서는 배포 없이 코드 검사와 빌드만 실행됩니다.

## 수동 확인

```bash
npm run check
npm run build
```
