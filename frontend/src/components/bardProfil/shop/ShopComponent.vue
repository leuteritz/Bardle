<template>
  <div class="shop-frame">
    <div class="shop-body">
      <BuildingsComponent />
      <UpgradesComponent />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import BuildingsComponent from './BuildingsComponent.vue'
import UpgradesComponent from './UpgradesComponent.vue'

export default defineComponent({
  name: 'ShopComponent',
  components: { BuildingsComponent, UpgradesComponent },
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

.shop-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
