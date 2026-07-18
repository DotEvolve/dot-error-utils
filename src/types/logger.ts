export interface LogMeta {
  [key: string]: unknown;
}

export interface BrowserLogger {
  debug(msg: string): void;
  debug(obj: LogMeta, msg: string): void;
  info(msg: string): void;
  info(obj: LogMeta, msg: string): void;
  warn(msg: string): void;
  warn(obj: LogMeta, msg: string): void;
  error(msg: string): void;
  error(obj: LogMeta | Error, msg?: string): void;
  fatal(msg: string): void;
  fatal(obj: LogMeta | Error, msg?: string): void;
  child(bindings: LogMeta): BrowserLogger;
}
