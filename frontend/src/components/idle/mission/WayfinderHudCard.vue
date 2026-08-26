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

      <!-- Die Front der Füllung: `translateX`, nicht `scaleX` — eine skalierte
           Kante wüchse bei niedrigem Stand auf ein Vielfaches ihrer Stärke. -->
      <span
        :key="`${face.id}-edge`"
        class="wf-edge"
        :style="{ transform: `translateX(${face.ratio * 100}%)` }"
        aria-hidden="true"
      ></span>

      <span class="wf-name">{{ face.name }}</span>
      <span class="wf-task">{{ face.task }}</span>

      <!-- Zähler links, Lohn rechts: der Lohn trägt keine eigene Fläche, nur die
           Kapitelfarbe. -->
      <div class="wf-foot">
        <span class="wf-count">
          {{ formatNumber(face.progress) }}/{{ formatNumber(face.target) }}
        </span>
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
/* Jede Zeilenhöhe steht FEST: vier Karten hängen an `--wayfinder-bottom`, und
   eine mit dem Missionsnamen wechselnde Höhe liesse die halbe Spalte wandern. */
.wf-root {
  position: fixed;
  top: 0.5rem;
  left: var(--hud-col-edge);
  z-index: 899;
  width: var(--hud-col-w);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 14px;
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

/* Die Kante der Füllung — die Karte ist flach, der Stand muss ohne eigene Zeile
   ablesbar bleiben. Border statisch, animiert wird nur `transform`. */
.wf-edge {
  position: absolute;
  inset: 0;
  border-left: 2px solid var(--accent);
  opacity: 0.55;
  transition: transform 0.4s ease-out;
  pointer-events: none;
}

/* Über der Füllung — `position` allein reicht, keine eigene Ebene nötig. */
.wf-name,
.wf-task,
.wf-foot {
  position: relative;
  min-width: 0;
}

.wf-name,
.wf-task,
.wf-count {
  overflow: hidden;
}

/* Eine Zeile über die volle Breite: die 41 Namen gehen bis 23 Zeichen, und die
   Spalte trägt auf Full HD 380 px. */
.wf-name {
  display: block;
  height: 1.2em;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: clamp(16px, 1.05vw, 20px);
  font-weight: 800;
  line-height: 1.2;
  color: #f2ead2;
}

/* Die Anweisung — was der Spieler tun soll. */
.wf-task {
  height: 1.35em;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 1.35;
  color: #9a9184;
}

/* Zähler und Lohn teilen den Fuss; beide sind an ihrer Seite verankert, also
   wandert nichts, wenn eine Zahl eine Stelle gewinnt. */
.wf-foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  height: 22px;
}

.wf-count {
  flex: 0 0 auto;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: #b89b5a;
  font-variant-numeric: tabular-nums;
}

/* ── Der Lohn ─────────────────────────────────────────────────────────────── */
.wf-boon {
  flex: 0 1 auto;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.wf-boon__part {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
}

.wf-boon__art {
  align-self: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  object-fit: contain;
}

/* Vier Materialien haben kein Artwork — gleiche Kantenlänge wie ein Bild,
   damit die Felder in Flucht bleiben (Muster der Header-Materialzeile). */
.wf-boon__mono {
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
  flex-shrink: 0;
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.wf-boon__unit {
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

.wf-root--done .wf-edge {
  border-left-color: #6ec040;
  opacity: 0.8;
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
   Unter 1800 px fällt `--hud-col-w` unter rund 350 px (bei 1536 px auf den
   Boden 232) — dort trägt eine Zeile die längste Aufgabe nicht mehr, und die
   Einheit des Lohns weicht ins `title`. */
@media (max-width: 1800px) {
  .wf-task {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    height: 2.7em;
    white-space: normal;
    font-size: 13px;
  }
  .wf-boon__unit {
    display: none;
  }
}

/* Ab hier nur noch Typografie und Padding: die Breite trägt `--hud-col-w`. */
@media (min-width: 2400px) {
  .wf-root {
    top: 0.7rem;
    gap: 5px;
    padding: 14px 18px;
  }
  .wf-name {
    font-size: clamp(21px, 1.05vw, 27px);
  }
  .wf-task {
    font-size: 18px;
  }
  .wf-foot {
    height: 30px;
    gap: 14px;
  }
  .wf-count {
    font-size: 19px;
  }
  .wf-boon {
    gap: 14px;
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
    gap: 6px;
    padding: 17px 22px;
  }
  .wf-name {
    font-size: clamp(26px, 0.9vw, 34px);
  }
  .wf-task {
    font-size: 23px;
  }
  .wf-foot {
    height: 38px;
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
  .wf-fill,
  .wf-edge {
    transition: none;
  }
}
</style>
