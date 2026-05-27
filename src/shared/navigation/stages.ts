export const APP_STAGES = [
  { id: "upload", label: "업로드", href: "/upload" },
  { id: "analyzing", label: "분류 중", href: "/analyzing" },
  { id: "result", label: "결과", href: "/result" },
] as const;

export type AppStageId = (typeof APP_STAGES)[number]["id"];

export function getStageForPath(pathname: string): AppStageId {
  if (pathname.startsWith("/result")) {
    return "result";
  }

  if (pathname.startsWith("/analyzing")) {
    return "analyzing";
  }

  return "upload";
}
