import { refreshToken } from "./oauth.js";

export function getSessionToken(): string {
  return refreshToken("session");
}
