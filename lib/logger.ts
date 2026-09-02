import pino, { type Logger } from "pino";

const level = process.env.LOG_LEVEL ?? "info";
const isDev = process.env.NODE_ENV === "development";

/**
 * Process-wide JSON logger. Pretty-printed in development only.
 * Never log secrets, raw IPs or full request headers.
 */
export const logger: Logger = pino({
  level,
  base: undefined,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "credentials", "GCP_SA_KEY_JSON"],
    remove: true,
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }
    : {}),
});

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
