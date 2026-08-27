<script setup lang="ts">
/**
 * Hover-Dashboard der Galaxy-Kachel im Header.
 *
 * Die Kachel kann nur „7" sagen. Was ein Spieler an dieser Stelle wissen will,
 * ist die LAGE: woran die Flotte gerade arbeitet, wie viele Sterne noch
 * fehlen, ob der Kern schon offen ist und was der nächste Tier kostet. Das
 * Panel beantwortet das von oben nach unten — erst der aktuelle Auftrag, dann
 * die Strecke, dann die Bilanz.
 *
 * Bewusst anders geschnitten als das Universums-Panel darüber: das Universum
 * ist eine Bilanz über viele Stunden, die Galaxie ist ein laufender Einsatz.
 * Deshalb steht hier eine Statuszeile ganz oben statt am Ende eines Blocks.
 *
 * Ohne eigenen Timer: Reise-Restzeit und Fortschritt hängen an
 * `galaxyStore._travelTickMs`, das der Spieltakt ohnehin jede Sekunde
 * fortschreibt. Und da das Panel nur im geöffneten Zustand existiert (v-if
 * hinter dem Teleport in RpgBadgeTooltip), kostet der Header im Ruhezustand
 * nichts.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore, firstGalaxyOfTier, starLevelForGalaxy } from '@/stores/world/galaxyStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import { MATERIALS } from '@/config/economy/materials'
import { formatNumber, formatNumberCompact } from '@/config/ui/numberFormat'
import { formatCompactDuration } from '@/utils/ui/format'
import { clampPercent } from '@/utils/orbit/geometry'
import {
  MS_PER_SECOND,
  GALAXY_ATTEMPT_STRIP_MAX,
  GALAXY_BOSS_WAVE_SIZE,
  GALAXY_TOOLTIP_ICONS,
  GALAXY_TOOLTIP_IMAGE,
} from '@/config/constants'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const inventoryStore = useInventoryStore()

/* ── Identität der Galaxie ───────────────────────────────────────────────── */

const themeName = computed(
  () => GALAXY_THEMES[galaxyStore.currentThemeIndex % GALAXY_THEMES.length]?.name ?? 'Uncharted',
)

/* ── Was die Flotte gerade tut ───────────────────────────────────────────── */

/**
 * Eine Zeile, ein Auftrag. Die Reihenfolge der Prüfungen ist die Rangfolge der
 * Zustände: ein gesperrter Tier hält die fertige Galaxie fest, der Endkampf
 * schlägt die Reise, und die Rollenwahl ist der Ruhezustand dazwischen.
 */
interface FleetStatus {
  tone: 'ready' | 'locked' | 'boss' | 'travel' | 'wait'
  icon: string
  text: string
  /** Rechts in der Zeile: Restzeit, Zählstand — was den Auftrag beziffert. */
  note?: string
}

const status = computed<FleetStatus>(() => {
  if (galaxyStore.isComplete && galaxyStore.nextTierLocked) {
    return {
      tone: 'locked',
      icon: GALAXY_TOOLTIP_ICONS.locked,
      text: `Tier ${galaxyStore.nextTier} is sealed — unlock it to warp onward`,
    }
  }
  if (galaxyStore.isComplete) {
    return {
      tone: 'ready',
      icon: GALAXY_TOOLTIP_ICONS.warpReady,
      text: 'Galaxy freed — the warp lane is open',
    }
  }
  if (galaxyStore.bossPhaseActive) {
    return {
      tone: 'boss',
      icon: GALAXY_TOOLTIP_ICONS.boss,
      text: galaxyStore.galaxyBossDefeated
        ? 'Core taken — clearing the last escorts'
        : 'Core assault — the galaxy boss stands',
      note: `wave ${galaxyStore.currentBossWave} / ${galaxyStore.bossWavesTotal}`,
    }
  }
  if (galaxyStore.championTravelState === 'traveling') {
    return {
      tone: 'travel',
      icon: GALAXY_TOOLTIP_ICONS.travel,
      text: galaxyStore.travelingToGalaxyBoss
        ? 'Closing in on the galaxy core'
        : 'En route to the next star',
      note: formatCompactDuration(galaxyStore.travelRemainingMs),
    }
  }
  if (galaxyStore.championTravelState !== 'idle') {
    return {
      tone: 'travel',
      icon: GALAXY_TOOLTIP_ICONS.championReady,
      text: 'Star reached — the rescue is under way',
    }
  }
  if (galaxyStore.pendingRoleSelection) {
    return {
      tone: 'wait',
      icon: GALAXY_TOOLTIP_ICONS.roleChoice,
      text: 'Waiting for the role that flies out next',
    }
  }
  return {
    tone: 'wait',
    icon: GALAXY_TOOLTIP_ICONS.travel,
    text: 'Standing by between rescues',
  }
})

/** Nur während der Reise: der Balken der Statuszeile. */
const travelPercent = computed(() => galaxyStore.travelProgressPercent)

/* ── Sternenstrecke ──────────────────────────────────────────────────────── */

const starPercent = computed(() =>
  clampPercent((galaxyStore.starsRescued / Math.max(1, galaxyStore.starsRequired)) * 100),
)

const lostThisGalaxy = computed(
  () => galaxyStore.attemptResults.filter((r) => r === 'failed').length,
)

/** Anteil geglückter Anflüge — „—" solange kein Versuch vorliegt. */
const successRate = (rescued: number, lost: number): string => {
  const total = rescued + lost
  return total > 0 ? `${Math.round((rescued / total) * 100)}%` : '—'
}

/**
 * Die Versuchskette unter dem Balken: ein Glied je Anflug, in der Reihenfolge,
 * in der er geflogen wurde. Lange Ketten werden von LINKS gekürzt — die
 * jüngsten Versuche sind die, aus denen der Spieler etwas abliest.
 */
const attemptStrip = computed(() => {
  const all = galaxyStore.attemptResults
  const shown = all.slice(-GALAXY_ATTEMPT_STRIP_MAX)
  return { hidden: all.length - shown.length, links: shown }
})

/** Noch ausstehende Anflüge — als leere Glieder hinter der Kette. */
const openAttempts = computed(() =>
  Math.max(0, galaxyStore.starsRequired - galaxyStore.starsRescued),
)

/* ── Tier-Tor ────────────────────────────────────────────────────────────── */

const tierRange = computed(() => {
  const first = firstGalaxyOfTier(galaxyStore.currentTier)
  const last = firstGalaxyOfTier(galaxyStore.currentTier + 1) - 1
  return `Galaxies ${first}–${last}`
})

const tierCost = computed(() => galaxyStore.tierUnlockCost)

/**
 * Materialposten des Tier-Tors — nur gezeigt, wenn der Tier gesperrt ist.
 * Jeder Posten weiß, ob er gedeckt ist: das Panel beantwortet damit „kann ich
 * warpen?" allein, ohne dass der Spieler die Minimap aufziehen muss.
 */
const tierMaterials = computed(() =>
  Object.entries(tierCost.value.material).map(([id, required]) => {
    const def = MATERIALS.find((m) => m.id === id)
    return {
      id,
      required,
      name: def?.name ?? id,
      image: def?.image ?? '',
      ok: (inventoryStore.collectedMaterials[id] ?? 0) >= required,
    }
  }),
)

/* ── Endkampf am Kern ────────────────────────────────────────────────────── */

const showCoreBlock = computed(
  () => galaxyStore.bossEscortsTotal > 0 && !galaxyStore.isComplete,
)

const escortPercent = computed(() =>
  clampPercent((galaxyStore.bossEscortsDefeated / Math.max(1, galaxyStore.bossEscortsTotal)) * 100),
)

/* ── Zeiten und Bilanz ───────────────────────────────────────────────────── */

const duration = (seconds: number) => formatCompactDuration(seconds * MS_PER_SECOND)

const timeHere = computed(() =>
  Math.max(0, gameStore.inGameTime - galaxyStore.galaxyStartedAtInGameTime),
)

const bestGalaxySeconds = computed(() => {
  const done = galaxyStore.completedGalaxies
  return done.length > 0 ? Math.min(...done.map((r) => r.durationSeconds)) : 0
})

const lastGalaxySeconds = computed(() => {
  const done = galaxyStore.completedGalaxies
  return done.length > 0 ? done[done.length - 1].durationSeconds : 0
})

interface StatRow {
  key: string
  icon: string
  label: string
  value: string
  /** Ungekürzter Wert für das native title-Attribut, wo einer existiert. */
  full?: string
}

const count = (value: number) => ({
  value: formatNumberCompact(value),
  full: formatNumber(value),
})

const lifetimeRows = computed<StatRow[]>(() => [
  {
    key: 'rescued',
    icon: GALAXY_TOOLTIP_ICONS.starsRescued,
    label: 'Stars rescued',
    ...count(galaxyStore.totalStarsRescued),
  },
  {
    key: 'lost',
    icon: GALAXY_TOOLTIP_ICONS.starsLost,
    label: 'Stars lost',
    ...count(galaxyStore.totalStarsLost),
  },
  {
    key: 'rate',
    icon: GALAXY_TOOLTIP_ICONS.successRate,
    label: 'Rescue rate',
    value: successRate(galaxyStore.totalStarsRescued, galaxyStore.totalStarsLost),
  },
  {
    key: 'cores',
    icon: GALAXY_TOOLTIP_ICONS.cores,
    label: 'Cores freed',
    ...count(galaxyStore.totalGalaxyBossesDefeated),
  },
  {
    key: 'escorts',
    icon: GALAXY_TOOLTIP_ICONS.escorts,
    label: 'Escorts downed',
    ...count(galaxyStore.totalBossEscortsDefeated),
  },
  {
    key: 'charted',
    icon: GALAXY_TOOLTIP_ICONS.galaxiesCharted,
    label: 'Galaxies charted',
    ...count(galaxyStore.completedGalaxies.length),
  },
])
</script>

<template>
  <div class="gpt" style="--tip-color: #a8e878">

    <!-- ════════ Kopf: welche Galaxie, und welche Farbwelt ════════ -->
    <header class="tip-head tip-head--banded gpt-head">
      <img :src="GALAXY_TOOLTIP_IMAGE" class="gpt-head-img" alt="" aria-hidden="true" />
      <div class="gpt-head-text">
        <div class="gpt-name">Galaxy {{ galaxyStore.currentGalaxy }}</div>
        <div class="gpt-subname">{{ themeName }}</div>
      </div>
      <div class="gpt-head-tier">
        <span class="gpt-head-tier-k">Tier</span>
        <span class="gpt-head-tier-v">{{ galaxyStore.currentTier }}</span>
      </div>
    </header>

    <!-- ════════ Der laufende Auftrag ════════ -->
    <section class="gpt-status" :class="`gpt-status--${status.tone}`">
      <Icon :icon="status.icon" width="18" height="18" class="gpt-status-icon" aria-hidden="true" />
      <span class="gpt-status-text">{{ status.text }}</span>
      <span v-if="status.note" class="gpt-status-note">{{ status.note }}</span>
      <div
        v-if="galaxyStore.championTravelState === 'traveling'"
        class="gpt-status-bar"
        aria-hidden="true"
      >
        <div class="gpt-status-bar-fill" :style="{ transform: `scaleX(${travelPercent / 100})` }" />
      </div>
    </section>

    <!-- ════════ Sternenstrecke dieser Galaxie ════════ -->
    <section class="gpt-block">
      <div class="gpt-block-head">
        <span class="gpt-block-title">Star rescues</span>
        <span class="gpt-count">
          {{ galaxyStore.starsRescued }} / {{ galaxyStore.starsRequired }}
        </span>
        <span class="gpt-pct">{{ Math.round(starPercent) }}%</span>
      </div>

      <div class="gpt-bar">
        <div class="gpt-bar-fill" :style="{ width: `${starPercent}%` }"></div>
      </div>

      <!-- Versuchskette: ein Glied je Anflug, gerettet oder verloren, danach
           die noch offenen Plätze. Zusammen ist sie der Verlauf, den der
           Balken zu einer einzigen Zahl zusammenfasst. -->
      <div class="gpt-strip" aria-hidden="true">
        <span v-if="attemptStrip.hidden > 0" class="gpt-strip-more">
          +{{ attemptStrip.hidden }}
        </span>
        <span
          v-for="(link, i) in attemptStrip.links"
          :key="`a${i}`"
          class="gpt-link"
          :class="link === 'rescued' ? 'gpt-link--won' : 'gpt-link--lost'"
        />
        <span
          v-for="o in openAttempts"
          :key="`o${o}`"
          class="gpt-link gpt-link--open"
          :class="{ 'gpt-link--next': o === 1 }"
        />
      </div>

      <div class="gpt-cells">
        <div class="gpt-cell">
          <span class="gpt-cell-k">Saved</span>
          <span class="gpt-cell-v gpt-cell-v--accent">{{ galaxyStore.starsRescued }}</span>
        </div>
        <div class="gpt-cell">
          <span class="gpt-cell-k">Lost</span>
          <span class="gpt-cell-v" :class="{ 'gpt-cell-v--bad': lostThisGalaxy > 0 }">
            {{ lostThisGalaxy }}
          </span>
        </div>
        <div class="gpt-cell">
          <span class="gpt-cell-k">Rate</span>
          <span class="gpt-cell-v">
            {{ successRate(galaxyStore.starsRescued, lostThisGalaxy) }}
          </span>
        </div>
      </div>
    </section>

    <!-- ════════ Endkampf am Kern — nur solange er ansteht ════════ -->
    <section v-if="showCoreBlock" class="gpt-block gpt-core">
      <div class="gpt-block-head">
        <span class="gpt-block-title">Core assault</span>
        <span class="gpt-count">
          {{ galaxyStore.bossEscortsDefeated }} / {{ galaxyStore.bossEscortsTotal }} escorts
        </span>
      </div>
      <div class="gpt-bar gpt-bar--core">
        <div class="gpt-bar-fill gpt-bar-fill--core" :style="{ width: `${escortPercent}%` }"></div>
      </div>
      <div class="gpt-core-note">
        Wave {{ galaxyStore.currentBossWave }} of {{ galaxyStore.bossWavesTotal }} ·
        {{ GALAXY_BOSS_WAVE_SIZE }} escorts per wave ·
        {{ galaxyStore.galaxyBossDefeated ? 'boss down' : 'boss alive' }}
      </div>
    </section>

    <!-- ════════ Das Tor zum nächsten Tier ════════ -->
    <section class="gpt-block gpt-tier">
      <div class="gpt-tier-head">
        <Icon
          :icon="GALAXY_TOOLTIP_ICONS.tier"
          width="26"
          height="26"
          class="gpt-tier-icon"
          aria-hidden="true"
        />
        <div class="gpt-tier-text">
          <div class="gpt-tier-name">Tier {{ galaxyStore.currentTier }}</div>
          <div class="gpt-tier-desc">{{ tierRange }}</div>
        </div>
        <div class="gpt-chip">
          <Icon
            :icon="GALAXY_TOOLTIP_ICONS.starLevel"
            width="14"
            height="14"
            aria-hidden="true"
          />
          Star level {{ starLevelForGalaxy(galaxyStore.currentGalaxy) }}
        </div>
      </div>

      <!-- Gesperrt: was das nächste Tor kostet. Sonst nur, ob überhaupt eins
           kommt — eine Kostenliste ohne Tor wäre Lärm. -->
      <div v-if="galaxyStore.nextTierLocked" class="gpt-gate">
        <div class="gpt-gate-head">
          Tier {{ galaxyStore.nextTier }} gate — pay before the next warp
        </div>
        <div class="gpt-gate-costs">
          <span class="gpt-gate-cost" :class="{ 'gpt-gate-cost--ok': gameStore.chimes >= tierCost.chimes }">
            <img src="/img/BardAbilities/BardChime-128.png" alt="" aria-hidden="true" />
            {{ formatNumberCompact(tierCost.chimes) }}
          </span>
          <span
            v-for="m in tierMaterials"
            :key="m.id"
            class="gpt-gate-cost"
            :class="{ 'gpt-gate-cost--ok': m.ok }"
            v-tip="m.name"
          >
            <img :src="m.image" alt="" aria-hidden="true" />
            {{ formatNumberCompact(m.required) }}
          </span>
        </div>
      </div>
      <div v-else-if="galaxyStore.nextTier > galaxyStore.currentTier" class="gpt-gate-open">
        Tier {{ galaxyStore.nextTier }} already unlocked — the next galaxy opens it
      </div>
      <div v-else class="gpt-gate-open">
        Tier {{ galaxyStore.currentTier }} continues into the next galaxy
      </div>
    </section>

    <!-- ════════ Zeiten dieser und der bisherigen Galaxien ════════ -->
    <section class="gpt-block">
      <div class="gpt-block-title gpt-block-title--solo">Pace</div>
      <div class="gpt-tiles">
        <div class="gpt-tile">
          <Icon
            :icon="GALAXY_TOOLTIP_ICONS.timeHere"
            width="18"
            height="18"
            class="gpt-tile-icon"
            aria-hidden="true"
          />
          <span class="gpt-tile-v">{{ duration(timeHere) }}</span>
          <span class="gpt-tile-k">Time here</span>
        </div>
        <div class="gpt-tile">
          <Icon
            :icon="GALAXY_TOOLTIP_ICONS.bestGalaxy"
            width="18"
            height="18"
            class="gpt-tile-icon"
            aria-hidden="true"
          />
          <span class="gpt-tile-v">
            {{ bestGalaxySeconds > 0 ? duration(bestGalaxySeconds) : '—' }}
          </span>
          <span class="gpt-tile-k">Fastest</span>
        </div>
        <div class="gpt-tile">
          <Icon
            :icon="GALAXY_TOOLTIP_ICONS.lastGalaxy"
            width="18"
            height="18"
            class="gpt-tile-icon"
            aria-hidden="true"
          />
          <span class="gpt-tile-v">
            {{ lastGalaxySeconds > 0 ? duration(lastGalaxySeconds) : '—' }}
          </span>
          <span class="gpt-tile-k">Previous</span>
        </div>
      </div>
    </section>

    <!-- ════════ Über alle Galaxien hinweg ════════ -->
    <section class="gpt-block">
      <div class="gpt-block-title gpt-block-title--solo">Across all galaxies</div>
      <div class="gpt-rows">
        <div v-for="row in lifetimeRows" :key="row.key" class="gpt-row">
          <Icon :icon="row.icon" class="gpt-row-icon" width="15" height="15" aria-hidden="true" />
          <span class="gpt-row-k">{{ row.label }}</span>
          <span class="gpt-row-v" v-tip="row.full">{{ row.value }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ================================================================
   Galaxie-Tooltip — Panel-Innenleben. Der Rahmen (Holz + Schatten)
   kommt von RpgBadgeTooltip; hier nur der Inhalt.

   Maßsystem wie im Universums-Panel: alles hängt an der Wurzel-
   font-size, die mit dem Viewport skaliert — dasselbe Panel liest
   sich damit auf Full HD kompakt und auf 4K großzügig, ohne ein
   zweites Layout.
   ================================================================ */
.gpt {
  border-radius: 2px;
  /* Sicherheitsnetz: der Endkampf-Block schaltet sich zu und macht das Panel
     im ungünstigsten Zustand am höchsten — auf dem flachsten Referenz-
     Viewport (Full HD) bleibt es damit trotzdem unter dem Header. */
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* ── Kopf ──────────────────────────────────────────────────────── */
.gpt-head {
  padding: 0.7em 0.9em;
}

.gpt-head-img {
  flex-shrink: 0;
  width: 2em;
  height: 2em;
  object-fit: contain;
}

.gpt-head-text {
  min-width: 0;
  flex: 1;
}

/* Grün wie die Galaxy-Zahl in der Kachel darüber — dieselbe Sache, dieselbe
   Farbe. Das Universums-Panel trägt aus demselben Grund Amethyst. */
.gpt-name {
  font-size: 1.32em;
  font-weight: 700;
  color: #a8e878;
  letter-spacing: 0.03em;
  line-height: 1.15;
}

.gpt-subname {
  font-size: 0.95em;
  color: #9b8461;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Der Tier steht im Kopf, nicht in einer Zeile: er ist die Ebene, auf der
   diese Galaxie liegt — eine Eigenschaft ihrer Identität, kein Messwert. */
.gpt-head-tier {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05em;
  flex-shrink: 0;
  padding: 0.25em 0.6em;
  border-radius: 4px;
  background: #141410;
  border: 1px solid #33220e;
}

.gpt-head-tier-k {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8a7c66;
}

.gpt-head-tier-v {
  font-size: 1.2em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
}

/* ── Statuszeile ───────────────────────────────────────────────── */
/* Ganz oben statt am Blockende: sie beantwortet die Frage, mit der der
   Spieler auf die Kachel zeigt („was passiert gerade?"). */
.gpt-status {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 0.9em 0.55em;
  font-size: 0.98em;
  background: #1a1008;
  border-bottom: 1px solid #26190c;
}

.gpt-status-icon {
  width: 1.3em;
  height: 1.3em;
  flex-shrink: 0;
}

.gpt-status-text {
  min-width: 0;
}

.gpt-status-note {
  margin-left: auto;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}

.gpt-status--travel {
  color: #d8cfc0;
}

.gpt-status--travel .gpt-status-icon {
  color: #8ab4e8;
}

.gpt-status--ready {
  color: #a8e878;
  background: #14200e;
  border-bottom-color: #2e7a1a;
}

.gpt-status--ready .gpt-status-icon {
  color: #a8e878;
}

.gpt-status--boss {
  color: #e8a090;
  background: #200e0c;
  border-bottom-color: #6a2418;
}

.gpt-status--boss .gpt-status-icon {
  color: #cc6050;
}

.gpt-status--locked {
  color: #d8b06a;
  background: #1e1608;
}

.gpt-status--locked .gpt-status-icon {
  color: #cc6050;
}

.gpt-status--wait {
  color: #a99b83;
  font-style: italic;
}

.gpt-status--wait .gpt-status-icon {
  color: #8a7c66;
}

/* Die Reise ist der einzige Zustand mit einer laufenden Größe — der Balken
   sitzt deshalb AN der Statuszeile, nicht als eigener Block. Er wird per
   scaleX am Balken selbst getrieben (nicht über eine Variable am Container),
   damit der Sekundentakt keinen Subtree neu berechnet. */
.gpt-status-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: #0d0904;
  overflow: hidden;
}

.gpt-status-bar-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #2f5a8c, #6aa8e8);
}

/* ── Blöcke ────────────────────────────────────────────────────── */
.gpt-block {
  padding: 0.7em 0.9em;
  border-bottom: 1px solid #26190c;
}

.gpt-block:last-child {
  border-bottom: none;
}

.gpt-block-head {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  margin-bottom: 0.5em;
}

.gpt-block-title {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #8a7c66;
}

.gpt-block-title--solo {
  display: block;
  margin-bottom: 0.55em;
}

.gpt-count {
  margin-left: auto;
  font-size: 0.88em;
  font-variant-numeric: tabular-nums;
  color: #8a7c66;
}

.gpt-pct {
  font-size: 1.3em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
}

/* ── Balken ────────────────────────────────────────────────────── */
/* Statisch: kein Schimmer, kein Puls. Das Panel steht über dem laufenden
   Orbit — ein zweiter animierter Balken wäre reine Frame-Kosten. */
.gpt-bar {
  position: relative;
  height: 0.85em;
  border-radius: 4px;
  background: #0d0904;
  border: 1px solid rgba(200, 144, 64, 0.42);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.gpt-bar-fill {
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  border-radius: 3px;
  background: linear-gradient(to right, #2e7a1a 0%, #52b830 55%, #a8e878 100%);
}

.gpt-bar--core {
  border-color: rgba(204, 96, 80, 0.45);
}

.gpt-bar-fill--core {
  background: linear-gradient(to right, #7a2418 0%, #cc6050 60%, #e8a090 100%);
}

/* ── Versuchskette ─────────────────────────────────────────────── */
.gpt-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.28em;
  margin-top: 0.5em;
}

.gpt-strip-more {
  font-size: 0.82em;
  font-variant-numeric: tabular-nums;
  color: #6f634f;
  margin-right: 0.15em;
}

/* Raute statt Punkt — dasselbe Motiv wie die Meilenstein-Marken unter dem
   Universums-Balken im Header, damit beide Ketten als dieselbe Sprache
   gelesen werden. */
.gpt-link {
  width: 0.62em;
  height: 0.62em;
  border-radius: 1px;
  transform: rotate(45deg);
  flex-shrink: 0;
  border: 1px solid #33220e;
  background: #14100a;
}

.gpt-link--won {
  background: linear-gradient(135deg, #a8e878 0%, #52b830 50%, #2e7a1a 100%);
  border-color: #6ec040;
}

.gpt-link--lost {
  background: linear-gradient(135deg, #e8a090 0%, #cc6050 50%, #7a2418 100%);
  border-color: #cc6050;
}

.gpt-link--open {
  background: #0d0904;
  border-color: rgba(200, 144, 64, 0.3);
}

/* Nur Opazität, kein Schatten: eine einzelne Marke, aber die Regel gilt
   überall — ein animierter box-shadow rastert die Box jeden Frame neu. */
.gpt-link--next {
  border-color: rgba(232, 192, 64, 0.8);
  animation: gptNextBreathe 2.6s ease-in-out infinite;
}

@keyframes gptNextBreathe {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

/* ── Zählzellen ────────────────────────────────────────────────── */
.gpt-cells {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  margin-top: 0.6em;
  background: #33220e;
  border: 1px solid #33220e;
  border-radius: 4px;
  overflow: hidden;
}

.gpt-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.12em;
  padding: 0.5em 0.3em;
  background: #141410;
}

.gpt-cell-k {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #8a7c66;
}

.gpt-cell-v {
  font-size: 1.25em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8dccb;
  line-height: 1;
}

.gpt-cell-v--accent {
  color: #a8e878;
}

.gpt-cell-v--bad {
  color: #cc6050;
}

/* ── Endkampf ──────────────────────────────────────────────────── */
.gpt-core {
  background: #170c0a;
}

.gpt-core-note {
  margin-top: 0.45em;
  font-size: 0.9em;
  color: #a99b83;
}

/* ── Tier-Tor ──────────────────────────────────────────────────── */
.gpt-tier {
  background: #14180f;
}

.gpt-tier-head {
  display: flex;
  align-items: center;
  gap: 0.7em;
}

.gpt-tier-icon {
  flex-shrink: 0;
  width: 2em;
  height: 2em;
  color: #a8e878;
}

.gpt-tier-text {
  min-width: 0;
  flex: 1;
}

.gpt-tier-name {
  font-size: 1.05em;
  font-weight: 700;
  color: #cfe8b0;
}

.gpt-tier-desc {
  font-size: 0.95em;
  color: #a99b83;
}

.gpt-chip {
  display: flex;
  align-items: center;
  gap: 0.3em;
  flex-shrink: 0;
  padding: 0.25em 0.5em;
  border-radius: 4px;
  font-size: 0.88em;
  white-space: nowrap;
  background: #141410;
  border: 1px solid #33220e;
  color: #e8c040;
}

.gpt-gate {
  margin-top: 0.55em;
  padding: 0.5em 0.6em;
  border-radius: 4px;
  background: #1e1608;
  border: 1px solid #5c3310;
}

.gpt-gate-head {
  font-size: 0.92em;
  color: #d8b06a;
  margin-bottom: 0.4em;
}

.gpt-gate-costs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
}

.gpt-gate-cost {
  display: flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.2em 0.45em;
  border-radius: 4px;
  font-size: 0.92em;
  font-variant-numeric: tabular-nums;
  background: #141410;
  border: 1px solid #33220e;
  color: #e8dccb;
}

.gpt-gate-cost img {
  width: 1.2em;
  height: 1.2em;
  object-fit: contain;
}

.gpt-gate-cost--ok {
  border-color: #2e7a1a;
  color: #a8e878;
}

.gpt-gate-open {
  margin-top: 0.5em;
  font-size: 0.9em;
  color: #6f634f;
  font-style: italic;
}

/* ── Kernzahlen ────────────────────────────────────────────────── */
.gpt-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: #33220e;
  border: 1px solid #33220e;
  border-radius: 4px;
  overflow: hidden;
}

.gpt-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.14em;
  padding: 0.55em 0.3em;
  background: #141410;
}

.gpt-tile-icon {
  width: 1.5em;
  height: 1.5em;
  color: #a08a5e;
}

.gpt-tile-v {
  font-size: 1.28em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
  white-space: nowrap;
}

.gpt-tile-k {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8a7c66;
  white-space: nowrap;
}

/* ── Zweispaltige Zeilenblöcke ─────────────────────────────────── */
.gpt-rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 1.1em;
  row-gap: 0.1em;
}

.gpt-row {
  display: grid;
  grid-template-columns: 1.3em minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45em;
  padding: 0.18em 0;
  min-width: 0;
}

/* Überschreibt die Attributgröße, damit das Glyph der Panel-Schriftgröße
   folgt — feste 15px wären auf 2K/4K neben dem größeren Text ein Fleck. */
.gpt-row-icon {
  width: 1.3em;
  height: 1.3em;
  color: #a08a5e;
  flex-shrink: 0;
}

.gpt-row-k {
  font-size: 0.98em;
  color: #93866f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gpt-row-v {
  font-size: 0.98em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .gpt-link--next {
    animation: none;
    opacity: 1;
  }
}
</style>
