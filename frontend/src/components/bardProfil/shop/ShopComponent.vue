<template>
  <div class="shop-frame">
    <!-- Star Forge — links der wachsende Sonnenbaum, rechts die Spalte mit
         allem Kaufbaren: erreichbare Angebote oben, die Upgrade-Liste darunter,
         zuletzt die Schublade mit Gesperrtem. Eine Abteilungs-Rail stand
         einmal rechts daneben; sie ist gestrichen (Herleitung an
         `FORGE_OFFER_TITLE` in `constants/forge.ts`). -->
    <ForgeTreePanel class="shop-tree-col" />
    <StarForgePanel class="shop-forge-col" />

    <!-- TEMP: admin shortcut — buys every ray, branch, leaf, relic and
         constellation the CURRENT star phase allows, free of charge. Floated
         into the tree's top corner so it never takes part in the layout: the
         two bottom ones are taken, by the zoom control and the edge legend.
         Remove together with `starForgeStore.adminMaxAll()`. -->
    <button class="shop-admin-max" title="Admin: buy every forge upgrade at once" @click="maxOutForge">
      <Icon icon="game-icons:anvil-impact" width="16" height="16" />
      DEV · Max Forge
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useHerald } from '@/composables/ui/useHerald'
import {
  BARD_PROFILE_RAIL_MAX_PX,
  BARD_PROFILE_RAIL_MIN_PX,
  BARD_PROFILE_RAIL_VW,
} from '@/config/constants'
import ForgeTreePanel from './ForgeTreePanel.vue'
import StarForgePanel from './StarForgePanel.vue'

const forgeStore = useStarForgeStore()
const uiStore = useUiStore()
const { announceReceipt } = useHerald()

/**
 * Was der Zeiger berührt hat, ist gesehen — und der azurne „NEW"-Rahmen daran
 * erledigt.
 *
 * EIN Wächter für BEIDE Spalten: `spotlightId` ist `listHoverId ?? treeHoverId`,
 * ein Knoten im Baum und seine Zeile in der Liste melden sich also über dieselbe
 * Ref. Er hängt hier und nicht in einer der beiden Spalten, weil dies die
 * einzige Komponente ist, die beide überspannt — in `ForgeUpgradesSection`
 * verschwände er beim Abteilungswechsel mitsamt seinem `v-if`, obwohl der Baum
 * daneben weiterhin bedienbar ist.
 */
const { spotlightId, pinned, clearPin, resetForgeSpotlight } = useForgeSpotlight()

watch(spotlightId, (id) => {
  if (id) forgeStore.acknowledgeShopEntry(id)
})

/**
 * Escape löst die ANHEFTUNG im Sternbaum — und meldet das, sonst schlösse
 * dieselbe Taste gleich das ganze Profil.
 *
 * `BardProfileMenu` entscheidet erst NACH dem Ereignisdurchlauf, ob es zumacht,
 * und liest dafür `defaultPrevented`; eine innere Ebene beansprucht die Taste
 * also mit `preventDefault()`. Dasselbe Protokoll bedient `TeamTabComponent`.
 *
 * Steht hier und nicht im Baum, aus zwei Gründen. Erstens ist dies die einzige
 * Komponente, die beide Spalten überspannt. Zweitens — und das ist der harte
 * Grund — **wird der Shop-Tab nach dem ersten Öffnen nie mehr abgerissen**:
 * `BardProfileMenu` rendert ihn als `v-if="mountedTabs.has('shop')"` plus
 * `v-show`, und `mountedTabs` wird nur befüllt. Ein `onMounted`-Listener bliebe
 * dauerhaft am Fenster hängen und verbrauchte die Taste auch im Idle-Orbit.
 */
const isVisible = computed(() => uiStore.bardActiveTab === 'shop')

function onEsc(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (!pinned.value) return
  clearPin()
  // Verbraucht: das Modal darüber prüft `defaultPrevented` und bleibt stehen.
  event.preventDefault()
}

watch(
  isVisible,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', onEsc)
      return
    }
    window.removeEventListener('keydown', onEsc)
    // Aus demselben Grund wie oben: das `onBeforeUnmount` des Baums feuert beim
    // Tabwechsel gar nicht, weil er gemountet bleibt. Ohne diese Zeile stünde
    // die Anheftung der letzten Sitzung beim nächsten Öffnen noch da.
    resetForgeSpotlight()
  },
  { immediate: true },
)

onUnmounted(() => window.removeEventListener('keydown', onEsc))

function maxOutForge(): void {
  forgeStore.adminMaxAll()
  announceReceipt({
    // `forged`, nicht `forge`: jeder echte Forge-Kauf meldet sich unter dieser
    // Art. Mit `forge` trug ausgerechnet der Admin-Knopf ein anderes Label und
    // eine andere Farbe als alles, was er auslöst.
    kind: 'forged',
    eyebrow: 'ADMIN',
    headline: 'Forge maxed out',
    subline: 'For this star phase',
    // Ein Zustand, kein Vorgang: ein `×3` daran zählte nur die Klicks.
    countable: false,
  })
}

/** Die Detailspalte — dieselbe Breite wie die Schiene im Skill-Tree-Tab. */
const detailWidth = `clamp(${BARD_PROFILE_RAIL_MIN_PX}px, ${BARD_PROFILE_RAIL_VW}vw, ${BARD_PROFILE_RAIL_MAX_PX}px)`
</script>

<style scoped>
.shop-frame {
  position: relative;
  display: flex;
  height: 100%;
  background: #111008;
  overflow: hidden;
}

/* Der Baum bekommt jeden freien Pixel; die Forge-Spalte bleibt in einer
   lesbaren, begrenzten Breite über alle Desktop-Auflösungen (1280 → 4K).
   Die Naht zwischen zwei Spalten ist jeweils der `border-left` der rechten —
   eine zweite Linie hier verdoppelte sie. */
.shop-tree-col {
  flex: 1;
  min-width: 0;
}

/* Die Breite steht als `BARD_PROFILE_RAIL_*` in `constants/ui.ts` samt
   Herleitung — der Skill-Tree-Tab legt sein Detail-Blatt in dieselbe Schiene,
   und zwei eigene Zahlen dafür liefen still auseinander. */
.shop-forge-col {
  flex: 0 0 v-bind(detailWidth);
  min-width: 0;
}

/* ── TEMP admin button ─────────────────────────────────────────── */
/* Oben links in der Baumspalte. Die untere linke Ecke gehört der Kantenlegende,
   die untere rechte der Zoom-Leiste — die obere Kante ist die einzige, die frei
   ist.

   `top` und `left` tragen DIESELBE Zahl, und das ist jetzt die ganze Regel. Hier
   stand eine Rechnung aus der Höhe des Ertrags-Kopfs, unter den der Knopf
   ausweichen musste; der Kopf ist weg, und mit ihm die zweite Quelle für diese
   Kante. Fällt mit dem Knopf zusammen weg. */
.shop-admin-max {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: 1px solid #4a3010;
  border-radius: 4px;
  background: #16110a;
  color: #c89040;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.shop-admin-max:hover {
  border-color: #c89040;
  color: #e8c040;
}

/* Narrow layouts: stack tree above the forge panel, rail becomes a strip. */
@media (max-width: 900px) {
  .shop-frame {
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #5c3310 #111;
  }

  .shop-tree-col {
    flex: 0 0 420px;
    border-bottom: 2px solid #5c3310;
  }

  .shop-forge-col {
    flex: 1 0 auto;
    overflow-y: visible;
  }
}
</style>
