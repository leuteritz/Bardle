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
      <div
        v-if="hovered"
        class="ab-tip"
        :class="{ 'ab-tip--locked': hovered.locked }"
        :style="{ '--ab-color': hovered.color }"
      >
        <!-- Kopf: wer spricht. Die Keycap wiederholt die Taste der Kachel,
             damit Tooltip und Feld zusammengehören; der Rang steht rechts,
             weil er die Zahlen darunter erklärt. -->
        <header class="ab-tip-head">
          <span v-if="hovered.key" class="ab-tip-key">{{ hovered.key }}</span>
          <span class="ab-tip-name">{{ hovered.name }}</span>
          <span class="ab-tip-rank">{{ hovered.rankLabel }}</span>
        </header>

        <!-- Die Hauptwirkung, allein und als Erstes: der Wert vor seiner
             Beschriftung, weil er die Antwort auf „was bringt der Druck?" ist.
             Alles Weitere ist Beiwerk und steht darunter. -->
        <div class="ab-tip-lead">
          <span class="ab-tip-lead-value">{{ hovered.lead.value }}</span>
          <span class="ab-tip-lead-label">{{ hovered.lead.label }}</span>
        </div>

        <dl v-if="hovered.lines.length" class="ab-tip-lines">
          <template v-for="line in hovered.lines" :key="line.label">
            <dt>{{ line.label }}</dt>
            <dd>{{ line.value }}</dd>
          </template>
        </dl>

        <!-- Fuß: beschriftete Ablesungen wie im Astral Codex. Der Status ist
             das einzige Feld, das sich WÄHREND des Hovers ändert — er wird
             deshalb vom Frame-Lauf beschrieben, nicht von Vue gerendert. -->
        <footer class="ab-tip-foot">
          <div v-if="hovered.live" class="ab-tip-read">
            <span class="ab-tip-read-label">Status</span>
            <span ref="tipStatusEl" class="ab-tip-read-value ab-tip-status"></span>
          </div>
          <div v-for="cell in hovered.foot" :key="cell.label" class="ab-tip-read">
            <span class="ab-tip-read-label">{{ cell.label }}</span>
            <span class="ab-tip-read-value">{{ cell.value }}</span>
          </div>
        </footer>
      </div>
    </Transition>

    <div class="ab-row">
      <BardPassiveTile
        :resonance="store.resonance"
        :resonance-fill="store.resonanceFill"
        :meep-fill="meepFill"
        :clicks-to-meep="clicksToMeep"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import BardAbilityTile from './BardAbilityTile.vue'
import BardPassiveTile from './BardPassiveTile.vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useGameStore } from '@/stores/core/gameStore'
import { onKeybinding, triggerKeybind } from '@/composables/system/useKeybindings'
import { formatNumber, formatNumberCompact } from '@/config/ui/numberFormat'
import { formatCompactDuration } from '@/utils/ui/format'
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
  MS_PER_SECOND,
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

// ── Der nächste Meep ────────────────────────────────────────────────────────
// Die Passiv-Kachel führt den Weg zum nächsten Meep, nicht den Bestand — der
// steht im Header. Gerechnet wird auf derselben Grundlage wie im
// Meep-Tooltip des Headers (`chimesForMeep` gegen `meepChimeRequirement`),
// damit HUD und Header nie zwei verschiedene Stände zeigen.

/** Offene Chimes bis zum nächsten Meep. */
const meepRemaining = computed(() =>
  Math.max(0, gameStore.meepChimeRequirement - gameStore.chimesForMeep),
)

/** 0..1 — Füllstand des äußeren Rings. */
const meepFill = computed(() =>
  Math.min(1, gameStore.chimesForMeep / Math.max(1, gameStore.meepChimeRequirement)),
)

/**
 * Klicks, die noch fehlen — die Zahl unter der Figur.
 *
 * Bewusst NUR über den Klickwert gerechnet, obwohl die laufende Produktion
 * ebenfalls einzahlt: die Zahl beantwortet „wie oft muss ich noch drücken?",
 * und dafür ist die Produktion eine Zugabe, keine Größe der Rechnung. Was die
 * Produktion allein schafft, steht als Wartezeit im Tooltip daneben.
 */
const clicksToMeep = computed(() => {
  if (meepRemaining.value <= 0) return 0
  const perClick = Math.max(1, gameStore.chimesPerClick * gameStore.mvpBuffMultiplier)
  return Math.ceil(meepRemaining.value / perClick)
})

/** Wartezeit, wenn der Spieler die Hand liegen lässt — `—`, solange nichts läuft. */
const meepIdleEta = computed(() => {
  const rate = gameStore.chimesPerSecond * gameStore.mvpBuffMultiplier
  if (meepRemaining.value <= 0) return 'now'
  if (rate <= 0) return '—'
  return formatCompactDuration((meepRemaining.value / rate) * MS_PER_SECOND)
})

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

  // Der Status im offenen Tooltip hängt an derselben Uhr wie die Schleier —
  // er läuft deshalb im selben Frame mit, statt einen zweiten Lauf zu starten.
  paintTipStatus()

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

/**
 * Das Statusfeld im Fuß des Tooltips. Es ist das einzige, das sich ändert,
 * während der Zeiger stillsteht — geschrieben wird es deshalb direkt am
 * Rendering vorbei (Performance-Regel 3); ginge es über eine Ref, liefe pro
 * Frame ein VNode-Diff über den ganzen Tooltip samt Wirkungszeilen.
 */
const tipStatusEl = ref<HTMLElement | null>(null)
let tipStatusText = ''

function paintTipStatus(): void {
  const el = tipStatusEl.value
  const id = hoveredId.value
  if (!el || !id || id === 'passive') return

  const leftMs = Math.max(0, (store.cooldownReadyAt[id] ?? 0) - Date.now())
  const text = leftMs > 0 ? `${cooldownText(leftMs)}s` : 'Ready'
  if (text === tipStatusText) return
  el.textContent = text
  el.classList.toggle('ab-tip-status--ready', leftMs === 0)
  tipStatusText = text
}

// Beim Wechsel der überfahrenen Kachel steht ein frisches, leeres Feld da —
// es einmal zu füllen ist Sache dieses Watchers, danach übernimmt der Lauf.
watch(hoveredId, async () => {
  tipStatusText = ''
  await nextTick()
  paintTipStatus()
  ensureLoop()
})

/**
 * Der Tooltip in vier Rängen, statt einer Liste gleichwertiger Zeilen:
 *
 *   Kopf   — Taste, Name, Rang: welche Fähigkeit, wie weit gewachsen
 *   Lead   — die EINE Zahl, für die man die Taste drückt
 *   Zeilen — was sonst noch passiert
 *   Fuß    — Status und Abklingzeit: darf ich jetzt drücken?
 *
 * Die Hauptwirkung wird nicht hier ausgewählt, sondern ist per Vereinbarung
 * die erste Zeile aus `bardAbilityEffectLines` — die Fähigkeit selbst weiß am
 * besten, worauf es bei ihr ankommt.
 *
 * Nichts anderes steht drin. Der Kasten öffnet sich mitten im Spiel über dem
 * Orbit; alles, was der Spieler beim Überfliegen nicht in eine Entscheidung
 * übersetzen kann, kostet ihn nur die Zeile, in der es steht.
 */
const hovered = computed(() => {
  const id = hoveredId.value
  if (!id) return null

  if (id === 'passive') {
    const capped = store.resonance >= RESONANCE_MAX_STACKS
    const due = clicksToMeep.value === 0
    return {
      key: '',
      name: BARD_PASSIVE.name,
      color: BARD_PASSIVE.color,
      rankLabel: capped ? 'Max resonance' : 'Passive',
      locked: false,
      // Die Passive kühlt nicht ab — der Status-Slot bliebe leer.
      live: false,
      // Die Kachel führt mit dem nächsten Meep, also führt der Kasten damit
      // auch — gekürzt dort, voll hier. Ein Tooltip, der eine andere Zahl
      // voranstellt als das Feld darunter, lässt den Spieler suchen.
      lead: due
        ? { value: 'Arriving', label: 'Next meep' }
        : { value: formatNumber(clicksToMeep.value), label: 'Clicks to next meep' },
      lines: [
        {
          label: 'Meep progress',
          value: `${formatNumberCompact(gameStore.chimesForMeep)} / ${formatNumberCompact(gameStore.meepChimeRequirement)}`,
        },
        // Was die Produktion allein schafft — die Gegenprobe zur Klickzahl.
        { label: 'Idle in', value: meepIdleEta.value },
        { label: 'Meeps held', value: formatNumber(gameStore.meeps) },
        {
          label: 'Ability power',
          value: `+${((store.resonancePowerMult - 1) * 100).toFixed(0)}%`,
        },
        { label: 'Cooldowns', value: `−${(store.resonanceCdr * 100).toFixed(1)}%` },
        {
          label: 'Every click',
          value: `−${(RESONANCE_CLICK_REFUND_MS / 1000).toFixed(2)}s off cooldowns`,
        },
      ],
      foot: [
        { label: 'Resonance', value: `${store.resonance} / ${RESONANCE_MAX_STACKS}` },
        { label: 'Next stack', value: capped ? 'Capped' : `${store.resonanceToNext} clicks` },
      ],
    }
  }

  const def = getBardAbility(id)
  if (!def) return null
  const rank = store.rankOf(id)
  const locked = rank === 0
  const lines = bardAbilityEffectLines(id, store.powerMultOf(id))

  return {
    key: def.key,
    name: def.name,
    color: def.color,
    rankLabel: locked ? 'Locked' : `Rank ${rank} / ${ABILITY_MAX_RANK}`,
    locked,
    live: !locked,
    // Gesperrt zählt nur eines: ab wann. Die Wirkungszeilen bleiben trotzdem
    // vollständig stehen — als Vorschau auf das, was das Level bringt.
    lead: locked
      ? { value: `Level ${def.unlockLevel}`, label: 'Unlocks at' }
      : { value: lines[0].value, label: lines[0].label },
    lines: locked ? lines : lines.slice(1),
    foot: [{ label: 'Cooldown', value: `${(store.cooldownMsOf(id) / 1000).toFixed(1)}s` }],
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
  width: 1px;
  height: calc(var(--ab-size) * 0.54);
  background: linear-gradient(to bottom, transparent, #4a2a0e 28%, #4a2a0e 72%, transparent);
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

/* Gesperrt trägt der Kasten die Leitfarbe noch nicht — sie gehört zu einer
   Fähigkeit, die der Spieler wirken kann. */
.ab-tip--locked::before {
  background: #5c3310;
}

/* ── Kopf ─────────────────────────────────────────────────────────────────
   Taste, Name, Rang in einer Zeile. Die Keycap ist dieselbe wie in der
   Meldung des letzten Wirkens — sie bindet den Kasten an die Kachel, über
   der er gerade steht. */
.ab-tip-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ab-tip-key {
  flex-shrink: 0;
  align-self: center;
  min-width: 1.45em;
  padding: 1px 4px 2px;
  border: 1px solid color-mix(in srgb, var(--ab-color, #e8c040) 55%, transparent);
  border-radius: 3px;
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 1;
  color: var(--ab-color, #e8c040);
  text-align: center;
}

.ab-tip-name {
  flex: 1;
  min-width: 0;
  font-size: 1.05rem;
  font-weight: 900;
  line-height: 1.1;
  color: var(--ab-color, #e8c040);
}

.ab-tip-rank {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a52;
  font-variant-numeric: tabular-nums;
}

.ab-tip--locked .ab-tip-name,
.ab-tip--locked .ab-tip-key {
  color: #a08a5c;
  border-color: #4a2a0e;
}

/* ── Hauptwirkung ─────────────────────────────────────────────────────────
   Der Wert steht VOR seiner Beschriftung — umgekehrt zu den Zeilen darunter,
   weil er hier die Aussage ist und nicht der Eintrag einer Tabelle. Die
   Leitfarbe trägt er als Kante links, nicht als Fläche: eine eingefärbte Box
   in dieser Größe zöge mehr Blick als die Kachel selbst. */
.ab-tip-lead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 9px 0 9px;
  padding: 7px 10px 8px;
  background: #12100a;
  border-left: 3px solid var(--ab-color, #e8c040);
  border-radius: 0 3px 3px 0;
}

.ab-tip-lead-value {
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1.05;
  color: #f6efd8;
  font-variant-numeric: tabular-nums;
}

.ab-tip-lead-label {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a52;
  text-align: right;
}

.ab-tip--locked .ab-tip-lead {
  border-left-color: #5c3310;
}
.ab-tip--locked .ab-tip-lead-value {
  color: #c9b384;
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
  font-size: 0.78rem;
  font-weight: 700;
  color: #8a7a52;
  white-space: nowrap;
}

.ab-tip-lines dd {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 800;
  color: #ded0a6;
  text-align: right;
}

/* Gesperrt sind die Zeilen eine Vorschau, kein Versprechen — sie treten
   entsprechend zurück. */
.ab-tip--locked .ab-tip-lines dd {
  color: #a89a74;
}

/* ── Fuß ──────────────────────────────────────────────────────────────────
   Beschriftete Ablesungen wie im Astral Codex: Überschrift über dem Wert.
   „Ready" und „42.0s" allein sagten nicht, was sie zählen. */
.ab-tip-foot {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #2e2416;
}

.ab-tip-read {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ab-tip-read-label {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6f6244;
}

.ab-tip-read-value {
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.1;
  color: #e6dcbe;
  font-variant-numeric: tabular-nums;
}

/* Bereit ist der einzige Zustand, der eine Farbe verdient — er ist die
   Aufforderung, die Taste zu drücken. */
.ab-tip-status--ready {
  color: var(--ab-color, #e8c040);
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
  .ab-tip-lead-value {
    font-size: 1.32rem;
  }
  .ab-tip-lines dt,
  .ab-tip-lines dd {
    font-size: 0.86rem;
  }
  .ab-tip-read-value {
    font-size: 0.92rem;
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
  .ab-tip-lead-value {
    font-size: 1.6rem;
  }
  .ab-tip-lines dt,
  .ab-tip-lines dd {
    font-size: 0.98rem;
  }
  .ab-tip-read-value {
    font-size: 1.05rem;
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
