<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="isPaused"
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
            :style="{
              transform: `scale(${panelScale})`,
              width: `${PAUSE_PANEL_DESIGN_WIDTH}px`,
            }"
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
                <!-- Zweite, deckungsgleiche Lage derselben Ziffern: sie trägt
                     KEINE Farbe, nur den kräftigen Schein, und allein ihre
                     Opazität atmet. Der Takt lag vorher auf `text-shadow` der
                     Ziffern selbst — das rastert die Zeile in jedem Frame neu
                     (siehe „Performance" Regel 2 und 11). -->
                <span class="pause-timer__glow" aria-hidden="true">
                  <span
                    v-for="(ch, i) in timerChars"
                    :key="i"
                    :class="ch === ':' ? 'timer-sep' : 'timer-digit'"
                  >{{ ch }}</span>
                </span>
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
               Die Scheibe bleibt frei: Ring und Plakette lagen vorher genau auf
               der Fläche, an der die Phase erkennbar ist — Korona, Farbe,
               Oberfläche. Die HP stehen deshalb als eigene Leiste darunter.

               Links und rechts die Bilanz der laufenden Pause: was die Sonne
               verloren und was sie zurückgewonnen hat. Beides läuft pausiert
               weiter — Void-Einschläge und Boss-Enrage treffen sie, die
               Regeneration hält dagegen —, und bis hierher war davon nur zu
               sehen, dass die Vitalitätsleiste stiller schrumpfte.

               Die Zeile ist GENAU so hoch wie die Scheibe (`--sun-d`): ein
               Zuwachs hier änderte die Panelhöhe und zöge den Fit-Scale des
               ganzen Overlays mit. Die Ledger sind darin nur mittig gestellt. -->
          <div class="hero-row" :style="{ '--sun-d': `${sunDiameter}px` }">
            <SunLedger tone="regen" :total="pauseRegen" />
            <div
              class="sun-hero"
              :style="{ width: `${sunDiameter}px`, height: `${sunDiameter}px` }"
            >
              <div class="sun-hero__disc" aria-hidden="true">
                <CometDisc v-if="solarStore.isCometState" :diameter="sunDiameter" />
                <PhaseSunDisc v-else :diameter="sunDiameter" />
              </div>
            </div>
            <SunLedger tone="damage" :total="pauseDamage" :pops="damagePops" />
          </div>
          <span class="sun-phase-label" :style="{ color: sunPhaseLabelColor }">
            {{ sunPhase.name }}
          </span>

          <!-- Vitalität der Sonne — ohne Beschriftung und ohne Emblem: der
               Balken läuft über die volle Panelbreite, die Zahl steht
               unmittelbar an seiner Kante. Fünf Ebenen, alle
               compositor-freundlich (nur transform/opacity bewegen sich):
               Nachlaufspur, Füllung mit durchlaufendem Energiepuls, wandernde
               Kante mit Flare, statische Skala, Krit-Puls. -->
          <div
            class="vital-strip"
            :class="hpColor"
            role="img"
            :aria-label="`Health ${Math.round(playerStore.currentHP)} of ${playerStore.maxHP}`"
          >
            <div class="vital-bar" :class="{ 'vital-bar--crit': isCrit }">
              <!-- Pro-Wert gesetzte Transforms stehen inline am jeweiligen
                   Element, nicht als Variable am Balken — sonst rechnet der
                   ganze Subtree bei jeder HP-Änderung neu. -->
              <span
                class="vital-bar__ghost"
                :style="{ transform: `scaleX(${hpRatio})` }"
                aria-hidden="true"
              />
              <span
                class="vital-bar__fill"
                :style="{ transform: `scaleX(${hpRatio})` }"
                aria-hidden="true"
              >
                <!-- Der Puls läuft INNERHALB der Füllung: sie ist der einzige
                     Container, der ohne zweite Maske exakt am Füllstand endet.
                     Er wird mit scaleX der Füllung schmaler — bei wenig HP
                     bleibt ein hektisches Zucken statt einer breiten Welle. -->
                <span class="vital-bar__spark" />
              </span>
              <!-- Vollbreite Ebene, nach links geschoben: ihr rechter Rand ist
                   die Kante. Als border-right am Fill wüchse der Strich mit
                   1/scaleX auf, je leerer der Balken wird. -->
              <span
                class="vital-bar__edge"
                :style="{ transform: `translateX(${(hpRatio - 1) * 100}%)` }"
                aria-hidden="true"
              />
              <span class="vital-bar__ticks" aria-hidden="true" />
              <span class="vital-bar__pulse" aria-hidden="true" />
            </div>

            <!-- Schrägstrich und Maximum stehen fest: der aktuelle Wert sitzt
                 rechtsbündig in einer Spalte, deren Breite die Messmuster
                 vorgeben — nicht der Wert selbst. Alle Muster und der Wert
                 liegen in DERSELBEN Rasterzelle, die Spalte nimmt also die
                 breiteste Darstellung, die hier je auftreten kann. Damit
                 wandert nichts mehr, wenn HP eine Stelle gewinnt oder
                 verliert. -->
            <span class="vital-strip__value">
              <span class="vital-strip__cur">
                <span
                  v-for="(probe, i) in hpWidthProbes"
                  :key="i"
                  class="vital-strip__probe"
                  aria-hidden="true"
                  >{{ probe }}</span
                >
                <span class="vital-strip__now">{{
                  formatNumber(Math.round(playerStore.currentHP))
                }}</span> </span
              ><span class="vital-strip__max">/{{ formatNumber(playerStore.maxHP) }}</span>
            </span>
          </div>

          <div class="chime-readout">
            <!-- Der Heiligenschein liegt als eigene Ebene hinter der Münze und
                 blendet im Takt auf; die Münze selbst trägt ihren Schatten
                 statisch. Vorher atmete ein `drop-shadow`-Filter direkt am
                 Bild — jeder Frame eine Neurasterung (siehe „Performance"
                 Regel 2). -->
            <span class="chime-orb">
              <span class="chime-orb__halo" aria-hidden="true" />
              <img src="/img/BardAbilities/BardChime.png" alt="" class="chime-img" />
            </span>
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
                <Icon icon="game-icons:crossed-swords" width="20" height="20" class="stat-tile__icon" aria-hidden="true" />
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
                    width="18"
                    height="18"
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
                 Materialien hinein. Die Karten haben KEINE eigene Fassung mehr
                 (kein Rahmen, keine Füllung, keine Aura): der Platz, den sie
                 gekostet haben, gehört jetzt dem Bild — es füllt seine Zelle
                 vollständig aus. Übrig bleiben Bild und Menge. -->
            <div class="stat-tile stat-tile--materials">
              <span class="stat-tile__label">
                <Icon icon="game-icons:ore" width="20" height="20" class="stat-tile__icon" aria-hidden="true" />
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
                  <img v-if="mat.image" :src="mat.image" :alt="mat.name" class="mat-card__img" />
                  <!-- Vier der zehn Materialien haben in den Stammdaten kein
                       Bild; sie bekommen dasselbe Monogramm wie im Loot-Band
                       des Star-Fight-Modals, statt leer zu bleiben. -->
                  <span v-else class="mat-card__mono">{{ mat.monogram }}</span>
                  <span class="mat-card__amount"
                    ><span class="mat-card__x" aria-hidden="true">×</span
                    >{{ formatNumber(mat.amount) }}</span
                  >
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
              <Icon icon="ri:sword-fill" width="18" height="18" class="battle-strip__icon" aria-hidden="true" />
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
          <div
            class="callout-section"
            :style="{
              '--star-card-h': `${PAUSE_STAR_CARD_HEIGHT}px`,
              '--star-card-gap': `${PAUSE_STAR_CARD_GAP_PX}px`,
            }"
          >
            <!-- Kopfzeile mit fester Höhe: die Level-Up-Marke sitzt neben der
                 Überschrift statt zwischen den Flyby-Karten. Sie ist kein
                 laufender Vorgang, sondern etwas, das auf eine Entscheidung
                 wartet — und die Kartenreihe bleibt dadurch sortenrein. -->
            <div class="callout-head">
              <span class="callout-heading">Awaiting your return</span>
              <Transition name="callout-pop">
                <span v-if="pendingAugmentCount > 0" class="level-chip">
                  <Icon
                    icon="ph:arrow-fat-up-fill"
                    width="14"
                    height="14"
                    class="level-chip__icon"
                    aria-hidden="true"
                  />
                  Level-Up
                  <span class="level-chip__count">×{{ pendingAugmentCount }}</span>
                </span>
              </Transition>
            </div>
            <TransitionGroup
              v-if="activeResourceStars.length > 0 || championCallout || voidThreat"
              tag="div"
              name="callout-pop"
              class="callout-row"
            >
              <!-- Der Champion steht IMMER an erster Stelle, ganz oben links —
                   auch dann, wenn sonst nichts läuft. Er ist der Höhepunkt
                   einer Galaxierunde, und eine Karte, die je nach Lage um eine
                   Kartenbreite wandert, muss man erst suchen. Die eine Karte
                   deckt beide Zustände ab: gefunden-und-wartend sowie
                   Stern-läuft-samt-Uhr. -->
              <PauseChampionCard
                v-if="championCallout"
                key="champion"
                :callout="championCallout"
              />
              <!-- Der Void läuft während der Pause weiter — Kader und Turrets
                   feuern auch pausiert, also darf er auch pausiert verloren
                   gehen. Er steht deshalb VOR den Stern-Karten: von allem, was
                   hier abläuft, ist er das einzige, das der Sonne wehtut. -->
              <PauseVoidCard
                v-if="voidThreat"
                key="void-threat"
                :secs="voidThreat.secs"
                :ends-at="voidThreat.endsAt"
                :duration-ms="voidThreat.durationMs"
                :name="voidThreat.name"
                :color="voidThreat.color"
                :dweller="voidThreat.dweller"
                :count="voidThreat.count"
                :worn="voidThreat.worn"
              />

              <!-- Ein Flyby, eine Karte: Zifferblatt der Restzeit, echte
                   Planetenkunst der Slots mit ihren Boss-HP, Akzent in der
                   Spektralfarbe des Sterns. Höchstens
                   RESOURCE_STAR_MAX_CONCURRENT nebeneinander. -->
              <PauseStarCard
                v-for="s in activeResourceStars"
                :key="s.id"
                :secs="s.secs"
                :ends-at="s.endsAt"
                :duration-ms="s.durationMs"
                :color="s.color"
                :planets="s.planets"
              />
            </TransitionGroup>
            <div v-else class="callout-row callout-row--empty">
              <span class="callout-empty">All quiet so far — the cosmos drifts on</span>
            </div>
          </div>

          <!-- Continue -->
          <!-- Die Tasten stehen IM Knopf, nicht als Hinweiszeile darunter: sie
               gehören zu derselben Handlung, und die eigene Zeile kostete den
               Panelfuß eine ganze Reihe Höhe. Beschriftung bleibt optisch
               mittig (Dreispalter), die Tasten sitzen an der rechten Kante. -->
          <button
            class="continue-btn"
            :aria-label="`Resume journey — press ${pauseCap} or ${PAUSE_ESCAPE_CAP}`"
            @click="unpause"
          >
            <span class="continue-btn__main">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="6 3 21 12 6 21 6 3" />
              </svg>
              Resume journey
            </span>
            <span class="continue-btn__keys" aria-hidden="true">
              <KeyCap :cap="pauseCap" size="sm" tone="inherit" />
              <KeyCap :cap="PAUSE_ESCAPE_CAP" size="sm" tone="inherit" />
            </span>
          </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGamePause } from '@/composables/system/useGamePause'
import { onKeybinding } from '@/composables/system/useKeybindings'
import { useFitScale } from '@/composables/ui/useFitScale'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useUiStore } from '@/stores/core/uiStore'
import { getVoidRift } from '@/config/world/void'
import { formatNumber } from '@/config/ui/numberFormat'
import { MATERIALS, materialIconMd } from '@/config/economy/materials'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  PAUSE_SUN_MIN_DIAMETER,
  PAUSE_SUN_MAX_DIAMETER,
  PAUSE_SUN_VH_FACTOR,
  PAUSE_PANEL_DESIGN_WIDTH,
  PAUSE_PANEL_MAX_SCALE,
  PAUSE_MATERIAL_COLUMNS,
  PAUSE_MATERIAL_ROWS,
  HP_HEALTHY_PERCENT,
  HP_CRIT_PERCENT,
  PAUSE_HP_WIDTH_PROBES,
  PAUSE_LEDGER_MAX_POPS,
  DAMAGE_FLOAT_DURATION_MS,
  MATERIAL_RARITY_COLOR,
  MATERIAL_RARITY_ORDER,
  LOOT_MONOGRAM_MAX_CHARS,
  ROLE_BY_KEY,
  ROLE_ART_MD_SUFFIX,
  PAUSE_CHAMPION_FALLBACK_ICON,
  KEYBINDINGS,
  PAUSE_ESCAPE_CAP,
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_CARD_GAP_PX,
  PAUSE_STAR_HP_STEPS,
  STAR_TIMER_TICK_MS,
  VOID_SEVERITY_COLOR,
} from '@/config/constants'
import type { PauseChampionCallout, PlanetType } from '@/types'
import { splitDuration } from '@/utils/ui/format'
import {
  championStarDeadlineAt,
  starDeadlineAt,
  starRemainingMs,
  starTotalMs,
} from '@/utils/orbit/starLifetime'
import { pauseDustStyle } from '@/utils/fx/particleField'
import PhaseSunDisc from '@/components/idle/sun/PhaseSunDisc.vue'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import KeyCap from '@/components/keybinds/KeyCap.vue'
import PauseChampionCard from './PauseChampionCard.vue'
import PauseStarCard from './PauseStarCard.vue'
import PauseVoidCard from './PauseVoidCard.vue'
import SunLedger from './SunLedger.vue'
import { gameNow } from '@/utils/game/gameClock'

// Die Pause hat zwei Quellen — Fenster ohne Fokus und das Kürzel des Spielers.
// Beide laufen in useGamePause zusammen; dieses Overlay kennt nur noch das
// Ergebnis. Die Komponente bleibt immer montiert (v-if steckt im Teleport),
// deshalb ist sie auch der richtige Ort für den Kürzel-Handler.
const { isPaused, resumeGame, togglePause } = useGamePause()

const pauseCap = computed(() => KEYBINDINGS.find((b) => b.id === 'pause')?.cap ?? 'P')

const stageEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const { scale: panelScale } = useFitScale(stageEl, panelEl, {
  maxScale: PAUSE_PANEL_MAX_SCALE,
  padding: 0,
})
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const battleStore = useBattleStore()
const playerStore = usePlayerStore()
const planetBossStore = usePlanetBossStore()
const planetShopStore = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()

// Die Rollenwahl hält das Spiel bereits an und liegt über allem — eine zweite
// Pause darüber wäre nur ein Overlay über einem Overlay.
onKeybinding('pause', () => {
  if (galaxyStore.pendingRoleSelection) return
  togglePause()
})
const starGroupStore = useStarGroupStore()
const voidStore = useVoidStore()
const uiStore = useUiStore()

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

/** Füllanteil der Vitality-Leiste als scaleX-Faktor (0–1). */
const hpRatio = computed(() => Math.min(1, Math.max(0, hpPercent.value / 100)))

const hpColor = computed(() => {
  if (hpPercent.value > HP_HEALTHY_PERCENT) return 'hp--green'
  if (hpPercent.value > HP_CRIT_PERCENT) return 'hp--yellow'
  return 'hp--red'
})

/** Kritisch: Balken pulst, das Herz-Siegel schlägt. */
const isCrit = computed(() => hpPercent.value <= HP_CRIT_PERCENT)

/**
 * Unsichtbare Messmuster, die die Breite der Wertspalte festlegen: derselbe
 * Zahlenformatierer über den ganzen Wertebereich. Sie liegen im Raster auf
 * derselben Zelle wie der Live-Wert, die Spalte nimmt also die breiteste
 * Darstellung — gemessen in echten Pixeln statt in geschätzten Zeichenbreiten.
 * Dadurch stehen Schrägstrich und Maximum fest, egal wie viele Stellen der
 * aktuelle Wert gerade hat.
 */
const hpWidthProbes = computed(() =>
  PAUSE_HP_WIDTH_PROBES.map((f) => formatNumber(Math.round(playerStore.maxHP * f))),
)

const pauseStartChimes = ref(0)
const pauseTick = ref(0)
let pauseInterval: ReturnType<typeof setInterval> | null = null
let starInterval: ReturnType<typeof setInterval> | null = null

// ── Bilanz der laufenden Pause: Schaden und Regeneration ────────────────────
// Beides kommt aus den Lebenszeit-Zählern des playerStore (`totalDamageTaken`,
// `totalHpRegenerated`) als DIFFERENZ zum Stand beim Pausenbeginn — dasselbe
// Muster wie bei den Chimes darüber. Kein neuer Store-Zustand, kein Ticker:
// beide Zähler sind reaktiv, die Anzeige läuft dadurch von selbst live.
const pauseStartDamage = ref(0)
const pauseStartRegen = ref(0)

/**
 * Die Treffer, die gerade aufsteigen. Sie kommen bewusst NICHT aus
 * `playerStore.damageFloats`: diese Liste wird von `PlayerHPBar` gepruned, ihre
 * Lebensdauer hinge damit an einer fremden Komponente. Hier trägt das Delta des
 * Lebenszeit-Zählers den Betrag, und aufgeräumt wird im ohnehin laufenden
 * Sekundentakt — kein zweiter Timer.
 */
const damagePops = ref<{ id: number; value: number; bornAt: number }[]>([])
let nextPopId = 0

const pauseDamage = computed(() =>
  Math.max(0, Math.round(playerStore.totalDamageTaken - pauseStartDamage.value)),
)
// Die Regeneration fällt in Bruchteilen an (Forge- und Baum-Boni sind keine
// ganzen HP) — gerundet wird erst hier, nicht im Store.
const pauseRegen = computed(() =>
  Math.max(0, Math.round(playerStore.totalHpRegenerated - pauseStartRegen.value)),
)

/**
 * Jeder Anstieg des Lebenszeit-Zählers ist genau ein Treffer — der Betrag steht
 * bereits mitigiert darin. Der Wächter läuft NUR während der Pause: die
 * Komponente bleibt immer montiert (das `v-if` steckt im Teleport), er liefe
 * sonst durchs ganze Spiel mit.
 */
watch(
  () => playerStore.totalDamageTaken,
  (now, before) => {
    if (!isPaused.value) return
    const dealt = Math.round(now - before)
    if (dealt <= 0) return
    damagePops.value = [
      ...damagePops.value,
      // Wanduhr: die Zahl steigt per CSS-Animation auf und muss so lange stehen,
      // wie das Auge sie liest. Rein visuelle Standzeit, beide Enden des
      // Vergleichs entstehen in diesem Modul — `gameNow()` wäre hier falsch, die
      // CSS-Animation kennt keinen Zeitraffer.
      { id: nextPopId++, value: dealt, bornAt: Date.now() },
    ].slice(-PAUSE_LEDGER_MAX_POPS)
  },
)

/** Abgelaufene Treffer entfernen. Läuft im vorhandenen Sekundentakt mit; die
 *  Zuweisung erfolgt nur, wenn sich wirklich etwas ändert. */
function prunePops(): void {
  if (damagePops.value.length === 0) return
  // Wanduhr, siehe oben
  const now = Date.now()
  const next = damagePops.value.filter((p) => p.bornAt + DAMAGE_FLOAT_DURATION_MS > now)
  if (next.length !== damagePops.value.length) damagePops.value = next
}

/**
 * Escape beendet die Pause — dieselbe Taste, die im ganzen Spiel jedes Overlay
 * schließt, und deshalb bewusst KEIN Eintrag in der Kürzel-Registry: sie ist
 * kontextabhängig und gehört keinem einzelnen Befehl.
 *
 * Liegt das Controls-Panel darüber, schließt der erste Druck erst dieses —
 * Escape arbeitet sich von oben nach unten durch die Ebenen, statt zwei davon
 * gleichzeitig zu schließen.
 */
function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (uiStore.isControlsOpen) return
  resumeGame()
}

watch(
  isPaused,
  (paused) => {
    if (paused) {
      gameStore.setPauseState(true)
      pauseStartChimes.value = gameStore.chimes
      pauseStartDamage.value = playerStore.totalDamageTaken
      pauseStartRegen.value = playerStore.totalHpRegenerated
      damagePops.value = []
      pauseTick.value = 0
      pauseInterval = setInterval(() => {
        pauseTick.value++
        prunePops()
      }, 1000)
      // Sofort aufbauen, damit die Karten mit dem Overlay erscheinen und nicht
      // erst beim ersten Takt.
      lastResourceStarsKey = ''
      lastVoidThreatKey = ''
      lastChampionKey = ''
      refreshResourceStars()
      refreshVoidThreat()
      refreshChampionCallout()
      starInterval = setInterval(() => {
        refreshResourceStars()
        refreshVoidThreat()
        refreshChampionCallout()
      }, STAR_TIMER_TICK_MS)
      window.addEventListener('keydown', onEscape)
    } else {
      gameStore.setPauseState(false)
      if (pauseInterval !== null) {
        clearInterval(pauseInterval)
        pauseInterval = null
      }
      if (starInterval !== null) {
        clearInterval(starInterval)
        starInterval = null
      }
      window.removeEventListener('keydown', onEscape)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pauseInterval !== null) clearInterval(pauseInterval)
  if (starInterval !== null) clearInterval(starInterval)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onEscape)
})

const accumulatedChimes = computed(() => {
  void pauseTick.value
  return Math.max(0, gameStore.chimes - pauseStartChimes.value)
})

// Während der Pause laufen Resource-Stars weiter: sie werden per Passivschaden
// bekämpft und despawnen bei Timer-Ende. Hier live pro Stern: Restsekunden bis
// zum Verschwinden + Planeten (übrig/gesamt).
//
// Die Restzeit kommt aus `starRemainingMs` — derselben Rechnung, die auch die
// Star-Timer-Bars im Header anstellen. Vorher stand hier nur die eigene
// Despawn-Frist des Sterns (45 s); tatsächlich läuft ihr die Enrage-Uhr seiner
// Bosse (ab 30 s) davon, weshalb das Overlay noch zählte, als der Stern längst
// weg war.
interface PauseResourceStar {
  id: string
  secs: number
  remainingPlanets: number
  /**
   * ABSOLUTER Zeitpunkt des Despawns und die Gesamtlaufzeit derselben Uhr. Die
   * Karte lässt ihren Zeitbogen daraus als eine durchlaufende Animation
   * abbrennen — ein Restanteil je Sekunde ließe ihn im Takt stocken.
   */
  endsAt: number
  durationMs: number
  /** Spektralfarbe des Sterns als fertiger CSS-Wert (StarGroup.starColor). */
  color: string
  /** Die Slots in ihrer echten Gestalt samt Boss-HP (0..1) für ihre Balken. */
  planets: { id: string; type: PlanetType; cleared: boolean; hp: number }[]
}

/**
 * Die Kartenliste ist KEIN computed, sondern ein Schnappschuss im
 * Header-Bar-Takt (STAR_TIMER_TICK_MS). Zwei Gründe:
 *
 *  • Gleichlauf: die Bars tasten viermal je Sekunde ab. Ein 1-Sekunden-Takt im
 *    Overlay traf die Sekundenwechsel in beliebiger Phase — beide zeigten
 *    dieselbe Uhr, aber bis zu eine Sekunde versetzt.
 *  • Ruhe: ein computed über `planetBossStore.activeBosses` rechnete bei JEDEM
 *    Treffer des Passivschadens neu. Der Ticker liest ungetrackt (er läuft
 *    außerhalb jedes Effekts) und schreibt nur, wenn sich etwas ABLESBARES
 *    ändert — dieselbe Schlüssel-Logik wie beim Boss-Snapshot der Bars. Das
 *    Panel rendert damit höchstens einmal je Sekunde neu, ist aber auf
 *    250 ms genau.
 */
const activeResourceStars = shallowRef<PauseResourceStar[]>([])

function buildResourceStars(): PauseResourceStar[] {
  const now = gameNow()
  const bosses = planetBossStore.activeBosses
  const bossTimer = (planetId: string) => bosses.find((b) => b.planetId === planetId)

  return starGroupStore.activeStars
    .filter((s) => s.starType === 'resource')
    .map((s) => {
      const remainingPlanets = s.planetSlots.filter((p) => !p.cleared).length
      const remainingMs = starRemainingMs(s, now, bossTimer)
      const [r, g, b] = s.starColor
      return {
        id: s.id,
        secs: Math.ceil(remainingMs / 1000),
        remainingPlanets,
        endsAt: starDeadlineAt(s, bossTimer) ?? now,
        durationMs: starTotalMs(s, bossTimer),
        color: `rgb(${r}, ${g}, ${b})`,
        planets: s.planetSlots.map((p) => {
          const boss = bosses.find((b) => b.planetId === p.planetId)
          // Auf ganze Prozent gerundet: der Balken ist 29 px breit, feiner als
          // ein Prozentpunkt ist dort nichts mehr zu sehen — und der
          // Schlüssel unten würde bei jedem Abtasttakt anschlagen.
          const ratio =
            p.cleared || !boss || boss.maxHP <= 0
              ? 0
              : Math.min(1, Math.max(0, boss.currentHP / boss.maxHP))
          return {
            id: p.planetId,
            type: p.type,
            cleared: p.cleared,
            hp: Math.round(ratio * PAUSE_STAR_HP_STEPS) / PAUSE_STAR_HP_STEPS,
          }
        }),
      }
    })
    .filter((s) => s.remainingPlanets > 0 && s.secs > 0)
    .sort((a, b) => a.secs - b.secs)
}

/** Alles, was man der Kartenreihe ansieht — ändert es sich nicht, rendert nichts.
 *  Der Zeitbogen steht bewusst NICHT darin: er läuft in der Karte als eigene
 *  Animation weiter und hängt nur am Endzeitpunkt, nicht am Abtasttakt. */
function resourceStarsKey(list: PauseResourceStar[]): string {
  return list
    .map(
      (s) =>
        `${s.id}:${s.secs}:${s.endsAt}:${s.planets
          .map((p) => `${p.cleared ? 'x' : ''}${p.hp}`)
          .join(',')}`,
    )
    .join('|')
}

let lastResourceStarsKey = ''
function refreshResourceStars(): void {
  const next = buildResourceStars()
  const key = resourceStarsKey(next)
  if (key === lastResourceStarsKey) return
  lastResourceStarsKey = key
  activeResourceStars.value = next
}

// ── Der Void während der Pause ──────────────────────────────────────────────
// Er läuft weiter: Kader und Turrets feuern auch pausiert, und was passiv
// bekämpft wird, darf auch passiv verloren gehen — dieselbe Regel wie bei
// Sternen und Bossen. NEUE Wesen erscheinen nicht (`spawningBlocked`), sonst
// legte eines den halben Weg ungesehen zurück.
//
// Angezeigt wird nur das VORDERSTE plus die Zahl der übrigen: bei zwei Dutzend
// wäre eine Karte je Wesen eine Wand, und die einzige Frage, die hier zählt,
// ist ohnehin „was trifft die Sonne zuerst?".
//
// Wie bei den Sternen ein Schnappschuss im selben Takt und KEIN computed: ein
// computed über `voidStore.active` rechnete bei jedem Treffer des
// Orbit-Beschusses neu, und der fällt jede Sekunde.
interface PauseVoidThreat {
  secs: number
  endsAt: number
  durationMs: number
  name: string
  color: string
  /** Bild des Bewohners — fehlt bei den kleinen, gestaltlosen Wesen. */
  dweller?: string
  count: number
  worn: number
}

const voidThreat = shallowRef<PauseVoidThreat | null>(null)

function buildVoidThreat(): PauseVoidThreat | null {
  const lead = voidStore.leadMonster
  if (!lead) return null
  const def = getVoidRift(lead.defId)
  if (!def) return null
  const endsAt = lead.spawnedAt + lead.travelMs
  return {
    secs: Math.max(0, Math.ceil((endsAt - gameNow()) / 1000)),
    endsAt,
    durationMs: lead.travelMs,
    name: def.name,
    color: VOID_SEVERITY_COLOR[def.severity] ?? def.color,
    dweller: def.dweller,
    count: voidStore.active.length,
    // Auf ganze Prozent gerundet: der Balken ist wenige Pixel breit, und der
    // Schlüssel unten schlüge sonst bei jedem Abtasttakt an.
    worn:
      lead.maxHp > 0 ? Math.round((1 - lead.currentHp / lead.maxHp) * 100) / 100 : 0,
  }
}

/** Alles, was man der Karte ansieht. Der Zeitbogen steht bewusst NICHT darin —
 *  er läuft in der Karte als eigene Animation und hängt nur am Endzeitpunkt. */
function voidThreatKey(t: PauseVoidThreat | null): string {
  return t ? `${t.name}:${t.secs}:${t.endsAt}:${t.count}:${t.worn}` : ''
}

let lastVoidThreatKey = ''
function refreshVoidThreat(): void {
  const next = buildVoidThreat()
  const key = voidThreatKey(next)
  if (key === lastVoidThreatKey) return
  lastVoidThreatKey = key
  voidThreat.value = next
}

// ── Der Champion ────────────────────────────────────────────────────────────
// EINE Karte für zwei Zustände, und sie steht immer an erster Stelle:
//
//   • `awaited`  — das Schiff ist angekommen, der Stern steht noch nicht am
//     Himmel. Welcher Champion es wird, entscheidet erst der Spawn; bekannt ist
//     hier die ROLLE, und die hat der Spieler selbst gewählt — sie trägt
//     deshalb Farbe und Wappen. Ruht der Idle-Layer, merkt `useStarSystem` den
//     Stern in `pendingChampionStar` vor und lässt ihn erst beim Zurückkehren
//     erscheinen; genau das sagt der Status an, statt einen Stern zu
//     versprechen, der noch gar nicht da ist.
//   • `active`   — der Stern läuft. Erst hier steht der Champion fest.
//
// Vorher endete die Anzeige beim Spawn: der Fund-Banner hing an
// `champion_available`, und `buildResourceStars()` filtert auf `'resource'` —
// die 60-Sekunden-Uhr des Champion-Sterns lief in der Pause also unsichtbar ab.
//
// Wie bei Sternen und Void ein Schnappschuss im selben Takt und KEIN computed:
// ein computed über `planetBossStore.activeBosses` rechnete bei jedem Treffer
// des Passivschadens neu.
const championCallout = shallowRef<PauseChampionCallout | null>(null)

function buildChampionCallout(): PauseChampionCallout | null {
  const star = starGroupStore.activeStars.find((s) => s.starType === 'champion')

  if (star) {
    const slot = star.planetSlots.find((p) => p.isChampionPlanet)
    const boss = slot
      ? planetBossStore.activeBosses.find((b) => b.planetId === slot.planetId)
      : undefined
    const name = boss?.homePlanetChampion ?? null
    const escorts = star.planetSlots.filter((p) => !p.isChampionPlanet)
    const [r, g, b] = star.starColor
    const deadline = championStarDeadlineAt(star)
    const durationMs = star.durationMs ?? 0
    // Auf ganze Prozent gerundet: der Balken ist wenige Pixel breit, und der
    // Schlüssel unten schlüge sonst bei jedem Abtasttakt an.
    const ratio =
      !slot || slot.cleared || !boss || boss.maxHP <= 0
        ? 0
        : Math.min(1, Math.max(0, boss.currentHP / boss.maxHP))
    return {
      state: 'active',
      color: `rgb(${r}, ${g}, ${b})`,
      title: name ?? 'Champion',
      status: null,
      // Dieselbe Quelle UND dieselbe Auflösungsstufe wie die Belohnungskarte am
      // Stern selbst (StarSystemComponent) — sonst lädt derselbe Champion in
      // derselben Szene ein zweites Mal, statt aus dem Cache zu kommen.
      art: name ? battleStore.getChampionImage(name, { size: 'md' }) : null,
      roleIcon: championRoleIcon(),
      secs: deadline === null ? 0 : Math.max(0, Math.ceil((deadline - gameNow()) / 1000)),
      endsAt: deadline ?? gameNow(),
      durationMs,
      bossHp: Math.round(ratio * PAUSE_STAR_HP_STEPS) / PAUSE_STAR_HP_STEPS,
      escortTotal: escorts.length,
      escortCleared: escorts.filter((p) => p.cleared).length,
    }
  }

  if (galaxyStore.championTravelState !== 'champion_available') return null

  const role = galaxyStore.nextStarRole ? ROLE_BY_KEY[galaxyStore.nextStarRole] : null
  return {
    state: 'awaited',
    color: role?.color ?? '#f0d060',
    title: role?.label ?? 'Unknown',
    // Kurz gehalten: die Pille hat die Körperbreite der Karte (112 px), und
    // „Arrives when you return" brach dort zu „Arrives when you…" ab.
    status: galaxyStore.pendingChampionStar ? 'Arrives on return' : 'Waiting in orbit',
    // Das Rollenbild wird hier mit ~60 px gezeigt — dafür ist die 256er-Stufe
    // die richtige Quelle; ROLES[].image zeigt bewusst aufs Original, weil
    // dieselbe Konstante anderswo gross gerendert wird.
    art: role ? role.image.replace(/\.png$/, ROLE_ART_MD_SUFFIX) : null,
    roleIcon: championRoleIcon(),
    secs: 0,
    endsAt: 0,
    durationMs: 0,
    bossHp: 0,
    escortTotal: 0,
    escortCleared: 0,
  }
}

/** Wappen der Rolle, für die dieser Stern angeflogen wurde. Es steht in beiden
 *  Zuständen für dieselbe Wahl, deshalb dieselbe Quelle. */
function championRoleIcon(): string {
  const role = galaxyStore.nextStarRole ? ROLE_BY_KEY[galaxyStore.nextStarRole] : null
  return role?.icon ?? PAUSE_CHAMPION_FALLBACK_ICON
}

/** Alles, was man der Karte ansieht. Der Zeitbogen steht bewusst NICHT darin —
 *  er läuft in der Karte als eigene Animation und hängt nur am Endzeitpunkt. */
function championCalloutKey(c: PauseChampionCallout | null): string {
  return c
    ? `${c.state}:${c.title}:${c.status}:${c.color}:${c.secs}:${c.endsAt}:${c.bossHp}:${c.escortCleared}/${c.escortTotal}`
    : ''
}

let lastChampionKey = ''
function refreshChampionCallout(): void {
  const next = buildChampionCallout()
  const key = championCalloutKey(next)
  if (key === lastChampionKey) return
  lastChampionKey = key
  championCallout.value = next
}

const timerChars = computed(() => {
  const { hours, minutes, seconds } = splitDuration(pauseTick.value)
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${hours > 0 ? hours + ':' : ''}${mm}:${ss}`.split('')
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

/**
 * Offene Level-Up-Wahlen. Sie stehen als Marke neben der Überschrift, nicht in
 * der Kartenreihe: dort läuft ausschließlich, was gerade abläuft.
 */
const pendingAugmentCount = computed(() => gameStore.pendingAugmentSelections.length)

function unpause() {
  resumeGame()
}

function particleStyle(i: number): Record<string, string> {
  return pauseDustStyle(i)
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
   ausschließlich useFitScale per transform: scale().

   Die Breite ist bewusst großzügig: der Fit-Scale ist auf JEDER
   Desktop-Referenzauflösung höhenlimitiert (Full HD gemessen: 0,64 aus der
   Höhe gegen 3,4, die die Bühnenbreite zuließe). Zusätzliche Panelbreite
   kostet also nichts an Skalierung, während zusätzliche Panelhöhe alles
   gleichmäßig schrumpfen ließe — sie geht direkt in die Inhalte, allen voran
   in die Materialbilder. */
.pause-panel {
  position: relative;
  z-index: 1;
  overflow: hidden;
  /* Breite kommt inline aus PAUSE_PANEL_DESIGN_WIDTH — sie stand hier früher
     ein zweites Mal als feste Zahl, und die Rechnung der Kartenreihe hängt
     daran. Zwei Quellen für dasselbe Maß laufen beim ersten Nachjustieren
     auseinander, ohne dass es auffällt. */
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
  position: relative;
  display: inline-flex;
  align-items: baseline;
  font-size: clamp(2rem, 3.6vw, 3rem);
  font-weight: 800;
  line-height: 1;
  color: #f0d060;
  /* Grundschein statisch. Was atmet, ist die Ebene darunter. */
  text-shadow:
    0 0 22px rgba(240, 208, 96, 0.45),
    0 0 48px rgba(200, 144, 64, 0.22);
}
/* Farbloser Zwilling hinter den Ziffern: `text-shadow` zeichnet auch bei
   transparenter Schrift, übrig bleibt also reiner Schein. Er liegt exakt auf
   den Ziffern (dieselbe Zeichenkette, dieselben Zellenbreiten) und blendet im
   Takt auf — animiert wird nur `opacity`, das bleibt Compositor-Arbeit. */
.pause-timer__glow {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: baseline;
  color: transparent;
  text-shadow:
    0 0 30px rgba(240, 208, 96, 0.4),
    0 0 64px rgba(200, 144, 64, 0.2);
  opacity: 0;
  pointer-events: none;
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
    opacity: 0;
  }
  50% {
    opacity: 1;
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
/* Die Heldenzeile: Regeneration — Scheibe — Schaden. Beide Randspalten sind
   gleich breit (1fr), die Scheibe steht dadurch exakt in der Panelmitte, genau
   wie vor dem Einbau der Ledger.

   Die feste Höhe ist der Kern des Ganzen: sie ist der Durchmesser der Scheibe
   und NICHT der höchste Inhalt. Wüchse die Zeile mit dem Ledger, änderte sich
   die Panelhöhe — und mit ihr der Fit-Scale des gesamten Overlays (das Panel
   ist auf jeder Desktop-Auflösung höhenlimitiert). Der negative `margin-top`
   des Phasen-Labels darunter hängt ebenfalls daran.

   Platzrechnung je Randspalte: (960 Panelbreite − 2 × 44 Innenabstand
   − 200 max. Scheibe) / 2 ≈ 336 px gegen ~170 px, die der breiteste Ledger
   braucht. */
.hero-row {
  display: grid;
  /* `minmax(0, 1fr)` statt `1fr`: eine ungewöhnlich lange Zahl darf die
     Randspalte nicht über ihren Anteil hinaus aufblähen — sonst wanderte die
     Scheibe aus der Panelmitte. Sie ragt dann nach außen und wird notfalls vom
     Panel beschnitten; die Mitte bleibt unangetastet. */
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  /* Luft zur Scheibe: ihr Kasten ist quadratisch, ihre Korona läuft darüber
     hinaus — ohne diesen Abstand berührte die Akzentlinie den Schein. */
  column-gap: clamp(16px, 2.2vw, 30px);
  width: 100%;
  height: var(--sun-d);
}

/* Beide Ledger kleben an der Scheibe, ihre Zahlen wachsen nach außen. */
.hero-row > :first-child {
  justify-self: end;
}
.hero-row > :last-child {
  justify-self: start;
}

/* Maße kommen inline aus `sunDiameter` (PAUSE_SUN_*): dieselbe Spanne stand
   hier als `clamp()` ein zweites Mal, und beide Fassungen mussten von Hand
   gleichgehalten werden. */
.sun-hero {
  position: relative;
  flex-shrink: 0;
  pointer-events: none;
}
.sun-hero__disc {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
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
/* ── Vitalitäts-Leiste ────────────────────────────────────
   Bewusst ohne eigene Fassung: das Panel trägt darunter bereits drei umrandete
   Blöcke, ein vierter Kasten direkt unter der Sonne hätte die Leiste von ihr
   getrennt. So bleibt sie die Lebensanzeige DER Sonne — die Struktur trägt der
   Balken selbst über seinen eingelassenen Rand.

   Beschriftung und Herz-Emblem sind weg: beide sagten dasselbe wie die Zahl
   daneben. Der Platz gehört jetzt dem Balken, der dafür fast doppelt so hoch
   ist wie zuvor und über die volle Panelbreite läuft.

   Der Balken besteht aus gestapelten Ebenen, damit nichts außer transform und
   opacity animiert wird: Nachlaufspur, Füllung (mit Puls darin), Kante,
   Gravur, Krit-Puls. */
.vital-strip {
  display: flex;
  align-items: center;
  /* Eng: die Zahl soll unmittelbar an der Balkenkante beginnen, nicht am
     rechten Panelrand kleben. */
  gap: clamp(8px, 1.1vw, 12px);
  width: 100%;
  height: 38px;
  /* Die Leiste gehört optisch zur Sonne darüber, nicht zur Kachelreihe
     darunter — der halbe Panel-Gap rückt sie näher an das Phasen-Label. */
  margin-top: calc(-1 * clamp(6px, 1vh, 10px));
  padding: 0 2px;
}


/* Zustandsfarben liegen am Streifen, nicht am Balken: Füllung, Kante und
   Zahlenwert ziehen dieselben drei Werte. */
.vital-strip.hp--green {
  --hp-hi: #74d448;
  --hp-lo: #2e7a1a;
  --hp-txt: #9ae86a;
}
.vital-strip.hp--yellow {
  --hp-hi: #f5d84a;
  --hp-lo: #a8760e;
  --hp-txt: #f0d060;
}
.vital-strip.hp--red {
  --hp-hi: #ff7a6a;
  --hp-lo: #8e2a20;
  --hp-txt: #ff8a7a;
}

/* Leerer Teil des Balkens ist nicht einfach schwarz: eine feine Schraffur
   liegt darin, damit die Fehlmenge als beschädigter Rumpf liest statt als
   Loch. Rein statisch. */
.vital-bar {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 28px;
  overflow: hidden;
  border-radius: 5px;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(255, 224, 170, 0.028) 0 5px,
      transparent 5px 11px
    ),
    #0b0906;
  box-shadow:
    inset 0 0 0 1px rgba(122, 78, 32, 0.8),
    inset 0 2px 8px rgba(0, 0, 0, 0.9),
    0 0 18px color-mix(in srgb, var(--hp-hi) 13%, transparent);
}
/* Fassung über allen Ebenen: der eingelassene Rand bleibt sichtbar, auch wenn
   die Füllung bis an die Kante läuft. */
.vital-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 5px;
  box-shadow:
    inset 0 1px 0 rgba(255, 224, 170, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.65),
    inset 0 0 0 1px rgba(122, 78, 32, 0.55);
  pointer-events: none;
}
.vital-bar__fill,
.vital-bar__ghost {
  position: absolute;
  inset: 0;
  transform-origin: left center;
}
/* Der Verlauf läuft SENKRECHT — waagerecht würde ihn scaleX mitstauchen und
   die Farbe hinge am Füllstand statt am Zustand. */
.vital-bar__fill {
  overflow: hidden;
  background:
    linear-gradient(to bottom, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.05) 44%, transparent 54%),
    linear-gradient(to bottom, var(--hp-hi), var(--hp-lo));
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
/* Energiepuls, der durch die verbliebene Vitalität läuft — der einzige
   Dauerlauf im Balken und reines transform/opacity. */
.vital-bar__spark {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 18%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.5) 50%,
    transparent
  );
  animation: vital-spark 3.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  pointer-events: none;
}
@keyframes vital-spark {
  0% {
    transform: translateX(-110%);
    opacity: 0;
  }
  14% {
    opacity: 1;
  }
  62% {
    opacity: 1;
  }
  74%,
  100% {
    transform: translateX(560%);
    opacity: 0;
  }
}
/* Nachlaufspur unter der Füllung: sie bleibt beim Treffer kurz stehen und zieht
   dann nach — der Verlust ist einen Moment lang als heller Streifen sichtbar,
   statt einfach zu fehlen. */
.vital-bar__ghost {
  background: rgba(255, 186, 160, 0.32);
  transition: transform 900ms cubic-bezier(0.4, 0, 0.2, 1) 380ms;
}
/* Helle Kante am Füllstand — sitzt am rechten Rand einer vollbreiten, nach
   links geschobenen Ebene und bleibt dadurch bei jedem Füllstand 2px breit. */
.vital-bar__edge {
  position: absolute;
  inset: 0;
  border-right: 2px solid rgba(255, 255, 255, 0.85);
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}
/* Flare hinter der Kante: der Übergang von Füllung zu Leere ist damit kein
   harter Schnitt mehr, sondern eine glühende Bruchstelle. Liegt innerhalb der
   Kanten-Ebene und wandert mit ihr — kein zweiter gebundener Wert. */
.vital-bar__edge::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 30px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--hp-hi) 60%, transparent)
  );
  pointer-events: none;
}
/* Skala statt Segmentraster. Zehn gleichrangige Striche über die Breite
   ergaben im transform-skalierten Panel (useFitScale, ~0.64 auf Full HD)
   gebrochene Pixelpositionen: jeder Strich landete anders im Rastergitter und
   die Reihe las sich unregelmäßig — obwohl sie exakt gleich verteilt war.

   Drei Marken mit klarer Hierarchie lösen das: Viertel als kurze Kerben von
   Ober- und Unterkante, die Hälfte zusätzlich mit durchgehender Linie. Wenige,
   erkennbar gesetzte Marken lesen als Skala; das Ablesen auf den Prozentpunkt
   übernimmt die Zahl daneben. Jede Marke ist eine eigene Hintergrundebene mit
   fester Pixelbreite und prozentualer Position — nichts wiederholt sich, also
   kann sich auch nichts aufschaukeln. Statisch, nichts bewegt sich. */
.vital-bar__ticks {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.55) 0 8px,
      transparent 8px calc(100% - 8px),
      rgba(0, 0, 0, 0.55) calc(100% - 8px) 100%
    ),
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.62) 0 10px,
      rgba(255, 228, 176, 0.1) 10px calc(100% - 10px),
      rgba(0, 0, 0, 0.62) calc(100% - 10px) 100%
    ),
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.55) 0 8px,
      transparent 8px calc(100% - 8px),
      rgba(0, 0, 0, 0.55) calc(100% - 8px) 100%
    );
  background-size: 2px 100%;
  background-position:
    25% 0,
    50% 0,
    75% 0;
  background-repeat: no-repeat;
  pointer-events: none;
}
/* Kritisch: eine rote Ebene pulst über dem Balken — animiert wird allein die
   Opazität, nicht Farbe oder Schatten. */
.vital-bar__pulse {
  position: absolute;
  inset: 0;
  background: rgba(255, 95, 95, 0.32);
  opacity: 0;
  pointer-events: none;
}
.vital-bar--crit .vital-bar__pulse {
  animation: vital-pulse 1.1s ease-in-out infinite;
}
@keyframes vital-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* Die Zahl beginnt unmittelbar an der Balkenkante — der gesamte Block hat eine
   feste Breite, damit weder er noch die Balkenkante wandert.

   Sie ist absichtlich HÖHER gesetzt als der Balken (28px): der Wert ist die
   einzige exakte Ablesung der Vitalität im Overlay, und das Panel läuft durch
   useFitScale skaliert (~0.64 auf Full HD) — kleiner gesetzt bliebe davon real
   kaum mehr als ein Chip-Text. Die Streifenhöhe (38px) bleibt davon unberührt
   und muss es auch: sie ginge sonst in die Panelhöhe und damit in den
   Fit-Scale des ganzen Overlays ein. */
.vital-strip__value {
  display: inline-flex;
  align-items: baseline;
  flex-shrink: 0;
  font-size: clamp(1.4rem, 2.2vw, 1.9rem);
  font-weight: 800;
  line-height: 1;
  color: var(--hp-txt, #ece0c0);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 0 16px color-mix(in srgb, var(--hp-txt) 45%, transparent);
}
/* Ein-Zellen-Raster: Messmuster und Live-Wert liegen übereinander, die Spalte
   nimmt die breiteste Darstellung. Damit steht der Schrägstrich fest, ohne
   dass irgendwo eine Zeichenbreite geschätzt werden müsste — der Browser misst
   die echten Glyphen der Schrift. Rechtsbündig, damit der Wert am
   Schrägstrich klebt statt von ihm wegzurücken. */
.vital-strip__cur {
  display: grid;
  grid-template-areas: 'hp';
  justify-items: end;
}
.vital-strip__cur > * {
  grid-area: hp;
}
/* Nur zur Breitenmessung da: nimmt Platz ein, wird aber nicht gezeichnet. */
.vital-strip__probe {
  visibility: hidden;
  pointer-events: none;
}
.vital-strip__max {
  font-size: 0.66em;
  font-weight: 600;
  color: rgba(216, 200, 160, 0.5);
  text-shadow: none;
}

/* ── Chime readout ────────────────────────────────────── */
.chime-readout {
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.6vw, 20px);
}
.chime-orb {
  position: relative;
  display: flex;
  flex-shrink: 0;
}
.chime-img {
  position: relative;
  width: clamp(54px, 7.5vh, 84px);
  height: clamp(54px, 7.5vh, 84px);
  object-fit: contain;
  /* Statischer Grundschatten — der Umschlag nach oben kommt vom Halo. */
  filter: drop-shadow(0 0 12px rgba(232, 192, 64, 0.5));
}
/* Runder Schein hinter der Münze. Er greift über deren Kante hinaus, damit der
   Verlauf dort ankommt, wo vorher der weite drop-shadow lag. */
.chime-orb__halo {
  position: absolute;
  inset: -35%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(232, 192, 64, 0.5) 0%,
    rgba(232, 192, 64, 0.22) 42%,
    transparent 70%
  );
  opacity: 0;
  pointer-events: none;
  animation: chime-glow 5s ease-in-out infinite;
}
@keyframes chime-glow {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
.chime-value {
  font-size: clamp(2.4rem, 4.2vw, 3.6rem);
  font-weight: 800;
  line-height: 1;
  /* Der Höhenausgleich gegen die Chime-Grafik daneben kommt gemessen von
     v-ink-center.y — die Schriftgröße hängt hier an vw, ein fester em-Wert
     träfe nur eine Fensterbreite (siehe utils/ui/textInkOffset.ts). */
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
  /* Bemessen am höheren Inhalt und NACHGEMESSEN, nicht gerechnet: Kopfzeile,
     Abstand, zwei Reihen Material-Bilder (2 × 78 + 6 Lücke) und Innenabstand
     ergeben zusammen 236 px.
     Mit dem breiteren Panel (960 statt 620) ist die Material-Kachel rund 560 px
     breit — fünf Zellen à über 100 px. Die Bilder sind quadratisch, ihre HÖHE
     ist damit der Engpass, nicht die Breite: 78 px ist die Zeilenhöhe, die noch
     in die Kachel passt, ohne dass die zusätzliche Panelhöhe den Fit-Scale
     spürbar drückt.
     Diese Zahl und `--mat-row-h` hängen zusammen — mit 84 px Zeilenhöhe kam der
     Inhalt auf 240 px und die zweite Materialreihe wurde unten abgeschnitten.
     Das fällt nur mit GEFÜLLTEM Inventar auf; ein leeres Overlay sieht in
     beiden Fällen richtig aus. */
  grid-auto-rows: 238px;
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
  font-size: 1.02rem;
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
/* Die Materialkachel gibt ihren seitlichen Innenabstand an das Bildraster ab:
   ohne Rahmen um die einzelnen Karten ist jeder Pixel Kachelrand ein Pixel
   weniger Material. Die Kopfzeile behält ihren Abstand über ein eigenes
   Padding, damit sie nicht am Kachelrand klebt. */
.stat-tile--materials {
  padding-left: 6px;
  padding-right: 6px;
}
.stat-tile--materials .stat-tile__label {
  padding-left: 7px;
  padding-right: 7px;
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
  justify-self: center;
  height: 100%;
  column-gap: 10px;
  row-gap: 8px;
  /* Nicht über die ganze Kachelbreite ziehen: mit dem breiteren Panel
     stünden Label und Zahl sonst an entgegengesetzten Rändern und die
     Zeile läse sich als zwei getrennte Angaben statt als eine. */
  max-width: 210px;
  margin: 0 auto;
}
/* Die Kategoriefarbe kommt inline aus killBreakdown — Planeten bernstein,
   Sterne im Türkis der Stern-Callouts, Galaxiebosse im Warnrot der
   Bosskämpfe. */
.kill-cell__icon {
  filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.6));
}
.kill-cell__label {
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.6);
  white-space: nowrap;
}
.kill-cell__count {
  font-size: 1.32rem;
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
   Die Karten haben keine eigene Fassung: kein Rahmen, keine Füllung, keine
   Aura. Was von jeder Karte bleibt, sind Bild und Menge — der Zierrat kostete
   in einer 52px-Zelle mehr Fläche, als er trug (siehe „Performance" Regel 7).
   Die Seltenheit steckt weiterhin in --mat-color, die jetzt allein die
   Mengenzahl färbt.

   Der gewonnene Platz geht ins Bild: es füllt seine Rasterzelle vollständig
   aus und ist damit gut die Hälfte größer als zuvor (40px → ~84px Kantenlänge
   auf der Design-Breite, mit dem Fit-Scale wächst es auf 2K/4K entsprechend
   mit). Das bleibt in der 256er-Variante von materialIconMd korrekt
   eingebettet — bei DPR 2 sind das 168px Anzeige gegen 256px Quelle.

   Feste Maße statt vh-Clamps: das Panel hat eine feste Design-Breite, die
   Größenanpassung an den Viewport macht ausschließlich useFitScale. Ein
   zweiter, davon unabhängiger vh-Bezug würde nur gegen den Fit-Scale rechnen. */
/* Beide Reihen stehen als explizite Grid-Zeilen fest — auch wenn erst zwei
   Materialien gefallen sind. Klappte die zweite Reihe erst beim fünften Fund
   auf, wüchse mitten in der Pause die Panelhöhe und mit ihr sprünge der
   Fit-Scale des gesamten Overlays. */
.mat-grid {
  /* So hoch wie die Zelle breit ist: die Materialbilder sind quadratisch,
     jede zusätzliche Zeilenhöhe darüber hinaus wäre Leerraum. */
  --mat-row-h: 78px;
  /* Ohne Rahmen trennt schon die Silhouette der Bilder — ein breiter Spalt
     würde sie nur kleiner machen. */
  --mat-gap: 6px;
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
  font-size: 0.95rem;
  font-style: italic;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.3);
}

/* Reiner Rahmen im Wortsinn nicht mehr vorhanden: die Karte ist nur noch die
   Zelle, in der Bild und Menge liegen. */
.mat-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
/* Überzähliges ist kein Material — nur eine Zahl, entsprechend zurückgenommen */
.mat-card--more {
  font-size: 1.1rem;
  font-weight: 800;
  color: rgba(216, 200, 160, 0.5);
  font-variant-numeric: tabular-nums;
}
/* Das Bild füllt die Zelle vollständig aus; `contain` hält das
   Seitenverhältnis, die quadratischen Quellen landen also auf der
   Zellenbreite. Der Schatten trennt es vom Panelgrund, seit der Rahmen es
   nicht mehr tut — statisch, nicht animiert. */
.mat-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.75));
}
/* Bildloses Material: nur die Initialen in der Seltenheitsfarbe, ohne Scheibe
   — dieselbe Regel wie für die Karte selbst. Dafür so groß, dass sie das
   Gewicht eines Bildes haben. */
.mat-card__mono {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--mat-color);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 10px color-mix(in srgb, var(--mat-color) 40%, transparent);
}
/* Die Menge sitzt auf der unteren Kante des Bildes — ohne Plakette darunter,
   die Lesbarkeit trägt der Schatten. Sie ist der eigentliche Messwert der
   Kachel und deshalb bewusst groß: bei ~84px Zellenbreite bleibt selbst die
   längste Ausgabe des Formatierers („×999.9K") innerhalb der Zelle. */
.mat-card__amount {
  position: absolute;
  right: 0;
  bottom: -1px;
  font-size: 1.24rem;
  font-weight: 800;
  line-height: 1;
  color: var(--mat-color);
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 2px rgba(6, 4, 0, 1),
    0 0 4px rgba(6, 4, 0, 1),
    0 0 9px rgba(6, 4, 0, 0.9);
}
/* Das Malzeichen trägt keine Information, die die Zahl nicht selbst hat — es
   bleibt klein und zurückgenommen. Der gesparte Platz gehört der Zahl: die
   längste Ausgabe („×999.9K") bleibt damit sicher in der Zelle, statt in den
   Spalt zur Nachbarkarte zu ragen. */
.mat-card__x {
  font-size: 0.7em;
  font-weight: 700;
  opacity: 0.6;
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
  height: 54px;
  padding: 0 clamp(12px, 1.6vw, 16px);
  background: rgba(255, 200, 80, 0.05);
  border: 1px solid rgba(122, 78, 32, 0.55);
  border-radius: 12px;
}
.battle-strip__idle {
  font-size: clamp(0.85rem, 1.1vw, 0.95rem);
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
  font-size: 1.02rem;
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
  font-size: clamp(1.25rem, 1.8vw, 1.55rem);
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
  font-size: clamp(1.1rem, 1.6vw, 1.38rem);
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
  font-size: clamp(1.1rem, 1.6vw, 1.38rem);
  font-weight: 800;
  line-height: 1;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px rgba(240, 208, 96, 0.4);
  white-space: nowrap;
}
.battle-strip__chime-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.5));
}

/* ── Callouts ─────────────────────────────────────────── */
.callout-section {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
}
/* Überschrift und Level-Up-Marke auf einer Zeile mit fester Höhe: taucht die
   Marke mitten in der Pause auf, rückt darunter nichts nach.
   Linksbündig wie die Karten darunter — beide teilen sich damit EINE Kante,
   an der das Auge den Abschnitt findet. */
.callout-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  height: 22px;
}
.callout-heading {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.55);
}
/* Die einzige verbliebene Pille im Abschnitt — sie meldet keine laufende Frist,
   sondern eine offene Entscheidung, und steht deshalb bei der Überschrift. */
.level-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(116, 212, 72, 0.45);
  background: linear-gradient(135deg, rgba(116, 212, 72, 0.16), rgba(116, 212, 72, 0.05));
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #b6ec96;
  white-space: nowrap;
}
.level-chip__icon {
  flex-shrink: 0;
  color: #74d448;
  filter: drop-shadow(0 0 5px rgba(116, 212, 72, 0.8));
}
.level-chip__count {
  font-size: 1.05em;
  color: #74d448;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px rgba(116, 212, 72, 0.55);
}
/* Alle Karten sind gleich gross und stehen linksbündig nebeneinander: die
   Champion-Karte zuerst, dann der Void, dann die Flybys. Ab der fünften Karte
   bricht die Reihe um — vier passen in den Panelinnenraum
   (4 × 208 + 3 × 6 = 850 ≤ 872), fünf nicht mehr (1064).

   Feste Höhe für ZWEI Kartenzeilen: reservierter Platz, egal ob leer oder voll
   besetzt. Eine mitwachsende Höhe liesse den Fit-Scale des ganzen Overlays
   mitten in der Pause springen, sobald der fünfte Callout auftaucht.

   Die Lücke kommt inline aus PAUSE_STAR_CARD_GAP_PX — dieselbe Zahl steht in
   der Breitenrechnung und zwischen den beiden Zeilen. */
.callout-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  justify-content: flex-start;
  gap: var(--star-card-gap);
  height: calc(2 * var(--star-card-h) + var(--star-card-gap));
  width: 100%;
  overflow: hidden;
}
/* Der Leersatz hat keine Karte, an der er sich ausrichten könnte — er steht
   deshalb als einziger mittig im reservierten Feld. */
.callout-row--empty {
  align-items: center;
  align-content: center;
  justify-content: center;
}

.callout-empty {
  font-size: clamp(0.68rem, 0.95vw, 0.78rem);
  font-style: italic;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.32);
}
/* Pop-in: neue Karten und Marken federn in die reservierte Zeile ein */
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
/* Dreispalter: die leere erste Spalte spiegelt die Tastengruppe rechts, damit
   die Beschriftung in der Mitte steht — und nicht um deren Breite verschoben,
   wie es ein einfaches space-between täte. */
.continue-btn {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  padding: clamp(9px, 1.3vh, 13px) clamp(10px, 1.2vw, 14px);
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
.continue-btn__main {
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: 9px;
}
/* Die Tasten treten hinter der Beschriftung zurück — sie sagen, WIE es auch
   geht, nicht was der Knopf tut. Beim Überfahren kommen sie mit nach vorn. */
.continue-btn__keys {
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 5px;
  opacity: 0.55;
  transition: opacity 0.18s ease;
}
.continue-btn:hover .continue-btn__keys {
  opacity: 1;
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
  /* Die beiden Scheine liegen jetzt auf eigenen Ebenen — angehalten wird
     deshalb dort, und zwar auf ihrem ruhigen Ende (opacity 0). */
  .particle,
  .chime-orb__halo,
  .pause-timer__glow,
  .vital-bar--crit .vital-bar__pulse {
    animation: none;
  }
  .vital-bar__fill,
  .vital-bar__ghost,
  .vital-bar__edge {
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
