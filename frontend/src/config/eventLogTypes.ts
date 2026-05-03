import type { GameEventType } from '@/composables/useEventLog'
import { ROLE_COLORS } from './constants'

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
  support: ROLE_COLORS.support,
  top: ROLE_COLORS.top,
  mid: ROLE_COLORS.mid,
  adc: ROLE_COLORS.adc,
  jungle: ROLE_COLORS.jungle,
  planet: '#7ec8e3',
  augment: '#c084fc',
  meep: '#6ee7b7',
  chime: '#fde68a',
  combat: '#fb923c',
  prestige: '#818cf8',
  info: '#c8b89a',
}
