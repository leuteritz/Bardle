<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import { formatNumber } from '@/config/ui/numberFormat'
import { invalidateHudField } from '@/utils/ui/hudField'
import { useMissionFace } from '@/composables/ui/useMissionFace'
import { missionObjectiveLine } from '@/config/progression/missions'
import type { MissionDef } from '@/types'

/**
 * Woran Bard als Nächstes arbeitet — oben links, über allem anderen.
 *
 * Die Karte ist das einzige DAUERHAFTE Glied der linken Spalte, und daraus
 * folgt ihre Position: sie steht ganz oben und schiebt sich nie. Auto-Pick,
 * Riss, Vorzeichen und Drifter sind flüchtig; hinge die Missionskarte an ihnen,
 * wanderte das eine Element, auf das der Spieler sich verlässt, mehrmals pro
 * Minute auf und ab.
 *
 * Sie hat KEINEN eigenen Takt: der Store rechnet im Sekundentakt aus
 * `gameStore.tick()`, und ein Ziel ohne Frist braucht nichts Feineres.
 */
const uiStore = useUiStore()

/** Gesicht und Abschlussblitz teilt die Karte mit der Wayfinder-Zeile im
 *  Pause-Overlay — beim Blitz steht der Store schon eine Stufe weiter. */
const { face, flashing } = useMissionFace()

function tooltipFor(def: MissionDef, rewardLabel: string): string {
  return `${def.name} — ${missionObjectiveLine(def)}. ${def.blurb} · ${rewardLabel}`
}

/** Unter einem geöffneten Profil-Tab ist nichts davon zu lesen. An `face`, nicht
 *  an `activeView`: sonst verschwände die letzte Stufe, während sie gefeiert wird. */
const visible = computed(() => face.value !== null && uiStore.bardActiveTab === null)

// ── Unterkante veröffentlichen ───────────────────────────────────────────────
// Dieselbe Mechanik wie bei den vier Karten darunter: wer oben links steht,
// sagt, wo er aufhört. `invalidateHudField()` kommt hier zusätzlich dazu — die
// HUD-Kontur klemmt Drifter und Riss-Ränder gegen diese Kante, und ihr
// Zwischenspeicher keyt nur auf Fenstermaß und Header-Bogen.
const root = ref<HTMLElement>()
let resizeObserver: ResizeObserver | null = null

function publishBottom() {
  const rect = root.value?.getBoundingClientRect()
  const style = document.documentElement.style
  style.setProperty('--wayfinder-bottom', `${rect?.bottom ?? 0}px`)
  // Die rechte Kante gehört dazu, weil die Kontur sie braucht und sie nirgends
  // sonst als Zahl steht: sie folgt aus `left` plus `clamp()`, und ein `calc()`
  // löst `getComputedStyle` nicht auf.
  style.setProperty('--wayfinder-right', `${rect?.right ?? 0}px`)
  invalidateHudField()
}

watch(
  visible,
  async (shown) => {
    await nextTick()
    resizeObserver?.disconnect()
    resizeObserver = null
    if (!shown || !root.value) {
      publishBottom()
      return
    }
    resizeObserver = new ResizeObserver(publishBottom)
    resizeObserver.observe(root.value)
    publishBottom()
  },
  { immediate: true },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  const style = document.documentElement.style
  style.setProperty('--wayfinder-bottom', '0px')
  style.setProperty('--wayfinder-right', '0px')
  invalidateHudField()
})
</script>

<template>
  <!-- `after-enter`: die Einblendung skaliert, und ein `transform` weckt keinen
       ResizeObserver — ohne diesen Nachschlag bliebe die zuletzt gemessene,
       noch verkleinerte Unterkante stehen und die Spalte darunter säße zu hoch. -->
  <Transition name="wf" @after-enter="publishBottom">
    <div
      v-if="visible && face"
      ref="root"
      class="wf-root"
      :class="{ 'wf-root--done': flashing }"
      :style="{ '--accent': face.color }"
      :title="tooltipFor(face.def, flashing ? 'Claimed' : face.rewardLabel)"
      role="status"
    >
      <!-- Die Kartenfläche IST der Balken. Der Schlüssel wechselt beim
           Missionswechsel und baut das Element neu, damit die Füllung nicht von
           voll auf leer zurückläuft; beim Abschlussblitz bleibt er stehen und
           sie läuft sichtbar voll. -->
      <span
        :key="face.id"
        class="wf-fill"
        :style="{ transform: `scaleX(${face.ratio})` }"
        aria-hidden="true"
      ></span>

      <!-- Name und Lohn teilen sich EINE Zeile; der Lohn trägt keine eigene
           Fläche, nur die Kapitelfarbe. -->
      <div class="wf-crown">
        <span class="wf-name">{{ face.name }}</span>
        <div class="wf-boon">
          <span v-for="part in face.rewardParts" :key="part.unit" class="wf-boon__part">
            <img
              v-if="part.image"
              :src="part.image"
              class="wf-boon__art"
              alt=""
              aria-hidden="true"
            />
            <span v-else class="wf-boon__mono" aria-hidden="true">{{ part.mono }}</span>
            <span class="wf-boon__amount">{{ part.amount }}</span>
            <span class="wf-boon__unit">{{ part.unit }}</span>
          </span>
        </div>
      </div>

      <span class="wf-task">{{ face.task }}</span>
      <span class="wf-count">
        {{ formatNumber(face.progress) }}/{{ formatNumber(face.target) }}
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* Ganz oben links, auf derselben Ankerlinie und in derselben Breite wie die
   vier Karten, die sich darunter einreihen. */
/* Breite und Rand kommen aus `--hud-col-w` / `--hud-col-edge` (App.vue) — EINE
   Formel für alle fünf Karten der Spalte und die Log-Spur gegenüber. Zwei
   Karten in einer Spalte, deren rechte Kanten auseinanderliegen, lesen sich
   als Fehler; deshalb rechnet hier keine mehr selbst. */
.wf-root {
  --boon-w: 74px;
  position: fixed;
  top: 0.5rem;
  left: var(--hud-col-edge);
  z-index: 899;
  width: var(--hud-col-w);
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px 16px;
  background: var(--rpg-bg-header);
  border: 2px solid var(--rpg-wood);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px var(--rpg-wood-inner),
    0 6px 18px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

/* Die Goldlinie der Bottom-Bar — sie markiert das eine dauerhafte Glied der
   Spalte. Statisch, nie animiert. */
.wf-root::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #c89040, #5c3310);
  pointer-events: none;
}

/* Der Fortschritt IST die Fläche: eigene Ebene, damit nur ihr `transform`
   animiert wird und der Text darüber unberührt bleibt. */
.wf-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: var(--accent);
  opacity: 0.22;
  transition: transform 0.4s ease-out;
  pointer-events: none;
}

/* Über der Füllung — `position` allein reicht, keine eigene Ebene nötig. */
.wf-crown,
.wf-task,
.wf-count {
  position: relative;
  min-width: 0;
}

.wf-task,
.wf-count {
  overflow: hidden;
}

/* Name links, Lohn rechts, gemeinsame Grundlinie. Die Höhe ist fest reserviert:
   ein Lohn aus zwei Teilen ist höher als einer aus einem, und die Karte hängt
   mit ihrer Unterkante an der halben linken Spalte. */
.wf-crown {
  display: flex;
  align-items: baseline;
  gap: 10px;
  height: 70px;
}

/* DREI Zeilen, und die Höhe steht fest: neben dem Lohn bleiben dem Namen auf
   Full HD nur rund 95 px, und die 41 Namen gehen bis 23 Zeichen. Wechselte die
   Höhe mit der Namenslänge, wanderte bei jedem Missionswechsel die halbe linke
   Spalte mit. */
.wf-name {
  flex: 1 1 auto;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 3.45em;
  font-size: clamp(16px, 1.05vw, 20px);
  font-weight: 800;
  line-height: 1.15;
  color: #f2ead2;
}

/* Die Anweisung — was der Spieler tun soll. Zwei Zeilen fest. */
.wf-task {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  height: 2.6em;
  font-size: 14px;
  line-height: 1.3;
  color: #9a9184;
}

.wf-count {
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: #b89b5a;
  font-variant-numeric: tabular-nums;
}

/* ── Der Lohn ───────────────────────────────────────────────────────────────
   Feste Breite, damit die Namensspalte nicht mit der Länge der Zahl wechselt.
   Zwei Teile stehen untereinander — nebeneinander sprengen sie die Karte. */
.wf-boon {
  flex: 0 0 var(--boon-w);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 0;
}

/* Auf Full HD steht die Einheit UNTER der Zahl: gemessen kostet
   „5m PRODUCTION" einzeilig 124 px, und die nähme dem Namen die halbe Spalte. */
.wf-boon__part {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: end;
  align-items: baseline;
  column-gap: 4px;
  row-gap: 1px;
  max-width: 100%;
  min-width: 0;
}

.wf-boon__art {
  grid-row: 1;
  align-self: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  object-fit: contain;
}

/* Vier Materialien haben kein Artwork — gleiche Kantenlänge wie ein Bild,
   damit die Felder in Flucht bleiben (Muster der Header-Materialzeile). */
.wf-boon__mono {
  grid-row: 1;
  align-self: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: #241b12;
  border: 1px solid rgba(200, 144, 64, 0.28);
  color: var(--accent);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
}

/* Die eine große Zahl. Sie kürzt nie — die Einheit weicht. */
.wf-boon__amount {
  grid-row: 1;
  flex-shrink: 0;
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.wf-boon__unit {
  grid-column: 1 / -1;
  justify-self: end;
  min-width: 0;
  overflow: hidden;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.09em;
  line-height: 1.1;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--accent);
  opacity: 0.7;
}

/* Abschlussblitz — EIN Umschlag, keine laufende Animation. Kürzer als die
   geerbten 400 ms, sonst ist die halbe Standzeit mit Volllaufen verbraucht. */
.wf-root--done .wf-fill {
  background: #6ec040;
  opacity: 0.38;
  transition-duration: 0.25s;
}

.wf-root--done .wf-boon__amount,
.wf-root--done .wf-boon__unit,
.wf-root--done .wf-boon__mono {
  color: #6ec040;
}

/* ── Ein-/Ausblenden ── */
.wf-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.wf-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}
.wf-enter-from {
  opacity: 0;
  transform: translateX(-12px) scale(0.95);
}
.wf-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.97);
}

/* ── Auflösungsstufen ──────────────────────────────────────────────────────
   Nur noch Typografie und `--boon-w`: die Breite trägt `--hud-col-w`. */
@media (min-width: 2400px) {
  .wf-root {
    --boon-w: 190px;
    top: 0.7rem;
    gap: 6px;
    padding: 16px 19px;
  }
  /* Ab hier bleiben dem Namen rund 305 px, und gemessen passt bei 27 px jeder
     der 41 einzeilig (der längste misst 300). Eine reservierte zweite Zeile
     stünde in 37 von 41 Fällen leer. */
  .wf-name {
    -webkit-line-clamp: 1;
    height: 1.15em;
    font-size: clamp(21px, 1.05vw, 27px);
  }
  .wf-task {
    -webkit-line-clamp: 1;
    height: 1.3em;
    font-size: 18px;
  }
  .wf-count {
    font-size: 19px;
  }
  .wf-crown {
    height: 58px;
  }
  .wf-boon {
    gap: 3px;
  }
  /* Ab hier trägt die Zeile den Lohn am Stück — die Spalte ist breit genug. */
  .wf-boon__part {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }
  .wf-boon__art,
  .wf-boon__mono {
    width: 20px;
    height: 20px;
  }
  .wf-boon__mono {
    font-size: 10px;
  }
  .wf-boon__amount {
    font-size: 26px;
  }
  .wf-boon__unit {
    font-size: 11px;
    letter-spacing: 0.12em;
  }
}

@media (min-width: 3400px) {
  .wf-root {
    --boon-w: 250px;
    gap: 7px;
    padding: 19px 23px;
  }
  .wf-crown {
    height: 72px;
  }
  .wf-name {
    font-size: clamp(26px, 0.9vw, 34px);
  }
  .wf-task {
    font-size: 23px;
  }
  .wf-count {
    font-size: 24px;
  }
  .wf-boon__art,
  .wf-boon__mono {
    width: 24px;
    height: 24px;
  }
  .wf-boon__mono {
    font-size: 12px;
  }
  .wf-boon__amount {
    font-size: 32px;
  }
  .wf-boon__unit {
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wf-fill {
    transition: none;
  }
}
</style>
