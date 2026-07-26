<template>
  <div class="rift-board">
    <ScoreTopBar />
    <!-- Spectator layout: the map owns the whole middle, team HUDs float above it -->
    <!-- While the objective fight is up, the layers BEHIND it freeze their CSS
         animations (see .board-middle--frozen): game-time is frozen anyway and
         the fight overlay covers the board, so map FX and starfield would only
         burn frame budget. They stay visible — the overlay is translucent —
         just still. -->
    <div class="board-middle" :class="{ 'board-middle--frozen': battleStore.objectiveModalOpen }">
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
import { useBattleStore } from '@/stores/battleStore'

const battleStore = useBattleStore()
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

/* Objective fight running: freeze the animations of everything BEHIND the fight
   overlay. Listed layer by layer instead of a blanket `.board-middle--frozen *`
   so the fight overlay itself — a sibling in the same container — keeps
   animating at full speed. :deep() is required because the frozen layers are
   child components with their own scope. Mirrors .idle-anim-paused in App.vue. */
.board-middle--frozen :deep(.cosmic-stage-bg),
.board-middle--frozen :deep(.cosmic-stage-bg *),
.board-middle--frozen :deep(.cosmic-stage-bg *::before),
.board-middle--frozen :deep(.cosmic-stage-bg *::after),
.board-middle--frozen :deep(.map-layer *),
.board-middle--frozen :deep(.map-layer *::before),
.board-middle--frozen :deep(.map-layer *::after),
.board-middle--frozen :deep(.hud *),
.board-middle--frozen :deep(.hud *::before),
.board-middle--frozen :deep(.hud *::after) {
  animation-play-state: paused !important;
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
