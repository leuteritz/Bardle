<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { usePlanetShopStore, PLANET_ROLES, isPlanetDown } from '@/stores/world/planetShopStore'
import type { PlanetSlot } from '@/stores/world/planetShopStore'
import { PLANET_RESPAWN_MS } from '@/config/constants'
import { hpTier, hpPercentOf } from '@/utils/orbit/planetStatus'
import { displaySunPhase } from '@/composables/orbit/useSunPhaseDisplay'

const props = defineProps<{
  planet: PlanetSlot
  slotIndex: number
  selected: boolean
  /** Steht der Slot gerade hinter der Sonne? Kommt aus der rAF-Schleife des Tabs. */
  eclipsed: boolean
  /** Gemeinsamer Zeitstempel des Tabs (500 ms) — Basis aller Countdowns. */
  now: number
}>()

const emit = defineEmits<{ select: [slotId: string] }>()

const uiStore = useUiStore()
const store = usePlanetShopStore()

const down = computed(() => isPlanetDown(props.planet))

/**
 * Zerstört schlägt Eclipse: Ein Wrack ist gar nicht mehr im Orbit, "hinter der
 * Sonne" wäre die falsche Aussage — dieselbe Rangfolge wie auf der Bühne und im
 * Command Panel.
 */
const showEclipse = computed(() => props.eclipsed && !down.value)

const buffSecsLeft = computed(() => {
  const jb = props.planet.jungleBuff
  if (!jb?.active) return 0
  return Math.max(0, Math.ceil((jb.activeUntil - props.now) / 1000))
})

const downSecsLeft = computed(() =>
  Math.max(0, Math.ceil((props.planet.downUntilMs - props.now) / 1000)),
)

/** Anteil der bereits abgelaufenen Ausfallzeit (0 … 1) — füllt den Respawn-Balken. */
const downProgress = computed(() => {
  if (!down.value) return 0
  const remaining = Math.max(0, props.planet.downUntilMs - props.now)
  return Math.max(0, Math.min(1, 1 - remaining / PLANET_RESPAWN_MS))
})

const hpPct = computed(() => Math.round(hpPercentOf(props.planet.currentHp, props.planet.maxHp)))
const hpState = computed(() => hpTier(props.planet.currentHp, props.planet.maxHp))

/** Wie viele Level dieser Slot gerade bezahlen kann — treibt das Notify-Badge. */
const upgradeCount = computed(() => {
  if (!props.planet.purchased || !props.planet.role) return 0
  return store.getMaxAffordableLevelCount(props.planet.id)
})

const affordable = computed(
  () => !props.planet.purchased && store.canUnlockPlanetSlot(props.slotIndex),
)
const requiredPhase = computed(() => displaySunPhase(store.getSlotRequiredPhase(props.slotIndex)))
</script>

<template>
  <button
    class="ps-slot-btn"
    :class="{
      'ps-slot-btn--active': selected,
      'ps-slot-btn--affordable': affordable,
      'ps-slot-btn--cant-afford': !planet.purchased && !affordable,
      'ps-slot-btn--buffed': planet.jungleBuff?.active,
      'ps-slot-btn--down': down,
      'ps-slot-btn--eclipsed': showEclipse,
    }"
    :style="planet.role ? { '--rc': PLANET_ROLES[planet.role].color } : {}"
    @click="emit('select', planet.id)"
    @mouseenter="uiStore.setHoveredPlanetSlotId(planet.id)"
    @mouseleave="uiStore.setHoveredPlanetSlotId(null)"
    @focus="uiStore.setHoveredPlanetSlotId(planet.id)"
    @blur="uiStore.setHoveredPlanetSlotId(null)"
  >
    <!-- Jungle buff aura + modern RPG buff medallion — pinned top-LEFT so it
         never collides with the notify badge (top-right). Overlay only → no
         layout shift. -->
    <span v-if="planet.jungleBuff?.active" class="ps-slot-buff-ring" aria-hidden="true" />
    <span v-if="planet.jungleBuff?.active" class="ps-slot-buff-badge">
      <span class="ps-slot-buff-emblem">
        <img class="ps-slot-buff-leaf" src="/img/roles/jungle-128.png" alt="Jungle buff" />
      </span>
      <span class="ps-slot-buff-mult">×{{ planet.jungleBuff.multiplier }}</span>
      <span class="ps-slot-buff-timer">{{ buffSecsLeft }}s</span>
    </span>

    <!-- Affordable-upgrade notify badge — pinned top-RIGHT so it never
         collides with the jungle-buff medallion (top-left); shows the count
         of levels this planet can afford right now. -->
    <span
      v-if="upgradeCount > 0"
      class="ps-slot-notify"
      :aria-label="`${upgradeCount} upgrade(s) affordable`"
      >{{ upgradeCount }}</span
    >

    <!-- Selection caret — a role-colored gem on the rail's inner edge that
         points at the detail panel, so "which orbit am I looking at" reads
         at a glance without a heavy 2px border swap (which would shift the
         card's inner layout by a pixel). -->
    <span v-if="selected" class="ps-slot-caret" aria-hidden="true" />

    <div class="ps-slot-icon">
      <template v-if="!planet.purchased">
        <span class="ps-slot-btn-lock">
          <img src="/img/lock-256.png" alt="Locked" class="lock-icon" />
        </span>
      </template>
      <template v-else>
        <img v-if="planet.role" :src="PLANET_ROLES[planet.role].image" class="ps-slot-btn-img" alt="" />
        <span v-else class="ps-slot-btn-placeholder">＋</span>
        <!-- Zerstört: Wrack-Emblem legt sich über das Planetenbild -->
        <span v-if="down" class="ps-slot-down-emblem" aria-hidden="true">
          <Icon icon="game-icons:fragmented-meteor" width="30" height="30" />
        </span>
        <!-- Hinter der Sonne: dasselbe Medaillon wie auf der Bühne und im
             Command Panel, aus derselben Positions-Map im selben Frame —
             bewusst ohne Transition, damit es exakt mit den anderen beiden
             umschaltet. Es steht auf dem PLANETEN, nicht in der Kachelmitte:
             dort liefe es quer durch den Rollennamen, und die Aussage über die
             ganze Kachel trägt ohnehin der Schleier. Über den Schleier hebt es
             allein sein z-index — .ps-slot-icon eröffnet keinen eigenen
             Stapelkontext (position: relative, z-index: auto), der Wert zählt
             also gegen den der Kachel. -->
        <span
          v-else-if="showEclipse"
          class="ps-slot-eclipse-emblem"
          title="Behind the Sun — out of reach"
        >
          <Icon icon="game-icons:eclipse-flare" width="32" height="32" />
        </span>
      </template>
    </div>

    <div class="ps-slot-info">
      <div class="ps-slot-info-head">
        <span class="ps-slot-btn-label">Orbit {{ planet.id.replace('slot_', '') }}</span>
        <span v-if="planet.purchased && planet.role" class="ps-slot-lvl-badge"> Lv {{ planet.level }} </span>
      </div>
      <template v-if="!planet.purchased">
        <span class="ps-slot-phase-badge">
          <Icon icon="ph:sun-fill" width="16" height="16" />
          Phase {{ requiredPhase }}
        </span>
      </template>
      <template v-else>
        <span class="ps-slot-sub" :style="planet.role ? { color: PLANET_ROLES[planet.role].color } : {}">
          {{ planet.role ? PLANET_ROLES[planet.role].name : 'No role yet' }}
        </span>
        <!-- Zerstört: Der Respawn-Balken ersetzt die HP-Leiste — eine
             0-%-HP-Anzeige würde nur wie ein Sonderfall aussehen, statt
             die eigentliche Information zu zeigen: wann er zurückkommt. -->
        <div v-if="down" class="ps-slot-down">
          <div class="ps-slot-down-track">
            <div class="ps-slot-down-fill" :style="{ width: downProgress * 100 + '%' }" />
          </div>
          <span class="ps-slot-down-val">{{ downSecsLeft }}s</span>
        </div>
        <div v-else-if="planet.maxHp > 0" class="ps-slot-hp" :class="`ps-slot-hp--${hpState}`">
          <div class="ps-slot-hp-track">
            <div class="ps-slot-hp-fill" :style="{ width: hpPct + '%' }" />
          </div>
          <span class="ps-slot-hp-val">{{ hpPct }}%</span>
        </div>
      </template>
    </div>

    <!-- Der Zustand gilt der GANZEN Kachel, nicht nur ihrem Planetenbild: der
         Schleier legt sich über Bild, Beschriftung, Plakette und Leiste. -->
    <span v-if="showEclipse" class="ps-slot-eclipse-veil" aria-hidden="true" />
  </button>
</template>

<style scoped>
/* ── Slot rail buttons (horizontal cards, fill full height) ─────────────────── */
/* container-type: size lets the card's own content scale with its height/width
   (cqh/cqw) so every slot uses its full box on Full HD → 4K alike. */
.ps-slot-btn {
  position: relative;
  container-type: size;
  display: flex;
  flex: 1 1 0;
  min-height: clamp(64px, 9vh, 140px);
  flex-direction: row;
  align-items: center;
  gap: clamp(10px, 0.8vw, 18px);
  padding: clamp(8px, 1.2vh, 18px) clamp(10px, 0.8vw, 18px);
  /* room for the accent rail on the card's OUTER edge — the rail sits right */
  padding-right: clamp(15px, 1vw, 24px);
  min-width: 0;
  text-align: left;
  /* Translucent card — it now sits on the rail's own deep base rather than on
     the starfield, which lands it near the profile's item-row tone (#1c1c18)
     without a second colour to keep in sync. */
  background: linear-gradient(150deg, rgba(32, 27, 17, 0.82) 0%, rgba(13, 11, 7, 0.88) 100%);
  border: 1px solid #2e2416;
  border-radius: var(--bp-radius);
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(232, 192, 64, 0.06);
  cursor: pointer;
  color: inherit;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

/* Outer accent rail — always present in the planet's role color (dim), so every
   card carries its identity at rest and only intensifies on hover/active. It
   rides the card's OUTER edge (right, since the rail sits right), leaving the
   inner one free for the selection caret — both on one edge would overlap. */
.ps-slot-btn::before {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--rc, #3a2c12);
  border-radius: 0 var(--bp-radius) var(--bp-radius) 0;
  opacity: 0.4;
  transition:
    opacity 180ms ease,
    box-shadow 180ms ease;
  pointer-events: none;
}

.ps-slot-btn:hover::before {
  opacity: 0.8;
}

.ps-slot-btn--active::before {
  opacity: 1;
  box-shadow: 0 0 12px var(--rc, #e8c040);
}

/* Selection caret — role-colored gem straddling the card's inner edge (left,
   pointing at the stage) */
.ps-slot-caret {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: -1px;
  width: 13px;
  height: 13px;
  transform: translate(-50%, -50%) rotate(45deg);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--rc, #52b830) 88%, white) 0%,
    var(--rc, #52b830) 100%
  );
  border-radius: 3px;
  box-shadow: 0 0 12px color-mix(in srgb, var(--rc, #52b830) 60%, transparent);
  pointer-events: none;
}

.ps-slot-icon {
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

/* Role-colored halo behind the planet — gives the bare sprite a light source and
   ties the card to its role without another frame. Slots without a role resolve
   --rc to transparent, so the halo simply doesn't exist there. */
.ps-slot-icon::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 155%;
  height: 155%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--rc, transparent) 34%, transparent) 0%,
    transparent 68%
  );
  opacity: 0.65;
  pointer-events: none;
  transition: opacity 180ms ease;
}

.ps-slot-btn:hover .ps-slot-icon::before,
.ps-slot-btn--active .ps-slot-icon::before {
  opacity: 1;
}

.ps-slot-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(4px, 0.6vh, 9px);
  min-width: 0;
  flex: 1;
}

/* Header row: orbit label on the left, level badge pushed right */
.ps-slot-info-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.ps-slot-lvl-badge {
  flex-shrink: 0;
  padding: 2px clamp(6px, 0.5vw, 11px);
  font-size: clamp(0.66rem, 0.95vh, 0.86rem);
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1.35;
  color: #ffe9a8;
  background: linear-gradient(to bottom, #3a2a10, #241806);
  border: 1px solid #5c3310;
  border-radius: 4px;
  white-space: nowrap;
}

.ps-slot-btn--active .ps-slot-lvl-badge {
  color: #fff2c8;
  border-color: var(--rc, #6ec040);
  box-shadow: 0 0 8px color-mix(in srgb, var(--rc, #6ec040) 40%, transparent);
}

.ps-slot-sub {
  font-size: clamp(0.95rem, 1.25vh, 1.3rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(212, 174, 96, 0.9);
  /* readable over the starfield showing through the translucent card */
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
}

.ps-slot-btn:hover {
  background: linear-gradient(150deg, rgba(44, 37, 23, 0.86) 0%, rgba(18, 15, 9, 0.9) 100%);
  border-color: #5c3310;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(232, 192, 64, 0.12);
  transform: translateY(-1px);
}

.ps-slot-btn:focus-visible {
  outline: none;
  border-color: #e8c040;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.85),
    0 0 12px rgba(232, 192, 64, 0.4);
}

/* Active: the border stays 1px (a 2px swap would shift the whole card's inner
   layout by a pixel on every selection) — the "selected" weight comes from a
   role-tinted wash, a ring shadow and the caret on the inner edge. */
.ps-slot-btn--active {
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--rc, #52b830) 16%, rgba(20, 17, 11, 0.9)) 0%,
    rgba(12, 11, 7, 0.92) 72%
  );
  border-color: var(--rc, #52b830);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rc, #52b830) 45%, transparent),
    0 0 20px color-mix(in srgb, var(--rc, #52b830) 30%, transparent),
    inset 0 0 24px color-mix(in srgb, var(--rc, #52b830) 12%, transparent);
}

.ps-slot-btn--active:hover {
  transform: translateY(-1px);
}

/* ── Per-slot affordable-upgrade notify badge (top-right, clear of buff) ─────── */
.ps-slot-notify {
  position: absolute;
  top: -7px;
  right: -7px;
  z-index: 3;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  color: #06301f;
  background: linear-gradient(135deg, #34d399, #059669);
  border: 1.5px solid #6ee7b7;
  border-radius: 9px;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.65);
  pointer-events: none;
  animation: ps-buy-badge-pulse 1.6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ps-slot-notify {
    animation: none;
  }
}

/* ── Sidebar jungle-buff highlight — prominent, overlay-only (no layout shift) ── */
.ps-slot-btn--buffed {
  background: linear-gradient(150deg, rgba(20, 40, 18, 0.86) 0%, rgba(10, 20, 10, 0.9) 100%);
  border-color: #5ce66a;
  animation: ps-buff-pulse 1.8s ease-in-out infinite;
}

/* Buff overrides the active border colour but keeps the buff language */
.ps-slot-btn--buffed.ps-slot-btn--active {
  border-color: #5ce66a;
}

/* Animated aura ring drawn over the button edge */
.ps-slot-buff-ring {
  position: absolute;
  inset: 0;
  border: 2px solid #5ce66a;
  border-radius: var(--bp-radius);
  pointer-events: none;
  box-shadow:
    0 0 14px #5ce66a55,
    inset 0 0 10px #5ce66a22;
  animation: ps-slot-buff-ring 1.8s ease-in-out infinite;
}

/* Modern RPG buff medallion — pinned to the slot's top-LEFT, overlapping the
   edge (opposite corner from the notify badge → never collide). Flat dark green
   pill with a framed leaf emblem, glowing multiplier and a segmented timer. */
.ps-slot-buff-badge {
  position: absolute;
  top: -9px;
  left: -8px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px 2px 2px;
  background: linear-gradient(135deg, #16281a 0%, #0a130c 100%);
  border: 1px solid #4aa050;
  border-radius: 5px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.55),
    0 0 10px #5ce66a44,
    inset 0 1px 0 #5ce66a33;
  pointer-events: none;
}

/* Framed leaf emblem — a compact medallion inside the pill */
.ps-slot-buff-emblem {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  background: radial-gradient(circle at 50% 38%, #1c3a20 0%, #0a150c 100%);
  border: 1px solid #3a8040;
  border-radius: 4px;
  box-shadow: inset 0 0 6px #5ce66a33;
}

.ps-slot-buff-leaf {
  width: 18px;
  height: 18px;
  object-fit: contain;
  image-rendering: auto;
  filter: drop-shadow(0 0 3px #5ce66aaa);
}

.ps-slot-buff-mult {
  font-size: 0.92rem;
  font-weight: 900;
  color: #7cf089;
  text-shadow: 0 0 6px #5ce66a66;
  line-height: 1;
}

.ps-slot-buff-timer {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #bdf0a8;
  background: #0a150c;
  border: 1px solid #2a5a2e;
  border-radius: 3px;
  padding: 1px 4px;
  line-height: 1.4;
}

/* Planet image — bare planet, no frame/token; scales with the card box (height
   & width), capped so it never crowds the text on a narrow rail nor balloons. */
.ps-slot-btn-img {
  position: relative;
  width: clamp(48px, min(62cqh, 36cqw), 108px);
  height: clamp(48px, min(62cqh, 36cqw), 108px);
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
}

.ps-slot-btn--active .ps-slot-btn-img {
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--rc, #52b830) 45%, transparent));
}

.ps-slot-btn-placeholder {
  width: clamp(40px, min(52cqh, 30cqw), 92px);
  height: clamp(40px, min(52cqh, 30cqw), 92px);
  display: grid;
  place-items: center;
  font-size: clamp(1.6rem, 6cqh, 2.6rem);
  line-height: 1;
  color: rgba(90, 142, 224, 0.4);
  border-radius: 50%;
  border: 1px dashed rgba(90, 142, 224, 0.3);
  background: radial-gradient(circle at 50% 38%, #14140e 0%, #0c0a06 100%);
}

.ps-slot-btn-label {
  font-size: clamp(0.88rem, 1.15vh, 1.2rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(206, 168, 92, 0.85);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.ps-slot-btn--active .ps-slot-btn-label {
  color: var(--rc, #52b830);
}

/* ── Rail slot HP — modern segmented bar with health-state color ───────────── */
.ps-slot-hp {
  --hp-a: #2f9a24;
  --hp-b: #6ee04a;
  --hp-glow: #5ce66a;
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  margin-top: 1px;
}

.ps-slot-hp--high {
  --hp-a: #2f9a24;
  --hp-b: #6ee04a;
  --hp-glow: #5ce66a;
}

.ps-slot-hp--mid {
  --hp-a: #b8860f;
  --hp-b: #f0c840;
  --hp-glow: #e8c040;
}

.ps-slot-hp--low {
  --hp-a: #b32626;
  --hp-b: #e85040;
  --hp-glow: #e84040;
}

.ps-slot-hp-track {
  position: relative;
  flex: 1;
  min-width: 0;
  height: clamp(13px, 1.5vh, 22px);
  background: #241512;
  border: 1px solid #12100c;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.65);
}

/* Segment ticks (count driven by HP_BAR_SEGMENTS via --hp-seg on the root) */
.ps-slot-hp-track::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(100% / var(--hp-seg, 8) - 1px),
    rgba(0, 0, 0, 0.45) calc(100% / var(--hp-seg, 8) - 1px),
    rgba(0, 0, 0, 0.45) calc(100% / var(--hp-seg, 8))
  );
}

.ps-slot-hp-fill {
  position: relative;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--hp-b), var(--hp-a));
  box-shadow: 0 0 6px color-mix(in srgb, var(--hp-glow) 45%, transparent);
  transition:
    width 0.35s ease,
    background 0.35s ease;
}

/* Glossy top highlight */
.ps-slot-hp-fill::before {
  content: '';
  position: absolute;
  inset: 0 0 55% 0;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.42), transparent);
  border-radius: 2px 2px 0 0;
}

.ps-slot-hp-val {
  flex-shrink: 0;
  font-size: clamp(0.74rem, 1vh, 1rem);
  font-weight: 800;
  color: var(--hp-glow);
  text-shadow: 0 0 6px color-mix(in srgb, var(--hp-glow) 40%, transparent);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
}

/* Low HP → gentle pulse to draw the eye (shared keyframe with the stage bar) */
.ps-slot-hp--low .ps-slot-hp-fill {
  animation: ps-hp-low-pulse 1.3s ease-in-out infinite;
}

/* ── Planet hinter der Sonne — Sidebar-Kachel ──────────────────────────────── */
/* Weicher als der Zerstört-Zustand: der Planet ist nur vorübergehend außer
   Reichweite. Die Kachel kühlt ab (Rollenfarbe weicht kaltem Blau), das
   Planetenbild fällt in den Schatten, das goldene Eclipse-Medaillon trägt die
   Aussage — gleiche Bildsprache wie Bühne und Command Panel. */
.ps-slot-btn--eclipsed {
  border-color: #39405a;
  background: linear-gradient(150deg, rgba(18, 20, 32, 0.82) 0%, rgba(9, 10, 16, 0.88) 100%);
}

.ps-slot-btn--eclipsed::before {
  background: #46527a;
  opacity: 0.55;
  box-shadow: none;
}

.ps-slot-btn--eclipsed .ps-slot-btn-img {
  /* Nur noch entsättigt — das Abdunkeln macht der Schleier für die GANZE
     Kachel; beides übereinander löschte den Planeten ganz aus. */
  filter: grayscale(70%) saturate(0.6);
  transition: filter 0.4s ease;
}

.ps-slot-btn--eclipsed .ps-slot-icon::before {
  background: radial-gradient(circle, rgba(90, 110, 170, 0.22) 0%, transparent 68%);
  opacity: 1;
}

/* Der Schleier über der ganzen Kachel — Bild, Beschriftung, Level-Plakette und
   HP-Leiste fallen gemeinsam zurück, denn außer Reichweite ist der Slot als
   Ganzes, nicht nur sein Planet.
 *
 * Er füllt mit der GRUNDFARBE der Rail (--rpg-bg-deep), nicht mit Schwarz:
 * damit sieht die Kachel exakt so aus, als läge Opazität auf ihr selbst — nur
 * dass das Medaillon und die Auswahl-Marke darüber stehen bleiben statt
 * mitzuverblassen. Eine Opazität auf dem Button hätte beide mitgenommen, denn
 * sie fasst den ganzen Teilbaum zu einer Gruppe zusammen. */
.ps-slot-eclipse-veil {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: var(--bp-radius);
  background: color-mix(in srgb, var(--rpg-bg-deep, #111008) 62%, transparent);
  pointer-events: none;
}

/* Medaillon mittig auf dem Planeten — Größe folgt dem Kachel-Container wie das
   Planetenbild, damit es auf 4K nicht schrumpft und auf Full HD nicht überdeckt.
   z-index hebt es über den Schleier, siehe Template. */
.ps-slot-eclipse-emblem {
  position: absolute;
  z-index: 4;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: clamp(30px, min(40cqh, 24cqw), 58px);
  height: clamp(30px, min(40cqh, 24cqw), 58px);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.95), rgba(8, 8, 12, 0.95));
  border: 2px solid #5c3310;
  box-shadow:
    0 0 0 1px rgba(200, 144, 64, 0.35),
    0 0 14px rgba(232, 192, 64, 0.32),
    0 2px 6px rgba(0, 0, 0, 0.7);
  color: #e8c040;
  pointer-events: none;
  animation: ps-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

.ps-slot-eclipse-emblem :deep(svg) {
  width: 62%;
  height: 62%;
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.55));
}

@media (prefers-reduced-motion: reduce) {
  .ps-slot-eclipse-emblem {
    animation: none;
  }
}

/* Ausgewählt + verfinstert: die Auswahl bleibt führend (Gem + Rahmen), die
   Kachel kühlt aber trotzdem ab — beide Aussagen dürfen nebeneinander stehen. */
.ps-slot-btn--eclipsed.ps-slot-btn--active {
  border-color: var(--rc, #52b830);
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--rc, #52b830) 10%, rgba(18, 20, 32, 0.88)) 0%,
    rgba(9, 10, 16, 0.9) 72%
  );
}

/* ── Zerstörter Planet — Sidebar-Kachel ────────────────────────────────────── */
/* Härter als jeder andere Slot-Zustand: Der Planet ist raus, nicht nur passiv.
   Rotstichiger Rahmen, ausgelöschtes Planetenbild, Wrack-Emblem darüber. */
.ps-slot-btn--down {
  border-color: #7a3a2c;
  background: linear-gradient(150deg, rgba(38, 18, 13, 0.88) 0%, rgba(18, 10, 8, 0.9) 100%);
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.5),
    inset 0 0 20px rgba(168, 64, 44, 0.1);
}

/* The accent rail goes red too — a destroyed planet must not still read in its
   role color, that is the state the card is no longer in. */
.ps-slot-btn--down::before {
  background: #a8402c;
  opacity: 0.9;
}

.ps-slot-btn--down .ps-slot-icon::before {
  background: radial-gradient(circle, rgba(204, 96, 80, 0.28) 0%, transparent 68%);
  opacity: 1;
}

.ps-slot-btn--down .ps-slot-btn-img {
  filter: grayscale(100%) brightness(0.3) contrast(0.85);
}

.ps-slot-down-emblem {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  color: #e08070;
  filter: drop-shadow(0 0 8px rgba(204, 96, 80, 0.75));
  pointer-events: none;
  animation: ps-down-pulse 1.5s ease-in-out infinite alternate;
}

/* Respawn-Leiste — ersetzt die HP-Leiste, gleiche Geometrie, andere Aussage */
.ps-slot-down {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}

.ps-slot-down-track {
  position: relative;
  flex: 1;
  height: 6px;
  background: #14100e;
  border: 1px solid #3a2018;
  border-radius: 4px;
  overflow: hidden;
}

.ps-slot-down-fill {
  height: 100%;
  background: linear-gradient(to bottom, #e08070, #a8402c);
  box-shadow: 0 0 8px rgba(224, 128, 112, 0.5);
  transition: width 0.5s linear;
}

.ps-slot-down-val {
  min-width: 30px;
  text-align: right;
  font-size: 0.72rem;
  font-weight: 800;
  color: #f0b0a0;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .ps-slot-down-emblem,
  .ps-down-icon {
    animation: none;
  }
}

/* ── Locked Slots ──────────────────────────────────────────────────────────── */

/* Affordable: pulsing green glow, dark green bg tint, sweep-shine on hover */
.ps-slot-btn--affordable {
  opacity: 1;
  filter: none;
  cursor: pointer;
  background: linear-gradient(150deg, rgba(16, 34, 12, 0.84) 0%, rgba(10, 20, 10, 0.88) 100%);
  border-color: rgba(82, 184, 48, 0.55);
  box-shadow:
    0 0 10px rgba(82, 184, 48, 0.25),
    inset 0 0 14px rgba(82, 184, 48, 0.05);
  overflow: hidden;
  animation: ps-afford-pulse 2.2s ease-in-out infinite;
}

.ps-slot-btn--affordable::after {
  content: '';
  position: absolute;
  top: 0;
  left: -80%;
  width: 45%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(180, 255, 120, 0.18) 50%,
    transparent 100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

.ps-slot-btn--affordable:hover {
  background: linear-gradient(150deg, rgba(22, 44, 16, 0.88) 0%, rgba(13, 26, 10, 0.9) 100%);
  border-color: #6de030;
  box-shadow:
    0 0 20px rgba(82, 184, 48, 0.65),
    0 0 40px rgba(82, 184, 48, 0.2),
    inset 0 0 16px rgba(82, 184, 48, 0.1);
  transform: translateY(-2px) scale(1.04);
  animation: none;
}

.ps-slot-btn--affordable:hover::after {
  animation: ps-afford-shine 0.55s ease-out forwards;
}

.ps-slot-btn--affordable .ps-slot-btn-lock {
  filter: sepia(1) saturate(4) hue-rotate(80deg) brightness(1.2);
  animation: ps-lock-bob 1.8s ease-in-out infinite;
}

/* Can't afford */
.ps-slot-btn--cant-afford {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: pointer;
}

/* Lock icon */
.ps-slot-btn-lock {
  display: grid;
  place-items: center;
  opacity: 0.75;
}

.ps-slot-btn-lock .lock-icon {
  width: clamp(30px, min(40cqh, 24cqw), 60px);
  height: clamp(30px, min(40cqh, 24cqw), 60px);
  object-fit: contain;
  image-rendering: auto;
}

/* ── Slot phase badge ──────────────────────────────────────────────────────── */
.ps-slot-phase-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(0.75rem, 1vh, 0.95rem);
  font-weight: 800;
  color: rgba(200, 160, 60, 0.6);
  letter-spacing: 0.03em;
  line-height: 1.1;
}

.ps-slot-btn--affordable .ps-slot-phase-badge {
  color: #90e050;
}

@keyframes ps-slot-buff-ring {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@keyframes ps-hp-low-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.45);
  }
}

@keyframes ps-down-pulse {
  from {
    opacity: 0.6;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes ps-eclipse-breathe {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

@keyframes ps-buy-badge-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 5px rgba(52, 211, 153, 0.5);
  }
  50% {
    transform: scale(1.18);
    box-shadow:
      0 0 12px rgba(52, 211, 153, 0.95),
      0 0 20px rgba(5, 150, 105, 0.5);
  }
}

/* Shared buff pulse (stage chip + sidebar aura) — subtle, idle-friendly. */
@keyframes ps-buff-pulse {
  0%,
  100% {
    box-shadow:
      0 0 8px #5ce66a33,
      inset 0 0 6px #5ce66a14;
  }
  50% {
    box-shadow:
      0 0 16px #5ce66a77,
      inset 0 0 8px #5ce66a22;
  }
}

/* ── Keyframes ──────────────────────────────────────────────────────────────── */
@keyframes ps-afford-pulse {
  0%, 100% {
    border-color: rgba(82, 184, 48, 0.45);
    box-shadow:
      0 0 8px rgba(82, 184, 48, 0.2),
      inset 0 0 12px rgba(82, 184, 48, 0.04);
  }
  50% {
    border-color: rgba(110, 210, 64, 0.9);
    box-shadow:
      0 0 20px rgba(82, 184, 48, 0.6),
      0 0 36px rgba(82, 184, 48, 0.18),
      inset 0 0 14px rgba(82, 184, 48, 0.1);
  }
}

@keyframes ps-afford-shine {
  0%   { left: -80%; opacity: 0; }
  15%  { opacity: 1; }
  100% { left: 130%; opacity: 0; }
}

@keyframes ps-lock-bob {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50%       { transform: translateY(-3px) rotate(4deg); }
}
</style>
