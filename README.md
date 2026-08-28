# GC Sweeper

메모리 블록에서 쓰레기를 찾아 수거하는 가비지 컬렉션(GC) 알고리즘 학습 퍼즐 게임입니다.
지뢰찾기와 비슷한 형태의 보드에서, 루트(root)로부터의 참조(reference)가 끊긴 —
즉 더 이상 도달할 수 없는(unreachable) — 메모리 블록을 찾아내는 방식으로 GC의
reachability 개념을 체험할 수 있습니다.

- 배포 URL: https://gc-sweeper.코드.kr
- React, TypeScript, Vite, shadcn/ui 기반

## 개발 및 실행

```bash
# 의존성 설치
bun install

# 개발 서버 실행
bun run dev
```

## 빌드

```bash
bun run build
```

## Cloudflare Workers 배포

정적 산출물(`./dist`)을 [wrangler](https://developers.cloudflare.com/workers/wrangler/)로
Cloudflare Workers(assets)에 배포합니다.

```bash
bun run build
wrangler deploy
```
