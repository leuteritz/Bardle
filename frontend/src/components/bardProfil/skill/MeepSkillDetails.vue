<script setup lang="ts">
/**
 * Die Detailschiene neben der Orbit-Bühne.
 *
 * Sie zeigte bis zum Umbau genau EINEN Knoten — den gerade angeklickten — und
 * ohne Auswahl einen Leerzustand mit drei Sprungzielen. Wer wissen wollte, was
 * überhaupt lernbar ist, musste die Bühne mit dreissig Knoten selbst absuchen.
 *
 * Jetzt ist sie ein Rahmen um drei Teile, dieselbe Dreiteilung wie die
 * Forge-Spalte im Shop:
 *   1. **Kopfband** — Bestand und Fortschritt, immer sichtbar.
 *   2. **Empfehlung** (`MeepBestBuyPanel`) — was jetzt zu holen lohnt, mit
 *      Kaufknopf, auf reservierter Fläche.
 *   3. **Liste** (`MeepSkillList`) — alles Lernbare, nach Töpfen gegliedert,
 *      frisch Aufgegangenes oben. Der einzige Scrollbereich.
 *
 * Der angeklickte Knoten ersetzt die Liste NICHT mehr; er wird darin
 * angesprungen und hervorgehoben. Was der Zeiger streift, sagt das schwebende
 * Kärtchen (`MeepSkillTooltip`, hängt in der Liste) — ausserhalb des Flusses,
 * damit es nichts verschieben kann.
 *
 * **Warum die Bilanz im Kopfband steht und nicht mehr als eigene Zone unten:**
 * mit Panel und Liste wäre sie die vierte waagerechte Zone, und auf Full HD
 * (~950px) ist Höhe das knappe Gut. Der Kopf trägt den Bestand ohnehin — die
 * beiden Fortschrittszahlen daneben kosten dort eine Zeile statt eines Blocks.
 * Verschwinden darf sie nicht: seit die Kopfleiste über der Bühne weg ist, ist
 * das die einzige Stelle, an der der Fortschritt des Baums als Zahl steht.
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import {
  MEEP_TREE_BADGE_ICON,
  MEEP_TREE_NODE_INDEX,
  MEEP_TREE_PATH_NODES,
} from '@/config/progression/meepTree'
import { MEEP_TREE_TOTAL_COST } from '@/config/constants'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import MeepBestBuyPanel from './MeepBestBuyPanel.vue'
import MeepSkillList from './MeepSkillList.vue'

defineProps<{ nodeId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()

const gameStore = useGameStore()
const meepTree = useMeepTreeStore()

const spentOnTree = computed(() =>
  meepTree.bought.reduce((sum, id) => sum + (MEEP_TREE_NODE_INDEX[id]?.node.cost ?? 0), 0),
)

/**
 * Gemessen wird gegen `MEEP_TREE_PATH_NODES` (25) und nie gegen die
 * Kataloggrösse (30) — sonst stünde ein fertiger Baum dauerhaft bei 83 %.
 */
const learnedRatio = computed(() =>
  Math.min(1, meepTree.boughtCount / MEEP_TREE_PATH_NODES),
)
</script>

<template>
  <aside class="msd-root">
    <!-- ── Kopfband ──
         Der Bestand gehört hierher: er ist die Zahl, gegen die jeder Preis in
         der Schiene gelesen wird. Die Fortschrittszeile darunter ist die
         Bilanz, die früher als eigene Zone am Fuss stand. -->
    <header class="msd-head">
      <div class="msd-head-top">
        <span class="msd-head-title">Meep Skill Tree</span>
        <span class="msd-head-held">
          <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="msd-meep-icon" />
          <span class="fc-cost-gold">{{ formatNumberCompact(gameStore.meeps) }}</span>
        </span>
      </div>

      <div class="msd-head-stats">
        <span class="msd-stat">
          <span class="msd-stat-val">{{ meepTree.boughtCount }}</span>
          <span class="msd-stat-of">/ {{ MEEP_TREE_PATH_NODES }}</span>
          <span class="msd-stat-label">learned</span>
        </span>
        <span class="msd-stat">
          <span class="msd-stat-val">{{ formatNumberCompact(spentOnTree) }}</span>
          <span class="msd-stat-of">/ {{ formatNumberCompact(MEEP_TREE_TOTAL_COST) }}</span>
          <span class="msd-stat-label">invested</span>
        </span>
      </div>

      <!-- Der Balken läuft über `transform: scaleX()`, nicht über eine Breite in
           Prozent — Muster `.fc-track` im Shop. -->
      <div class="msd-track">
        <i :style="{ transform: `scaleX(${learnedRatio})` }" />
      </div>
    </header>

    <MeepBestBuyPanel />

    <div class="msd-body">
      <MeepSkillList :selected-id="nodeId" @select="emit('select', $event)" />
    </div>
  </aside>
</template>

<style scoped>
/* ══════════════════════════════════════════════════
   SCHIENE
   Dieselbe Fläche und dieselbe Naht wie die Forge-Spalte im Shop (.sf-panel):
   eine Detail-Schiene im Bard-Profil ist EINE Art von Ort, nicht eine je
   Reiter. Die Breite kommt von aussen (`SkillTreeComponent`), damit beide
   Reiter dieselbe Zahl lesen.
══════════════════════════════════════════════════ */
.msd-root {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #111008;
  border-left: 2px solid #5c3310;
}

/* ── Kopfband ─────────────────────────────────────────────── */
.msd-head {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 18px 12px;
  background: #16120a;
  border-bottom: 2px solid #3e200a;
}

.msd-head-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.msd-head-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #c89040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msd-head-held {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.msd-meep-icon {
  height: 22px;
  width: auto;
}

/* ── Bilanz ───────────────────────────────────────────────── */
.msd-head-stats {
  display: flex;
  align-items: baseline;
  gap: 18px;
}

.msd-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
}

.msd-stat-val {
  font-size: 15px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.msd-stat-of {
  font-size: 13px;
  font-weight: 700;
  color: rgba(232, 216, 176, 0.42);
  font-variant-numeric: tabular-nums;
}

.msd-stat-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
}

.msd-track {
  height: 3px;
  border-radius: 2px;
  background: #241708;
  overflow: hidden;
}

.msd-track i {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8a020);
  transition: transform 0.25s ease;
}

/* ── Körper ───────────────────────────────────────────────── */
.msd-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 18px 22px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.msd-body::-webkit-scrollbar {
  width: 4px;
}

.msd-body::-webkit-scrollbar-track {
  background: #111;
}

.msd-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
   Die Werte sind die des Shops.
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .msd-head {
    gap: 7px;
    padding: 9px 15px 10px;
  }

  .msd-body {
    padding: 10px 15px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .msd-track i {
    transition: none;
  }
}
</style>
