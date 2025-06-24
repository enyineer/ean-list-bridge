import pinoLogger from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pinoLogger(
  isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: "yyyy-mm-dd HH:MM:ss.l o",
            ignore: "pid,hostname",
          },
        },
      }
    : {}
);
