// Champion-bezogene Helfer: Stammdaten-Ladung und alles rund um gebündelte
// Skins (Pfade, Namen, Verfügbarkeit).
import { CHAMPION_SKINS } from '@/config/championSkins'
import { SKIN_ORIGINAL } from '@/config/constants'

// ── Stammdaten ─────────────────────────────────────────────────────────────
export async function fetchChampionNames(): Promise<string[]> {
  const response = await fetch('/data/champion.csv')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const text = await response.text()
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

// ── Skins ──────────────────────────────────────────────────────────────────
/** Champion display name → skin folder name (PascalCase, no spaces/dots/apostrophes).
 *  "Aurelion Sol" → "AurelionSol", "Kai'sa" → "Kaisa", "Dr. Mundo" → "DrMundo". */
export function toSkinFolder(championName: string): string {
  return championName.replace(/['. ]/g, '')
}

/** All bundled skin file basenames for a champion (may include 'OriginalSkin').
 *  Empty array when no skin folder exists for the champion. */
export function getChampionSkins(championName: string): readonly string[] {
  return CHAMPION_SKINS[toSkinFolder(championName)] ?? []
}

/** Whether a skin basename is a real bundled file for this champion. */
export function hasChampionSkin(championName: string, skin: string): boolean {
  return getChampionSkins(championName).includes(skin)
}

/** Splash-art URL for a bundled skin file. */
export function getSkinImagePath(championName: string, skin: string): string {
  return `/img/skins/${toSkinFolder(championName)}/${skin}.jpg`
}

/** Classic square champion icon — the default look when no skin is equipped. */
export function getChampionIconPath(championName: string): string {
  return `/img/champion/${championName}.jpg`
}

/** Preview image for the default "Original" gallery card: the base splash art
 *  when it is bundled, otherwise the classic champion icon. */
export function getOriginalPreviewPath(championName: string): string {
  return hasChampionSkin(championName, SKIN_ORIGINAL)
    ? getSkinImagePath(championName, SKIN_ORIGINAL)
    : getChampionIconPath(championName)
}

/** Random bundled skin for a champion — the default look is one of the draws,
 *  it is simply the 'OriginalSkin' entry of the pool. Returns SKIN_ORIGINAL
 *  when no skins are bundled at all. */
export function pickRandomSkin(championName: string): string {
  const skins = getChampionSkins(championName)
  if (skins.length === 0) return SKIN_ORIGINAL
  return skins[Math.floor(Math.random() * skins.length)] ?? SKIN_ORIGINAL
}

/** Splash art of a champion wearing a specific skin, falling back to the
 *  classic square icon when that skin file is not bundled. */
export function getSkinArtPath(championName: string, skin: string): string {
  return hasChampionSkin(championName, skin)
    ? getSkinImagePath(championName, skin)
    : getChampionIconPath(championName)
}

/** File basename → human-readable skin name.
 *  "OriginalSkin" → "Original", "StarGuardianSkin" → "Star Guardian",
 *  "KDASkin" → "KDA", "PrestigeTrueDamageSkin" → "Prestige True Damage". */
export function formatSkinName(skin: string): string {
  const base = skin === SKIN_ORIGINAL ? 'Original' : skin.replace(/Skin$/, '')
  return base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
}
