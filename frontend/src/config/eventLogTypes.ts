import type { GameEventType } from '@/composables/useEventLog'
import { ROLE_COLORS } from './constants'

export const typeIcon: Record<GameEventType, string> = {
  support: 'game-icons:star-swirl',
  top: 'game-icons:tower-shield',
  mid: 'game-icons:fire-ray',
  adc: 'game-icons:arrow-scope',
  jungle: 'game-icons:hunting-knife',
  planet: '/img/planet.png',
  augment: 'game-icons:power-ring',
  meep: 'game-icons:alien-bug',
  chime: 'game-icons:wind-chime',
  combat: 'game-icons:crossed-sabres',
  prestige: 'game-icons:galaxy',
  info: 'game-icons:open-book',
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
