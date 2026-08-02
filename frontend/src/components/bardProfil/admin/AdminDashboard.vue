<script setup lang="ts">
import AdminQuickActionsPanel from './AdminQuickActionsPanel.vue'
import AdminGalaxyJumpPanel from './AdminGalaxyJumpPanel.vue'
import AdminStarPhasePanel from './AdminStarPhasePanel.vue'
import AdminDrifterPanel from './AdminDrifterPanel.vue'
</script>

<template>
  <!-- Dashboard-Raster: füllt die volle Modalhöhe, kein Y-Scroll.
       Links Quick Actions + Drifter Spawn, rechts Galaxy Jump + Star Phase. -->
  <div class="admin-dash">
    <div class="admin-dash-left">
      <AdminQuickActionsPanel dashboard />
      <AdminDrifterPanel dashboard />
    </div>
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

.admin-dash-left,
.admin-dash-right {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
  min-height: 0;
}

/* Das Drifter-Panel braucht genau seine Inhaltshöhe (zwei feste Kachelreihen);
   die Resthöhe geht an Quick Actions, dessen Kacheln sich strecken dürfen —
   sie waren vorher ohnehin die überdehnten Flächen der Spalte. */
.admin-dash-left > :first-child {
  flex: 1;
  min-height: 0;
}
.admin-dash-left > :last-child {
  flex: 0 0 auto;
}

.admin-dash-right > :first-child {
  flex: 0 0 auto;
}
.admin-dash-right > :last-child {
  flex: 1;
  min-height: 0;
}
</style>
