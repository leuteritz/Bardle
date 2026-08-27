<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useHudCardColumn } from '@/composables/ui/useHudCardColumn'
import { AUGMENTS } from '@/config/economy/augments'
import { AUTO_PICK_ICON } from '@/config/constants'

/**
 * Meldung eines automatisch gewählten Augments — die Quittung der Kartenspalte.
 *
 * Mit aktivem Auto-Pick öffnet sich das Auswahl-Modal nicht mehr; damit fiele
 * auch der einzige Ort weg, an dem der Spieler die Automatik wieder loswird.
 * Diese Karte ist deshalb beides: Quittung („das wurde gewählt") und Not-Aus.
 *
 * Im Rang der Spalte steht sie als `receipt` GANZ unten, und das ist der Punkt:
 * sie meldet etwas, das bereits geschehen ist. Steht irgendetwas anderes, faltet
 * sie zur Zeile — und ihr Stop-Knopf zieht in deren Tooltip. `.tip-act` hebt
 * `pointer-events` ausdrücklich auf und ist genau dafür gebaut.
 *
 * Die Uhr kommt aus `useHudCardColumn`. Sie läuft auf der WANDUHR, nicht auf der
 * Spieluhr: eine Quittung, die im 20-fachen Zeitraffer nach 0,6 realen Sekunden
 * verschwindet, hat niemand gelesen.
 */
const gameStore = useGameStore()
const { autoPickCard } = useHudCardColumn()

const augment = computed(() =>
  autoPickCard.value ? (AUGMENTS.find((a) => a.id === autoPickCard.value!.id) ?? null) : null,
)

function stop() {
  gameStore.setAutoPickAugments(false)
}
</script>

<template>
  <div
    v-if="autoPickCard && augment"
    class="hc apt"
    :style="{ '--hc-color': autoPickCard.color }"
    role="status"
  >
    <div class="hc-head">
      <Icon :icon="AUTO_PICK_ICON" width="1.05em" height="1.05em" class="hc-glyph apt-glyph" />
      <span class="hc-label">Auto-picked</span>
      <!-- Große Ziffer, kleines Suffix: die Restzeit ist die zweite Aussage der
           Kopfzeile und soll aus dem Augenwinkel lesbar sein. -->
      <span
        class="hc-clock"
        :class="{ 'hc-clock--urgent': autoPickCard.urgent }"
        :title="`This message closes in ${autoPickCard.remainingSeconds}s`"
      >
        <span class="hc-clock__num">{{ autoPickCard.remainingSeconds }}</span>
        <span class="hc-clock__unit">s</span>
      </span>
    </div>

    <div class="hc-main">
      <span class="hc-stage">
        <Icon :icon="autoPickCard.icon" width="1.9em" height="1.9em" />
      </span>
      <span class="hc-body">
        <span class="hc-name">{{ augment.name }}</span>
        <span class="hc-effect apt-effect">{{ augment.effectLine }}</span>
      </span>
    </div>

    <button
      type="button"
      class="apt-stop"
      title="Turn auto-pick off and choose yourself again"
      @click="stop"
    >
      Stop auto-pick
    </button>

    <!-- Die Restzeit als Balken. `scaleX` aus der EINEN Uhr der Spalte, nicht
         als CSS-Animation: die lief bei jedem neuen Augment nur dann von vorn,
         wenn der Schlüssel wechselte. -->
    <span class="hc-bar">
      <span class="hc-bar__fill" :style="{ transform: `scaleX(${autoPickCard.ratio})` }"></span>
    </span>
  </div>
</template>

<style scoped>
/* Fläche, Rahmen, Skala und alle Bausteine kommen aus `.hc-*` (rpg-theme.css).
   Hier steht nur der Not-Aus. */
.apt-glyph {
  color: var(--hc-mute);
}

.apt-effect {
  font-size: 0.88em;
  font-weight: 400;
  color: #b8a878;
}

.apt-stop {
  width: 100%;
  padding: 0.34em 0.5em 0.4em;
  border: 1px solid #3e2a14;
  border-radius: 4px;
  background: #1c1c18;
  color: var(--hc-dim);
  font-size: 0.84em;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.apt-stop:hover {
  color: #cc6050;
  border-color: #cc6050;
}
</style>
