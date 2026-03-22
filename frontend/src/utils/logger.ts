type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
type LogCategory =
  | 'Game'
  | 'Battle'
  | 'Shop'
  | 'Mission'
  | 'Planet'
  | 'Inventory'
  | 'Augment'
  | 'System'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

const isTest = typeof import.meta.env.VITEST !== 'undefined'
const MIN_LEVEL: LogLevel = import.meta.env.DEV && !isTest ? 'INFO' : 'WARN'

const CATEGORY_COLORS: Record<LogCategory, string> = {
  Game: '#22c55e',
  Battle: '#22c55e',
  Mission: '#22c55e',
  Planet: '#22c55e',
  Shop: '#3b82f6',
  Inventory: '#3b82f6',
  Augment: '#3b82f6',
  System: '#8b5cf6',
}

const LEVEL_COLORS: Partial<Record<LogLevel, string>> = {
  WARN: '#f59e0b',
  ERROR: '#ef4444',
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

function getStyle(level: LogLevel, category: LogCategory): string {
  const color = LEVEL_COLORS[level] ?? CATEGORY_COLORS[category]
  return `color: ${color}; font-weight: bold`
}

function log(level: LogLevel, category: LogCategory, msg: string, data?: unknown): void {
  if (!shouldLog(level)) return

  const prefix = `%c[${category}]`
  const style = getStyle(level, category)
  const consoleFn =
    level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log

  if (data !== undefined) {
    consoleFn(prefix, style, msg, data)
  } else {
    consoleFn(prefix, style, msg)
  }
}

export const logger = {
  debug(category: LogCategory, msg: string, data?: unknown): void {
    log('DEBUG', category, msg, data)
  },
  info(category: LogCategory, msg: string, data?: unknown): void {
    log('INFO', category, msg, data)
  },
  warn(category: LogCategory, msg: string, data?: unknown): void {
    log('WARN', category, msg, data)
  },
  error(category: LogCategory, msg: string, data?: unknown): void {
    log('ERROR', category, msg, data)
  },
  group(label: string, fn: () => void, collapsed = true): void {
    if (!shouldLog('INFO')) return
    if (collapsed) {
      console.groupCollapsed(label)
    } else {
      console.group(label)
    }
    fn()
    console.groupEnd()
  },
}
