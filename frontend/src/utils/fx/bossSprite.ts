import { BOSS_IMAGE_PATHS } from '@/config/constants'

/**
 * Boss-Sprite-Auswahl und -Vorwärmung.
 *
 * Zwei Probleme, die hier gelöst werden:
 *
 * 1. **Deterministisch statt zufällig.** Früher würfelte die Arena bei jedem
 *    Mount ein neues Sprite — dadurch wechselte derselbe Boss beim Wieder-
 *    Öffnen sein Aussehen, UND es war fast immer ein noch nicht gerastertes
 *    Bild, dessen Decode dann im Öffnen-Frame landete. Über die planetId
 *    gehasht bleibt ein Boss optisch derselbe und ist ab dem zweiten Öffnen
 *    garantiert im Raster-Cache.
 *
 * 2. **Decode vorziehen.** `prewarmBossSprite()` läuft beim Boss-Spawn, also
 *    lange bevor das Star-Fight-Modal geöffnet wird. `img.decode()` erledigt
 *    Laden und Dekodieren off-thread; wenn das Modal später aufgeht, ist nur
 *    noch der Raster-Upload fällig statt ~1 MB PNG-Decode im kritischen Frame.
 */

/** FNV-1a — kurz, stabil und ohne Kollisionsdrama für IDs wie `star-planet-42`. */
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Immer dasselbe Sprite für dieselbe planetId. */
export function bossSpriteFor(planetId: string): string {
  return BOSS_IMAGE_PATHS[hashString(planetId) % BOSS_IMAGE_PATHS.length]
}

// Bereits vorgewärmte Pfade — ein zweiter decode() desselben Bildes wäre
// zwar billig, aber die Image-Instanz und der Promise sind unnötiger Müll.
const prewarmed = new Set<string>()

/**
 * Lädt und dekodiert das Sprite eines Bosses im Hintergrund.
 * Fehler werden geschluckt: ein fehlendes Sprite darf den Spawn nicht stören,
 * das `<img>` im Modal zeigt dann eben den Browser-Fallback.
 */
export function prewarmBossSprite(planetId: string): void {
  if (typeof Image === 'undefined') return
  const src = bossSpriteFor(planetId)
  if (prewarmed.has(src)) return
  prewarmed.add(src)
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  void img.decode?.().catch(() => {})
}
