// 빌드 타임에 인라인되는 공개 플래그.
// autoproposal 실행은 같은 서버의 pixt-runner(로컬)에 의존하므로,
// 클라우드(Vercel) 배포본에서는 기본적으로 숨긴다.
// 로컬에서 쓰려면 .env.local 에 NEXT_PUBLIC_ENABLE_AUTOPROPOSAL=1 을 넣는다.
export const AUTOPROPOSAL_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_AUTOPROPOSAL === "1" ||
  process.env.NEXT_PUBLIC_ENABLE_AUTOPROPOSAL === "true";
