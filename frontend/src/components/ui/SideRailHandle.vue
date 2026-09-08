<script setup lang="ts">
/**
 * Die Kante, die stehen bleibt, wenn eine Detailleiste weggefahren ist —
 * EINMAL für alle vier Reiter (Skill Tree, Planets, Voyages, Universe).
 *
 * Sie traegt das Wort ALLEIN: ein Kopfband ueber der Liste zeigte dasselbe
 * Wort ein zweites Mal und nahm ihr dafuer 38 px Hoehe. Eine Seitenleiste ist
 * in diesem Spiel EIN Ort, nicht einer je Reiter.
 *
 * **Diese Datei importiert bewusst NICHTS aus `config/constants`.** Jede Zahl
 * und jedes Wort kommt als Prop aus der Konstante des jeweiligen Reiters:
 * dieselbe Herleitung, nicht dasselbe Budget — das eine Wort hat acht Zeichen,
 * das andere zwoelf. Ein Import koppelte zwei Reiter ueber eine Zahl, die sie
 * nur zufaellig teilen.
 *
 * Gesteuert und dumm: sie bekommt, was es zu zeigen gibt, und meldet den Klick
 * zurueck. Die Rechnungen hinter `count` und `dot` bleiben beim Reiter — sie
 * ziehen dort aus derselben Quelle wie die Liste selbst.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Das Wort. Der Name dessen, was HINTER dem Griff liegt. */
    label: string
    /** Breite in px — die Zone rechnet mit derselben Zahl. Nie unter 44. */
    widthPx: number
    open: boolean
    /** Fertig formuliert vom Reiter: jeder haengt anderes an. */
    title: string
    /** Die ruhige Zahl im Wortfluss: was es ueberhaupt gibt. */
    total?: number | null
    /** Die gerahmte Pille: was gerade etwas WILL. Universe bekommt sie nie. */
    count?: number | null
    countTitle?: string
    /** Der Punkt. Die Farbe gehoert dem Reiter — grün heisst in der Forge
     *  „kaufbar", teal heisst ueberall „einsammelbar". Kein Default. */
    dot?: boolean
    dotColor?: string
    dotTitle?: string
    /** Abstand Pille ↔ Wortende. */
    badgeGap?: number
  }>(),
  {
    total: null,
    count: null,
    countTitle: '',
    dot: false,
    dotColor: '',
    dotTitle: '',
    badgeGap: 10,
  },
)

const emit = defineEmits<{ toggle: [] }>()

const hasSignals = computed(() => (props.count ?? 0) > 0 || props.dot)

const style = computed(() => {
  const s: Record<string, string> = {
    width: `${props.widthPx}px`,
    '--sr-badge-gap': `${props.badgeGap}px`,
  }
  if (props.dotColor) s['--sr-dot'] = props.dotColor
  return s
})
</script>

<template>
  <button
    class="sr-handle"
    :class="{ 'sr-handle--open': open }"
    :style="style"
    :aria-expanded="open"
    :aria-label="title"
    v-tip="title"
    type="button"
    @click="emit('toggle')"
  >
    <span class="sr-handle-stack">
      <span v-if="hasSignals" class="sr-handle-signals">
        <span v-if="(count ?? 0) > 0" class="sr-handle-count" v-tip="countTitle">
          {{ count }}
          <span v-if="dot" class="sr-handle-dot" v-tip="dotTitle" aria-hidden="true" />
        </span>
        <span
          v-else
          class="sr-handle-dot sr-handle-dot--solo"
          v-tip="dotTitle"
          aria-hidden="true"
        />
      </span>

      <!-- Die Zahl steht IM gekippten Element, nicht daneben: `.sr-handle-stack`
           ist eine waagerechte Zeile, ein zweites Kind darin staende NEBEN dem
           Wort statt dahinter. So folgt sie ihm im senkrechten Fluss. -->
      <span class="sr-handle-word">
        {{ label }}
        <span v-if="total !== null" class="sr-handle-total">{{ total }}</span>
      </span>
    </span>
  </button>
</template>
