<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="!windowFocused"
        class="pause-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        @click.self="unpause"
      >
        <!-- Drifting star dust -->
        <div class="pause-particles" aria-hidden="true">
          <span v-for="i in 14" :key="i" class="particle" :style="particleStyle(i)" />
        </div>

        <div ref="stageEl" class="pause-stage" @click.self="unpause">
          <div
            ref="panelEl"
            class="pause-panel"
            :style="{ transform: `scale(${panelScale})` }"
          >
          <!-- Shared cosmic starfield inside the panel — same backdrop component
               as the shop/skill-tree tabs. Sits above the flat panel fill
               (#111008) but below the content (z-index: -1). -->
          <CosmicStageBackground class="pause-cosmic-bg" />
          <RpgFrame />
          <!-- Header -->
          <header class="pause-header">
            <h1 class="pause-title">Paused</h1>
            <div class="pause-timer" role="timer" aria-label="Pause duration">
              <span class="pause-timer__value">
                <span
                  v-for="(ch, i) in timerChars"
                  :key="i"
                  :class="ch === ':' ? 'timer-sep' : 'timer-digit'"
                >{{ ch }}</span>
              </span>
            </div>
            <div class="pause-meta-row">
              <span class="meta-chip">
                <span class="meta-chip__label">Level</span>
                <span class="meta-chip__value">{{ gameStore.level }}</span>
              </span>
              <span class="meta-chip">
                <span class="meta-chip__label">Universe</span>
                <span class="meta-chip__value">{{ gameStore.currentUniverse }}</span>
              </span>
              <span class="meta-chip">
                <span class="meta-chip__label">Galaxy</span>
                <span class="meta-chip__value">{{ galaxyStore.currentGalaxy }}</span>
              </span>
            </div>
          </header>

          <!-- Hero: the live sun in its current phase (no planets, no champions).
               Die Spieler-HP liegen als Ring auf dem Scheibenrand und als
               Plakette darüber — beides absolut im Hero, damit die Anzeige
               keinen Platz im Fluss belegt und nichts darunter verschiebt. -->
          <div class="sun-hero">
            <div class="sun-hero__disc" aria-hidden="true">
              <CometDisc v-if="solarStore.isCometState" :diameter="sunDiameter" />
              <PhaseSunDisc v-else :diameter="sunDiameter" />
            </div>

            <svg class="sun-hp-ring" viewBox="0 0 100 100" aria-hidden="true">
              <circle class="sun-hp-ring__track" cx="50" cy="50" :r="HP_RING_R" />
              <circle
                class="sun-hp-ring__fill"
                :class="hpColor"
                cx="50"
                cy="50"
                :r="HP_RING_R"
                :stroke-dasharray="`${(hpPercent / 100) * HP_RING_CIRC} ${HP_RING_CIRC}`"
              />
            </svg>

            <div
              class="sun-hp-badge"
              :class="[hpColor, { 'sun-hp-badge--crit': hpPercent <= HP_CRIT_PERCENT }]"
              role="img"
              :aria-label="`Health ${Math.round(playerStore.currentHP)} of ${playerStore.maxHP}`"
            >
              <Icon
                icon="game-icons:hearts"
                width="19"
                height="19"
                class="sun-hp-badge__icon"
                aria-hidden="true"
              />
              <span class="sun-hp-badge__value">
                {{ Math.round(playerStore.currentHP)
                }}<span class="sun-hp-badge__max">/{{ playerStore.maxHP }}</span>
              </span>
            </div>
          </div>
          <span class="sun-phase-label" :style="{ color: sunPhaseLabelColor }">
            {{ sunPhase.name }}
          </span>

          <div class="chime-readout">
            <img src="/img/BardAbilities/BardChime.png" alt="" class="chime-img" />
            <span v-ink-center.y class="chime-value">+{{ formatNumber(accumulatedChimes) }}</span>
          </div>

          <!-- Stat tiles — Health sitzt am Sonnenhero, hier bleiben die beiden
               Kacheln, die eine Aufschlüsselung tragen. -->
          <div class="stat-grid">
            <!-- Kills aufgeschlüsselt: die Gesamtzahl steht im Label, darunter
                 steht, was tatsächlich gefallen ist. Zeilen ohne Treffer
                 bleiben stehen und dimmen nur ab — sonst spränge das Layout,
                 sobald während der Pause die erste Kategorie dazukommt. -->
            <div class="stat-tile stat-tile--kills">
              <span class="stat-tile__label">
                <Icon icon="game-icons:crossed-swords" width="17" height="17" class="stat-tile__icon" aria-hidden="true" />
                Kills
                <span v-if="pauseKills > 0" class="stat-tile__total">{{ formatNumber(pauseKills) }}</span>
              </span>
              <!-- Drei Zellen je Zeile direkt im Raster, damit die Zahlen
                   spaltenweise fluchten statt hinter unterschiedlich langen
                   Wörtern zu hängen. -->
              <div class="kill-list">
                <template v-for="row in killBreakdown" :key="row.key">
                  <Icon
                    :icon="row.icon"
                    width="14"
                    height="14"
                    class="kill-cell kill-cell__icon"
                    :class="{ 'kill-cell--zero': row.count === 0 }"
                    :style="{ color: row.color }"
                    aria-hidden="true"
                  />
                  <span
                    class="kill-cell kill-cell__label"
                    :class="{ 'kill-cell--zero': row.count === 0 }"
                    :title="row.title"
                    >{{ row.label }}</span
                  >
                  <span
                    class="kill-cell kill-cell__count"
                    :class="{ 'kill-cell--zero': row.count === 0 }"
                    >{{ formatNumber(row.count) }}</span
                  >
                </template>
              </div>
            </div>

            <!-- Materialien bekommen die breitere der beiden Spalten: fünf
                 Karten je Reihe, zwei Reihen — damit passen alle zehn
                 Materialien hinein. Die Karten sind so groß, dass das Material
                 am Bild erkennbar ist; vorher waren es 14px-Icons, durch den
                 Fit-Scale des Overlays effektiv 10px. -->
            <div class="stat-tile stat-tile--materials">
              <span class="stat-tile__label">
                <Icon icon="game-icons:ore" width="17" height="17" class="stat-tile__icon" aria-hidden="true" />
                Materials
                <span v-if="totalMaterials > 0" class="stat-tile__total">{{ formatNumber(totalMaterials) }}</span>
              </span>
              <span v-if="visibleMaterials.length === 0" class="mat-empty">Nothing yet</span>
              <TransitionGroup
                v-else
                tag="div"
                name="mat-pop"
                class="mat-grid"
                :style="{ '--mat-cols': PAUSE_MATERIAL_COLUMNS, '--mat-rows': PAUSE_MATERIAL_ROWS }"
              >
                <div
                  v-for="mat in visibleMaterials"
                  :key="mat.id"
                  class="mat-card"
                  :style="{ '--mat-color': mat.color }"
                  :title="`${mat.name} — ${mat.rarity}`"
                >
                  <span class="mat-card__aura" aria-hidden="true" />
                  <img v-if="mat.image" :src="mat.image" :alt="mat.name" class="mat-card__img" />
                  <!-- Vier der zehn Materialien haben in den Stammdaten kein
                       Bild; sie bekommen dasselbe Monogramm wie im Loot-Band
                       des Star-Fight-Modals, statt leer zu bleiben. -->
                  <span v-else class="mat-card__mono">{{ mat.monogram }}</span>
                  <span class="mat-card__amount">×{{ formatNumber(mat.amount) }}</span>
                </div>
                <div v-if="hiddenMaterialCount > 0" key="more" class="mat-card mat-card--more">
                  +{{ hiddenMaterialCount }}
                </div>
              </TransitionGroup>
            </div>
          </div>

          <!-- Auto-battle record during the pause — feste Höhe, Werte poppen ein -->
          <div class="battle-strip">
            <span class="battle-strip__label">
              <Icon icon="game-icons:battle-gear" width="14" height="14" class="battle-strip__icon" aria-hidden="true" />
              Auto Battle
            </span>
            <template v-if="pauseBattleTotal > 0">
              <span class="battle-strip__record">
                <span class="battle-strip__wins">{{ pauseBattleWins }}W</span>
                <span class="battle-strip__sep">·</span>
                <span class="battle-strip__losses">{{ pauseBattleLosses }}L</span>
              </span>
              <span
                class="battle-strip__lp"
                :class="pauseBattleLp > 0 ? 'lp--pos' : pauseBattleLp < 0 ? 'lp--neg' : 'lp--zero'"
              >{{ pauseBattleLp > 0 ? '+' : '' }}{{ pauseBattleLp }} LP</span>
              <span v-if="pauseBattleChimes > 0" class="battle-strip__chimes">
                <img
                  src="/img/BardAbilities/BardChime-128.png"
                  alt=""
                  class="battle-strip__chime-img"
                />
                +{{ formatNumber(pauseBattleChimes) }}
              </span>
            </template>
            <span v-else class="battle-strip__idle">No battles finished yet</span>
          </div>

          <!-- Awaiting on return — immer gerendert mit fester Zeilenhöhe, damit
               aufpoppende Badges die Panel-Höhe (und den Fit-Scale) nie ändern -->
          <div class="callout-section">
            <span class="callout-heading">Awaiting your return</span>
            <TransitionGroup
              v-if="callouts.length > 0"
              tag="div"
              name="callout-pop"
              class="callout-row"
            >
              <div v-for="c in callouts" :key="c.key" class="callout" :class="c.cls">
                <!-- Icon steht frei: der Kreis drumherum war eine zweite
                     Fassung innerhalb einer Pille, die selbst schon eine ist. -->
                <Icon :icon="c.icon" width="17" height="17" class="callout__icon" aria-hidden="true" />

                <!-- Stern: Planeten als Punktreihe, Restzeit rechts. Die Punkte
                     bleiben stehen und leeren sich nur — dadurch ändert der
                     Callout seine Breite über die gesamte Lebensdauer des
                     Sterns nicht, weder beim Herunterzählen noch beim
                     Befreien eines Planeten. -->
                <template v-if="c.kind === 'star'">
                  <span
                    class="callout__pips"
                    :aria-label="`${c.remaining} of ${c.total} planets left`"
                  >
                    <span
                      v-for="i in c.total"
                      :key="i"
                      class="pip"
                      :class="{ 'pip--cleared': i > c.remaining! }"
                    />
                  </span>
                  <span class="callout__secs">{{ c.secs }}s</span>
                  <!-- Restlaufzeit als abbrennende Linie am Fuß — inline
                       gesetzter Transform statt CSS-Variable am Container. -->
                  <span
                    class="callout__fuse"
                    :style="{ transform: `scaleX(${c.progress})` }"
                    aria-hidden="true"
                  />
                </template>

                <span v-else class="callout__text">
                  {{ c.text }}
                  <span v-if="c.count > 0" class="callout__count">×{{ c.count }}</span>
                </span>
              </div>
            </TransitionGroup>
            <div v-else class="callout-row">
              <span class="callout-empty">All quiet so far — the cosmos drifts on</span>
            </div>
          </div>

          <!-- Continue -->
          <button class="continue-btn" @click="unpause">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="6 3 21 12 6 21 6 3" />
            </svg>
            Resume journey
          </button>
          <span class="pause-hint">or click anywhere to continue</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useWindowFocus } from '@/composables/useWindowFocus'
import { useFitScale } from '@/composables/useFitScale'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { usePlanetShopStore } from '@/stores/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { formatNumber } from '@/config/numberFormat'
import { MATERIALS, materialIconMd } from '@/config/materials'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  PAUSE_SUN_MIN_DIAMETER,
  PAUSE_SUN_MAX_DIAMETER,
  PAUSE_SUN_VH_FACTOR,
  PAUSE_PANEL_MAX_SCALE,
  PAUSE_MATERIAL_COLUMNS,
  PAUSE_MATERIAL_ROWS,
  PAUSE_HP_RING_RADIUS,
  PAUSE_HP_HEALTHY_PERCENT,
  PAUSE_HP_CRIT_PERCENT,
  MATERIAL_RARITY_COLOR,
  MATERIAL_RARITY_ORDER,
  LOOT_MONOGRAM_MAX_CHARS,
} from '@/config/constants'
import PhaseSunDisc from '@/components/idle/sun/PhaseSunDisc.vue'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'

const { windowFocused } = useWindowFocus()

const stageEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const { scale: panelScale } = useFitScale(stageEl, panelEl, {
  maxScale: PAUSE_PANEL_MAX_SCALE,
  padding: 0,
})
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()
const planetShopStore = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()
const starGroupStore = useStarGroupStore()

function computeSunDiameter(): number {
  return Math.round(
    Math.min(
      PAUSE_SUN_MAX_DIAMETER,
      Math.max(PAUSE_SUN_MIN_DIAMETER, window.innerHeight * PAUSE_SUN_VH_FACTOR),
    ),
  )
}

const sunDiameter = ref(computeSunDiameter())
function onResize() {
  sunDiameter.value = computeSunDiameter()
}

onMounted(() => window.addEventListener('resize', onResize))

const sunPhase = computed(() =>
  solarStore.isCometState
    ? COMET_PHASE_DATA
    : (STAR_PHASE_DATA[planetShopStore.currentSunStage] ?? STAR_PHASE_DATA[0]),
)
const sunPhaseLabelColor = computed(() => {
  const p = sunPhase.value
  return 'phasePrimary' in p ? p.phasePrimary : p.accent
})

const hpPercent = computed(() => playerStore.hpPercent)

const hpColor = computed(() => {
  if (hpPercent.value > PAUSE_HP_HEALTHY_PERCENT) return 'hp--green'
  if (hpPercent.value > PAUSE_HP_CRIT_PERCENT) return 'hp--yellow'
  return 'hp--red'
})

// HP-Ring um die Sonnenscheibe. Der Radius ist in viewBox-Einheiten (0–100)
// angegeben; der Umfang daraus speist stroke-dasharray.
const HP_RING_R = PAUSE_HP_RING_RADIUS
const HP_RING_CIRC = 2 * Math.PI * PAUSE_HP_RING_RADIUS
const HP_CRIT_PERCENT = PAUSE_HP_CRIT_PERCENT

const pauseStartChimes = ref(0)
const pauseTick = ref(0)
let pauseInterval: ReturnType<typeof setInterval> | null = null

watch(
  windowFocused,
  (focused) => {
    if (!focused) {
      gameStore.setPauseState(true)
      pauseStartChimes.value = gameStore.chimes
      pauseTick.value = 0
      pauseInterval = setInterval(() => {
        pauseTick.value++
      }, 1000)
    } else {
      gameStore.setPauseState(false)
      if (pauseInterval !== null) {
        clearInterval(pauseInterval)
        pauseInterval = null
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pauseInterval !== null) clearInterval(pauseInterval)
  window.removeEventListener('resize', onResize)
})

const accumulatedChimes = computed(() => {
  void pauseTick.value
  return Math.max(0, gameStore.chimes - pauseStartChimes.value)
})

// Während der Pause laufen Resource-Stars weiter: sie werden per Passivschaden
// bekämpft und despawnen bei Timer-Ende. Hier live pro Stern: Restsekunden bis
// zum Verschwinden + Planeten (übrig/gesamt). pauseTick treibt die 1s-Reaktivität.
interface PauseResourceStar {
  id: string
  secs: number
  remainingPlanets: number
  total: number
  /** Restanteil der Despawn-Zeit (1 = frisch gespawnt) für die Fuse-Linie. */
  progress: number
}

const activeResourceStars = computed<PauseResourceStar[]>(() => {
  void pauseTick.value
  const now = Date.now()
  return starGroupStore.activeStars
    .filter((s) => s.starType === 'resource')
    .map((s) => {
      const total = s.planetSlots.length
      const remainingPlanets = s.planetSlots.filter((p) => !p.cleared).length
      const durationMs = s.durationMs ?? 0
      const remainingMs =
        s.spawnedAt !== undefined && durationMs > 0
          ? Math.max(0, s.spawnedAt + durationMs - now)
          : 0
      return {
        id: s.id,
        secs: Math.ceil(remainingMs / 1000),
        remainingPlanets,
        total,
        progress: durationMs > 0 ? Math.min(1, remainingMs / durationMs) : 0,
      }
    })
    .filter((s) => s.remainingPlanets > 0 && s.secs > 0)
    .sort((a, b) => a.secs - b.secs)
})

const timerChars = computed(() => {
  const total = pauseTick.value
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return `${h > 0 ? h + ':' : ''}${mm}:${ss}`.split('')
})

const pauseKills = computed(() => gameStore.pauseStats.kills)

// Aufschlüsselung der Kills. Die drei Zeilen stehen immer — Kategorien ohne
// Treffer dimmen ab, statt zu verschwinden: die Kachelhöhe ist fest, und ein
// Layoutsprung mitten in der Pause zöge den Fit-Scale des Overlays mit.
const killBreakdown = computed(() => {
  const s = gameStore.pauseStats
  return [
    {
      key: 'planets',
      icon: 'game-icons:exploding-planet',
      label: 'Planets',
      count: s.planetsCleared,
      color: '#e0a850',
      title: 'Planets cleared during the pause',
    },
    {
      key: 'stars',
      icon: 'game-icons:allied-star',
      label: 'Stars',
      count: s.starsRescued,
      color: '#7fd8d0',
      title: 'Stars fully freed — every planet cleared',
    },
    {
      key: 'bosses',
      icon: 'game-icons:alien-skull',
      label: 'Bosses',
      count: s.galaxyBossesFelled,
      color: '#cc6050',
      title: 'Galaxy bosses felled',
    },
  ]
})
const pauseBattleWins = computed(() => gameStore.pauseStats.battleWins)
const pauseBattleLosses = computed(() => gameStore.pauseStats.battleLosses)
const pauseBattleChimes = computed(() => gameStore.pauseStats.battleChimes)
const pauseBattleLp = computed(() => gameStore.pauseStats.battleLp)
const pauseBattleTotal = computed(() => pauseBattleWins.value + pauseBattleLosses.value)
// Ernte der laufenden Pause. Sortiert nach Seltenheit und dann nach Menge —
// das Wertvollste steht vorn, statt in der Reihenfolge, in der es zufällig
// gefallen ist. Icons kommen in der 256er-Stufe: die Karten zeigen sie mit
// 40–48 px, die 128er-Quelle wäre dort bereits hochskaliert.
const pauseMaterialEntries = computed(() => {
  const entries = Object.entries(gameStore.pauseStats.materialsEarned).map(([id, amount]) => {
    const mat = MATERIALS.find((m) => m.id === id)
    const rarity = mat?.rarity ?? 'common'
    const name = mat?.name ?? id
    return {
      id,
      amount,
      name,
      rarity,
      color: MATERIAL_RARITY_COLOR[rarity] ?? MATERIAL_RARITY_COLOR.common,
      image: mat?.image ? materialIconMd(mat.image) : null,
      monogram: name
        .split(/\s+/)
        .map((word) => word[0] ?? '')
        .join('')
        .slice(0, LOOT_MONOGRAM_MAX_CHARS)
        .toUpperCase(),
    }
  })
  return entries.sort((a, b) => {
    const ra = MATERIAL_RARITY_ORDER.indexOf(a.rarity)
    const rb = MATERIAL_RARITY_ORDER.indexOf(b.rarity)
    if (ra !== rb) return ra - rb
    if (a.amount !== b.amount) return b.amount - a.amount
    return a.name.localeCompare(b.name)
  })
})

const totalMaterials = computed(() =>
  pauseMaterialEntries.value.reduce((sum, m) => sum + m.amount, 0),
)

// Die Kachel fasst PAUSE_MATERIAL_COLUMNS × PAUSE_MATERIAL_ROWS Karten. Passt
// nicht alles hinein, gibt die letzte Zelle den Rest als „+N" aus — sonst
// müsste das Raster wachsen und die Panelhöhe mitten in der Pause springen.
const MATERIAL_SLOTS = PAUSE_MATERIAL_COLUMNS * PAUSE_MATERIAL_ROWS

const visibleMaterials = computed(() => {
  const all = pauseMaterialEntries.value
  return all.length <= MATERIAL_SLOTS ? all : all.slice(0, MATERIAL_SLOTS - 1)
})

const hiddenMaterialCount = computed(
  () => pauseMaterialEntries.value.length - visibleMaterials.value.length,
)

const isPlanetDiscovered = computed(
  () => galaxyStore.championTravelState === 'champion_available',
)

interface PauseCallout {
  key: string
  /** `star` rendert Punktreihe + Timer, `text` eine Beschriftung mit Zähler. */
  kind: 'text' | 'star'
  icon: string
  cls: string
  text?: string
  count?: number
  secs?: number
  remaining?: number
  total?: number
  progress?: number
}

const callouts = computed<PauseCallout[]>(() => {
  const list: PauseCallout[] = []
  if (isPlanetDiscovered.value) {
    list.push({
      key: 'champion',
      kind: 'text',
      icon: 'game-icons:barbute',
      text: 'Champion found',
      count: 0,
      cls: 'callout--champion',
    })
  }
  if (gameStore.pendingAugmentSelections.length > 0) {
    list.push({
      key: 'level',
      kind: 'text',
      icon: 'game-icons:upgrade',
      text: 'Level-Up',
      count: gameStore.pendingAugmentSelections.length,
      cls: 'callout--level',
    })
  }
  for (const s of activeResourceStars.value) {
    list.push({
      key: `star-${s.id}`,
      kind: 'star',
      icon: 'game-icons:star-formation',
      cls: 'callout--star',
      secs: s.secs,
      remaining: s.remainingPlanets,
      total: s.total,
      progress: s.progress,
    })
  }
  return list
})

function unpause() {
  window.focus()
}

function particleStyle(i: number): Record<string, string> {
  const left = (i * 137.5) % 100
  const top = (i * 61.8 + 13) % 100
  const size = 1.5 + (i % 4)
  const delay = ((i * 0.45) % 4).toFixed(1)
  const duration = (4 + (i % 6)).toFixed(1)
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  }
}
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────────────── */
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 110%, rgba(255, 200, 80, 0.08) 0%, transparent 55%),
    rgba(8, 4, 0, 0.85);
  backdrop-filter: blur(10px) saturate(0.85);
  -webkit-backdrop-filter: blur(10px) saturate(0.85);
  overflow: hidden;
}

/* Verfügbare Bühne: alles oberhalb der Bottom-Bar. useFitScale passt das Panel
   uniform hier ein — schrumpft auf Full HD, wächst (bis max scale) auf 2K/4K.
   Der Bottom-Abstand reserviert zusätzlich die volle Höhe des MVP-Honor-Buff-
   Badges (MvpBuffOverlay: sitzt 16px über dem Scoreboard-Streifen, ~64px hoch,
   z-index über dem Overlay) — dauerhaft, damit das Panel beim Erscheinen des
   Buffs nicht springt. Oben spiegelt derselbe Abstand den Buff-Puffer, damit
   das Panel harmonisch mit gleichem Luftraum über und unter sich sitzt. */
.pause-stage {
  position: absolute;
  top: clamp(88px, 10vh, 112px);
  left: 12px;
  right: 12px;
  bottom: calc(var(--bottom-center-strip-h, 79px) + clamp(88px, 10vh, 112px));
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Particles ────────────────────────────────────────── */
.pause-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(240, 224, 180, 0.8) 0%, transparent 70%);
  animation: particle-drift 6s ease-in-out infinite alternate;
  opacity: 0.3;
}
@keyframes particle-drift {
  from {
    transform: translateY(0);
    opacity: 0.12;
  }
  to {
    transform: translateY(-22px);
    opacity: 0.4;
  }
}

/* ── Panel ────────────────────────────────────────────── */
/* Same frame as the BardProfileMenu modal (.rp-modal): flat dark body, the
   bottom-bar notch curvature and the gold accent line along the top edge.
   Feste Design-Breite (PAUSE_PANEL_DESIGN_WIDTH) — Größenanpassung übernimmt
   ausschließlich useFitScale per transform: scale(). */
.pause-panel {
  position: relative;
  z-index: 1;
  overflow: hidden;
  width: 560px;
  flex-shrink: 0;
  transform-origin: center center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(14px, 2.4vh, 24px);
  padding: clamp(22px, 4vh, 40px) clamp(20px, 4vw, 44px) clamp(18px, 3vh, 30px);
  background: #111008;
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1));
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
}
.pause-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  box-shadow: 0 0 8px rgba(200, 150, 30, 0.5);
  pointer-events: none;
}

/* Cosmic starfield sits between the flat panel fill (#111008) and the panel
   content: z-index -1 keeps it above the panel background but below every
   in-flow child (header, sun hero, stats …). The panel's overflow:hidden clips
   the starfield's overscan; RpgFrame (z-index 30) still draws over the top. */
.pause-panel .pause-cosmic-bg {
  z-index: -1;
}

/* ── Header ───────────────────────────────────────────── */
.pause-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.pause-title {
  margin: 0;
  font-family: 'MedievalSharp', cursive;
  font-size: clamp(2.8rem, 5.2vw, 4.2rem);
  font-weight: 400;
  line-height: 1;
  color: #f4e2a0;
  letter-spacing: 0.1em;
  text-shadow:
    0 0 30px rgba(240, 208, 96, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.8);
}
.pause-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: clamp(6px, 1vh, 10px);
}
.pause-timer__value {
  display: inline-flex;
  align-items: baseline;
  font-size: clamp(2rem, 3.6vw, 3rem);
  font-weight: 800;
  line-height: 1;
  color: #f0d060;
  text-shadow:
    0 0 22px rgba(240, 208, 96, 0.45),
    0 0 48px rgba(200, 144, 64, 0.22);
  animation: timer-breathe 5s ease-in-out infinite;
}
/* Every glyph sits in a fixed-width cell so nothing shifts as digits change. */
.timer-digit {
  display: inline-block;
  width: 0.74em;
  text-align: center;
}
.timer-sep {
  display: inline-block;
  width: 0.44em;
  text-align: center;
  transform: translateY(-0.04em);
}
@keyframes timer-breathe {
  0%,
  100% {
    text-shadow:
      0 0 22px rgba(240, 208, 96, 0.45),
      0 0 48px rgba(200, 144, 64, 0.22);
  }
  50% {
    text-shadow:
      0 0 30px rgba(240, 208, 96, 0.7),
      0 0 64px rgba(200, 144, 64, 0.35);
  }
}
.pause-meta-row {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(16px, 2.2vw, 28px);
  margin-top: clamp(8px, 1.2vh, 14px);
}
.meta-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}
.meta-chip__label {
  font-size: clamp(0.66rem, 0.9vw, 0.76rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.55);
}
.meta-chip__value {
  font-size: clamp(1rem, 1.5vw, 1.3rem);
  font-weight: 800;
  line-height: 1;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px rgba(236, 224, 192, 0.25);
}

/* ── Sun hero ─────────────────────────────────────────── */
.sun-hero {
  position: relative;
  width: clamp(160px, 24vh, 300px);
  height: clamp(160px, 24vh, 300px);
  flex-shrink: 0;
  pointer-events: none;
}
.sun-hero__disc {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

/* ── HP am Sonnenhero ─────────────────────────────────────
   Die Sonne IST der Spieler — ihre Gesundheit gehört an sie und nicht in eine
   Kachel daneben. Ring und Plakette liegen absolut im Hero: sie belegen keinen
   Platz im Fluss, das Phasen-Label darunter rückt also nicht.

   Der Ring sitzt eine Spur außerhalb der Scheibe (negatives inset), damit er
   sich gegen deren Eigenglut absetzt statt darin unterzugehen. */
.sun-hp-ring {
  position: absolute;
  inset: -9px;
  width: calc(100% + 18px);
  height: calc(100% + 18px);
  /* Start oben statt rechts */
  transform: rotate(-90deg);
  overflow: visible;
  pointer-events: none;
}
.sun-hp-ring__track,
.sun-hp-ring__fill {
  fill: none;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.sun-hp-ring__track {
  stroke: rgba(0, 0, 0, 0.55);
  stroke-width: 3.4;
}
.sun-hp-ring__fill {
  transition: stroke-dasharray 600ms cubic-bezier(0.25, 1, 0.5, 1);
}
.sun-hp-ring__fill.hp--green {
  stroke: #5de84a;
  filter: drop-shadow(0 0 3px rgba(82, 184, 48, 0.9));
}
.sun-hp-ring__fill.hp--yellow {
  stroke: #f5d84a;
  filter: drop-shadow(0 0 3px rgba(212, 160, 32, 0.9));
}
.sun-hp-ring__fill.hp--red {
  stroke: #ff5f5f;
  filter: drop-shadow(0 0 3px rgba(204, 96, 80, 0.95));
}

/* Plakette auf dem unteren Scheibenrand — dunkler Grund, weil Text auf der
   leuchtenden Scheibe sonst nicht lesbar wäre. Sie sitzt hoch genug, dass das
   Phasen-Label darunter (negativer margin-top) frei bleibt. */
.sun-hp-badge {
  position: absolute;
  left: 50%;
  bottom: 4%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px;
  border-radius: 999px;
  background: rgba(6, 4, 0, 0.82);
  border: 1px solid var(--hp-accent, rgba(122, 78, 32, 0.7));
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
}
.sun-hp-badge.hp--green {
  --hp-accent: rgba(93, 232, 74, 0.62);
}
.sun-hp-badge.hp--yellow {
  --hp-accent: rgba(245, 216, 74, 0.62);
}
.sun-hp-badge.hp--red {
  --hp-accent: rgba(255, 95, 95, 0.7);
}
.sun-hp-badge__icon {
  color: #cc6050;
  flex-shrink: 0;
}
.sun-hp-badge__value {
  font-size: 1.3rem;
  font-weight: 800;
  line-height: 1;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
}
.sun-hp-badge__max {
  font-size: 0.7em;
  font-weight: 600;
  color: rgba(216, 200, 160, 0.5);
}
/* Kritisch: die Plakette pulst — bewegt wird nur die Opazität */
.sun-hp-badge--crit {
  animation: hp-badge-crit 1.1s ease-in-out infinite;
}
@keyframes hp-badge-crit {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
.sun-phase-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: calc(-1 * clamp(10px, 1.6vh, 18px));
  font-family: 'MedievalSharp', cursive;
  font-size: clamp(1.05rem, 1.6vw, 1.5rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-shadow: 0 0 18px currentColor;
}
/* ── Chime readout ────────────────────────────────────── */
.chime-readout {
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.6vw, 20px);
}
.chime-img {
  width: clamp(54px, 7.5vh, 84px);
  height: clamp(54px, 7.5vh, 84px);
  object-fit: contain;
  filter: drop-shadow(0 0 16px rgba(232, 192, 64, 0.65));
  animation: chime-glow 5s ease-in-out infinite;
}
@keyframes chime-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 12px rgba(232, 192, 64, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 22px rgba(232, 192, 64, 0.8));
  }
}
.chime-value {
  font-size: clamp(2.4rem, 4.2vw, 3.6rem);
  font-weight: 800;
  line-height: 1;
  /* Der Höhenausgleich gegen die Chime-Grafik daneben kommt gemessen von
     v-ink-center.y — die Schriftgröße hängt hier an vw, ein fester em-Wert
     träfe nur eine Fensterbreite (siehe utils/textInkOffset.ts). */
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 24px rgba(240, 208, 96, 0.5),
    0 0 50px rgba(200, 144, 64, 0.25);
}

/* ── Stat tiles ───────────────────────────────────────── */
/* Zwei Kacheln, beide mit Aufschlüsselung: Kills braucht Platz für drei
   Zeilen, Materials für zwei Reihen à fünf Karten — damit passen alle zehn
   Materialien hinein, ohne dass ein „+N" nötig wird. */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1.85fr;
  /* Feste Zeilenhöhe: alle drei Tiles exakt gleich groß, egal wie viel
     Inhalt (HP-Leiste, Material-Karten) eine einzelne Kachel hat. Bemessen
     am größten Inhalt — zwei Reihen Material-Karten. */
  /* Bemessen am höheren Inhalt: Kopfzeile (32) + Abstand (7) + zwei Reihen
     Material-Karten (109) + Innenabstand (28). */
  grid-auto-rows: 180px;
  /* Explizit, nicht dem geerbten `baseline` überlassen: die Material-Kachel
     hat ihre erste Baseline im Kartenraster statt in einer Wertzeile und
     rutschte dadurch gegenüber Health und Kills nach unten. */
  align-items: stretch;
  gap: clamp(8px, 1.2vw, 12px);
  width: 100%;
}
.stat-tile {
  display: grid;
  /* Überschrift oben am Kachelrand, Inhalt füllt den Rest darunter. Die zweite
     Zeile ist 1fr statt auto — würde der ganze Block zentriert, hinge der Kopf
     je nach Inhaltshöhe unterschiedlich tief, und die Köpfe der beiden Kacheln
     stünden nicht mehr auf einer Linie. */
  grid-template-rows: auto 1fr;
  justify-items: center;
  row-gap: 7px;
  text-align: center;
  padding: clamp(10px, 1.4vh, 14px) clamp(10px, 1.4vw, 14px);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: rgba(255, 200, 80, 0.05);
  border: 1px solid rgba(122, 78, 32, 0.55);
  border-radius: 12px;
  min-width: 0;
}
/* Überschrift der Kachel: deutlich größer als die Zeilen darunter und über die
   volle Breite gezogen, mit der Gesamtzahl am rechten Rand. Vorher war sie ein
   11px-Flüstern über dem eigentlichen Inhalt. Eine Haarlinie darunter trennt
   Kopf und Inhalt, ohne einen zweiten Kasten aufzumachen. */
.stat-tile__label {
  display: flex;
  align-items: center;
  gap: 7px;
  justify-self: stretch;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(122, 78, 32, 0.45);
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(232, 216, 176, 0.82);
  white-space: nowrap;
}
.stat-tile__icon {
  color: #c89040;
  flex-shrink: 0;
}
/* Die Kachel füllt sich mit Karten statt mit einer Zahl — der reservierte
   Bar-Slot der anderen beiden entfällt hier, sonst stünde das Raster
   außermittig. */

/* ── Kill-Aufschlüsselung ─────────────────────────────────
   Drei feste Zeilen, linksbündig ausgerichtet: Icon, Kategorie, Zahl. Die
   Zahlen stehen in einer eigenen, rechtsbündigen Spalte, damit sie
   untereinander fluchten statt hinter unterschiedlich langen Wörtern zu
   hängen. */
.kill-list {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  /* Füllt den Bereich unter der Überschrift und verteilt die drei Zeilen
     gleichmäßig darin, statt sie oben zusammenzudrängen. */
  align-content: space-evenly;
  justify-self: stretch;
  height: 100%;
  column-gap: 6px;
  row-gap: 6px;
}
/* Die Kategoriefarbe kommt inline aus killBreakdown — Planeten bernstein,
   Sterne im Türkis der Stern-Callouts, Galaxiebosse im Warnrot der
   Bosskämpfe. */
.kill-cell__icon {
  filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.6));
}
.kill-cell__label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.6);
  white-space: nowrap;
}
.kill-cell__count {
  font-size: 0.94rem;
  font-weight: 800;
  line-height: 1;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
}
/* Noch nichts gefallen: die Zeile bleibt stehen, tritt aber zurück — sie ist
   dann eine Ankündigung, keine Meldung. */
.kill-cell--zero {
  opacity: 0.32;
}
/* Gesamtzahl am rechten Rand der Überschrift — die Aufschlüsselung steht
   darunter, hier zählt nur die Summe. */
.stat-tile__total {
  margin-left: auto;
  font-size: 1.15em;
  font-weight: 800;
  letter-spacing: 0;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px rgba(240, 208, 96, 0.35);
}

/* ── Materialien in der Stat-Kachel ───────────────────────
   Die Karten tragen ihre Seltenheitsfarbe (--mat-color, aus
   MATERIAL_RARITY_COLOR) — Rahmen, Aura hinter dem Icon und Mengenzahl teilen
   sie sich, sodass Wert und Menge in einem Blick zusammenfallen.

   Feste Maße statt vh-Clamps: das Panel hat eine feste Design-Breite, die
   Größenanpassung an den Viewport macht ausschließlich useFitScale. Ein
   zweiter, davon unabhängiger vh-Bezug würde nur gegen den Fit-Scale rechnen. */
/* Beide Reihen stehen als explizite Grid-Zeilen fest — auch wenn erst zwei
   Materialien gefallen sind. Klappte die zweite Reihe erst beim fünften Fund
   auf, wüchse mitten in der Pause die Panelhöhe und mit ihr sprünge der
   Fit-Scale des gesamten Overlays. */
.mat-grid {
  --mat-row-h: 52px;
  --mat-gap: 5px;
  display: grid;
  grid-template-columns: repeat(var(--mat-cols, 4), 1fr);
  grid-template-rows: repeat(var(--mat-rows, 2), var(--mat-row-h));
  justify-self: stretch;
  /* Feste Rasterhöhe, deshalb im Restbereich zentriert statt gestreckt —
     sonst zöge 1fr die Zeilen auseinander. */
  align-self: center;
  gap: var(--mat-gap);
  width: 100%;
}
.mat-empty {
  font-size: 0.8rem;
  font-style: italic;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.3);
}

/* Icon füllt die Karte, die Menge liegt als Badge auf der unteren Kante — in
   einer 52px-Zelle wäre für Bild UND Zeile untereinander kein Platz, ohne
   beides zu verkleinern. */
.mat-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--mat-color) 42%, transparent);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--mat-color) 13%, transparent),
    rgba(255, 200, 80, 0.03) 65%
  );
}
/* Überzähliges: gleiche Fassung, aber neutral — es ist kein Material */
.mat-card--more {
  border-color: rgba(122, 78, 32, 0.5);
  background: rgba(255, 200, 80, 0.05);
  font-size: 0.85rem;
  font-weight: 800;
  color: rgba(216, 200, 160, 0.55);
  font-variant-numeric: tabular-nums;
}
/* Aura hinter dem Icon — gibt der Karte Tiefe, ohne das Bild einzufärben */
.mat-card__aura {
  position: absolute;
  top: 46%;
  left: 50%;
  width: 108%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--mat-color) 26%, transparent) 0%,
    transparent 62%
  );
  pointer-events: none;
}
/* Das Icon füllt die Karte — die Menge sitzt als Badge in der Ecke darüber,
   wie in einem Inventarslot. Untereinander gestellt müssten beide schrumpfen,
   damit sie in die 52px-Zelle passen. */
.mat-card__img {
  position: relative;
  width: 40px;
  height: 40px;
  object-fit: contain;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.6));
}
/* Bildloses Material: Initialen im Stil des Icons, gleiche Kartengeometrie */
.mat-card__mono {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--mat-color) 35%, transparent);
  background: rgba(0, 0, 0, 0.35);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--mat-color);
}
.mat-card__amount {
  position: absolute;
  right: 2px;
  bottom: 1px;
  padding: 1px 3px;
  border-radius: 3px;
  background: rgba(6, 4, 0, 0.78);
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  color: var(--mat-color);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95);
}

/* Neue Materialkarte federt ins Raster ein — derselbe Pop wie bei den
   Callout-Badges, damit ein Fund während der Pause auffällt. */
.mat-pop-enter-active {
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}
.mat-pop-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.mat-pop-leave-active {
  position: absolute;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.mat-pop-leave-to {
  opacity: 0;
  transform: scale(0.7);
}
.mat-pop-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Auto-battle strip ────────────────────────────────── */
.battle-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(10px, 1.4vw, 16px);
  width: 100%;
  height: 40px;
  padding: 0 clamp(12px, 1.6vw, 16px);
  background: rgba(255, 200, 80, 0.05);
  border: 1px solid rgba(122, 78, 32, 0.55);
  border-radius: 12px;
}
.battle-strip__idle {
  font-size: clamp(0.68rem, 0.95vw, 0.78rem);
  font-style: italic;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.32);
}
/* Gleiche Kopfzeilen-Sprache wie die Kacheln darüber — sonst läse sich die
   Leiste als Fußnote statt als gleichrangiger Block. */
.battle-strip__label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(232, 216, 176, 0.82);
  white-space: nowrap;
}
.battle-strip__icon {
  color: #c89040;
  flex-shrink: 0;
}
.battle-strip__record {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  font-size: clamp(0.95rem, 1.4vw, 1.2rem);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.battle-strip__wins {
  color: #74d448;
  text-shadow: 0 0 10px rgba(116, 212, 72, 0.35);
}
.battle-strip__losses {
  color: #cc6050;
  text-shadow: 0 0 10px rgba(204, 96, 80, 0.3);
}
.battle-strip__sep {
  color: rgba(216, 200, 160, 0.35);
  font-weight: 700;
}
.battle-strip__lp {
  font-size: clamp(0.85rem, 1.25vw, 1.1rem);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lp--pos {
  color: #74d448;
  text-shadow: 0 0 10px rgba(116, 212, 72, 0.35);
}
.lp--neg {
  color: #cc6050;
  text-shadow: 0 0 10px rgba(204, 96, 80, 0.3);
}
.lp--zero {
  color: rgba(216, 200, 160, 0.5);
}
.battle-strip__chimes {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(0.85rem, 1.25vw, 1.1rem);
  font-weight: 800;
  line-height: 1;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px rgba(240, 208, 96, 0.4);
  white-space: nowrap;
}
.battle-strip__chime-img {
  width: clamp(16px, 2.2vh, 20px);
  height: clamp(16px, 2.2vh, 20px);
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.5));
}

/* ── Callouts ─────────────────────────────────────────── */
.callout-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.callout-heading {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.55);
}
/* Feste Höhe: reservierter Platz, egal ob 0 oder 5 Badges — das Panel bleibt
   stabil. Zwei Zeilen sind reserviert, weil der Vollausbau (3 Resource-Sterne
   nach RESOURCE_STAR_MAX_CONCURRENT plus Champion- und Level-Marke) nicht in
   eine Zeile passt. Vorher stand hier nowrap mit overflow: hidden — die Badges
   wurden dann gequetscht, bis die Sekundenzahl am Rand abriss. */
.callout-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: center;
  justify-content: center;
  gap: 8px;
  height: 72px;
  width: 100%;
  overflow: hidden;
}
.callout-empty {
  font-size: clamp(0.68rem, 0.95vw, 0.78rem);
  font-style: italic;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.32);
}
/* One shared callout style — modifiers only swap the accent color (--co-color). */
.callout {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  /* Nicht schrumpfen: lieber bricht die Zeile um, als dass die Restzeit am
     Rand abgeschnitten wird. */
  flex-shrink: 0;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: clamp(0.72rem, 1vw, 0.82rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  border: 1px solid color-mix(in srgb, var(--co-color) 45%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--co-color) 14%, transparent),
    color-mix(in srgb, var(--co-color) 5%, transparent)
  );
  color: color-mix(in srgb, var(--co-color) 55%, #f2ead0);
  overflow: hidden;
}
/* Der Puls sitzt auf einem Overlay und bewegt nur dessen Opazität. Vorher
   animierte der Callout selbst seinen box-shadow — das rastert die Box in
   jedem Frame neu, und zwar pro Badge. */
.callout::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 16px color-mix(in srgb, var(--co-color) 32%, transparent);
  opacity: 0;
  pointer-events: none;
  animation: callout-glow 2.6s ease-in-out infinite;
}
.callout--champion {
  --co-color: #f0d060;
}
.callout--level {
  --co-color: #74d448;
}
.callout--star {
  --co-color: #7fd8d0;
}
@keyframes callout-glow {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
.callout__icon {
  flex-shrink: 0;
  color: var(--co-color);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--co-color) 80%, transparent));
}

/* ── Stern-Callout ────────────────────────────────────────
   Ein Punkt je Planet: gefüllt = steht noch, hohl = befreit. Die Punkte
   verschwinden nie, sie leeren sich nur — die Breite des Badges steht damit
   ab dem Spawn fest, und der Fortschritt ist ohne Bruchzahl ablesbar. */
.callout__pips {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.pip {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--co-color);
  box-shadow: 0 0 6px color-mix(in srgb, var(--co-color) 60%, transparent);
}
.pip--cleared {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--co-color) 40%, transparent);
  box-shadow: none;
}
/* Feste Zellbreite für die längste vorkommende Angabe (RESOURCE_STAR_DURATION_MS
   = 45s, also drei Zeichen): der Wechsel auf zweistellig und später einstellig
   macht das Badge dadurch nicht schmaler. */
.callout__secs {
  min-width: 3.2ch;
  flex-shrink: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  color: var(--co-color);
  text-shadow: 0 0 8px color-mix(in srgb, var(--co-color) 45%, transparent);
}
/* Restlaufzeit als Linie am Fuß der Pille — brennt von rechts ab */
.callout__fuse {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 2px;
  height: 2px;
  border-radius: 1px;
  transform-origin: left center;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--co-color) 55%, transparent),
    var(--co-color)
  );
}
.callout__text {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.callout__count {
  font-size: 1.05em;
  font-weight: 800;
  color: var(--co-color);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px color-mix(in srgb, var(--co-color) 55%, transparent);
}

/* Badge-Pop: neue Callouts federn in die reservierte Zeile ein */
.callout-pop-enter-active {
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}
.callout-pop-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.callout-pop-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.callout-pop-leave-to {
  opacity: 0;
  transform: scale(0.7);
}
.callout-pop-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Continue button ──────────────────────────────────── */
.continue-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  padding: clamp(11px, 1.6vh, 15px) 0;
  background: linear-gradient(to bottom, rgba(240, 208, 96, 0.16), rgba(200, 144, 64, 0.1));
  border: 1px solid rgba(240, 208, 96, 0.45);
  border-radius: 12px;
  color: #f4e2a0;
  font-size: clamp(0.82rem, 1.15vw, 0.95rem);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.1s ease;
}
.continue-btn:hover {
  background: linear-gradient(to bottom, rgba(240, 208, 96, 0.26), rgba(200, 144, 64, 0.16));
  border-color: rgba(240, 208, 96, 0.75);
  box-shadow: 0 0 24px rgba(240, 208, 96, 0.25);
  transform: translateY(-1px);
}
.continue-btn:active {
  transform: translateY(0);
  box-shadow: none;
}
.continue-btn:focus-visible {
  outline: 2px solid #f0d060;
  outline-offset: 3px;
}
.pause-hint {
  font-size: clamp(0.62rem, 0.85vw, 0.7rem);
  color: rgba(216, 200, 160, 0.35);
  letter-spacing: 0.08em;
  font-style: italic;
}

/* ── Transitions ──────────────────────────────────────── */
.pause-fade-enter-active {
  transition: opacity 0.3s ease;
}
/* Pop-in auf der Stage — das Panel selbst trägt den inline Fit-Scale-Transform */
.pause-fade-enter-active .pause-stage {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.pause-fade-leave-active {
  transition: opacity 0.18s ease;
}
.pause-fade-enter-from {
  opacity: 0;
}
.pause-fade-enter-from .pause-stage {
  transform: scale(0.94) translateY(14px);
}
.pause-fade-leave-to {
  opacity: 0;
}

/* ── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .particle,
  .chime-img,
  .callout::after,
  .sun-hp-badge--crit,
  .pause-timer__value {
    animation: none;
  }
  .sun-hp-ring__fill {
    transition: none;
  }
  .callout-pop-enter-active,
  .callout-pop-leave-active,
  .callout-pop-move,
  .mat-pop-enter-active,
  .mat-pop-leave-active,
  .mat-pop-move {
    transition: opacity 0.15s;
  }
  .continue-btn,
  .pause-fade-enter-active,
  .pause-fade-leave-active,
  .pause-fade-enter-active .pause-stage {
    transition: opacity 0.15s;
  }
}
</style>
