<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useSpaceMusic } from '@/composables/useSpaceMusic'

const { volume, isMuted, toggleMute, setVolume } = useSpaceMusic()

function onSliderInput(e: Event) {
  const el = e.target as HTMLInputElement
  setVolume(Number(el.value))
}
</script>

<template>
  <div class="music-widget" :class="{ 'music-widget--muted': isMuted }">
    <button
      class="music-btn"
      :title="isMuted ? 'Unmute music' : 'Mute music'"
      @click="toggleMute"
    >
      <Icon
        icon="game-icons:trumpet"
        width="22"
        height="22"
        :style="{ color: isMuted ? '#5c3310' : '#e8c040' }"
      />
    </button>

    <div class="music-panel">
      <div class="music-panel__gold-line" />
      <div class="music-panel__body">
        <span class="music-label">Music</span>
        <input
          type="range"
          class="music-slider"
          min="0"
          max="1"
          step="0.01"
          :value="isMuted ? 0 : volume"
          @input="onSliderInput"
        />
        <span class="music-value">{{ isMuted ? 'OFF' : Math.round(volume * 100) + '%' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.music-widget {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 45;
  display: flex;
  align-items: center;
}

.music-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 52px;
  background: #111008;
  border: 4px solid #7a4e20;
  border-left: none;
  border-radius: 0 4px 4px 0;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310;
  cursor: pointer;
  transition: background 0.15s, padding-right 0.15s;
  padding: 0;
  padding-right: 4px;
}

.music-btn:hover {
  background: #2a1a0a;
  padding-right: 8px;
}

.music-panel {
  display: none;
  flex-direction: column;
  min-width: 120px;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 0 4px 4px 0;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310;
  overflow: hidden;
}

.music-widget:hover .music-panel {
  display: flex;
}

.music-panel__gold-line {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  flex-shrink: 0;
}

.music-panel__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
}

.music-label {
  color: #e8c040;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
}

.music-value {
  color: #e8c040;
  font-size: 10px;
  letter-spacing: 0.05em;
  line-height: 1;
}

.music-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 90px;
  height: 4px;
  background: #3e200a;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.music-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #e8c040;
  border-radius: 2px;
  cursor: pointer;
  box-shadow: 0 0 4px rgba(232, 192, 64, 0.5);
}

.music-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #e8c040;
  border-radius: 2px;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 4px rgba(232, 192, 64, 0.5);
}

.music-slider::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    #e8c040 0%,
    #e8c040 calc(var(--val, 25) * 1%),
    #3e200a calc(var(--val, 25) * 1%),
    #3e200a 100%
  );
  height: 4px;
  border-radius: 2px;
}

.music-widget--muted .music-btn {
  opacity: 0.55;
}

.music-widget--muted .music-slider {
  opacity: 0.4;
}
</style>
