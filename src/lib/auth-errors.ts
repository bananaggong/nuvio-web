export type LoginErrorCode =
  | "auth_callback"
  | "missing_code"
  | "oauth_cancelled"
  | "oauth_state";

type OAuthErrorInput = {
  error?: string | null;
  errorCode?: string | null;
};

const oauthStateErrorCodes = new Set([
  "bad_oauth_state",
  "flow_state_expired",
  "flow_state_not_found",
]);

export function getOAuthLoginErrorCode({
  error,
  errorCode,
}: OAuthErrorInput): LoginErrorCode | null {
  const normalizedError = normalizeErrorValue(error);
  const normalizedErrorCode = normalizeErrorValue(errorCode);

  if (normalizedErrorCode && oauthStateErrorCodes.has(normalizedErrorCode)) {
    return "oauth_state";
  }

  if (normalizedError === "access_denied") {
    return "oauth_cancelled";
  }

  if (normalizedError || normalizedErrorCode) {
    return "auth_callback";
  }

  return null;
}

export function getLoginErrorMessage(error: string | null | undefined): string {
  switch (normalizeErrorValue(error)) {
    case "oauth_state":
      return "로그인 요청 정보를 확인할 수 없거나 만료됐습니다. 다시 로그인해 주세요.";
    case "oauth_cancelled":
      return "소셜 로그인이 취소됐습니다. 계속하려면 다시 시도해 주세요.";
    case "missing_code":
      return "로그인 응답에 필요한 정보가 없습니다. 다시 로그인해 주세요.";
    case "auth_callback":
      return "소셜 로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.";
    case "":
      return "";
    default:
      return "소셜 로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.";
  }
}

function normalizeErrorValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}
