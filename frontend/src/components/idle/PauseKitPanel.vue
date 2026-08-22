<template>
  <!--
    Die vier Fähigkeiten im Pause-Overlay — als ZEILEN, nicht als Kacheln.

    Eine Kachel ist die Form eines Knopfes, und im Overlay ist nichts
    bedienbar. Was sie zeigte (Rang, Abklingzeit), stand in Miniaturschrift auf
    dem Bild, während Name und Kürzel nur im Tooltip auftauchten. Die Zeile
    dreht das um: das Bild bleibt als Wiedererkennung, der Text bekommt Platz.

    Zwei Spalten zu je zwei Zeilen — Q/W links, E/R rechts. In EINER Spalte
    wären die Zeilen entweder halb so hoch oder das Band doppelt so tief.
  -->
  <div class="kit-grid" :style="{ '--kit-row-h': `${PAUSE_KIT_ROW_H}px`, '--kit-gap': `${PAUSE_KIT_GAP_PX}px` }">
    <div
      v-for="row in rows"
      :key="row.id"
      class="kit-row"
      :class="{ 'kit-row--locked': row.locked, 'kit-row--cooling': row.cooling }"
      :style="{ '--kit-color': row.color }"
    >
      <span class="kit-row__art">
        <img
          :src="row.image"
          :alt="row.name"
          class="kit-row__img"
          draggable="false"
          @dragstart.prevent
        />
      </span>

      <span class="kit-row__text">
        <span class="kit-row__head">
          <KeyCap :cap="row.key" size="sm" />
          <span class="kit-row__name">{{ row.name }}</span>
        </span>
        <span class="kit-row__foot">
          <span class="kit-row__rank">{{ row.rankLabel }}</span>
          <span class="kit-row__state">{{ row.stateLabel }}</span>
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import KeyCap from '@/components/keybinds/KeyCap.vue'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { BARD_ABILITIES } from '@/config/progression/bardAbilities'
import { PAUSE_KIT_ROW_H, PAUSE_KIT_GAP_PX } from '@/config/constants'
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

interface KitRow {
  id: string
  key: string
  name: string
  image: string
  color: string
  locked: boolean
  cooling: boolean
  rankLabel: string
  stateLabel: string
}

const rows = computed<KitRow[]>(() => {
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
/* Zwei Spalten zu je zwei Zeilen. Die Zeilenhöhe kommt aus den Konstanten und
   ist dort aus der Bandhöhe abgeleitet — zwei Zeilen plus Lücke ergeben exakt
   die Höhe der Effekt-Spalte daneben, damit beide bündig abschließen. */
.kit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: var(--kit-row-h);
  gap: var(--kit-gap);
  width: 100%;
}

/* Dieselbe Fassung wie die Effekt-Chips gegenüber: flacher dunkler Grund, eine
   Kante in der Leitfarbe, kein zweiter Rahmen. Das Band trägt zwei Sorten
   Inhalt, aber nur eine Form. */
.kit-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0 12px 0 10px;
  background: #16140e;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--kit-color, #c89040);
  border-radius: 4px;
}

.kit-row--locked {
  opacity: 0.5;
  filter: grayscale(55%);
}

.kit-row__art {
  position: relative;
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  overflow: hidden;
  border-radius: 4px;
  background: #0d0b06;
}

/* Das Motiv liegt als 512er Kunst vor und wird hier auf 56 px gebracht — das
   ist ein spürbares Herunterskalieren, und genau dafür ist `high-quality` da
   (nie `pixelated`, siehe „Bildschärfe"). */
.kit-row__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: high-quality;
}

.kit-row__text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
}

.kit-row__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* „Caretaker's Shrine" ist der längste Name und passt in die Spalte; die
   Auslassung fängt nur den Fall ab, dass jemand einen längeren nachlegt. */
.kit-row__name {
  min-width: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kit-row__foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.kit-row__rank {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.5);
  white-space: nowrap;
}

/* Der Zustand ist das, was sich ändert, und steht deshalb in der Leitfarbe der
   Fähigkeit — die Rangzeile daneben bleibt ruhig. */
.kit-row__state {
  flex: 0 0 auto;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--kit-color, #e8c040);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.kit-row--cooling .kit-row__state {
  color: rgba(216, 200, 160, 0.72);
}

.kit-row--locked .kit-row__state {
  color: rgba(216, 200, 160, 0.5);
}
</style>
