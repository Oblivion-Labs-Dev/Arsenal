export {
  safeLocalStorage,
  readLocalStorage,
  writeLocalStorage,
  removeLocalStorage,
  readLocalStorageString,
  writeLocalStorageString,
  isBrowser,
} from "./storage/localStorage.js";

export { readSeenIds, markIdsSeen, clearSeenIds } from "./storage/seenIds.js";
export { clearSessionStorageKeys, migrateSessionToLocal } from "./storage/sessionMigration.js";

export { FetchClient, fetchClient, type FetchClientOptions, type FetchRequestOptions, type FetchResponse } from "./fetch/fetchClient.js";
export { ApiError, isApiError } from "./fetch/apiError.js";

export { cn } from "./utils/cn.js";
export { noop, clamp, hasKey } from "./utils/index.js";

export {
  useDocumentTitle,
  createDocumentTitleHook,
  createThemeHook,
  usePersistedState,
  type DocumentTitleOptions,
  type ThemeHookConfig,
  type ThemeHookResult,
  type UsePersistedStateOptions,
} from "./hooks/index.js";

export {
  validateFileAttachment,
  isImageAttachment,
  DEFAULT_MAX_ATTACHMENTS,
  DEFAULT_MAX_FILE_BYTES,
  type FileAttachmentRules,
} from "./validation/fileAttachment.js";

export { downloadCsv, csvFilename, type CsvDownloadOptions } from "./download/csvDownload.js";
export * from "./kit/index.js";
