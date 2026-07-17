<script setup lang="ts">
import AdminQuickActionsPanel from './AdminQuickActionsPanel.vue'
import AdminGalaxyJumpPanel from './AdminGalaxyJumpPanel.vue'
import AdminStarPhasePanel from './AdminStarPhasePanel.vue'
</script>

<template>
  <!-- Dashboard-Raster: füllt die volle Modalhöhe, kein Y-Scroll.
       Links Quick Actions, rechts Galaxy Jump + Star Phase. -->
  <div class="admin-dash">
    <AdminQuickActionsPanel dashboard />
    <div class="admin-dash-right">
      <AdminGalaxyJumpPanel dashboard />
      <AdminStarPhasePanel dashboard />
    </div>
  </div>
</template>

<style scoped>
.admin-dash {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(10px, 1.3vw, 18px);
  padding: clamp(10px, 1.8vh, 20px);
  overflow: hidden;
}

.admin-dash-right {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
  min-height: 0;
}
.admin-dash-right > :first-child {
  flex: 0 0 auto;
}
.admin-dash-right > :last-child {
  flex: 1;
  min-height: 0;
}
</style>
