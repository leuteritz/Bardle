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
      <!--
        Die Passive führt den Weg zum nächsten Meep, nicht den Resonanz-Stapel
        — dieselbe Aussage wie die Kachel im Orbit. Der Stapel stand hier
        einmal und ist bewusst weg: er ist die HERKUNFT der beiden Prozentwerte
        im Kasten, nicht ihre Aussage, und zwang zum Umrechnen. Die Frage, die
        der Spieler beim Klicken stellt, ist „wie oft noch?".
      -->
      <div
        class="pr-meep"
        :class="{ 'pr-meep--due': clicksToMeep === 0, 'pr-meep--warp': warping }"
        :aria-label="meepAria"
      >
        <!-- Fortschrittsring über `stroke-dashoffset` einer SVG-Kreislinie,
             nie über `conic-gradient` (Performance-Regel 11). -->
        <svg class="pr-meep-svg" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="pr-meep-track" cx="12" cy="12" :r="PROFILE_HUD_RING_R" />
          <circle
            class="pr-meep-fill"
            cx="12"
            cy="12"
            :r="PROFILE_HUD_RING_R"
            :style="{ strokeDashoffset: ringOffset }"
          />
        </svg>
        <!-- Ist nichts mehr offen, steht hier NICHTS — den Zustand trägt der
             volle Ring. Dasselbe Verhalten wie an der Kachel im Orbit. -->
        <span v-if="clicksToMeep > 0" class="pr-meep-val" aria-hidden="true">{{
          formatNumberCompact(clicksToMeep)
        }}</span>
      </div>

      <!-- Der Kasten sagt, was die Kachel NICHT schon zeigt: die volle Zahl
           statt der Kurzform, wofür sie steht, und was die Passive gerade gibt.
           Der Klartextsatz der Passive steht im Orbit — hier geht der Kasten
           über einem Menü auf, das der Spieler gerade bedient, und alles, was
           er beim Überfliegen nicht in eine Entscheidung übersetzt, kostet ihn
           nur die Zeile. -->
      <template #tip>
        <div class="pr-tip" :style="{ '--pr-color': BARD_PASSIVE.color }">
          <span class="pr-tip-cap">{{ BARD_PASSIVE.name }}</span>
          <span class="pr-tip-lead" :class="{ 'pr-tip-lead--ready': clicksToMeep === 0 }">
            {{ meepLead }}
          </span>
          <span class="pr-tip-sub">Next meep</span>
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
import { computed, onUnmounted, ref, watch } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { BARD_ABILITIES, BARD_PASSIVE } from '@/config/progression/bardAbilities'
import {
  ABILITY_CAST_FLASH_MS,
  PROFILE_HUD_RING_CIRCUMFERENCE,
  PROFILE_HUD_RING_R,
} from '@/config/constants'
import { formatNumber, formatNumberCompact } from '@/config/ui/numberFormat'
import type { BardAbilityId } from '@/types'
import { gameNow } from '@/utils/game/gameClock'
import { formatCooldownSeconds } from '@/utils/ui/format'

const uiStore = useUiStore()
const gameStore = useGameStore()
const store = useBardAbilityStore()

// ── Passive: der Weg zum nächsten Meep ─────────────────────────────────────
// Beide Zahlen kommen aus dem gameStore, damit HUD und Profil nie zwei Stände
// zeigen — `clicksToNextMeep` rechnet linear in Klicks, `pendingMeepFill` misst
// dieselbe Strecke als Anteil.

/** Klicks, die bis zum nächsten Meep noch fehlen; 0, wenn er fällig ist. */
const clicksToMeep = computed(() => gameStore.clicksToNextMeep)

/** Voller Umfang = leerer Ring, 0 = voll. Der Wert ändert sich nur beim Klicken
 *  auf die Sonne — im offenen Profil also praktisch nie; er braucht deshalb
 *  keinen Frame-Lauf, ein computed genügt. */
const ringOffset = computed(
  () => PROFILE_HUD_RING_CIRCUMFERENCE * (1 - gameStore.pendingMeepFill),
)

/** Die volle Zahl im Kasten — die Kachel selbst trägt nur die Kurzform. */
const meepLead = computed(() =>
  clicksToMeep.value === 0 ? 'Arriving' : `${formatNumber(clicksToMeep.value)} clicks`,
)

const meepAria = computed(() =>
  clicksToMeep.value > 0
    ? `${BARD_PASSIVE.name} — ${clicksToMeep.value} clicks to the next meep`
    : `${BARD_PASSIVE.name} — next meep ready`,
)

/**
 * Der Schrittwechsel — dasselbe Muster wie an der Kachel im Orbit
 * (`BardPassiveTile.vue`) und aus demselben Grund: ist ein Meep erreicht, fällt
 * der Füllstand von ~1 auf ~0, und der Nachlauf des Rings führe den ganzen
 * Kreis RÜCKWÄRTS — eine Bewegung, die das Gegenteil dessen erzählt, was
 * gerade passiert ist. Für einen Frame fällt der Übergang deshalb weg.
 *
 * Zwei verschachtelte rAF sind nötig, kein einzelnes: das erste feuert noch
 * bevor der Browser die neue Position gerechnet hat.
 */
const meepStepKey = computed(() => gameStore.pendingMeeps + gameStore.meepsDevoured)
const warping = ref(false)
let warpRaf = 0

watch(meepStepKey, () => {
  warping.value = true
  cancelAnimationFrame(warpRaf)
  warpRaf = requestAnimationFrame(() => {
    warpRaf = requestAnimationFrame(() => {
      warping.value = false
    })
  })
})

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
  cancelAnimationFrame(warpRaf)
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
/* Nur die Struktur — alle Masse stehen in der Auflösungsstaffel am Ende der
   Datei, damit es für sie EINE Quelle gibt. `padding` ist dort mit dabei: der
   Abstand zur Holzecke des RpgFrame wächst mit der Kachel mit. */
.pr-cluster {
  display: flex;
  align-items: center;
  min-width: 0;
}

/* ── Passive ──────────────────────────────────────────────────────────────
   Der Zustand vor den Knöpfen — dieselbe Reihenfolge wie in der Leiste im
   Orbit, wo die Passive links vor Q W E R steht.

   Kein Meep-Motiv in der Kachel: auf 40–58 px trüge ein Bild nichts, was man
   erkennen könnte (Performance-Regel 7). Ring und Zahl beantworten die Frage
   bereits vollständig — der Ring als Anteil, die Zahl in Klicks. */
.pr-meep {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--pr-ring);
  height: var(--pr-ring);
  cursor: default;
}

.pr-meep-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Der Ring beginnt oben statt rechts. */
  transform: rotate(-90deg);
}

.pr-meep-track {
  fill: none;
  stroke: rgba(232, 224, 196, 0.14);
  stroke-width: 2;
}

/* Meep-Orange wie an der Kachel im Orbit, im Header und in der Materialleiste
   — dieselbe Sache trägt im ganzen Spiel dieselbe Farbe. */
.pr-meep-fill {
  fill: none;
  stroke: #fb923c;
  stroke-width: 2;
  stroke-linecap: round;
  /* Umfang bei r = 9 im viewBox 0 0 24 24 — dieselbe Zahl wie
     PROFILE_HUD_RING_CIRCUMFERENCE, die den Offset treibt. */
  stroke-dasharray: 56.55;
  transition: stroke-dashoffset 0.35s ease;
}

/* Ist der Meep fällig, steht der Ring voll — dann trägt er die hellere Stufe
   derselben Familie: voll ist voll. Ein einmaliger Umschlag der Malfarbe,
   keine laufende Animation. */
.pr-meep--due .pr-meep-fill {
  stroke: #fdba74;
}

/* Der eine Frame beim Schrittwechsel: ohne Nachlauf springt der Ring auf 0,
   statt rückwärts um den Kreis zu fahren. */
.pr-meep--warp .pr-meep-fill {
  transition: none;
}

/* Kleiner als der Resonanz-Zähler, der hier einmal stand: aus zwei Ziffern
   wird die Kurzform, und die trägt im Alltag vier Zeichen ("1.2K", "3.9M").

   Die Bezugsgröße ist nicht die Kachel, sondern die INNENFLÄCHE des Rings —
   bei `--pr-ring: 40px` sind das 26,7 px (r = 9 bei Strichbreite 2 im viewBox
   0 0 24 24), also zwei Drittel der Kante. Gemessen bei 1920: "3.9M" belegt
   24,2 px, es bleiben 2,5 px. Die Stufe ist gegen BEIDE Seiten gesetzt —
   grösser streift die vierstellige Form die Ringflanken, kleiner fällt die
   Zahl auf Full HD unter 10 px und ist nicht mehr zu lesen. */
.pr-meep-val {
  position: relative;
  max-width: 100%;
  font-size: calc(var(--pr-ring) * 0.25);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.01em;
  color: #fed7aa;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
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
   Gestaffelt nach der GEMESSENEN Seitenspalte, nicht nach der Monitorklasse.
   Der Unterschied ist der Grund, aus dem diese Staffel einmal falsch lag: ein
   Full-HD-Monitor unter Windows-Skalierung 125 % liefert dem Browser 1536 CSS-
   Pixel, nicht 1920. Eine Regel bei `max-width: 1919px` erwischte damit genau
   die Auflösung, für die die Grundstufe gedacht war, und zeigte dort die
   Notgrössen — auf einem 2K-Schirm (2048 CSS-Pixel bei 125 %) passte es.
   Gemessen wird deshalb, was WIRKLICH da ist:

     CSS-Breite | Spalte je Seite   (Modalbreite − Reiterleiste) / 2
     ---------- | --------------
       1280     |  119 px
       1366     |  143 px
       1536     |  183 px   ← Full HD @ 125 %
       1707     |  223 px   ← Full HD @ 112 %
       1920     |  293 px   ← Full HD @ 100 %
       2048     |  335 px   ← 2K @ 125 %
       2560     |  503 px
       3840     | 1143 px

   Die Reihe misst `Ring + Trennstrich + 4·Kachel + 5·gap + Polster`; darunter
   je Stufe, was sie braucht und was da ist. Ring und Trennstrich kommen erst
   dazu, wenn die Kachel dabei nicht unter 40px fällt — sie sind Zustand, die
   Kachel ist Bedienung. */
.pr-cluster {
  --pr-pip-w: 22px;
  --pr-pip-h: 32px;
  /* Steht auch dort, wo der Ring ausgeblendet ist: `var()` ohne Definition
     würde die Regel an `.pr-meep` ungültig machen, sobald jemand ihn wieder
     einschaltet. */
  --pr-ring: 34px;
  gap: 2px;
  padding: 0 8px 0 4px;
}

/* Bis 1365 gibt es weder Ring noch Trennstrich — dort reicht die Spalte für
   nichts als die vier Kacheln (106 von 119 px). */
.pr-meep,
.pr-divider {
  display: none;
}

@media (min-width: 1366px) {
  /* 133 von 143 px */
  .pr-cluster {
    --pr-pip-w: 28px;
    --pr-pip-h: 40px;
    gap: 3px;
    padding: 0 8px 0 4px;
  }
}

@media (min-width: 1536px) {
  /* 170 von 183 px — Full HD @ 125 % */
  .pr-cluster {
    --pr-pip-w: 36px;
    --pr-pip-h: 50px;
    gap: 4px;
    padding: 0 10px 0 4px;
  }
}

@media (min-width: 1600px) {
  /* 182 von 197 px */
  .pr-cluster {
    --pr-pip-w: 39px;
    --pr-pip-h: 54px;
    gap: 4px;
    padding: 0 10px 0 4px;
  }
}

@media (min-width: 1700px) {
  /* 212 von 223 px — Full HD @ 112 % */
  .pr-cluster {
    --pr-pip-w: 46px;
    --pr-pip-h: 62px;
    gap: 4px;
    padding: 0 12px 0 4px;
  }
}

@media (min-width: 1800px) {
  /* 223 von ~250 px. Die Kachel hat hier schon ihre volle Grösse — ab 1920
     kommt nur der Ring dazu, sie selbst bleibt. Anders herum (grössere Kachel
     ohne Ring, dann kleinere mit) schrumpfte sie beim Aufziehen des Fensters. */
  .pr-cluster {
    --pr-pip-w: 48px;
    --pr-pip-h: 64px;
    gap: 5px;
    padding: 0 14px 0 4px;
  }
}

@media (min-width: 1920px) {
  /* 281 von 293 px — Full HD @ 100 %. Ab hier trägt die Spalte den Ring, ohne
     dass die Kachel dafür schrumpfen müsste. */
  .pr-cluster {
    --pr-pip-w: 48px;
    --pr-pip-h: 64px;
    --pr-ring: 40px;
    gap: 4px;
    padding: 0 18px 0 6px;
  }
  .pr-meep {
    display: flex;
  }
  .pr-divider {
    display: block;
  }
}

@media (min-width: 2300px) {
  /* 346 von 409 px */
  .pr-cluster {
    --pr-pip-w: 58px;
    --pr-pip-h: 70px;
    --pr-ring: 50px;
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
  /* 399 von 1143 px — hier deckelt der Geschmack, nicht der Platz: eine Kachel,
     die die Reitericons (48px) deutlich überragt, verdrehte die Rangfolge im
     Kopf. */
  .pr-cluster {
    --pr-pip-w: 68px;
    --pr-pip-h: 80px;
    --pr-ring: 58px;
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
  .pr-meep-fill {
    transition: none;
  }
}
</style>
