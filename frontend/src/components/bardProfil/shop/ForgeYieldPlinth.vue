<template>
  <div class="yp">
    <div class="yp-cell">
      <img :src="FORGE_CHIME_IMAGE" class="yp-img" alt="" />
      <div class="yp-text">
        <span class="yp-label">Chimes</span>
        <span class="yp-value">{{ $formatNumber(gameStore.chimes) }}</span>
      </div>
    </div>

    <span class="yp-sep" aria-hidden="true" />

    <div class="yp-cell">
      <Icon :icon="FORGE_YIELD_ICONS.perSecond" width="22" height="22" class="yp-ico" />
      <div class="yp-text">
        <span class="yp-label">Per second</span>
        <span class="yp-value" :class="{ 'yp-value--buffed': buffed }">
          {{ $formatNumber(perSecond) }}
        </span>
      </div>
    </div>

    <span class="yp-sep" aria-hidden="true" />

    <div class="yp-cell">
      <Icon :icon="FORGE_YIELD_ICONS.perClick" width="22" height="22" class="yp-ico" />
      <div class="yp-text">
        <span class="yp-label">Per click</span>
        <span class="yp-value" :class="{ 'yp-value--buffed': buffed }">
          {{ $formatNumber(perClick) }}
        </span>
      </div>
    </div>

    <span class="yp-sep" aria-hidden="true" />

    <div class="yp-cell yp-cell--tree" :title="treeTitle">
      <Icon :icon="FORGE_YIELD_ICONS.forgeShare" width="22" height="22" class="yp-ico" />
      <div class="yp-text">
        <span class="yp-label">From the tree</span>
        <span class="yp-value yp-value--tree">×{{ treeCpsMult.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Was der Stern gerade einbringt — die Zahl, um die es beim Kaufen geht.
 *
 * Der Baum links zeigte bisher nur HP. Wer eine Stufe kauft, will aber sehen,
 * was sie bewirkt hat, und zwar ohne den Kopf zu heben: die Kopfzeile des
 * Spiels steht außerhalb des Profil-Fensters.
 *
 * Alle vier Felder lesen GECACHTE Werte. Niemals `shopStore.calculateTotalCPS()`
 * hier aufrufen — das läuft durch ein Dutzend Stores und liefe dann bei jeder
 * Chime-Änderung mit.
 *
 * Sekunde und Klick tragen denselben `mvpBuffMultiplier` wie die Kopfzeile
 * (`AppHeaderComponent`). Ohne ihn zeigten zwei Anzeigen desselben Spiels zwei
 * verschiedene Zahlen, sobald ein MVP-Buff läuft.
 *
 * Keine Uhr, kein rAF, kein Intervall: der Shop-Tab wird einmal gemountet und
 * danach nur noch per `v-show` umgeschaltet — ein Timer hier liefe für immer.
 * Er braucht auch keinen: `chimesPerSecond` und `chimesPerClick` setzt
 * `shopStore.refreshRates()`, das jeder Kauf im Baum ohnehin auslöst.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import {
  FORGE_CHIME_IMAGE,
  FORGE_YIELD_ICONS,
  FORGE_YIELD_PLINTH_HEIGHT_PX,
  FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX,
} from '@/config/constants'

const gameStore = useGameStore()
const solarStore = useSolarUpgradeStore()
const forgeStore = useStarForgeStore()

const buffed = computed(() => gameStore.mvpBuffMultiplier > 1)
const perSecond = computed(() => gameStore.chimesPerSecond * gameStore.mvpBuffMultiplier)
const perClick = computed(() => gameStore.chimesPerClick * gameStore.mvpBuffMultiplier)

/**
 * Was der Baum selbst am Ertrag je Sekunde ausmacht — exakt, kein Schätzwert:
 * beide Faktoren stehen genau so multiplikativ in `calculateTotalCPS()`.
 * Der Flugtempo-Strahl gehört dazu, auch wenn sein Name nach Reisezeit klingt.
 */
const treeCpsMult = computed(() => solarStore.flightSpeedMultiplier * forgeStore.cpsMult)
const treeCpcMult = computed(() => forgeStore.cpcMult)

const treeTitle = computed(
  () =>
    `Solar rays and forge branches multiply chimes per second by ×${treeCpsMult.value.toFixed(2)} ` +
    `and per click by ×${treeCpcMult.value.toFixed(2)}.`,
)
</script>

<style scoped>
/* Der Sockel liegt im Fluss unter der Bühne — der Sternenhintergrund des Panels
   ist absolut positioniert und deckt sonst jedes statische Geschwister zu. */
.yp {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  height: v-bind('`${FORGE_YIELD_PLINTH_HEIGHT_PX}px`');
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 18px;
  background: #16110a;
  border-top: 2px solid #5c3310;
}

.yp-cell {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.yp-sep {
  flex-shrink: 0;
  width: 1px;
  height: 30px;
  background: #32210c;
}

.yp-ico {
  flex-shrink: 0;
  color: #c89040;
}

.yp-img {
  flex-shrink: 0;
  height: 26px;
  width: auto;
  object-fit: contain;
}

.yp-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.yp-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  color: rgba(200, 144, 64, 0.55);
  white-space: nowrap;
}

.yp-value {
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Läuft ein MVP-Buff, steht hier dieselbe erhöhte Zahl wie in der Kopfzeile —
   die Färbung sagt, warum sie erhöht ist. */
.yp-value--buffed {
  color: #7ad0a0;
}

.yp-value--tree {
  color: #86d0ff;
}

.yp-cell--tree {
  cursor: help;
}

@media (max-height: 1100px) {
  .yp {
    height: v-bind('`${FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX}px`');
    padding: 0 12px;
  }

  .yp-value {
    font-size: 16.5px;
  }

  .yp-img {
    height: 22px;
  }

  .yp-sep {
    height: 24px;
  }
}
</style>
