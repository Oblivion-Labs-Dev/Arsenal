import type { JSONValue } from "@oblivion-labs/arsenal-shared";
import { isAppError } from "../errors/AppError.js";

/** Standard success response shape. */
export interface ApiSuccessResponse<T> {
  status: "success";
  data: T;
}

/** Standard error response shape. */
export interface ApiErrorResponse {
  status: "error";
  message: string;
  code: string;
}

/** Create a typed success response body. */
export function apiSuccess<T>(data: T): ApiSuccessResponse<T> {
  return { status: "success", data };
}

/** Create a typed error response body. */
export function apiError(message: string, code = "INTERNAL_ERROR"): ApiErrorResponse {
  return { status: "error", message, code };
}

/** Map an unknown error to an API error response. */
export function apiErrorFromUnknown(error: unknown, fallbackMessage = "An unexpected error occurred"): ApiErrorResponse {
  if (isAppError(error)) {
    return { status: "error", message: error.message, code: error.code };
  }
  if (error instanceof Error) {
    return { status: "error", message: error.message, code: "INTERNAL_ERROR" };
  }
  return { status: "error", message: fallbackMessage, code: "INTERNAL_ERROR" };
}

/** HTTP status code for an error (defaults to 500). */
export function httpStatusFromError(error: unknown): number {
  if (isAppError(error)) return error.statusCode;
  return 500;
}

/** Structured log-friendly error fields. */
export function errorFields(error: unknown): JSONValue {
  if (isAppError(error)) {
    return error.toJSON() as JSONValue;
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}
