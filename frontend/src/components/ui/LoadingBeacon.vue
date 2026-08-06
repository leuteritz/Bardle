<script setup lang="ts">
/**
 * Die Ladekarte, die überall dort steht, wo eine Fläche hinter einem Schleier
 * aufgebaut wird — Rollen-Detailseite im Team-Tab, Arena im Star-Fight-Modal.
 *
 * Eine gemeinsame Karte statt zweier ähnlicher: der Spieler soll „hier wird
 * gerade etwas fertig" an genau einer Form erkennen, egal wo im Spiel er steht.
 * Was sich unterscheidet, ist der Akzent (Rollen- bzw. Bossfarbe), das Wappen
 * und die Beschriftung — nicht der Aufbau.
 *
 * WICHTIG für die Framerate: Sie steht per Definition in den Frames, in denen
 * der Hauptthread am längsten blockiert ist. Deshalb bewegt sich hier
 * ausschließlich `transform` — das läuft im Compositor und dreht sich weiter,
 * während der Hauptthread an seinem 200-ms-Frame rechnet. Eine Animation auf
 * `filter` oder `box-shadow` stünde in genau diesem Moment still und würde den
 * Ruckler erst sichtbar machen, den die Karte verdecken soll.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    /** Akzentfarbe des äußeren Bogens, des Wappens und der Überschrift. */
    accent: string
    /** Wappen in der Ringmitte — game-icons, passend zum Gegenstand. */
    icon: string
    /** Überschrift: was gleich erscheint (Rollenkürzel, Bossname). */
    title: string
    /** Zeile darunter, immer englisch (siehe Sprachregel). */
    caption: string
    /** `performance.now()` beim Aufziehen — Basis der Zeitangabe. */
    startedAt: number
  }>(),
  { accent: '#e8c040' },
)

const elapsed = ref('0.0')
let frame: number | null = null

function tick() {
  const next = ((performance.now() - props.startedAt) / 1000).toFixed(1)
  // Nur schreiben, wenn sich die angezeigte Stelle ändert — sonst wäre das eine
  // DOM-Mutation pro Frame, und das ausgerechnet unter Vollast.
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
  <div class="lb" :style="{ '--acc': accent }" role="status" aria-live="polite">
    <!-- Zwei gegenläufige Bögen um das Wappen: der äußere im Akzent, der innere
         in Gold. Beide sind statische Ränder, die rotiert werden — nichts, was
         pro Frame neu gerastert werden müsste. -->
    <div class="lb-ring">
      <span class="lb-arc lb-arc--outer" />
      <span class="lb-arc lb-arc--inner" />
      <Icon :icon="icon" width="34" height="34" class="lb-ring-icon" />
    </div>

    <div class="lb-title">{{ title }}</div>
    <div class="lb-caption">{{ caption }}</div>

    <div class="lb-bar"><span class="lb-bar-run" /></div>

    <div class="lb-time">{{ elapsed }}<span class="lb-time-unit">s</span></div>
  </div>
</template>

<style scoped>
/* Flach abgedunkelt statt weichgezeichnet — `backdrop-filter` ist im Projekt
   nicht zugelassen und wäre hier auch das Teuerste an der ganzen Karte. */
.lb {
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
.lb-ring {
  position: relative;
  width: 104px;
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lb-arc {
  position: absolute;
  border-radius: 50%;
  border-style: solid;
  border-color: transparent;
}
.lb-arc--outer {
  inset: 0;
  border-width: 2px;
  border-top-color: var(--acc);
  border-right-color: var(--acc);
  opacity: 0.9;
  animation: lb-spin 1.15s linear infinite;
}
.lb-arc--inner {
  inset: 15px;
  border-width: 2px;
  border-bottom-color: #c89040;
  opacity: 0.6;
  animation: lb-spin 1.9s linear infinite reverse;
}
.lb-ring-icon {
  color: var(--acc);
  opacity: 0.92;
}

/* ── Beschriftung ── */
.lb-title {
  max-width: 260px;
  font-size: 19px;
  letter-spacing: 0.3em;
  /* die Sperrung hängt rechts als Leerraum an — zurückholen, sonst steht das
     Wort sichtbar links von der Mitte */
  text-indent: 0.3em;
  text-transform: uppercase;
  line-height: 1.15;
  text-align: center;
  color: var(--acc);
  text-shadow: 0 0 14px color-mix(in srgb, var(--acc) 45%, transparent);
}
.lb-caption {
  font-size: 11.5px;
  letter-spacing: 0.15em;
  text-indent: 0.15em;
  text-transform: uppercase;
  line-height: 1;
  color: #8a8069;
}

/* ── Laufbalken ── */
.lb-bar {
  position: relative;
  width: 186px;
  height: 3px;
  border-radius: 2px;
  background: #1c1710;
  border: 1px solid #2e2115;
  overflow: hidden;
}
.lb-bar-run {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 38%;
  border-radius: 2px;
  background: linear-gradient(to right, #5c3310, #e8c060, #5c3310);
  animation: lb-shuttle 1.35s cubic-bezier(0.55, 0, 0.45, 1) infinite;
}

/* ── Zeitangabe ── */
.lb-time {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 23px;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.lb-time-unit {
  font-size: 12px;
  color: rgba(200, 144, 64, 0.65);
}

@keyframes lb-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes lb-shuttle {
  0% {
    transform: translateX(-105%);
  }
  100% {
    transform: translateX(268%);
  }
}

/* Auf flacheren Desktops (Full HD) rückt die Karte zusammen. */
@media (max-height: 1100px) {
  .lb {
    gap: 11px;
    padding: 24px 44px 21px;
  }
  .lb-ring {
    width: 88px;
    height: 88px;
  }
  .lb-time {
    font-size: 21px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lb-arc,
  .lb-bar-run {
    animation: none !important;
  }
  .lb-bar-run {
    width: 100%;
    opacity: 0.55;
  }
}
</style>
