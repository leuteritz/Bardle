<template>
  <aside
    class="cs-detail"
    :class="{ 'cs-detail--recruit-hover': recruitHover }"
    :style="{ '--recruit-c': detail?.roleColor ?? '#e8c040' }"
  >
    <template v-if="detail">
      <div class="cs-recruit-signal" aria-hidden="true" />
      <div class="cs-detail-hero" :style="{ '--role-c': detail.roleColor }">
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
        <div class="cs-identity" aria-label="Champion identity">
          <button
            type="button"
            class="cs-tier-band"
            :style="{ '--ac': detail.tierColor }"
            :aria-label="`Champion Tier ${detail.starLevel} of ${MAX_STAR_LEVEL}: ${detail.tierName}. Click to filter champions by this tier.`"
            v-tip="`Filter champions by ★${detail.starLevel} ${detail.tierName}`"
            @click="$emit('filter', 'tier', String(detail.starLevel))"
          >
            <span class="cs-tier-crest" aria-hidden="true">
              <Icon :icon="detail.tierIcon" width="25" height="25" />
            </span>
            <span class="cs-tier-copy">
              <span class="cs-affinity-head">
                <small>Champion Tier</small>
                <Icon icon="lucide:filter" width="13" height="13" class="cs-filter-cue" />
              </span>
              <strong>{{ detail.tierName }}</strong>
            </span>
            <span class="cs-tier-stars" aria-hidden="true">
              <i
                v-for="n in MAX_STAR_LEVEL"
                :key="n"
                :class="{ 'cs-tier-star--lit': n <= detail.starLevel }"
                >★</i
              >
            </span>
          </button>

          <div class="cs-affinity-list" aria-label="Champion origins and traits">
            <button
              v-for="affinity in affinities"
              :key="affinity.id"
              type="button"
              class="cs-affinity"
              :style="{ '--ac': affinity.color }"
              :aria-label="`${affinityAriaLabel(affinity)} Click to filter champions by ${affinity.name}.`"
              v-tip="affinityTip(affinity)"
              @click="
                $emit('filter', affinity.kind === 'Origin' ? 'origin' : 'trait', affinity.filterId)
              "
            >
              <span class="cs-affinity-crest" aria-hidden="true">
                <Icon :icon="affinity.icon" width="19" height="19" />
              </span>
              <span class="cs-affinity-copy">
                <span class="cs-affinity-head">
                  <small>{{ affinity.kind }}</small>
                  <span class="cs-affinity-steps" aria-hidden="true">
                    <i v-for="step in affinity.thresholds" :key="step.count" />
                  </span>
                  <em>{{ SHOP_CHAMPION_AFFINITY_COUNT }}×</em>
                  <Icon icon="lucide:filter" width="12" height="12" class="cs-filter-cue" />
                </span>
                <strong>{{ affinity.name }}</strong>
                <span v-if="affinity.thresholds[0]" class="cs-affinity-next">
                  {{ affinityEffect(affinity) }}
                </span>
              </span>
            </button>
          </div>
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
          @mouseenter="setRecruitHover(true)"
          @mouseleave="setRecruitHover(false)"
          @focus="setRecruitHover(true)"
          @blur="setRecruitHover(false)"
          @click="$emit('buy', detail.name)"
        >
          <span v-if="detail.locked">
            <img :src="SHOP_LOCK_IMAGE" alt="Locked" class="cs-buy-lock" draggable="false" />
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
import { computed, defineComponent, ref } from 'vue'
import { Icon } from '@iconify/vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { ORIGIN_SYNERGIES } from '@/config/champions/championOrigins'
import { TRAIT_DEFINITIONS } from '@/config/champions/championTraits'
import {
  MAX_STAR_LEVEL,
  SHOP_CHAMPION_AFFINITY_COUNT,
  SHOP_DETAIL_LOCK_SIZE,
  SHOP_LOCK_IMAGE,
} from '@/config/constants'
import type { ShopChampionDetail } from '@/types'

type AffinityCard = {
  kind: 'Origin' | 'Trait'
  name: string
  filterId: string
  color: string
  thresholds: Array<{ count: number; bonus: string }>
}

export default defineComponent({
  name: 'ChampionDetailPanel',
  components: { Icon, CosmicStageBackground },
  props: { detail: { type: Object as () => ShopChampionDetail | null, default: null } },
  emits: ['buy', 'filter'],
  setup(props) {
    const recruitHover = ref(false)
    const setRecruitHover = (active: boolean) => {
      recruitHover.value = active && !!props.detail?.canBuy
    }
    const affinities = computed(() => {
      const detail = props.detail
      if (!detail) return []

      const originDef = detail.origin ? ORIGIN_SYNERGIES[detail.origin.origin] : null
      const origin =
        originDef && detail.origin
          ? {
              id: `origin-${detail.origin.origin}`,
              kind: 'Origin' as const,
              name: detail.origin.origin,
              filterId: detail.origin.origin,
              icon: originDef.icon,
              color: originDef.color,
              thresholds: originDef.thresholds,
            }
          : null
      const traits = detail.traits.map((trait) => {
        const definition = TRAIT_DEFINITIONS.find((entry) => entry.id === trait.id)
        return {
          id: `trait-${trait.id}`,
          kind: 'Trait' as const,
          name: trait.name,
          filterId: trait.id,
          icon: trait.icon,
          color: trait.color,
          thresholds: definition?.thresholds ?? [],
        }
      })

      return origin ? [origin, ...traits] : traits
    })
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
    const affinityEffect = (affinity: AffinityCard) => {
      const bonus = affinity.thresholds[0]?.bonus ?? ''
      const separator = bonus.indexOf(':')
      return separator >= 0 ? bonus.slice(separator + 1).trim() : bonus
    }
    const affinityTipText = (affinity: AffinityCard) =>
      affinity.thresholds
        .map((threshold) => `At ${threshold.count} → ${threshold.bonus}`)
        .join('\n')
    const affinityTip = (affinity: AffinityCard) => ({
      label: `${affinity.kind} ·`,
      labelAccent: affinity.name,
      text: affinityTipText(affinity),
      color: affinity.color,
    })
    const affinityAriaLabel = (affinity: AffinityCard) =>
      `${affinity.kind}: ${affinity.name}. ${affinity.thresholds
        .map((threshold) => `At ${threshold.count}: ${threshold.bonus}`)
        .join('; ')}`

    const detailLockSizePx = `${SHOP_DETAIL_LOCK_SIZE}px`

    return {
      affinityAriaLabel,
      affinityEffect,
      affinityTip,
      affinities,
      costState,
      detailLockSizePx,
      fillStyle,
      formatNumber,
      lockedButtonLabel,
      MAX_STAR_LEVEL,
      recruitHover,
      setRecruitHover,
      SHOP_CHAMPION_AFFINITY_COUNT,
      SHOP_LOCK_IMAGE,
    }
  },
})
</script>

<style scoped>
.cs-detail {
  position: relative;
  isolation: isolate;
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
}
.cs-recruit-signal {
  position: absolute;
  inset: 0;
  z-index: 4;
  border: 2px solid color-mix(in srgb, var(--recruit-c) 72%, transparent);
  background: radial-gradient(
    circle at 50% 92%,
    color-mix(in srgb, var(--recruit-c) 22%, transparent),
    transparent 58%
  );
  opacity: 0;
  pointer-events: none;
  transform: scale(0.985);
}
.cs-detail-hero,
.cs-identity,
.cs-cost,
.cs-detail-footer {
  transition:
    transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 280ms ease;
}
.cs-detail--recruit-hover .cs-recruit-signal {
  animation: cs-recruit-signal 1.25s ease-in-out infinite;
}
.cs-detail--recruit-hover .cs-detail-hero {
  transform: translateY(-3px);
}
.cs-detail--recruit-hover .cs-identity {
  transform: translateY(-2px);
  transition-delay: 35ms;
}
.cs-detail--recruit-hover .cs-cost {
  transform: translateY(-1px);
  transition-delay: 70ms;
}
.cs-detail--recruit-hover .cs-detail-footer {
  transform: translateY(-2px);
  transition-delay: 105ms;
}
@keyframes cs-recruit-signal {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.985);
  }
  50% {
    opacity: 0.72;
    transform: scale(1);
  }
}
.cs-detail-hero {
  position: relative;
  flex: 0 0 clamp(420px, 48%, 540px);
  min-height: 0;
  overflow: hidden;
  border: 0;
  background: #111008;
  box-shadow:
    0 0 0 2px #111008,
    0 0 18px color-mix(in srgb, var(--role-c) 44%, transparent);
}
.cs-detail-hero::before {
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 5px solid var(--role-c);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #fff 34%, var(--role-c));
  content: '';
  pointer-events: none;
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
    color-mix(in srgb, var(--role-c) 18%, rgba(13, 11, 6, 0.98)),
    rgba(13, 11, 6, 0.86) 34%,
    transparent
  );
}
.cs-detail-name {
  margin-bottom: 10px;
  overflow: hidden;
  color: color-mix(in srgb, var(--role-c) 44%, #fff9e8);
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-shadow: 0 2px 10px #000;
  white-space: nowrap;
}
.cs-hero-meta {
  display: none;
}
.cs-hero-tier,
.cs-hero-trait {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.cs-hero-tier {
  color: var(--cc, #e8c040);
}
.cs-hero-tier,
.cs-hero-trait {
  display: none;
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
.cs-identity {
  margin-bottom: 18px;
}
.cs-tier-band {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--ac) 46%, #3e200a);
  border-left: 3px solid var(--ac);
  border-radius: 4px;
  background: linear-gradient(105deg, color-mix(in srgb, var(--ac) 17%, #17150e), #141410 78%);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
}
.cs-tier-band:hover,
.cs-tier-band:focus-visible {
  border-color: var(--ac);
  background: linear-gradient(105deg, color-mix(in srgb, var(--ac) 25%, #17150e), #141410 78%);
  box-shadow: 0 0 16px color-mix(in srgb, var(--ac) 28%, transparent);
}
.cs-tier-band:focus-visible,
.cs-affinity:focus-visible {
  outline: 2px solid var(--ac);
  outline-offset: 2px;
}
.cs-tier-crest,
.cs-affinity-crest {
  display: grid;
  place-items: center;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: var(--ac);
  color: #fff;
}
.cs-tier-crest {
  width: 38px;
  height: 42px;
}
.cs-tier-copy,
.cs-affinity-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.cs-tier-copy strong {
  overflow: hidden;
  color: var(--ac);
  font-size: 22px;
  font-weight: 400;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-shadow: 0 0 12px color-mix(in srgb, var(--ac) 34%, transparent);
  white-space: nowrap;
}
.cs-tier-stars {
  display: flex;
  gap: 3px;
  color: #3b3226;
  font-size: 13px;
  line-height: 1;
}
.cs-tier-stars i {
  font-style: normal;
}
.cs-tier-star--lit {
  color: color-mix(in srgb, var(--ac) 74%, #fff);
  text-shadow: 0 0 8px color-mix(in srgb, var(--ac) 70%, transparent);
}
.cs-filter-cue {
  flex: 0 0 auto;
  color: #8d7652;
  opacity: 0.72;
  transition:
    color 0.15s,
    opacity 0.15s;
}
.cs-tier-band:hover .cs-filter-cue,
.cs-tier-band:focus-visible .cs-filter-cue,
.cs-affinity:hover .cs-filter-cue,
.cs-affinity:focus-visible .cs-filter-cue {
  color: var(--ac);
  opacity: 1;
}
.cs-affinity-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 8px;
  margin-top: 9px;
}
.cs-affinity {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--ac) 46%, #3e200a);
  border-left: 3px solid var(--ac);
  border-radius: 4px;
  background: linear-gradient(105deg, color-mix(in srgb, var(--ac) 15%, #17150e), #141410 78%);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.cs-affinity:hover,
.cs-affinity:focus-visible {
  z-index: 1;
  border-color: var(--ac);
  background: linear-gradient(105deg, color-mix(in srgb, var(--ac) 25%, #17150e), #141410 78%);
  box-shadow: 0 0 14px color-mix(in srgb, var(--ac) 30%, transparent);
}
.cs-affinity-crest {
  width: 30px;
  height: 33px;
}
.cs-affinity-head {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cs-affinity-head small {
  color: #a59675;
  font-size: 10px;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}
.cs-affinity-steps {
  display: flex;
  gap: 4px;
  margin-right: auto;
}
.cs-affinity-steps i {
  width: 8px;
  height: 8px;
  border: 1.5px solid #6c5c3c;
  border-radius: 50%;
}
.cs-affinity em {
  color: var(--ac);
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
}
.cs-affinity strong {
  overflow: hidden;
  color: var(--ac);
  font-size: 20px;
  font-weight: 400;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-shadow: 0 0 12px color-mix(in srgb, var(--ac) 34%, transparent);
  white-space: nowrap;
}
.cs-affinity-next {
  display: block;
  overflow: hidden;
  color: color-mix(in srgb, var(--ac) 76%, #fff9e8);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}
.cs-buy-btn--ready {
  border-color: #6ec040;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #eaffe0;
  cursor: pointer;
}
.cs-detail--recruit-hover .cs-buy-btn--ready {
  transform: translateY(-2px) scale(1.01);
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
  width: v-bind(detailLockSizePx);
  height: v-bind(detailLockSizePx);
  flex: 0 0 auto;
  object-fit: contain;
}
@media (prefers-reduced-motion: reduce) {
  .cs-recruit-signal,
  .cs-detail-hero,
  .cs-identity,
  .cs-cost,
  .cs-detail-footer,
  .cs-buy-btn {
    animation: none !important;
    transition: none !important;
  }
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
