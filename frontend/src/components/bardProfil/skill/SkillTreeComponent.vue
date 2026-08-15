<script setup lang="ts">
/**
 * Der Skill-Tree-Tab — nur noch Rahmen: Hintergrund, Fit-Skalierung, und die
 * drei Teile darin (Toolbar, Orbit-Bühne, Detail-Blatt).
 *
 * **Warum Auswahl, Hover, Suchtext und Zweigfokus hier als `ref` liegen und
 * nicht in Pinia:** sie überleben weder ein Speichern noch das Schliessen des
 * Tabs und werden von keinem anderen System gelesen. Im Store wären es vier
 * Felder, die jede Persistenz-Runde, jedes `$reset` und jede Spec mitschleppt.
 *
 * **Warum EIN Transform für alles:** Bühne und Blatt stehen zusammen in einem
 * festen Design-Kasten, den `useFitScale` als Ganzes skaliert — dasselbe
 * Muster wie `PauseOverlay.vue`. Eine zweite, davon unabhängige Grössenregel
 * (vh-Clamp, Höhen-Media-Query) rechnete gegen den Fit-Scale statt mit ihm.
 */
import { computed, ref, watch } from 'vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import { useFitScale } from '@/composables/ui/useFitScale'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'
import {
  SKILL_TREE_ASIDE_WIDTH,
  SKILL_TREE_MAX_SCALE,
  SKILL_TREE_STAGE_SIZE,
} from '@/config/constants'
import MeepOrbitStage from './MeepOrbitStage.vue'
import MeepSkillDetails from './MeepSkillDetails.vue'
import MeepStageToolbar from './MeepStageToolbar.vue'

const meepTree = useMeepTreeStore()

const selectedId = ref<string | null>(null)
const focusBranch = ref<string | null>(null)
const query = ref('')

const container = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const { scale } = useFitScale(container, content, { maxScale: SKILL_TREE_MAX_SCALE, padding: 10 })

const designWidth = SKILL_TREE_STAGE_SIZE.w + SKILL_TREE_ASIDE_WIDTH

/**
 * Ein Knoten, den der Spieler im Blatt liest, gilt als angesehen — sonst
 * bliebe der pinke Zähler im Header stehen, obwohl er gerade davorsitzt.
 */
watch(selectedId, (id) => {
  if (id) meepTree.acknowledgeNode(id)
})

/**
 * Wählt der Spieler einen Knoten aus einem anderen Zweig, während ein Fokus
 * liegt, würde er hinter dem Schleier verschwinden — der Fokus weicht.
 */
function onSelect(id: string): void {
  selectedId.value = id
  const branchId = MEEP_TREE_NODE_INDEX[id]?.branch.id
  if (focusBranch.value && branchId && focusBranch.value !== branchId) focusBranch.value = null
}

const stageStyle = computed(() => ({
  width: `${designWidth}px`,
  transform: `scale(${scale.value})`,
}))
</script>

<template>
  <div ref="container" class="st-tab">
    <CosmicStageBackground />

    <div ref="content" class="st-design" :style="stageStyle">
      <MeepStageToolbar
        v-model:query="query"
        v-model:focus-branch="focusBranch"
      />

      <div class="st-body">
        <MeepOrbitStage
          :selected-id="selectedId"
          :focus-branch="focusBranch"
          :query="query"
          @select="onSelect"
          @focus="focusBranch = $event"
        />
        <MeepSkillDetails :node-id="selectedId" @select="onSelect" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.st-tab {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--rpg-bg-deep);
}

/* Der Design-Kasten. Seine Masse sind fest; nur der Transform passt ihn an
   den Viewport an, und `offsetWidth` ignoriert Transforms — die Messung in
   useFitScale bleibt dadurch stabil, während sie wirkt. */
.st-design {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transform-origin: center center;
}

.st-body {
  display: flex;
  gap: 10px;
  align-items: stretch;
}
</style>
