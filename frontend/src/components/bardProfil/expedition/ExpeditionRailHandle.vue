<script setup lang="ts">
/**
 * Griffleiste der Zielliste — die Kante, die stehen bleibt, wenn die Leiste
 * weggefahren ist.
 *
 * Sie traegt das Wort ALLEIN: die Liste hat kein Kopfband mehr, weil es dasselbe
 * Wort ein zweites Mal zeigte und ihr dafuer 37,5 px Hoehe nahm. Dieselbe
 * Aufteilung wie im Skill Tree, wo `StarForgePanel` titellos ist. Die Zahl aus
 * dem gefallenen Band steht jetzt hinter dem Wort.
 *
 * Idiom der Forge-Detailspalte (`skillTree/ForgeDetailsHandle.vue`), eigene
 * Konstanten: eine Seitenleiste ist in diesem Spiel EIN Ort, nicht einer je
 * Reiter.
 *
 * Gesteuert und dumm wie die Leiste selbst — sie bekommt die Zeilen, die es
 * gibt, und meldet den Klick zurück. Beide Signale kommen aus DERSELBEN
 * Rechnung, aus der die Zeile ihren Zähler zieht (`contracts + ready`) und ihre
 * Zustandskante (`voyageGalaxyState`); eine eigene Zählung hier liefe still
 * gegen die Liste.
 *
 * Sie tragen nur, solange die Leiste ZU ist: offen sagt jede Zeile es selbst,
 * und eine Zahl daneben wäre dieselbe Auskunft ein zweites Mal.
 *
 * **Gezählt werden GALAXIEN, nicht Missionen.** Wie viele Missionen im Feld
 * fertig sind, steht schon auf der Kopfleiste, die über die volle Breite läuft
 * und nie einklappt (`ExpeditionCommandBar`, `useNotifyBadgeCount('expedition')`)
 * — sie hier zu wiederholen hiesse ausserdem, `config/ui/notifyBadges.ts` einen
 * fünften Sitz einzutragen. Hinter diesem Griff liegt eine WAHL, und die dazu
 * passende Zahl ist, wie viele Ziele gerade etwas wollen: genau die Miniaturen,
 * deren Wartemarke leuchtet, nur eben die, die man nicht sieht.
 */
import { computed } from 'vue'
import type { VoyageRailRow } from '@/types'
import { voyageGalaxyState } from '@/utils/game/voyageFleet'
import {
  VOYAGE_RAIL_CLOSE_TITLE,
  VOYAGE_RAIL_HANDLE_BADGE_GAP,
  VOYAGE_RAIL_HANDLE_LABEL,
  VOYAGE_RAIL_HANDLE_PX,
  VOYAGE_RAIL_OPEN_TITLE,
  VOYAGE_RAIL_READY_TITLE,
  VOYAGE_RAIL_WAITING_TITLE,
} from '@/config/constants'

const props = defineProps<{ rows: VoyageRailRow[]; open: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const live = computed(() => (props.open ? [] : props.rows.filter((row) => row.contracts + row.ready > 0)))
const waiting = computed(() => live.value.length)
const hasReady = computed(() => live.value.some((row) => voyageGalaxyState(row) === 'ready'))

const toggleTitle = computed(() =>
  props.open ? VOYAGE_RAIL_CLOSE_TITLE : VOYAGE_RAIL_OPEN_TITLE,
)
const waitingTitle = computed(() => `${waiting.value} ${VOYAGE_RAIL_WAITING_TITLE}`)

const handleWidth = `${VOYAGE_RAIL_HANDLE_PX}px`
const badgeGap = `${VOYAGE_RAIL_HANDLE_BADGE_GAP}px`
</script>

<template>
  <button
    class="erh"
    :class="{ 'erh--open': open }"
    :aria-expanded="open"
    :aria-label="toggleTitle"
    v-tip="toggleTitle"
    @click="emit('toggle')"
  >
    <span class="erh-stack">
      <span v-if="waiting > 0 || hasReady" class="erh-signals">
        <span v-if="waiting > 0" class="erh-count" v-tip="waitingTitle">
          {{ waiting }}
          <span
            v-if="hasReady"
            class="erh-ready"
            v-tip="VOYAGE_RAIL_READY_TITLE"
            aria-hidden="true"
          />
        </span>
        <span
          v-else
          class="erh-ready erh-ready--solo"
          v-tip="VOYAGE_RAIL_READY_TITLE"
          aria-hidden="true"
        />
      </span>

      <!-- Die Zahl steht IM gekippten Element, nicht daneben: `.erh-stack` ist
           eine waagerechte Zeile, ein zweites Kind darin staende NEBEN dem Wort
           statt dahinter. So folgt sie ihm im senkrechten Fluss. -->
      <span class="erh-word">
        {{ VOYAGE_RAIL_HANDLE_LABEL }}
        <span class="erh-total">{{ rows.length }}</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
/* Liegt ÜBER der geparkten Leiste (z-index 1), damit deren Kante nicht durch
   den Griff scheint, während sie hinter ihm steht. */
.erh {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  width: v-bind(handleWidth);
  display: flex;
  align-items: center;
  justify-content: center;
  /* Links 2 px weniger — die Naht zählt zur Breite und rückte die Gruppe sonst
     um ihre Hälfte aus der Leistenmitte. */
  padding: 12px 6px 12px 4px;
  border: none;
  border-left: 2px solid #5c3310;
  background: #14100c;
  color: #c89040;
  cursor: pointer;
}
.erh:hover {
  background: #1a140d;
}

/* Goldfaden auf der Naht. Statisch — nur die DECKUNG wechselt, und sie trägt
   allein den Zustand (matt zu, hell offen oder unter dem Zeiger). */
.erh::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: linear-gradient(to bottom, #5c3310, #c89040, #e8c060, #c89040, #5c3310);
  opacity: 0.4;
  transition: opacity 0.18s ease;
  pointer-events: none;
}
.erh:hover::after,
.erh--open::after {
  opacity: 1;
}

/* Nur das Wort steht im Fluss — die Gruppe ist damit genau so hoch wie es und
   sitzt mittig in der Leiste. */
.erh-stack {
  position: relative;
  display: flex;
}

/* Am Wortende, OHNE Fluss-Platz: sonst wanderte das Wort, sobald ein Signal
   kommt oder geht. */
.erh-signals {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: v-bind(badgeGap);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Aufrecht, nicht mitgekippt: eine Zahl liest man nicht seitwärts.
   Tabellenziffern gibt MedievalSharp nicht her, deshalb eine Mindestbreite —
   sonst springt die Pille beim Sprung von 9 auf 10. */
.erh-count {
  position: relative;
  min-width: 24px;
  padding: 2px 5px;
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1c1c18;
  color: #e8c040;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
}
.erh:hover .erh-count {
  border-color: #c89040;
  background: #241a0f;
}

/* Irgendwo ist eine Crew heim. Ein Punkt und keine zweite Zahl: wie viele es
   sind, entscheidet nichts — dass überhaupt eine wartet, schon.

   Teal und nicht das Grün des Forge-Griffs: „einsammelbar" trägt in diesem
   Reiter durchgehend #64dcb4 (Zustandskante, Wartemarke, Fleet-Rang). Grün
   gehört hier dem NEW-Fähnchen — derselbe Punkt darf nicht in zwei Reitern
   zwei Dinge heissen. */
.erh-ready {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #64dcb4;
  box-shadow: 0 0 0 2px #14100c;
}
.erh-ready--solo {
  position: static;
  box-shadow: 0 0 0 3px rgba(100, 220, 180, 0.18);
}

/* Gekippt und mittig: es sagt, was hinter ihm liegt. */
.erh-word {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  color: #c89040;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.28em;
  white-space: nowrap;
}
.erh:hover .erh-word,
.erh--open .erh-word {
  color: #e8c040;
}

/* Was es ueberhaupt gibt — die ruhige Zahl, die vor dem Fall des Kopfbands dort
   stand. Gedaempft wie damals: die gerahmte Pille darueber ist das SIGNAL,
   diese hier ist Auskunft. Ziffern brauchen die Sperrung des Wortes nicht,
   gesperrt saessen sie als lose Punkte darueber. */
.erh-total {
  color: rgba(200, 144, 64, 0.5);
  letter-spacing: 0.1em;
}
.erh:hover .erh-total,
.erh--open .erh-total {
  color: rgba(232, 192, 64, 0.62);
}

@media (prefers-reduced-motion: reduce) {
  .erh::after {
    transition: none;
  }
}
</style>
