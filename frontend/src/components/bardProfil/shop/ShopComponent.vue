<template>
  <div class="shop-frame">
    <!-- BuildingsComponent + UpgradesComponent nebeneinander oben -->
    <div class="shop-top">
      <BuildingsComponent />
      <UpgradesComponent />
    </div>

    <!-- MissionsComponent unten, 42% Höhe -->
    <div class="shop-bottom">
      <MissionsComponent />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import BuildingsComponent from './BuildingsComponent.vue'
import UpgradesComponent from './UpgradesComponent.vue'
import MissionsComponent from './MissionsComponent.vue'

export default defineComponent({
  name: 'ShopComponent',
  components: { BuildingsComponent, UpgradesComponent, MissionsComponent },
})
</script>

<style scoped>
.shop-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 4px 20px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.shop-top {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.shop-bottom {
  flex-shrink: 0;
  height: 42%;
  border-top: 2px solid #5c3310;
  overflow: hidden;
}
</style>
