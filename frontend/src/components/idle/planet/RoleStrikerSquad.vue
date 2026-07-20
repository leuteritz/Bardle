<template>
  <div ref="rootEl" class="rsq" aria-hidden="true">
    <!-- Halbkreis-Führungslinie hinter den Strikern -->
    <div class="rsq-arc-guide" :style="arcGuideStyle" />

    <!-- Unbesetzte Rollen: Geister-Platzhalter auf derselben Arc-Position —
         Klick öffnet den Team-Tab mit dem passenden Rollen-Slot -->
    <button
      v-for="v in vacantSlots"
      :key="`vacant-${v.role}`"
      type="button"
      class="rsq-item rsq-vacant"
      :title="`${v.label} – Select Champion`"
      :style="{
        '--rc': v.color,
        left: `${v.xPct}%`,
        top: `${v.yPct}%`,
      }"
      @click="openRolePicker(v.role)"
    >
      <div class="rsq-portrait rsq-vacant-portrait">
        <img class="rsq-vacant-emblem" :src="v.roleImage" alt="" draggable="false" />
      </div>
      <svg class="rsq-ring rsq-vacant-ring" viewBox="0 0 100 100">
        <circle class="rsq-vacant-ring-dash" cx="50" cy="50" r="44" />
      </svg>
      <div class="rsq-badge rsq-vacant-badge">
        <img :src="v.roleImage" alt="" draggable="false" />
      </div>
      <span class="rsq-cdpill rsq-vacant-pill">＋</span>
      <div class="rsq-vacant-plate">
        <span class="rsq-vacant-name">{{ v.label }} · Vacant</span>
        <span class="rsq-vacant-hint">Assign a champion</span>
      </div>
    </button>

    <div
      v-for="s in strikers"
      :key="s.role"
      class="rsq-item"
      :class="{
        'rsq-item--windup': windupRoles.has(s.role) && !firingRoles.has(s.role),
        'rsq-item--firing': firingRoles.has(s.role),
        'rsq-item--hit': hitRoles.has(s.role),
        'rsq-item--down': s.isDown,
      }"
      :style="{
        '--rc': s.color,
        '--ax': s.ax + 'px',
        '--ay': s.ay + 'px',
        left: `${s.xPct}%`,
        top: `${s.yPct}%`,
      }"
      :title="`${s.champion} (${roleLabel(s.role)}) – click to change`"
      @click="openRolePicker(s.role)"
    >
      <!-- Die komplette Rollen-Einheit (Portrait, Ring, Pill, Plate, Label,
           Muzzle) schnipst beim Angriff als Ganzes — Projektile und Floats
           bleiben außerhalb und fliegen unabhängig -->
      <div class="rsq-unit">
        <div class="rsq-portrait">
          <img
            :src="s.img"
            :alt="s.champion"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
        </div>
        <svg class="rsq-ring" viewBox="0 0 100 100">
          <circle class="rsq-ring-track" cx="50" cy="50" r="44" />
          <circle
            class="rsq-ring-arc"
            :class="{ 'rsq-ring-arc--full': s.secs === 0 && !s.isDown }"
            cx="50"
            cy="50"
            r="44"
            :style="{ strokeDasharray: s.dash }"
          />
        </svg>

        <!-- "Attack!"-Callout über die gesamte Choreografie (Windup + Schnips) -->
        <Transition name="rsq-atk">
          <span
            v-if="windupRoles.has(s.role) || firingRoles.has(s.role)"
            class="rsq-atk"
          >
            Attack!
          </span>
        </Transition>

        <!-- Down-Overlay: Champion liegt am Boden bis zum Revive -->
        <span v-if="s.isDown" class="rsq-down">{{ s.downSecs }}s</span>

        <!-- Cooldown-Pill am unteren Portraitrand -->
        <span v-if="!s.isDown" class="rsq-cdpill" :class="{ 'rsq-cdpill--ready': s.secs === 0 }">
          {{ s.secs }}s
        </span>

        <!-- Info-Plate: HP-Bar + Champion-Name + Schaden (geteilte Komponente) -->
        <div class="rsq-plate-anchor">
          <StrikerInfoPlate
            :color="s.color"
            :hp-pct="s.hpPct"
            :hp-text="s.isDown ? `DOWN ${s.downSecs}s` : `${s.hpCur} / ${s.hpMax}`"
            :hp-down="s.isDown"
            :name="s.champion"
            :stats="`${s.attackDamage} dmg`"
          />
        </div>

        <!-- Mündungsblitz Richtung Boss beim Abschuss -->
        <span
          v-if="muzzleRoles.has(s.role)"
          class="rsq-muzzle"
          :style="{ '--mx': s.mx + 'px', '--my': s.my + 'px' }"
        />
      </div>

      <!-- Projektile + Impacts dieses Strikers -->
      <template v-for="shot in shotsFor(s.role)" :key="shot.id">
        <span
          v-if="shot.phase === 'fly'"
          class="rsq-proj"
          :style="{ '--px': s.px + 'px', '--py': s.py + 'px', '--rot': s.rot + 'deg' }"
        />
        <span
          v-else
          class="rsq-impact"
          :style="{ transform: `translate(${s.px}px, ${s.py}px)` }"
        >
          <span class="rsq-impact-burst" />
          <span
            v-for="k in 6"
            :key="k"
            class="rsq-spark"
            :style="{ '--sx': SPARK_DIRS[k - 1].x + 'px', '--sy': SPARK_DIRS[k - 1].y + 'px' }"
          />
          <span class="rsq-impact-num">-{{ shot.value }}</span>
        </span>
      </template>

      <!-- Ticks der normalen Fähigkeit (Corruption-DoT) über dem Striker -->
      <TransitionGroup name="rsq-pop">
        <span
          v-for="f in floatsFor(s.role)"
          :key="f.id"
          class="rsq-float"
          :class="`rsq-float--${f.kind}`"
        >
          -{{ f.value }}
        </span>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { useUiStore } from '@/stores/uiStore'
import {
  ROLE_BY_KEY,
  ROLE_STAR_ATTACKS,
  ROLE_ADC_BURST_DAMAGE,
  ROLE_MID_CURSE_DOT_DPS,
  GAME_TICK_INTERVAL_MS,
  STRIKER_FLOAT_DURATION_MS,
  STRIKER_FLOAT_MAX,
  STRIKER_PROJECTILE_FLIGHT_MS,
  STRIKER_IMPACT_MS,
  STRIKER_FIRE_FLASH_MS,
  STRIKER_ARC_ANGLES,
  STRIKER_ARC_RX_PCT,
  STRIKER_ARC_RY_PCT,
  STRIKER_ARC_CENTER_Y_PCT,
  STRIKER_BOSS_ANCHOR_X_PCT,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  STRIKER_PROJECTILE_IMPACT_FRAC,
  STRIKER_ATTACK_LUNGE_PX,
  STRIKER_ATTACK_WINDUP_MS,
  STRIKER_MUZZLE_MS,
  BOSS_CHAMPION_ATTACK_DPS,
  BOSS_GALAXY_CHAMPION_DPS_MULT,
  BOSS_RAGE_DMG_MULT,
  CHAMPION_HIT_FLASH_MS,
} from '@/config/constants'
import type { ChampionRole } from '@/types'
import StrikerInfoPlate from '@/components/idle/planet/StrikerInfoPlate.vue'

const battleStore = useBattleStore()
const roleBehaviorStore = useRoleBehaviorStore()
const bossStore = usePlanetBossStore()
const starGroupStore = useStarGroupStore()
const uiStore = useUiStore()

// Klick auf einen Rollen-Slot: Fight-Modal schließen (liegt über dem
// Profil-Menü) und den Team-Tab direkt mit dem Rollen-Slot öffnen — gleiches
// Verhalten wie die Champion-Karten im Command Panel. Die Stern-ID wird als
// Battle-Return-Kontext gemerkt, damit das Profil-Modal einen großen
// "Return to Battle"-Button für den direkten Rücksprung anzeigen kann.
function openRolePicker(role: ChampionRole) {
  const starId = starGroupStore.activeFightStarId
  if (starId) uiStore.setBattleReturn(starId)
  starGroupStore.closeStarFightModal()
  uiStore.requestOpenRolesTab(SLOT_BY_ROLE[role])
}

function roleLabel(role: ChampionRole): string {
  return ROLE_BY_KEY[role].label
}

// r=44 im 100er-viewBox → Umfang 2πr (wie sf-star-ring im Modal)
const RING_CIRCUMFERENCE = 2 * Math.PI * 44

// headerSlots-Index je Rolle (SLOT_ROLES-Reihenfolge aus getOrbitingRoles)
const SLOT_BY_ROLE: Record<ChampionRole, number> = {
  top: 0,
  jungle: 1,
  mid: 2,
  adc: 3,
  support: 4,
}

const SQUAD_ROLES = Object.keys(ROLE_STAR_ATTACKS) as ChampionRole[]

// Funken-Richtungen für den Impact (fixe Streuung, kein Math.random pro Frame)
const SPARK_DIRS = [
  { x: 24, y: -8 },
  { x: 14, y: -22 },
  { x: -10, y: -24 },
  { x: -24, y: -6 },
  { x: -16, y: 18 },
  { x: 18, y: 16 },
]

// Arena-Größe in px — nötig für die Projektil-Flugvektoren (transform braucht px)
const rootEl = ref<HTMLDivElement | null>(null)
const arenaSize = ref({ w: 0, h: 0 })
let resizeObserver: ResizeObserver | null = null

// Sekundentakt für Down-Countdown (Store-Timestamps sind statisch)
const nowTick = ref(Date.now())

const strikers = computed(() =>
  SQUAD_ROLES.flatMap((role) => {
    const champion = battleStore.headerSlots[SLOT_BY_ROLE[role]]
    if (!champion) return []
    const def = ROLE_STAR_ATTACKS[role]
    const remaining = Math.max(0, roleBehaviorStore.roleAttackCooldownMs[role])
    // Ring-Zeitbasis um ZWEI Store-Ticks verschoben (die Pill um einen, siehe
    // secs unten): der Zielwert "voll" wird schon beim Flip auf "1s" gesetzt,
    // die 0.9s-Dasharray-Transition schließt damit exakt beim Erscheinen der
    // "0s" ab — der Ring steht dann komplett, danach kommt der Angriff
    const dispInterval = Math.max(1, def.intervalMs - 2000)
    const dispRemaining = Math.max(0, remaining - 2000)
    const readyFrac = Math.max(0, Math.min(1, 1 - dispRemaining / dispInterval))

    const hp = roleBehaviorStore.championHp[role]
    const downUntil = roleBehaviorStore.championDownUntil[role]
    const isDown = downUntil > nowTick.value

    // Position auf dem Halbkreis — in % der Arena, skaliert mit jeder Auflösung
    const rad = (STRIKER_ARC_ANGLES[role] * Math.PI) / 180
    const xPct = 50 + Math.cos(rad) * STRIKER_ARC_RX_PCT
    const yPct = STRIKER_ARC_CENTER_Y_PCT + Math.sin(rad) * STRIKER_ARC_RY_PCT

    // Flugvektor zum Boss-Anker in px (Impact kurz vor dem Boss)
    const { w, h } = arenaSize.value
    const px = Math.round(((STRIKER_BOSS_ANCHOR_X_PCT - xPct) / 100) * w * STRIKER_PROJECTILE_IMPACT_FRAC)
    const py = Math.round(((STRIKER_BOSS_ANCHOR_Y_PCT - yPct) / 100) * h * STRIKER_PROJECTILE_IMPACT_FRAC)
    const dist = Math.hypot(px, py) || 1

    return [
      {
        role,
        champion,
        img: battleStore.getChampionImage(champion),
        color: ROLE_BY_KEY[role].color,
        attackDamage: def.damage,
        // Der Store tickt sekündlich und setzt beim Feuern sofort auf das
        // volle Intervall zurück — der Rohwert erreicht sichtbar nie 0.
        // Um einen Tick verschoben zählt die Pill … 2, 1, 0 → Angriff.
        secs: Math.max(0, Math.ceil(remaining / 1000) - 1),
        dash: `${(readyFrac * RING_CIRCUMFERENCE).toFixed(1)} ${RING_CIRCUMFERENCE.toFixed(1)}`,
        hpPct: hp.max > 0 ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 100,
        hpCur: Math.round(hp.current),
        hpMax: hp.max,
        isDown,
        downSecs: isDown ? Math.ceil((downUntil - nowTick.value) / 1000) : 0,
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
        px,
        py,
        // Schweif zeigt der Flugrichtung entgegen
        rot: Math.round((Math.atan2(py, px) * 180) / Math.PI) + 90,
        // Mündungsblitz am Portraitrand Richtung Boss
        mx: Math.round((px / dist) * 52),
        my: Math.round((py / dist) * 52),
        // Angriffs-Lunge: Portrait stößt Richtung Boss vor
        ax: Math.round((px / dist) * STRIKER_ATTACK_LUNGE_PX),
        ay: Math.round((py / dist) * STRIKER_ATTACK_LUNGE_PX),
      },
    ]
  }),
)

// Unbesetzte Rollen — gleiche Arc-Position wie befüllte Striker, aber als
// Geister-Platzhalter ("Vacant"), damit sichtbar bleibt, dass hier ein
// Champion kämpfen könnte
const vacantSlots = computed(() =>
  SQUAD_ROLES.flatMap((role) => {
    if (battleStore.headerSlots[SLOT_BY_ROLE[role]]) return []
    const rad = (STRIKER_ARC_ANGLES[role] * Math.PI) / 180
    return [
      {
        role,
        label: ROLE_BY_KEY[role].label,
        roleImage: ROLE_BY_KEY[role].image,
        color: ROLE_BY_KEY[role].color,
        xPct: Math.round((50 + Math.cos(rad) * STRIKER_ARC_RX_PCT) * 10) / 10,
        yPct:
          Math.round((STRIKER_ARC_CENTER_Y_PCT + Math.sin(rad) * STRIKER_ARC_RY_PCT) * 10) / 10,
      },
    ]
  }),
)

// Halbkreis-Führungslinie (Ellipse, oberer Teil ausgeblendet) — reine %-Maße
const arcGuideStyle = computed(() => ({
  width: `${STRIKER_ARC_RX_PCT * 2}%`,
  height: `${STRIKER_ARC_RY_PCT * 2}%`,
  left: `${50 - STRIKER_ARC_RX_PCT}%`,
  top: `${STRIKER_ARC_CENTER_Y_PCT - STRIKER_ARC_RY_PCT}%`,
}))

// ── Projektile: Striker → Boss, dann Impact-Burst + Schadenszahl ─────────
interface StrikerShot {
  id: number
  role: ChampionRole
  value: number
  phase: 'fly' | 'hit'
}

const shots = ref<StrikerShot[]>([])
// windupRoles = Ausholphase: startet SOFORT, wenn die Pill "0s" zeigt (ein
// Store-Tick vor dem Feuern) — die Einheit zieht sich zurück und hält gespannt
const windupRoles = reactive(new Set<ChampionRole>())
// firingRoles = Schnips-Phase beim Store-Feuer: Vorstoß → Impact → Rückkehr
const firingRoles = reactive(new Set<ChampionRole>())
// muzzleRoles = Mündungsblitz im Schnips-Moment
const muzzleRoles = reactive(new Set<ChampionRole>())
let shotId = 0
const timeouts: number[] = []

function shotsFor(role: ChampionRole): StrikerShot[] {
  return shots.value.filter((s) => s.role === role)
}

function later(ms: number, fn: () => void) {
  timeouts.push(window.setTimeout(fn, ms))
}

function fireProjectile(role: ChampionRole, value: number) {
  // Windup endet, Schnips übernimmt nahtlos aus der gehaltenen Position
  windupRoles.delete(role)
  firingRoles.add(role)
  later(STRIKER_FIRE_FLASH_MS, () => firingRoles.delete(role))

  const id = ++shotId
  shots.value.push({ id, role, value, phase: 'fly' })
  muzzleRoles.add(role)
  later(STRIKER_MUZZLE_MS, () => muzzleRoles.delete(role))
  later(STRIKER_PROJECTILE_FLIGHT_MS, () => {
    const shot = shots.value.find((s) => s.id === id)
    if (shot) shot.phase = 'hit'
  })
  later(STRIKER_PROJECTILE_FLIGHT_MS + STRIKER_IMPACT_MS, () => {
    shots.value = shots.value.filter((s) => s.id !== id)
  })
}

const hasLiveBoss = computed(() => {
  const boss = bossStore.activeBoss
  return !!boss && !boss.defeated && !boss.expired
})

// Jeder Stern-Angriff (Shot-Counter aus dem Store) feuert ein Projektil
for (const role of SQUAD_ROLES) {
  watch(
    () => roleBehaviorStore.roleAttackShots[role],
    () => fireProjectile(role, ROLE_STAR_ATTACKS[role].damage),
  )
}

// Ausholen startet exakt mit der "0s"-Anzeige: der Cooldown betritt seine
// letzte Store-Sekunde — ein Tick später feuert der Store den Angriff
for (const role of SQUAD_ROLES) {
  watch(
    () => roleBehaviorStore.roleAttackCooldownMs[role],
    (ms) => {
      const champion = battleStore.headerSlots[SLOT_BY_ROLE[role]]
      const isDown = roleBehaviorStore.championDownUntil[role] > Date.now()
      if (
        ms > 0 &&
        ms <= STRIKER_ATTACK_WINDUP_MS &&
        champion &&
        !isDown &&
        hasLiveBoss.value
      ) {
        windupRoles.add(role)
      } else if (ms > STRIKER_ATTACK_WINDUP_MS) {
        windupRoles.delete(role)
      }
    },
  )
}

// ADC-Burst (normale Fähigkeit) fliegt als schwereres Projektil mit
watch(
  () => roleBehaviorStore.adcBurstActive,
  (active) => {
    if (active && hasLiveBoss.value) fireProjectile('adc', ROLE_ADC_BURST_DAMAGE)
  },
)

// ── Corruption-DoT: kleine Ticks über dem Mid-Striker ────────────────────
interface StrikerFloat {
  id: number
  role: ChampionRole
  value: number
  kind: 'dot' | 'hit'
}

const floats = ref<StrikerFloat[]>([])
let floatId = 0

function floatsFor(role: ChampionRole): StrikerFloat[] {
  return floats.value.filter((f) => f.role === role)
}

function pushFloat(role: ChampionRole, value: number, kind: StrikerFloat['kind']) {
  if (floats.value.length >= STRIKER_FLOAT_MAX) floats.value.shift()
  const id = ++floatId
  floats.value.push({ id, role, value, kind })
  later(STRIKER_FLOAT_DURATION_MS, () => {
    floats.value = floats.value.filter((f) => f.id !== id)
  })
}

// ── Boss-Treffer: Hit-Flash + rote Schadenszahl am Striker ───────────────
const hitRoles = reactive(new Set<ChampionRole>())

for (const role of SQUAD_ROLES) {
  watch(
    () => roleBehaviorStore.championHitAt[role],
    () => {
      hitRoles.delete(role)
      hitRoles.add(role)
      later(CHAMPION_HIT_FLASH_MS, () => hitRoles.delete(role))
      const boss = bossStore.activeBoss
      const raging = roleBehaviorStore.rageActiveUntil > Date.now()
      const dmg = Math.round(
        BOSS_CHAMPION_ATTACK_DPS *
          (boss?.isGalaxyBoss ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1) *
          (raging ? BOSS_RAGE_DMG_MULT : 1),
      )
      pushFloat(role, dmg, 'hit')
    },
  )
}

let dotInterval: number | null = null

onMounted(() => {
  dotInterval = window.setInterval(() => {
    nowTick.value = Date.now()
    if (roleBehaviorStore.activeCurse?.type === 'corruption' && hasLiveBoss.value) {
      pushFloat('mid', ROLE_MID_CURSE_DOT_DPS, 'dot')
    }
  }, GAME_TICK_INTERVAL_MS)

  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (rect) arenaSize.value = { w: rect.width, h: rect.height }
  })
})

// rootEl existiert erst, wenn v-if greift — Observer dann (re-)anbinden
watch(rootEl, (el, prev) => {
  if (prev && resizeObserver) resizeObserver.unobserve(prev)
  if (el && resizeObserver) {
    resizeObserver.observe(el)
    const rect = el.getBoundingClientRect()
    arenaSize.value = { w: rect.width, h: rect.height }
  }
})

onUnmounted(() => {
  if (dotInterval !== null) window.clearInterval(dotInterval)
  resizeObserver?.disconnect()
  resizeObserver = null
  timeouts.forEach(window.clearTimeout)
  timeouts.length = 0
})
</script>

<style scoped>
.rsq {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ── Halbkreis-Führungslinie — verbindet die Striker optisch ─────────────── */
.rsq-arc-guide {
  position: absolute;
  border: 1px dashed rgba(232, 192, 64, 0.22);
  border-radius: 50%;
  /* nur der untere Bogen: oberen Teil ausblenden */
  -webkit-mask: linear-gradient(to bottom, transparent 0 26%, #000 44%);
  mask: linear-gradient(to bottom, transparent 0 26%, #000 44%);
}

.rsq-item {
  position: absolute;
  width: 96px;
  height: 96px;
  transform: translate(-50%, -50%);
  /* klickbar trotz pointer-events: none auf .rsq — öffnet den Team-Tab
     mit dem Rollen-Slot (befüllt wie unbesetzt) */
  pointer-events: auto;
  cursor: pointer;
}

/* Hover auf befüllten Strikern: Portrait glüht stärker in Rollenfarbe */
.rsq-item:not(.rsq-vacant):hover .rsq-portrait {
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    0 0 24px color-mix(in srgb, var(--rc, #c8922a) 80%, transparent),
    0 5px 12px rgba(0, 0, 0, 0.7);
}

/* ── Portrait ────────────────────────────────────────────────────────────── */
.rsq-portrait {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--rc, #c8922a);
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    0 0 16px color-mix(in srgb, var(--rc) 55%, transparent),
    0 5px 12px rgba(0, 0, 0, 0.7);
}

.rsq-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}

/* ── Cooldown-Ring ───────────────────────────────────────────────────────── */
.rsq-ring {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  transform: rotate(-90deg);
}

.rsq-ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.09);
  stroke-width: 4;
}

/* Kein drop-shadow: der Arc transitioniert quasi durchgehend (0.9 s pro
   Sekundentick × 5 Ringe) — ein Filter würde die SVGs permanent neu rastern */
.rsq-ring-arc {
  fill: none;
  stroke: var(--rc, #c8922a);
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dasharray 0.9s linear, stroke 0.2s ease, stroke-width 0.2s ease;
}

/* Ring voll (0s): heller + dicker als Ready-Signal — bewusst ohne Filter,
   der Arc transitioniert quasi durchgehend (kein Rastern pro Frame) */
.rsq-ring-arc--full {
  stroke: color-mix(in srgb, var(--rc, #c8922a) 55%, #fff);
  stroke-width: 6;
}

/* ── Rollen-Badge (oben links) ───────────────────────────────────────────── */
.rsq-badge {
  position: absolute;
  top: -5px;
  left: -5px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #0c0803;
  border: 1.5px solid var(--rc, #c8922a);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 10px color-mix(in srgb, var(--rc, #c8922a) 55%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.7);
  z-index: 2;
}

.rsq-badge img {
  width: 19px;
  height: 19px;
  object-fit: contain;
}

/* ── Cooldown-Pill am unteren Portraitrand ───────────────────────────────── */
.rsq-cdpill {
  position: absolute;
  left: 50%;
  bottom: -9px;
  transform: translateX(-50%);
  min-width: 34px;
  padding: 2px 8px;
  border-radius: 9px;
  text-align: center;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--rc) 32%, #16100a),
    #0c0803
  );
  border: 1px solid color-mix(in srgb, var(--rc) 65%, #3a2410);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--rc) 35%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.75);
  font-size: 0.68rem;
  font-weight: 900;
  color: #f4ead0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  z-index: 3;
  transition: box-shadow 0.25s, border-color 0.25s;
}

/* Kurz vor dem Abschuss aufglühen — Puls über opacity (GPU), nicht box-shadow */
.rsq-cdpill--ready {
  border-color: var(--rc, #c8922a);
  color: #fff;
  box-shadow:
    0 0 14px color-mix(in srgb, var(--rc) 80%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.75);
  animation: rsq-cdpill-pulse 0.6s ease-in-out infinite alternate;
}

@keyframes rsq-cdpill-pulse {
  from {
    opacity: 0.72;
  }
  to {
    opacity: 1;
  }
}

/* Die Rollen-Einheit: füllt das Item, alle Kinder positionieren sich wie
   bisher — beim Angriff bewegt sich die gesamte Einheit gemeinsam */
.rsq-unit {
  position: absolute;
  inset: 0;
}

/* Zweiphasige Angriffs-Choreografie, nur transform (GPU):
   Phase 1 — Windup (1s = STRIKER_ATTACK_WINDUP_MS): startet exakt mit der
   "0s"-Anzeige; die Einheit zieht sich weich vom Boss zurück und hält die
   Spannung am Umkehrpunkt (fill: both friert die Endpose ein).
   Phase 2 — Schnips (0.55s = STRIKER_FIRE_FLASH_MS): beim Store-Feuer
   übernimmt der Vorstoß nahtlos aus der gehaltenen Pose. */
.rsq-item--windup .rsq-unit {
  animation: rsq-windup 1s cubic-bezier(0.35, 0, 0.25, 1) both;
  will-change: transform;
}

@keyframes rsq-windup {
  0% {
    transform: translate(0, 0) scale(1);
  }
  /* zügig weit zurückziehen … */
  62% {
    transform: translate(calc(var(--ax, 0px) * -0.88), calc(var(--ay, 0px) * -0.88)) scale(1.06);
  }
  /* … und die letzten Pixel ganz langsam in den Umkehrpunkt kriechen —
     wirkt wie angespanntes Zittern vor dem Schuss */
  100% {
    transform: translate(calc(var(--ax, 0px) * -0.95), calc(var(--ay, 0px) * -0.95)) scale(1.09);
  }
}

.rsq-item--firing .rsq-unit {
  animation: rsq-attack 0.55s linear both;
  will-change: transform;
}

@keyframes rsq-attack {
  /* Start = gehaltene Windup-Pose → kein Sprung beim Phasenwechsel */
  0% {
    transform: translate(calc(var(--ax, 0px) * -0.95), calc(var(--ay, 0px) * -0.95)) scale(1.09);
    animation-timing-function: cubic-bezier(0.7, 0, 0.3, 1);
  }
  /* Schnips: hart beschleunigt Richtung Boss vorschnellen */
  26% {
    transform: translate(calc(var(--ax, 0px) * 1.18), calc(var(--ay, 0px) * 1.18)) scale(1.12);
    animation-timing-function: cubic-bezier(0.2, 0.9, 0.35, 1);
  }
  /* Impact-Halt: weich abbremsen, kurz vorne stehen — der Schlag sitzt */
  46% {
    transform: translate(calc(var(--ax, 0px) * 1.02), calc(var(--ay, 0px) * 1.02)) scale(1.05);
    animation-timing-function: cubic-bezier(0.35, 0, 0.3, 1);
  }
  /* zurückfedern — einmal minimal über die Ruhelage hinaus */
  78% {
    transform: translate(calc(var(--ax, 0px) * -0.08), calc(var(--ay, 0px) * -0.08)) scale(0.99);
    animation-timing-function: cubic-bezier(0.3, 0, 0.45, 1);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

/* ── Boss-Treffer: Ruckeln (transform) + roter Overlay-Blitz (opacity) —
   beides GPU-kompositierbar, kein Filter-Rastern jede Sekunde ×5 ─────────── */
.rsq-item--hit .rsq-portrait {
  animation: rsq-boss-hit 0.45s ease-out;
}

@keyframes rsq-boss-hit {
  0%,
  100% {
    translate: 0 0;
  }
  30% {
    translate: -3px 1px;
  }
  55% {
    translate: 3px -1px;
  }
  80% {
    translate: -1px 0;
  }
}

.rsq-item--hit .rsq-portrait::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 90, 60, 0.6) 0%, rgba(255, 40, 20, 0.3) 65%, transparent 100%);
  animation: rsq-hitflash-fade 0.45s ease-out forwards;
  pointer-events: none;
}

@keyframes rsq-hitflash-fade {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ── Champion am Boden — ausgegraut bis zum Revive ───────────────────────── */
.rsq-item--down .rsq-portrait {
  filter: grayscale(1) brightness(0.5);
  border-color: #5a2020;
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    0 0 10px rgba(120, 20, 20, 0.5);
}

.rsq-item--down .rsq-ring-arc {
  stroke: #5a2020;
  filter: none;
}

.rsq-down {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  font-weight: 900;
  color: #ff6050;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 10px rgba(255, 60, 40, 0.8),
    0 1px 2px #000;
  z-index: 3;
}

/* ── Info-Plate unter dem Portrait — Karte selbst kommt aus der geteilten
   StrikerInfoPlate-Komponente, hier nur die Positionierung ───────────────── */
.rsq-plate-anchor {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
}

/* ── Vacant Slot — Geister-Platzhalter für unbesetzte Rollen ─────────────
   Gleiche Geometrie wie ein Striker, aber gedimmt: gestrichelter, langsam
   rotierender Ring, ausgegrautes Rollen-Emblem, pulsierendes ＋ und eine
   Plate mit "Assign a champion"-Hinweis */
.rsq-vacant {
  opacity: 0.82;
  background: none;
  border: none;
  padding: 0;
  transition: opacity 0.18s ease;
}

.rsq-vacant:hover {
  opacity: 1;
}

.rsq-vacant:hover .rsq-vacant-portrait {
  border-style: solid;
  border-color: color-mix(in srgb, var(--rc, #c8922a) 75%, #3a2410);
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    0 0 16px color-mix(in srgb, var(--rc, #c8922a) 45%, transparent),
    inset 0 0 22px rgba(0, 0, 0, 0.8),
    0 5px 12px rgba(0, 0, 0, 0.7);
}

.rsq-vacant:hover .rsq-vacant-emblem {
  /* Breathe-Animation aus, sonst überschreiben ihre Keyframes die Opacity */
  animation: none;
  opacity: 0.6;
  transform: scale(1.03);
}

.rsq-vacant:hover .rsq-vacant-ring-dash {
  stroke: color-mix(in srgb, var(--rc, #c8922a) 85%, transparent);
}

.rsq-vacant:hover .rsq-vacant-hint {
  opacity: 1;
  color: color-mix(in srgb, var(--rc, #c8922a) 45%, #fff);
}

.rsq-vacant:active {
  transform: translate(-50%, -50%) scale(0.96);
}

.rsq-vacant-portrait {
  border: 2px dashed color-mix(in srgb, var(--rc, #c8922a) 45%, #3a2410);
  background:
    radial-gradient(
      circle at 50% 42%,
      color-mix(in srgb, var(--rc, #c8922a) 10%, transparent) 0%,
      transparent 68%
    ),
    rgba(8, 5, 2, 0.72);
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    inset 0 0 22px rgba(0, 0, 0, 0.8),
    0 5px 12px rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Rollen-Emblem als geisterhafte Silhouette — "hier gehört jemand hin" */
.rsq-vacant-emblem {
  width: 46px;
  height: 46px;
  object-fit: contain;
  filter: grayscale(0.85) brightness(1.2);
  opacity: 0.32;
  animation: rsq-vacant-breathe 2.8s ease-in-out infinite alternate;
}

@keyframes rsq-vacant-breathe {
  from {
    opacity: 0.22;
    transform: scale(0.96);
  }
  to {
    opacity: 0.45;
    transform: scale(1.03);
  }
}

/* Gestrichelter Warte-Ring — rotiert langsam (nur transform, GPU) */
.rsq-vacant-ring {
  animation: rsq-vacant-spin 14s linear infinite;
  will-change: transform;
}

.rsq-vacant-ring-dash {
  fill: none;
  stroke: color-mix(in srgb, var(--rc, #c8922a) 55%, transparent);
  stroke-width: 3;
  stroke-dasharray: 7 11;
  stroke-linecap: round;
}

@keyframes rsq-vacant-spin {
  from {
    transform: rotate(-90deg);
  }
  to {
    transform: rotate(270deg);
  }
}

.rsq-vacant-badge {
  border-style: dashed;
  opacity: 0.75;
}

.rsq-vacant-badge img {
  filter: grayscale(0.6);
  opacity: 0.8;
}

/* ＋-Pill statt Cooldown — lädt zum Befüllen des Slots ein */
.rsq-vacant-pill {
  font-size: 0.8rem;
  line-height: 1;
  color: color-mix(in srgb, var(--rc, #c8922a) 55%, #fff);
  animation: rsq-vacant-pill-pulse 1.6s ease-in-out infinite alternate;
}

@keyframes rsq-vacant-pill-pulse {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

/* Eigenständige Vacant-Karte (gestrichelt, gedimmt) — bewusst ohne die
   geteilte StrikerInfoPlate, da es hier keine HP gibt */
.rsq-vacant-plate {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 96px;
  padding: 4px 10px 5px;
  border-radius: 4px;
  background: rgba(8, 5, 2, 0.82);
  border: 1px dashed color-mix(in srgb, var(--rc) 40%, #3a2410);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

.rsq-vacant-plate::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 4px 4px 0 0;
  opacity: 0.55;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--rc) 75%, #e8c060),
    transparent
  );
}

.rsq-vacant-name {
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: rgba(240, 230, 204, 0.6);
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

.rsq-vacant-hint {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--rc, #c8922a) 55%, #f0e6cc);
  opacity: 0.75;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

/* ── Mündungsblitz Richtung Boss ─────────────────────────────────────────── */
.rsq-muzzle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--rc, #c8922a) 40%, transparent 70%);
  transform: translate(var(--mx), var(--my));
  animation: rsq-muzzle 0.28s ease-out forwards;
  z-index: 3;
}

@keyframes rsq-muzzle {
  0% {
    opacity: 1;
    transform: translate(var(--mx), var(--my)) scale(0.4);
  }
  100% {
    opacity: 0;
    transform: translate(var(--mx), var(--my)) scale(1.5);
  }
}

/* ── Projektil: Komet in Rollenfarbe fliegt zum Boss ─────────────────────── */
.rsq-proj {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--rc, #c8922a) 45%, transparent 75%);
  box-shadow:
    0 0 12px var(--rc, #c8922a),
    0 0 26px color-mix(in srgb, var(--rc) 60%, transparent);
  animation: rsq-proj-fly 0.55s cubic-bezier(0.3, 0, 0.75, 0.5) forwards;
  will-change: transform, opacity;
  z-index: 3;
}

/* Schweif — entgegen der Flugrichtung rotiert */
.rsq-proj::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5px;
  height: 32px;
  transform: translate(-50%, -10%) rotate(var(--rot, 0deg));
  transform-origin: top center;
  border-radius: 3px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--rc) 85%, #fff),
    transparent
  );
  filter: blur(1px);
}

@keyframes rsq-proj-fly {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
  12% {
    opacity: 1;
    transform: translate(calc(var(--px) * 0.06), calc(var(--py) * 0.06)) scale(1);
  }
  100% {
    opacity: 1;
    transform: translate(var(--px), var(--py)) scale(1.1);
  }
}

/* ── Impact am Boss: Schockwelle + Funken + Schadenszahl ─────────────────── */
.rsq-impact {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  pointer-events: none;
}

.rsq-impact-burst {
  position: absolute;
  left: 50%;
  top: 0;
  width: 30px;
  height: 30px;
  margin-left: -15px;
  border-radius: 50%;
  border: 2px solid var(--rc, #c8922a);
  box-shadow:
    0 0 14px var(--rc, #c8922a),
    inset 0 0 10px color-mix(in srgb, var(--rc) 60%, transparent);
  animation: rsq-impact-burst 0.45s ease-out forwards;
}

@keyframes rsq-impact-burst {
  0% {
    opacity: 1;
    transform: scale(0.3);
  }
  100% {
    opacity: 0;
    transform: scale(1.7);
  }
}

.rsq-spark {
  position: absolute;
  left: 50%;
  top: 0;
  width: 4px;
  height: 4px;
  margin-left: -2px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--rc) 80%, #fff);
  box-shadow: 0 0 6px var(--rc, #c8922a);
  animation: rsq-spark-fly 0.5s ease-out forwards;
}

@keyframes rsq-spark-fly {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--sx), var(--sy)) scale(0.4);
  }
}

.rsq-impact-num {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  font-size: 1.3rem;
  font-weight: 900;
  color: #fff;
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  text-shadow: 0 0 12px var(--rc, #c8922a);
  white-space: nowrap;
  animation: rsq-impact-num 0.9s ease-out forwards;
}

@keyframes rsq-impact-num {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(4px) scale(0.8);
  }
  18% {
    opacity: 1;
    transform: translateX(-50%) translateY(-8px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-38px) scale(0.85);
  }
}

/* ── "Attack!"-Callout — knallt beim Abschuss über dem Portrait auf ──────── */
.rsq-atk {
  position: absolute;
  left: 50%;
  top: -34px;
  transform: translateX(-50%);
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--rc, #c8922a) 35%, #fff);
  -webkit-text-stroke: 3px rgba(10, 5, 0, 0.9);
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow:
    0 0 12px color-mix(in srgb, var(--rc, #c8922a) 75%, transparent),
    0 0 26px color-mix(in srgb, var(--rc, #c8922a) 40%, transparent),
    0 2px 3px rgba(0, 0, 0, 0.95);
  z-index: 4;
  pointer-events: none;
}

/* Slam-In: groß reinknallen, kurz überschwingen, stehen bleiben */
.rsq-atk-enter-active {
  animation: rsq-atk-slam 0.32s cubic-bezier(0.2, 1.4, 0.4, 1);
  will-change: transform, opacity;
}

.rsq-atk-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.rsq-atk-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

@keyframes rsq-atk-slam {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(2.1);
  }
  55% {
    opacity: 1;
    transform: translateX(-50%) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

/* ── DoT-Ticks über dem Striker (Corruption) ─────────────────────────────── */
.rsq-float {
  position: absolute;
  left: 50%;
  top: -14px;
  transform: translateX(-50%);
  font-size: 0.95rem;
  font-weight: 900;
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  white-space: nowrap;
  z-index: 3;
}

.rsq-float--dot {
  color: #d99bff;
  text-shadow: 0 0 12px #a030ff;
}

.rsq-float--hit {
  color: #ff7060;
  text-shadow: 0 0 12px #e03020;
}

.rsq-pop-enter-active {
  animation: rsq-float-up 1.4s ease-out forwards;
  will-change: transform, opacity;
}

.rsq-pop-leave-active {
  display: none;
}

@keyframes rsq-float-up {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateX(-50%) translateY(-4px) scale(1.15);
  }
  40% {
    transform: translateX(-50%) translateY(-18px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-52px) scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rsq-item--windup .rsq-unit,
  .rsq-item--firing .rsq-unit,
  .rsq-item--hit .rsq-portrait,
  .rsq-item--hit .rsq-portrait::after,
  .rsq-hp-fill--low,
  .rsq-cdpill--ready,
  .rsq-muzzle,
  .rsq-proj,
  .rsq-impact-burst,
  .rsq-spark,
  .rsq-impact-num,
  .rsq-pop-enter-active,
  .rsq-atk-enter-active,
  .rsq-vacant-emblem,
  .rsq-vacant-ring,
  .rsq-vacant-pill {
    animation: none;
  }
}
</style>
