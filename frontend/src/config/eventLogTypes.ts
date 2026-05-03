// frontend/src/config/eventLogTypes.ts
import type { GameEventType } from '@/composables/useEventLog'

export const typeIcon: Record<GameEventType, string> = {
  support: '✨',
  top: '🛡️',
  mid: '🔥',
  adc: '🏹',
  jungle: '🗡️',
  planet: '🪐',
  augment: '✦',
  meep: '👾',
  chime: '🔔',
  combat: '⚔️',
  prestige: '🌌',
  info: '📜',
}

export const typeColor: Record<GameEventType, string> = {
  support: '#f4c55a',
  top: '#7dd3fc',
  mid: '#c084fc',
  adc: '#fb923c',
  jungle: '#6ee7b7',
  planet: '#7ec8e3',
  augment: '#c084fc',
  meep: '#6ee7b7',
  chime: '#fde68a',
  combat: '#fb923c',
  prestige: '#818cf8',
  info: '#c8b89a',
}
