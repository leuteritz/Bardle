<template>
  <div class="rift-board">
    <ScoreTopBar />
    <!-- Spectator layout: the map owns the whole middle, team HUDs float above it -->
    <div class="board-middle">
      <!-- shared cosmic backdrop — fills the gutters beside the square map,
           behind both team HUD columns (same starfield as the other tabs) -->
      <CosmicStageBackground />
      <RiftMinimap class="map-layer" />
      <TeamColumn side="blue" class="hud hud--left" />
      <TeamColumn side="red" class="hud hud--right" />
      <!-- Secured drake effects, stacked under the header on the killer team's side -->
      <DrakeBuffBadges />
      <!-- Objective fight (drake/baron) centers within the board middle, on scoreboard height -->
      <ObjectiveModalComponent />
      <!-- Persistent stop control: floats over the map's top edge, so it never
           steals layout height (the square map keeps its full size) -->
      <AutoBattleStopBar />
    </div>
    <KillFeedTicker />
    <AnnouncementBanner />
  </div>
</template>

<script setup lang="ts">
import ScoreTopBar from './ScoreTopBar.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import TeamColumn from './TeamColumn.vue'
import RiftMinimap from './RiftMinimap.vue'
import KillFeedTicker from './KillFeedTicker.vue'
import AutoBattleStopBar from './AutoBattleStopBar.vue'
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
  background: #111008; /* same deep-space base as Shop / Planets / Team / Skill Tree */
  z-index: 10;
  /* Size container: header, HUDs and ticker scale with the board via cq units,
     so every desktop resolution fits without vertical scrolling. */
  container-type: size;
  container-name: board;
  /* Shared team-HUD width — TeamColumn and DrakeBuffBadges both key off it */
  --hud-w: clamp(148px, 15cqw, 200px);
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
