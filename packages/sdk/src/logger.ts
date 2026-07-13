export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export function createConsoleLogger(agentId: string): Logger {
  const log = (level: LogLevel, msg: string, meta?: Record<string, unknown>) => {
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${agentId}] ${msg}`;
    if (meta) {
      console[level === "debug" ? "log" : level](line, meta);
    } else {
      console[level === "debug" ? "log" : level](line);
    }
  };

  return {
    debug: (msg, meta) => log("debug", msg, meta),
    info: (msg, meta) => log("info", msg, meta),
    warn: (msg, meta) => log("warn", msg, meta),
    error: (msg, meta) => log("error", msg, meta),
  };
}
