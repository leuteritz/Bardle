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
          <button class="sf-close-btn" aria-label="Close" @click="handleClose">✕</button>
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

            <BossArenaSection
              v-if="activeBoss"
              disable-arc-attacks
              @shake="handleShake"
            />

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
            <div v-if="activeBoss" class="sf-hud">
              <!-- Planeten-Fortschritt des Sterns: wo stehe ich, wie viele gibt es -->
              <div v-if="planetProgress" class="sf-pp">
                <div class="sf-pp-bars" aria-hidden="true">
                  <span
                    v-for="i in planetProgress.total"
                    :key="i"
                    class="sf-pp-pip"
                    :class="{
                      'sf-pp-pip--cleared': i <= planetProgress.cleared,
                      'sf-pp-pip--current': i === planetProgress.current,
                    }"
                  />
                </div>
                <span class="sf-pp-label">
                  Planet
                  <span class="sf-pp-num">{{ planetProgress.current }}</span>
                  <span class="sf-pp-sep">/</span>
                  {{ planetProgress.total }}
                </span>
              </div>

              <span v-if="isGalaxyBoss" class="sf-boss-galaxy-badge">✦ GALAXY BOSS ✦</span>
              <div class="sf-name-row">
                <span class="sf-name-line" />
                <span class="sf-boss-name" :class="{ 'sf-boss-name--galaxy': isGalaxyBoss }">
                  {{ activeBoss.bossName }}
                </span>
                <span class="sf-name-line" />
              </div>

              <!-- Eclipse-Status: Boss steht hinter der Sonne — kein Kampf,
                   alle Fähigkeiten warten bei vollem Ring -->
              <Transition name="sf-callout">
                <div v-if="bossBehindSun" class="sf-eclipse-chip">
                  ✦ Behind the Sun — combat paused
                </div>
              </Transition>
              <div class="sf-hp-row">
                <!-- Star-Despawn-Ring: Restzeit, bis der Stern verschwindet -->
                <BossTimerRing
                  v-if="starSecsLeft !== null"
                  :secs="starSecsLeft"
                  label="SEC"
                  :pct="starTimePct / 100"
                  :color="starRingColor"
                  :pulse="starRingCritical"
                  title="Time until the star vanishes"
                />

                <div class="sf-hp-center">
                  <div
                    class="sf-hp-track"
                    :class="{
                      'sf-hp-track--critical': hpPct < 25,
                      'sf-hp-track--galaxy': isGalaxyBoss,
                    }"
                  >
                    <div class="sf-hp-ghost" :style="{ width: hpPct + '%' }" />
                    <div
                      class="sf-hp-fill"
                      :class="{
                        'sf-hp-fill--galaxy': isGalaxyBoss,
                        'sf-hp-fill--low': hpPct < 50 && !isGalaxyBoss,
                        'sf-hp-fill--critical': hpPct < 25,
                      }"
                      :style="{ width: hpPct + '%' }"
                    />
                    <div class="sf-hp-ticks" aria-hidden="true" />
                    <div class="sf-hp-inline">
                      <span class="sf-hp-numbers">
                        {{ formatNumber(activeBoss.currentHP) }}
                        <span class="sf-hp-sep">/</span>
                        {{ formatNumber(activeBoss.maxHP) }}
                      </span>
                      <span class="sf-hp-pct" :class="{ 'sf-hp-pct--critical': hpPct < 25 }">
                        {{ Math.round(hpPct) }}%
                      </span>
                    </div>
                  </div>

                  <!-- Strike-Ziel: kündigt an, wen der nächste Strike trifft -->
                  <Transition name="sf-callout" mode="out-in">
                    <div v-if="strikeNextTarget" :key="strikeNextTarget" class="sf-strike-next">
                      <span class="sf-strike-next-label">Next Strike</span>
                      <span class="sf-strike-next-arrow">→</span>
                      <span class="sf-strike-next-name">{{ strikeNextTarget }}</span>
                    </div>
                  </Transition>
                </div>

                <!-- Strike-Ring: Auto-Attack des Bosses — kurzer Cooldown,
                     trifft EIN zufälliges Ziel (Champion oder Turret) -->
                <BossTimerRing
                  :secs="autoSecsLeft"
                  label="STRIKE"
                  :pct="autoRingPct"
                  color="#d8d0c0"
                  :badge="`${autoDmgDisplay} dmg`"
                  title="Strike — the boss jabs one random living champion or turret planet"
                />

                <!-- Rage-Ring: Cooldown bis zur nächsten Rage bzw. Restdauer -->
                <BossTimerRing
                  :secs="rageSecsLeft"
                  label="RAGE"
                  :pct="rageRingPct"
                  :color="rageActive ? '#ff5c85' : '#ff2e63'"
                  :text-color="rageActive ? '#ffb0c4' : undefined"
                  :label-color="rageActive ? 'rgba(255, 120, 150, 0.85)' : undefined"
                  :pulse="rageActive"
                  :intense-glow="rageActive"
                  :badge="`×${BOSS_RAGE_DMG_MULT} dmg`"
                  badge-color="rgba(255, 92, 133, 0.75)"
                  :title="
                    rageActive
                      ? 'The boss is raging — double damage!'
                      : 'Time until the boss enrages'
                  "
                />

                <!-- Nova-Ring: Cooldown der Shock Nova — läuft synchron zum
                     Ring des Boss-Sterns im Idle-Orbit -->
                <BossTimerRing
                  :secs="novaSecsLeft"
                  label="NOVA"
                  :pct="novaRingPct"
                  color="#ff8a30"
                  :badge="`${novaDmgDisplay} dmg`"
                  title="Shock Nova — the boss unleashes a wave that hits every champion, every turret planet and the player"
                />
              </div>

            </div>


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
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore, CURSE_DEFS } from '@/stores/roleBehaviorStore'
import { formatNumber } from '@/config/numberFormat'
import {
  BOSS_REMOVAL_DELAY_MS,
  STAR_FIGHT_TIMER_WARNING_S,
  STAR_FIGHT_TIMER_CRITICAL_S,
  BOSS_CHAMPION_ATTACK_DPS,
  BOSS_GALAXY_CHAMPION_DPS_MULT,
  BOSS_WAVE_TRAVEL_MS,
  BOSS_NOVA_INTERVAL_MS,
  BOSS_AUTO_INTERVAL_MS,
  BOSS_AUTO_ATTACK_DAMAGE,
  BOSS_HIT_REACT_MS,
  STRIKER_PROJECTILE_FLIGHT_MS,
  BOSS_RAGE_DMG_MULT,
} from '@/config/constants'
import { NS, drawPlanet } from '@/utils/planetDraw'
import { bossPlanetInForeground } from '@/utils/foregroundGate'
import type { ChampionRole } from '@/types'
import BossArenaSection from '@/components/idle/planet/BossArenaSection.vue'
import RoleStrikerSquad from '@/components/idle/planet/RoleStrikerSquad.vue'
import BossRewardSection from '@/components/idle/planet/BossRewardSection.vue'
import PlanetBatteryHUD from '@/components/idle/planet/PlanetBatteryHUD.vue'
import BossTimerRing from '@/components/idle/planet/BossTimerRing.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'

// ── Stores ───────────────────────────────────────────────────────────────
const starGroupStore = useStarGroupStore()
const bossStore = usePlanetBossStore()
const battleStore = useBattleStore()
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
const activeBoss = computed(() => bossStore.activeBoss)
const isGalaxyBoss = computed(() => activeBoss.value?.isGalaxyBoss ?? false)
const hpPct = computed(() => Math.max(0, Math.min(100, bossStore.bossHPPercent)))

// ── Star-Despawn-Timer ────────────────────────────────────────────────────
const fightStar = computed(
  () => starGroupStore.activeStars.find((s) => s.id === starGroupStore.activeFightStarId) ?? null,
)

const starSecsLeft = computed<number | null>(() => {
  const s = fightStar.value
  if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return null
  return Math.max(0, Math.ceil((s.spawnedAt + s.durationMs - now.value) / 1000))
})

// Planeten-Fortschritt: Position des aktuellen Kampfs innerhalb des Sterns
const planetProgress = computed(() => {
  const s = fightStar.value
  if (!s || s.planetSlots.length === 0) return null
  const total = s.planetSlots.length
  const cleared = s.planetSlots.filter((p) => p.cleared).length
  return { total, cleared, current: Math.min(cleared + 1, total) }
})

const starTimePct = computed(() => {
  const s = fightStar.value
  if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return 0
  const remaining = (s.spawnedAt + s.durationMs - now.value) / s.durationMs
  return Math.max(0, Math.min(100, remaining * 100))
})

// Ampel-Zustand des Despawn-Rings: Gold → Warn-Orange → Kritisch-Rot (+Puls)
const starRingCritical = computed(
  () => starSecsLeft.value !== null && starSecsLeft.value <= STAR_FIGHT_TIMER_CRITICAL_S,
)

const starRingColor = computed(() => {
  if (starRingCritical.value) return '#ff5040'
  if (starSecsLeft.value !== null && starSecsLeft.value <= STAR_FIGHT_TIMER_WARNING_S)
    return '#e8a030'
  return '#e8c040'
})

// ── Curse ─────────────────────────────────────────────────────────────────
const activeCurse = computed(() => {
  const c = roleBehaviorStore.activeCurse
  if (!c || now.value >= c.activeUntil) return null
  if (roleBehaviorStore.cursedStarId !== starGroupStore.activeFightStarId) return null
  return c
})
const curseSecsLeft = computed(() =>
  activeCurse.value
    ? Math.max(0, Math.ceil((activeCurse.value.activeUntil - now.value) / 1000))
    : 0,
)
const curseDef = computed(() => (activeCurse.value ? CURSE_DEFS[activeCurse.value.type] : null))


// ── Boss-Rage: rechter Radial-Ring + epische Vignette ─────────────────────
const rageActive = computed(() => roleBehaviorStore.rageActiveUntil > now.value)

const rageSecsLeft = computed(() =>
  rageActive.value
    ? Math.max(0, Math.ceil((roleBehaviorStore.rageActiveUntil - now.value) / 1000))
    : Math.max(0, Math.ceil(roleBehaviorStore.rageCooldownMs / 1000)),
)

// Cooldown-Phase: Arc füllt sich zur Rage hin; aktive Phase: Arc läuft ab.
// Beide Phasen interpolieren aus Zeitstempeln (readyAt/activeUntil) — das
// 250ms-now + 0.2s-Transition füllt den Ring smooth statt in 1s-Stufen
const rageRingPct = computed(() => {
  if (rageActive.value) {
    const dur = roleBehaviorStore.rageDurationMs || 1
    return Math.max(0, Math.min(1, (roleBehaviorStore.rageActiveUntil - now.value) / dur))
  }
  if (roleBehaviorStore.rageReadyAt <= 0) return 0
  const interval = roleBehaviorStore.rageIntervalMs || 1
  return Math.max(0, Math.min(1, 1 - (roleBehaviorStore.rageReadyAt - now.value) / interval))
})

// ── Shock Nova: Cooldown-Ring (synchron zum Boss-Stern im Idle-Orbit) ────
// Zeitstempel-basiert wie der Star-Despawn-Ring — füllt smooth statt in
// 1s-Tick-Stufen
const novaSecsLeft = computed(() =>
  roleBehaviorStore.novaReadyAt > 0
    ? Math.max(0, Math.ceil((roleBehaviorStore.novaReadyAt - now.value) / 1000))
    : Math.ceil(BOSS_NOVA_INTERVAL_MS / 1000),
)

const novaRingPct = computed(() => {
  if (roleBehaviorStore.novaReadyAt <= 0) return 0
  return Math.max(
    0,
    Math.min(1, 1 - (roleBehaviorStore.novaReadyAt - now.value) / BOSS_NOVA_INTERVAL_MS),
  )
})

// ── Damage-Badges unter den Fähigkeits-Ringen ────────────────────────────
const autoDmgDisplay = computed(() =>
  Math.round(
    BOSS_AUTO_ATTACK_DAMAGE *
      (isGalaxyBoss.value ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1) *
      (rageActive.value ? BOSS_RAGE_DMG_MULT : 1),
  ),
)

const novaDmgDisplay = computed(() =>
  Math.round(
    BOSS_CHAMPION_ATTACK_DPS *
      (isGalaxyBoss.value ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1) *
      (rageActive.value ? BOSS_RAGE_DMG_MULT : 1) *
      (BOSS_NOVA_INTERVAL_MS / 1000),
  ),
)

// ── Strike (Auto-Attack): Cooldown-Ring + schneller Boss-Jab ─────────────
const autoSecsLeft = computed(() =>
  roleBehaviorStore.autoReadyAt > 0
    ? Math.max(0, Math.ceil((roleBehaviorStore.autoReadyAt - now.value) / 1000))
    : Math.ceil(BOSS_AUTO_INTERVAL_MS / 1000),
)

const autoRingPct = computed(() => {
  if (roleBehaviorStore.autoReadyAt <= 0) return 0
  return Math.max(
    0,
    Math.min(1, 1 - (roleBehaviorStore.autoReadyAt - now.value) / BOSS_AUTO_INTERVAL_MS),
  )
})

// Schneller Jab des Boss-Sprites bei jedem Auto-Attack + Info-Callout,
// welches Random-Ziel (Champion oder Planet) getroffen wurde
const bossJabActive = ref(false)
let bossJabTimeout: ReturnType<typeof setTimeout> | null = null

const ROLE_SLOT_INDEX: Record<ChampionRole, number> = {
  top: 0,
  jungle: 1,
  mid: 2,
  adc: 3,
  support: 4,
}

// ── Eclipse-Status: Boss hinter der Sonne? (250ms-Tick liest die 60fps-
// aktualisierte, nicht-reaktive Positions-Map) ───────────────────────────
const bossBehindSun = computed(() => {
  void now.value
  const boss = activeBoss.value
  if (!boss) return false
  return !bossPlanetInForeground(boss.planetId)
})

// Ziel-Ansage: zeigt permanent, welchen Gegner der NÄCHSTE Strike trifft —
// der Store würfelt das Ziel vorab aus (autoNextTarget*)
const strikeNextTarget = computed(() => {
  const role = roleBehaviorStore.autoNextTargetRole
  if (role) return battleStore.headerSlots[ROLE_SLOT_INDEX[role]] ?? role.toUpperCase()
  const slotId = roleBehaviorStore.autoNextTargetSlotId
  return slotId ? slotId.replace('slot_', 'Slot ') : null
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
  const star = starGroupStore.activeStars.find(
    (s) => s.id === starGroupStore.activeFightStarId,
  )
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
  border: 1px solid rgba(120, 60, 10, 0.55);
  border-radius: 5px;
  box-shadow:
    0 0 60px rgba(200, 80, 0, 0.22),
    0 0 120px rgba(140, 40, 0, 0.12),
    0 24px 80px rgba(0, 0, 0, 0.97);
  overflow: hidden;
}

.sf-modal--galaxy {
  border-color: rgba(120, 20, 160, 0.55);
  box-shadow:
    0 0 70px rgba(160, 40, 220, 0.26),
    0 0 130px rgba(100, 10, 140, 0.14),
    0 24px 80px rgba(0, 0, 0, 0.97);
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

@keyframes modal-planet-glow {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 0.6;
  }
}

/* All modal children above the planet background ───────────────────────── */
.sf-topbar,
.sf-main {
  position: relative;
  z-index: 1;
}

/* ── prefers-reduced-motion ───────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .sf-ember,
  .sf-modal-planet-bg--galaxy,
  .sf-hp-track--critical,
  .sf-pp-pip--current,
  .sf-curse-veil-layer--edge,
  .sf-curse-veil-layer--smoke,
  .sf-rage-veil-layer--edge,
  .sf-rage-veil-layer--flames,
  .sf-arena-wrap--strike :deep(.boss-img),
  .sf-arena-wrap--jab :deep(.boss-img),
  .sf-arena-wrap--hit :deep(.boss-img),
  .sf-boss-wave,
  .sf-boss-flare,
  .sf-eclipse-chip {
    animation: none;
  }
}

/* ── Floating Controls (ersetzen den Header) ─────────────────────────────── */
.sf-corner-controls {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sf-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid rgba(120, 60, 10, 0.55);
  background: rgba(16, 8, 0, 0.75);
  color: #c8a050;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.sf-close-btn:hover {
  border-color: rgba(200, 146, 42, 0.7);
  background: rgba(30, 16, 4, 0.9);
  color: #e8c040;
  box-shadow: 0 0 8px rgba(200, 146, 42, 0.3);
}

.sf-close-btn:active {
  transform: scale(0.94);
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
   padding-bottom hebt den Boss an, damit der Striker-Halbkreis komplett
   unterhalb des Boss-Bilds Platz hat (auflösungsunabhängig) */
.sf-arena-wrap :deep(.arena) {
  flex: 1;
  min-height: 0;
  height: auto;
  aspect-ratio: auto;
  z-index: 1;
  padding-bottom: 18%;
}

/* Boss kompakter, damit Planet + Striker-Halbkreis sichtbar bleiben.
   Kompakte Full-HD-Größen siehe @media (max-height: 1100px) unten. */
.sf-arena-wrap :deep(.boss-img) {
  height: 44%;
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

/* ── Ziel-HUD oben — rahmenlos, verdrängt keinen Platz ───────────────────── */
.sf-hud {
  position: absolute;
  /* nicht mehr am oberen Rand — sitzt auf Höhe der Star-Ringe, näher am Boss */
  top: 58px;
  left: 50%;
  transform: translateX(-50%);
  width: min(860px, 76%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

/* Ring — HP-Bar — Ring: eine Reihe, alle drei vertikal zentriert */
.sf-hp-row {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
}

/* Mittelspalte der HP-Zeile: Leiste + daran hängende Threat-Anzeige */
.sf-hp-row .sf-hp-center {
  position: relative;
  flex: 1;
  min-width: 0;
}

/* ── Planeten-Fortschritt — Segment-Pips + großes Label über der HP-Zeile ── */
.sf-pp {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sf-pp-bars {
  display: flex;
  gap: 6px;
}

.sf-pp-pip {
  width: 28px;
  height: 7px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(120, 60, 10, 0.55);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.7);
}

/* Geschafft: grün gefüllt — gleiche Signatur wie "kaufbar/aktiv" */
.sf-pp-pip--cleared {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border-color: #6ec040;
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.4);
}

/* Aktueller Planet: gold glühend, sanfter Puls */
.sf-pp-pip--current {
  background: linear-gradient(to bottom, #e8c060, #c89040);
  border-color: #e8c040;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.55);
  animation: sf-pp-current-pulse 1.4s ease-in-out infinite alternate;
}

@keyframes sf-pp-current-pulse {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

.sf-pp-label {
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(232, 192, 64, 0.85);
  white-space: nowrap;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.sf-pp-num {
  font-size: 1.35rem;
  color: #ffe9b0;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.6),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.sf-pp-sep {
  opacity: 0.5;
  margin: 0 2px;
}

.sf-boss-galaxy-badge {
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  color: rgba(200, 60, 255, 0.85);
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba(180, 40, 255, 0.5), 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Bossname zwischen dünnen HUD-Klammerlinien */
.sf-name-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
}

.sf-name-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.45));
}
.sf-name-line:last-child {
  background: linear-gradient(to left, transparent, rgba(232, 192, 64, 0.45));
}

.sf-boss-name {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #e8c040;
  text-transform: uppercase;
  text-shadow:
    0 0 18px rgba(232, 192, 64, 0.6),
    0 0 40px rgba(200, 130, 20, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.95);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 78%;
}

.sf-boss-name--galaxy {
  color: #dd99ff;
  text-shadow:
    0 0 18px rgba(200, 100, 255, 0.65),
    0 0 40px rgba(160, 50, 255, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

/* Werte leben jetzt IN der Leiste: Zahlen links, Prozent rechts */
.sf-hp-inline {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 14px;
}

.sf-hp-pct {
  font-size: 1.15rem;
  font-weight: 900;
  color: #ffe9b0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.sf-hp-pct--critical {
  color: #ffb0a8;
  text-shadow: 0 0 10px rgba(255, 60, 40, 0.7), 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Segment-Ticks alle 10 % — liest sich wie ein Raid-Boss-Balken */
.sf-hp-ticks {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(10% - 1px),
    rgba(0, 0, 0, 0.4) calc(10% - 1px),
    rgba(0, 0, 0, 0.4) 10%
  );
  pointer-events: none;
}

/* ── Loot-Banner — rahmenlos, zentriert unter dem Boss-Bild, im leeren
   Raum innerhalb des Striker-Halbkreises ─────────────────────────────────── */
.sf-loot {
  position: absolute;
  top: 57%;
  left: 50%;
  transform: translateX(-50%);
  width: min(820px, 54%);
  z-index: 2;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

/* ── Epische Boss-HP-Leiste — groß, segmentiert, Werte innenliegend ──────── */
.sf-hp-numbers {
  font-size: 1.05rem;
  font-weight: 900;
  color: #f4ead0;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 8px rgba(0, 0, 0, 0.7);
}

.sf-hp-sep {
  opacity: 0.45;
  margin: 0 4px;
}

.sf-hp-track {
  position: relative;
  width: 100%;
  height: 32px;
  border-radius: 4px;
  background: rgba(6, 3, 0, 0.78);
  border: 1px solid #5c3310;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.8),
    0 0 22px rgba(200, 130, 20, 0.18),
    0 4px 14px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

/* Critical-Puls über opacity eines Pseudo-Glows — animierter box-shadow
   würde die breite HP-Leiste jede Frame neu painten */
.sf-hp-track--critical {
  border-color: #8a2018;
}

.sf-hp-track--critical::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 4px;
  box-shadow: inset 0 0 18px rgba(220, 40, 40, 0.6);
  pointer-events: none;
  animation: sf-hp-crit-pulse 0.7s ease-in-out infinite alternate;
  z-index: 2;
}
.sf-hp-track--galaxy {
  border-color: #5a2478;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.8),
    0 0 22px rgba(160, 40, 220, 0.22),
    0 4px 14px rgba(0, 0, 0, 0.6);
}

@keyframes sf-hp-crit-pulse {
  from {
    opacity: 0.25;
  }
  to {
    opacity: 1;
  }
}

/* Ghost-Trail: heller Balken zieht dem echten HP-Stand verzögert hinterher */
.sf-hp-ghost {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(255, 235, 200, 0.3);
  transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.sf-hp-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(to bottom, #58c030 0%, #2e7a1a 55%, #236012 100%);
  transition: width 0.15s ease-out;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.28),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35);
}
.sf-hp-fill--low {
  background: linear-gradient(to bottom, #e8a030 0%, #c07018 55%, #8a5410 100%);
}
.sf-hp-fill--critical {
  background: linear-gradient(to bottom, #ff4030 0%, #c01818 55%, #801010 100%);
  box-shadow:
    0 0 16px rgba(220, 30, 30, 0.55),
    inset 0 2px 0 rgba(255, 140, 120, 0.3),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35);
}
.sf-hp-fill--galaxy {
  background: linear-gradient(to bottom, #c040f0 0%, #8010c0 55%, #58087a 100%);
  box-shadow:
    0 0 16px rgba(180, 40, 255, 0.5),
    inset 0 2px 0 rgba(230, 150, 255, 0.3),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35);
}

/* ── Boss-Angriff: Lunge des Boss-Sprites + Schockwelle ──────────────────── */
/* Nur transform animieren — filter-Keyframes würden das große Boss-Sprite
   jede Frame neu rastern (FPS-Killer bei 1 Angriff/s) */
.sf-arena-wrap--strike :deep(.boss-img) {
  animation: sf-boss-strike 0.45s cubic-bezier(0.3, 0, 0.4, 1);
  transform-origin: 50% 85%;
  will-change: transform;
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

/* ── Auto-Attack-Jab: kurzer, schneller Stoß — deutlich leichter als der
   wuchtige Nova-Slam; Kontakt bei ~60 % (= BOSS_AUTO_HIT_DELAY_MS) ──────── */
.sf-arena-wrap--jab :deep(.boss-img) {
  animation: sf-boss-jab 0.3s cubic-bezier(0.3, 0, 0.4, 1);
  transform-origin: 50% 85%;
  will-change: transform;
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

/* ── Boss-Treffer-Reaktion: seitlicher Flinch + Weißblitz — bewusst kürzer
   und knackiger als der wuchtige Angriffs-Slam ───────────────────────────── */
.sf-arena-wrap--hit :deep(.boss-img) {
  animation: sf-boss-flinch 0.35s cubic-bezier(0.2, 0, 0.3, 1);
  transform-origin: 50% 85%;
  will-change: transform;
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

/* ── Eclipse: Boss hinter der Sonne — gedimmt + Status-Chip ──────────────── */
.sf-arena-wrap--eclipsed :deep(.boss-img) {
  opacity: 0.5;
  filter: grayscale(55%);
  transition: opacity 0.4s ease, filter 0.4s ease;
}

.sf-eclipse-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(232, 192, 64, 0.75);
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
  animation: sf-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

@keyframes sf-eclipse-breathe {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

/* ── Strike-Ziel-Ansage unter der HP-Leiste: "STRIKE → NAME" — kurz,
   eindeutig, der Name als heller Held der Zeile ──────────────────────────── */
.sf-strike-next {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: baseline;
  gap: 9px;
  white-space: nowrap;
  pointer-events: none;
}

.sf-strike-next-label {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(216, 208, 192, 0.65);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.sf-strike-next-arrow {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgba(240, 228, 200, 0.55);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.sf-strike-next-name {
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff4d8;
  text-shadow:
    0 0 14px rgba(232, 220, 190, 0.7),
    0 0 30px rgba(216, 208, 192, 0.3),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.sf-callout-enter-active {
  animation: sf-callout-in 0.22s ease-out;
}

.sf-callout-leave-active {
  transition: opacity 0.3s ease;
}

.sf-callout-leave-to {
  opacity: 0;
}

@keyframes sf-callout-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(1.25);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
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
}

.sf-curse-veil-layer {
  position: absolute;
  inset: 0;
}

/* Innerer Rand-Glow: dichter violetter Saum entlang aller vier Kanten */
.sf-curse-veil-layer--edge {
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
}

.sf-rage-veil-layer {
  position: absolute;
  inset: 0;
}

.sf-rage-veil-layer--edge {
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
  transition: background 0.15s, border-color 0.15s, color 0.15s;
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

/* ── Kompakt-Layout für Full-HD-Höhen (Viewport ≤ 1100px) ─────────────────
   Auf 1080p ist die Arena deutlich flacher als auf 1440p+ — HUD, Boss,
   Loot und Striker skalieren gemeinsam herunter, damit Boss, HP-Leiste
   und dmg/s-Anzeige nicht kollidieren. */
@media (max-height: 1100px) {
  .sf-arena-wrap :deep(.boss-img) {
    height: 48%;
    max-height: 400px;
    max-width: 42%;
  }

  .sf-hud {
    top: 44px;
    gap: 5px;
    width: min(720px, 70%);
  }

  .sf-hp-row {
    gap: 12px;
  }

  /* Ring-Kompaktgrößen: siehe BossTimerRing.vue (eigene max-height-Query) */

  .sf-hp-track {
    height: 24px;
  }

  .sf-hp-inline {
    padding: 0 10px;
  }

  .sf-hp-numbers {
    font-size: 0.85rem;
  }

  .sf-hp-pct {
    font-size: 0.95rem;
  }

  .sf-boss-name {
    font-size: 1.35rem;
  }

  .sf-pp {
    gap: 10px;
  }

  .sf-pp-label {
    font-size: 0.85rem;
  }

  .sf-pp-num {
    font-size: 1.05rem;
  }

  .sf-pp-pip {
    width: 22px;
    height: 6px;
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
    transform: translateX(-50%) scale(0.85);
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
</style>
