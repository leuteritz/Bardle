import type { ChronicleTrackDef } from '@/types'

// ═════════════════════════════════════════════════════════════════════════════
// THE BARD'S CHRONICLE — statischer Katalog der Meilenstein-Bahnen
//
// Eine Bahn = ein Spielsystem. Sie misst EINE Zahl dieses Systems und ihr Bonus
// fällt in dasselbe System zurück: wer Drifter sammelt, hält seine Buffs länger;
// wer die Sonne ausbaut, zahlt dort weniger Material. Das ist der Grund, warum
// die Belohnungen nicht ein weiterer globaler Multiplikator neben Forge, Meep
// und Solar sind — sie belohnen die Vertiefung selbst.
//
// Deshalb steht in jeder Bahn genau ein `bonus` und in `ChronicleBonusKey`
// genau eine Einbaustelle dazu. Eine neue Bahn heißt: ein Eintrag hier, ein
// Schlüssel im Typ, ein Getter im Store, eine Multiplikation an der Zielstelle.
//
// Die `value`-Zahlen sind Prozentpunkte und ABSOLUT je Stufe, keine Summanden —
// Stufe III von Sunsmith heißt 12 % Rabatt, nicht 4 + 8 + 12.
// ═════════════════════════════════════════════════════════════════════════════

export const CHRONICLE_TRACKS: ChronicleTrackDef[] = [
  {
    id: 'chimes',
    name: 'Chime Keeper',
    blurb: 'Every chime the journey has ever earned',
    icon: 'game-icons:ringing-bell',
    color: '#e8c040',
    metric: 'lifetimeChimes',
    bonus: 'cpsMult',
    unit: 'chimes',
    effect: 'Chimes per second +{v}%',
    stages: [
      { threshold: 100_000, value: 3 },
      { threshold: 10_000_000, value: 6 },
      { threshold: 1_000_000_000, value: 10 },
      { threshold: 100_000_000_000, value: 15 },
      { threshold: 10_000_000_000_000, value: 22 },
    ],
  },
  {
    id: 'roster',
    name: 'Kindred Host',
    blurb: 'Champions who answered the call',
    icon: 'game-icons:three-friends',
    color: '#9a6fd0',
    metric: 'championsRecruited',
    bonus: 'xpMult',
    unit: 'champions',
    effect: 'Champion XP gains +{v}%',
    stages: [
      { threshold: 5, value: 5 },
      { threshold: 15, value: 10 },
      { threshold: 30, value: 16 },
      { threshold: 60, value: 24 },
      { threshold: 100, value: 35 },
    ],
  },
  {
    id: 'ladder',
    name: 'Rift Regular',
    blurb: 'Victories on the ranked ladder',
    icon: 'game-icons:podium-winner',
    color: '#7ab8f0',
    metric: 'battleWins',
    bonus: 'lpGainMult',
    unit: 'wins',
    effect: 'LP gained on a win +{v}%',
    stages: [
      { threshold: 5, value: 4 },
      { threshold: 25, value: 8 },
      { threshold: 75, value: 12 },
      { threshold: 200, value: 18 },
      { threshold: 500, value: 25 },
    ],
  },
  {
    id: 'drifters',
    name: "Wanderer's Ear",
    blurb: 'Drifters caught crossing the orbit',
    icon: 'game-icons:comet-spark',
    color: '#68c0a8',
    metric: 'driftersCollected',
    bonus: 'drifterBuffDurationMult',
    unit: 'drifters',
    effect: 'Drifter buffs last +{v}% longer',
    stages: [
      { threshold: 10, value: 5 },
      { threshold: 50, value: 10 },
      { threshold: 150, value: 15 },
      { threshold: 400, value: 22 },
      { threshold: 1_000, value: 30 },
    ],
  },
  {
    id: 'forge',
    name: 'Sunsmith',
    blurb: 'Levels raised across the Star Forge',
    icon: 'game-icons:anvil-impact',
    // Orange, nicht Gold: Chime Keeper steht mit #e8c040 im gleichen Raster,
    // und zwei Goldtöne untereinander lesen sich als dieselbe Bahn.
    color: '#f08030',
    metric: 'forgeLevels',
    bonus: 'forgeMaterialDiscount',
    unit: 'forge levels',
    // Nodes und Relikte, nicht Constellations/Bargains: die zwei sind
    // Einmalkäufe mit fester Kostenliste, die skalierenden Dauerkosten sind
    // diese beiden. Der Text sagt es, damit die Karte nicht mehr verspricht,
    // als der Rabatt einlöst.
    effect: 'Forge node & relic material costs −{v}%',
    stages: [
      { threshold: 5, value: 4 },
      { threshold: 20, value: 8 },
      { threshold: 50, value: 12 },
      { threshold: 100, value: 16 },
      { threshold: 200, value: 20 },
    ],
  },
  {
    id: 'planets',
    name: 'Warden of Worlds',
    blurb: 'Levels raised across your orbit slots',
    icon: 'game-icons:planet-conquest',
    // Silber statt Hellblau: Rift Regular trägt #7ab8f0 und landet im Raster
    // direkt darüber — gemessen waren die beiden Karten nicht zu trennen.
    color: '#b8c4cc',
    metric: 'planetLevels',
    bonus: 'turretDpsMult',
    unit: 'planet levels',
    effect: 'Turret auto-attack damage +{v}%',
    stages: [
      { threshold: 10, value: 6 },
      { threshold: 40, value: 12 },
      { threshold: 100, value: 20 },
      { threshold: 250, value: 30 },
      { threshold: 600, value: 45 },
    ],
  },
  {
    id: 'starfights',
    name: 'Bossbreaker',
    blurb: 'Planet bosses put down for good',
    icon: 'game-icons:sonic-boom',
    color: '#e07868',
    metric: 'bossesDefeated',
    bonus: 'bossDamageMult',
    unit: 'bosses',
    effect: 'Damage dealt to bosses +{v}%',
    stages: [
      { threshold: 3, value: 5 },
      { threshold: 15, value: 10 },
      { threshold: 50, value: 16 },
      { threshold: 150, value: 24 },
      { threshold: 400, value: 35 },
    ],
  },
  {
    id: 'cosmos',
    name: 'Starwright',
    blurb: 'Stars pulled back out of the dark',
    icon: 'game-icons:star-formation',
    color: '#d0a8f0',
    metric: 'starsRescued',
    bonus: 'materialDropMult',
    unit: 'stars',
    effect: 'Material drop chance +{v}%',
    stages: [
      { threshold: 5, value: 5 },
      { threshold: 25, value: 10 },
      { threshold: 75, value: 15 },
      { threshold: 200, value: 22 },
      { threshold: 500, value: 30 },
    ],
  },
]

/** Alle Stufen aller Bahnen — der Nenner in der Kopfzeile des Tabs. */
export const CHRONICLE_TOTAL_STAGES = CHRONICLE_TRACKS.reduce((sum, t) => sum + t.stages.length, 0)

/**
 * Titel nach Zahl der geschriebenen Stufen. Absteigend gelesen, `min`
 * aufsteigend sortiert — derselbe Aufbau wie die Ascension-Ränge der
 * Champions, damit beide Leitern gleich gelesen werden.
 */
export const CHRONICLE_RANKS: { min: number; title: string }[] = [
  { min: 0, title: 'Unwritten' },
  { min: 1, title: 'Page Keeper' },
  { min: 8, title: 'Storywright' },
  { min: 16, title: 'Codexbound' },
  { min: 24, title: 'Loremaster' },
  { min: 32, title: 'Stargazer' },
  { min: CHRONICLE_TOTAL_STAGES, title: 'Unending Tale' },
]

/** Der Titel, der zu so vielen freigeschalteten Stufen gehört. */
export function chronicleRank(unlockedStages: number): string {
  let title = CHRONICLE_RANKS[0].title
  for (const rank of CHRONICLE_RANKS) {
    if (unlockedStages >= rank.min) title = rank.title
  }
  return title
}
