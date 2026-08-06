<script setup lang="ts">
/**
 * Der Ladeschleier der Rollen-Detailspalte.
 *
 * Er ist keine Dekoration, sondern der Platzhalter, der die Schiene VOR der
 * Detailseite besetzt: gleiche Breite, gleiche Fläche, gleicher linker Rand.
 * Damit rechnet das Board seine Kamera vom ersten Frame an mit dem endgültigen
 * Layout, und die teure Seite mountet später hinter einer deckenden Fläche
 * statt sichtbar nachzuklappen (siehe SIGIL_DETAILS_LOADER_MIN_MS).
 *
 * Darunter liegt ein Skelett im Zuschnitt der echten Seite — Rosterzeile oben,
 * links die Portraitspalte, rechts Skins, Werte und Perk-Pfad. Nicht als
 * Spielerei: 900×780 px fast leere Fläche lesen sich als kaputt, und wenn die
 * Blöcke schon dort stehen, wo gleich Inhalt steht, ist das Aufdecken ein
 * Schärferwerden statt ein Sprung. Die Maße der beiden tragenden Spalten kommen
 * aus denselben Konstanten wie die der Seite, damit beides zusammenbleibt.
 *
 * Alles, was sich bewegt, bewegt sich über `transform` oder `opacity` — der
 * Schleier steht ausgerechnet in den Frames, in denen das Board seine teuerste
 * Arbeit macht, und darf davon nichts abziehen. Der einzige Textwechsel ist die
 * Zeitangabe, und die schreibt nur, wenn sich ihre Zehntelstelle ändert.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import {
  ROLES,
  ALLIES_PER_ROLE,
  SWORN_ALLY_COUNT,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_DETAILS_LEFT_WIDTH,
  TEAM_SIGIL_MAIN_CHIP_WIDTH,
} from '@/config/constants'

const props = defineProps<{
  /** Rolle, deren Seite gleich erscheint — Farbe, Kürzel und Icon kommen daher. */
  roleIndex: number
  /** `performance.now()` beim Aufziehen des Schleiers — Basis der Zeitangabe. */
  startedAt: number
}>()

const roleDef = computed(() => ROLES[props.roleIndex])

/**
 * Breite der Schiene. Bewusst OHNE `zoom` am Wrapper: der Schleier wird beim
 * Verschwinden absolut positioniert, damit die Detailseite im selben Frame
 * seinen Platz im Fluss einnehmen kann — und `zoom` zusammen mit `inset` ergibt
 * eine Box, die über ihren Container hinausläuft. Der Faktor sitzt deshalb am
 * INHALT (.sdl-core), die Breite rechnet ihn hier selbst mit ein.
 */
const widthPx = computed(
  () => `calc(${TEAM_SIGIL_DETAILS_PANEL_WIDTH}px * var(--team-ui-scale, 1))`,
)
const leftColPx = computed(() => `${TEAM_SIGIL_DETAILS_LEFT_WIDTH}px`)
const mainChipPx = computed(() => `${TEAM_SIGIL_MAIN_CHIP_WIDTH}px`)

/** Die Rosterzeile: Sworn-Paar oben (breiter), der Rest der Bank darunter — die
 *  Aufteilung, die die Seite selbst hat, aus denselben Zahlen abgeleitet. */
const SWORN_CHIPS = SWORN_ALLY_COUNT
const BENCH_CHIPS = ALLIES_PER_ROLE - SWORN_ALLY_COUNT
/** Vier Wertekacheln, drei Perk-Karten — der Zuschnitt der rechten Spalte. */
const STAT_TILES = 4
const PERK_CARDS = 3

const elapsed = ref('0.0')
let frame: number | null = null

function tick() {
  const next = ((performance.now() - props.startedAt) / 1000).toFixed(1)
  // Nur schreiben, wenn sich die angezeigte Stelle ändert — sonst wäre das eine
  // DOM-Mutation pro Frame, und das ausgerechnet während des Tab-Aufbaus.
  if (next !== elapsed.value) elapsed.value = next
  frame = requestAnimationFrame(tick)
}

onMounted(() => {
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  if (frame !== null) cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="sdl" :style="{ '--rc': roleDef.color }" role="status" aria-live="polite">
    <div class="sdl-core">
      <!-- ══ Skelett im Zuschnitt der Seite ══ -->
      <div class="sdl-skeleton" aria-hidden="true">
        <div class="sdl-roster">
          <span class="sdl-block sdl-block--main" />
          <div class="sdl-bench">
            <span v-for="i in SWORN_CHIPS" :key="`sworn-${i}`" class="sdl-block sdl-block--sworn" />
            <span v-for="i in BENCH_CHIPS" :key="`ally-${i}`" class="sdl-block sdl-block--ally" />
          </div>
        </div>

        <div class="sdl-cols">
          <div class="sdl-col sdl-col--left">
            <span class="sdl-block sdl-block--splash" />
            <span class="sdl-block sdl-block--line" />
            <span class="sdl-block sdl-block--action" />
          </div>
          <div class="sdl-col sdl-col--right">
            <div class="sdl-pair">
              <span class="sdl-block sdl-block--skin" />
              <span class="sdl-block sdl-block--skin" />
            </div>
            <div class="sdl-grid">
              <span v-for="i in STAT_TILES" :key="`stat-${i}`" class="sdl-block sdl-block--stat" />
            </div>
            <div class="sdl-pair">
              <span v-for="i in PERK_CARDS" :key="`perk-${i}`" class="sdl-block sdl-block--perk" />
            </div>
          </div>
        </div>

        <!-- Ein einziger wandernder Glanz über dem ganzen Skelett: eine Fläche,
             die verschoben wird — kein Verlauf, der pro Frame neu entsteht. -->
        <span class="sdl-sheen" />
      </div>

      <!-- ══ Ladekarte ══ -->
      <div class="sdl-card">
        <!-- Zwei gegenläufige Bögen um das Rollenwappen: der äußere in der
             Rollenfarbe, der innere in Gold. Beide sind statische Ränder, die
             rotiert werden — nichts, was neu gerastert werden müsste. -->
        <div class="sdl-ring">
          <span class="sdl-arc sdl-arc--outer" />
          <span class="sdl-arc sdl-arc--inner" />
          <Icon :icon="roleDef.icon" width="34" height="34" class="sdl-ring-icon" />
        </div>

        <div class="sdl-role">{{ roleDef.short }}</div>
        <div class="sdl-caption">Assembling role details</div>

        <div class="sdl-bar"><span class="sdl-bar-run" /></div>

        <div class="sdl-time">{{ elapsed }}<span class="sdl-time-unit">s</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Dieselbe Fläche wie jede andere Schiene — flaches Tiefdunkel, linke Kante,
   eigener Stapelplatz. Das Sternenfeld des Tabs (.cosmic-stage-bg) liegt
   absolut auf z-index 0 und malt sonst über jedes statische Geschwister,
   egal wie deckend dessen Hintergrund ist (siehe .tsps-panel). */
.sdl {
  position: relative;
  z-index: 3;
  width: v-bind(widthPx);
  flex-shrink: 0;
  display: flex;
  min-height: 0;
  overflow: hidden;
  background: var(--rpg-bg-deep, #111008);
  border-left: 2px solid #5c3310;
}
/* Der Inhalt trägt den Maßstab der Team-Panels, nicht der Wrapper — siehe
   widthPx oben. */
.sdl-core {
  zoom: var(--team-ui-scale, 1);
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
}

/* ══ Skelett ══ */
.sdl-skeleton {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  overflow: hidden;
  opacity: 0.55;
}
.sdl-block {
  display: block;
  border-radius: 4px;
  background: #17150e;
  border: 1px solid #241d13;
}
.sdl-roster {
  flex: 0 0 18%;
  min-height: 0;
  display: flex;
  gap: 8px;
}
.sdl-block--main {
  flex: 0 0 v-bind(mainChipPx);
  /* die Hauptkarte trägt als einzige die Rollenfarbe — sie ist der Anker, an
     dem das Auge die Seite später wiederfindet */
  border-color: color-mix(in srgb, var(--rc) 34%, #241d13);
  background: color-mix(in srgb, var(--rc) 7%, #17150e);
}
/* Sechs Spuren, damit beide Reihen ohne gemeinsamen Teiler nebeneinander
   aufgehen: das Sworn-Paar nimmt je drei, die drei Bankplätze je zwei. */
.sdl-bench {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 1fr;
  gap: 8px;
}
.sdl-block--sworn {
  grid-column: span 3;
  min-width: 0;
}
.sdl-block--ally {
  grid-column: span 2;
  min-width: 0;
}
.sdl-cols {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 10px;
}
.sdl-col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sdl-col--left {
  flex: 0 0 v-bind(leftColPx);
}
.sdl-col--right {
  flex: 1;
}
.sdl-block--splash {
  flex: 1;
  min-height: 0;
}
.sdl-block--line {
  flex: 0 0 34px;
}
.sdl-block--action {
  flex: 0 0 54px;
}
.sdl-pair {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}
.sdl-block--skin {
  flex: 1;
  height: 122px;
}
.sdl-block--perk {
  flex: 1;
  height: 74px;
}
.sdl-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 1fr;
  gap: 8px;
}
.sdl-block--stat {
  min-height: 0;
}
.sdl-sheen {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 40%;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(232, 192, 64, 0),
    rgba(232, 192, 64, 0.05),
    rgba(232, 192, 64, 0)
  );
  animation: sdl-sheen 2.1s ease-in-out infinite;
}

/* ══ Ladekarte ══
   Flach abgedunkelt statt weichgezeichnet — `backdrop-filter` ist im Projekt
   nicht zugelassen und wäre hier auch das Teuerste am ganzen Schleier. */
.sdl-card {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 13px;
  padding: 30px 52px 26px;
  border-radius: 5px;
  background: rgba(10, 9, 5, 0.9);
  border: 2px solid #5c3310;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.7);
}

/* ── Ring ── */
.sdl-ring {
  position: relative;
  width: 104px;
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sdl-arc {
  position: absolute;
  border-radius: 50%;
  border-style: solid;
  border-color: transparent;
}
.sdl-arc--outer {
  inset: 0;
  border-width: 2px;
  border-top-color: var(--rc);
  border-right-color: var(--rc);
  opacity: 0.9;
  animation: sdl-spin 1.15s linear infinite;
}
.sdl-arc--inner {
  inset: 15px;
  border-width: 2px;
  border-bottom-color: #c89040;
  opacity: 0.6;
  animation: sdl-spin 1.9s linear infinite reverse;
}
.sdl-ring-icon {
  color: var(--rc);
  opacity: 0.92;
}

/* ── Beschriftung ── */
.sdl-role {
  font-size: 19px;
  letter-spacing: 0.3em;
  /* die Sperrung hängt rechts als Leerraum an — zurückholen, sonst steht das
     Wort sichtbar links von der Mitte */
  text-indent: 0.3em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--rc);
  text-shadow: 0 0 14px color-mix(in srgb, var(--rc) 45%, transparent);
}
.sdl-caption {
  font-size: 11.5px;
  letter-spacing: 0.15em;
  text-indent: 0.15em;
  text-transform: uppercase;
  line-height: 1;
  color: #8a8069;
}

/* ── Laufbalken ── */
.sdl-bar {
  position: relative;
  width: 186px;
  height: 3px;
  border-radius: 2px;
  background: #1c1710;
  border: 1px solid #2e2115;
  overflow: hidden;
}
.sdl-bar-run {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 38%;
  border-radius: 2px;
  background: linear-gradient(to right, #5c3310, #e8c060, #5c3310);
  animation: sdl-shuttle 1.35s cubic-bezier(0.55, 0, 0.45, 1) infinite;
}

/* ── Zeitangabe ── */
.sdl-time {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 23px;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.sdl-time-unit {
  font-size: 12px;
  color: rgba(200, 144, 64, 0.65);
}

@keyframes sdl-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes sdl-shuttle {
  0% {
    transform: translateX(-105%);
  }
  100% {
    transform: translateX(268%);
  }
}
@keyframes sdl-sheen {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(250%);
  }
}

/* Auf flacheren Desktops (Full HD) rückt die Karte etwas zusammen. */
@media (max-height: 1100px) {
  .sdl-card {
    gap: 11px;
    padding: 24px 44px 21px;
  }
  .sdl-ring {
    width: 88px;
    height: 88px;
  }
  .sdl-time {
    font-size: 21px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sdl-arc,
  .sdl-bar-run,
  .sdl-sheen {
    animation: none !important;
  }
  .sdl-sheen {
    opacity: 0;
  }
  .sdl-bar-run {
    width: 100%;
    opacity: 0.55;
  }
}
</style>
