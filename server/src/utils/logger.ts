type LogLevel = "info" | "warn" | "error" | "debug";

function formatLog(level: LogLevel, message: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data, null, 0)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  info: (message: string, data?: unknown) => console.log(formatLog("info", message, data)),
  warn: (message: string, data?: unknown) => console.warn(formatLog("warn", message, data)),
  error: (message: string, data?: unknown) => console.error(formatLog("error", message, data)),
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(formatLog("debug", message, data));
    }
  },
};
