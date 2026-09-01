<script setup lang="ts">
/**
 * Griffleiste der Universumsleiste — die Kante, die stehen bleibt, wenn die
 * Leiste weggefahren ist.
 *
 * Sie traegt das Wort ALLEIN: die Liste hat kein Kopfband mehr, weil es dasselbe
 * Wort ein zweites Mal zeigte und ihr dafuer 38 px Hoehe nahm. Dieselbe
 * Aufteilung wie im Skill Tree, wo `StarForgePanel` titellos ist, und im
 * Voyages-Atlas (`expedition/ExpeditionRailHandle.vue`), dessen Idiom hier
 * uebernommen ist — eine Seitenleiste ist in diesem Spiel EIN Ort.
 *
 * KEINE Signalpille und kein Bereitschaftspunkt: die Voyages-Pille sagt „hier
 * will etwas etwas", und im Firmament will nichts etwas — die Leiste ist reine
 * Navigation. Die Zahl hinter dem Wort ist deshalb Auskunft, kein Signal: wie
 * viele Universen begangen sind. Das „/ 10" der gefallenen Kopfzeile steht in
 * der Hover-Karte.
 */
import { computed } from 'vue'
import {
  FIRMAMENT_RAIL_CLOSE_TITLE,
  FIRMAMENT_RAIL_HANDLE_LABEL,
  FIRMAMENT_RAIL_HANDLE_PX,
  FIRMAMENT_RAIL_OPEN_TITLE,
} from '@/config/constants'

const props = defineProps<{ walked: number; total: number; open: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const toggleTitle = computed(() =>
  props.open ? FIRMAMENT_RAIL_CLOSE_TITLE : FIRMAMENT_RAIL_OPEN_TITLE,
)
const tipText = computed(
  () => `${toggleTitle.value} — ${props.walked} of ${props.total} walked`,
)

const handleWidth = `${FIRMAMENT_RAIL_HANDLE_PX}px`
</script>

<template>
  <button
    class="frh"
    :class="{ 'frh--open': open }"
    :aria-expanded="open"
    :aria-label="tipText"
    v-tip="tipText"
    @click="emit('toggle')"
  >
    <!-- Die Zahl steht IM gekippten Element, nicht daneben: eine waagerechte
         Zeile setzte sie NEBEN das Wort statt dahinter. So folgt sie ihm im
         senkrechten Fluss. -->
    <span class="frh-word">
      {{ FIRMAMENT_RAIL_HANDLE_LABEL }}
      <span class="frh-total">{{ walked }}</span>
    </span>
  </button>
</template>

<style scoped>
/* Liegt ÜBER der geparkten Leiste (z-index 1), damit deren Kante nicht durch den
   Griff scheint, während sie hinter ihm steht. */
.frh {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  width: v-bind(handleWidth);
  display: flex;
  align-items: center;
  justify-content: center;
  /* Links 2 px weniger — die Naht zählt zur Breite und rückte das Wort sonst um
     ihre Hälfte aus der Leistenmitte. */
  padding: 12px 6px 12px 4px;
  border: none;
  border-left: 2px solid #5c3310;
  background: #14100c;
  color: #c89040;
  cursor: pointer;
}
.frh:hover {
  background: #1a140d;
}

/* Goldfaden auf der Naht. Statisch — nur die DECKUNG wechselt, und sie trägt
   allein den Zustand (matt zu, hell offen oder unter dem Zeiger). */
.frh::after {
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
.frh:hover::after,
.frh--open::after {
  opacity: 1;
}

/* Gekippt und mittig: es sagt, was hinter ihm liegt. */
.frh-word {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  color: #c89040;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.28em;
  white-space: nowrap;
}
.frh:hover .frh-word,
.frh--open .frh-word {
  color: #e8c040;
}

/* Gedämpft: das Wort trägt, die Zahl ergänzt. Ziffern brauchen die Sperrung des
   Wortes nicht, gesperrt säßen sie als lose Punkte darüber. */
.frh-total {
  color: rgba(200, 144, 64, 0.5);
  letter-spacing: 0.1em;
}
.frh:hover .frh-total,
.frh--open .frh-total {
  color: rgba(232, 192, 64, 0.62);
}

@media (prefers-reduced-motion: reduce) {
  .frh::after {
    transition: none;
  }
}
</style>
