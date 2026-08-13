<template>
  <div class="shop-frame">
    <!-- Star Forge — left: growing sun tree · right: forge panel -->
    <ForgeTreePanel class="shop-tree-col" />
    <StarForgePanel class="shop-forge-col" />

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
import { Icon } from '@iconify/vue'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useActionToast } from '@/composables/ui/useActionToast'
import { FORGE_YIELD_PLINTH_HEIGHT_PX } from '@/config/constants'
import ForgeTreePanel from './ForgeTreePanel.vue'
import StarForgePanel from './StarForgePanel.vue'

const forgeStore = useStarForgeStore()
const { showToast } = useActionToast()

function maxOutForge(): void {
  forgeStore.adminMaxAll()
  showToast('Forge maxed out for this star phase', 'forge')
}
</script>

<style scoped>
.shop-frame {
  position: relative;
  display: flex;
  height: 100%;
  background: #111008;
  overflow: hidden;
}

/* Tree gets every spare pixel; the forge column stays a readable, bounded
   width across common desktop resolutions (1280 → 4K). */
/* The seam between the two columns is the forge panel's own border-left — the
   same 2px #5c3310 the role detail page uses. A second line here would double
   it. */
.shop-tree-col {
  flex: 1;
  min-width: 0;
}

.shop-forge-col {
  flex: 0 0 clamp(340px, 32vw, 470px);
  min-width: 0;
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

/* Narrow layouts: stack tree above the forge panel */
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

  .shop-forge-col {
    flex: 1 0 auto;
    overflow-y: visible;
  }
}
</style>
