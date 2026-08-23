<script setup lang="ts">
/**
 * Ein Ankerplatz auf der Galaxie-Karte — ein Vertrag, der dort ausliegt, oder
 * eine Mission, die von dort aufgebrochen ist.
 *
 * Es ist derselbe Ort: `pinKeyOf` gibt Vertrag und Mission denselben
 * Schlüssel, die Marke verwandelt sich also, statt umzuziehen.
 *
 * Bewegt werden ausschliesslich `transform` und `opacity`. Der Fortschritt
 * läuft über `scaleX` einer Spur (ein Schreibvorgang je Sekunde, nicht je
 * Frame), das Atmen über die `opacity` einer eigenen Ebene mit statischem
 * Schein — kein `filter`, kein `box-shadow`, keine animierte Randfarbe.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import {
  EXPEDITION_COLORS,
  EXPEDITION_EXPIRY_WARNING_MS,
  VOYAGE_MARKER_BREATH_MS,
  VOYAGE_MARKER_BREATH_WARN_MS,
  VOYAGE_MARKER_BOB_MS,
  VOYAGE_SITE_HIT_PX,
  VOYAGE_SITE_MARKER_PX,
} from '@/config/constants'
import type { VoyagePlacedSite } from '@/types'

const props = defineProps<{
  site: VoyagePlacedSite
  /** Position der Fit-Box in der Bühne, damit der Knoten in Prozent sitzt. */
  left: number
  top: number
  now: number
  selected: boolean
}>()
const emit = defineEmits<{ select: [string] }>()

const battleStore = useBattleStore()

const mission = computed(() => props.site.mission)
const offer = computed(() => props.site.offer)

type SiteState = 'offer' | 'running' | 'returned'
const state = computed<SiteState>(() => {
  const m = mission.value
  if (!m) return 'offer'
  return m.status === 'active' ? 'running' : 'returned'
})

const subject = computed(() => mission.value ?? offer.value)
const success = computed(() => mission.value?.status === 'success')

const color = computed(() => {
  const key = subject.value?.colorKey ?? 'gold'
  return EXPEDITION_COLORS.find((c) => c.key === key) ?? EXPEDITION_COLORS[0]
})

// ── Uhren ───────────────────────────────────────────────────────────────────
const expiresIn = computed(() => (offer.value ? offer.value.availableUntil - props.now : 0))
const expiring = computed(
  () => state.value === 'offer' && expiresIn.value <= EXPEDITION_EXPIRY_WARNING_MS,
)

const progress = computed(() => {
  const m = mission.value
  if (!m) return 0
  const elapsed = props.now - m.startTime
  return Math.min(1, Math.max(0, elapsed / (m.durationSeconds * 1000)))
})

const remaining = computed(() => {
  const m = mission.value
  if (!m) return ''
  return clock(m.durationSeconds * 1000 - (props.now - m.startTime))
})

function clock(ms: number): string {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}

// ── Crew ────────────────────────────────────────────────────────────────────
const crew = computed(() => mission.value?.assignedChampions ?? [])
const crewShown = computed(() => crew.value.slice(0, 2))
const crewOverflow = computed(() => Math.max(0, crew.value.length - crewShown.value.length))

function portrait(name: string): string {
  return battleStore.getChampionImage(name, { size: 'sm' })
}

// ── Darstellung ─────────────────────────────────────────────────────────────
const label = computed(() => {
  const s = subject.value
  if (!s) return ''
  if (state.value === 'offer') return `${s.name} — expires in ${clock(expiresIn.value)}`
  if (state.value === 'running') return `${s.name} — returns in ${remaining.value}`
  return `${s.name} — ${success.value ? 'returned' : 'lost'}, ready to collect`
})

const nodeStyle = computed(() => ({
  left: `${props.left}%`,
  top: `${props.top}%`,
  '--sn-c': color.value.primary,
  '--sn-d': color.value.dim,
  '--sn-glow': color.value.glowRgb,
  '--sn-hit': `${VOYAGE_SITE_HIT_PX}px`,
  '--sn-plate': `${VOYAGE_SITE_MARKER_PX}px`,
  '--sn-breath': `${expiring.value ? VOYAGE_MARKER_BREATH_WARN_MS : VOYAGE_MARKER_BREATH_MS}ms`,
  '--sn-bob': `${VOYAGE_MARKER_BOB_MS}ms`,
}))
</script>

<template>
  <button
    class="sn"
    :class="[`sn--${state}`, { 'sn--on': selected, 'sn--warn': expiring, 'sn--lost': state === 'returned' && !success }]"
    :style="nodeStyle"
    :aria-label="label"
    :aria-pressed="selected"
    :title="label"
    @click.stop="emit('select', site.pinKey)"
  >
    <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre opacity. -->
    <span class="sn-breath" aria-hidden="true" />

    <span class="sn-plate">
      <Icon v-if="subject" :icon="subject.icon" width="22" height="22" class="sn-ico" />
      <RpgNotifyBadge
        v-if="state === 'returned'"
        :count="1"
        label="Expedition ready to collect"
      />
    </span>

    <span v-if="state === 'offer'" class="sn-pill" :class="{ 'sn-pill--warn': expiring }">
      {{ clock(expiresIn) }}
    </span>

    <template v-else-if="state === 'running'">
      <span class="sn-track" aria-hidden="true">
        <span class="sn-track-fill" :style="{ transform: `scaleX(${progress})` }" />
      </span>
      <span class="sn-pill">{{ remaining }}</span>
      <span v-if="crewShown.length" class="sn-crew" aria-hidden="true">
        <img
          v-for="c in crewShown"
          :key="c.name"
          :src="portrait(c.name)"
          :alt="''"
          class="sn-crew-img"
        />
        <span v-if="crewOverflow" class="sn-crew-more">+{{ crewOverflow }}</span>
      </span>
    </template>

    <span v-else class="sn-pill sn-pill--done">
      {{ success ? 'Returned' : 'Lost' }}
    </span>
  </button>
</template>

<style scoped>
.sn {
  position: absolute;
  z-index: 1;
  width: var(--sn-hit);
  height: var(--sn-hit);
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transform: translate(-50%, -50%);
  /* Der EINZIGE Nicht-Transform-Übergang der Karte: ein Hafen, dessen Vorgänger
     die Galaxie verlassen hat, gleitet auf seinen neuen Platz. */
  transition:
    left var(--sn-move, 320ms) ease,
    top var(--sn-move, 320ms) ease;
}
.sn:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 3px;
  border-radius: 4px;
}

/* ── Atem: statischer Schein, animierte Deckkraft ──────────────────────── */
.sn-breath {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--sn-plate) * 2.1);
  height: calc(var(--sn-plate) * 2.1);
  margin: calc(var(--sn-plate) * -1.05) 0 0 calc(var(--sn-plate) * -1.05);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(var(--sn-glow), 0.38) 0%,
    rgba(var(--sn-glow), 0.12) 45%,
    rgba(var(--sn-glow), 0) 72%
  );
  opacity: 0.45;
  pointer-events: none;
  animation: sn-breathe var(--sn-breath) ease-in-out infinite alternate;
}
.sn--running .sn-breath {
  opacity: 0.24;
}
.sn--returned .sn-breath {
  background: radial-gradient(
    circle,
    rgba(100, 220, 180, 0.42) 0%,
    rgba(100, 220, 180, 0.14) 45%,
    rgba(100, 220, 180, 0) 72%
  );
}
.sn--lost .sn-breath {
  background: radial-gradient(
    circle,
    rgba(204, 96, 80, 0.42) 0%,
    rgba(204, 96, 80, 0.14) 45%,
    rgba(204, 96, 80, 0) 72%
  );
}
@keyframes sn-breathe {
  from {
    opacity: 0.28;
  }
  to {
    opacity: 0.72;
  }
}

/* ── Die Platte ─────────────────────────────────────────────────────────── */
.sn-plate {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--sn-plate);
  height: var(--sn-plate);
  margin: calc(var(--sn-plate) / -2) 0 0 calc(var(--sn-plate) / -2);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #14100a;
  border: 2px solid var(--sn-c);
  /* KEIN clip-path. Ein Sechseck sah auf dem Papier besser aus und schnitt in
     Wirklichkeit die Glyphen ab: es kappt oben und unten je 26 %, und die
     detailreichen game-icons der Reise-Motivfamilie („castle-ruins",
     „cave-entrance") zerfielen darin zu Strichresten. 4 px Radius ist ohnehin
     die Projektregel. */
  border-radius: 4px;
  transform: scale(1);
  transition: transform 0.14s ease;
}
.sn:hover .sn-plate,
.sn:focus-visible .sn-plate {
  transform: scale(1.12);
}
.sn--on .sn-plate {
  transform: scale(1.16);
}
.sn--running .sn-plate {
  border-color: var(--sn-d);
}
.sn--returned .sn-plate {
  border-color: #64dcb4;
}
.sn--lost .sn-plate {
  border-color: #cc6050;
}
.sn-ico {
  color: var(--sn-c);
}
.sn--running .sn-ico {
  color: rgba(232, 220, 192, 0.72);
}
.sn--returned .sn-ico {
  color: #a0f0d0;
}
.sn--lost .sn-ico {
  color: #e08a7a;
}

/* Ein Ring statt einer animierten Randfarbe — der gewählte Zustand ist ein
   einmaliger Umschlag, kein Dauerläufer. */
.sn--on::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--sn-plate) + 12px);
  height: calc(var(--sn-plate) + 12px);
  margin: calc((var(--sn-plate) + 12px) / -2) 0 0 calc((var(--sn-plate) + 12px) / -2);
  border: 2px solid #e8c040;
  border-radius: 50%;
  pointer-events: none;
}

/* ── Beschriftungen unter der Platte ────────────────────────────────────── */
.sn-pill {
  position: absolute;
  left: 50%;
  top: calc(50% + var(--sn-plate) * 0.62);
  transform: translateX(-50%);
  padding: 1px 6px;
  background: rgba(11, 8, 6, 0.88);
  border: 1px solid #3e200a;
  border-radius: 3px;
  font-size: 10.5px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0.03em;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}
.sn-pill--warn {
  border-color: #cc6050;
  color: #ffb0a0;
}
.sn-pill--done {
  border-color: #64dcb4;
  color: #a0f0d0;
}
.sn--lost .sn-pill--done {
  border-color: #cc6050;
  color: #e08a7a;
}
/* Läuft eine Mission, steht die Spur zwischen Platte und Pille. */
.sn--running .sn-pill {
  top: calc(50% + var(--sn-plate) * 0.62 + 7px);
}

.sn-track {
  position: absolute;
  left: 50%;
  top: calc(50% + var(--sn-plate) * 0.62);
  width: 40px;
  height: 4px;
  margin-left: -20px;
  overflow: hidden;
  background: rgba(11, 8, 6, 0.85);
  border: 1px solid #3e200a;
  border-radius: 2px;
  pointer-events: none;
}
.sn-track-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, var(--sn-d), var(--sn-c));
  transition: transform 1s linear;
}

.sn-crew {
  position: absolute;
  left: 50%;
  bottom: calc(50% + var(--sn-plate) * 0.62);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  pointer-events: none;
}
.sn-crew-img {
  width: 16px;
  height: 16px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.55);
  margin-left: -6px;
}
.sn-crew-img:first-child {
  margin-left: 0;
}
.sn-crew-more {
  margin-left: 3px;
  font-size: 9.5px;
  font-weight: 800;
  color: rgba(232, 192, 64, 0.8);
}

/* Die zurückgekehrte Marke wippt — sie ist das Einzige auf der Karte, das der
   Spieler JETZT anfassen soll. */
.sn--returned .sn-plate,
.sn--lost .sn-plate {
  animation: sn-bob var(--sn-bob) ease-in-out infinite alternate;
}
@keyframes sn-bob {
  from {
    transform: translateY(0) scale(1);
  }
  to {
    transform: translateY(-3px) scale(1);
  }
}
.sn--returned:hover .sn-plate,
.sn--lost:hover .sn-plate,
.sn--returned.sn--on .sn-plate,
.sn--lost.sn--on .sn-plate {
  animation: none;
  transform: scale(1.14);
}

@media (prefers-reduced-motion: reduce) {
  .sn-breath,
  .sn--returned .sn-plate,
  .sn--lost .sn-plate {
    animation: none;
  }
}
</style>
