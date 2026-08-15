<template>
  <div class="shop-frame">
    <!-- Star Forge — links der wachsende Sonnenbaum, in der Mitte das Detail
         samt Liste, rechts aussen die Abteilungs-Rail. -->
    <ForgeTreePanel class="shop-tree-col" />
    <StarForgePanel class="shop-forge-col" :active-section="activeSection" />
    <ForgeSectionRail
      class="shop-rail-col"
      :active="activeSection"
      @select="activeSection = $event"
    />

    <!-- TEMP: admin shortcut — buys every ray, branch, leaf, relic and
         constellation the CURRENT star phase allows, free of charge. Floated
         into the tree's free corner (the zoom control owns the other one) so it
         never takes part in the layout.
         Remove together with `starForgeStore.adminMaxAll()`. -->
    <button class="shop-admin-max" title="Admin: buy every forge upgrade at once" @click="maxOutForge">
      <Icon icon="game-icons:anvil-impact" width="16" height="16" />
      DEV · Max Forge
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useActionToast } from '@/composables/ui/useActionToast'
import type { ForgeSectionId } from '@/types'
import {
  FORGE_YIELD_PLINTH_HEIGHT_PX,
  FORGE_RAIL_WIDTH_PX,
  FORGE_RAIL_WIDTH_WIDE_PX,
} from '@/config/constants'
import ForgeTreePanel from './ForgeTreePanel.vue'
import StarForgePanel from './StarForgePanel.vue'
import ForgeSectionRail from './ForgeSectionRail.vue'

const forgeStore = useStarForgeStore()
const { showToast } = useActionToast()

/**
 * Welche Abteilung offen ist, liegt HIER und nicht mehr in `StarForgePanel`:
 * die Rail steht seit dem Umbau als eigene Spalte daneben, die beiden sind also
 * Geschwister. Der Baum steht vorn — Relikte, Konstellationen und der Handel
 * zeigen, was aus ihm FOLGT.
 */
const activeSection = ref<ForgeSectionId>('upgrades')

function maxOutForge(): void {
  forgeStore.adminMaxAll()
  showToast('Forge maxed out for this star phase', 'forge')
}

const railWidth = `${FORGE_RAIL_WIDTH_PX}px`
const railWidthWide = `${FORGE_RAIL_WIDTH_WIDE_PX}px`
</script>

<style scoped>
.shop-frame {
  position: relative;
  display: flex;
  height: 100%;
  background: #111008;
  overflow: hidden;
}

/* Der Baum bekommt jeden freien Pixel; die Forge-Spalte bleibt in einer
   lesbaren, begrenzten Breite über alle Desktop-Auflösungen (1280 → 4K).
   Die Naht zwischen zwei Spalten ist jeweils der `border-left` der rechten —
   eine zweite Linie hier verdoppelte sie. */
.shop-tree-col {
  flex: 1;
  min-width: 0;
}

/* Gewachsen von `clamp(340px, 32vw, 470px)`. Der alte Deckel stammt aus der
   Zeit, in der die Spalte fünf Filterchips UND vier Reiterbeschriftungen in
   einer Zeile tragen musste; beides steht jetzt woanders. Was hier steht, ist
   ein Detailkopf mit 23px-Titel und zwei Kaufknöpfen nebeneinander — der
   braucht die zusätzlichen 90px, und auf 4K sind sie umsonst zu haben. */
.shop-forge-col {
  flex: 0 0 clamp(400px, 26vw, 560px);
  min-width: 0;
}

/* `min-width: 0` ist hier nicht kosmetisch: ohne es gilt `min-width: auto`, und
   das längste Label der Rail („Constellations") drückte die Spalte gemessen auf
   96px statt der deklarierten 78 — die Breite stünde dann in Wahrheit im
   Textumbruch statt in der Konstante. */
.shop-rail-col {
  flex: 0 0 v-bind(railWidth);
  min-width: 0;
}

/* Ab 2K ist Breite reichlich da: „Constellations" steht dann zweizeilig statt
   dreizeilig, und die Zelle wirkt nicht mehr wie ein Notbehelf. */
@media (min-width: 2560px) {
  .shop-rail-col {
    flex-basis: v-bind(railWidthWide);
  }
}

/* ── TEMP admin button ─────────────────────────────────────────── */
/* Sitzt ÜBER dem Ertrags-Sockel, nicht darauf: der Sockel belegt seit dem
   Umbau die untere Kante der Baumspalte. Fällt mit dem Knopf zusammen weg. */
.shop-admin-max {
  position: absolute;
  bottom: v-bind('`${FORGE_YIELD_PLINTH_HEIGHT_PX + 14}px`');
  left: 14px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: 1px solid #4a3010;
  border-radius: 4px;
  background: #16110a;
  color: #c89040;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.shop-admin-max:hover {
  border-color: #c89040;
  color: #e8c040;
}

/* Narrow layouts: stack tree above the forge panel, rail becomes a strip. */
@media (max-width: 900px) {
  .shop-frame {
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #5c3310 #111;
  }

  .shop-tree-col {
    flex: 0 0 420px;
    border-bottom: 2px solid #5c3310;
  }

  .shop-rail-col {
    flex: 0 0 auto;
    order: -1;
  }

  .shop-forge-col {
    flex: 1 0 auto;
    overflow-y: visible;
  }
}
</style>
