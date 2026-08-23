<template>
  <!--
    Die vier Fähigkeiten im Pause-Overlay — EINE Reihe aus vier Zellen.

    Eine Kachel ist die Form eines Knopfes, und im Overlay ist nichts
    bedienbar. Die Zelle dreht das um: das Bild bleibt als Wiedererkennung,
    der Text bekommt Platz. Quer statt 2 × 2, weil das Band Breite im
    Überfluss hat und jede Zeile Höhe in den Fit-Scale des Overlays geht.
  -->
  <div
    class="kit-grid"
    :style="{
      '--kit-cell-h': `${PAUSE_KIT_CELL_H}px`,
      '--kit-art': `${PAUSE_KIT_CELL_ART_PX}px`,
      '--kit-gap': `${PAUSE_KIT_GAP_PX}px`,
    }"
  >
    <div
      v-for="cell in cells"
      :key="cell.id"
      class="kit-cell"
      :class="{ 'kit-cell--locked': cell.locked, 'kit-cell--cooling': cell.cooling }"
      :style="{ '--kit-color': cell.color }"
    >
      <!-- Das Kürzel steht AUF der Kunst, nicht neben dem Namen: als eigene
           Textspalte nähme es dem Namen 28 der 130 px, und „Caretaker's
           Shrine" liefe über. Muster `.ab-key` an der Kachel draußen. -->
      <span class="kit-cell__art">
        <img
          :src="cell.image"
          :alt="cell.name"
          class="kit-cell__img"
          draggable="false"
          @dragstart.prevent
        />
        <span class="kit-cell__key" aria-hidden="true">{{ cell.key }}</span>
      </span>

      <span class="kit-cell__text">
        <span class="kit-cell__name">{{ cell.name }}</span>
        <span class="kit-cell__foot">
          <!-- Rang als Pips, nicht als „Rank 3": dieselbe Form wie `.ab-rank`
               an der Kachel draußen, und sie kostet keine Textbreite. -->
          <span class="kit-cell__pips" :aria-label="cell.rankLabel">
            <span
              v-for="n in ABILITY_MAX_RANK"
              :key="n"
              class="kit-pip"
              :class="{ 'kit-pip--on': n <= cell.rank }"
            />
          </span>
          <span class="kit-cell__state">{{ cell.stateLabel }}</span>
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { BARD_ABILITIES } from '@/config/progression/bardAbilities'
import {
  ABILITY_MAX_RANK,
  PAUSE_KIT_CELL_H,
  PAUSE_KIT_CELL_ART_PX,
  PAUSE_KIT_GAP_PX,
} from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'
import { formatCooldownSeconds } from '@/utils/ui/format'

/**
 * `tick` zählt im Takt von STAR_TIMER_TICK_MS hoch — das Overlay hält den
 * Ticker ohnehin für seine Callout-Karten. Ein eigener rAF-Lauf für vier
 * Zahlen, die höchstens fünfmal je Sekunde eine Stelle wechseln, wäre in einem
 * pausierten Spiel Verschwendung; dasselbe Snapshot-Muster wie bei den
 * Star-Timer-Bars im Header.
 */
const props = defineProps<{ tick: number }>()

const store = useBardAbilityStore()

interface KitCell {
  id: string
  key: string
  name: string
  image: string
  color: string
  locked: boolean
  cooling: boolean
  rank: number
  rankLabel: string
  stateLabel: string
}

const cells = computed<KitCell[]>(() => {
  // Der Tick ist der einzige Grund, warum diese Computed erneut läuft — die
  // Abklingzeit steht als Zeitstempel im Store und ändert sich nicht reaktiv.
  void props.tick
  const now = gameNow()

  return BARD_ABILITIES.map((def) => {
    const rank = store.rankOf(def.id)
    const locked = rank === 0
    const leftMs = locked ? 0 : Math.max(0, (store.cooldownReadyAt[def.id] ?? 0) - now)
    return {
      id: def.id,
      key: def.key,
      name: def.name,
      image: def.image,
      color: def.color,
      locked,
      cooling: leftMs > 0,
      rank,
      rankLabel: locked ? 'Locked' : `Rank ${rank}`,
      // Gesperrt zählt die Stufe, die fehlt — sie ist das, was der Spieler
      // dagegen tun kann. Bereit steht als Wort da, nicht als „0s".
      stateLabel: locked
        ? `Lv ${def.unlockLevel}`
        : leftMs > 0
          ? `${formatCooldownSeconds(leftMs)}s`
          : 'Ready',
    }
  })
})
</script>

<style scoped>
/* Vier Zellen nebeneinander, EINE Reihe. Die Zellenhöhe ist die Bandhöhe. */
.kit-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: var(--kit-cell-h);
  gap: var(--kit-gap);
  width: 100%;
}

/* Dieselbe Fassung wie die Effekt-Chips gegenüber: flacher dunkler Grund, eine
   Kante in der Leitfarbe, kein zweiter Rahmen. Das Band trägt zwei Sorten
   Inhalt, aber nur eine Form. */
.kit-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0 12px 0 10px;
  background: #16140e;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--kit-color, #c89040);
  border-radius: 4px;
}

.kit-cell--locked {
  opacity: 0.5;
  filter: grayscale(55%);
}

.kit-cell__art {
  position: relative;
  flex: 0 0 auto;
  width: var(--kit-art);
  height: var(--kit-art);
  overflow: hidden;
  border-radius: 4px;
  background: #0d0b06;
}

/* Das Motiv liegt als 512er Kunst vor und wird hier auf 44 px gebracht — das
   ist ein spürbares Herunterskalieren, und genau dafür ist `high-quality` da
   (nie `pixelated`, siehe „Bildschärfe"). */
.kit-cell__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: high-quality;
}

.kit-cell__key {
  position: absolute;
  top: 1px;
  left: 4px;
  font-size: 0.68rem;
  font-weight: 900;
  line-height: 1;
  color: #ded0a6;
  opacity: 0.85;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.kit-cell__text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
}

/* „Caretaker's Shrine" ist der längste Name und misst hier gemessen 129 px in
   130; die Auslassung fängt nur den Fall ab, dass jemand einen längeren
   nachlegt. */
.kit-cell__name {
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kit-cell__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  height: 18px;
}

.kit-cell__pips {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
}

.kit-pip {
  width: 10px;
  height: 3px;
  border-radius: 1px;
  background: rgba(232, 224, 196, 0.16);
}

.kit-pip--on {
  background: var(--kit-color, #e8c040);
  opacity: 0.85;
}

/* Der Zustand ist das, was sich ändert, und steht deshalb in der Leitfarbe der
   Fähigkeit — die Pips daneben bleiben ruhig. */
.kit-cell__state {
  flex: 0 0 auto;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1;
  color: var(--kit-color, #e8c040);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.kit-cell--cooling .kit-cell__state {
  color: rgba(216, 200, 160, 0.72);
}

.kit-cell--locked .kit-cell__state {
  color: rgba(216, 200, 160, 0.5);
}
</style>
