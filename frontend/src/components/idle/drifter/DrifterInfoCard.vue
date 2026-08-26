<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useDrifterStore } from '@/stores/world/drifterStore'
import {
  getDrifter,
  drifterFxStage,
  DRIFTER_BUFF_EFFECT_LABELS,
  DRIFTER_BUFF_LABEL_ALL,
} from '@/config/world/drifters'
import DrifterBody from './DrifterBody.vue'
import type { DrifterBuffEffects, DrifterDef } from '@/types'
import {
  DRIFTER_CARD_ICON,
  DRIFTER_CARD_RESULT_MS,
  DRIFTER_CARD_TICK_MS,
  DRIFTER_CARD_URGENT_MS,
  DRIFTER_FADE_IN_FRAC,
  DRIFTER_RARITY_COLOR,
} from '@/config/constants'
import {
  drifterField,
  drifterRevealProgress,
  measuredFieldInsets,
} from '@/utils/orbit/drifterPath'
import { gameNow } from '@/utils/game/gameClock'

/**
 * Was fliegt da gerade, was bringt es, und wie lange ist es noch da —
 * oben links, unter der Auto-Pick-Meldung.
 *
 * Ein Drifter ist nur Sekunden im Bild. Ohne diese Karte müsste man das Objekt
 * erst finden, erkennen und bewerten, bevor man weiß, ob sich der Klick lohnt —
 * bei einem 10-Sekunden-Fenster ist das zu viel verlangt. Sie hat drei Zustände
 * und verschweigt auch den unangenehmen nicht: in Sicht (mit Countdown),
 * eingesammelt, entkommen.
 *
 * Sie steht erst, wenn der Körper ganz im Bild ist — nicht beim Spawn. Den
 * Anflug trägt allein der Randping, der dort steht, wo der Drifter hereinzieht.
 */
type CardState = 'inbound' | 'collected' | 'escaped'

const drifterStore = useDrifterStore()
const { active, lastCollect, lastExpired } = storeToRefs(drifterStore)

/** Der Drifter, den die Karte zeigt — im Flug der aktive, danach der letzte. */
const shownDef = ref<DrifterDef | null>(null)
const state = ref<CardState>('inbound')
const visible = ref(false)
/** Eigene Uhr: der Store tickt im Sekundentakt, der Countdown soll flüssig
 *  laufen und der Balken exakt beim Verschwinden ankommen. */
const remainingMs = ref(0)
/** Anteil der Flugzeit, der auf den Anflug außerhalb des Bildes entfällt. */
const revealFrac = ref(0)

let resultTimer: ReturnType<typeof setTimeout> | null = null
let ticker: ReturnType<typeof setInterval> | null = null

function clearTimers() {
  if (resultTimer) clearTimeout(resultTimer)
  if (ticker) clearInterval(ticker)
  resultTimer = null
  ticker = null
}

const activeDrifter = computed(() => active.value[0] ?? null)

const rarityColor = computed(() =>
  shownDef.value ? (DRIFTER_RARITY_COLOR[shownDef.value.rarity] ?? '#9d9d9d') : '#9d9d9d',
)

const remainingSeconds = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)))
const urgent = computed(
  () => state.value === 'inbound' && remainingMs.value > 0 && remainingMs.value <= DRIFTER_CARD_URGENT_MS,
)

/** Anteil des FANGFENSTERS, der noch übrig ist — treibt den Balken. Bezug ist
 *  nicht die Flugzeit: der Anflug ist vorbei, wenn die Karte auftaucht, und ein
 *  Balken, der bei 88 % beginnt, liest sich wie ein Fehler. Die Zahl daneben
 *  bleibt die echte Restzeit. */
const progress = computed(() => {
  const d = activeDrifter.value
  if (state.value !== 'inbound' || !d || d.flightMs <= 0) return state.value === 'inbound' ? 0 : 1
  const span = d.flightMs * (1 - revealFrac.value)
  if (span <= 0) return 0
  return Math.min(1, Math.max(0, remainingMs.value / span))
})

/** Wie oft noch getroffen werden muss — nur bei mehrstufigen Typen. */
const hitsLeft = computed(() => {
  const d = activeDrifter.value
  if (!d || !shownDef.value || shownDef.value.hits <= 1) return 0
  return Math.max(0, shownDef.value.hits - d.hitsLanded)
})

/** Zweite Zeile der Wirkung: die Dauer des Buffs, falls es einen gibt. */
const buffLine = computed(() => {
  const def = shownDef.value
  if (!def?.buff) return ''
  const keys = Object.keys(def.buff.effects) as (keyof DrifterBuffEffects)[]
  if (keys.length === 0) return ''
  const label = keys.length === 1 ? DRIFTER_BUFF_EFFECT_LABELS[keys[0]] : DRIFTER_BUFF_LABEL_ALL
  const mult = Math.max(...keys.map((k) => def.buff!.effects[k] ?? 1))
  return `${mult}× ${label} · ${Math.round(def.buff.durationMs / 1000)}s`
})

const headline = computed(() => {
  if (state.value === 'collected') return 'Collected'
  if (state.value === 'escaped') return 'Drifted away'
  return 'In sight'
})

// ── Zustandswechsel ────────────────────────────────────────────────────────

/** Anteil der Flugzeit bis zum Sichtkontakt. Der Boden ist die Einblendung —
 *  ein noch durchscheinender Körper ist auch dann nichts zum Suchen, wenn er
 *  die Bildkante geometrisch schon überquert hat. */
function revealFractionFor(def: DrifterDef, routeIndex: number, mirrored: boolean): number {
  const w = window.innerWidth
  const h = window.innerHeight
  const field = drifterField(w, h, measuredFieldInsets())
  const geometric = drifterRevealProgress(routeIndex, mirrored, field, def.sizePx / 2, w, h)
  return Math.min(1, Math.max(geometric, DRIFTER_FADE_IN_FRAC))
}

/** In Sicht: Countdown bis zum Verschwinden, aus der Wanduhr abgeleitet. Der
 *  Ticker steht ohnehin, also stellt er auch den Sichtkontakt fest — ein
 *  eigener Timer dafür liefe an `gameSpeed` vorbei. */
watch(
  activeDrifter,
  (d) => {
    if (!d) return
    const def = getDrifter(d.defId)
    if (!def) return
    clearTimers()
    shownDef.value = def
    state.value = 'inbound'
    revealFrac.value = revealFractionFor(def, d.routeIndex, d.mirrored)
    const revealAt = d.spawnedAt + d.flightMs * revealFrac.value
    const endsAt = d.spawnedAt + d.flightMs
    const read = () => {
      const now = gameNow()
      remainingMs.value = Math.max(0, endsAt - now)
      visible.value = now >= revealAt
    }
    read()
    ticker = setInterval(read, DRIFTER_CARD_TICK_MS)
  },
  { immediate: true },
)

/** Eingesammelt: die Karte quittiert, statt mitten im Countdown zu verschwinden. */
watch(
  () => lastCollect.value.seq,
  (seq) => {
    if (!seq) return
    const def = getDrifter(lastCollect.value.defId)
    if (!def) return
    showResult(def, 'collected')
  },
)

/** Entkommen: derselbe Platz, andere Farbe — was weg ist, wird auch gesagt. */
watch(
  () => lastExpired.value.seq,
  (seq) => {
    if (!seq) return
    const def = getDrifter(lastExpired.value.defId)
    if (!def) return
    showResult(def, 'escaped')
  },
)

function showResult(def: DrifterDef, next: CardState) {
  clearTimers()
  shownDef.value = def
  state.value = next
  visible.value = true
  remainingMs.value = 0
  resultTimer = setTimeout(() => {
    visible.value = false
    resultTimer = null
  }, DRIFTER_CARD_RESULT_MS)
}

onUnmounted(clearTimers)
</script>

<template>
  <Transition name="dic">
    <div
      v-if="visible && shownDef"
      class="dic-root"
      :class="`dic-root--${state}`"
      :style="{ '--accent': shownDef.color, '--rarity': rarityColor }"
      role="status"
    >
      <div class="dic-head">
        <Icon :icon="DRIFTER_CARD_ICON" width="13" height="13" class="dic-head__icon" />
        <span class="dic-head__lbl">{{ headline }}</span>

        <!-- Im Flug die harte Restzeit, danach das Ergebnis-Zeichen. -->
        <span
          v-if="state === 'inbound'"
          class="dic-clock"
          :class="{ 'dic-clock--urgent': urgent }"
          :title="`${remainingSeconds}s left to catch it`"
        >
          <span class="dic-clock__num">{{ remainingSeconds }}</span>
          <span class="dic-clock__unit">s</span>
        </span>
        <span v-else class="dic-mark" :class="`dic-mark--${state}`">
          {{ state === 'collected' ? '✓' : '✕' }}
        </span>
      </div>

      <div class="dic-main">
        <!-- Die Bühne zeigt den Körper, nicht das Glyph. Das ist der Zweck der
             Karte: sie soll sagen, WONACH man am Himmel sucht, und dafür taugt
             nur die Silhouette, die dort auch wirklich fliegt. Das Icon bleibt
             dem Buff-Chip — dort geht es um die Wirkung, nicht um das Objekt.
             Unter `DRIFTER_ORNAMENT_MIN_SIZE` zeigt der Körper von sich aus nur
             Kern, Terminator und Saum; genau dafür ist die Schwelle da. -->
        <span class="dic-stage">
          <span class="dic-stage__body">
            <DrifterBody
              :kind="shownDef.body"
              :color="shownDef.color"
              :motion="drifterFxStage(shownDef.rarity).motion"
            />
          </span>
        </span>

        <span class="dic-body">
          <span class="dic-name">{{ shownDef.name }}</span>
          <!-- Der Effekt ist der Grund, warum die Karte existiert — er darf
               umbrechen, aber niemals abgeschnitten werden. -->
          <span class="dic-effect">{{ shownDef.effectLine }}</span>
          <span class="dic-meta">
            <span class="dic-rarity">{{ shownDef.rarity }}</span>
            <template v-if="buffLine">
              <span class="dic-meta__dot">·</span>
              <span class="dic-buff">{{ buffLine }}</span>
            </template>
          </span>
        </span>
      </div>

      <!-- Mehrstufige Typen sagen an, wie oft noch getroffen werden muss —
           sonst wirkt ein Treffer ohne Belohnung wie ein Fehlklick. -->
      <div v-if="state === 'inbound' && hitsLeft > 0" class="dic-hits">
        <span class="dic-hits__lbl">Strikes left</span>
        <span class="dic-hits__pips">
          <span
            v-for="i in shownDef.hits"
            :key="i"
            class="dic-pip"
            :class="{ 'dic-pip--done': i <= shownDef.hits - hitsLeft }"
          ></span>
        </span>
      </div>

      <!-- Ablaufbalken: reines scaleX am Balken selbst, kein Layout pro Tick. -->
      <span class="dic-bar">
        <span class="dic-bar__fill" :style="{ transform: `scaleX(${progress})` }"></span>
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* Unter allem, was oben links schon steht: dem Wayfinder, der Auto-Pick-Meldung,
   der Riss- und der Omen-Karte. Jede veröffentlicht ihre eigene Unterkante per
   ResizeObserver und ist 0, solange sie nicht steht — `max()` statt einer Summe,
   weil das ABSOLUTE Unterkanten sind und nicht Höhen, die sich stapeln ließen.
   So teilen sich die fünf Karten die Ecke, ohne sich je zu überdecken. */
.dic-root {
  position: fixed;
  top: calc(
    max(
        var(--wayfinder-bottom, 0px),
        var(--autopick-bottom, 0px),
        var(--omen-card-bottom, 0px),
        var(--void-card-bottom, 0px),
        var(--landfall-card-bottom, 0px)
      ) + 0.5rem
  );
  left: var(--hud-col-edge);
  z-index: 899;
  width: var(--hud-col-w);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
  background: var(--rpg-bg-header);
  border: 2px solid var(--rpg-wood);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px var(--rpg-wood-inner),
    0 8px 24px rgba(0, 0, 0, 0.85);
  overflow: hidden;
  transition: top 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Rangstreifen über der Karte — dieselbe Rolle wie die Goldlinie an jedem
   Modal, nur in der Farbe der Seltenheitsstufe. Bis hierher stand der Rang als
   Wort in der Fußzeile und war damit das Letzte, was man liest; als Streifen
   ist er das Erste, was man sieht, und kostet keine Zeile Höhe. Der linke
   Rahmen bleibt die EIGENfarbe des Drifters — zwei verschiedene Aussagen,
   deshalb zwei verschiedene Kanten. */
.dic-root::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--rarity) 22%,
    var(--rarity) 78%,
    transparent 100%
  );
  opacity: 0.9;
  pointer-events: none;
}

/* Ergebniszustände: der Rahmen quittiert, der Inhalt bleibt lesbar. */
.dic-root--collected {
  border-left-color: #52b830;
}
.dic-root--escaped {
  border-left-color: #6a6258;
}
.dic-root--escaped .dic-stage,
.dic-root--escaped .dic-name,
.dic-root--escaped .dic-effect {
  opacity: 0.55;
}

/* ── Kopfzeile ───────────────────────────────────────────────────── */
.dic-head {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dic-head__icon {
  flex-shrink: 0;
  color: #8a7a52;
}

.dic-head__lbl {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7a52;
}

.dic-clock {
  margin-left: auto;
  display: flex;
  align-items: baseline;
  gap: 1px;
  padding: 2px 9px 3px;
  color: #b8a878;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease;
}

.dic-clock__num {
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
}

.dic-clock__unit {
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  opacity: 0.7;
}

/* Letzte Sekunden vor dem Entkommen — jetzt oder nie. */
.dic-clock--urgent {
  color: #ff8a72;
  background: #2a0e0c;
  border-color: #8a3020;
}

.dic-mark {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  border-radius: 4px;
  border: 1px solid #3a2c14;
  background: #100e08;
}
.dic-mark--collected {
  color: #6ec040;
  border-color: #2e7a1a;
}
.dic-mark--escaped {
  color: #9a9086;
}

/* ── Drifter ─────────────────────────────────────────────────────── */
.dic-main {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.dic-stage {
  --drifter-size: 34px;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 55%, #14120c);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--accent) 20%, #14120c),
    #100e08 74%
  );
}

/* Der Körper braucht eine Box mit Maßen — `DrifterBody` legt sich mit
   `inset: 0` hinein und rechnet sein `--u` aus `--drifter-size`. */
.dic-stage__body {
  position: relative;
  width: var(--drifter-size);
  height: var(--drifter-size);
}

.dic-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dic-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Wickelt statt zu kürzen: „Caretaker's Boon — ×3 to everything for 90s" passt
   auf Full HD nicht in eine Zeile, und abgeschnitten ist er wertlos. */
.dic-effect {
  font-size: 14px;
  font-weight: 900;
  line-height: 1.2;
  color: #e8c040;
  overflow-wrap: anywhere;
}

.dic-meta {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  line-height: 1.2;
}

.dic-rarity {
  text-transform: uppercase;
  color: var(--rarity);
}

.dic-meta__dot {
  color: #6a5c3c;
}

.dic-buff {
  color: #b89b5a;
}

/* ── Treffer-Fortschritt ─────────────────────────────────────────── */
.dic-hits {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dic-hits__lbl {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8a7a52;
}

.dic-hits__pips {
  display: flex;
  gap: 5px;
}

.dic-pip {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #241a0c;
  border: 1px solid #3a2c14;
}

.dic-pip--done {
  background: var(--accent);
  border-color: var(--accent);
}

/* ── Ablaufbalken ────────────────────────────────────────────────── */
.dic-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: #241a0c;
}

.dic-bar__fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transform-origin: left center;
  /* Der Wert kommt alle 100 ms neu; die kurze Transition glättet die Stufen,
     ohne den Balken hinter der Uhr herlaufen zu lassen. */
  transition: transform 0.1s linear;
}

.dic-root--collected .dic-bar__fill {
  background: #52b830;
}
.dic-root--escaped .dic-bar__fill {
  background: #6a6258;
}

/* ── Auftritt ────────────────────────────────────────────────────── */
.dic-enter-active,
.dic-leave-active {
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}
.dic-enter-from,
.dic-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

/* ── Auflösungsstufen ────────────────────────────────────────────── */
@media (max-height: 1100px) {
  .dic-root {
    gap: 7px;
    padding: 9px 11px 11px;
  }
  .dic-stage {
    --drifter-size: 31px;
    width: 44px;
    height: 44px;
  }
}

@media (min-width: 2400px) {
  .dic-root {
    /* Die volle Kette, wie oben. Sie stand hier ohne `--void-card-bottom`, und
       ab 2400 px lag die Karte damit über der Riss-Karte. */
    top: calc(
      max(
          var(--wayfinder-bottom, 0px),
          var(--autopick-bottom, 0px),
          var(--omen-card-bottom, 0px),
          var(--void-card-bottom, 0px),
          var(--landfall-card-bottom, 0px)
        ) + 0.7rem
    );
    gap: 10px;
    padding: 13px 15px 15px;
  }
  .dic-head__lbl {
    font-size: 12px;
  }
  .dic-clock__num {
    font-size: 23px;
  }
  .dic-clock__unit {
    font-size: 13px;
  }
  .dic-mark {
    width: 30px;
    height: 30px;
    font-size: 18px;
  }
  .dic-stage {
    --drifter-size: 41px;
    width: 58px;
    height: 58px;
  }
  .dic-name {
    font-size: 17px;
  }
  .dic-effect {
    font-size: 17px;
  }
  .dic-meta {
    font-size: 12px;
  }
  .dic-bar {
    height: 4px;
  }
}

@media (min-width: 3400px) {
  .dic-head__lbl {
    font-size: 13.5px;
  }
  .dic-clock__num {
    font-size: 27px;
  }
  .dic-clock__unit {
    font-size: 15px;
  }
  .dic-mark {
    width: 34px;
    height: 34px;
    font-size: 21px;
  }
  .dic-stage {
    --drifter-size: 48px;
    width: 68px;
    height: 68px;
  }
  .dic-name {
    font-size: 20px;
  }
  .dic-effect {
    font-size: 20px;
  }
  .dic-meta {
    font-size: 14px;
  }
  .dic-bar {
    height: 5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dic-root,
  .dic-bar__fill {
    transition: none;
  }
}
</style>
