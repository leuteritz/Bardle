import allIconsRaw from '../config/gameicons.txt?raw'
import { USED_GAME_ICONS } from '../config/constants'

const ALL_ICONS: string[] = allIconsRaw.split(',').map((s) => s.trim()).filter(Boolean)

export function loadAllGameIcons(): string[] {
  return [...ALL_ICONS]
}

export function getAvailableIcons(): string[] {
  return ALL_ICONS.filter((icon) => !USED_GAME_ICONS.has(icon))
}

export function pickNewIcon(keyword?: string): string {
  const available = getAvailableIcons()
  if (keyword) {
    const kw = keyword.toLowerCase()
    const match = available.find((icon) => icon.replace('game-icons:', '').includes(kw))
    if (match) return match
  }
  return available[Math.floor(Math.random() * available.length)]
}

export function registerUsedIcon(icon: string): void {
  USED_GAME_ICONS.add(icon)
}

export function isValidIcon(icon: string): boolean {
  return ALL_ICONS.includes(icon)
}
