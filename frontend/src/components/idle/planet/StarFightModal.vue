<template>
  <Transition name="sf-entrance">
    <div
      v-if="starGroupStore.starFightModalOpen"
      class="sf-backdrop"
      :class="{ 'sf-backdrop--shaking': isShaking }"
      role="dialog"
      aria-modal="true"
      @click.self="handleClose"
    >
      <!-- ── Ember Atmosphere ───────────────────────────────────────────── -->
      <div class="sf-atmosphere" :class="{ 'sf-atmosphere--galaxy': isGalaxyBoss }">
        <span v-for="i in 12" :key="i" class="sf-ember" :style="emberStyle(i)" />
      </div>

      <!-- ── Modal ─────────────────────────────────────────────────────── -->
      <div class="sf-modal" :class="{ 'sf-modal--galaxy': isGalaxyBoss }">
        <RpgFrame />
        <!-- ── Gold Topbar ─────────────────────────────────────────────── -->
        <div class="sf-topbar" />

        <!-- ── Cosmic Background (shared, wie Shop/Team/Planets) ───────── -->
        <CosmicStageBackground />

        <!-- ── Aktiver Fluch: lila Rauch hüllt den inneren Modal-Rand ein ── -->
        <Transition name="curse-veil-fade">
          <div v-if="activeCurse" class="sf-curse-veil" aria-hidden="true">
            <span class="sf-curse-veil-layer sf-curse-veil-layer--edge" />
            <span class="sf-curse-veil-layer sf-curse-veil-layer--smoke" />
            <span class="sf-curse-veil-info">{{ curseDef?.name }} · {{ curseSecsLeft }}s</span>
          </div>
        </Transition>

        <!-- ── Boss-Rage: glühender Crimson-Saum + Hitzeschlieren ─────────── -->
        <Transition name="curse-veil-fade">
          <div v-if="rageActive" class="sf-rage-veil" aria-hidden="true">
            <span class="sf-rage-veil-layer sf-rage-veil-layer--edge" />
            <span class="sf-rage-veil-layer sf-rage-veil-layer--flames" />
            <span class="sf-rage-veil-info">Rage · ×{{ BOSS_RAGE_DMG_MULT }} dmg</span>
          </div>
        </Transition>

        <!-- ── Floating Controls (kein Header mehr) ────────────────────── -->
        <div class="sf-corner-controls">
          <button
            v-if="activeBoss"
            class="sf-admin-kill-btn"
            :class="{ 'sf-admin-kill-btn--flash': adminKillFlashing }"
            title="Admin: instantly defeat all bosses in this star"
            @click="adminKillAllBosses"
          >
            <Icon icon="game-icons:skull" width="12" height="12" />
            ADMIN
          </button>
          <button class="sf-close-btn" aria-label="Close" title="Close" @click="handleClose">
            <span class="sf-close-x" aria-hidden="true">✕</span>
          </button>
        </div>

        <!-- ── Main Layout ──────────────────────────────────────────────── -->
        <div class="sf-main">
          <!-- Section 1: Planet + Boss zentriert (größter Bereich) -->
          <div
            class="sf-arena-wrap"
            :class="{
              'sf-arena-wrap--strike': bossStrikeActive,
              'sf-arena-wrap--jab': bossJabActive && !bossStrikeActive,
              'sf-arena-wrap--hit': bossHitActive && !bossStrikeActive && !bossJabActive,
              'sf-arena-wrap--eclipsed': bossBehindSun,
            }"
          >
            <!-- Planet-Hintergrund — zentriert im Arena-Bereich, Boss steht mittig darauf -->
            <div
              ref="modalPlanetBgRef"
              class="sf-modal-planet-bg"
              :class="{ 'sf-modal-planet-bg--galaxy': isGalaxyBoss }"
            />

            <!-- ── Eigene Sonne als Horizont am unteren Arena-Rand: aktuelle
                 Phase + Spieler-HP. Steht VOR BossArenaSection im DOM, damit
                 Boss und Planet über der Kuppel liegen; HP-Leiste, Zielscheibe
                 und Strike-Bolt heben sich intern per z-index wieder darüber ── -->
            <SunHorizonHUD v-if="activeBoss" />

            <BossArenaSection v-if="activeBoss" disable-arc-attacks @shake="handleShake" />

            <!-- ── Eclipse-Schleier: Boss hinter der Sonne — gleißende Korona
                 legt sich über die Arena, der Boss wird zur Silhouette ────── -->
            <Transition name="sf-eclipse-fade">
              <div v-if="bossBehindSun" class="sf-eclipse-veil" aria-hidden="true">
                <span class="sf-eclipse-scrim" />
                <span class="sf-eclipse-corona" />
                <!-- Großes Eclipse-Medaillon auf dem Boss — gleiches Icon wie
                     bei Champions (rsq-eclipse) und Planeten (tbh-eclipse) -->
                <span class="sf-eclipse-medal" title="Behind the Sun — combat paused">
                  <Icon icon="game-icons:eclipse-flare" width="56" height="56" />
                </span>
              </div>
            </Transition>

            <!-- ── Planet Battery: alle 6 Planet-Slots auf dem Bogen — nur
                 Turrets feuern Salven (geteilter Takt mit dem Idle-Orbit) ── -->
            <PlanetBatteryHUD v-if="activeBoss" />

            <!-- Boss-Angriff: Abschuss-Blitz + Doppel-Schockwelle, die sichtbar
                 bis über Champions und Turret-Planeten hinausläuft -->
            <template v-if="bossStrikeActive">
              <span class="sf-boss-flare" />
              <span class="sf-boss-wave" />
              <span class="sf-boss-wave sf-boss-wave--echo" />
            </template>

            <!-- ── Ziel-HUD: Bossname + HP-Datenstreifen (rahmenlos, oben) ── -->
            <StarFightBossHud :now="now" :boss-behind-sun="bossBehindSun" />

            <!-- ── Loot des aktuellen Bosses — episch unter dem Boss-Bild ── -->
            <div v-if="activeBoss" class="sf-loot">
              <BossRewardSection />
            </div>

            <!-- ── Attacker Squad: Rollen mit Boss-Fähigkeit + Cooldown ── -->
            <div v-if="activeBoss" class="sf-squad">
              <RoleStrikerSquad />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import {
  BOSS_REMOVAL_DELAY_MS,
  BOSS_WAVE_TRAVEL_MS,
  BOSS_HIT_REACT_MS,
  STRIKER_PROJECTILE_FLIGHT_MS,
  BOSS_RAGE_DMG_MULT,
} from '@/config/constants'
import { NS, drawPlanet } from '@/utils/planetDraw'
import { bossPlanetInForeground } from '@/utils/foregroundGate'
import { useBossFightHud } from '@/composables/useBossFightHud'
import BossArenaSection from '@/components/idle/planet/BossArenaSection.vue'
import RoleStrikerSquad from '@/components/idle/planet/RoleStrikerSquad.vue'
import BossRewardSection from '@/components/idle/planet/BossRewardSection.vue'
import PlanetBatteryHUD from '@/components/idle/planet/PlanetBatteryHUD.vue'
import SunHorizonHUD from '@/components/idle/planet/SunHorizonHUD.vue'
import StarFightBossHud from '@/components/idle/planet/StarFightBossHud.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'

// ── Stores ───────────────────────────────────────────────────────────────
const starGroupStore = useStarGroupStore()
const bossStore = usePlanetBossStore()
const roleBehaviorStore = useRoleBehaviorStore()

// ── Reactive values ───────────────────────────────────────────────────────
const isShaking = ref(false)
const now = ref(Date.now())
const modalPlanetBgRef = ref<HTMLDivElement | null>(null)
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // 250 statt 200 ms: treibt Star-/Rage-Ring + Countdowns — 4 Hz reichen
  // visuell, spart aber ein Fünftel der Modal-Re-Renders und Arc-Repaints
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 250)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

// ── Computed ──────────────────────────────────────────────────────────────
// Abgeleitete Kampfwerte teilen sich Modal (Veils) und HUD — beide lesen
// denselben 4-Hz-Zeitstempel, damit Schleier und Ringe synchron umschalten.
const { activeBoss, isGalaxyBoss, activeCurse, curseSecsLeft, curseDef, rageActive } =
  useBossFightHud(now)

// Schneller Jab des Boss-Sprites bei jedem Auto-Attack + Info-Callout,
// welches Random-Ziel (Champion oder Planet) getroffen wurde
const bossJabActive = ref(false)
let bossJabTimeout: ReturnType<typeof setTimeout> | null = null

// ── Eclipse-Status: Boss hinter der Sonne? (250ms-Tick liest die 60fps-
// aktualisierte, nicht-reaktive Positions-Map) ───────────────────────────
const bossBehindSun = computed(() => {
  void now.value
  const boss = activeBoss.value
  if (!boss) return false
  return !bossPlanetInForeground(boss.planetId)
})

watch(
  () => roleBehaviorStore.autoCounter,
  () => {
    bossJabActive.value = false
    if (bossJabTimeout) clearTimeout(bossJabTimeout)
    requestAnimationFrame(() => {
      bossJabActive.value = true
      bossJabTimeout = setTimeout(() => {
        bossJabActive.value = false
      }, 300)
    })
  },
)

onUnmounted(() => {
  if (bossJabTimeout) clearTimeout(bossJabTimeout)
})

const bossStrikeActive = ref(false)
let bossStrikeTimeout: ReturnType<typeof setTimeout> | null = null

// Jede Shock-Nova-Auslösung triggert die Welle
watch(
  () => roleBehaviorStore.novaCounter,
  () => {
    bossStrikeActive.value = false
    if (bossStrikeTimeout) clearTimeout(bossStrikeTimeout)
    // Re-Trigger im nächsten Frame, damit die CSS-Animation neu startet
    requestAnimationFrame(() => {
      bossStrikeActive.value = true
      bossStrikeTimeout = setTimeout(() => {
        bossStrikeActive.value = false
      }, BOSS_WAVE_TRAVEL_MS)
    })
  },
)

onUnmounted(() => {
  if (bossStrikeTimeout) clearTimeout(bossStrikeTimeout)
})

// ── Boss-Treffer-Reaktion: Flinch, wenn ein Champion-Projektil einschlägt ─
const bossHitActive = ref(false)
let bossHitDelayTimeout: ReturnType<typeof setTimeout> | null = null
let bossHitEndTimeout: ReturnType<typeof setTimeout> | null = null

function triggerBossHitReact() {
  // Verzögert um die Projektil-Flugzeit — Flinch genau beim Einschlag
  if (bossHitDelayTimeout) clearTimeout(bossHitDelayTimeout)
  bossHitDelayTimeout = setTimeout(() => {
    bossHitActive.value = false
    requestAnimationFrame(() => {
      bossHitActive.value = true
      if (bossHitEndTimeout) clearTimeout(bossHitEndTimeout)
      bossHitEndTimeout = setTimeout(() => {
        bossHitActive.value = false
      }, BOSS_HIT_REACT_MS)
    })
  }, STRIKER_PROJECTILE_FLIGHT_MS)
}

watch(
  () => Object.values(roleBehaviorStore.roleAttackShots).reduce((a, b) => a + b, 0),
  triggerBossHitReact,
)

watch(
  () => roleBehaviorStore.adcBurstActive,
  (active) => {
    if (active) triggerBossHitReact()
  },
)

onUnmounted(() => {
  if (bossHitDelayTimeout) clearTimeout(bossHitDelayTimeout)
  if (bossHitEndTimeout) clearTimeout(bossHitEndTimeout)
})

// ── Planet Background ─────────────────────────────────────────────────────
function renderModalPlanet() {
  if (!modalPlanetBgRef.value || !activeBoss.value) return
  modalPlanetBgRef.value.innerHTML = ''
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('width', '600')
  svg.setAttribute('height', '600')
  svg.setAttribute('viewBox', '0 0 600 600')
  svg.style.width = '100%'
  svg.style.height = '100%'
  const radius = isGalaxyBoss.value ? 290 : 260
  drawPlanet(svg, `modal-bg-${Date.now()}`, activeBoss.value.planetType, 300, 300, radius)
  modalPlanetBgRef.value.appendChild(svg)
}

watch(
  () => activeBoss.value?.planetId,
  async (newId) => {
    if (newId) {
      await nextTick()
      renderModalPlanet()
    }
  },
  { immediate: true },
)

// ── Star-Watcher ──────────────────────────────────────────────────────────
watch(
  () => starGroupStore.activeStars.map((s) => s.id),
  (ids) => {
    if (starGroupStore.starFightModalOpen && starGroupStore.activeFightStarId) {
      if (!ids.includes(starGroupStore.activeFightStarId)) {
        starGroupStore.closeStarFightModal()
      }
    }
  },
)

// ── Admin ─────────────────────────────────────────────────────────────────
const adminKillFlashing = ref(false)

function adminKillAllBosses() {
  const star = starGroupStore.activeStars.find((s) => s.id === starGroupStore.activeFightStarId)
  if (!star) return

  for (const slot of star.planetSlots) {
    if (slot.cleared) continue
    const boss = bossStore.activeBosses.find(
      (b) => b.planetId === slot.planetId && !b.defeated && !b.expired,
    )
    if (!boss) continue
    boss.currentHP = 0
    boss.defeated = true
    bossStore.grantBossRewards(boss)
    const pid = boss.planetId
    setTimeout(() => bossStore.removeBoss(pid), BOSS_REMOVAL_DELAY_MS)
  }

  adminKillFlashing.value = true
  setTimeout(() => {
    adminKillFlashing.value = false
  }, 500)
}

// ── Methods ───────────────────────────────────────────────────────────────
function handleClose() {
  starGroupStore.closeStarFightModal()
}

function handleShake(ms: number) {
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, ms)
}

function emberStyle(i: number): Record<string, string> {
  const duration = 1.8 + (i % 6) * 0.7
  const delay = (i % 11) * -0.35
  const left = (i * 4.55) % 100
  const size = 1.5 + (i % 3)
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    opacity: `${0.4 + (i % 4) * 0.15}`,
  }
}
</script>

<style scoped>
/* ── prefers-reduced-motion ───────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .sf-ember,
  .sf-modal-planet-bg--galaxy,
  .sf-curse-veil-layer--edge,
  .sf-curse-veil-layer--smoke,
  .sf-rage-veil-layer--edge,
  .sf-rage-veil-layer--flames,
  .sf-arena-wrap--strike :deep(.boss-img),
  .sf-arena-wrap--jab :deep(.boss-img),
  .sf-arena-wrap--hit :deep(.boss-img),
  .sf-boss-wave,
  .sf-boss-flare,
  .sf-eclipse-corona,
  .sf-eclipse-medal {
    animation: none;
  }
}

/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.sf-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(18, 4, 0, 0.94) 0%, rgba(0, 0, 0, 0.98) 100%);
  pointer-events: auto;
}

.sf-backdrop--shaking {
  animation: sf-shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  will-change: transform;
}

/* ── Embers ───────────────────────────────────────────────────────────────── */
.sf-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.sf-ember {
  position: absolute;
  bottom: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff8800 0%, #ff3300 60%, transparent 100%);
  animation: sf-ember-rise linear infinite;
}

.sf-atmosphere--galaxy .sf-ember {
  background: radial-gradient(circle, #cc55ff 0%, #8800cc 60%, transparent 100%);
}

/* ── Modal — Breite wie Bard-Profile-Menü, Höhe nutzt fast den ganzen Screen ── */
.sf-modal {
  position: fixed;
  pointer-events: auto;
  /* ein einheitlicher Abstand zu den Bottom-Bar-Nachbarn: links → MiniMap,
     rechts → CommandPanel, unten → Scoreboard-Streifen (wie BardProfileMenu) */
  --sf-gap: 10px;
  left: calc(var(--hud-panel-size, 330px) + var(--sf-gap));
  right: calc(var(--hud-panel-size, 330px) + var(--sf-gap));
  top: calc(var(--header-total-height, 50px) + 12px);
  bottom: calc(var(--bottom-center-strip-h, 79px) + var(--sf-gap));
  display: flex;
  flex-direction: column;
  /* flacher Deep-Space-Ton wie im Shop (#111008) — kein Verlauf, damit der
     geteilte CosmicStageBackground identisch wirkt */
  background: #111008;
  /* exakt derselbe Rahmen + Außen-Rundung wie das Bard-Profil (.rp-modal):
     SVG-Overlay (RpgFrame), Notch-Kurve × --hud-scale */
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1));
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
  overflow: hidden;
}

/* Galaxy-Boss: gleicher Rahmen, zusätzlich violetter Außen-Glow */
.sf-modal--galaxy {
  box-shadow:
    0 0 70px rgba(160, 40, 220, 0.26),
    0 0 130px rgba(100, 10, 140, 0.14),
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
}

/* ── Gold Topbar ──────────────────────────────────────────────────────────── */
.sf-topbar {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  position: relative;
  z-index: 2;
}

/* ── Planet Background — zentriert im Arena-Bereich ──────────────────────── */
.sf-modal-planet-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.sf-modal-planet-bg--galaxy {
  /* Statischer Glow + Opacity-Pulse — animiertes drop-shadow würde das
     komplette Planet-SVG jeden Frame neu rastern (FPS-Killer) */
  filter: drop-shadow(0 0 35px rgba(180, 60, 230, 0.5));
  animation: modal-planet-glow 3s ease-in-out infinite alternate;
}

/* All modal children above the planet background ───────────────────────── */
.sf-topbar,
.sf-main {
  position: relative;
  z-index: 1;
}

/* ── Floating Controls (ersetzen den Header) ─────────────────────────────── */
.sf-corner-controls {
  position: absolute;
  /* sauber in die obere rechte Ecke gesetzt — der Inset räumt die
     abgerundete Modal-Ecke (--bottom-notch-r × --hud-scale) frei, sodass der
     Button klar an der Ecke sitzt statt in der Rundung zu kleben */
  top: 16px;
  right: 18px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ── Close-Button — großes Hauptsteuerelement in der Modal-Ecke ───────────── */
.sf-close-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 5px;
  /* gleicher Holz-Gold-Rahmen wie das Modal — doppelte Innenlinie gibt Tiefe */
  border: 2px solid #7a4e20;
  background: linear-gradient(to bottom, #241608, #140b04);
  color: #e8c040;
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 1px 0 rgba(232, 192, 64, 0.2),
    0 3px 10px rgba(0, 0, 0, 0.6);
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

/* ✕-Glyph separat — wächst sanft beim Hover (kein Rotieren) */
.sf-close-x {
  display: block;
  transition: transform 0.18s ease;
}

/* Hover: Button hebt sich leicht an, warmer Danger-Glow signalisiert
   "schließen", ✕ skaliert sanft */
.sf-close-btn:hover {
  border-color: #c85038;
  background: linear-gradient(to bottom, #3a1408, #200a04);
  color: #ff8f6a;
  transform: translateY(-2px);
  box-shadow:
    inset 0 0 0 1px #5c2410,
    inset 0 1px 0 rgba(255, 150, 110, 0.28),
    0 0 18px rgba(200, 70, 40, 0.5),
    0 6px 16px rgba(0, 0, 0, 0.7);
}

.sf-close-btn:hover .sf-close-x {
  transform: scale(1.12);
}

.sf-close-btn:focus-visible {
  outline: none;
  border-color: #e8c040;
  box-shadow:
    inset 0 0 0 1px #5c3310,
    0 0 0 2px rgba(232, 192, 64, 0.55),
    0 3px 10px rgba(0, 0, 0, 0.6);
}

.sf-close-btn:active {
  transform: translateY(0) scale(0.92);
}

/* Die vier Countdown-Ringe (Star-Despawn, Strike, Rage, Nova) sind die
   geteilte Komponente BossTimerRing.vue — Styles leben dort. */

/* ── Main Layout ──────────────────────────────────────────────────────────── */
.sf-main {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.sf-arena-wrap {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Arena füllt den ganzen Bereich — Boss steht mittig auf dem Planeten.
   padding-bottom hebt den Boss an, damit Loot, Champion-Row und der
   Sonnen-Horizont darunter Platz haben (auflösungsunabhängig) */
.sf-arena-wrap :deep(.arena) {
  flex: 1;
  min-height: 0;
  height: auto;
  aspect-ratio: auto;
  z-index: 1;
  padding-bottom: 18%;
}

/* Boss kompakter, damit Planet, Champion-Row UND der Sonnen-Horizont sichtbar
   bleiben. Das Vertikal-Budget der Arena ist von oben nach unten:
   HUD → Boss → Loot (51 %) → Champion-Row (~68–70 %) → Sonnen-Kamm (~89 %).
   Kompakte Full-HD-Größen siehe @media (max-height: 1100px) unten. */
.sf-arena-wrap :deep(.boss-img) {
  height: 40%;
  max-width: 40%;
}

/* Boden-Schatten der Arena aus — der Boss schwebt hier frei über dem
   Planeten, ein Kontakt-Schatten wirkt deplatziert */
.sf-arena-wrap :deep(.boss-ground-shadow) {
  display: none;
}

/* Bossname kommt jetzt oben ins HP-Overlay — Arena-eigenes Overlay ausblenden */
.sf-arena-wrap :deep(.boss-name-overlay) {
  display: none;
}

/* Arena-eigener Enrage-/Star-Ring aus — ersetzt durch die synchronen
   BossTimerRing-Countdowns links + rechts der HP-Bar */
.sf-arena-wrap :deep(.enrage-ring) {
  display: none;
}

/* Eckige Arc-Portraits + Mini-Curse-Badge der Arena aus — ersetzt durch das
   Role-Striker-Squad (Cooldown-Ringe) und die kompakte Curse-Marke */
.sf-arena-wrap :deep(.champ-arc) {
  display: none;
}

.sf-arena-wrap :deep(.arena-curse-badge) {
  display: none;
}

/* ── Loot-Banner — rahmenlos, zentriert unter dem Boss-Bild, im leeren Raum
   zwischen Boss und Champion-Row. Sitzt bewusst höher als früher: die Row
   ist zum Sonnen-Horizont hinaufgewandert und braucht den Platz darunter. ── */
.sf-loot {
  position: absolute;
  top: 51%;
  left: 50%;
  transform: translateX(-50%);
  width: min(820px, 54%);
  z-index: 2;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

/* ── Boss-Angriff: Lunge des Boss-Sprites + Schockwelle ──────────────────── */
/* Nur transform animieren — filter-Keyframes würden das große Boss-Sprite
   jede Frame neu rastern (FPS-Killer bei 1 Angriff/s) */
.sf-arena-wrap--strike :deep(.boss-img) {
  animation: sf-boss-strike 0.45s cubic-bezier(0.3, 0, 0.4, 1);
  transform-origin: 50% 85%;
  will-change: transform;
}

/* ── Auto-Attack-Jab: kurzer, schneller Stoß — deutlich leichter als der
   wuchtige Nova-Slam; Kontakt bei ~60 % (= BOSS_AUTO_HIT_DELAY_MS) ──────── */
.sf-arena-wrap--jab :deep(.boss-img) {
  animation: sf-boss-jab 0.3s cubic-bezier(0.3, 0, 0.4, 1);
  transform-origin: 50% 85%;
  will-change: transform;
}

/* ── Boss-Treffer-Reaktion: seitlicher Flinch + Weißblitz — bewusst kürzer
   und knackiger als der wuchtige Angriffs-Slam ───────────────────────────── */
.sf-arena-wrap--hit :deep(.boss-img) {
  animation: sf-boss-flinch 0.35s cubic-bezier(0.2, 0, 0.3, 1);
  transform-origin: 50% 85%;
  will-change: transform;
}

/* Schockwelle am Boss-Anker (50 % / 41 % — STRIKER_BOSS_ANCHOR_*_PCT).
   Arena-relativ dimensioniert: Endradius ≈ 50 % der Arena-Breite — der Ring
   überstreicht Champions UND Turret-Planeten auf jeder Auflösung. Bei ~62 %
   der Laufzeit (= BOSS_WAVE_HIT_DELAY_MS von BOSS_WAVE_TRAVEL_MS) passiert
   der Ring die Ziele — dort feuern Hit-Flash + Damage-Labels. */
/* FPS-freundlich: Element in FINALER Größe angelegt, Ring als radialer
   Verlauf statt border + box-shadow-Blur — so wird die Welle genau EINMAL
   gerastert und die Animation skaliert nur von klein auf 1 (GPU-Minify);
   das alte ×11-Hochskalieren eines 9%-Elements mit Blur-Schatten zwang den
   Browser mitten in der Animation zu teuren Re-Rastern der Blur-Layer */
.sf-boss-wave {
  position: absolute;
  left: 50%;
  top: 41%;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 0 40%,
    rgba(255, 90, 40, 0.3) 42.5%,
    rgba(255, 70, 40, 0.9) 45%,
    rgba(255, 120, 50, 0.45) 47.5%,
    transparent 51%
  );
  opacity: 0;
  pointer-events: none;
  z-index: 3;
  animation: sf-boss-wave-expand 0.8s cubic-bezier(0.16, 0.6, 0.4, 1) both;
  will-change: transform, opacity;
}

/* Nachzügler-Ring: dünner, minimal verzögert — gibt der Welle Tiefe */
.sf-boss-wave--echo {
  background: radial-gradient(
    circle,
    transparent 0 43%,
    rgba(255, 130, 60, 0.65) 45.5%,
    transparent 48.5%
  );
  animation-delay: 0.1s;
}

/* Abschuss-Blitz am Boss: kurzer heißer Kern im Moment des Slams */
.sf-boss-flare {
  position: absolute;
  left: 50%;
  top: 41%;
  width: 12%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 170, 100, 0.85) 0%,
    rgba(255, 70, 30, 0.45) 40%,
    transparent 70%
  );
  opacity: 0;
  pointer-events: none;
  z-index: 3;
  animation: sf-boss-flare 0.35s ease-out both;
  will-change: transform, opacity;
}

/* ── Eclipse: Boss hinter der Sonne — Silhouette + Korona-Schleier + Banner ── */
/* Boss wird zur dunklen Silhouette vor dem gleißenden Sonnenlicht */
.sf-arena-wrap--eclipsed :deep(.boss-img) {
  opacity: 0.35;
  filter: grayscale(85%) brightness(0.5);
  transition:
    opacity 0.4s ease,
    filter 0.4s ease;
}

/* Schleier über der Arena: dunkler Rand-Scrim + pulsierende Sonnen-Korona.
   z-index 2: über Arena/Boss (z1), unter HUD (z3) — Klicks gehen durch
   (pointer-events: none), landen auf dem Boss und zeigen dort "ECLIPSED" */
.sf-eclipse-veil {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
}

.sf-eclipse-scrim {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 41%,
    rgba(255, 190, 60, 0.08) 0%,
    rgba(8, 4, 0, 0.45) 55%,
    rgba(0, 0, 0, 0.68) 100%
  );
}

/* Korona am Boss-Anker (50 % / 41 % — wie Flare/Welle): nur opacity/transform
   animiert, der Verlauf wird EINMAL gerastert (FPS-freundlich) */
.sf-eclipse-corona {
  position: absolute;
  left: 50%;
  top: 41%;
  width: min(48%, 520px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 236, 170, 0.75) 0%,
    rgba(255, 200, 80, 0.4) 30%,
    rgba(232, 140, 30, 0.18) 52%,
    transparent 70%
  );
  animation: sf-eclipse-corona-pulse 2.4s ease-in-out infinite alternate;
  will-change: opacity;
}

/* Großes Eclipse-Medaillon mittig auf dem Boss (Anker 50 % / 41 % wie
   Flare/Welle) — Medaillon-Design identisch zu rsq-eclipse/tbh-eclipse,
   nur hochskaliert für das Boss-Sprite */
.sf-eclipse-medal {
  position: absolute;
  left: 50%;
  top: 41%;
  transform: translate(-50%, -50%);
  width: 92px;
  height: 92px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.95), rgba(10, 7, 3, 0.95));
  border: 3px solid #5c3310;
  box-shadow:
    0 0 0 2px rgba(200, 144, 64, 0.35),
    0 0 26px rgba(232, 192, 64, 0.35),
    0 4px 12px rgba(0, 0, 0, 0.7);
  color: #e8c040;
  pointer-events: none;
  animation: sf-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

.sf-eclipse-medal :deep(svg) {
  filter: drop-shadow(0 0 8px rgba(232, 192, 64, 0.55));
}

.sf-eclipse-fade-enter-active,
.sf-eclipse-fade-leave-active {
  transition: opacity 0.45s ease;
}

.sf-eclipse-fade-enter-from,
.sf-eclipse-fade-leave-to {
  opacity: 0;
}

.sf-atk-emblem--rage .sf-atk-num {
  color: #ffc4d4;
  -webkit-text-stroke: 1px rgba(110, 0, 30, 0.85);
  text-shadow:
    0 0 12px rgba(255, 70, 120, 0.95),
    0 0 30px rgba(255, 46, 99, 0.6),
    0 0 56px rgba(220, 20, 70, 0.35),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

.sf-atk-emblem--rage .sf-atk-unit {
  color: rgba(255, 140, 165, 0.75);
}

/* ── Attacker Squad — Halbkreis um den Boss (RoleStrikerSquad positioniert
   die Striker selbst auf dem Ellipsenbogen) ──────────────────────────────── */
.sf-squad {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

/* ── Fluch-Vignette: lila Rauch hüllt den inneren Modal-Rand ein ─────────
   Beide Layer werden einmal gerastert und nur per opacity/transform
   animiert — GPU-kompositiert, kein Repaint pro Frame */
.sf-curse-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  overflow: hidden;
  /* folgt der Innen-Rundung des Modals (Außenradius − 4px Holzrahmen) —
     sonst zeichnet der inset-Glow eckige Säume in die runden Ecken */
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1) - 4px);
}

.sf-curse-veil-layer {
  position: absolute;
  inset: 0;
}

/* Innerer Rand-Glow: dichter violetter Saum entlang aller vier Kanten */
.sf-curse-veil-layer--edge {
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1) - 4px);
  box-shadow:
    inset 0 0 70px 18px rgba(110, 25, 180, 0.5),
    inset 0 0 160px 40px rgba(80, 15, 140, 0.3);
  animation: sf-curse-veil-breathe 3.2s ease-in-out infinite alternate;
}

/* Rauchschwaden: weiche Nebelballen entlang der Kanten, driften langsam */
.sf-curse-veil-layer--smoke {
  inset: -4%;
  background:
    radial-gradient(42% 20% at 12% 0%, rgba(150, 50, 230, 0.34), transparent 70%),
    radial-gradient(50% 16% at 62% -2%, rgba(120, 30, 200, 0.3), transparent 70%),
    radial-gradient(20% 42% at 100% 28%, rgba(140, 40, 220, 0.3), transparent 70%),
    radial-gradient(18% 38% at 101% 74%, rgba(110, 25, 190, 0.28), transparent 70%),
    radial-gradient(48% 18% at 76% 102%, rgba(150, 50, 230, 0.32), transparent 70%),
    radial-gradient(44% 16% at 24% 101%, rgba(120, 30, 200, 0.3), transparent 70%),
    radial-gradient(18% 40% at -1% 66%, rgba(140, 40, 220, 0.3), transparent 70%),
    radial-gradient(20% 44% at -2% 22%, rgba(110, 25, 190, 0.28), transparent 70%);
  animation:
    sf-curse-veil-breathe 4.4s ease-in-out infinite alternate-reverse,
    sf-curse-veil-drift 9s ease-in-out infinite alternate;
  will-change: transform, opacity;
}

/* Dezente Fluch-Info oben im Rauch — reine Typo, kein Badge */
.sf-curse-veil-info {
  position: absolute;
  /* unter der Rage-Zeile — beide Effekte können gleichzeitig aktiv sein */
  top: 34px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #dcaaff;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow:
    0 0 14px rgba(190, 80, 255, 0.75),
    0 0 34px rgba(140, 40, 220, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

/* ── Rage-Vignette: glühender Crimson-Saum + Hitzeschlieren ──────────────
   Wie die Fluch-Vignette rein opacity/transform-animiert (GPU) */
.sf-rage-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  overflow: hidden;
  /* folgt der Innen-Rundung des Modals (Außenradius − 4px Holzrahmen) —
     sonst zeichnet der inset-Glow eckige Säume in die runden Ecken */
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1) - 4px);
}

.sf-rage-veil-layer {
  position: absolute;
  inset: 0;
}

.sf-rage-veil-layer--edge {
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1) - 4px);
  box-shadow:
    inset 0 0 70px 18px rgba(220, 30, 70, 0.45),
    inset 0 0 170px 44px rgba(160, 15, 45, 0.3);
  animation: sf-rage-veil-breathe 1.4s ease-in-out infinite alternate;
}

/* Hitzeschlieren: glühende Schwaden, unten dichter — der Boss "kocht" */
.sf-rage-veil-layer--flames {
  inset: -4%;
  background:
    radial-gradient(46% 22% at 18% 102%, rgba(255, 70, 40, 0.35), transparent 70%),
    radial-gradient(52% 20% at 58% 103%, rgba(255, 46, 99, 0.32), transparent 70%),
    radial-gradient(42% 18% at 90% 102%, rgba(255, 90, 30, 0.3), transparent 70%),
    radial-gradient(18% 40% at -2% 55%, rgba(255, 46, 99, 0.24), transparent 70%),
    radial-gradient(18% 40% at 102% 45%, rgba(255, 60, 60, 0.24), transparent 70%),
    radial-gradient(44% 16% at 40% -2%, rgba(220, 30, 70, 0.22), transparent 70%);
  animation:
    sf-rage-veil-breathe 1.9s ease-in-out infinite alternate-reverse,
    sf-rage-veil-drift 5s ease-in-out infinite alternate;
  will-change: transform, opacity;
}

.sf-rage-veil-info {
  position: absolute;
  top: 13px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #ffb0c4;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow:
    0 0 16px rgba(255, 46, 99, 0.85),
    0 0 38px rgba(255, 30, 80, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.curse-veil-fade-enter-active {
  transition: opacity 0.5s ease;
}

.curse-veil-fade-leave-active {
  transition: opacity 0.35s ease;
}

.curse-veil-fade-enter-from,
.curse-veil-fade-leave-to {
  opacity: 0;
}

/* ── Admin Kill Button ────────────────────────────────────────────────────── */
.sf-admin-kill-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #6a1818;
  background: linear-gradient(to bottom, #2a0808, #1a0404);
  color: #cc5040;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.sf-admin-kill-btn:hover {
  border-color: #cc3030;
  background: linear-gradient(to bottom, #3a0a0a, #220606);
  color: #e06050;
  box-shadow: 0 0 8px rgba(200, 40, 40, 0.35);
}

.sf-admin-kill-btn:active {
  transform: scale(0.95);
}

.sf-admin-kill-btn--flash {
  animation: admin-kill-flash 0.5s ease-out forwards;
}

/* ── Kompakt-Layout für Full-HD-Höhen (Viewport ≤ 1100px) ─────────────────
   Auf 1080p ist die Arena deutlich flacher als auf 1440p+ — HUD, Boss,
   Loot und Striker skalieren gemeinsam herunter, damit Boss, HP-Leiste
   und dmg/s-Anzeige nicht kollidieren. */
@media (max-height: 1100px) {
  .sf-arena-wrap :deep(.boss-img) {
    height: 44%;
    max-height: 360px;
    max-width: 42%;
  }

  .sf-atk-emblem {
    gap: 7px;
    padding: 5px 20px 6px;
  }

  .sf-atk-num {
    font-size: 1.35rem;
  }

  /* Loot-Banner als Block skalieren — Innenmaße leben in BossRewardSection */
  .sf-loot {
    transform: translateX(-50%) scale(0.8);
    transform-origin: top center;
  }

  /* Striker-Portraits kompakter — Positionen auf dem Bogen bleiben (%) */
  .sf-squad :deep(.rsq-item) {
    width: 76px;
    height: 76px;
  }

  .sf-squad :deep(.rsq-badge) {
    width: 24px;
    height: 24px;
  }

  .sf-squad :deep(.rsq-badge img) {
    width: 15px;
    height: 15px;
  }

  .sf-squad :deep(.rsq-cdpill) {
    min-width: 28px;
    font-size: 0.6rem;
  }

  /* Info-Plates der Champion-Row flacher: auf 1080p liegen zwischen Row und
     Sonnen-Kamm nur ~25 px — jede eingesparte Plate-Zeilenhöhe zählt hier */
  .sf-squad :deep(.rsq-plate-anchor) {
    top: calc(100% + 8px);
  }

  .sf-squad :deep(.sip) {
    padding: 3px 8px 4px;
  }

  .sf-squad :deep(.sip-hp-text) {
    font-size: 0.88rem;
  }

  .sf-squad :deep(.sip-name) {
    font-size: 0.66rem;
  }

  .sf-squad :deep(.sip-stats) {
    font-size: 0.56rem;
  }
}

/* ── Entrance Transition ──────────────────────────────────────────────────── */
.sf-entrance-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.sf-entrance-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.sf-entrance-enter-from,
.sf-entrance-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

@keyframes sf-shake {
  10%,
  90% {
    transform: translate(-2px, 0);
  }
  20%,
  80% {
    transform: translate(3px, 1px);
  }
  30%,
  50%,
  70% {
    transform: translate(-3px, -1px);
  }
  40%,
  60% {
    transform: translate(3px, 1px);
  }
}

@keyframes sf-ember-rise {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-40vh) translateX(12px) scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: translateY(-90vh) translateX(-8px) scale(0.3);
    opacity: 0;
  }
}

@keyframes modal-planet-glow {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 0.6;
  }
}

@keyframes sf-boss-strike {
  0% {
    transform: translateY(0) scale(1) rotate(0deg);
  }
  /* mächtig aufbäumen — hoch, groß, leicht zurückgelehnt */
  16% {
    transform: translateY(-20px) scale(1.14) rotate(-4deg);
  }
  /* Spannung halten, Gegenrotation */
  28% {
    transform: translateY(-24px) scale(1.18) rotate(3deg);
  }
  /* Slam nach unten — gestaucht */
  40% {
    transform: translateY(18px) scale(1.12, 0.86) rotate(0deg);
  }
  /* Abprall */
  52% {
    transform: translateY(6px) scale(0.96, 1.05);
  }
  /* Nachbeben */
  66% {
    transform: translateY(-5px) translateX(-3px) scale(1.03);
  }
  80% {
    transform: translateY(2px) translateX(2px) scale(0.99);
  }
  100% {
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

@keyframes sf-boss-jab {
  0% {
    transform: translateY(0) scale(1);
  }
  /* kurz zurücklehnen … */
  30% {
    transform: translateY(-11px) scale(1.08) rotate(-2.5deg);
  }
  /* … und zustoßen (Kontakt ≈ 60 % = BOSS_AUTO_HIT_DELAY_MS) */
  60% {
    transform: translateY(10px) scale(1.06, 0.92) rotate(1deg);
  }
  80% {
    transform: translateY(-3px) scale(0.99, 1.02);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes sf-boss-flinch {
  0% {
    transform: translateX(0) rotate(0deg) scale(1);
  }
  /* Einschlag: weggedrückt */
  18% {
    transform: translateX(-12px) rotate(-2.5deg) scale(0.96);
  }
  /* Gegenruck */
  45% {
    transform: translateX(8px) rotate(1.5deg) scale(1.01);
  }
  70% {
    transform: translateX(-3px) rotate(-0.5deg) scale(1);
  }
  100% {
    transform: translateX(0) rotate(0deg) scale(1);
  }
}

@keyframes sf-boss-wave-expand {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.011);
  }
  10% {
    opacity: 1;
  }
  /* 62 % = BOSS_WAVE_HIT_DELAY_MS: Ring passiert die Ziele — entspricht dem
     alten Look (scale 7.6 von 11 ≙ 0.69 der Endgröße) */
  62% {
    opacity: 0.85;
    transform: translate(-50%, -50%) scale(0.69);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes sf-boss-flare {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.4);
  }
  25% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
}

@keyframes sf-eclipse-corona-pulse {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

@keyframes sf-eclipse-breathe {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

@keyframes sf-curse-veil-breathe {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

@keyframes sf-curse-veil-drift {
  from {
    transform: scale(1) rotate(0.3deg);
  }
  to {
    transform: scale(1.05) rotate(-0.3deg);
  }
}

@keyframes sf-rage-veil-breathe {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

@keyframes sf-rage-veil-drift {
  from {
    transform: scale(1) rotate(-0.3deg);
  }
  to {
    transform: scale(1.06) rotate(0.3deg);
  }
}

@keyframes admin-kill-flash {
  0% {
    background: #cc3030;
    color: #fff;
    border-color: #ff5050;
    box-shadow: 0 0 14px rgba(220, 40, 40, 0.7);
  }
  100% {
    background: linear-gradient(to bottom, #2a0808, #1a0404);
    color: #cc5040;
    border-color: #6a1818;
    box-shadow: none;
  }
}
</style>
