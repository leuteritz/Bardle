// Champion-bezogene Helfer: Stammdaten-Ladung und alles rund um gebündelte
// Skins (Pfade, Namen, Verfügbarkeit).
import { CHAMPION_SKINS } from '@/config/champions/championSkins'
import {
  CHAMPION_ART_VARIANT_PX,
  CHAMPION_ART_SM_MAX_EDGE,
  CHAMPION_ART_MD_MAX_EDGE,
  CHAMPION_ART_LG_MAX_EDGE,
  SKIN_ORIGINAL,
} from '@/config/constants'
import type { ChampionArtSize } from '@/types'

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

/** Rewrites an art path to its generated downscale — `KDASkin.jpg` at size
 *  'sm' becomes `KDASkin-128.jpg`. 'full' keeps the untouched source. Every
 *  splash and icon under /img/skins and /img/champion has both variants. */
export function withArtVariant(imagePath: string, size: ChampionArtSize = 'full'): string {
  const px = CHAMPION_ART_VARIANT_PX[size]
  return px ? imagePath.replace(/\.jpg$/, `-${px}.jpg`) : imagePath
}

/** Splash-art URL for a bundled skin file. */
export function getSkinImagePath(
  championName: string,
  skin: string,
  size: ChampionArtSize = 'full',
): string {
  return withArtVariant(`/img/skins/${toSkinFolder(championName)}/${skin}.jpg`, size)
}

/**
 * Wählt die Kunststufe aus der TATSÄCHLICHEN Anzeigegröße eines Elements.
 *
 * Nötig, weil dieselbe Grafik an derselben Stelle je nach Auflösung sehr
 * unterschiedlich groß erscheint: ein Sigil-Knoten misst auf Full HD rund 60 px
 * und auf 4K über 200 px, weil das Profil-Modal mit dem Viewport wächst. Fest
 * verdrahtet man da eine Stufe, ist sie auf der einen Auflösung verschwendet und
 * auf der anderen zu klein. Also: messen statt raten.
 *
 * @param edgePx längste gerenderte Kante in CSS-Pixeln
 */
export function championArtSizeFor(edgePx: number): ChampionArtSize {
  if (edgePx <= CHAMPION_ART_SM_MAX_EDGE) return 'sm'
  if (edgePx <= CHAMPION_ART_MD_MAX_EDGE) return 'md'
  if (edgePx <= CHAMPION_ART_LG_MAX_EDGE) return 'lg'
  return 'full'
}

/** Classic square champion icon — the default look when no skin is equipped. */
export function getChampionIconPath(championName: string, size: ChampionArtSize = 'full'): string {
  // Die Icons sind 380×380 — kleiner als die 512er-Stufe. Eine `-512`-Datei
  // gäbe es dort weder, noch wäre sie sinnvoll: sie wäre hochskaliert und damit
  // schlechter als die Vorlage. 'lg' fällt hier also aufs Original zurück.
  return withArtVariant(`/img/champion/${championName}.jpg`, size === 'lg' ? 'full' : size)
}

/** Preview image for the default "Original" gallery card: the base splash art
 *  when it is bundled, otherwise the classic champion icon. */
export function getOriginalPreviewPath(
  championName: string,
  size: ChampionArtSize = 'full',
): string {
  return hasChampionSkin(championName, SKIN_ORIGINAL)
    ? getSkinImagePath(championName, SKIN_ORIGINAL, size)
    : getChampionIconPath(championName, size)
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
export function getSkinArtPath(
  championName: string,
  skin: string,
  size: ChampionArtSize = 'full',
): string {
  return hasChampionSkin(championName, skin)
    ? getSkinImagePath(championName, skin, size)
    : getChampionIconPath(championName, size)
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
