<script setup lang="ts">
/**
 * Ein Ankerplatz auf der Galaxie-Karte — ein Vertrag, der dort ausliegt, oder
 * eine Mission, die von dort aufgebrochen ist.
 *
 * Es ist derselbe Ort: `pinKeyOf` gibt Vertrag und Mission denselben
 * Schlüssel, die Marke verwandelt sich also, statt umzuziehen.
 *
 * **Die Grösse kommt von aussen und wechselt.** `ExpeditionGalaxyMap` misst die
 * Enge der gerade gesetzten Häfen und setzt `--sn-plate`/`--sn-hit` an die
 * Knotenebene; auf einer ruhigen Galaxie ist eine Marke dreimal so gross wie in
 * einer vollen. ALLE Innenmasse rechnen gegen `--sn-plate` — Glyph, Uhr, Ring
 * und Crew wachsen dadurch mit, ohne dass irgendwo eine zweite Zahl steht.
 *
 * Das ist KEINE Pixelanimation (Performance-Regel 10): die Grösse ändert sich
 * nur, wenn ein Vertrag kommt oder geht, und trägt ausdrücklich keinen Übergang.
 * Was übergeht — Hover, Auswahl, Wippen — ist `transform` obendrauf.
 *
 * Der Fortschritt läuft über `stroke-dashoffset` einer SVG-Kreislinie (ein
 * Schreibvorgang je Sekunde, nicht je Frame), das Atmen über die `opacity` einer
 * eigenen Ebene mit statischem Schein — kein `filter`, kein `box-shadow`, keine
 * animierte Randfarbe.
 */
import { computed, ref, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import {
  EXPEDITION_COLORS,
  EXPEDITION_EXPIRY_WARNING_MS,
  VOYAGE_ACTION_ICONS,
  VOYAGE_MARK_REFUSE_MS,
  VOYAGE_MARKER_BREATH_MS,
  VOYAGE_MARKER_BREATH_WARN_MS,
  VOYAGE_MARKER_BOB_MS,
  VOYAGE_NODE_RING_CIRCUMFERENCE,
  VOYAGE_TIP_GAP_PX,
  VOYAGE_TIP_OPEN_DELAY_MS,
  VOYAGE_TIP_WIDTH,
} from '@/config/constants'
import type { VoyageMarkAction, VoyagePlacedSite } from '@/types'
import ExpeditionSubjectTooltip from './ExpeditionSubjectTooltip.vue'

const props = defineProps<{
  site: VoyagePlacedSite
  /** Position der Fit-Box in der Bühne, damit der Knoten in Prozent sitzt. */
  left: number
  top: number
  now: number
  selected: boolean
  /** Trägt die Platte ihre Uhr selbst, oder hängt sie als Pille darunter? */
  inlineClock: boolean
  /** Was ein Klick hier tut — dieselbe Regel, die die Hover-Karte ansagt. */
  action: VoyageMarkAction
}>()
const emit = defineEmits<{ act: [string] }>()

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

/** Der Ring füllt sich im Uhrzeigersinn — leer bei 0, geschlossen bei 1. */
const ringOffset = computed(
  () => VOYAGE_NODE_RING_CIRCUMFERENCE * (1 - (state.value === 'returned' ? 1 : progress.value)),
)

const remaining = computed(() => {
  const m = mission.value
  if (!m) return ''
  return clock(m.durationSeconds * 1000 - (props.now - m.startTime))
})

/** Die eine Zahl, die die Marke zeigt — Ablauf, Rückkehr oder Ausgang. */
const clockText = computed(() => {
  if (state.value === 'offer') return clock(expiresIn.value)
  if (state.value === 'running') return remaining.value
  return success.value ? 'Returned' : 'Lost'
})

function clock(ms: number): string {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}

// ── Crew ────────────────────────────────────────────────────────────────────
const crew = computed(() => mission.value?.assignedChampions ?? [])
/**
 * Nur die HEIMGEKEHRTE Crew steht am Hafen. Solange die Mission läuft, ist sie
 * unterwegs und auf der Route zu sehen (`ExpeditionCrewMarkerLayer`) — sie hier
 * ebenfalls zu zeigen hiesse dieselben Champions zweimal auf derselben Karte.
 */
const atPort = computed(() => state.value === 'returned')
const crewShown = computed(() => (atPort.value ? crew.value.slice(0, 3) : []))
const crewOverflow = computed(() =>
  atPort.value ? Math.max(0, crew.value.length - crewShown.value.length) : 0,
)

function portrait(name: string): string {
  return battleStore.getChampionImage(name, { size: 'sm' })
}

// ── Darstellung ─────────────────────────────────────────────────────────────
/** Die Uhr steht nur IN der Platte, wenn sie dort auch lesbar ist. */
const showInlineClock = computed(() => props.inlineClock && state.value !== 'returned')

const label = computed(() => {
  const s = subject.value
  if (!s) return ''
  const a = props.action
  const gesture =
    a.kind === 'send'
      ? ' — click to send'
      : a.kind === 'collect'
        ? ' — click to collect'
        : a.kind === 'blocked'
          ? ` — ${a.reason}`
          : ''
  if (state.value === 'offer') return `${s.name} — expires in ${clock(expiresIn.value)}${gesture}`
  if (state.value === 'running') return `${s.name} — returns in ${remaining.value}`
  return `${s.name} — ${success.value ? 'returned' : 'lost'}${gesture}`
})

// ── Die Geste ───────────────────────────────────────────────────────────────
/** Eine abgewiesene Marke wackelt einmal — die Begründung steht in der Karte. */
const refusing = ref(false)
let refuseTimer: ReturnType<typeof setTimeout> | null = null

function onClick() {
  if (props.action.kind === 'waiting') return
  if (props.action.kind === 'blocked') {
    if (refuseTimer) clearTimeout(refuseTimer)
    refusing.value = true
    // Rein visuell, deshalb setTimeout und nicht gameTimeout().
    refuseTimer = setTimeout(() => {
      refusing.value = false
      refuseTimer = null
    }, VOYAGE_MARK_REFUSE_MS)
    return
  }
  emit('act', props.site.pinKey)
}

onBeforeUnmount(() => {
  if (refuseTimer) clearTimeout(refuseTimer)
})

const nodeStyle = computed(() => ({
  left: `${props.left}%`,
  top: `${props.top}%`,
  '--sn-c': color.value.primary,
  '--sn-d': color.value.dim,
  '--sn-glow': color.value.glowRgb,
  '--sn-breath': `${expiring.value ? VOYAGE_MARKER_BREATH_WARN_MS : VOYAGE_MARKER_BREATH_MS}ms`,
  '--sn-bob': `${VOYAGE_MARKER_BOB_MS}ms`,
  '--sn-refuse': `${VOYAGE_MARK_REFUSE_MS}ms`,
}))
</script>

<template>
  <!-- Kein `title` mehr: der Browser legte seinen grauen Kasten sonst nach einer
       Sekunde über den Tooltip. `aria-label` trägt die Auskunft weiter, und die
       Hülle öffnet auch auf `focusin`. -->
  <RpgBadgeTooltip
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    accent="#e8c040"
  >
    <button
      class="sn"
      :class="[
        `sn--${state}`,
        `sn--act-${action.kind}`,
        {
          'sn--on': selected,
          'sn--warn': expiring,
          'sn--lost': state === 'returned' && !success,
          'sn--refuse': refusing,
        },
      ]"
      :style="nodeStyle"
      :aria-label="label"
      @click.stop="onClick"
    >
      <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre opacity. -->
      <span class="sn-breath" aria-hidden="true" />

      <span class="sn-plate">
        <!-- Der Fortschritt als Kreislinie: ein `stroke-dashoffset` je Sekunde,
             kein `conic-gradient` und keine vererbte Custom Property. -->
        <svg v-if="state !== 'offer'" class="sn-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle class="sn-ring-track" cx="18" cy="18" r="16" />
          <circle
            class="sn-ring-fill"
            cx="18"
            cy="18"
            r="16"
            :stroke-dasharray="VOYAGE_NODE_RING_CIRCUMFERENCE"
            :stroke-dashoffset="ringOffset"
          />
        </svg>

        <span class="sn-face">
          <Icon v-if="subject" :icon="subject.icon" width="24" height="24" class="sn-ico" />
          <span v-if="showInlineClock" class="sn-clock">{{ clockText }}</span>
        </span>

        <!-- Die Affordanz: erst beim Überfahren, und nur wo der Klick etwas
             tut. Sie DECKT den Glyph, statt neben ihm zu stehen — auf einer
             34-px-Platte ist kein Platz für beides. -->
        <span v-if="action.kind === 'send'" class="sn-go" aria-hidden="true">
          <Icon :icon="VOYAGE_ACTION_ICONS.send" width="24" height="24" />
        </span>

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
      </span>

      <!-- Ausserhalb der Platte: die Marke hat ihre eigene Lesegrösse und darf
           nicht mit dem Hafen schrumpfen. -->
      <RpgNotifyBadge v-if="state === 'returned'" :count="1" label="Expedition ready to collect" />

      <span
        v-if="!showInlineClock"
        class="sn-pill"
        :class="{ 'sn-pill--warn': expiring, 'sn-pill--done': state === 'returned' }"
      >
        {{ clockText }}
      </span>
    </button>

    <template #tip>
      <ExpeditionSubjectTooltip :pin-key="site.pinKey" :now="now" />
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
.sn {
  position: absolute;
  z-index: 1;
  width: var(--sn-hit, 34px);
  height: var(--sn-hit, 34px);
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transform: translate(-50%, -50%);
  /* Der EINZIGE Nicht-Transform-Übergang der Karte: ein Hafen, dessen Vorgänger
     die Galaxie verlassen hat, gleitet auf seinen neuen Platz. Die GRÖSSE geht
     ausdrücklich nicht über — sie ist Layout, kein Effekt. */
  transition:
    left var(--sn-move, 320ms) ease,
    top var(--sn-move, 320ms) ease;
}
.sn:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 3px;
  border-radius: 4px;
}
.sn--on {
  z-index: 3;
}
.sn--returned,
.sn--lost {
  z-index: 2;
}

/* ── Atem: statischer Schein, animierte Deckkraft ──────────────────────── */
.sn-breath {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--sn-plate, 32px) * 2.1);
  height: calc(var(--sn-plate, 32px) * 2.1);
  margin: calc(var(--sn-plate, 32px) * -1.05) 0 0 calc(var(--sn-plate, 32px) * -1.05);
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
  width: var(--sn-plate, 32px);
  height: var(--sn-plate, 32px);
  margin: calc(var(--sn-plate, 32px) / -2) 0 0 calc(var(--sn-plate, 32px) / -2);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #14100a;
  border: 2px solid var(--sn-c);
  /* KEIN clip-path. Ein Sechseck sah auf dem Papier besser aus und schnitt in
     Wirklichkeit die Glyphen ab: es kappt oben und unten je 26 %, und die
     detailreichen game-icons der Reise-Motivfamilie („castle-ruins",
     „cave-entrance") zerfielen darin zu Strichresten. 4 px Radius ist ohnehin
     die Projektregel — auch auf einer 90-px-Platte. */
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

/* ── Was der Klick tut, steht am Zeiger ─────────────────────────────────── */
.sn--act-waiting {
  cursor: default;
}
.sn--act-waiting:hover .sn-plate {
  transform: scale(1);
}
.sn--act-blocked {
  cursor: not-allowed;
}
.sn--act-blocked .sn-plate {
  border-color: var(--sn-d);
}
.sn--act-blocked .sn-ico {
  color: rgba(232, 220, 192, 0.5);
}
.sn--act-send:hover .sn-plate,
.sn--act-send:focus-visible .sn-plate {
  border-color: #e8c040;
}

/* Der Absende-Wimpel deckt den Glyph beim Überfahren. Nur `opacity` — die
   Platte darunter skaliert ohnehin schon. */
.sn-go {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--sn-plate, 32px) * 0.52);
  height: calc(var(--sn-plate, 32px) * 0.52);
  margin: calc(var(--sn-plate, 32px) * -0.26) 0 0 calc(var(--sn-plate, 32px) * -0.26);
  color: #e8c040;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease;
}
.sn-go > svg {
  width: 100%;
  height: 100%;
}
.sn:hover .sn-go,
.sn:focus-visible .sn-go {
  opacity: 1;
}
.sn--act-send:hover .sn-ico,
.sn--act-send:focus-visible .sn-ico {
  opacity: 0;
}

/* Abgewiesen: ein einmaliges Wackeln, reiner `transform`. */
.sn--refuse .sn-plate {
  animation: sn-refuse var(--sn-refuse, 420ms) ease-in-out;
}
/* Der Endzustand ist die Hover-Skalierung, nicht 1: geklickt wird nur, was
   unter dem Zeiger steht, und ein Rücksprung auf 1 läse sich als Fehler. */
@keyframes sn-refuse {
  0%,
  100% {
    transform: translateX(0) scale(1.12);
  }
  20% {
    transform: translateX(-3px) scale(1.12);
  }
  45% {
    transform: translateX(3px) scale(1.12);
  }
  70% {
    transform: translateX(-2px) scale(1.12);
  }
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

/* ── Gesicht: Glyph, darunter die Uhr, sobald die Platte sie trägt ──────── */
.sn-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--sn-plate, 32px) * 0.03);
  line-height: 1;
  pointer-events: none;
}
.sn-ico {
  /* Wächst mit der Platte statt am `width`-Attribut zu kleben. */
  width: calc(var(--sn-plate, 32px) * 0.46);
  height: calc(var(--sn-plate, 32px) * 0.46);
  color: var(--sn-c);
  transition: opacity 0.14s ease;
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
.sn-clock {
  font-size: calc(var(--sn-plate, 32px) * 0.2);
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}
.sn--warn .sn-clock {
  color: #ffb0a0;
}

/* ── Fortschrittsring ───────────────────────────────────────────────────── */
.sn-ring {
  position: absolute;
  left: -4px;
  top: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  transform: rotate(-90deg);
  pointer-events: none;
}
.sn-ring-track,
.sn-ring-fill {
  fill: none;
  stroke-width: 2.4;
}
.sn-ring-track {
  stroke: rgba(11, 8, 6, 0.72);
}
.sn-ring-fill {
  stroke: var(--sn-c);
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}
.sn--returned .sn-ring-fill {
  stroke: #64dcb4;
}
.sn--lost .sn-ring-fill {
  stroke: #cc6050;
}

/* Ein Ring statt einer animierten Randfarbe — der gewählte Zustand ist ein
   einmaliger Umschlag, kein Dauerläufer. */
.sn--on .sn-plate::after {
  content: '';
  position: absolute;
  inset: calc(var(--sn-plate, 32px) * -0.19);
  border: 2px solid #e8c040;
  border-radius: 50%;
  pointer-events: none;
}

/* ── Crew am Fuss der Platte ────────────────────────────────────────────── */
.sn-crew {
  position: absolute;
  left: 50%;
  bottom: calc(var(--sn-plate, 32px) * 0.05);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  pointer-events: none;
}
.sn-crew-img {
  width: calc(var(--sn-plate, 32px) * 0.22);
  height: calc(var(--sn-plate, 32px) * 0.22);
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.55);
  margin-left: calc(var(--sn-plate, 32px) * -0.08);
}
.sn-crew-img:first-child {
  margin-left: 0;
}
.sn-crew-more {
  margin-left: 3px;
  font-size: calc(var(--sn-plate, 32px) * 0.14);
  font-weight: 800;
  color: rgba(232, 192, 64, 0.8);
}

/* ── Die Pille: nur, solange die Platte die Uhr nicht selbst trägt ──────── */
.sn-pill {
  position: absolute;
  left: 50%;
  top: calc(50% + var(--sn-plate, 32px) * 0.62);
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
  .sn--lost .sn-plate,
  .sn--refuse .sn-plate {
    animation: none;
  }
}
</style>
