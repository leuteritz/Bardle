<template>
  <div class="shop-frame">
    <!-- Star Forge — left: growing sun tree · right: forge panel -->
    <ForgeTreePanel class="shop-tree-col" />
    <StarForgePanel class="shop-forge-col" />
  </div>
</template>

<script setup lang="ts">
import ForgeTreePanel from './ForgeTreePanel.vue'
import StarForgePanel from './StarForgePanel.vue'
</script>

<style scoped>
.shop-frame {
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
  flex: 0 0 clamp(340px, 32vw, 440px);
  min-width: 0;
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
