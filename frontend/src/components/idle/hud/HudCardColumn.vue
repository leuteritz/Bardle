<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useHudCardColumn } from '@/composables/ui/useHudCardColumn'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useLandfallStore } from '@/stores/world/landfallStore'
import { getLandfall } from '@/config/world/landfalls'
import { landfallAcceptsTap } from '@/utils/game/landfalls'
import HudCardFoldedRow from './HudCardFoldedRow.vue'
import WayfinderHudCard from '@/components/idle/mission/WayfinderHudCard.vue'
import LandfallHudCard from '@/components/idle/landfall/LandfallHudCard.vue'
import DrifterInfoCard from '@/components/idle/drifter/DrifterInfoCard.vue'
import VoidRiftHudCard from '@/components/idle/void/VoidRiftHudCard.vue'
import OmenHudCard from '@/components/idle/omen/OmenHudCard.vue'
import AugmentAutoPickToast from '@/components/augment/AugmentAutoPickToast.vue'
import type { HudCardId } from '@/types'

/**
 * Die Kartenspalte oben links — EIN Container für alle sechs.
 *
 * Vorher hingen sie als sechs unabhängige `position: fixed`-Karten in `App.vue`
 * und teilten sich die Ecke, indem jede ihre Unterkante per `ResizeObserver` als
 * Custom Property veröffentlichte und jede folgende ein `max()` über ALLE
 * Vorgänger nahm — sechs Ketten, die in jedem 2400er Media-Block noch einmal
 * standen. Ihre Kürzung ist zweimal als Bug aufgeschlagen.
 *
 * Hier macht das Flex, und das Nachrücken der FLIP der `TransitionGroup`
 * (Muster: `HeraldReceiptStack.vue`). Deshalb hat auch keine Karte mehr eine
 * `transition: top` — vorher hatten sie zwei von sechs, die anderen sprangen.
 *
 * Der Wayfinder steht immer zuerst und faltet nie. Er ist das einzige dauerhafte
 * Glied, und er ist als einziges in der HUD-Kontur (`--wayfinder-bottom`) — die
 * fünf flüchtigen aufzunehmen hiesse, das freie Feld im Sekundentakt zu
 * verschieben.
 */
const { order, focus, density, foldOf } = useHudCardColumn()
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const landfallStore = useLandfallStore()

const CARDS: Record<HudCardId, Component> = {
  wayfinder: WayfinderHudCard,
  landfall: LandfallHudCard,
  drifter: DrifterInfoCard,
  void: VoidRiftHudCard,
  omen: OmenHudCard,
  autopick: AugmentAutoPickToast,
}

/**
 * Der Landfall bleibt auch gefaltet ein Knopf — seine Fläche IST der Griff. Am
 * Cairn nicht: dort trägt jede der drei Zeilen ihren eigenen, und die stehen nur
 * aufgerissen.
 */
const landfallTap = computed<(() => void) | undefined>(() => {
  const lf = galaxyStore.activeLandfall
  if (!lf) return undefined
  if (landfallStore.offerFor(lf).length > 0) return undefined
  if (!landfallAcceptsTap(getLandfall(lf.kind), lf.taps)) return undefined
  return () => galaxyStore.tapLandfall()
})

/**
 * Ein Eintrag je Karte. Kein `<template v-for>` mit `v-if` darin: die
 * `TransitionGroup` braucht ELEMENTE als Kinder, keine Fragmente.
 *
 * Der Schlüssel unterscheidet aufgerissen von gefaltet. Mit demselben für beide
 * Fassungen tauschte Vue den Knoten im Fluss aus, und der FLIP mässe die Lage
 * eines Elements, das es nicht mehr gibt.
 */
const items = computed(() =>
  order.value.flatMap((id) => {
    if (id === 'wayfinder' || id === focus.value) {
      return [{ key: `${id}-open`, comp: CARDS[id], props: {} as Record<string, unknown> }]
    }
    const fold = foldOf(id)
    if (!fold) return []
    return [
      {
        key: `${id}-fold`,
        comp: HudCardFoldedRow as Component,
        props: {
          fold,
          tap: id === 'landfall' ? landfallTap.value : undefined,
          // Der Not-Aus der Automatik muss auch gefaltet erreichbar bleiben —
          // ohne ihn sperrt ein aktiver Auto-Pick den einzigen Weg zurück zur
          // eigenen Wahl.
          action:
            id === 'autopick'
              ? {
                  title: 'Turn auto-pick off and choose yourself again',
                  run: () => gameStore.setAutoPickAugments(false),
                }
              : undefined,
        } as Record<string, unknown>,
      },
    ]
  }),
)
</script>

<template>
  <!-- Die Gruppe steht auch leer: würde sie per `v-if` verschwinden, spielte
       keine Karte je ihre Ausblendung zu Ende. -->
  <TransitionGroup
    tag="div"
    name="hc"
    class="hc-col hcc-root"
    :class="`hc-col--${density}`"
    role="region"
    aria-label="Live status"
  >
    <component :is="item.comp" v-for="item in items" :key="item.key" v-bind="item.props" />
  </TransitionGroup>
</template>

<style scoped>
/* Die EINE fixe Wurzel der Spalte. Breite und Rand kommen aus `--hud-col-w` /
   `--hud-col-edge` (App.vue) — dieselbe Formel trägt die Log-Spur gegenüber,
   und zwei Karten in einer Spalte, deren rechte Kanten auseinanderliegen,
   lesen sich als Fehler.

   Was hier steht, ist alles, was der Container weiß: Lage, Breite, Ebene,
   Abstand. Die Gestalt der Karten steht in `.hc-*` (rpg-theme.css), ihre
   Dichte in den Token-Stufen dort. */
.hcc-root {
  position: fixed;
  top: 0.5rem;
  left: var(--hud-col-edge);
  z-index: 899;
  width: var(--hud-col-w);
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Sonst fingen die Lücken zwischen den Karten Klicks ab, die der Bühne
     gehören. Die Karten selbst nehmen den Zeiger in `.hc` wieder an. */
  pointer-events: none;
}

@media (min-width: 2400px) {
  .hcc-root {
    top: 0.7rem;
    gap: 10px;
  }
}
</style>
