// Die vier Bard-Fähigkeiten und ihre Passive — was die Kachel zeigt.
//
// Jede Fähigkeit greift in ein System ein, das ohnehin schon läuft:
//   Q  Planeten-Bosse im Orbit      (Schaden + angehaltene Enrage-Uhr)
//   W  Spieler-HP und CPS-Strafe    (Heilung + Nachklang)
//   E  Expeditionen, Sonnenphase, Sternfristen (Zeit)
//   R  alles zugleich               (Stase, verdreifachter Schaden, Schlussschlag)
//
// Die Reihenfolge im Array ist die Reihenfolge in der Leiste.

import type { BardAbilityDef, BardAbilityId } from '@/types'
import {
  ABILITY_COOLDOWN_Q_SEC,
  ABILITY_COOLDOWN_W_SEC,
  ABILITY_COOLDOWN_E_SEC,
  ABILITY_COOLDOWN_R_SEC,
  ABILITY_UNLOCK_LEVEL_Q,
  ABILITY_UNLOCK_LEVEL_W,
  ABILITY_UNLOCK_LEVEL_E,
  ABILITY_UNLOCK_LEVEL_R,
  BINDING_TARGET_COUNT,
  BINDING_DAMAGE_MAX_HP_PCT,
  BINDING_STUN_MS,
  BINDING_EMPTY_CLICK_VALUES,
  SHRINE_HEAL_MAX_HP_PCT,
  SHRINE_BUFF_DURATION_MS,
  SHRINE_CPS_MULT,
  JOURNEY_EXPEDITION_SKIP_SEC,
  JOURNEY_DWELL_SKIP_SEC,
  JOURNEY_STAR_TIME_SEC,
  JOURNEY_BUFF_DURATION_MS,
  JOURNEY_CPC_MULT,
  FATE_STASIS_DURATION_MS,
  FATE_DAMAGE_MULT,
  FATE_FINALE_MAX_HP_PCT,
} from '@/config/constants'

/**
 * Ordner der Bilder — dieselben Motive, die schon der Chime-Burst benutzt.
 *
 * Angezeigt werden sie auf 84–128 px (siehe ABILITY_TILE_SIZE_PX und die
 * Auflösungsstufen der Leiste), also greift die 512er Variante: bei DPR 2
 * bleibt das echtes Downsampling, und die Quellen wären mit 1,5–2,3 MB je
 * Motiv sonst ein Vielfaches des gesamten übrigen Bildbestands.
 * `BardE.png` ist mit 500 px von Haus aus kleiner als die Stufe und behält
 * daher sein Original.
 */
const ART = '/img/BardAbilities'

export const BARD_ABILITIES: readonly BardAbilityDef[] = [
  {
    id: 'q',
    key: 'Q',
    name: 'Cosmic Binding',
    tagline: 'A bolt strung between two worlds.',
    image: `${ART}/BardQ-512.png`,
    color: '#7ec8ff',
    unlockLevel: ABILITY_UNLOCK_LEVEL_Q,
    baseCooldownSec: ABILITY_COOLDOWN_Q_SEC,
  },
  {
    id: 'w',
    key: 'W',
    name: "Caretaker's Shrine",
    tagline: 'A shrine set down where the light failed.',
    image: `${ART}/BardW-512.png`,
    color: '#6ee08a',
    unlockLevel: ABILITY_UNLOCK_LEVEL_W,
    baseCooldownSec: ABILITY_COOLDOWN_W_SEC,
  },
  {
    id: 'e',
    key: 'E',
    name: 'Magical Journey',
    tagline: 'A corridor opens; your errands take the short way.',
    image: `${ART}/BardE.png`,
    color: '#c89cff',
    unlockLevel: ABILITY_UNLOCK_LEVEL_E,
    baseCooldownSec: ABILITY_COOLDOWN_E_SEC,
  },
  {
    id: 'r',
    key: 'R',
    name: 'Tempered Fate',
    tagline: 'Everything holds still. Everything but you.',
    image: `${ART}/BardR-512.png`,
    color: '#e8c040',
    unlockLevel: ABILITY_UNLOCK_LEVEL_R,
    baseCooldownSec: ABILITY_COOLDOWN_R_SEC,
  },
] as const

/** Die Passive steht als eigene, kleinere Kachel links neben den vier Slots. */
export const BARD_PASSIVE = {
  name: "Traveler's Call",
  tagline: 'Every chime you strike stays with you.',
  image: `${ART}/Bard-256.png`,
  color: '#f0d890',
} as const

export function getBardAbility(id: string): BardAbilityDef | undefined {
  return BARD_ABILITIES.find((a) => a.id === id)
}

/**
 * Die Wirkungszeilen einer Fähigkeit, mit den Zahlen, die JETZT gelten.
 *
 * Sie stehen hier und nicht in der Komponente, weil sie zur Fähigkeit gehören
 * und nicht zur Kachel: der Tooltip bleibt dadurch rein darstellend und muss
 * die Formeln des Stores nicht ein zweites Mal kennen.
 *
 * DIE ERSTE ZEILE IST DIE HAUPTWIRKUNG. Der Tooltip hebt sie heraus und zeigt
 * den Rest darunter — deshalb steht vorn, was der Spieler beim Drücken der
 * Taste bekommt, und nicht, unter welchen Umständen.
 *
 * @param power Wirkungsfaktor aus Rang und Resonance (`powerMultOf`).
 */
export function bardAbilityEffectLines(
  id: BardAbilityId,
  power: number,
): { label: string; value: string }[] {
  const pct = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, '')}%`
  const sec = (ms: number) => `${Math.round(ms / 1000)}s`

  switch (id) {
    case 'q':
      return [
        { label: 'Damage each', value: `${pct(BINDING_DAMAGE_MAX_HP_PCT * power)} max HP` },
        { label: 'Targets', value: `${BINDING_TARGET_COUNT} bosses` },
        { label: 'Enrage held', value: sec(BINDING_STUN_MS) },
        {
          label: 'No target',
          value: `${Math.round(BINDING_EMPTY_CLICK_VALUES * power)}× click value`,
        },
      ]
    case 'w':
      return [
        { label: 'Heal', value: `${pct(SHRINE_HEAL_MAX_HP_PCT * power)} max HP` },
        {
          label: 'Afterglow',
          value: `${SHRINE_CPS_MULT}× chimes for ${sec(SHRINE_BUFF_DURATION_MS)}`,
        },
        { label: 'Also', value: 'lifts the boss chime penalty' },
      ]
    case 'e':
      return [
        {
          label: 'Expeditions',
          value: `−${Math.round(JOURNEY_EXPEDITION_SKIP_SEC * power)}s each`,
        },
        { label: 'Sun phase', value: `+${Math.round(JOURNEY_DWELL_SKIP_SEC * power)}s` },
        { label: 'Star timers', value: `+${Math.round(JOURNEY_STAR_TIME_SEC * power)}s` },
        {
          label: 'Travel window',
          value: `${JOURNEY_CPC_MULT}× clicks for ${sec(JOURNEY_BUFF_DURATION_MS)}`,
        },
      ]
    case 'r':
      return [
        { label: 'Stasis', value: sec(FATE_STASIS_DURATION_MS) },
        { label: 'Your damage', value: `${FATE_DAMAGE_MULT}×` },
        { label: 'Parting blow', value: `${pct(FATE_FINALE_MAX_HP_PCT * power)} max HP each` },
        { label: 'Held', value: 'enrage clocks and star timers' },
      ]
  }
}
