export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type LoggerOptions = {
  service: string;
  level?: LogLevel;
};

export type LogFields = Record<string, string | number | boolean | null | undefined>;

const levelWeight: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

export type Logger = {
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  debug: (message: string, fields?: LogFields) => void;
};

export function createLogger(options: LoggerOptions): Logger {
  const minLevel = options.level ?? 'info';

  const write = (level: LogLevel, message: string, fields: LogFields = {}): void => {
    if (levelWeight[level] < levelWeight[minLevel]) {
      return;
    }
    const payload = {
      level,
      service: options.service,
      message,
      time: new Date().toISOString(),
      ...fields,
    };
    const line = JSON.stringify(payload);
    if (level === 'error' || level === 'fatal') {
      console.error(line);
      return;
    }
    if (level === 'warn') {
      console.warn(line);
      return;
    }
    console.log(line);
  };

  return {
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
    debug: (message, fields) => write('debug', message, fields),
  };
}
