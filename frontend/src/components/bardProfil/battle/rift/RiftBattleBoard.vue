<template>
  <div class="rift-board">
    <ScoreTopBar />
    <div class="board-middle">
      <TeamColumn side="blue" />
      <RiftMinimap :chat-open="chatOpen" @toggle-chat="$emit('toggle-chat')" />
      <TeamColumn side="red" />
    </div>
    <KillFeedTicker />
    <AnnouncementBanner />
  </div>
</template>

<script setup lang="ts">
import ScoreTopBar from './ScoreTopBar.vue'
import TeamColumn from './TeamColumn.vue'
import RiftMinimap from './RiftMinimap.vue'
import KillFeedTicker from './KillFeedTicker.vue'
import AnnouncementBanner from './AnnouncementBanner.vue'

defineProps<{ chatOpen: boolean }>()
defineEmits<{ 'toggle-chat': [] }>()
</script>

<style scoped>
.rift-board {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #0c0b07;
  z-index: 10;
}

.board-middle {
  flex: 1;
  display: flex;
  min-height: 0;
}
</style>
