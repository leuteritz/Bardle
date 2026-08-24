<script setup lang="ts">
/**
 * Der Rift, bevor die Aufstellung steht.
 *
 * Anders als bei Voyages ist das Tor hier zählbar und der Weg hinaus kurz:
 * jeder Sitz ist ein Knopf, der auf seine Rolle im Team-Reiter springt. Vorbild
 * der Form ist `expedition/ExpeditionLockedPanel.vue`.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useUiStore } from '@/stores/core/uiStore'
import { ROLES } from '@/config/constants'

const battleStore = useBattleStore()
const uiStore = useUiStore()

const seats = computed(() =>
  ROLES.map((role, idx) => ({
    key: role.key,
    short: role.short,
    label: role.label,
    icon: role.icon,
    color: role.color,
    idx,
    name: battleStore.headerSlots[idx] ?? null,
  })),
)

const roleLine = ROLES.map((r) => r.label).join(' · ')

const openSeats = computed(() => battleStore.openRoleSeats)
const seatTotal = computed(() => battleStore.headerSlots.length)

const ctaLabel = computed(
  () => `FILL ${openSeats.value} OPEN ROLE${openSeats.value === 1 ? '' : 'S'}`,
)

const PAYOFF = [
  {
    icon: 'ph:ranking-fill',
    title: 'Ladder & LP',
    text: 'Every match moves your rank. The tier you hold frames every card on the board.',
  },
  {
    icon: 'game-icons:upgrade',
    title: 'Champion XP',
    text: 'The five who fight come back stronger — levels, perks and regalia ride on the Rift.',
  },
  {
    icon: 'ph:medal-military-fill',
    title: 'Honors & MVP',
    text: 'Kills, pentakills and MVP awards accrue to the company for as long as it stands.',
  },
]

function fillSeat(idx: number) {
  uiStore.requestRoleFillFromBattle(idx)
}

function fillFirstOpen() {
  const idx = battleStore.firstOpenRoleSeat
  if (idx >= 0) fillSeat(idx)
}
</script>

<template>
  <div class="rlp">
    <div class="rlp-head">
      <span v-ink-center class="rlp-kicker">✦ Unmustered ✦</span>
      <h2 v-ink-center class="rlp-title">Rift</h2>
      <span class="rlp-sub">
        Five seats hold the Rift. Fill them on the board and the ladder opens — the company
        fights on its own from there.
      </span>
    </div>

    <div class="rlp-hero">
      <span class="rlp-halo" aria-hidden="true" />
      <span class="rlp-core">
        <Icon icon="ri:sword-fill" class="rlp-core-blade" width="64" height="64" />
        <span class="rlp-seal">
          <Icon icon="lucide:lock" width="26" height="26" />
        </span>
      </span>
    </div>

    <!-- Das Tor mit Ist-Wert: WORAN es hängt, nicht bloß "gesperrt". -->
    <div class="rlp-gate" :class="{ 'rlp-gate--met': openSeats === 0 }">
      <span class="rlp-gate-medal">
        <Icon icon="ph:users-three-fill" width="30" height="30" />
      </span>
      <span class="rlp-gate-body">
        <span class="rlp-gate-label">Full Five-Role Board</span>
        <span class="rlp-gate-value">{{ roleLine }}</span>
        <span class="rlp-gate-note">
          The Rift takes the five main seats of your sigil board. Allies behind them stay
          behind them — only the front row marches.
        </span>
      </span>
      <span class="rlp-gate-state" aria-hidden="true">
        <span class="rlp-gate-state-num">
          {{ battleStore.filledRoleSeats }} / {{ seatTotal }}
        </span>
        <span class="rlp-gate-state-label">seated</span>
      </span>
    </div>

    <div class="rlp-seats">
      <button
        v-for="seat in seats"
        :key="seat.key"
        type="button"
        class="rlp-seat"
        :class="seat.name ? 'rlp-seat--held' : 'rlp-seat--open'"
        :style="{ '--seat-c': seat.color }"
        :title="seat.name ? `${seat.label} — ${seat.name}` : `Assign a ${seat.label} champion`"
        @click="fillSeat(seat.idx)"
      >
        <img
          v-if="seat.name"
          :src="battleStore.getChampionImage(seat.name)"
          :alt="seat.name"
          class="rlp-seat-art"
        />
        <span v-else class="rlp-seat-blank" aria-hidden="true">
          <Icon :icon="seat.icon" width="26" height="26" />
        </span>
        <span class="rlp-seat-role">{{ seat.short }}</span>
        <span class="rlp-seat-name">{{ seat.name ?? 'Empty' }}</span>
        <span class="rlp-seat-mark" aria-hidden="true">{{ seat.name ? '✓' : '＋' }}</span>
      </button>
    </div>

    <button type="button" class="rlp-cta" @click="fillFirstOpen">
      <Icon icon="lucide:lock" width="17" height="17" class="rlp-cta-lock" />
      <span v-ink-center class="rlp-cta-text">{{ ctaLabel }}</span>
      <span class="rlp-cta-arrow" aria-hidden="true">→</span>
    </button>

    <div class="rlp-payoff">
      <div v-for="card in PAYOFF" :key="card.title" class="rlp-card">
        <Icon :icon="card.icon" width="30" height="30" class="rlp-card-ico" />
        <span class="rlp-card-title">{{ card.title }}</span>
        <span class="rlp-card-text">{{ card.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rlp {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* safe: auf dem flachsten Viewport darf der Kopf nicht aus dem Rollbereich */
  justify-content: safe center;
  gap: clamp(8px, 1.4vh, 20px);
  padding: clamp(12px, 2.2vh, 32px) clamp(16px, 2vw, 44px);
  overflow-y: auto;
  background: #111008;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.rlp-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(3px, 0.6vh, 8px);
  text-align: center;
}

.rlp-kicker {
  font-size: clamp(0.68rem, 1.1vh, 0.86rem);
  font-weight: 800;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.65);
}

.rlp-title {
  font-size: clamp(1.7rem, 3.2vh, 2.8rem);
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
  color: #e8c040;
  text-shadow:
    0 0 22px rgba(232, 192, 64, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.8);
}

.rlp-sub {
  max-width: 56ch;
  font-size: clamp(0.8rem, 1.3vh, 1.02rem);
  font-weight: 600;
  line-height: 1.4;
  color: rgba(212, 200, 160, 0.62);
}

/* ── Das Siegel ────────────────────────────────────────────────────────────
   Der Schein liegt als eigene Ebene darunter und atmet über `opacity`. */
.rlp-hero {
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(104px, 14vh, 164px);
  height: clamp(104px, 14vh, 164px);
}

.rlp-halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(200, 144, 64, 0.22) 0%,
    rgba(200, 144, 64, 0.07) 42%,
    transparent 70%
  );
  animation: rlp-halo-breathe 3.6s ease-in-out infinite alternate;
}

@keyframes rlp-halo-breathe {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

.rlp-core {
  position: relative;
  display: grid;
  place-items: center;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 32%, #1e1a12 0%, #0a0906 72%);
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 5px #5c3310,
    inset 0 0 34px rgba(200, 144, 64, 0.1),
    0 10px 30px rgba(0, 0, 0, 0.75);
}

.rlp-core-blade {
  color: rgba(200, 144, 64, 0.42);
}

.rlp-seal {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: grid;
  place-items: center;
  width: clamp(34px, 4.8vh, 48px);
  height: clamp(34px, 4.8vh, 48px);
  border-radius: 50%;
  color: #e8c040;
  background: #16140e;
  border: 3px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a;
}

/* ── Das Tor ────────────────────────────────────────────────────────────────
   Eine Farbe trägt den Zustand: `--gc` rot, solange Plätze offen sind. */
.rlp-gate {
  --gc: #cc6050;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(10px, 1vw, 18px);
  width: min(100%, clamp(560px, 46vw, 900px));
  padding: clamp(9px, 1.2vh, 15px) clamp(12px, 1.2vw, 20px);
  background: #1c1c18;
  border: 1px solid color-mix(in srgb, var(--gc) 45%, #5c3310);
  border-radius: 4px;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.rlp-gate--met {
  --gc: #52b830;
}

.rlp-gate-medal {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: clamp(40px, 5vh, 52px);
  height: clamp(40px, 5vh, 52px);
  border-radius: 4px;
  color: color-mix(in srgb, var(--gc) 55%, #c89040);
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--gc) 40%, #5c3310);
}

.rlp-gate-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rlp-gate-label {
  font-size: clamp(0.66rem, 1.05vh, 0.8rem);
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.6);
}

.rlp-gate-value {
  font-size: clamp(0.94rem, 1.7vh, 1.25rem);
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #e8c040;
}

.rlp-gate-note {
  font-size: clamp(0.74rem, 1.15vh, 0.92rem);
  font-weight: 600;
  line-height: 1.35;
  color: rgba(212, 200, 160, 0.68);
}

.rlp-gate-state {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: clamp(4px, 0.7vh, 8px) clamp(8px, 0.7vw, 14px);
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--gc) 40%, #5c3310);
  border-radius: 4px;
}

.rlp-gate-state-num {
  font-size: clamp(0.86rem, 1.5vh, 1.1rem);
  font-weight: 900;
  letter-spacing: 0.04em;
  color: var(--gc);
  white-space: nowrap;
}

.rlp-gate-state-label {
  font-size: clamp(0.6rem, 0.95vh, 0.74rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.55);
}

/* ── Die fünf Sitze ─────────────────────────────────────────────────────────
   Jeder ist der Weg zu sich selbst: ein Klick öffnet seine Rolle im
   Team-Reiter, derselbe Sprung wie von den leeren Roster-Karten. */
.rlp-seats {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(6px, 0.6vw, 12px);
  width: min(100%, clamp(560px, 46vw, 900px));
}

.rlp-seat {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: clamp(7px, 1vh, 12px) 6px clamp(6px, 0.8vh, 10px);
  font-family: inherit;
  background: #16140e;
  border: 1px solid #3a2a14;
  border-bottom: 2px solid var(--seat-c);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    transform 0.14s ease;
}

.rlp-seat:hover {
  background: #221c10;
  border-color: #7a4e20;
  border-bottom-color: var(--seat-c);
  transform: translateY(-2px);
}

.rlp-seat-art {
  width: clamp(34px, 4.6vh, 50px);
  height: clamp(34px, 4.6vh, 50px);
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #5c3310;
}

.rlp-seat-blank {
  display: grid;
  place-items: center;
  width: clamp(34px, 4.6vh, 50px);
  height: clamp(34px, 4.6vh, 50px);
  border-radius: 4px;
  color: color-mix(in srgb, var(--seat-c) 55%, #6f6244);
  background: #0f0d08;
  border: 1px dashed #4a3a1c;
}

.rlp-seat-role {
  font-size: clamp(0.6rem, 0.95vh, 0.74rem);
  font-weight: 900;
  letter-spacing: 0.16em;
  color: var(--seat-c);
}

.rlp-seat-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(0.68rem, 1.05vh, 0.86rem);
  font-weight: 700;
  color: rgba(212, 200, 160, 0.85);
}

.rlp-seat--open .rlp-seat-name {
  color: rgba(204, 96, 80, 0.75);
}

.rlp-seat-mark {
  position: absolute;
  top: 3px;
  right: 5px;
  font-size: clamp(0.68rem, 1.05vh, 0.86rem);
  font-weight: 900;
  line-height: 1;
  color: #cc6050;
}

.rlp-seat--held .rlp-seat-mark {
  color: #52b830;
}

/* ── Der Ausweg ─────────────────────────────────────────────────────────────
   Bernstein, nicht das Grün des START-Knopfes: die beiden dürfen nie
   miteinander verwechselt werden. */
.rlp-cta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(9px, 0.8vw, 15px);
  padding: clamp(8px, 1.2vh, 14px) clamp(22px, 2.4vw, 44px);
  font-family: inherit;
  font-size: clamp(0.84rem, 1.5vh, 1.1rem);
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #f0cf68;
  background: linear-gradient(to bottom, #2a1c08, #180f04);
  border: 2px solid #c89040;
  border-radius: 5px;
  box-shadow:
    inset 0 1px 0 rgba(255, 220, 140, 0.14),
    0 6px 20px rgba(0, 0, 0, 0.7);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.rlp-cta:hover {
  background: linear-gradient(to bottom, #3c2810, #241606);
  border-color: #f0d070;
  transform: translateY(-2px);
}

.rlp-cta:active {
  transform: translateY(0) scale(0.99);
}

.rlp-cta-lock {
  flex-shrink: 0;
  color: #c89040;
}

.rlp-cta-text {
  /* die nachlaufende Sperrung schöbe die Beschriftung aus der Mitte */
  padding-left: 0.2em;
}

.rlp-cta-arrow {
  flex-shrink: 0;
  font-size: 1.1em;
  line-height: 1;
  color: #c89040;
}

/* ── Wofür es sich lohnt ────────────────────────────────────────────────────
   Statisch gedimmt, nicht animiert. */
.rlp-payoff {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(8px, 0.8vw, 16px);
  width: min(100%, clamp(680px, 58vw, 1180px));
}

.rlp-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(3px, 0.6vh, 8px);
  padding: clamp(8px, 1.3vh, 16px) clamp(10px, 1vw, 16px);
  text-align: center;
  background: #1a1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  opacity: 0.72;
  filter: grayscale(40%);
}

.rlp-card-ico {
  color: #c89040;
}

.rlp-card-title {
  font-size: clamp(0.76rem, 1.2vh, 0.95rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e8c040;
}

.rlp-card-text {
  font-size: clamp(0.7rem, 1.1vh, 0.88rem);
  font-weight: 600;
  line-height: 1.35;
  color: rgba(212, 200, 160, 0.72);
}

@media (prefers-reduced-motion: reduce) {
  .rlp-halo {
    animation: none;
  }
  .rlp-seat:hover,
  .rlp-cta:hover {
    transform: none;
  }
}
</style>
