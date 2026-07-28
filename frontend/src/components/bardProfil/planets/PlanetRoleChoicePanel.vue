<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { usePlanetShopStore, PLANET_ROLES, PLANET_ROLES_LIST } from '@/stores/planetShopStore'
import type { PlanetRoleType } from '@/stores/planetShopStore'
import { planetBonusText } from '@/utils/planetStatus'
import { toRoman } from '@/utils/format'
import { useActionToast } from '@/composables/useActionToast'

const props = defineProps<{ slotId: string }>()

const store = usePlanetShopStore()
const { showToast } = useActionToast()

const roles = PLANET_ROLES_LIST
const orbitNumber = computed(() => Number(props.slotId.replace('slot_', '')))

// Permanent planet choice: clicking a role arms a confirm step before it locks.
const pendingRoleId = ref<PlanetRoleType | null>(null)
const pendingRole = computed(() => (pendingRoleId.value ? PLANET_ROLES[pendingRoleId.value] : null))

// Reset any armed role selection when switching slots.
watch(
  () => props.slotId,
  () => {
    pendingRoleId.value = null
  },
)

function pickRole(roleId: PlanetRoleType) {
  pendingRoleId.value = pendingRoleId.value === roleId ? null : roleId
}

function cancelRole() {
  pendingRoleId.value = null
}

function confirmRole() {
  if (!pendingRoleId.value) return
  const roleId = pendingRoleId.value
  store.assignRole(props.slotId, roleId)
  pendingRoleId.value = null
  showToast(`${PLANET_ROLES[roleId]?.name ?? roleId} locked in — this choice is permanent!`)
}
</script>

<template>
  <!-- Purchased, no role yet: one-time permanent planet choice -->
  <div class="ps-choose">
    <div class="ps-choose-head">
      <span class="ps-choose-kicker">✦ Orbit {{ toRoman(orbitNumber) }} · Unsettled ✦</span>
      <h2 class="ps-choose-title">Choose this planet's calling</h2>
      <!-- lock.png statt eines neuen game-icons-Eintrags: dieselbe Sperr-
           Grafik trägt schon Sidebar und Lock-Hero in diesem Tab. -->
      <span class="ps-choose-warn">
        <img src="/img/lock-128.png" alt="" class="ps-choose-warn-lock" />
        Permanent — a calling cannot be changed later
      </span>
    </div>
    <div class="ps-role-grid ps-role-grid--choose">
      <button
        v-for="role in roles"
        :key="role.id"
        class="ps-role-option"
        :class="{ 'ps-role-option--selected': pendingRoleId === role.id }"
        :style="{ '--rc': role.color }"
        @click="pickRole(role.id)"
      >
        <span class="ps-role-medal">
          <img
            v-if="role.icon.startsWith('/')"
            class="ps-role-icon"
            :src="role.icon"
            :alt="role.name"
          />
          <Icon
            v-else-if="role.icon.includes(':')"
            :icon="role.icon"
            class="ps-role-icon ps-role-icon--gi"
          />
          <span v-else class="ps-role-icon">{{ role.icon }}</span>
        </span>
        <span class="ps-role-name">{{ role.name }}</span>
        <div class="ps-role-divider" />
        <span class="ps-role-effect">{{ planetBonusText(role) }}</span>
        <div v-if="pendingRoleId === role.id" class="ps-role-badge">✓ Selected</div>
      </button>
    </div>
    <Transition name="ps-config-slide">
      <div v-if="pendingRole" class="ps-confirm-bar" :style="{ '--rc': pendingRole.color }">
        <span class="ps-confirm-text">
          Lock in <b :style="{ color: pendingRole.color }">{{ pendingRole.name }}</b> for this orbit?
          This choice is <b>permanent</b>.
        </span>
        <div class="ps-confirm-actions">
          <button class="ps-confirm-cancel" @click="cancelRole">Cancel</button>
          <button class="ps-confirm-ok" @click="confirmRole">✦ Lock In</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Permanent role choice ─────────────────────────────────────────────────── */
/* ══ Unsettled slot — pick a calling ══════════════════════════════════════════
   Same hero rhythm as the sealed orbit: kicker → big title → warning, then the
   six callings as full cards instead of the old 0.67rem micro-tiles. */
.ps-choose {
  position: relative; /* paints above the shared cosmic backdrop */
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  justify-content: safe center;
  gap: clamp(10px, 1.8vh, 22px);
  padding: clamp(14px, 2.2vh, 30px) clamp(16px, 2vw, 40px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.ps-choose-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 0.7vh, 9px);
  text-align: center;
}

.ps-choose-kicker {
  font-size: clamp(0.68rem, 1.1vh, 0.86rem);
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.6);
}

.ps-choose-title {
  font-size: clamp(1.5rem, 3.1vh, 2.5rem);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.05;
  color: #e8c040;
  text-shadow:
    0 0 20px rgba(232, 192, 64, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.8);
}

.ps-choose-warn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: clamp(0.7rem, 1.15vh, 0.88rem);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #e08070;
  padding: clamp(4px, 0.6vh, 7px) clamp(10px, 1vw, 16px);
  border: 1px solid #5c2a20;
  border-radius: 4px;
  background: rgba(60, 16, 12, 0.55);
}

.ps-choose-warn-lock {
  width: clamp(14px, 1.8vh, 19px);
  height: clamp(14px, 1.8vh, 19px);
  object-fit: contain;
  filter: sepia(1) saturate(3) hue-rotate(-25deg) brightness(1.1);
}

.ps-role-grid--choose {
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(8px, 1vw, 16px);
  width: min(940px, 100%);
  margin: 0 auto;
}

/* ── Permanence confirm bar ────────────────────────────────────────────────── */
.ps-confirm-bar {
  --rc: #e8c040;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(12px, 1.4vw, 24px);
  flex-wrap: wrap;
  width: min(940px, 100%);
  margin: 0 auto;
  padding: clamp(11px, 1.5vh, 18px) clamp(14px, 1.4vw, 22px);
  background: linear-gradient(150deg, rgba(30, 26, 16, 0.92) 0%, rgba(14, 12, 8, 0.94) 100%);
  border: 1px solid var(--rc);
  border-radius: var(--bp-radius);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rc) 40%, transparent),
    0 0 26px color-mix(in oklch, var(--rc) 28%, transparent),
    0 6px 20px rgba(0, 0, 0, 0.6);
}

.ps-confirm-text {
  font-size: clamp(0.88rem, 1.5vh, 1.15rem);
  font-weight: 600;
  line-height: 1.45;
  color: #ddd0a4;
  flex: 1;
  min-width: 240px;
}

.ps-confirm-actions {
  display: flex;
  gap: clamp(8px, 0.8vw, 14px);
  flex-shrink: 0;
}

.ps-confirm-cancel,
.ps-confirm-ok {
  padding: clamp(8px, 1.1vh, 13px) clamp(16px, 1.6vw, 28px);
  font-size: clamp(0.82rem, 1.35vh, 1rem);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: var(--bp-radius);
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease;
}

.ps-confirm-cancel {
  background: #1c1c18;
  border: 1px solid #5c3310;
  color: #c0b890;
}

.ps-confirm-ok {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}

.ps-confirm-cancel:hover,
.ps-confirm-ok:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

/* ── Rollen-Grid ───────────────────────────────────────────────────────────── */
.ps-role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.6rem;
  align-items: stretch;
}

.ps-role-option {
  --rc: #aaaaaa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(5px, 0.8vh, 10px);
  padding: clamp(12px, 1.8vh, 22px) clamp(8px, 0.8vw, 16px);
  /* translucent like the rail cards — the shared starfield keeps showing through */
  background: linear-gradient(150deg, rgba(30, 25, 17, 0.82) 0%, rgba(13, 11, 7, 0.88) 100%);
  border: 1px solid #2e2416;
  border-radius: var(--bp-radius);
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(232, 192, 64, 0.05);
  cursor: pointer;
  text-align: center;
  color: inherit;
  position: relative;
  overflow: hidden;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
  width: 100%;
  /* Inhalt vertikal zentriert innerhalb der Karte */
  justify-content: center;
}

/* Top accent in the calling's color — dim at rest, lit when armed */
.ps-role-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--rc);
  opacity: 0.35;
  transition: opacity 180ms ease;
}

.ps-role-option:hover::before {
  opacity: 0.75;
}

.ps-role-option--selected::before {
  opacity: 1;
  box-shadow: 0 0 12px var(--rc);
}

.ps-role-option:focus-visible {
  outline: none;
  border-color: #e8c040;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.85),
    0 0 12px rgba(232, 192, 64, 0.4);
}

.ps-role-option:hover {
  background: linear-gradient(150deg, rgba(44, 37, 24, 0.86) 0%, rgba(18, 15, 10, 0.9) 100%);
  border-color: color-mix(in oklch, var(--rc) 70%, transparent);
  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.55),
    0 0 14px color-mix(in oklch, var(--rc) 22%, transparent);
  transform: translateY(-2px);
}

/* Armed: 1px border kept (a 2px swap would nudge the whole card's contents) —
   the weight comes from a color wash and a ring shadow. */
.ps-role-option--selected {
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--rc) 16%, rgba(20, 17, 11, 0.9)) 0%,
    rgba(12, 11, 7, 0.92) 72%
  );
  border-color: var(--rc);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rc) 45%, transparent),
    0 0 24px color-mix(in oklch, var(--rc) 35%, transparent),
    inset 0 0 26px color-mix(in oklch, var(--rc) 10%, transparent);
  transform: translateY(-2px);
}

/* Framed medallion around the calling's icon — same language as the target chip
   and the lock gates, and it gives the small sprites a proper stage. */
.ps-role-medal {
  display: grid;
  place-items: center;
  width: clamp(52px, 7vh, 78px);
  height: clamp(52px, 7vh, 78px);
  background: radial-gradient(circle at 45% 35%, #1a1710 0%, #0a0906 100%);
  border: 1px solid color-mix(in srgb, var(--rc) 45%, #3a2a10);
  border-radius: 6px;
  box-shadow: inset 0 0 14px color-mix(in srgb, var(--rc) 14%, transparent);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.ps-role-option:hover .ps-role-medal,
.ps-role-option--selected .ps-role-medal {
  border-color: var(--rc);
  box-shadow:
    inset 0 0 18px color-mix(in srgb, var(--rc) 22%, transparent),
    0 0 14px color-mix(in srgb, var(--rc) 25%, transparent);
}

.ps-role-icon {
  filter: drop-shadow(0 0 6px color-mix(in oklch, var(--rc) 55%, transparent));
  transition:
    transform 0.15s,
    filter 0.15s;
}

span.ps-role-icon {
  font-size: clamp(1.9rem, 3.4vh, 2.8rem);
  line-height: 1;
}

img.ps-role-icon {
  width: 64%;
  height: 64%;
  object-fit: contain;
}

.ps-role-icon--gi {
  width: 60%;
  height: 60%;
  color: var(--rc, #c89040);
}

.ps-role-option:hover .ps-role-icon,
.ps-role-option--selected .ps-role-icon {
  transform: scale(1.12);
  filter: drop-shadow(0 0 10px color-mix(in oklch, var(--rc) 85%, transparent));
}

.ps-role-name {
  font-size: clamp(0.92rem, 1.6vh, 1.25rem);
  font-weight: 800;
  color: #e4d8ae;
  letter-spacing: 0.05em;
  line-height: 1.2;
  text-transform: uppercase;
}

.ps-role-option--selected .ps-role-name {
  color: var(--rc);
}

.ps-role-divider {
  width: 62%;
  height: 2px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in oklch, var(--rc) 30%, transparent),
    transparent
  );
}

.ps-role-effect {
  font-size: clamp(0.8rem, 1.35vh, 1.05rem);
  font-weight: 800;
  color: var(--rc);
  line-height: 1.35;
  text-wrap: balance;
  text-shadow: 0 0 8px color-mix(in oklch, var(--rc) 40%, transparent);
}

.ps-role-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  background: color-mix(in oklch, var(--rc) 20%, #0d0c07);
  border: 1px solid color-mix(in oklch, var(--rc) 60%, transparent);
  color: var(--rc);
  font-size: clamp(0.58rem, 0.95vh, 0.72rem);
  font-weight: 900;
  padding: 3px 7px;
  border-radius: 3px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 0 10px color-mix(in srgb, var(--rc) 30%, transparent);
}

/* ── Config Slide Transition ───────────────────────────────────────────────── */
.ps-config-slide-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    max-height 0.25s ease;
  max-height: 500px;
  overflow: hidden;
}

.ps-config-slide-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    max-height 0.2s ease;
  max-height: 500px;
  overflow: hidden;
}

.ps-config-slide-enter-from,
.ps-config-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

/* ── Narrow-window fallback ─────────────────────────────────────────────────── */
/* Below common desktop widths the three dock zones would squeeze each other —
   stack them and let the detail column scroll while the stage keeps a sane
   minimum height. */
@media (max-width: 950px) {
  .ps-role-grid--choose {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
