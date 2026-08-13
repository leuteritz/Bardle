// Die vier Bard-Fähigkeiten und ihre Passive — was die Kachel zeigt.
//
// Jede Fähigkeit greift in ein System ein, das ohnehin schon läuft:
//   Q  Planeten-Bosse im Orbit      (Schaden + angehaltene Enrage-Uhr)
//   W  Spieler-HP und CPS-Strafe    (Heilung + Nachklang)
//   E  Expeditionen, Sonnenphase, Sternfristen (Zeit)
//   R  alles zugleich               (Stase, verdreifachter Schaden, Schlussschlag)
//
// Die Reihenfolge im Array ist die Reihenfolge in der Leiste.

import type { BardAbilityDef, BardAbilityId, BardEffectLine } from '@/types'
import {
  ABILITY_COOLDOWN_Q_SEC,
  ABILITY_COOLDOWN_W_SEC,
  ABILITY_COOLDOWN_E_SEC,
  ABILITY_COOLDOWN_R_SEC,
  ABILITY_MAX_RANK,
  ABILITY_RANK_POWER_STEP,
  ABILITY_UNLOCK_LEVEL_Q,
  ABILITY_UNLOCK_LEVEL_W,
  ABILITY_UNLOCK_LEVEL_E,
  ABILITY_UNLOCK_LEVEL_R,
  BINDING_TARGET_COUNT,
  BINDING_TARGET_PER_RANK,
  BINDING_DAMAGE_MAX_HP_PCT,
  BINDING_STUN_MS,
  SHRINE_HEAL_MAX_HP_PCT,
  SHRINE_BUFF_DURATION_MS,
  SHRINE_BUFF_PER_RANK_MS,
  SHRINE_CPS_MULT,
  JOURNEY_EXPEDITION_SKIP_SEC,
  JOURNEY_STAR_TIME_SEC,
  JOURNEY_TRAVEL_SKIP_SEC,
  JOURNEY_BUFF_DURATION_MS,
  JOURNEY_BUFF_PER_RANK_MS,
  JOURNEY_CPC_MULT,
  FATE_STASIS_DURATION_MS,
  FATE_STASIS_PER_RANK_MS,
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
    image: `${ART}/BardQ-512.png`,
    color: '#7ec8ff',
    unlockLevel: ABILITY_UNLOCK_LEVEL_Q,
    baseCooldownSec: ABILITY_COOLDOWN_Q_SEC,
  },
  {
    id: 'w',
    key: 'W',
    name: "Caretaker's Shrine",
    image: `${ART}/BardW-512.png`,
    color: '#6ee08a',
    unlockLevel: ABILITY_UNLOCK_LEVEL_W,
    baseCooldownSec: ABILITY_COOLDOWN_W_SEC,
  },
  {
    id: 'e',
    key: 'E',
    name: 'Magical Journey',
    image: `${ART}/BardE.png`,
    color: '#c89cff',
    unlockLevel: ABILITY_UNLOCK_LEVEL_E,
    baseCooldownSec: ABILITY_COOLDOWN_E_SEC,
  },
  {
    id: 'r',
    key: 'R',
    name: 'Tempered Fate',
    image: `${ART}/BardR-512.png`,
    color: '#e8c040',
    unlockLevel: ABILITY_UNLOCK_LEVEL_R,
    baseCooldownSec: ABILITY_COOLDOWN_R_SEC,
  },
] as const

/** Die Passive steht als eigene, kleinere Kachel links neben den vier Slots. */
export const BARD_PASSIVE = {
  name: "Traveler's Call",
  image: `${ART}/Bard-256.png`,
  color: '#f0d890',
} as const

export function getBardAbility(id: string): BardAbilityDef | undefined {
  return BARD_ABILITIES.find((a) => a.id === id)
}

// ── Der zweite Skalierungsweg: was allein am RANG hängt ─────────────────────
//
// `powerMultOf` ist der eine Weg — Rang UND Resonance heben ihn, und er
// multipliziert Schaden, Heilung und Zeitsprünge. Der zweite steht hier:
// Zielzahl, Stasedauer und die beiden Fensterlängen wachsen ALLEIN mit dem
// Rang. Sie an die Resonance zu hängen wäre kein Feinschliff, sondern eine
// geschlossene Rückkopplung — Klicken verlängerte das Fenster, in dem Klicken
// dreifach zählt.
//
// Basis und Schritt stehen als PAAR in einer Tabelle, die Formel einmal
// daneben. Vier Funktionen mit je eigener Rechnung wären dieselbe Zeile
// fünfmal: der Tooltip braucht jeden dieser Werte auch für Rang + 1.

const BARD_RANK_SCALED = {
  /** Q — wie viele Bosse der Blitz durchschlägt. */
  bindingTargets: [BINDING_TARGET_COUNT, BINDING_TARGET_PER_RANK],
  /** W — Länge des Nachklangs. */
  shrineBuffMs: [SHRINE_BUFF_DURATION_MS, SHRINE_BUFF_PER_RANK_MS],
  /** E — Länge des Reisefensters. */
  journeyBuffMs: [JOURNEY_BUFF_DURATION_MS, JOURNEY_BUFF_PER_RANK_MS],
  /** R — Standzeit der Stase. */
  stasisMs: [FATE_STASIS_DURATION_MS, FATE_STASIS_PER_RANK_MS],
} as const

export type BardRankScaledField = keyof typeof BARD_RANK_SCALED

/**
 * Rang 0 heißt „gesperrt". Für jede RECHNUNG liest er wie Rang 1 — der Tooltip
 * einer gesperrten Fähigkeit zeigt eine Vorschau, keine Nullwerte.
 */
function clampRank(rank: number): number {
  return Math.min(ABILITY_MAX_RANK, Math.max(1, rank))
}

/** Der Wert eines rang-skalierten Feldes. Die Resonance geht hier NICHT ein. */
export function bardRankValue(field: BardRankScaledField, rank: number): number {
  const [base, perRank] = BARD_RANK_SCALED[field]
  return base + (clampRank(rank) - 1) * perRank
}

/**
 * Wirkungsfaktor aus dem RANG allein — die Resonance kommt im Store dazu
 * (`powerMultOf` = `bardRankPowerMult(rank) × resonancePowerMult`).
 *
 * Steht hier und nicht nur im Store, weil der Tooltip denselben Faktor für Rang
 * + 1 braucht: ein parameterloser Store-Getter kann ihn nicht liefern, und die
 * Formel ein zweites Mal auszuschreiben wäre die Dopplung, die dieses Modul
 * gerade vermeidet.
 */
export function bardRankPowerMult(rank: number): number {
  return 1 + (clampRank(rank) - 1) * ABILITY_RANK_POWER_STEP
}

// ── Wirkungszeilen ──────────────────────────────────────────────────────────

const pct = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, '')}%`
const sec = (ms: number) => `${Math.round(ms / 1000)}s`

/**
 * Die Zeilen für GENAU einen Rang. Die Formeln stehen nur hier — einmal, für
 * den laufenden Rang und den nächsten gleichermaßen.
 *
 * DIE ERSTE ZEILE IST DIE HAUPTWIRKUNG. Der Tooltip hebt sie heraus und zeigt
 * den Rest darunter — deshalb steht vorn, was der Spieler beim Drücken der
 * Taste bekommt, und nicht, unter welchen Umständen.
 *
 * Höchstens vier Zeilen je Fähigkeit, und statische Multiplikatoren stehen im
 * LABEL statt im Wert („Afterglow 1.6×" · „25s"). Der Kasten öffnet sich mitten
 * im Spiel über dem Orbit: alles, was der Spieler beim Überfliegen nicht in
 * eine Entscheidung übersetzen kann, kostet ihn nur die Zeile, in der es steht.
 */
function linesAtRank(
  id: BardAbilityId,
  rank: number,
  resonanceMult: number,
): { label: string; value: string }[] {
  const power = bardRankPowerMult(rank) * resonanceMult

  switch (id) {
    case 'q':
      return [
        { label: 'Damage each', value: `${pct(BINDING_DAMAGE_MAX_HP_PCT * power)} max HP` },
        { label: 'Targets', value: `${bardRankValue('bindingTargets', rank)} bosses` },
        { label: 'Enrage held', value: sec(BINDING_STUN_MS) },
      ]
    case 'w':
      return [
        { label: 'Heal', value: `${pct(SHRINE_HEAL_MAX_HP_PCT * power)} max HP` },
        { label: `Afterglow ${SHRINE_CPS_MULT}×`, value: sec(bardRankValue('shrineBuffMs', rank)) },
        // „Also" war ein Füllwort — links steht, WOFÜR die Zahl gilt.
        { label: 'Boss penalty', value: 'cleared' },
      ]
    case 'e':
      // Die Sonnenphase steht bewusst NICHT hier: `DWELL_SKIP_PHASE_FRACTION`
      // deckelt alle Abkürzungen gemeinsam auf 15 % der laufenden Phase, der
      // ungedeckelte Wert kommt in der Praxis selten an. Eine Zahl, die
      // meistens nicht stimmt, ist schlechter als keine.
      return [
        {
          label: 'Expeditions',
          value: `−${Math.round(JOURNEY_EXPEDITION_SKIP_SEC * power)}s each`,
        },
        { label: 'Champion travel', value: `−${Math.round(JOURNEY_TRAVEL_SKIP_SEC * power)}s` },
        { label: 'Star timers', value: `+${Math.round(JOURNEY_STAR_TIME_SEC * power)}s` },
        {
          label: `Travel window ${JOURNEY_CPC_MULT}×`,
          value: sec(bardRankValue('journeyBuffMs', rank)),
        },
      ]
    case 'r':
      return [
        { label: 'Stasis', value: sec(bardRankValue('stasisMs', rank)) },
        { label: 'Your damage', value: `${FATE_DAMAGE_MULT}×` },
        { label: 'Parting blow', value: `${pct(FATE_FINALE_MAX_HP_PCT * power)} max HP each` },
      ]
  }
}

/**
 * Die Wirkungszeilen einer Fähigkeit — mit den Zahlen, die JETZT gelten, und
 * derselben Zahl eine Rangstufe weiter, wo sie sich bewegt.
 *
 * Sie stehen hier und nicht in der Komponente, weil sie zur Fähigkeit gehören
 * und nicht zur Kachel: der Tooltip bleibt dadurch rein darstellend und muss
 * die Formeln des Stores nicht ein zweites Mal kennen.
 *
 * Der Ausblick entsteht, indem derselbe Erzeuger ein zweites Mal läuft und die
 * ANGEZEIGTEN Zeichenketten verglichen werden. Damit trägt eine Zeile genau
 * dann einen Pfeil, wenn der Spieler den Zuwachs auch ablesen kann — ein
 * 6 % → 7,5 %, das auf denselben Text rundete, verspräche sonst etwas, das
 * nirgends erscheint.
 *
 * @param rank          aus `bardAbilityStore.rankOf` — 0 heißt gesperrt.
 * @param resonanceMult `bardAbilityStore.resonancePowerMult`. Bewusst getrennt
 *   vom Rang übergeben: die Passive hebt beide Spalten gleich, der Ausblick
 *   soll den RANGSPRUNG zeigen und nicht den Resonance-Stand.
 */
export function bardAbilityEffectLines(
  id: BardAbilityId,
  rank: number,
  resonanceMult: number,
): BardEffectLine[] {
  const shown = Math.max(1, rank)
  const here = linesAtRank(id, shown, resonanceMult)
  // Gesperrt ist die nächste Frage die Freischaltung, nicht der Rang danach;
  // am Höchstrang gibt es keinen.
  if (rank === 0 || shown >= ABILITY_MAX_RANK) return here

  const ahead = linesAtRank(id, shown + 1, resonanceMult)
  return here.map((line, i) =>
    ahead[i].value === line.value ? line : { ...line, next: ahead[i].value },
  )
}
