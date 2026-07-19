export function matchIgnored(file: string, patterns: string[]): boolean {
  const posix = file.replace(/\\/g, "/");
  return patterns.some((pattern) => matchGlob(posix, pattern));
}

function matchGlob(path: string, pattern: string): boolean {
  // Minimal glob: ** / * support for ignore patterns
  const escaped = pattern
    .replace(/\\/g, "/")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "<<<GLOBSTAR>>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<<GLOBSTAR>>>/g, ".*");
  return new RegExp(`^${escaped}$`).test(path) || new RegExp(escaped).test(path);
}
