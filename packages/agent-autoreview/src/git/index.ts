export { detectChangedFiles, type DetectedChanges, type DetectChangesOptions } from "./detect-changes.js";
export {
  startTaskSession,
  loadTaskSession,
  finishTaskSession,
  clearTaskSession,
  isolateSessionChanges,
  sessionStatus,
  taskContextSummary,
} from "./session.js";
export {
  isGitRepository,
  runGit,
  tryGit,
  parseNameOnly,
  parsePorcelainPaths,
  uniquePaths,
} from "./utils.js";
