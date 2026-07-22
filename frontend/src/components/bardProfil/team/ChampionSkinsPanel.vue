<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useSkinStore } from '@/stores/skinStore'
import { useActionToast } from '@/composables/useActionToast'
import { SKIN_ORIGINAL, SKIN_CARD_ASPECT_RATIO, SKIN_CARD_MIN_WIDTH } from '@/config/constants'
import {
  getChampionSkins,
  getSkinImagePath,
  getOriginalPreviewPath,
  formatSkinName,
} from '@/utils/championSkins'

const props = defineProps<{
  /** Champion whose skins are browsed (the selected role's main champion). */
  champion: string
}>()

const skinStore = useSkinStore()
const { showToast } = useActionToast()

const cardAspect = SKIN_CARD_ASPECT_RATIO
const cardMinWidth = `${SKIN_CARD_MIN_WIDTH}px`

interface SkinEntry {
  id: string
  label: string
  image: string
}

/** "Original" (default look) first, then every bundled alternate skin. */
const entries = computed<SkinEntry[]>(() => {
  const original: SkinEntry = {
    id: SKIN_ORIGINAL,
    label: formatSkinName(SKIN_ORIGINAL),
    image: getOriginalPreviewPath(props.champion),
  }
  const alternates = getChampionSkins(props.champion)
    .filter((s) => s !== SKIN_ORIGINAL)
    .map((s) => ({
      id: s,
      label: formatSkinName(s),
      image: getSkinImagePath(props.champion, s),
    }))
  return [original, ...alternates]
})

const selected = computed(() => skinStore.getSelectedSkin(props.champion))

function equip(entry: SkinEntry) {
  if (entry.id === selected.value) return
  skinStore.setSkin(props.champion, entry.id)
  showToast(`${props.champion}: ${entry.label} equipped!`)
}
</script>

<template>
  <div class="csk-panel">
    <!-- header strip — headerless shell, panel owns the top area -->
    <div class="csk-header">
      <Icon icon="game-icons:cape" width="26" height="26" class="csk-header-icon" />
      <div class="csk-header-text">
        <div class="csk-title">{{ champion }} Skins</div>
      </div>
    </div>

    <!-- gallery -->
    <div class="csk-scroll">
      <div class="csk-grid">
        <button
          v-for="entry in entries"
          :key="entry.id"
          class="csk-card"
          :class="{ 'csk-card--equipped': entry.id === selected }"
          type="button"
          @click="equip(entry)"
        >
          <img :src="entry.image" :alt="entry.label" class="csk-card-img" loading="lazy" />
          <div class="csk-card-fade" />
          <div class="csk-card-bottom">
            <span class="csk-card-name">{{ entry.label }}</span>
            <span v-if="entry.id === selected" class="csk-card-badge csk-card-badge--equipped">
              ✓ Equipped
            </span>
            <span v-else class="csk-card-badge csk-card-badge--cta">Equip</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.csk-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #111008;
}

/* ── header strip ── */
.csk-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 58px 12px 16px; /* right inset clears the floating close button */
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  flex-shrink: 0;
}
.csk-header-icon {
  color: #e8c040;
  flex-shrink: 0;
}
.csk-header-text {
  flex: 1;
  min-width: 0;
}
.csk-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #eccf82;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* ── gallery ── */
.csk-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.csk-scroll::-webkit-scrollbar {
  width: 4px;
}
.csk-scroll::-webkit-scrollbar-track {
  background: #111;
}
.csk-scroll::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}
.csk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(v-bind(cardMinWidth), 1fr));
  gap: 14px;
}

/* ── splash card ── */
.csk-card {
  position: relative;
  aspect-ratio: v-bind(cardAspect);
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  border-radius: 4px;
  background: #1a1008;
  border: 2px solid rgba(122, 78, 32, 0.55);
  box-shadow: inset 0 0 0 1px rgba(62, 32, 10, 0.8);
  text-align: left;
  transition:
    transform 0.18s ease-out,
    border-color 0.18s,
    box-shadow 0.18s;
}
.csk-card:hover {
  transform: translateY(-3px);
  border-color: #c89040;
  box-shadow:
    inset 0 0 0 1px rgba(62, 32, 10, 0.8),
    0 8px 22px rgba(0, 0, 0, 0.6),
    0 0 14px rgba(232, 192, 64, 0.18);
}
.csk-card:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}
.csk-card--equipped {
  border-color: #e8c040;
  box-shadow:
    inset 0 0 0 1px #5c3310,
    0 0 16px rgba(232, 192, 64, 0.3);
}
.csk-card-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  transition: transform 0.3s ease-out;
}
.csk-card:hover .csk-card-img {
  transform: scale(1.05);
}
.csk-card-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 48%,
    rgba(10, 7, 4, 0.55) 76%,
    rgba(10, 7, 4, 0.96) 100%
  );
}
.csk-card-bottom {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.csk-card-name {
  min-width: 0;
  font-size: 17px;
  font-weight: 700;
  color: #f4e6bc;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.csk-card-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid;
}
.csk-card-badge--equipped {
  color: #0c1a06;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border-color: #6ec040;
  text-shadow: none;
}
.csk-card-badge--cta {
  color: #e8c040;
  background: rgba(0, 0, 0, 0.66);
  border-color: rgba(200, 144, 64, 0.55);
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity 0.18s,
    transform 0.18s;
}
.csk-card:hover .csk-card-badge--cta,
.csk-card:focus-visible .csk-card-badge--cta {
  opacity: 1;
  transform: translateY(0);
}
</style>
