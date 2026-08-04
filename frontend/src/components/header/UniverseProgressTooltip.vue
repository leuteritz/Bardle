<script setup lang="ts">
/**
 * Hover-Dashboard der Universums-Fortschrittszeile im Header.
 *
 * Der Balken selbst kann nur „63,4 %" sagen. Was ein Spieler an dieser Stelle
 * wirklich wissen will, ist der Weg dahinter und davor: wie lange er schon in
 * diesem Universum steckt, was er darin befreit hat, wann die Rettung beim
 * aktuellen Ertrag fällig ist — und wie sich dieser Lauf gegen die vorigen
 * schlägt. Genau das ordnet dieses Panel in drei Blöcken an.
 *
 * Ohne eigenen Timer: alle Anzeigen hängen an Store-Werten, die der Spieltakt
 * ohnehin jede Sekunde fortschreibt (`inGameTime`, `chimesForNextUniverse`).
 * Und da das Panel nur im geöffneten Zustand existiert (v-if hinter dem
 * Teleport in RpgBadgeTooltip), kostet der Header im Ruhezustand nichts.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { universes } from '@/config/universes'
import { formatNumber, formatNumberCompact } from '@/config/numberFormat'
import { formatCompactDuration, toRoman } from '@/utils/format'
import {
  MS_PER_SECOND,
  UNIVERSE_BAR_TICK_PERCENTS,
  UNIVERSE_MILESTONE_COUNT,
  UNIVERSE_MILESTONE_STEP_PERCENT,
  UNIVERSE_TOOLTIP_ICONS,
  UNIVERSE_TOOLTIP_IMAGES,
  UNIVERSE_TOOLTIP_MEEP_SCALE,
} from '@/config/constants'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

/* ── Identität des Universums ────────────────────────────────────────────── */

const universe = computed(() => universes[gameStore.currentUniverse - 1])
const universeRoman = computed(() => toRoman(gameStore.currentUniverse))
const modifier = computed(() => universe.value?.modifier ?? null)

/* ── Rettungsfortschritt ─────────────────────────────────────────────────── */

const progress = computed(() => gameStore.universeRescueProgress)
const reachedMilestones = computed(() =>
  Math.floor(progress.value / UNIVERSE_MILESTONE_STEP_PERCENT),
)

/** Sekundenertrag, mit dem die Schätzung rechnet — inkl. laufendem MVP-Buff. */
const rescueRate = computed(() => gameStore.chimesPerSecond * gameStore.mvpBuffMultiplier)

const etaSeconds = computed(() => gameStore.universeRescueEtaSeconds)

/**
 * Eine Zeile, drei Lagen: gerettet, rechnerisch absehbar, oder es fehlt die
 * Produktion, aus der sich überhaupt etwas hochrechnen ließe.
 */
interface RescueStatus {
  tone: 'ready' | 'idle' | 'eta'
  /** Entweder ein Iconify-Glyph — oder ein Artwork, wo das Spiel eines hat. */
  icon?: string
  image?: string
  text: string
}

const rescueStatus = computed<RescueStatus>(() => {
  if (gameStore.prestigeAvailable) {
    return {
      tone: 'ready',
      icon: UNIVERSE_TOOLTIP_ICONS.universesRescued,
      text: 'Rescued — prestige to carry the song onward',
    }
  }
  if (!Number.isFinite(etaSeconds.value)) {
    return {
      tone: 'idle',
      image: UNIVERSE_TOOLTIP_IMAGES.chimes,
      text: 'No passive chimes yet — build a chime works to set a pace',
    }
  }
  return {
    tone: 'eta',
    icon: UNIVERSE_TOOLTIP_ICONS.fastestRun,
    text: `Rescue in about ${formatCompactDuration(etaSeconds.value * MS_PER_SECOND)}`,
  }
})

/* ── Die beiden Statistikblöcke ──────────────────────────────────────────── */

interface StatRow {
  key: string
  /** Wie in der Statuszeile: Glyph, oder das Artwork des Spielinhalts. */
  icon?: string
  image?: string
  /** Ausgleich für Artworks, die ihre Box nicht ausfüllen (siehe Meep). */
  imageScale?: number
  label: string
  value: string
  /** Ungekürzter Wert für das native title-Attribut, wo einer existiert. */
  full?: string
}

const run = computed(() => gameStore.universeRunStats)

const duration = (seconds: number) => formatCompactDuration(seconds * MS_PER_SECOND)
const count = (value: number) => ({
  value: formatNumberCompact(value),
  full: formatNumber(value),
})

const runRows = computed<StatRow[]>(() => [
  {
    key: 'planets',
    icon: UNIVERSE_TOOLTIP_ICONS.planetsCleared,
    label: 'Planets cleared',
    ...count(run.value.planetsCleared),
  },
  {
    key: 'bosses',
    icon: UNIVERSE_TOOLTIP_ICONS.bossesFelled,
    label: 'Bosses felled',
    ...count(run.value.bossesFelled),
  },
  {
    key: 'lost',
    icon: UNIVERSE_TOOLTIP_ICONS.starsLost,
    label: 'Stars lost',
    ...count(run.value.starsLost),
  },
  {
    key: 'meeps',
    image: UNIVERSE_TOOLTIP_IMAGES.meeps,
    imageScale: UNIVERSE_TOOLTIP_MEEP_SCALE,
    label: 'Meeps guided',
    ...count(run.value.meepsEarned),
  },
  {
    key: 'materials',
    icon: UNIVERSE_TOOLTIP_ICONS.materials,
    label: 'Materials found',
    ...count(run.value.materialsGathered),
  },
  {
    key: 'clicks',
    icon: UNIVERSE_TOOLTIP_ICONS.clicks,
    label: 'Bell strikes',
    ...count(run.value.clicks),
  },
])

const lifetimeRows = computed<StatRow[]>(() => [
  {
    key: 'prestiges',
    icon: UNIVERSE_TOOLTIP_ICONS.universesRescued,
    label: 'Universes rescued',
    ...count(gameStore.totalPrestiges),
  },
  {
    key: 'fastest',
    icon: UNIVERSE_TOOLTIP_ICONS.fastestRun,
    label: 'Fastest rescue',
    value: gameStore.fastestUniverseRunSeconds > 0
      ? duration(gameStore.fastestUniverseRunSeconds)
      : '—',
  },
  {
    key: 'last',
    icon: UNIVERSE_TOOLTIP_ICONS.lastRun,
    label: 'Previous rescue',
    value: gameStore.lastUniverseRunSeconds > 0
      ? duration(gameStore.lastUniverseRunSeconds)
      : '—',
  },
  {
    key: 'cores',
    icon: UNIVERSE_TOOLTIP_ICONS.galaxyCores,
    label: 'Galaxy cores freed',
    ...count(galaxyStore.totalGalaxyBossesDefeated),
  },
  {
    key: 'chimes',
    image: UNIVERSE_TOOLTIP_IMAGES.chimes,
    label: 'Chimes earned',
    ...count(Math.floor(gameStore.totalChimesEarned)),
  },
  {
    key: 'playtime',
    icon: UNIVERSE_TOOLTIP_ICONS.playTime,
    label: 'Time played',
    value: duration(gameStore.inGameTime),
  },
])
</script>

<template>
  <div class="upt">
    <div class="upt-goldline" aria-hidden="true"></div>

    <!-- ════════ Kopf: welches Universum, und das wievielte ════════ -->
    <header class="upt-head">
      <Icon
        :icon="UNIVERSE_TOOLTIP_ICONS.universesRescued"
        width="24"
        height="24"
        class="upt-head-icon"
        aria-hidden="true"
      />
      <div class="upt-head-text">
        <div class="upt-name">Universe {{ universeRoman }}</div>
        <div class="upt-subname">{{ universe?.name ?? 'Uncharted' }}</div>
      </div>
    </header>

    <p v-if="universe?.description" class="upt-desc">{{ universe.description }}</p>

    <!-- ════════ Das Gesetz, unter dem dieses Universum steht ════════ -->
    <section v-if="modifier" class="upt-block upt-law">
      <Icon :icon="modifier.icon" width="26" height="26" class="upt-law-icon" aria-hidden="true" />
      <div class="upt-law-text">
        <div class="upt-law-name">{{ modifier.name }}</div>
        <div class="upt-law-desc">{{ modifier.description }}</div>
      </div>
    </section>

    <!-- ════════ Rettungsfortschritt ════════ -->
    <section class="upt-block">
      <div class="upt-block-head">
        <span class="upt-block-title">Universe rescue</span>
        <span class="upt-ms">{{ reachedMilestones }} / {{ UNIVERSE_MILESTONE_COUNT }} marks</span>
        <span class="upt-pct">{{ progress.toFixed(1) }}%</span>
      </div>

      <div class="upt-bar">
        <div class="upt-bar-fill" :style="{ width: `${progress}%` }"></div>
        <div
          v-for="tick in UNIVERSE_BAR_TICK_PERCENTS"
          :key="tick"
          class="upt-bar-seg"
          :style="{ left: `${tick}%` }"
        ></div>
      </div>

      <div class="upt-cells">
        <div class="upt-cell">
          <span class="upt-cell-k">Collected</span>
          <span
            class="upt-cell-v upt-cell-v--accent"
            :title="formatNumber(gameStore.chimesForNextUniverse)"
          >
            {{ formatNumberCompact(gameStore.chimesForNextUniverse) }}
          </span>
        </div>
        <div class="upt-cell">
          <span class="upt-cell-k">Needed</span>
          <span class="upt-cell-v" :title="formatNumber(gameStore.chimesToUniverseRescue)">
            {{ formatNumberCompact(gameStore.chimesToUniverseRescue) }}
          </span>
        </div>
        <div class="upt-cell">
          <span class="upt-cell-k">Remaining</span>
          <span class="upt-cell-v" :title="formatNumber(gameStore.universeRescueRemaining)">
            {{ formatNumberCompact(gameStore.universeRescueRemaining) }}
          </span>
        </div>
      </div>

      <div class="upt-status" :class="`upt-status--${rescueStatus.tone}`">
        <img
          v-if="rescueStatus.image"
          :src="rescueStatus.image"
          class="upt-status-img"
          alt=""
          aria-hidden="true"
        />
        <Icon
          v-else-if="rescueStatus.icon"
          :icon="rescueStatus.icon"
          class="upt-status-icon"
          width="16"
          height="16"
          aria-hidden="true"
        />
        <span>{{ rescueStatus.text }}</span>
        <span v-if="rescueStatus.tone === 'eta'" class="upt-status-rate">
          at {{ formatNumberCompact(rescueRate) }}/s
        </span>
      </div>

      <div v-if="!gameStore.prestigeAvailable" class="upt-hint">
        The next universe will ask for
        {{ formatNumberCompact(gameStore.nextUniverseRescueCost) }} chimes.
      </div>
    </section>

    <!-- ════════ Was in diesem Universum geschah ════════ -->
    <section class="upt-block">
      <div class="upt-block-title upt-block-title--solo">This universe</div>

      <div class="upt-tiles">
        <div class="upt-tile">
          <Icon
            :icon="UNIVERSE_TOOLTIP_ICONS.timeHere"
            width="18"
            height="18"
            class="upt-tile-icon"
            aria-hidden="true"
          />
          <span class="upt-tile-v">{{ duration(run.playedSeconds) }}</span>
          <span class="upt-tile-k">Time here</span>
        </div>
        <div class="upt-tile">
          <Icon
            :icon="UNIVERSE_TOOLTIP_ICONS.starsRescued"
            width="18"
            height="18"
            class="upt-tile-icon"
            aria-hidden="true"
          />
          <span class="upt-tile-v">{{ formatNumberCompact(run.starsRescued) }}</span>
          <span class="upt-tile-k">Stars saved</span>
        </div>
        <div class="upt-tile">
          <Icon
            :icon="UNIVERSE_TOOLTIP_ICONS.galaxiesFreed"
            width="18"
            height="18"
            class="upt-tile-icon"
            aria-hidden="true"
          />
          <span class="upt-tile-v">{{ formatNumberCompact(run.galaxiesFreed) }}</span>
          <span class="upt-tile-k">Galaxies freed</span>
        </div>
      </div>

      <div class="upt-rows">
        <div v-for="row in runRows" :key="row.key" class="upt-row">
          <img
            v-if="row.image"
            :src="row.image"
            class="upt-row-icon"
            :style="row.imageScale ? { transform: `scale(${row.imageScale})` } : undefined"
            alt=""
            aria-hidden="true"
          />
          <Icon
            v-else-if="row.icon"
            :icon="row.icon"
            class="upt-row-icon"
            width="15"
            height="15"
            aria-hidden="true"
          />
          <span class="upt-row-k">{{ row.label }}</span>
          <span class="upt-row-v" :title="row.full">{{ row.value }}</span>
        </div>
      </div>
    </section>

    <!-- ════════ Über alle Universen hinweg ════════ -->
    <section class="upt-block">
      <div class="upt-block-title upt-block-title--solo">Across all universes</div>
      <div class="upt-rows">
        <div v-for="row in lifetimeRows" :key="row.key" class="upt-row">
          <img
            v-if="row.image"
            :src="row.image"
            class="upt-row-icon"
            :style="row.imageScale ? { transform: `scale(${row.imageScale})` } : undefined"
            alt=""
            aria-hidden="true"
          />
          <Icon
            v-else-if="row.icon"
            :icon="row.icon"
            class="upt-row-icon"
            width="15"
            height="15"
            aria-hidden="true"
          />
          <span class="upt-row-k">{{ row.label }}</span>
          <span class="upt-row-v" :title="row.full">{{ row.value }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ================================================================
   Universums-Tooltip — Panel-Innenleben. Der Rahmen (Holz + Schatten)
   kommt von RpgBadgeTooltip; hier nur der Inhalt.

   Alle Maße hängen wie im Material-Tooltip an der Wurzel-font-size,
   die mit dem Viewport skaliert — dasselbe Panel liest sich damit auf
   Full HD kompakt und auf 4K großzügig, ohne zweites Layout.
   ================================================================ */
.upt {
  /* Eine Stufe größer als im Material-Tooltip: dort trägt eine Kachel eine
     einzelne Zahl, hier stehen zwölf beschriftete Zeilen nebeneinander — die
     kleinste Bezeichnung landete sonst auf Full HD bei 9,6px. Gemessen
     kostet die Stufe rund 50px Höhe, die das Panel unter dem Header hat. */
  font-size: clamp(12px, 0.63vw, 16px);
  color: #d8cfc0;
  line-height: 1.35;
  border-radius: 2px;
  /* Sicherheitsnetz: das Panel misst auf Full HD gut 540px und bleibt damit
     unter dem Header sichtbar. Die Grenze existiert, damit ein späterer
     Block es nie aus dem flachsten Referenz-Viewport schieben kann. */
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.upt-goldline {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* ── Kopf ──────────────────────────────────────────────────────── */
.upt-head {
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 0.7em 0.9em;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

/* Amethyst wie die Universe-Kachel im Header — dieselbe Sache, dieselbe Farbe. */
.upt-head-icon {
  color: #b98cf5;
  flex-shrink: 0;
  width: 1.9em;
  height: 1.9em;
}

.upt-head-text {
  min-width: 0;
  flex: 1;
}

.upt-name {
  font-size: 1.32em;
  font-weight: 700;
  color: #d7bcff;
  letter-spacing: 0.03em;
  line-height: 1.15;
}

.upt-subname {
  font-size: 0.95em;
  color: #9b8461;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.upt-desc {
  padding: 0.55em 0.9em;
  margin: 0;
  font-size: 0.98em;
  color: #a99b83;
  font-style: italic;
  background: #1a1008;
  border-bottom: 1px solid #33220e;
}

/* ── Blöcke ────────────────────────────────────────────────────── */
.upt-block {
  padding: 0.7em 0.9em;
  border-bottom: 1px solid #26190c;
}

.upt-block:last-child {
  border-bottom: none;
}

.upt-block-head {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  margin-bottom: 0.5em;
}

.upt-block-title {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #8a7c66;
}

.upt-block-title--solo {
  display: block;
  margin-bottom: 0.55em;
}

/* Meilensteine stehen zwischen Titel und Prozentwert — sie zählen dieselbe
   Strecke, nur in den zehn Abschnitten, die der Balken im Header markiert. */
.upt-ms {
  margin-left: auto;
  font-size: 0.88em;
  font-variant-numeric: tabular-nums;
  color: #8a7c66;
}

.upt-pct {
  font-size: 1.3em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
}

/* ── Das Gesetz des Universums ─────────────────────────────────── */
.upt-law {
  display: flex;
  align-items: center;
  gap: 0.7em;
  background: #170f22;
}

.upt-law-icon {
  flex-shrink: 0;
  width: 2em;
  height: 2em;
  color: #b98cf5;
}

.upt-law-text {
  min-width: 0;
}

.upt-law-name {
  font-size: 1.05em;
  font-weight: 700;
  color: #d7bcff;
}

.upt-law-desc {
  font-size: 0.95em;
  color: #a99b83;
}

/* ── Fortschrittsbalken ────────────────────────────────────────── */
/* Statisch: kein Schimmer, kein Puls. Das Panel steht über dem laufenden
   Orbit — ein zweiter animierter Balken wäre reine Frame-Kosten für eine
   Information, die der Header schon bewegt zeigt. */
.upt-bar {
  position: relative;
  height: 0.85em;
  border-radius: 4px;
  background: #0d0904;
  border: 1px solid rgba(200, 144, 64, 0.42);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.upt-bar-fill {
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  border-radius: 3px;
  background: linear-gradient(to right, #b8791c 0%, #e0a828 55%, #f5d666 100%);
}

.upt-bar-seg {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.45);
}

/* ── Chime-Bilanz ──────────────────────────────────────────────── */
.upt-cells {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  margin-top: 0.6em;
  background: #33220e;
  border: 1px solid #33220e;
  border-radius: 4px;
  overflow: hidden;
}

.upt-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.12em;
  padding: 0.5em 0.3em;
  background: #141410;
}

.upt-cell-k {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #8a7c66;
}

.upt-cell-v {
  font-size: 1.25em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8dccb;
  line-height: 1;
}

.upt-cell-v--accent {
  color: #e8c040;
}

/* ── Statuszeile ───────────────────────────────────────────────── */
.upt-status {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin-top: 0.6em;
  padding: 0.4em 0.55em;
  border-radius: 4px;
  font-size: 0.98em;
  background: #1a1008;
  border: 1px solid #33220e;
}

/* Dieselbe Kante wie die Zeilenmarken, damit die Statuszeile keine zweite
   Größenordnung ins Panel bringt. */
.upt-status-icon,
.upt-status-img {
  width: 1.25em;
  height: 1.25em;
  object-fit: contain;
  flex-shrink: 0;
}

.upt-status--eta {
  color: #d8cfc0;
}

.upt-status--ready {
  color: #a8e878;
  background: #14200e;
  border-color: #2e7a1a;
}

.upt-status--idle {
  color: #a99b83;
  font-style: italic;
}

.upt-status-rate {
  margin-left: auto;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}

.upt-hint {
  margin-top: 0.4em;
  font-size: 0.88em;
  color: #6f634f;
  font-style: italic;
}

/* ── Kernzahlen des Laufs ──────────────────────────────────────── */
.upt-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  margin-bottom: 0.6em;
  background: #33220e;
  border: 1px solid #33220e;
  border-radius: 4px;
  overflow: hidden;
}

.upt-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.14em;
  padding: 0.55em 0.3em;
  background: #141410;
}

.upt-tile-icon {
  width: 1.5em;
  height: 1.5em;
  color: #a08a5e;
}

.upt-tile-v {
  font-size: 1.28em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
  white-space: nowrap;
}

.upt-tile-k {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8a7c66;
  white-space: nowrap;
}

/* ── Zweispaltige Zeilenblöcke ─────────────────────────────────── */
/* Zwei Spalten statt einer Kolumne: sechs Zeilen untereinander machten das
   Panel doppelt so hoch, und auf dem flachsten Referenz-Viewport (Full HD)
   ginge genau diese Höhe verloren. */
.upt-rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 1.1em;
  row-gap: 0.1em;
}

.upt-row {
  display: grid;
  grid-template-columns: 1.3em minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45em;
  padding: 0.18em 0;
  min-width: 0;
}

/* Überschreibt die Attributgröße, damit das Glyph der Panel-Schriftgröße
   folgt — feste 15px wären auf 2K/4K neben dem größeren Text ein Fleck.
   Gilt für beide Sorten Zeilenmarke: Iconify-Glyph und Artwork. Die `color`
   greift nur beim SVG, das `object-fit` nur beim Bild. */
.upt-row-icon {
  width: 1.3em;
  height: 1.3em;
  color: #a08a5e;
  object-fit: contain;
  flex-shrink: 0;
}

.upt-row-k {
  font-size: 0.98em;
  color: #93866f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upt-row-v {
  font-size: 0.98em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}
</style>
