import { existsSync, readFileSync } from "fs";
import type { ServerResponse } from "http";

export function sendJson(res: ServerResponse, data: unknown): void {
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

export function serveFile(res: ServerResponse, path: string, contentType: string): void {
  if (!existsSync(path)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType });
  res.end(readFileSync(path, "utf-8"));
}
