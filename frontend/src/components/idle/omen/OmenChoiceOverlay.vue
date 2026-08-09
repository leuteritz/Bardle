<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useUiStore } from '@/stores/core/uiStore'
import {
  omenRewardLine,
  OMEN_CHOICE_TITLE,
  OMEN_CHOICE_SUBTITLE,
} from '@/config/progression/omens'
import { splitDuration } from '@/utils/ui/format'
import { OMEN_CHOICE_ARM_DELAY_MS, OMEN_SWIFT_DURATION_MULT } from '@/config/constants'
import type { OmenDef } from '@/types'

/**
 * Der eine Moment, in dem das Omen-System etwas vom Spieler will: drei Karten,
 * eine Wahl.
 *
 * Bewusst ein Overlay und keine Zeile im HUD. Die Entscheidung ist der Kern des
 * Systems — sie soll das Spiel für ein paar Sekunden anhalten, sonst wird sie
 * im Vorbeigehen weggeklickt und die nächsten zehn Minuten sind
 * fremdbestimmt. Danach ist alles Weitere die kleine HUD-Karte.
 *
 * Es gibt KEINEN Abbruch: der Kosmos fragt nicht, ob Bard ein Vorzeichen will.
 * Ein „später"-Knopf wäre auch mechanisch leer — es kostet nichts, ein Ziel
 * anzunehmen, an dem man ohnehin nebenbei vorbeikommt.
 */
const omenStore = useOmenStore()
const uiStore = useUiStore()
const { offerDefs } = storeToRefs(omenStore)

/**
 * Unter einem offenen Profil-Tab wartet das Angebot, statt sich darüberzulegen:
 * wer gerade seinen Kader sortiert, will nicht aus dem Tab geworfen werden. Das
 * Angebot bleibt im Store stehen und erscheint, sobald das Spielbild frei ist.
 */
const visible = computed(() => omenStore.hasOffer && uiStore.bardActiveTab === null)

/**
 * Kurz gesperrt, damit der laufende Klick-Takt des Spielers nicht die erste
 * Karte trifft, die ihm unter den Zeiger rutscht — das Overlay erscheint
 * unangekündigt mitten im Klicken.
 */
const armed = ref(false)
let armTimer: ReturnType<typeof setTimeout> | null = null

watch(
  visible,
  (shown) => {
    if (armTimer) clearTimeout(armTimer)
    armed.value = false
    if (!shown) return
    armTimer = setTimeout(() => {
      armed.value = true
      armTimer = null
    }, OMEN_CHOICE_ARM_DELAY_MS)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (armTimer) clearTimeout(armTimer)
})

function choose(def: OmenDef) {
  if (!armed.value) return
  omenStore.accept(def.id)
}

/** Zielzeile mit eingesetzter Menge — für Chime-Ziele die Zahl, die JETZT
 *  gälte; der Store schreibt sie bei der Annahme endgültig fest. */
function objectiveOf(def: OmenDef): string {
  return def.objective.replace('{n}', omenStore.resolveTarget(def).toLocaleString())
}

function rewardOf(def: OmenDef): string {
  return omenRewardLine(def)
}

/** Frist und Buff-Dauer als lesbare Minuten. */
function deadlineOf(def: OmenDef): string {
  const { minutes, seconds } = splitDuration(def.deadlineSec)
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
}

function durationOf(def: OmenDef): string {
  return `${Math.round(def.reward.durationSec / 60)} min`
}

function swiftDurationOf(def: OmenDef): string {
  return `${Math.round((def.reward.durationSec * OMEN_SWIFT_DURATION_MULT) / 60)} min`
}
</script>

<template>
  <Transition name="oco">
    <div v-if="visible" class="oco-root" role="dialog" aria-labelledby="oco-title">
      <div class="oco-scrim"></div>

      <div class="oco-panel">
        <span class="oco-goldline" aria-hidden="true"></span>

        <div class="oco-head">
          <h2 id="oco-title" class="oco-title">{{ OMEN_CHOICE_TITLE }}</h2>
          <p class="oco-sub">{{ OMEN_CHOICE_SUBTITLE }}</p>
        </div>

        <div class="oco-cards">
          <button
            v-for="def in offerDefs"
            :key="def.id"
            type="button"
            class="oco-card"
            :class="{ 'oco-card--armed': armed }"
            :style="{ '--accent': def.color }"
            :disabled="!armed"
            @click="choose(def)"
          >
            <span class="oco-card__stage">
              <Icon :icon="def.icon" class="oco-card__icon" width="46" height="46" />
            </span>

            <span class="oco-card__name">{{ def.name }}</span>
            <span class="oco-card__blurb">{{ def.blurb }}</span>

            <span class="oco-card__rule" aria-hidden="true"></span>

            <span class="oco-card__objective">{{ objectiveOf(def) }}</span>

            <span class="oco-card__reward">{{ rewardOf(def) }}</span>
            <span class="oco-card__terms">
              {{ durationOf(def) }}
              <span class="oco-card__terms-dot">·</span>
              <!-- Der Eilbonus ist die einzige Zahl, die von der Spielweise
                   abhängt — er steht deshalb ausgeschrieben da und nicht als
                   Sternchen unter dem Panel. Die Reihenfolge „Lohn, dann
                   Bedingung" statt „Bedingung, dann Lohn": was es bringt, ist
                   die Frage, die der Spieler beim Vergleichen stellt. -->
              <span class="oco-card__swift">
                swift: {{ swiftDurationOf(def) }} within {{ deadlineOf(def) }}
              </span>
            </span>

            <span class="oco-card__cta">{{ armed ? 'Follow this omen' : '…' }}</span>
          </button>
        </div>

        <p class="oco-foot">Nothing is lost if the deadline passes — only the swift bonus.</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.oco-root {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Flach abgedunkelt, kein backdrop-filter. */
.oco-scrim {
  position: absolute;
  inset: 0;
  background: rgba(6, 5, 3, 0.82);
}

.oco-panel {
  position: relative;
  width: min(1080px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 0 28px 26px;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 18px 60px rgba(0, 0, 0, 0.9);
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.oco-goldline {
  position: sticky;
  top: 0;
  align-self: stretch;
  height: 3px;
  margin: 0 -28px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

.oco-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding-top: 20px;
  text-align: center;
}

.oco-title {
  font-size: 27px;
  font-weight: 800;
  line-height: 1.1;
  color: #e8c040;
}

.oco-sub {
  font-size: 13px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #8a7a52;
}

/* Drei gleich breite Spalten — die Karten sind Alternativen, keine Rangfolge,
   also darf keine durch Größe schwerer wiegen. */
.oco-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-self: stretch;
}

.oco-card {
  /* Explizit, obwohl `stretch` der Grid-Default ist: <button> als Grid-Item ist
     der Sonderfall, in dem sich Browser uneinig sind. Heute umbricht keine
     Zielzeile, die Karten wären also ohnehin gleich hoch — das gilt aber nur,
     solange kein Vorzeichen mit längerem Text dazukommt. */
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px 16px;
  text-align: center;
  background: #1a1008;
  border: 2px solid #5c3310;
  border-top: 3px solid var(--accent);
  border-radius: 4px;
  cursor: pointer;
  /* Nur transform/opacity in der Transition — Rahmen und Schatten bleiben
     statisch, sonst rastert der Browser die Karte samt Schatten neu. */
  transition:
    transform 0.16s ease-out,
    opacity 0.16s ease-out;
}

.oco-card:disabled {
  cursor: default;
  opacity: 0.5;
}

.oco-card--armed:hover,
.oco-card--armed:focus-visible {
  transform: translateY(-4px);
  outline: none;
}

.oco-card__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 78px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 55%, #14120c);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--accent) 24%, #14120c),
    #100e08 74%
  );
}

.oco-card__icon {
  color: var(--accent);
}

.oco-card__name {
  font-size: 20px;
  font-weight: 800;
  color: #f2ead2;
}

.oco-card__blurb {
  font-size: 12px;
  line-height: 1.35;
  color: #8a7a52;
}

.oco-card__rule {
  width: 62px;
  height: 1px;
  margin: 3px 0;
  background: #3e2a14;
}

/* Die Aufgabe ist die eigentliche Frage der Karte — größte Zeile nach dem
   Namen, in der Leitfarbe. */
.oco-card__objective {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--accent);
}

.oco-card__reward {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #7ec46a;
}

.oco-card__terms {
  font-size: 11px;
  line-height: 1.4;
  color: #6a6258;
}

.oco-card__terms-dot {
  margin: 0 3px;
}

.oco-card__swift {
  color: #b89b5a;
}

/* `auto` statt eines festen Abstands: der Knopf gehört an den Kartenboden, nicht
   an den Text darüber. Bei gleich langen Texten sieht man keinen Unterschied —
   sobald einer umbricht, schwämme der Knopf mit ihm nach unten. */
.oco-card__cta {
  margin-top: auto;
  align-self: stretch;
  padding: 8px 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #0f1a08;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
}

.oco-card:disabled .oco-card__cta {
  filter: grayscale(55%);
}

.oco-foot {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: #6a6258;
}

/* ── Ein-/Ausblenden ── */
.oco-enter-active {
  transition: opacity 0.25s ease;
}
.oco-leave-active {
  transition: opacity 0.22s ease;
}
.oco-enter-from,
.oco-leave-to {
  opacity: 0;
}
.oco-enter-active .oco-panel {
  transition: transform 0.3s cubic-bezier(0.2, 1.2, 0.4, 1);
}
.oco-enter-from .oco-panel {
  transform: scale(0.95);
}

/* ── Kompakt: Full HD hat nach Abzug des Browser-Chrome ~950px Höhe, und das
   Panel muß samt drei Karten hineinpassen, ohne zu scrollen. ── */
@media (max-height: 1100px) {
  .oco-panel {
    gap: 14px;
    padding: 0 22px 20px;
  }
  .oco-head {
    padding-top: 15px;
  }
  .oco-title {
    font-size: 23px;
  }
  .oco-card {
    padding: 15px 13px 13px;
    gap: 6px;
  }
  .oco-card__stage {
    width: 62px;
    height: 62px;
  }
  .oco-card__icon {
    width: 36px;
    height: 36px;
  }
  .oco-card__name {
    font-size: 18px;
  }
  .oco-card__objective {
    font-size: 14px;
  }
}

/* ── Auflösungsstufen ── */
@media (min-width: 2400px) {
  .oco-panel {
    width: min(1340px, 88vw);
    gap: 22px;
    padding: 0 34px 32px;
  }
  .oco-title {
    font-size: 33px;
  }
  .oco-sub {
    font-size: 15px;
  }
  .oco-cards {
    gap: 20px;
  }
  .oco-card__stage {
    width: 94px;
    height: 94px;
  }
  .oco-card__icon {
    width: 56px;
    height: 56px;
  }
  .oco-card__name {
    font-size: 24px;
  }
  .oco-card__blurb {
    font-size: 14px;
  }
  .oco-card__objective {
    font-size: 18px;
  }
  .oco-card__reward {
    font-size: 15px;
  }
  .oco-card__terms,
  .oco-foot {
    font-size: 13px;
  }
  .oco-card__cta {
    font-size: 14px;
  }
}

@media (min-width: 3400px) {
  .oco-panel {
    width: min(1720px, 84vw);
    gap: 28px;
    padding: 0 44px 40px;
  }
  .oco-title {
    font-size: 42px;
  }
  .oco-sub {
    font-size: 18px;
  }
  .oco-cards {
    gap: 26px;
  }
  .oco-card__stage {
    width: 118px;
    height: 118px;
  }
  .oco-card__icon {
    width: 70px;
    height: 70px;
  }
  .oco-card__name {
    font-size: 30px;
  }
  .oco-card__blurb {
    font-size: 17px;
  }
  .oco-card__objective {
    font-size: 23px;
  }
  .oco-card__reward {
    font-size: 19px;
  }
  .oco-card__terms,
  .oco-foot {
    font-size: 16px;
  }
  .oco-card__cta {
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .oco-card {
    transition: none;
  }
  .oco-card--armed:hover,
  .oco-card--armed:focus-visible {
    transform: none;
  }
}
</style>
