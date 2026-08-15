<script setup lang="ts">
/**
 * Der Skill-Tree-Tab — nur noch Rahmen: Hintergrund, Fit-Skalierung, und die
 * zwei Teile darin (Orbit-Bühne, Detail-Blatt).
 *
 * **Warum nur die Bühne skaliert:** dieselbe Dreiteilung wie im Shop
 * (`ShopComponent`) — links eine Bühne, die jeden freien Pixel bekommt, rechts
 * eine Detail-Schiene in fester, lesbarer Breite. Bis zum Umbau lag das Blatt
 * MIT im Skalierkasten; sein `transform: scale()` läuft von ~1,0 auf Full HD bis
 * zum Deckel 1,9 auf 4K, und damit lief jeder Schriftgrad darin mit. Gemessen
 * gegen den Shop (dessen Spalte nicht skaliert): 13 px statt 14,5 auf Full HD,
 * ~24 px statt 14,5 auf 4K. Eine gemeinsame Optik war so nicht erreichbar,
 * gleich welche Werte im Blatt stehen.
 *
 * **Warum Auswahl und Zweigfokus hier als `ref` liegen und nicht in Pinia:**
 * sie überleben weder ein Speichern noch das Schliessen des Tabs und werden von
 * keinem anderen System gelesen. Im Store wären es zwei Felder, die jede
 * Persistenz-Runde, jedes `$reset` und jede Spec mitschleppt.
 *
 * **Warum die Höhe nicht im Design-Kasten steht:** ein Kasten mit festem
 * Seitenverhältnis füllt nur EIN Container-Verhältnis. Das Profil-Modal reicht
 * gemessen von 2,00 (Full HD, 1319 × 658) bis unter 1,50 — mit einem festen
 * 1240 × 632 blieb oben und unten zusammen bis zu 250 px schwarz stehen, weil
 * `useFitScale` beide Achsen gleich behandelt und die Breite zuerst anschlägt.
 *
 * Deshalb hier eine eigene Rechnung statt `useFitScale`:
 *   1. Die Skalierung kommt aus der BREITE (gedeckelt).
 *   2. Die Design-HÖHE ist das, was der Container bei dieser Skalierung hergibt.
 *   3. Ist der Container flacher als das Minimum, greift die Höhe doch — dann
 *      verhält sich das Ganze wieder wie ein fester Kasten.
 * Bühne und Blatt bekommen diese Höhe als volle Höhe; die Bahnen füllen sie
 * über eine mitwachsende y-Stauchung (`skillTreeLayout`).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useMeepSpotlight } from '@/composables/ui/useMeepSpotlight'
import { useUiStore } from '@/stores/core/uiStore'
import { MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'
import {
  BARD_PROFILE_RAIL_MAX_PX,
  BARD_PROFILE_RAIL_MIN_PX,
  BARD_PROFILE_RAIL_VW,
  SKILL_TREE_MAX_SCALE,
  SKILL_TREE_STAGE_MAX_HEIGHT,
  SKILL_TREE_STAGE_MIN_HEIGHT,
  SKILL_TREE_STAGE_WIDTH,
} from '@/config/constants'
import MeepOrbitStage from './MeepOrbitStage.vue'
import MeepSkillDetails from './MeepSkillDetails.vue'

const meepTree = useMeepTreeStore()
const uiStore = useUiStore()
const { resetMeepSpotlight } = useMeepSpotlight()

const selectedId = ref<string | null>(null)
const focusBranch = ref<string | null>(null)

/** Luft zwischen Design-Kasten und Containerkante, auf jeder Seite. */
const PADDING = 10
const DESIGN_WIDTH = SKILL_TREE_STAGE_WIDTH

/** Die Detail-Schiene — dieselbe Breite wie die Forge-Spalte im Shop. */
const railWidth = `clamp(${BARD_PROFILE_RAIL_MIN_PX}px, ${BARD_PROFILE_RAIL_VW}vw, ${BARD_PROFILE_RAIL_MAX_PX}px)`

/* Gemessen wird die BÜHNENSPALTE, nicht der Tab: die Schiene daneben hat ihre
   eigene, unskalierte Breite und darf nicht in die Fit-Rechnung eingehen. */
const container = ref<HTMLElement | null>(null)
const boxWidth = ref(0)
const boxHeight = ref(0)
let observer: ResizeObserver | null = null

function measure(): void {
  const box = container.value
  if (!box) return
  boxWidth.value = box.clientWidth
  boxHeight.value = box.clientHeight
}

onMounted(() => {
  observer = new ResizeObserver(measure)
  if (container.value) observer.observe(container.value)
  measure()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onEsc)
})

/**
 * Skalierung und Design-Höhe in einem Zug — beide hängen voneinander ab, und
 * zwei getrennte `computed` liefen darüber auseinander.
 *
 * Die Höhe wird auf gerade Zahlen gerundet: ein Container, der beim Öffnen um
 * einen Bruchteil eines Pixels zittert, baute sonst die ganze Geometrie neu.
 */
const fit = computed(() => {
  const availWidth = boxWidth.value - PADDING * 2
  const availHeight = boxHeight.value - PADDING * 2
  if (availWidth <= 0 || availHeight <= 0) {
    return { scale: 1, height: SKILL_TREE_STAGE_MIN_HEIGHT }
  }
  const widthScale = Math.min(SKILL_TREE_MAX_SCALE, availWidth / DESIGN_WIDTH)
  const height = Math.min(
    SKILL_TREE_STAGE_MAX_HEIGHT,
    Math.max(SKILL_TREE_STAGE_MIN_HEIGHT, Math.round(availHeight / widthScale / 2) * 2),
  )
  return { scale: Math.min(widthScale, availHeight / height), height }
})

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
 *
 * `null` hebt die Auswahl auf und stellt damit die allgemeine Ansicht des
 * Blatts wieder her; der Zweigfokus bleibt dabei stehen, er ist eine eigene
 * Ebene (siehe `onEsc`).
 */
function onSelect(id: string | null): void {
  selectedId.value = id
  if (id === null) return
  const branchId = MEEP_TREE_NODE_INDEX[id]?.branch.id
  if (focusBranch.value && branchId && focusBranch.value !== branchId) focusBranch.value = null
}

/* ── Escape ───────────────────────────────────────────────────────────────
 * Wickelt eine Ebene ab: erst die Auswahl, dann den Zweigfokus. Bleibt nichts
 * mehr, gehört die Taste dem Profil-Modal, das sich damit ganz schliesst.
 *
 * Das `preventDefault()` ist die Meldung dorthin: `BardProfileMenu` entscheidet
 * erst nach dem gesamten Ereignisdurchlauf anhand von `defaultPrevented`. Ohne
 * sie fiele mit der innersten Ebene sofort das ganze Profil zu.
 */
function onEsc(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  if (selectedId.value !== null) selectedId.value = null
  else if (focusBranch.value !== null) focusBranch.value = null
  else return
  e.preventDefault()
}

/**
 * Der Listener hängt an der SICHTBARKEIT, nicht an der Lebensdauer: der Tab
 * wird nach dem ersten Öffnen nur noch versteckt, nicht abgerissen (siehe
 * `BardProfileMenu`). An `onMounted` gebunden verbrauchte er Escape sonst
 * dauerhaft — auch im Idle-Orbit.
 */
const isVisible = computed(() => uiStore.bardActiveTab === 'tree')

watch(
  isVisible,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', onEsc)
      return
    }
    window.removeEventListener('keydown', onEsc)
    /* Der Tab wird nur versteckt, nicht abgerissen — ein Zeiger, der ihn beim
       Wechsel verlässt, hinterlässt sonst einen dauerhaft hervorgehobenen
       Knoten und eine Empfehlung, die auf sein Loslassen wartet. */
    resetMeepSpotlight()
  },
  { immediate: true },
)

const designStyle = computed(() => ({
  width: `${DESIGN_WIDTH}px`,
  height: `${fit.value.height}px`,
  transform: `scale(${fit.value.scale})`,
}))
</script>

<template>
  <!-- Dieselbe Aufteilung wie `ShopComponent`: Bühne links mit jedem freien
       Pixel, Detail-Schiene rechts in fester Breite. Die Naht zwischen beiden
       ist der `border-left` der Schiene — eine zweite Linie hier verdoppelte
       sie. -->
  <div class="st-tab">
    <!-- `.self` auf beiden Ebenen: der Fit-Kasten lässt je nach Container Rand
         stehen — ein Klick dorthin ist genauso „daneben" wie einer auf die
         freie Bühne. Ein Klick IN die Schiene hebt die Auswahl nicht auf. -->
    <div ref="container" class="st-stage" @click.self="onSelect(null)">
      <CosmicStageBackground />

      <div class="st-design" :style="designStyle" @click.self="onSelect(null)">
        <MeepOrbitStage
          :height="fit.height"
          :selected-id="selectedId"
          :focus-branch="focusBranch"
          @select="onSelect"
          @focus="focusBranch = $event"
        />
      </div>
    </div>

    <MeepSkillDetails class="st-rail" :node-id="selectedId" @select="onSelect" />
  </div>
</template>

<style scoped>
.st-tab {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  overflow: hidden;
  background: var(--rpg-bg-deep);
}

/* Die Bühnenspalte. Sie ist zugleich das gemessene Element — `clientWidth/Height`
   ignorieren Transforms, die Messung bleibt also stabil, während die Skalierung
   ihres Kindes wirkt. */
.st-stage {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Die Detail-Schiene. `position: relative` + z-index ist nicht kosmetisch: der
   Sternenhimmel nebenan ist absolut positioniert (z-index 0) und paints damit
   im positionierten Schritt — über jedem STATISCHEN Geschwister, wie deckend
   es auch sei. Dieselbe Absicherung trägt `TeamSidePanelShell`. */
.st-rail {
  position: relative;
  z-index: 1;
  flex: 0 0 v-bind(railWidth);
  min-width: 0;
}

/* Der Design-Kasten. Breite und Höhe kommen inline; nur der Transform passt ihn
   an den Viewport an. */
.st-design {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  transform-origin: center center;
}
</style>
