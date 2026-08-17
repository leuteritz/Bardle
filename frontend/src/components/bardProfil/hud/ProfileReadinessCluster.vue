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

      <!-- Der Kasten sagt, was die Kachel NICHT schon zeigt: den Stand am
           Maximum und die beiden Wirkungen. Der Klartextsatz der Passive steht
           im Orbit — hier geht der Kasten über einem Menü auf, das der Spieler
           gerade bedient, und alles, was er beim Überfliegen nicht in eine
           Entscheidung übersetzt, kostet ihn nur die Zeile. -->
      <template #tip>
        <div class="pr-tip" :style="{ '--pr-color': BARD_PASSIVE.color }">
          <span class="pr-tip-cap">{{ BARD_PASSIVE.name }}</span>
          <span class="pr-tip-lead">{{ store.resonance }} / {{ RESONANCE_MAX_STACKS }}</span>
          <span class="pr-tip-sub">
            +{{ ((store.resonancePowerMult - 1) * 100).toFixed(0) }}% power ·
            −{{ (store.resonanceCdr * 100).toFixed(1) }}% cooldowns
          </span>
        </div>
      </template>
    </RpgBadgeTooltip>

    <span class="pr-divider" aria-hidden="true" />

    <RpgBadgeTooltip v-for="def in BARD_ABILITIES" :key="def.id" clear-ancestor=".pr-cluster">
      <!--
        Taste und Uhr sind Flow-Kinder einer Flex-Spalte, keine absolut
        gesetzten Ebenen. Das löst den Platzstreit ohne Sonderfall: kühlt die
        Kachel, steht die Taste oben und die Zahl darunter; kühlt sie nicht,
        ist die Uhr `display: none` und Flex zentriert die Taste von selbst.
        Kein Positionswechsel im CSS, kein Sprung aus einer Animation.
      -->
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
        <!-- Bereitschaftsschein auf eigener Ebene: der Schein steht statisch im
             CSS, animiert wird allein seine Deckkraft. Vier davon stehen
             nebeneinander (Performance-Regel 2/11). -->
        <span class="pr-pip-glow" aria-hidden="true" />
        <!-- Abklingzeit: `scaleY` wird pro Frame DIREKT an dieses Element
             geschrieben, am Vue-Rendering vorbei (Performance-Regel 3). -->
        <span class="pr-pip-sweep" aria-hidden="true" />
        <span class="pr-pip-key">{{ def.key }}</span>
        <span class="pr-pip-clock" aria-hidden="true" />
      </button>

      <template #tip>
        <div class="pr-tip" :style="{ '--pr-color': def.color }">
          <span class="pr-tip-cap">
            <span class="pr-tip-key">{{ def.key }}</span>
            {{ def.name }}
          </span>
          <span class="pr-tip-lead" :class="{ 'pr-tip-lead--ready': store.isReady(def.id) }">
            {{ leadOf(def.id) }}
          </span>
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

// ── Tooltip ────────────────────────────────────────────────────────────────
// Der Kasten trägt GENAU eine Aussage unter dem Namen: darf ich jetzt drücken?
// Rang, Klartextsatz und der volle Abklingwert stehen im ausführlichen Kasten
// der Leiste im Orbit — hier wären sie drei Zeilen, die niemand liest, während
// er im Menü etwas anderes tut.
function leadOf(id: BardAbilityId): string {
  const def = BARD_ABILITIES.find((d) => d.id === id)
  if (!store.isUnlocked(id)) return `Unlocks at Lv ${def?.unlockLevel ?? '?'}`
  const leftMs = store.cooldownLeftMsOf(id)
  return leftMs > 0 ? `${formatCooldownSeconds(leftMs)}s` : 'Ready'
}

function ariaLabelOf(id: BardAbilityId): string {
  const def = BARD_ABILITIES.find((d) => d.id === id)
  if (!def) return ''
  return store.isUnlocked(id)
    ? `Cast ${def.name} (${def.key}) — ${leadOf(id)}`
    : `${def.name} — unlocks at level ${def.unlockLevel}`
}
</script>

<style scoped>
/* ── Der Cluster ──────────────────────────────────────────────────────────
   Wie der Vitals-Cluster gegenüber: keine Karte, keine Kante. Er sitzt im
   Kopfstreifen und wird von der Reihe selbst zusammengehalten.

   Die Kacheln stehen im HOCHFORMAT, und das ist keine Stilfrage: der
   Kopfstreifen ist auf JEDER Zielauflösung 84px hoch (die clamp()-Werte der
   Reiter sind ab 1000px Viewporthöhe am Anschlag), die Seitenspalte daneben
   aber nur 292px breit — Höhe ist im Überfluss da, Breite ist der Engpass.
   Hochkant bekommen Taste und Sekundenzahl je eine eigene Zeile, statt sich
   einen Kasten zu teilen, in dem beide zu klein bleiben. */
.pr-cluster {
  --pr-pip-w: 48px;
  --pr-pip-h: 64px;
  --pr-ring: 40px;
  display: flex;
  align-items: center;
  gap: 4px;
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
  width: var(--pr-ring);
  height: var(--pr-ring);
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
  font-size: calc(var(--pr-ring) * 0.34);
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
  height: calc(var(--pr-pip-h) * 0.58);
  margin: 0 1px;
  background: linear-gradient(to bottom, transparent, #4a2a0e 28%, #4a2a0e 72%, transparent);
}

/* ── Die Kacheln ──────────────────────────────────────────────────────────
   Buchstabe statt Motiv: ein Fähigkeitsbild in dieser Grösse trüge nichts,
   was man erkennen könnte — die Taste dagegen schon (Performance-Regel 7).
   Das volle Motiv samt Rangkerben bleibt der Leiste im Orbit. */
.pr-pip {
  position: relative;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--pr-pip-h) * 0.04);
  width: var(--pr-pip-w);
  height: var(--pr-pip-h);
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
  transform: translateY(-2px);
  border-color: #6b431a;
}

.pr-pip:active:not(:disabled) {
  transform: translateY(0) scale(0.95);
}

/* Taste und Uhr liegen ÜBER dem Schleier — eine Kachel, deren Buchstabe unter
   dem Abklingschleier verschwindet, verliert genau dann ihre Identität, wenn
   der Spieler auf sie wartet. */
.pr-pip-key {
  position: relative;
  z-index: 5;
  font-size: calc(var(--pr-pip-w) * 0.4);
  font-weight: 900;
  line-height: 1;
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
   des Bestands: dann führt die Zahl, und zwei Farbflächen stritten. */
.pr-pip--ready .pr-pip-key {
  color: color-mix(in srgb, var(--pr-color, #e8c040) 62%, #f2ead2);
  opacity: 1;
}

.pr-pip:hover:not(:disabled) .pr-pip-key {
  color: var(--pr-color, #e8c040);
  opacity: 1;
}

/* Steht keine Zahl an, ist sie aus dem Fluss — und Flex zentriert die Taste
   von selbst. Das ist der Grund für die Flex-Spalte: keine zweite Regel, die
   die Taste beim Zustandswechsel woanders hinsetzt. */
.pr-pip-clock {
  position: relative;
  z-index: 4;
  display: none;
  font-size: calc(var(--pr-pip-w) * 0.42);
  font-weight: 800;
  line-height: 1;
  color: #e6dcbe;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
  pointer-events: none;
}

.pr-pip--cooling .pr-pip-clock,
.pr-pip--stasis .pr-pip-clock {
  display: block;
}

/* Die Stase hält die Welt an — ihre Zahl gehört nicht in dieselbe Farbe wie
   eine gewöhnliche Abklingzeit. */
.pr-pip--stasis .pr-pip-clock {
  color: #d8b4f0;
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
    inset 0 0 10px color-mix(in srgb, var(--pr-color, #e8c040) 22%, transparent);
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

.pr-pip--locked {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(55%);
}

.pr-pip--locked .pr-pip-key {
  color: #7a6d4c;
}

/* ── Tooltip ──────────────────────────────────────────────────────────────
   Überschrift · eine grosse Zahl · höchstens eine Zeile darunter. Der Kasten
   geht über einem Menü auf, das der Spieler gerade bedient — was er dabei
   nicht in eine Entscheidung übersetzen kann, kostet ihn nur die Zeile, in der
   es steht. Der ausführliche Kasten bleibt der Leiste im Orbit. */
.pr-tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 14px 13px;
}

.pr-tip-cap {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 1.05rem;
  font-weight: 900;
  line-height: 1.15;
  color: var(--pr-color, #e8c040);
}

.pr-tip-key {
  flex-shrink: 0;
  min-width: 1.5em;
  padding: 3px 5px;
  background: var(--pr-color, #e8c040);
  border-radius: 3px;
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 1;
  color: #12100a;
  text-align: center;
}

.pr-tip-lead {
  font-size: 1.55rem;
  font-weight: 900;
  line-height: 1.05;
  color: #ded0a6;
  font-variant-numeric: tabular-nums;
}

/* Bereit ist der einzige Zustand, der eine Farbe verdient — er ist die
   Aufforderung, die Kachel zu drücken. */
.pr-tip-lead--ready {
  color: var(--pr-color, #e8c040);
}

.pr-tip-sub {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.3;
  color: #8a7a52;
}

/* ── Auflösungsstufen ─────────────────────────────────────────────────────
   Gestaffelt nach BREITE, nicht nach Höhe: der Kopfstreifen ist überall gleich
   hoch, die Seitenspalte daneben aber nicht. Dasselbe Raster (2400 / 3400),
   das die Fähigkeitenleiste und die Buff-Reihe im Orbit benutzen.

   Reihe gesamt gegen verfügbare Spalte:
     Grundstufe  279 von 292 px (1920×1080)
     ≥ 2400      350 von 502 px (2560×1440)
     ≥ 3400      403 von 1142 px (4K)

   Nur die Grundstufe ist knapp. Wächst dort etwas — eine fünfte Fähigkeit, ein
   achter Reiter —, geht die Reserve zuerst an Ring und Abstände, nicht an die
   Kachelbreite: die Kachel ist die Bedienung, der Ring nur Zustand. */
@media (max-width: 1919px) {
  /* Keine Zielauflösung — die Reissleine für schmalere Fenster (1440×810 lässt
     nur 135px Spalte). Ring und Trennstrich weichen zuerst: sie sind Zustand,
     die Kacheln sind Bedienung. */
  .pr-cluster {
    --pr-pip-w: 30px;
    --pr-pip-h: 42px;
    gap: 3px;
    padding: 0 10px 0 4px;
  }
  .pr-res,
  .pr-divider {
    display: none;
  }
}

@media (min-width: 2400px) {
  .pr-cluster {
    --pr-pip-w: 58px;
    --pr-pip-h: 70px;
    --pr-ring: 54px;
    gap: 7px;
  }
  .pr-tip {
    padding: 13px 16px 15px;
  }
  .pr-tip-cap {
    font-size: 1.2rem;
  }
  .pr-tip-key {
    font-size: 0.88rem;
  }
  .pr-tip-lead {
    font-size: 1.75rem;
  }
  .pr-tip-sub {
    font-size: 0.95rem;
  }
}

@media (min-width: 3400px) {
  .pr-cluster {
    --pr-pip-w: 68px;
    --pr-pip-h: 80px;
    --pr-ring: 62px;
    gap: 8px;
  }
  .pr-tip {
    padding: 15px 18px 17px;
  }
  .pr-tip-cap {
    font-size: 1.4rem;
  }
  .pr-tip-key {
    font-size: 1rem;
  }
  .pr-tip-lead {
    font-size: 2rem;
  }
  .pr-tip-sub {
    font-size: 1.08rem;
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
