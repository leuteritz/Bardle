<template>
  <!--
    Die Fähigkeitenleiste sitzt mittig über dem Scoreboard — die Stelle, an der
    ein MOBA-Spieler sie sucht. Sie ist per v-if an die freie Sicht geknüpft:
    liegt ein Profil-Tab darüber, verschwindet mit der Leiste auch ihre
    Tastenanmeldung, damit ein „e" im Champion-Filter keine Fähigkeit zündet,
    die niemand sieht (useKeybindings meldet beim Unmount selbst ab).
  -->
  <div
    v-if="uiStore.bardActiveTab === null"
    ref="barEl"
    class="ability-bar"
    :class="{ 'ability-bar--in': revealed }"
    role="toolbar"
    aria-label="Bard abilities"
  >
    <!-- Was das letzte Wirken bewirkt hat, in einem Satz. Steht über allem
         anderen, weil es die Rückmeldung auf die gerade gedrückte Taste ist. -->
    <Transition name="ab-toast">
      <div v-if="toast" class="ab-toast" :style="{ '--ab-color': toastColor }" role="status">
        <span class="ab-toast-key">{{ toastKey }}</span>
        <span class="ab-toast-text">{{ toast }}</span>
      </div>
    </Transition>

    <!-- Tooltip der überfahrenen Kachel: mittig über der Leiste statt über der
         Kachel selbst — bei fünf Feldern rutschte er sonst am Rand aus dem
         Bild, und die Leiste ist schmal genug, dass die Zuordnung eindeutig
         bleibt. -->
    <Transition name="ab-tip">
      <div v-if="hovered" class="ab-tip" :style="{ '--ab-color': hovered.color }">
        <div class="ab-tip-head">
          <span class="ab-tip-name">{{ hovered.name }}</span>
          <span class="ab-tip-meta">{{ hovered.meta }}</span>
        </div>
        <p class="ab-tip-tagline">{{ hovered.tagline }}</p>
        <dl class="ab-tip-lines">
          <template v-for="line in hovered.lines" :key="line.label">
            <dt>{{ line.label }}</dt>
            <dd>{{ line.value }}</dd>
          </template>
        </dl>
      </div>
    </Transition>

    <div class="ab-row">
      <BardPassiveTile
        :resonance="store.resonance"
        :fill="store.resonanceFill"
        @hover="(on: boolean) => (hoveredId = on ? 'passive' : null)"
      />

      <span class="ab-divider" aria-hidden="true"></span>

      <BardAbilityTile
        v-for="def in BARD_ABILITIES"
        :key="def.id"
        :ref="(el: unknown) => setTileRef(def.id, el)"
        :def="def"
        :rank="store.rankOf(def.id)"
        :locked="!store.isUnlocked(def.id)"
        @cast="triggerKeybind(KEYBIND_BY_ABILITY[def.id])"
        @hover="(on: boolean) => (hoveredId = on ? def.id : null)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import BardAbilityTile from './BardAbilityTile.vue'
import BardPassiveTile from './BardPassiveTile.vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useGameStore } from '@/stores/core/gameStore'
import { onKeybinding, triggerKeybind } from '@/composables/system/useKeybindings'
import {
  BARD_ABILITIES,
  BARD_PASSIVE,
  bardAbilityEffectLines,
  getBardAbility,
} from '@/config/progression/bardAbilities'
import {
  ABILITY_BAR_REVEAL_MS,
  ABILITY_BAR_STACK_GAP_PX,
  ABILITY_CAST_FLASH_MS,
  ABILITY_CAST_TOAST_MS,
  ABILITY_COOLDOWN_DECIMAL_BELOW_SEC,
  ABILITY_MAX_RANK,
  RESONANCE_CLICK_REFUND_MS,
  RESONANCE_MAX_STACKS,
} from '@/config/constants'
import type { BardAbilityId, KeybindId } from '@/types'

const uiStore = useUiStore()
const store = useBardAbilityStore()
const gameStore = useGameStore()

/** Kürzel-ID je Slot — Klick auf die Kachel und Tastendruck laufen beide über
 *  `triggerKeybind`, damit die Keycap in beiden Fällen gleich reagiert. */
const KEYBIND_BY_ABILITY: Record<BardAbilityId, KeybindId> = {
  q: 'abilityQ',
  w: 'abilityW',
  e: 'abilityE',
  r: 'abilityR',
}

// ── Kachel-Elemente für den Frame-Lauf ──────────────────────────────────────
// Ein Register statt eines reaktiven Arrays: die Positionen der Ringe werden am
// Vue-Rendering vorbei geschrieben (Performance-Regel 3), also darf ihr Halter
// auch kein Re-Rendering auslösen.
interface TileEls {
  tile: HTMLElement | null
  sweep: HTMLElement | null
  clock: HTMLElement | null
  /** Zuletzt geschriebener Zustand. Ohne dieses Gedächtnis liefe jeder Frame
   *  durch `classList.toggle` und `textContent`, auch wenn sich nichts geändert
   *  hat — und jeder dieser Zugriffe erklärt den Teilbaum für ungültig. */
  cooling: boolean
  ready: boolean
  clockText: string
}
const tileEls = new Map<BardAbilityId, TileEls>()

function setTileRef(id: BardAbilityId, el: unknown): void {
  if (!el) {
    tileEls.delete(id)
    return
  }
  const exposed = el as {
    tileEl: HTMLElement | null
    sweepEl: HTMLElement | null
    clockEl: HTMLElement | null
  }
  tileEls.set(id, {
    tile: exposed.tileEl,
    sweep: exposed.sweepEl,
    clock: exposed.clockEl,
    cooling: false,
    ready: false,
    clockText: '',
  })
  ensureLoop()
}

// ── Abklingzeiten: ein rAF für die ganze Leiste ─────────────────────────────
// Er läuft nur, solange tatsächlich etwas kühlt, und hält sich danach selbst
// an. Vier eigene Schleifen — eine je Kachel — wären vier Aufwachvorgänge für
// eine einzige Zeile.
let rafId: number | null = null
let flashUntil = 0

function cooldownText(leftMs: number): string {
  const leftSec = leftMs / 1000
  return leftSec > ABILITY_COOLDOWN_DECIMAL_BELOW_SEC
    ? String(Math.ceil(leftSec))
    : leftSec.toFixed(1)
}

/**
 * Was sich zwischen zwei Frames NICHT ändert: Sperre und volle Abklingzeit
 * hängen allein am Bard-Level und an der Resonance. Als computed werden sie
 * genau dann neu gerechnet — statt achtmal je Frame über Getter, die eine
 * Funktion zurückgeben und deshalb bei jedem Aufruf ganz durchlaufen.
 *
 * Nachgemessen brachte das allerdings nichts (9,2 gegen 8,9 ms je Frame, also
 * Rauschen): die Kosten laufender Abklingzeiten stecken im Zeichnen der vier
 * Schleier, nicht im Ableiten ihrer Werte. Es bleibt trotzdem so — pro Frame
 * neu abzuleiten, was sich nur beim Level-Up ändert, wäre auch dann falsch,
 * wenn es billig ist.
 */
const slots = computed(() =>
  BARD_ABILITIES.map((def) => ({
    id: def.id,
    locked: !store.isUnlocked(def.id),
    total: store.cooldownMsOf(def.id),
  })),
)

function paint(): boolean {
  const now = Date.now()
  let busy = false

  for (const slot of slots.value) {
    const els = tileEls.get(slot.id)
    if (!els?.tile) continue

    const { locked, total } = slot
    const leftMs = Math.max(0, (store.cooldownReadyAt[slot.id] ?? 0) - now)
    const cooling = !locked && leftMs > 0

    if (cooling) {
      busy = true
      // Der einzige Wert, der wirklich in jeden Frame gehört.
      const rest = total > 0 ? Math.min(1, leftMs / total) : 0
      if (els.sweep) els.sweep.style.transform = `scaleY(${rest})`
      const text = cooldownText(leftMs)
      if (els.clock && text !== els.clockText) {
        els.clock.textContent = text
        els.clockText = text
      }
    } else if (els.cooling && els.sweep) {
      els.sweep.style.transform = 'scaleY(0)'
    }

    // Klassen nur beim Zustandswechsel — ein `toggle` mit demselben Wert ist
    // zwar folgenlos, der Zugriff selbst aber nicht kostenlos.
    const ready = !locked && !cooling
    if (cooling !== els.cooling) {
      els.tile.classList.toggle('ab-tile--cooling', cooling)
      els.cooling = cooling
    }
    if (ready !== els.ready) {
      els.tile.classList.toggle('ab-tile--ready', ready)
      els.ready = ready
    }
  }

  if (now < flashUntil) busy = true
  return busy
}

function frame(): void {
  rafId = paint() ? requestAnimationFrame(frame) : null
}

/** Startet den Lauf, falls er steht. Jede Stelle, die etwas zu zeigen hat
 *  (Wirken, Klick-Erstattung, frische Freischaltung), ruft ihn auf. */
function ensureLoop(): void {
  if (rafId === null) rafId = requestAnimationFrame(frame)
}

// Ein Klick auf die Sonne nimmt von jeder laufenden Abklingzeit ein Stück —
// der Balken muss diesen Sprung zeigen, sonst bleibt die Passive unsichtbar.
watch(() => gameStore.totalClicks, ensureLoop)
// Ein Level-Up kann eine Kachel freischalten oder ihren Rang heben.
watch(() => gameStore.level, ensureLoop)

// ── Wirken ──────────────────────────────────────────────────────────────────
function castAbility(id: BardAbilityId): void {
  if (!store.cast(id)) return
  const els = tileEls.get(id)
  if (els?.tile) {
    // Neustarten der Animation: die Klasse muss erst weg sein, bevor sie
    // wieder greift, sonst bleibt ein zweiter Druck in Folge ohne Blitz.
    els.tile.classList.remove('ab-tile--cast')
    void els.tile.offsetWidth
    els.tile.classList.add('ab-tile--cast')
  }
  flashUntil = Date.now() + ABILITY_CAST_FLASH_MS
  ensureLoop()
}

for (const def of BARD_ABILITIES) {
  onKeybinding(KEYBIND_BY_ABILITY[def.id], () => castAbility(def.id))
}

// Blitzklasse wieder abräumen, sobald ihre Zeit um ist.
let flashTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => store.lastCast.seq,
  () => {
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      for (const els of tileEls.values()) els.tile?.classList.remove('ab-tile--cast')
      flashTimer = null
    }, ABILITY_CAST_FLASH_MS)
  },
)

// ── Meldung des letzten Wirkens ─────────────────────────────────────────────
const toast = ref('')
const toastKey = ref('')
const toastColor = ref('#e8c040')
let toastTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => store.lastCast.seq,
  () => {
    const { id, summary } = store.lastCast
    if (!id || !summary) return
    const def = getBardAbility(id)
    toast.value = summary
    toastKey.value = def?.key ?? ''
    toastColor.value = def?.color ?? '#e8c040'
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = ''
      toastTimer = null
    }, ABILITY_CAST_TOAST_MS)
  },
)

// ── Tooltip ─────────────────────────────────────────────────────────────────
const hoveredId = ref<BardAbilityId | 'passive' | null>(null)

const hovered = computed(() => {
  const id = hoveredId.value
  if (!id) return null

  if (id === 'passive') {
    const capped = store.resonance >= RESONANCE_MAX_STACKS
    return {
      name: BARD_PASSIVE.name,
      color: BARD_PASSIVE.color,
      tagline: BARD_PASSIVE.tagline,
      meta: capped ? 'MAX' : `${store.resonance} / ${RESONANCE_MAX_STACKS}`,
      lines: [
        { label: 'Ability power', value: `${((store.resonancePowerMult - 1) * 100).toFixed(0)}%` },
        { label: 'Cooldowns', value: `−${(store.resonanceCdr * 100).toFixed(1)}%` },
        { label: 'Every click', value: `−${(RESONANCE_CLICK_REFUND_MS / 1000).toFixed(2)}s off cooldowns` },
        {
          label: 'Next stack',
          value: capped ? 'capped' : `${store.resonanceToNext} clicks`,
        },
      ],
    }
  }

  const def = getBardAbility(id)
  if (!def) return null
  const rank = store.rankOf(id)
  const locked = rank === 0

  return {
    name: def.name,
    color: def.color,
    tagline: def.tagline,
    meta: locked
      ? `Unlocks at level ${def.unlockLevel}`
      : `Rank ${rank}/${ABILITY_MAX_RANK} · ${(store.cooldownMsOf(id) / 1000).toFixed(1)}s`,
    lines: bardAbilityEffectLines(id, store.powerMultOf(id)),
  }
})

// ── Einfahren und Höhe veröffentlichen ──────────────────────────────────────
// Die Buff-Reihe sitzt an derselben Ankerlinie und stapelt sich über der
// Leiste; sie liest deren gemessene Höhe, statt eine Zahl zu raten.
const barEl = ref<HTMLElement | null>(null)
const revealed = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | null = null
let sizeObserver: ResizeObserver | null = null

/** Veröffentlicht wird die Höhe SAMT Abstand — die Buff-Reihe addiert den Wert
 *  einfach auf ihre eigene Ankerlinie und muss keine Lücke selbst kennen. */
function publishHeight(px: number): void {
  document.documentElement.style.setProperty(
    '--ability-bar-h',
    `${Math.round(px) + ABILITY_BAR_STACK_GAP_PX}px`,
  )
}

/** Nur die Kachelreihe zählt — Tooltip und Meldung schweben darüber und
 *  dürfen die Buff-Reihe nicht bei jedem Überfahren verschieben. */
function measureRow(): void {
  const row = barEl.value?.querySelector('.ab-row')
  if (row) publishHeight(row.getBoundingClientRect().height)
}

onMounted(() => {
  revealTimer = setTimeout(() => {
    revealed.value = true
    revealTimer = null
  }, ABILITY_BAR_REVEAL_MS)

  measureRow()
  const row = barEl.value?.querySelector('.ab-row')
  if (row) {
    sizeObserver = new ResizeObserver(measureRow)
    sizeObserver.observe(row)
  }
  ensureLoop()
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
  if (revealTimer) clearTimeout(revealTimer)
  if (toastTimer) clearTimeout(toastTimer)
  if (flashTimer) clearTimeout(flashTimer)
  sizeObserver?.disconnect()
  document.documentElement.style.removeProperty('--ability-bar-h')
})
</script>

<style scoped>
/* ── Die Leiste ───────────────────────────────────────────────────────────
   Sie liegt auf derselben Ankerlinie wie die Buff-Reihe, direkt über dem
   tiefen Mittelstreifen der Bottom-Bar. `pointer-events: none` am Rahmen,
   damit die Lücken zwischen den Kacheln den Klick auf die Sonne durchlassen —
   die Kacheln selbst schalten es wieder ein. */
.ability-bar {
  --ab-size: 84px;
  --ab-passive-size: 72px;
  --ab-gap: 10px;
  position: fixed;
  bottom: calc(var(--bottom-center-strip-h, 79px) + 14px);
  left: 50%;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  pointer-events: none;
  transform: translateX(-50%) translateY(12px);
  opacity: 0;
  transition:
    opacity 320ms ease,
    transform 440ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ability-bar--in {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.ab-row {
  display: flex;
  align-items: center;
  gap: var(--ab-gap);
}

/* Trennt den Zustand (Passive) von den Knöpfen (Q W E R). */
.ab-divider {
  width: 2px;
  height: calc(var(--ab-size) * 0.62);
  background: linear-gradient(to bottom, transparent, #5c3310 25%, #5c3310 75%, transparent);
}

/* ── Meldung des letzten Wirkens ──────────────────────────────────────────
   Eine Zeile, keine Karte: sie steht nur wenige Sekunden und darf den Blick
   nicht vom Orbit ziehen. */
.ab-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 5px 12px 6px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
}

.ab-toast-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  padding: 1px 4px 2px;
  background: #1e1006;
  border: 1px solid var(--ab-color, #e8c040);
  border-radius: 3px;
  font-size: 0.85rem;
  font-weight: 900;
  line-height: 1;
  color: var(--ab-color, #e8c040);
}

.ab-toast-text {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
  color: #f2ead2;
}

/* ── Tooltip ──────────────────────────────────────────────────────────────
   Der Kasten des Spiels, mit einer Haarlinie in der Leitfarbe der Fähigkeit —
   dieselbe Behandlung, die die Buff-Chips für dieselbe Aufgabe benutzen. */
.ab-tip {
  position: relative;
  width: 320px;
  margin-bottom: 10px;
  padding: 10px 12px 11px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  text-align: left;
}

.ab-tip::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: var(--ab-color, #e8c040);
}

.ab-tip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 3px;
}

.ab-tip-name {
  font-size: 1.05rem;
  font-weight: 900;
  line-height: 1.1;
  color: var(--ab-color, #e8c040);
}

.ab-tip-meta {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #8a7a52;
  font-variant-numeric: tabular-nums;
}

.ab-tip-tagline {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-style: italic;
  line-height: 1.3;
  color: #b89b5a;
}

/* Zwei Spalten: links wofür, rechts wie viel — die Zahlen stehen dadurch
   untereinander und lassen sich zwischen zwei Rängen vergleichen. */
.ab-tip-lines {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 12px;
  margin: 0;
}

.ab-tip-lines dt {
  font-size: 0.8rem;
  font-weight: 700;
  color: #8a7a52;
  white-space: nowrap;
}

.ab-tip-lines dd {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 800;
  color: #f2ead2;
  text-align: right;
}

/* ── Ein- und Ausblenden ──────────────────────────────────────────────── */
.ab-toast-enter-active,
.ab-tip-enter-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1.4, 0.4, 1);
}
.ab-toast-leave-active,
.ab-tip-leave-active {
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}
.ab-toast-enter-from,
.ab-tip-enter-from,
.ab-toast-leave-to,
.ab-tip-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* ── Auflösungsstufen ─────────────────────────────────────────────────────
   Full HD ist der flachste Viewport und bekommt die Grundgröße; darüber
   wachsen die Kacheln mit, damit sie auf 2K und 4K nicht verloren wirken.
   Die Reihe misst dabei nie mehr als 5 Kacheln plus Lücken — sie passt damit
   auf jeder Referenz zwischen die beiden erhöhten HUD-Panels. */
@media (min-width: 2400px) {
  .ability-bar {
    --ab-size: 104px;
    --ab-passive-size: 88px;
    --ab-gap: 12px;
  }
  .ab-tip {
    width: 380px;
  }
  .ab-tip-name {
    font-size: 1.2rem;
  }
  .ab-tip-lines dt,
  .ab-tip-lines dd {
    font-size: 0.88rem;
  }
  .ab-toast-text {
    font-size: 1.05rem;
  }
}

@media (min-width: 3400px) {
  .ability-bar {
    --ab-size: 128px;
    --ab-passive-size: 108px;
    --ab-gap: 14px;
  }
  .ab-tip {
    width: 450px;
  }
  .ab-tip-name {
    font-size: 1.45rem;
  }
  .ab-tip-lines dt,
  .ab-tip-lines dd {
    font-size: 1rem;
  }
  .ab-toast-text {
    font-size: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ability-bar,
  .ab-toast-enter-active,
  .ab-tip-enter-active,
  .ab-toast-leave-active,
  .ab-tip-leave-active {
    transition: none;
  }
}
</style>
