<template>
  <div class="sf-panel">
    <!-- Laufende Segen des Händlers stehen über allem: sie sind das Einzige in
         dieser Spalte mit einer Uhr, die abläuft, ohne dass man etwas tut. -->
    <div v-if="activeBuffs.length > 0" class="sf-buffs">
      <div v-for="buff in activeBuffs" :key="buff.id" class="blessing-chip">
        <Icon icon="ph:sparkle-fill" width="17" height="17" class="blessing-icon" />
        <span class="blessing-name">{{ buffLabel(buff.id) }}</span>
        <span class="blessing-time">{{ formatClock(buff.expiresAt - forgeStore.forgeNow) }}</span>
      </div>
    </div>

    <!-- ══ Scrolling body ════════════════════════════════════════
         Drei Blöcke, in der Reihenfolge, in der der Spieler sie braucht: was
         gerade erreichbar ist, dann der Baum als Liste, zuletzt die Schublade
         mit Gesperrtem und Fertigem. -->
    <div class="sf-body">
      <ForgeOfferStrip />
      <ForgeUpgradesSection />
      <ForgeVaultSection />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Die Detailspalte des Shop-Tabs.
 *
 * Sie zeigte bis zum Umbau EINE von vier Abteilungen, ausgewählt an einer
 * Reiter-Schiene ganz rechts (`ForgeSectionRail`, gestrichen). Drei dieser vier
 * Abteilungen — Relikte, Konstellationen, Handel — sind zusammen ein knappes
 * Dutzend Käufe, und ob eine davon gerade etwas hergab, stand allein an einer
 * 18px-Marke an einem Reiter, den der Spieler nicht offen hatte.
 *
 * Jetzt steht alles gleichzeitig da, und diese Komponente ist nur noch der
 * Rahmen darum: die laufenden Segen oben fest, darunter ein Scrollfeld mit den
 * drei Blöcken. Was sie zeigen, steht in ihnen selbst; was sie rechnen, in
 * `useForgeOffers` und `useForgeUpgrades`.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatClock } from '@/utils/ui/format'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import ForgeOfferStrip from './ForgeOfferStrip.vue'
import ForgeUpgradesSection from './ForgeUpgradesSection.vue'
import ForgeVaultSection from './ForgeVaultSection.vue'
import type { ForgeActiveBuff } from '@/types'

const forgeStore = useStarForgeStore()

const activeBuffs = computed(() =>
  forgeStore.activeBuffs.filter((b) => b.expiresAt > forgeStore.forgeNow),
)

function buffLabel(id: ForgeActiveBuff['id']): string {
  return id === 'cpcX2' ? '2× Chimes / Click' : '2× Chimes / Sec'
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   PANEL
   Same surface the role detail page opens onto (#111008, the flat deep base)
   with the same 2px seam — a sidebar in this game reads as one kind of place,
   not one per tab.
══════════════════════════════════════════════════ */
.sf-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #111008;
  border-left: 2px solid #5c3310;
}

/* ══════════════════════════════════════════════════
   RUNNING BLESSINGS
══════════════════════════════════════════════════ */
.sf-buffs {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 11px 18px;
  border-bottom: 1px solid #2a1a08;
  background: #14100c;
}

.blessing-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  background: rgba(150, 80, 220, 0.12);
  border: 1px solid rgba(150, 80, 220, 0.4);
  border-radius: 4px;
}

.blessing-icon {
  color: #c9a0ff;
  flex-shrink: 0;
}

.blessing-name {
  font-size: 13.5px;
  font-weight: 900;
  color: #c9a0ff;
}

.blessing-time {
  font-size: 13px;
  font-weight: 700;
  color: rgba(201, 160, 255, 0.7);
  font-variant-numeric: tabular-nums;
}

/* ══════════════════════════════════════════════════
   BODY
══════════════════════════════════════════════════ */
.sf-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 18px 26px;
  display: flex;
  flex-direction: column;
  gap: 13px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.sf-body::-webkit-scrollbar {
  width: 4px;
}

.sf-body::-webkit-scrollbar-track {
  background: #111;
}

.sf-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* Die drei Blöcke dürfen nie von der Flexspalte gestaucht werden — Kinder mit
   `overflow: hidden` schrumpften sonst zu einem Streifen. */
.sf-body > * {
  flex-shrink: 0;
}

/* Stacked layout (below every desktop reference) — the tree carries the seam
   as its bottom edge there, so the panel drops its own. */
@media (max-width: 900px) {
  .sf-panel {
    border-left: none;
  }
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD is the flattest viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .sf-buffs {
    padding: 9px 15px;
  }

  .sf-body {
    padding: 9px 15px 22px;
    gap: 11px;
  }
}
</style>
