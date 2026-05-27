const PROTECTED_PATH_PREFIXES = ["/analyzing", "/result"] as const;

export function shouldRedirectToUpload(pathname: string, sessionId: string | null) {
  const requiresSession = PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return requiresSession && !sessionId;
}
