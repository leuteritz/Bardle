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
      <!-- Meta readout in the free space under each team column -->
      <BattleMetaPanel side="blue" class="meta meta--left" />
      <BattleMetaPanel side="red" class="meta meta--right" />
      <!-- Secured drake/baron trophies as a buff bar in the killer team's own
           top corner, growing inward -->
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
import BattleMetaPanel from './BattleMetaPanel.vue'
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
  /* Shared team-HUD width — TeamColumn and DrakeBuffBadges both key off it.
     The rift map is a centered square of min(board-middle w, h): a flat board
     makes the map smaller and the side gutters WIDER, a tall one the reverse.
     Keying the column off both axes therefore keeps a gap to the map at every
     desktop viewport (measured: 40px on WUXGA, the tightest of the four) while
     still growing from ~250px on Full HD to the 340px cap on 4K. */
  --hud-w: clamp(180px, min(20cqw, 40cqh), 420px);
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

/* Meta plates fill the gutter's bottom corner: same column width and 8px inset
   as the team HUD above, so the three stack as one column. The bottom offset
   clears the kill-feed bar, which grows upward as an overlay over the board's
   last ~8px, and the height stays well inside the free space under the
   (vertically centred) team column — measured 54px of plate in 81px of gap on
   the flattest desktop viewport. */
.meta {
  position: absolute;
  bottom: clamp(12px, 2cqh, 20px);
  width: var(--hud-w, 192px);
  height: clamp(56px, 8.7cqh, 150px);
  z-index: 6;
}
.meta--left { left: 8px; }
.meta--right { right: 8px; }
</style>
