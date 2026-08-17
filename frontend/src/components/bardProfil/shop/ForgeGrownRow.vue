<template>
  <div
    class="fgr-row"
    :class="{
      'fc-spot': spotlightId === entry.id,
      'fc-dimmed': spotlightId !== null && spotlightId !== entry.id,
    }"
    :style="{ '--node-c': entry.color }"
    :data-forge-id="entry.id"
    @mouseenter="setListHover(entry.id)"
  >
    <Icon
      :icon="entry.icon"
      :width="FORGE_GROWN_ICON_SIZE"
      :height="FORGE_GROWN_ICON_SIZE"
      class="fgr-ico"
      :style="{ color: entry.color }"
    />

    <div class="fgr-text">
      <span class="fgr-name" :style="{ color: entry.color }">{{ entry.name }}</span>
      <span class="fgr-effect">{{ entry.desc }}</span>
    </div>

    <!-- Die erreichte Stufe steht auch hier, nur klein: im Archiv ist sie kein
         Fortschritt mehr, sondern das Ergebnis. Dieselbe Quelle wie die grosse
         Zahl der Upgrade-Zeile. -->
    <span class="fgr-lvl">{{ levelParts.big }}</span>
    <span class="fgr-badge">{{ FORGE_GROWN_BADGE }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Ein ausgewachsener Eintrag — die Zeile im zugeklappten Archiv.
 *
 * Sie bleibt die KOMPAKTESTE Form der Spalte — halb so hoch wie die
 * Upgrade-Zeile daneben: hier ist nichts mehr zu entscheiden, es gibt keinen
 * Preis und keinen Knopf, und bei Vollausbau stellt genau dieser Topf den
 * Löwenanteil der Liste. Fünfundvierzig volle Karten untereinander sind hier
 * schon einmal gebaut und wieder zurückgenommen worden (Herleitung in
 * `ForgeUpgradesSection.vue`) — das Archiv ist der Ort, an dem diese Rechnung
 * wirklich aufgeht.
 *
 * Ihre Formensprache ist trotzdem dieselbe: nacktes Icon in der Knotenfarbe,
 * kein gerahmter Sockel, und die erreichte Stufe aus derselben Quelle wie die
 * grosse Zahl der Upgrade-Zeile (`forgeLevelParts`).
 *
 * Was sie zeigt, ist nur, WAS erreicht ist und WAS es tut. Rang, Elternknoten
 * und der volle Wortlaut stehen im schwebenden Kärtchen (`ForgeRowTooltip`), an
 * dem die Zeile über `data-forge-id` und ihren `mouseenter` weiterhin
 * teilnimmt — ein Knoten im Baum leuchtet auch dann mit, wenn seine Zeile im
 * Archiv liegt.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { forgeLevelParts } from '@/composables/ui/useForgeUpgrades'
import type { ForgeUpgradeEntry } from '@/types'
import { FORGE_GROWN_BADGE, FORGE_GROWN_ICON_SIZE } from '@/config/constants'

const props = defineProps<{ entry: ForgeUpgradeEntry }>()

const { spotlightId, setListHover } = useForgeSpotlight()

const levelParts = computed(() => forgeLevelParts(props.entry.level, props.entry.maxLevel))
</script>

<style scoped>
/* Dieselbe Fläche und derselbe Rand wie die Kompaktzeilen der übrigen
   Forge-Abschnitte (`.fc-row` in rpg-theme.css). */
.fgr-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  background: #17170f;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    opacity 0.12s ease;
}

.fgr-row:hover {
  border-color: #7a4e20;
}

/* Die globalen `.fc-row.fc-spot`-Regeln verlangen ihre Trägerklasse mit — diese
   Zeile heisst `.fgr-row` und träfe sie nicht. Muster `ForgeUpgradeTile`. */
.fgr-row.fc-spot {
  background: #241a10;
  border-color: var(--node-c, #e8c040);
}

.fgr-row.fc-dimmed {
  opacity: 0.42;
}

.fgr-ico {
  flex-shrink: 0;
}

.fgr-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fgr-name {
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fgr-effect {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.15;
  color: rgba(232, 220, 192, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fgr-lvl {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  color: rgba(232, 220, 192, 0.7);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.fgr-badge {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(232, 192, 64, 0.12);
  border: 1px solid #5c3310;
  color: #e8c040;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

@media (max-height: 1100px) {
  .fgr-row {
    gap: 9px;
    padding: 8px 11px;
  }
}
</style>
