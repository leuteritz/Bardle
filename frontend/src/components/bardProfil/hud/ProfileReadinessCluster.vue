<template>
  <!--
    Die Handlungsfähigkeit, rechts im Kopf des Profils — das Gegenstück zum
    Zustand links: dort was mit dir geschieht, hier was du tun kannst.

    Die Fähigkeitenleiste im Orbit hängt an `bardActiveTab === null` und ist bei
    offenem Profil weg, samt ihrer Tastenanmeldung. Die Abklingzeiten laufen
    trotzdem weiter. Die Kacheln hier sind deshalb ANKLICKBAR und melden bewusst
    KEINE Tasten an: ein „e" im Champion-Filter darf nichts zünden — genau der
    Grund, aus dem die Leiste ihre Kürzel abmeldet. Ein Klick kennt diesen
    Konflikt nicht.
  -->
  <div class="pr-cluster" role="toolbar" aria-label="Bard abilities">
    <RpgBadgeTooltip clear-ancestor=".pr-cluster">
      <div class="pr-res" :class="{ 'pr-res--max': resonanceMaxed }">
        <!-- Fortschrittsring über `stroke-dashoffset` einer SVG-Kreislinie,
             nie über `conic-gradient` (Performance-Regel 11). -->
        <svg class="pr-res-svg" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="pr-res-track" cx="12" cy="12" :r="PROFILE_HUD_RING_R" />
          <circle
            class="pr-res-fill"
            cx="12"
            cy="12"
            :r="PROFILE_HUD_RING_R"
            :style="{ strokeDashoffset: ringOffset }"
          />
        </svg>
        <span class="pr-res-val">{{ store.resonance }}</span>
      </div>

      <template #tip>
        <div class="pr-tip">
          <header class="pr-tip-head" :style="{ '--pr-color': BARD_PASSIVE.color }">
            <span class="pr-tip-name">{{ BARD_PASSIVE.name }}</span>
            <span class="pr-tip-rank">{{ resonanceMaxed ? 'Maxed' : 'Passive' }}</span>
          </header>
          <p class="pr-tip-note">{{ BARD_PASSIVE.description }}</p>
          <dl class="pr-tip-lines">
            <dt>Stacks</dt>
            <dd>{{ store.resonance }} / {{ RESONANCE_MAX_STACKS }}</dd>
            <dt>Ability power</dt>
            <dd>+{{ ((store.resonancePowerMult - 1) * 100).toFixed(0) }}%</dd>
            <dt>Cooldowns</dt>
            <dd>−{{ (store.resonanceCdr * 100).toFixed(1) }}%</dd>
          </dl>
        </div>
      </template>
    </RpgBadgeTooltip>

    <span class="pr-divider" aria-hidden="true" />

    <RpgBadgeTooltip v-for="def in BARD_ABILITIES" :key="def.id" clear-ancestor=".pr-cluster">
      <button
        :ref="(el: unknown) => setPipRef(def.id, el)"
        type="button"
        class="pr-pip"
        :class="{ 'pr-pip--locked': !store.isUnlocked(def.id) }"
        :style="{ '--pr-color': def.color }"
        :disabled="!store.isUnlocked(def.id)"
        :aria-label="ariaLabelOf(def.id)"
        @click="castAbility(def.id)"
      >
        <span class="pr-pip-key">{{ def.key }}</span>
        <!-- Bereitschaftsschein auf eigener Ebene: der Schein steht statisch im
             CSS, animiert wird allein seine Deckkraft. Vier davon stehen
             nebeneinander (Performance-Regel 2/11). -->
        <span class="pr-pip-glow" aria-hidden="true" />
        <!-- Abklingzeit: `scaleY` wird pro Frame DIREKT an dieses Element
             geschrieben, am Vue-Rendering vorbei (Performance-Regel 3). -->
        <span class="pr-pip-sweep" aria-hidden="true" />
        <span class="pr-pip-clock" aria-hidden="true" />
      </button>

      <template #tip>
        <div class="pr-tip">
          <header class="pr-tip-head" :style="{ '--pr-color': def.color }">
            <span class="pr-tip-key">{{ def.key }}</span>
            <span class="pr-tip-name">{{ def.name }}</span>
            <span class="pr-tip-rank">{{ rankLabelOf(def.id) }}</span>
          </header>
          <p class="pr-tip-note">{{ def.description }}</p>
          <dl class="pr-tip-lines">
            <dt>Cooldown</dt>
            <dd>{{ formatCooldownSeconds(store.cooldownMsOf(def.id)) }}s</dd>
            <dt>Status</dt>
            <dd :class="statusClassOf(def.id)">{{ statusLabelOf(def.id) }}</dd>
          </dl>
        </div>
      </template>
    </RpgBadgeTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { BARD_ABILITIES, BARD_PASSIVE } from '@/config/progression/bardAbilities'
import {
  ABILITY_CAST_FLASH_MS,
  ABILITY_MAX_RANK,
  PROFILE_HUD_RING_CIRCUMFERENCE,
  PROFILE_HUD_RING_R,
  RESONANCE_MAX_STACKS,
} from '@/config/constants'
import type { BardAbilityId } from '@/types'
import { gameNow } from '@/utils/game/gameClock'
import { formatCooldownSeconds } from '@/utils/ui/format'

const uiStore = useUiStore()
const gameStore = useGameStore()
const store = useBardAbilityStore()

// ── Passive ────────────────────────────────────────────────────────────────
const resonanceMaxed = computed(() => store.resonance >= RESONANCE_MAX_STACKS)

/** Voller Umfang = leerer Ring, 0 = voll. Der Wert ändert sich nur beim Klicken
 *  auf die Sonne — im offenen Profil also praktisch nie; er braucht deshalb
 *  keinen Frame-Lauf, ein computed genügt. */
const ringOffset = computed(() => PROFILE_HUD_RING_CIRCUMFERENCE * (1 - store.resonanceFill))

// ── Kachel-Elemente für den Frame-Lauf ─────────────────────────────────────
// Ein Register statt eines reaktiven Arrays: was pro Frame geschrieben wird,
// darf kein Re-Rendering auslösen (Performance-Regel 3). Muster: die
// Fähigkeitenleiste im Orbit (`BardAbilityBar.vue`).
interface PipEls {
  pip: HTMLElement
  sweep: HTMLElement | null
  clock: HTMLElement | null
  /** Zuletzt geschriebener Zustand — ohne dieses Gedächtnis liefe jeder Frame
   *  durch `classList.toggle` und `textContent`, auch wenn sich nichts geändert
   *  hat, und jeder Zugriff erklärt den Teilbaum für ungültig. */
  cooling: boolean
  ready: boolean
  stasis: boolean
  clockText: string
}
const pipEls = new Map<BardAbilityId, PipEls>()

function setPipRef(id: BardAbilityId, el: unknown): void {
  if (!el) {
    pipEls.delete(id)
    return
  }
  const pip = el as HTMLElement
  // Einmal beim Registrieren gesucht, nicht pro Frame — danach hält das
  // Register die Elemente selbst.
  pipEls.set(id, {
    pip,
    sweep: pip.querySelector('.pr-pip-sweep'),
    clock: pip.querySelector('.pr-pip-clock'),
    cooling: false,
    ready: false,
    stasis: false,
    clockText: '',
  })
  ensureLoop()
}

// ── Abklingzeiten: ein rAF für den ganzen Cluster ──────────────────────────
let rafId: number | null = null
let flashUntil = 0

/** Was sich zwischen zwei Frames NICHT ändert: Sperre und volle Abklingzeit
 *  hängen allein am Bard-Level und an der Resonance. */
const slots = computed(() =>
  BARD_ABILITIES.map((def) => ({
    id: def.id,
    locked: !store.isUnlocked(def.id),
    total: store.cooldownMsOf(def.id),
  })),
)

function paint(): boolean {
  // `gameNow()`, nicht `Date.now()`: verglichen wird gegen `cooldownReadyAt`,
  // und das lebt im Store.
  const now = gameNow()
  let busy = false

  for (const slot of slots.value) {
    const els = pipEls.get(slot.id)
    if (!els) continue

    const { locked, total } = slot
    const leftMs = Math.max(0, (store.cooldownReadyAt[slot.id] ?? 0) - now)
    const cooling = !locked && leftMs > 0
    // Die Stase steht über der Abklingzeit: solange die Welt still steht, ist
    // das die Zahl, auf die der Spieler wartet.
    const stasisMs = slot.id === 'r' ? Math.max(0, store.stasisUntil - now) : 0
    const stasis = stasisMs > 0

    if (cooling) {
      busy = true
      const rest = total > 0 ? Math.min(1, leftMs / total) : 0
      if (els.sweep) els.sweep.style.transform = `scaleY(${rest})`
    } else if (els.cooling && els.sweep) {
      els.sweep.style.transform = 'scaleY(0)'
    }

    if (stasis) busy = true

    if (cooling || stasis) {
      const text = String(formatCooldownSeconds(stasis ? stasisMs : leftMs))
      if (els.clock && text !== els.clockText) {
        els.clock.textContent = text
        els.clockText = text
      }
    }

    const ready = !locked && !cooling
    if (cooling !== els.cooling) {
      els.pip.classList.toggle('pr-pip--cooling', cooling)
      els.cooling = cooling
    }
    if (ready !== els.ready) {
      els.pip.classList.toggle('pr-pip--ready', ready)
      els.ready = ready
    }
    if (stasis !== els.stasis) {
      els.pip.classList.toggle('pr-pip--stasis', stasis)
      els.stasis = stasis
    }
  }

  if (now < flashUntil) busy = true
  return busy
}

function frame(): void {
  rafId = paint() ? requestAnimationFrame(frame) : null
}

/** Startet den Lauf, falls er steht — und nur bei offenem Profil. Hinter einem
 *  geschlossenen Modal ist nichts zu sehen, und was nicht sichtbar ist, darf
 *  nichts kosten (Performance-Regel 5). */
function ensureLoop(): void {
  if (uiStore.bardActiveTab === null) return
  if (rafId === null) rafId = requestAnimationFrame(frame)
}

function stopLoop(): void {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
}

// Die Komponente bleibt nach dem ersten Öffnen dauerhaft gemountet (das Modal
// schaltet nur noch `v-show`) — der Lauf muss deshalb am Reiter hängen, nicht
// am Lebenszyklus.
watch(
  () => uiStore.bardActiveTab,
  (tab) => {
    if (tab === null) stopLoop()
    else ensureLoop()
  },
  { immediate: true },
)

// Ein Klick auf die Sonne nimmt von jeder laufenden Abklingzeit ein Stück,
// ein Level-Up kann eine Kachel freischalten oder ihren Rang heben.
watch(() => gameStore.totalClicks, ensureLoop)
watch(() => gameStore.level, ensureLoop)

// ── Wirken ─────────────────────────────────────────────────────────────────
function castAbility(id: BardAbilityId): void {
  // Der Store prüft Sperre und Abklingzeit selbst und meldet `false`, wenn
  // nichts passiert ist.
  if (!store.cast(id)) return
  const els = pipEls.get(id)
  if (els) {
    // Die Klasse muss erst weg sein, bevor sie wieder greift — sonst bleibt ein
    // zweiter Druck in Folge ohne Blitz.
    els.pip.classList.remove('pr-pip--cast')
    void els.pip.offsetWidth
    els.pip.classList.add('pr-pip--cast')
  }
  flashUntil = gameNow() + ABILITY_CAST_FLASH_MS
  ensureLoop()
}

let flashTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => store.lastCast.seq,
  () => {
    if (flashTimer) clearTimeout(flashTimer)
    // Rein visuell: der Rückruf räumt eine Klasse ab, er ändert keinen
    // Spielzustand — deshalb `setTimeout` und nicht `gameTimeout()`.
    flashTimer = setTimeout(() => {
      for (const els of pipEls.values()) els.pip.classList.remove('pr-pip--cast')
      flashTimer = null
    }, ABILITY_CAST_FLASH_MS)
  },
)

onUnmounted(() => {
  stopLoop()
  if (flashTimer) clearTimeout(flashTimer)
})

// ── Tooltip-Texte ──────────────────────────────────────────────────────────
// Sie hängen an `abilityNow` (Sekundentakt) und nicht am Frame-Lauf: ein
// Kasten, der nur beim Überfahren steht, braucht keine 60 Hz.
function rankLabelOf(id: BardAbilityId): string {
  const rank = store.rankOf(id)
  if (rank === 0) return `Locked · Lv ${store.nextRankLevelOf(id)}`
  return `Rank ${rank}/${ABILITY_MAX_RANK}`
}

function statusLabelOf(id: BardAbilityId): string {
  if (!store.isUnlocked(id)) return 'Locked'
  const leftMs = store.cooldownLeftMsOf(id)
  return leftMs > 0 ? `${formatCooldownSeconds(leftMs)}s` : 'Ready'
}

function statusClassOf(id: BardAbilityId): string {
  return store.isReady(id) ? 'pr-tip-ok' : ''
}

function ariaLabelOf(id: BardAbilityId): string {
  const def = BARD_ABILITIES.find((d) => d.id === id)
  if (!def) return ''
  return store.isUnlocked(id)
    ? `Cast ${def.name} (${def.key}) — ${statusLabelOf(id)}`
    : `${def.name} — unlocks at level ${def.unlockLevel}`
}
</script>

<style scoped>
/* ── Der Cluster ──────────────────────────────────────────────────────────
   Wie der Vitals-Cluster gegenüber: keine Karte, keine Kante. Er sitzt im
   Kopfstreifen und wird von der Reihe selbst zusammengehalten. */
.pr-cluster {
  --pr-pip: 36px;
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  /* Abstand zur Holzecke des RpgFrame, die über dem Kopf liegt. */
  padding: 0 18px 0 6px;
}

/* ── Resonanz ─────────────────────────────────────────────────────────────
   Der Zustand vor den Knöpfen — dieselbe Reihenfolge wie in der Leiste im
   Orbit, wo die Passive links vor Q W E R steht. */
.pr-res {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--pr-pip);
  height: var(--pr-pip);
  cursor: default;
}

.pr-res-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Der Ring beginnt oben statt rechts. */
  transform: rotate(-90deg);
}

.pr-res-track {
  fill: none;
  stroke: rgba(232, 224, 196, 0.14);
  stroke-width: 2;
}

.pr-res-fill {
  fill: none;
  stroke: #8ec5d8;
  stroke-width: 2;
  stroke-linecap: round;
  /* Umfang bei r = 9 im viewBox 0 0 24 24 — dieselbe Zahl wie
     PROFILE_HUD_RING_CIRCUMFERENCE, die den Offset treibt. */
  stroke-dasharray: 56.55;
  transition: stroke-dashoffset 0.35s ease;
}

.pr-res--max .pr-res-fill {
  stroke: #e8c040;
}

.pr-res-val {
  position: relative;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  color: #cfe4ec;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.pr-res--max .pr-res-val {
  color: #e8c040;
}

.pr-divider {
  flex-shrink: 0;
  width: 1px;
  height: calc(var(--pr-pip) * 0.6);
  margin: 0 2px;
  background: linear-gradient(to bottom, transparent, #4a2a0e 28%, #4a2a0e 72%, transparent);
}

/* ── Die Kacheln ──────────────────────────────────────────────────────────
   Buchstabe statt Motiv: auf 34px trägt ein Fähigkeitsbild nichts mehr, was
   man erkennen könnte — die Taste dagegen schon (Performance-Regel 7). Das
   volle Motiv samt Rangkerben bleibt der Leiste im Orbit. */
.pr-pip {
  position: relative;
  flex-shrink: 0;
  width: var(--pr-pip);
  height: var(--pr-pip);
  padding: 0;
  overflow: hidden;
  background: #111008;
  border: 1px solid #4a2a0e;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55);
  cursor: pointer;
  user-select: none;
  transition:
    transform 140ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 160ms ease;
}

.pr-pip:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #6b431a;
}

.pr-pip:active:not(:disabled) {
  transform: translateY(0) scale(0.94);
}

/* Die Taste sitzt in der Ecke, nicht in der Mitte — genau wie auf der grossen
   Kachel im Orbit. Der Grund ist hier zwingend: die Mitte gehört der Uhr, und
   eine Kachel, deren Buchstabe unter der Sekundenzahl verschwindet, verliert
   beim Kühlen ihre Identität. Sie liegt ÜBER dem Schleier (z-index 5), damit
   sie auch dann lesbar bleibt.

   Statisch, kein Zustandswechsel der Position: ein Buchstabe, der beim Kühlen
   die Ecke wechselt, wäre Bewegung ohne Aussage. */
.pr-pip-key {
  position: absolute;
  top: calc(var(--pr-pip) * 0.04);
  left: calc(var(--pr-pip) * 0.11);
  z-index: 5;
  font-size: calc(var(--pr-pip) * 0.34);
  font-weight: 900;
  line-height: 1.2;
  color: #ded0a6;
  opacity: 0.82;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  pointer-events: none;
  transition:
    color 160ms ease,
    opacity 160ms ease;
}

/* Bereit trägt die Taste die Leitfarbe — sonst steht dort eine Kachel, in der
   ausser dem Schein nichts zu sehen ist. Beim Kühlen bleibt sie im Elfenbein
   des Bestands: dann führt die Zahl, und zwei Farbflächen auf 32px stritten. */
.pr-pip--ready .pr-pip-key {
  color: color-mix(in srgb, var(--pr-color, #e8c040) 62%, #f2ead2);
  opacity: 1;
}

.pr-pip:hover:not(:disabled) .pr-pip-key {
  color: var(--pr-color, #e8c040);
  opacity: 1;
}

/* Bereit: Innenlinie und ein Hauch Innenschein, statisch im CSS — animiert
   wird nur die Deckkraft. Vier bereite Kacheln sind der Normalfall. */
.pr-pip-glow {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 3px;
  pointer-events: none;
  opacity: 0;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--pr-color, #e8c040) 72%, transparent),
    inset 0 0 8px color-mix(in srgb, var(--pr-color, #e8c040) 22%, transparent);
}

.pr-pip--ready .pr-pip-glow {
  animation: pr-breathe 3.4s ease-in-out infinite;
}

.pr-pip--ready:hover:not(:disabled) .pr-pip-glow {
  animation-duration: 1.8s;
}

@keyframes pr-breathe {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.68;
  }
}

.pr-pip--cast .pr-pip-glow {
  animation: pr-cast-flash 420ms ease-out;
}

@keyframes pr-cast-flash {
  0% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
  }
}

/* Der Schleier hängt oben und schrumpft nach oben weg — er gibt die Kachel von
   unten frei, dieselbe Leserichtung wie eine Fortschrittsleiste. */
.pr-pip-sweep {
  position: absolute;
  inset: 0;
  z-index: 3;
  transform-origin: top center;
  transform: scaleY(0);
  background: rgba(6, 5, 2, 0.74);
  pointer-events: none;
}

/* Nur solange der Schleier wirklich pro Frame beschrieben wird — dauerhaft
   gesetzt wäre das eine eigene Ebene je Kachel für die 99 % der Zeit, in denen
   nichts kühlt (Performance-Regel 12). */
.pr-pip--cooling .pr-pip-sweep {
  will-change: transform;
}

.pr-pip-clock {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: none;
  align-items: center;
  justify-content: center;
  /* Etwas nach unten gerückt: oben links sitzt die Taste, und zwei Zeichen
     sollen sich auf 32px nicht ins Gehege kommen. */
  padding-top: calc(var(--pr-pip) * 0.14);
  font-size: calc(var(--pr-pip) * 0.36);
  font-weight: 800;
  line-height: 1;
  color: #e6dcbe;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
  pointer-events: none;
}

.pr-pip--cooling .pr-pip-clock,
.pr-pip--stasis .pr-pip-clock {
  display: flex;
}

/* Die Stase hält die Welt an — ihre Zahl gehört nicht in dieselbe Farbe wie
   eine gewöhnliche Abklingzeit. */
.pr-pip--stasis .pr-pip-clock {
  color: #d8b4f0;
}

.pr-pip--locked {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(55%);
}

.pr-pip--locked .pr-pip-key {
  color: #7a6d4c;
}

/* ── Tooltip ──────────────────────────────────────────────────────────── */
.pr-tip {
  padding: 9px 12px 11px;
}

.pr-tip-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}

.pr-tip-key {
  flex-shrink: 0;
  min-width: 1.45em;
  padding: 2px 4px;
  background: var(--pr-color, #e8c040);
  border-radius: 3px;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  color: #12100a;
  text-align: center;
}

.pr-tip-name {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--pr-color, #e8c040);
}

.pr-tip-rank {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a7a52;
}

.pr-tip-note {
  margin: 0 0 8px;
  font-size: 0.78rem;
  font-weight: 400;
  line-height: 1.35;
  color: #c6b68c;
}

.pr-tip-lines {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 12px;
  margin: 0;
  padding-top: 7px;
  border-top: 1px solid #2e2416;
}

.pr-tip-lines dt {
  font-size: 0.76rem;
  font-weight: 700;
  color: #8a7a52;
  white-space: nowrap;
}

.pr-tip-lines dd {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 800;
  color: #ded0a6;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pr-tip-ok {
  color: #7a9a6a;
}

/* ── Auflösungsstufen ─────────────────────────────────────────────────── */
@media (max-height: 1100px) {
  .pr-cluster {
    --pr-pip: 32px;
    gap: 4px;
  }
}

@media (min-width: 2400px) {
  .pr-cluster {
    --pr-pip: 42px;
    gap: 6px;
  }
  .pr-res-val {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pr-pip--ready .pr-pip-glow {
    animation: none;
    opacity: 0.55;
  }
  .pr-pip--cast .pr-pip-glow {
    animation: none;
  }
  .pr-pip:hover:not(:disabled) {
    transform: none;
  }
  .pr-res-fill {
    transition: none;
  }
}
</style>
