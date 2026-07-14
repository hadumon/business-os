export type { Logger, LogLevel } from "@business-os/core";
import type { Logger, LogLevel } from "@business-os/core";

export function createConsoleLogger(agentId: string): Logger {
  const log = (level: LogLevel, msg: string, meta?: Record<string, unknown>) => {
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${agentId}] ${msg}`;
    const consoleMethod = level === "debug" ? "log" : level;
    if (meta) {
      console[consoleMethod](line, meta);
    } else {
      console[consoleMethod](line);
    }
  };

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  };
}
