import type { IconPoolKey } from '@/types'

/**
 * MOTIV-POOLS — für alles, was der Spieler AUSGEWÜRFELT bekommt.
 *
 * Ein Augment, ein Vorzeichen, eine Expedition soll bei jedem Roll anders
 * aussehen. Ein fest verdrahtetes Icon je Definition kann das nicht: „Chime
 * Surge" trüge beim zwanzigsten Mal dasselbe Glyph wie beim ersten.
 *
 * Warum Pools und nicht wirklich frei aus ganz Iconify gezogen wird: dort
 * liegen neben Fantasy-Motiven auch Firmenlogos, Kaffeetassen und UI-Pfeile —
 * ein echter Zufallsgriff landet regelmäßig beim Windows-Logo auf einem
 * legendären Augment. Und ein Name, den niemand geprüft hat, rendert als leere
 * Fläche (die Existenzprüfung läuft im Browser, siehe „Icons" in CLAUDE.md).
 * Jeder Pool ist deshalb eine kuratierte Motivfamilie: gezogen wird zufällig,
 * aber jeder mögliche Treffer trägt die richtige Bedeutung.
 *
 * Die Pools mischen bewusst Bibliotheken — `game-icons` bringt die
 * Fantasy-Breite (kein anderes Set hat 4000 solcher Motive), die modernen Sets
 * bringen klare Silhouetten dazwischen. Alle Ziehungen landen auf Karten ab
 * 26 px, dort trägt beides.
 *
 * Gezogen wird DETERMINISTISCH aus einem Seed, nie aus `Math.random()`: dasselbe
 * Augment auf derselben Karte muss über Re-Renders, Reloads und Spielstände
 * hinweg dasselbe Glyph zeigen. Variiert wird über den Seed (Roll-Nummer,
 * Spawn-Zeit) — nicht über den Zufall im Moment des Zeichnens.
 */
export const ICON_POOLS: Record<IconPoolKey, readonly string[]> = {
  /** Angriff, Schaden, rohe Wucht */
  might: [
    'game-icons:crossed-swords',
    'game-icons:energy-sword',
    'game-icons:piercing-sword',
    'game-icons:axe-sword',
    'game-icons:dervish-swords',
    'game-icons:mighty-force',
    'game-icons:fire-punch',
    'game-icons:overdrive',
    'game-icons:blast',
    'game-icons:energy-arrow',
    'ph:sword-fill',
    'ri:sword-fill',
    'ph:hand-fist-fill',
    'mdi:axe',
  ],

  /** Schild, Zähigkeit, Schutz */
  ward: [
    'game-icons:energy-shield',
    'game-icons:bordered-shield',
    'game-icons:crenulated-shield',
    'game-icons:ice-shield',
    'game-icons:fire-shield',
    'game-icons:lightning-shield',
    'game-icons:barrier',
    'game-icons:bubble-field',
    'game-icons:checked-shield',
    'game-icons:edged-shield',
    'ph:shield-fill',
    'ph:shield-star-fill',
    'ri:shield-flash-fill',
    'material-symbols:shield',
  ],

  /** Tempo, Abklingzeit, alles Zeitliche */
  haste: [
    'game-icons:backward-time',
    'game-icons:hourglass',
    'game-icons:clockwork',
    'game-icons:arrow-wings',
    'game-icons:boots',
    'game-icons:jet-pack',
    'game-icons:quick-man',
    'game-icons:angel-wings',
    'game-icons:feathered-wing',
    'game-icons:sands-of-time',
    'ph:lightning-fill',
    'ph:rocket-launch-fill',
    'material-symbols:speed',
    'mdi:run-fast',
  ],

  /** Chimes, Beute, Glück */
  fortune: [
    'game-icons:coins-pile',
    'game-icons:two-coins',
    'game-icons:crown-coin',
    'game-icons:gems',
    'game-icons:crystal-shine',
    'game-icons:jeweled-chalice',
    'game-icons:open-treasure-chest',
    'game-icons:coinflip',
    'game-icons:gem-pendant',
    'game-icons:swap-bag',
    'ph:coins-fill',
    'ph:diamonds-four-fill',
    'ri:copper-coin-fill',
    'mdi:clover',
  ],

  /** Magie, Buffs, alles Gewirkte */
  arcane: [
    'game-icons:magic-swirl',
    'game-icons:magic-portal',
    'game-icons:rune-stone',
    'game-icons:magic-potion',
    'game-icons:orb-wand',
    'game-icons:glowing-artifact',
    'game-icons:fairy-wand',
    'game-icons:crystal-ball',
    'game-icons:beams-aura',
    'game-icons:aura',
    'ph:sparkle-fill',
    'ph:magic-wand-fill',
    'ri:magic-fill',
    'material-symbols:wand-stars',
  ],

  /** Aufstieg, Rang, Erfahrung */
  ascend: [
    'game-icons:upgrade',
    'game-icons:laurels',
    'game-icons:laurel-crown',
    'game-icons:ascending-block',
    'game-icons:stairs-goal',
    'game-icons:podium-winner',
    'game-icons:star-medal',
    'game-icons:crown',
    'game-icons:progression',
    'ph:arrow-fat-up-fill',
    'ph:trophy-fill',
    'ri:vip-crown-fill',
    'material-symbols:trending-up',
    'mdi:medal',
  ],

  /** Sterne, Planeten, Galaxien — der Kosmos selbst */
  cosmos: [
    'game-icons:galaxy',
    'game-icons:ringed-planet',
    'game-icons:star-formation',
    'game-icons:star-gate',
    'game-icons:comet-spark',
    'game-icons:orbital',
    'game-icons:black-hole-bolas',
    'game-icons:solar-system',
    'game-icons:star-satellites',
    'game-icons:falling-star',
    'ph:planet-fill',
    'ph:star-four-fill',
    'material-symbols:mode-night',
    'mdi:telescope',
  ],

  /** Reisen, Ziele, fremde Orte — die Expeditionen */
  journey: [
    'game-icons:journey',
    'game-icons:interstellar-path',
    'game-icons:caravan',
    'game-icons:dungeon-gate',
    'game-icons:castle-ruins',
    'game-icons:cave-entrance',
    'game-icons:mountain-road',
    'game-icons:elven-castle',
    'game-icons:forest',
    'game-icons:lantern-flame',
    'game-icons:treasure-map',
    'game-icons:compass',
    'ph:path-fill',
    'ph:compass-rose-fill',
    'mdi:map-marker-path',
    'tabler:route',
  ],

  /** Schicksal, Vorsehung, Vorzeichen */
  fate: [
    'game-icons:all-seeing-eye',
    'game-icons:crystal-ball',
    'game-icons:star-altar',
    'game-icons:moon',
    'game-icons:eclipse',
    'game-icons:sundial',
    'game-icons:tied-scroll',
    'game-icons:cracked-glass',
    'game-icons:spiral-shell',
    'ph:eye-fill',
    'ph:moon-stars-fill',
    'material-symbols:visibility',
    'mdi:crystal-ball',
    'tabler:cards',
  ],

  /** Schmiede, Material, Handwerk */
  forge: [
    'game-icons:anvil',
    'game-icons:anvil-impact',
    'game-icons:crystal-cluster',
    'game-icons:crystal-growth',
    'game-icons:ore',
    'game-icons:stone-pile',
    'game-icons:gears',
    'game-icons:sharp-crown',
    'game-icons:mineral-pearls',
    'ph:hammer-fill',
    'ph:diamond-fill',
    'material-symbols:construction',
    'mdi:anvil',
    'tabler:pick',
  ],

  /** Gefolge — Meeps, Champions, alles mit Köpfen */
  roster: [
    'game-icons:meeple',
    'game-icons:meeple-group',
    'game-icons:meeple-circle',
    'game-icons:three-friends',
    'game-icons:rally-the-troops',
    'game-icons:crested-helmet',
    'game-icons:swordman',
    'game-icons:dark-squad',
    'game-icons:hooded-figure',
    'ph:users-three-fill',
    'ph:user-circle-fill',
    'ri:team-fill',
    'material-symbols:groups',
    'mdi:account-group',
  ],
}

/**
 * FNV-1a, 32 Bit. Klein, stabil und ohne Abhängigkeit — gebraucht wird nur eine
 * gleichmäßige Streuung über die Pool-Länge, keine Kryptografie.
 */
function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Das Icon zu einem Seed. Gleicher Seed → gleiches Glyph, für immer; ein anderer
 * Seed → mit hoher Wahrscheinlichkeit ein anderes.
 *
 * `offset` schiebt innerhalb desselben Seeds weiter — damit lassen sich Dubletten
 * auflösen, wenn mehrere Karten nebeneinander liegen (siehe `pickDistinctIcons`).
 */
export function pickPooledIcon(pool: IconPoolKey, seed: string, offset = 0): string {
  const list = ICON_POOLS[pool]
  return list[(hash(seed) + offset) % list.length]
}

/**
 * Ein ganzes Angebot auf einmal — mit der Garantie, dass keine zwei Karten
 * dasselbe Glyph tragen. Nebeneinander sichtbare Einträge müssen unterscheidbar
 * bleiben (Regel 3 in „Icons"), und bei 14 Motiven je Pool kollidieren drei
 * Ziehungen sonst in rund einem von fünf Angeboten.
 */
export function pickDistinctIcons(
  entries: ReadonlyArray<{ pool: IconPoolKey; seed: string }>,
): string[] {
  const used = new Set<string>()
  return entries.map(({ pool, seed }) => {
    for (let offset = 0; offset < ICON_POOLS[pool].length; offset++) {
      const icon = pickPooledIcon(pool, seed, offset)
      if (!used.has(icon)) {
        used.add(icon)
        return icon
      }
    }
    return pickPooledIcon(pool, seed)
  })
}
