export { OpenRouterClient } from "./ai/openrouter/index.js";
export type {
  OpenRouterClientConfig,
  ChatCompletionOptions,
  ChatJsonOptions,
  ChatCompletionResult,
  ChatCompletionResponse,
  ChatMessage,
} from "./ai/openrouter/index.js";

export { AppError, isAppError } from "./errors/index.js";
export {
  apiSuccess,
  apiError,
  apiErrorFromUnknown,
  httpStatusFromError,
  errorFields,
  type ApiSuccessResponse,
  type ApiErrorResponse,
} from "./http/index.js";
export {
  Logger,
  logger,
  truncateForLog,
  endpointLabel,
  isAbortError,
  errorMessage,
  readErrorBody,
  type LogLevel,
  type LogFields,
  type LoggerOptions,
} from "./logging/index.js";
export {
  safeJsonParse,
  retry,
  sleep,
  withTimeout,
  createTimeoutSignal,
  type RetryOptions,
  type TimeoutOptions,
} from "./utils/index.js";
export { parseEnv, openRouterEnvSchema, readOpenRouterEnv, type OpenRouterEnv } from "./config/env.js";
export { GmailGateway, SendEmailSchema, type SendEmailInput, type GmailGatewayConfig } from "./gateways/gmail.js";

export * from "./net/index.js";
export * from "./ai-kit/index.js";
export * from "./documents/index.js";
