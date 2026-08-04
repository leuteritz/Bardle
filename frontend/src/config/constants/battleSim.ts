// Die simulierte Partie: Ereignis-Timeline (Kills, Drakes, Baron, Türme, Nexus),
// die Waypoint-Choreografie der zehn Champions und die Karten-Koordinaten, auf
// denen beides stattfindet. Alle Zeiten in Spielsekunden — 60 davon vergehen je
// Sekunde Echtzeit.

export const BLUE_NEXUS = { x: 12, y: 88 }
export const RED_NEXUS = { x: 88, y: 12 }
export const BLUE_FOUNTAIN = { x: 8, y: 92 }
export const RED_FOUNTAIN = { x: 92, y: 8 }

// Objective positions (river pit bulges on minimap.png, point-symmetric across center)
export const DRAKE_POS = { x: 66, y: 70 }
export const BARON_POS = { x: 35, y: 32 }
export const MID_CENTER = { x: 50, y: 50 }
/** Spawn countdowns display in whole game-minutes — pulse during the last displayed minute */
export const OBJECTIVE_SPAWN_SOON_T = 60

// Typical skirmish locations per lane (map-units on the 100x100 minimap)
export const LANE_FIGHT_POSITIONS: Record<'top' | 'mid' | 'bot', { x: number; y: number }> = {
  top: { x: 24, y: 22 },
  mid: { x: 50, y: 50 },
  bot: { x: 78, y: 80 },
}

// ── Objective Modal ────────────────────────────────────────────────────────
export const OBJECTIVE_DRAKE_SPAWN = 300 // game-seconds when drake appears on minimap
export const OBJECTIVE_BARON_SPAWN = 2200 // game-seconds when baron appears on minimap — late enough that a 4-drake chain doesn't feel back-to-back, early enough for a full lane push afterwards
export const DRAKE_OBJECTIVE_HP = 3200

/** Objective DPS contributed by every living champion present at the pit (per team) */
export const OBJECTIVE_BASE_DPS_PER_CHAMP = 45
export const OBJECTIVE_CLICK_DAMAGE = 15
export const OBJECTIVE_BARON_WIN_BONUS = 0.12

// ── Drake Types (see src/config/drakes.ts for the full definitions) ────────
/** Win-chance swing for Infernal — the biggest basic swing, plus its burn */
export const DRAKE_WIN_BONUS_MAJOR = 0.1
/** Win-chance swing for basic drakes that carry a secondary battle effect */
export const DRAKE_WIN_BONUS_MINOR = 0.06
export const DRAKE_WIN_BONUS_ELDER = 0.12
/** Mountain: own team DPS multiplier in later objective fights */
export const DRAKE_MOUNTAIN_DPS_MULT = 1.2
/** Chemtech: enemy team DPS multiplier in later objective fights */
export const DRAKE_CHEMTECH_ENEMY_DPS_MULT = 0.85
/** Hextech: player click damage multiplier in later objective fights */
export const DRAKE_HEXTECH_CLICK_MULT = 2
/** Cloud: ally respawn time multiplier for the rest of the battle */
export const DRAKE_CLOUD_RESPAWN_MULT = 0.7
/** Ocean: losing a later objective fight only costs this fraction of win chance */
export const DRAKE_OCEAN_LOSS_PENALTY_MULT = 0.5
/** Elder: flat bonus LP when the battle is won */
export const DRAKE_ELDER_LP_BONUS = 15
/** Infernal: flat burn DPS the pit itself takes for the holder's team in later objective fights */
export const DRAKE_INFERNAL_BURN_DPS = 25

// ── Baron Nashor (battle-scoped buff for the team that slays the baron) ───
/** Baron's Aegis: a lost battle only costs this fraction of the usual LP */
export const BARON_LP_LOSS_SHIELD_MULT = 0.5
/** Baron's Bounty: chimes worth this many seconds of production, paid at battle end */
export const BARON_BOUNTY_PRODUCTION_SECONDS = 120
/** Baron's Bounty floor: never less than this many base clicks worth of chimes */
export const BARON_BOUNTY_MIN_CLICKS = 25
export const OBJECTIVE_DPS_TICK_MS = 200
/** Per-tick DPS wobble (±fraction) so the damage race stays dramatic */
export const OBJECTIVE_DPS_VARIANCE = 0.15
/** Per-fighter DPS weight spread (normalized per side, avg = 1 — team DPS unchanged) */
export const OBJECTIVE_FIGHTER_WEIGHT_MIN = 0.75
export const OBJECTIVE_FIGHTER_WEIGHT_MAX = 1.25
/** Lunge attack cycle of pit fighters in the objective modal — 1s so "X/s" is literal (drives CSS + float scheduler) */
export const OBJECTIVE_LUNGE_CYCLE_S = 1
/** Per-fighter stagger of the lunge animation (5 fighters spread across the 1s cycle) */
export const OBJECTIVE_LUNGE_STAGGER_S = 0.19
/** Extra lunge offset for the enemy column so both sides never strike in unison */
export const OBJECTIVE_LUNGE_ENEMY_OFFSET_S = 0.1
/** Point within the lunge cycle where the strike lands (matches the 70% keyframe) */
export const OBJECTIVE_LUNGE_STRIKE_FRACTION = 0.7
export const OBJECTIVE_FIGHTER_FLOAT_LIFETIME_MS = 900
/** Scheduler resolution for spawning fighter strike floats */
export const OBJECTIVE_FIGHTER_FLOAT_TICK_MS = 100
/** Lifetime of a click-damage float over the objective. */
export const OBJECTIVE_CLICK_FLOAT_LIFETIME_MS = 750
/**
 * Fan-out of successive click floats so a fast clicker sees a spray instead of
 * one stack. The float id is taken modulo the count, then scaled by the step.
 */
export const OBJECTIVE_CLICK_FLOAT_ROT_BASE_DEG = -14
export const OBJECTIVE_CLICK_FLOAT_ROT_STEP_DEG = 7
export const OBJECTIVE_CLICK_FLOAT_ROT_VARIANTS = 5
export const OBJECTIVE_CLICK_FLOAT_LEFT_BASE_PCT = 34
export const OBJECTIVE_CLICK_FLOAT_LEFT_STEP_PCT = 11
export const OBJECTIVE_CLICK_FLOAT_LEFT_VARIANTS = 4
/** Hit feedback on the objective's HP bar. */
export const OBJECTIVE_HIT_FLASH_MS = 160
export const OBJECTIVE_HP_SHAKE_MS = 220
/** How long a fighter card stays tinted after taking damage or being healed. */
export const OBJECTIVE_CARD_FLASH_MS = 350
// ── Objective Fight 2.1: role HP pools, boss AoE, cooldown abilities ───────
/** Fight-local max HP per role — the tank soaks taunted damage, the ADC is fragile */
export const OBJECTIVE_ROLE_MAX_HP: Record<'top' | 'jungle' | 'mid' | 'adc' | 'support', number> = {
  top: 260,
  jungle: 190,
  mid: 150,
  adc: 130,
  support: 170,
}
/** Boss AoE damage per second on every standing fighter (both teams) */
export const OBJECTIVE_AOE_DPS_DRAKE = 5
export const OBJECTIVE_AOE_DPS_BARON = 7
/** Cadence of the AoE/down tick inside the fight */
export const OBJECTIVE_ABILITY_TICK_S = 1
/** Ability cooldown per role (seconds, measured from the end of the active window) */
export const OBJECTIVE_ABILITY_CD_S: Record<'top' | 'jungle' | 'mid' | 'adc' | 'support', number> =
  {
    top: 6,
    jungle: 5,
    mid: 3.5,
    adc: 5,
    support: 4,
  }
/** Ability active-window duration per role (support: visual cast window — the burst applies once at cast) */
export const OBJECTIVE_ABILITY_DURATION_S: Record<
  'top' | 'jungle' | 'mid' | 'adc' | 'support',
  number
> = {
  top: 1.5,
  jungle: 2.5,
  mid: 2,
  adc: 2,
  support: 0.8,
}
/** Staggered first casts so the pit doesn't fire everything at once */
export const OBJECTIVE_ABILITY_FIRST_CAST_OFFSET_S: Record<
  'top' | 'jungle' | 'mid' | 'adc' | 'support',
  number
> = {
  top: 2,
  jungle: 1.5,
  mid: 1,
  adc: 2.5,
  support: 3,
}
/** ADC "Deadeye": passive crit chance and multiplier; "Focus Fire" window crits always */
export const OBJECTIVE_ADC_CRIT_CHANCE = 0.25
export const OBJECTIVE_ADC_CRIT_MULT = 2
/** Mid "Hex Curse": DoT per stack while the mid stands — every cast adds a permanent stack */
export const OBJECTIVE_MID_CURSE_DPS = 6
/** Support "Mend": instant burst heal on the most wounded standing ally per cast */
export const OBJECTIVE_SUPPORT_MEND_HEAL = 24
/** Jungle "Wild Rally": DPS buff on a random standing ally while active */
export const OBJECTIVE_JUNGLE_BUFF_MULT = 1.4
/** Top "Challenge": taunted enemies pour their FULL objective DPS onto the top laner */
export const OBJECTIVE_TOP_TAUNT_TARGETS = 2
/** Role ability metadata for the objective fight panels (colors come from ROLE_BY_KEY) */
export const OBJECTIVE_ROLE_ABILITIES = {
  top: {
    name: 'Challenge',
    icon: 'game-icons:enrage',
    desc: 'Roars a challenge — two enemies turn their full damage on the Top laner instead of the objective, buying the team free swings.',
  },
  jungle: {
    name: 'Wild Rally',
    icon: 'game-icons:uprising',
    desc: 'Rallies a random standing ally, sharpening their strikes by 40% for a short window.',
  },
  mid: {
    name: 'Hex Curse',
    icon: 'game-icons:cursed-star',
    desc: 'Stacks a permanent curse on the objective — each stack burns it for 6 damage per second for the rest of the fight, as long as the Mid stands.',
  },
  adc: {
    name: 'Focus Fire',
    icon: 'game-icons:dead-eye',
    desc: 'Every shot can crit for double damage — while Focus Fire burns, every shot does.',
  },
  support: {
    name: 'Mend',
    icon: 'game-icons:healing',
    desc: 'A burst of light that instantly mends the most wounded ally still standing.',
  },
} as const

/** Hard cap on the frozen-time objective fight; resolves by damage lead */
export const OBJECTIVE_MAX_DURATION_MS = 20000
/** Post-fight summary display time — dismissible early via the X button */
export const OBJECTIVE_RESULT_DELAY_MS = 6000
/** Bottom-bar game-state stat display during a frozen-time objective fight */
// Die Bilder stehen nur im Crest der Bottom-Bar, dort mit der Statuszeile
// mitwachsend bis ~40px (4K) — laut Auflösungsvarianten-Regel also -256.
export const OBJECTIVE_FIGHT_STATUS = {
  drake: { label: 'Drake Fight', image: '/img/dragon-256.png' },
  baron: { label: 'Baron Fight', image: '/img/baron-256.png' },
  // Team-Farben aus dem Autobattle-Board (side names/kills in ScoreTopBar):
  // Blau = eigenes Team vorn, Rot = Gegner-Team vorn
  leadColor: '#93c5fd',
  behindColor: '#fca5a5',
  securedText: 'SECURED',
  lostText: 'LOST',
} as const

// ── Battle Event Timeline ──────────────────────────────────────────────────
// Phase windows in game-seconds (total game = BATTLE_TOTAL_GAME_SECONDS = 3600)
// Match script: laning 0-900 → drake chain 900-2080 (2-4 drakes, sequential,
// interleaved with mid fights 1100-1890 and cracks 820-2120) → baron 2200-2320
// (result ≤2940) → final push 3000 (50:00) → defense fight at the loser
// inhibitor ~3200 → nexus turrets ~3400-3490 → nexus 3550
export const TIMELINE_LANING_END = 900
export const TIMELINE_DRAKE_WINDOW_END = 2080
export const TIMELINE_MIDFIGHT_END = 1950
/** Random extra delay on the baron spawn time */
export const TIMELINE_BARON_SPAWN_JITTER_T = 120
/** Game-second at which the losing nexus falls */
export const TIMELINE_NEXUS_FALL_T = 3550
export const TIMELINE_FIRST_BLOOD_MIN_T = 120
export const TIMELINE_FIRST_BLOOD_MAX_T = 300
export const TIMELINE_SOLO_KILL_CHANCE = 0.3
export const TIMELINE_LANE_FIGHTS_MIN = 4
export const TIMELINE_LANE_FIGHTS_MAX = 7
export const TIMELINE_DRAKE_COUNT_MIN = 2
export const TIMELINE_DRAKE_COUNT_MAX = 4
/** Minimum game-seconds between two drake spawns surviving a timeline reseed */
export const TIMELINE_DRAKE_RESPAWN_MIN_GAP_T = 120
/** Game-seconds between a drake spawn and its scripted result — short enough that every drake in the chain resolves before the next one spawns */
export const TIMELINE_DRAKE_RESULT_DELAY_MIN_T = 150
export const TIMELINE_DRAKE_RESULT_DELAY_MAX_T = 210
/**
 * Wahrscheinlichkeit, dass ein Kill dem begünstigten Team zufällt. Nicht 1 —
 * auch das unterlegene Team muss gelegentlich punkten, sonst liest sich die
 * Timeline wie ein Skript statt wie ein Spiel.
 */
export const TIMELINE_KILL_BIAS_CHANCE = 0.65
/** Chance auf ein kleines Scharmützel rund um ein frisch gespawntes Objective. */
export const TIMELINE_PIT_SCRAP_CHANCE = 0.6
/** Verzögerung und Größe dieses Scharmützels. */
export const TIMELINE_PIT_SCRAP_DELAY_MIN_T = 8
export const TIMELINE_PIT_SCRAP_DELAY_MAX_T = 25
export const TIMELINE_PIT_SCRAP_KILLS_MIN = 1
export const TIMELINE_PIT_SCRAP_KILLS_MAX = 2
/** Streuung des Drake-Spawns innerhalb seines Zeitfensters. */
export const TIMELINE_DRAKE_SPAWN_JITTER_FRACTION = 0.15
/**
 * Das Ergebnis muss im eigenen Fenster landen UND davor Ruhe lassen, damit
 * selbst eine Viererkette nicht Schlag auf Schlag wirkt.
 */
export const TIMELINE_DRAKE_RESULT_SLOT_FRACTION = 0.85
export const TIMELINE_DRAKE_RESULT_QUIET_T = 90
export const TIMELINE_DRAKE_RESULT_DELAY_FLOOR_T = 60
export const TIMELINE_MID_FIGHTS_MIN = 2
export const TIMELINE_MID_FIGHTS_MAX = 3
export const TIMELINE_FIGHT_KILLS_MIN = 2
export const TIMELINE_FIGHT_KILLS_MAX = 4
export const TIMELINE_PUSH_KILLS_MIN = 3
export const TIMELINE_PUSH_KILLS_MAX = 6
/** Chance that a fight's top killer escalates to the next multikill tier */
export const TIMELINE_DOUBLE_CHANCE = 0.22
export const TIMELINE_TRIPLE_CHANCE = 0.3
export const TIMELINE_QUADRA_CHANCE = 0.18
export const TIMELINE_PENTA_CHANCE = 0.12
/** How strongly current momentum biases which team wins the next event */
export const TIMELINE_MOMENTUM_TEAM_BIAS = 0.35

export const TIMELINE_KILL_WINPROB_DELTA = 0.02
export const TIMELINE_DRAKE_WINPROB_DELTA = 0.06
export const TIMELINE_BARON_WINPROB_DELTA = 0.1
export const TIMELINE_TURRET_WINPROB_DELTA = 0.03
export const TIMELINE_INHIB_WINPROB_DELTA = 0.04
/** Momentum slam on the nexus explosion — oversized on purpose, the clamps pin the bar to its end */
export const TIMELINE_NEXUS_WINPROB_DELTA = 1
// ── Structure destruction schedule (all times in game-seconds) ─────────────
// Both teams fully crack one random enemy lane (up to the inhibitor) before
// baron spawns; other lanes only lose 1-2 turrets and never an inhibitor.
/** Structure falls start shortly after the laning phase */
export const TIMELINE_CRACK_WINDOW_START_T = 820
/** The crack phase must finish this long before baron spawns */
export const TIMELINE_CRACK_WINDOW_END_MARGIN_T = 80
/** Extra turrets each team takes outside its crack lane (min/max) */
export const TIMELINE_EXTRA_TURRETS_MIN = 1
export const TIMELINE_EXTRA_TURRETS_MAX = 2
/** Minimum spacing between consecutive structure falls */
export const TIMELINE_STRUCTURE_MIN_GAP_T = 40
/** Nexus turrets fall this long after the final defense fight ends (min/max delay each) — paced so the winner visibly breaks through */
export const TIMELINE_NEXUS_TURRET_DELAY_MIN_T = 60
export const TIMELINE_NEXUS_TURRET_DELAY_MAX_T = 110
/** Both nexus turrets must be down this long before the nexus falls */
export const TIMELINE_NEXUS_TURRET_END_MARGIN_T = 60
/** Champions on the attacking side present at a structure fall (min/max) */
export const STRUCTURE_ATTACKERS_MIN = 1
export const STRUCTURE_ATTACKERS_MAX = 3
/** Objective pit participants per team (min/max champions) */
export const TIMELINE_OBJECTIVE_PARTICIPANTS_MIN = 3
export const TIMELINE_OBJECTIVE_PARTICIPANTS_MAX = 5
/** Game-seconds between the baron spawn and its scripted result (~10 real-s; must resolve before FINAL_PUSH_START_T even with max spawn jitter); drakes use the shorter TIMELINE_DRAKE_RESULT_DELAY_* so the chain never overlaps */
export const TIMELINE_OBJECTIVE_RESULT_DELAY_MIN_T = 560
export const TIMELINE_OBJECTIVE_RESULT_DELAY_MAX_T = 620

// ── Champion movement (minimap waypoints, game-seconds / map-units) ────────
/** Game-seconds champions need to walk from base to their lane at game start */
export const MOVE_WALKOUT_END_T = 90
/** Game-seconds a respawned champion needs to walk back to its planned action */
export const MOVE_RESPAWN_WALK_SECONDS = 240
/** Champions start moving toward a fight this many game-seconds before it starts */
export const MOVE_FIGHT_GATHER_LEAD_T = 80
/** Game-seconds attackers keep sieging at a structure after it falls */
export const MOVE_SIEGE_HOLD_T = 120
/** Default travel duration of a movement order */
export const MOVE_ORDER_TRAVEL_T = 120
/** Game-seconds before a kill that its killer AND victim converge on the kill
 *  spot — guarantees an enemy dot is adjacent at the moment of every death. */
export const MOVE_KILL_CONVERGE_LEAD_T = 70
/** Game-seconds the killer lingers over the corpse after a kill (so the map
 *  clearly shows who scored it before both move on). */
export const MOVE_KILL_KILLER_HOLD_T = 55
/** Game-seconds a kill-spot marker stays on the minimap after a kill lands. */
export const KILL_MARK_WINDOW_T = 190
// ── Final push choreography (endgame at the 50:00 clock mark) ──────────────
/** Game-second the endgame push begins — 50:00 on the match clock */
export const FINAL_PUSH_START_T = 3000
/** Per-champion random stagger on the final push start */
export const FINAL_PUSH_STAGGER_T = 50
/** Defenders start moving this many game-seconds before the attackers (shorter way, they dig in first) */
export const FINAL_PUSH_DEFENDER_LEAD_T = 30
/** Game-seconds both teams need to march to the defense line (loser inhibitor) */
export const FINAL_PUSH_TO_INHIB_TRAVEL_T = 150
/** Game-second of the final defense fight at the loser's inhibitor */
export const FINAL_PUSH_FIGHT_T = 3200
/** Game-seconds both teams stand and fight at the inhibitor before the breakthrough */
export const FINAL_PUSH_FIGHT_HOLD_T = 140
/** Game-seconds the winner's breakthrough march takes (inhibitor → nexus gate → nexus) */
export const FINAL_PUSH_NEXUS_TRAVEL_T = 250
/** Game-seconds the loser survivors need to fall back from the inhibitor to their nexus */
export const FINAL_PUSH_LAST_STAND_TRAVEL_T = 120
/** Cosmetic position jitter in map-units applied by the UI ticker */
export const MOVE_JITTER_UNITS = 1.5

// ── Bewegungs-Choreografie: Streuung, Halte- und Wiederholzeiten ──────────
// Alle Zeiten in Spielsekunden, alle Positionen in Map-Einheiten (0–100).
/**
 * Karten-Ränder. Ein gestreuter Zielpunkt darf nie ganz an den Rand rutschen —
 * dort läge das Champion-Symbol halb außerhalb der Minimap.
 */
export const MOVE_MAP_CLAMP_MIN = 3
export const MOVE_MAP_CLAMP_MAX = 97
/** Streuung um einen Zielpunkt, je Anlass. Ein Kill trifft enger als ein Roam. */
export const MOVE_JITTER_DEFAULT = 4
export const MOVE_JITTER_FIGHT = 3
export const MOVE_JITTER_OBJECTIVE = 4
export const MOVE_JITTER_KILLER = 2.5
export const MOVE_JITTER_VICTIM = 1.5
export const MOVE_JITTER_ROAM = 2
export const MOVE_JITTER_PUSH_DEFENSE = 2.5
export const MOVE_JITTER_PUSH_NEXUS = 3
export const MOVE_JITTER_DEFENDER_LINE = 3.5
/** Wie lange nach Kampfbeginn noch am Ort verweilt wird. */
export const MOVE_FIGHT_HOLD_T = 140
/** Verweildauer an einem Objective — Drakes ketten sich, der Baron nicht. */
export const MOVE_OBJECTIVE_HOLD_BARON_T = 600
export const MOVE_OBJECTIVE_HOLD_DRAKE_T = 300
/** Jungle-Roam: Startversatz, Sicherheitsabstand zum Spielende und Taktung. */
export const MOVE_ROAM_START_OFFSET_T = 60
export const MOVE_ROAM_END_MARGIN_T = 400
export const MOVE_ROAM_STEP_BASE_T = 260
export const MOVE_ROAM_STEP_RANGE_T = 200
export const MOVE_ROAM_HOLD_T = 200
/** Laner-Drift: dieselbe Mechanik, träger getaktet. */
export const MOVE_LANE_DRIFT_START_OFFSET_T = 120
export const MOVE_LANE_DRIFT_END_MARGIN_T = 500
export const MOVE_LANE_DRIFT_STEP_BASE_T = 320
export const MOVE_LANE_DRIFT_STEP_RANGE_T = 260
export const MOVE_LANE_DRIFT_HOLD_T = 260
/** Auslaufpfad des Junglers: Abschnitt der Lane, den er anschneidet. */
export const MOVE_JUNGLE_WALKOUT_PATH_START = 0.06
export const MOVE_JUNGLE_WALKOUT_PATH_END = 0.2
export const MOVE_JUNGLE_WALKOUT_PATH_SAMPLES = 3
/** Sichtbarkeitsfenster einer Minion-Welle als Anteil ihres Lane-Pfades. */
export const MINION_PROGRESS_MIN = 0.02
export const MINION_PROGRESS_MAX = 0.48
/** Abstand zweier Minions derselben Welle auf dem Pfad. */
export const MINION_SPACING = 0.012
/** UI position sampling interval (ms) */
export const MOVE_TICK_INTERVAL_MS = 500
/**
 * Kosmetisches Zittern der Symbole auf der Rift-Minimap, damit ein wartender
 * Champion nicht eingefroren wirkt. Die Faktoren sind teilerfremd gewählt, so
 * dass die fünf Symbole eines Teams nie im Gleichtakt schwingen.
 */
export const MOVE_JITTER_PHASE_X = 0.7
export const MOVE_JITTER_PHASE_Y = 0.9
export const MOVE_JITTER_INDEX_X = 2.1
export const MOVE_JITTER_INDEX_Y = 1.7
export const MOVE_JITTER_TEAM_Y = 2
export const MOVE_JITTER_AMPLITUDE = 0.5
/** Rand, den ein zitterndes Symbol auf der Minimap einhält. */
export const MOVE_DISPLAY_CLAMP_MIN = 2
export const MOVE_DISPLAY_CLAMP_MAX = 98

/** Einpassung des Objective-Modals in sein Overlay. */
export const OBJECTIVE_MODAL_MAX_SCALE = 1.35
export const OBJECTIVE_MODAL_FIT_PADDING_PX = 10

/** Movement-trail history length per champion (samples × tick interval ≈ trail duration) */
export const TRAIL_MAX_POINTS = 7
/** Minimum total walked distance (map-units) in the history before a trail is drawn */
export const TRAIL_MIN_DISTANCE_UNITS = 6
/** A single step longer than this (map-units) is a teleport (death→fountain) — trail resets */
export const TRAIL_TELEPORT_RESET_UNITS = 25

/** How long the minimap plays the destruction burst after a structure falls (game-seconds) */
export const STRUCTURE_BURST_GAME_SECONDS = 90
/** Maximum retained structure-feed entries */
export const STRUCTURE_FEED_MAX = 10
/** Maximum retained kill-feed entries */
export const KILL_FEED_MAX = 30

// ── Jungle buff route (early-game jungler script) ──────────────────────────
/** Earliest game-second the first buff camp falls (jungler arrives via walkout at 90) */
export const JUNGLE_FIRST_BUFF_CLEAR_MIN_T = 150
/** Latest game-second the first buff camp falls */
export const JUNGLE_FIRST_BUFF_CLEAR_MAX_T = 195
/** Minimum gap between first and second buff clear (gank window sits in between) */
export const JUNGLE_SECOND_BUFF_GAP_MIN_T = 150
/** Maximum gap between first and second buff clear */
export const JUNGLE_SECOND_BUFF_GAP_MAX_T = 280

/** Game-seconds after the second buff clear before the regular jungle roam starts */
export const JUNGLE_ROAM_AFTER_BUFFS_T = 60
