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

.shop-tree-col {
  flex: 1.15;
  min-width: 0;
  border-right: 2px solid #2a1a08;
}

.shop-forge-col {
  flex: 1;
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
    border-right: none;
    border-bottom: 2px solid #2a1a08;
  }

  .shop-forge-col {
    flex: 1 0 auto;
    overflow-y: visible;
  }
}
</style>
