<template>
  <div class="rift-board">
    <ScoreTopBar />
    <!-- Spectator layout: the map owns the whole middle, team HUDs float above it -->
    <div class="board-middle">
      <RiftMinimap class="map-layer" />
      <TeamColumn side="blue" class="hud hud--left" />
      <TeamColumn side="red" class="hud hud--right" />
      <!-- Secured drake effects, stacked under the header on the killer team's side -->
      <DrakeBuffBadges />
      <!-- Objective fight (drake/baron) centers within the board middle, on scoreboard height -->
      <ObjectiveModalComponent />
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
import DrakeBuffBadges from './DrakeBuffBadges.vue'
import AnnouncementBanner from './AnnouncementBanner.vue'
import ObjectiveModalComponent from '../ObjectiveModalComponent.vue'
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
  position: relative;
  min-height: 0;
}

.map-layer {
  position: absolute;
  inset: 0;
}

.hud {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  max-height: 92%;
  z-index: 6;
}
.hud--left { left: 8px; }
.hud--right { right: 8px; }
</style>
