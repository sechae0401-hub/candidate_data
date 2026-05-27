export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiHandlerOptions {
  defaultErrorMessage?: string;
  successStatus?: number;
}

function normalizeErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  console.error("Unhandled API error:", error);

  return {
    message: fallbackMessage,
    statusCode: 500,
  };
}

export function createErrorResponse(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}

export async function withApiHandler<T>(
  handler: () => Promise<T>,
  options: ApiHandlerOptions = {},
) {
  const fallbackMessage = options.defaultErrorMessage ?? "데이터 처리 중 오류가 발생했습니다.";
  const successStatus = options.successStatus ?? 200;

  try {
    const result = await handler();
    return Response.json(result, { status: successStatus });
  } catch (error) {
    const normalized = normalizeErrorMessage(error, fallbackMessage);
    return createErrorResponse(normalized.message, normalized.statusCode);
  }
}
