<template>
  <aside class="cs-detail">
    <template v-if="detail">
      <div class="cs-detail-hero">
        <img
          :src="detail.image"
          :alt="detail.name"
          class="cs-detail-img rpg-img"
          :class="{ grayscale: detail.locked }"
        />
        <div class="cs-hero-foot">
          <div class="cs-detail-name">{{ detail.name }}</div>
          <div class="cs-hero-meta">
            <span class="cs-hero-tier" :style="{ '--cc': detail.tierColor }">
              ★ {{ detail.starLevel }} · {{ detail.tierName }}
            </span>
            <span class="cs-hero-role" :style="{ '--cc': detail.roleColor }">
              {{ detail.roleLabel }}
            </span>
            <span v-for="trait in detail.traits" :key="trait.id" class="cs-hero-trait">
              <Icon :icon="trait.icon" class="cs-hero-trait-icon" :style="{ color: trait.color }" />
              {{ trait.name }}
            </span>
            <span v-if="detail.origin" class="cs-hero-trait">
              <Icon
                :icon="detail.origin.icon"
                class="cs-hero-trait-icon"
                :style="{ color: detail.origin.color }"
              />
              {{ detail.origin.origin }}
            </span>
          </div>
        </div>
      </div>

      <div class="cs-detail-body">
        <div
          v-if="detail.locked && detail.homePlanet"
          class="cs-unlock-line"
          :style="{ '--unlock-c': detail.tierColor }"
        >
          <PlanetGlyph
            :type="detail.homePlanet.type"
            :size="SHOP_HOME_PLANET_GLYPH_SIZE"
            class="cs-home-glyph"
          />
          <span>
            Rescue <b>{{ detail.homePlanet.name }}</b> to recruit {{ detail.name }}.
          </span>
        </div>

        <div class="cs-cost" :class="{ 'cs-cost--preview': detail.locked }">
          <div class="cs-cost-heading">
            <span>{{ detail.locked ? 'Prepare to recruit' : 'Recruitment cost' }}</span>
            <span class="cs-cost-state">{{ costState }}</span>
          </div>
          <div class="cs-detail-rows">
            <div
              v-for="mat in detail.materials"
              :key="mat.id"
              class="cs-mat-row"
              :class="mat.ok ? 'cs-mat-row--ok' : 'cs-mat-row--missing'"
              :style="{ '--cost-c': mat.color }"
            >
              <img :src="mat.image" :alt="mat.name" class="rpg-img cs-mat-img" />
              <span class="cs-mat-name">{{ mat.name }}</span>
              <span class="cs-mat-amount"
                >{{ formatNumber(mat.have) }} / {{ formatNumber(mat.need) }}</span
              >
              <i class="cs-mat-fill" :style="fillStyle(mat.have, mat.need)"></i>
            </div>
            <div
              class="cs-mat-row"
              :class="detail.chimes.ok ? 'cs-mat-row--ok' : 'cs-mat-row--missing'"
            >
              <img
                src="/img/BardAbilities/BardChime-128.png"
                alt="Chimes"
                class="rpg-img cs-mat-img"
              />
              <span class="cs-mat-name">Chimes</span>
              <span class="cs-mat-amount">
                {{ formatNumber(detail.chimes.have) }} / {{ formatNumber(detail.chimes.need) }}
              </span>
              <i class="cs-mat-fill" :style="fillStyle(detail.chimes.have, detail.chimes.need)"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="cs-detail-footer">
        <button
          class="cs-buy-btn"
          :class="{ 'cs-buy-btn--ready': detail.canBuy }"
          :disabled="!detail.canBuy"
          @click="$emit('buy', detail.name)"
        >
          <span v-if="detail.locked">
            <Icon icon="lucide:lock" width="15" height="15" class="cs-buy-lock" />
            {{ lockedButtonLabel }}
          </span>
          <span v-else-if="detail.canBuy">Recruit {{ detail.name }}</span>
          <span v-else>Missing Resources</span>
        </button>
      </div>
    </template>
    <div v-else class="cs-detail-empty">
      <CosmicStageBackground />
      <div class="cs-detail-empty-content">
        <Icon
          icon="lucide:mouse-pointer-click"
          width="38"
          height="38"
          class="cs-detail-empty-icon"
        />
        <span class="cs-detail-empty-title">Select a Card</span>
        <span class="cs-detail-empty-text">Select a champion or item to inspect it here.</span>
      </div>
    </div>
  </aside>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { Icon } from '@iconify/vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import PlanetGlyph from '@/components/ui/PlanetGlyph.vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { SHOP_HOME_PLANET_GLYPH_SIZE } from '@/config/constants'
import type { ShopChampionDetail } from '@/types'

export default defineComponent({
  name: 'ChampionDetailPanel',
  components: { Icon, CosmicStageBackground, PlanetGlyph },
  props: { detail: { type: Object as () => ShopChampionDetail | null, default: null } },
  emits: ['buy'],
  setup(props) {
    const lockedButtonLabel = computed(() => {
      const planet = props.detail?.homePlanet
      return `Locked · Rescue ${planet ? `a ${planet.name}` : 'its planet'}`
    })
    const costState = computed(() => {
      const detail = props.detail
      if (!detail) return ''
      return [...detail.materials, detail.chimes].every((material) => material.ok)
        ? 'Ready'
        : 'Incomplete'
    })
    const fillStyle = (have: number, need: number) => ({
      transform: `scaleX(${need > 0 ? Math.min(1, have / need) : 1})`,
    })

    return {
      costState,
      fillStyle,
      formatNumber,
      lockedButtonLabel,
      SHOP_HOME_PLANET_GLYPH_SIZE,
    }
  },
})
</script>

<style scoped>
.cs-detail {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
}
.cs-detail-hero {
  position: relative;
  flex: 0 0 clamp(420px, 48%, 540px);
  min-height: 0;
  overflow: hidden;
  border-bottom: 2px solid #5c3310;
  background: #111008;
}
.cs-detail-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
.cs-hero-foot {
  position: absolute;
  inset: auto 0 0;
  z-index: 1;
  padding: 52px 20px 18px;
  background: linear-gradient(
    to top,
    rgba(13, 11, 6, 0.98),
    rgba(13, 11, 6, 0.78) 58%,
    transparent
  );
}
.cs-detail-name {
  margin-bottom: 10px;
  overflow: hidden;
  color: #fff9e8;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-shadow: 0 2px 10px #000;
  white-space: nowrap;
}
.cs-hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px 12px;
  color: #d6c8a8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.055em;
  line-height: 1.25;
  text-transform: uppercase;
}
.cs-hero-tier,
.cs-hero-role,
.cs-hero-trait {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.cs-hero-tier,
.cs-hero-role {
  color: var(--cc, #e8c040);
}
.cs-hero-trait::before {
  width: 3px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #8d7652;
  content: '';
}
.cs-hero-trait-icon {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}
.cs-detail-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px 20px;
  scrollbar-color: #5c3310 #111008;
  scrollbar-width: thin;
}
.cs-unlock-line {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 18px;
  padding: 0 0 12px;
  border-bottom: 1px solid #3e200a;
  color: #c6b796;
  font-size: 13px;
  line-height: 1.4;
}
.cs-unlock-line b {
  color: var(--unlock-c, #e8c040);
}
.cs-home-glyph {
  flex: 0 0 auto;
}
.cs-cost--preview {
  opacity: 0.68;
}
.cs-cost-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #e8c040;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.cs-cost-state {
  color: #a99a7c;
  font-size: 12px;
}
.cs-detail-rows {
  display: flex;
  flex-direction: column;
}
.cs-mat-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 68px;
  overflow: hidden;
  border-bottom: 1px solid #332918;
}
.cs-mat-img {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  object-fit: contain;
}
.cs-mat-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #d8d0bc;
  font-size: 17px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-mat-amount {
  flex: 0 0 auto;
  font-size: 19px;
  font-variant-numeric: tabular-nums;
  font-weight: 900;
}
.cs-mat-row--ok .cs-mat-amount {
  color: var(--cost-c, #e8c040);
}
.cs-mat-row--missing .cs-mat-amount {
  color: #cc6050;
}
.cs-mat-fill {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  transform-origin: left center;
  background: var(--cost-c, #e8c040);
  opacity: 0.82;
  transition: transform 0.25s ease-out;
}
.cs-mat-row--missing .cs-mat-fill {
  background: #cc6050;
}
.cs-detail-footer {
  flex: 0 0 auto;
  padding: 16px 20px 18px;
  border-top: 2px solid #3e200a;
  background: #1a1008;
}
.cs-buy-btn {
  display: flex;
  width: 100%;
  min-height: 78px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #3a3226;
  border-radius: 4px;
  background: #1c1c18;
  color: #7a6f58;
  cursor: not-allowed;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.cs-buy-btn--ready {
  border-color: #6ec040;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #eaffe0;
  cursor: pointer;
}
.cs-buy-btn--ready:hover {
  filter: brightness(1.12);
}
.cs-buy-btn span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.cs-buy-lock {
  color: #cc6050;
}
.cs-detail-empty {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px;
  background: rgba(17, 16, 8, var(--cs-veil, 1));
}
.cs-detail-empty-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.cs-detail-empty-icon {
  color: #c89040;
}
.cs-detail-empty-title {
  color: #e8c040;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.cs-detail-empty-text {
  max-width: 230px;
  color: #a08c68;
  font-size: 12.5px;
  line-height: 1.5;
}
@media (max-height: 1100px) {
  .cs-detail-hero {
    flex-basis: 420px;
  }
  .cs-hero-foot {
    padding: 42px 16px 14px;
  }
  .cs-detail-name {
    font-size: 29px;
  }
  .cs-detail-body {
    padding: 14px 16px 16px;
  }
  .cs-detail-footer {
    padding: 13px 16px 15px;
  }
  .cs-buy-btn {
    min-height: 70px;
  }
}
</style>
