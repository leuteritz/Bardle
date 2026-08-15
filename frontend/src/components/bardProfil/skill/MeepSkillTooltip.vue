<script setup lang="ts">
/**
 * Die volle Auskunft zu der Karte, auf die der Zeiger gerade zeigt.
 *
 * Zwei Eigenschaften tragen es, beide aus `ForgeRowTooltip` übernommen:
 * 1. **`position: fixed`, ausserhalb des Listenflusses.** Läge es IN der Liste,
 *    schöbe sein Erscheinen sie unter dem Zeiger weg, der Hover ginge im selben
 *    Zug wieder aus, das Kärtchen verschwände, die Liste käme zurück — ein
 *    selbsttragendes Flackern.
 * 2. **EINE Instanz für die ganze Liste**, nicht eine je Karte — es stünden
 *    sonst dreissig davon im Baum.
 *
 * Die Ausrichtung braucht die eigene Höhe NICHT: liegt die Karte in der unteren
 * Bildhälfte, hängt das Kärtchen an ihrer Unterkante nach oben, sonst an ihrer
 * Oberkante nach unten. So bleibt es im Bild, ohne dass ein zweiter Reflow es
 * erst ausmessen müsste.
 *
 * Was hier steht, steht NICHT auf der Karte: alle Vorher/Nachher-Zeilen, die
 * berührten Systeme, der Gabelsatz und der noch fehlende Weg. Die Karte trägt,
 * was man beim Überfliegen braucht.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useMeepSkills } from '@/composables/ui/useMeepSkills'
import { MEEP_TREE_BADGE_ICON, MEEP_TREE_TIERS_PER_BRANCH } from '@/config/progression/meepTree'
import {
  MEEP_SKILL_FORK_ICON,
  MEEP_SKILL_TIP_GAP_PX,
  MEEP_SKILL_TIP_WIDTH_PX,
} from '@/config/constants'
import type { MeepSkillEntry, MeepSkillTipAnchor } from '@/types'

/** Die Kanten kommen fertig vom Aufrufer — gemessen wird nie hier. */
const props = defineProps<{
  entry: MeepSkillEntry | null
  anchor: MeepSkillTipAnchor | null
}>()

const { detailFor } = useMeepSkills()

const cardStyle = computed(() => {
  const a = props.anchor
  if (!a) return {}
  const above = a.top > window.innerHeight / 2
  return {
    left: `${a.left - MEEP_SKILL_TIP_WIDTH_PX - MEEP_SKILL_TIP_GAP_PX}px`,
    top: `${above ? a.bottom : a.top}px`,
    transform: above ? 'translateY(-100%)' : 'none',
  }
})

/* Nur für den EINEN gezeigten Knoten gerechnet — deshalb steht die Rechnung
   nicht im Listeneintrag (siehe `MeepSkillDetail`). */
const detail = computed(() => (props.entry ? detailFor(props.entry.id) : null))

const tipWidth = `${MEEP_SKILL_TIP_WIDTH_PX}px`
</script>

<template>
  <div v-if="entry && anchor" class="mst-card" :style="cardStyle">
    <div class="mst-head" :style="{ '--node-c': entry.color }">
      <Icon :icon="entry.icon" width="22" height="22" :style="{ color: entry.color }" />
      <span class="mst-name" :style="{ color: entry.color }">{{ entry.name }}</span>
    </div>

    <span class="mst-meta">
      {{ entry.branchName }} · Rank {{ entry.rank }} of {{ MEEP_TREE_TIERS_PER_BRANCH }}
    </span>

    <p class="mst-desc">{{ entry.desc }}</p>

    <!-- ── Was sich ändert ── -->
    <div v-if="detail && detail.changes.length > 0" class="mst-changes">
      <div v-for="c in detail.changes" :key="c.key" class="mst-change">
        <span class="mst-change-label">{{ c.label }}</span>
        <span class="mst-change-from">{{ c.from }}</span>
        <span class="mst-change-arrow">→</span>
        <span class="mst-change-to" :class="{ 'mst-change-to--bad': !c.good }">{{ c.to }}</span>
      </div>
    </div>

    <div v-if="detail && detail.tags.length > 0" class="mst-tags">
      <span
        v-for="t in detail.tags"
        :key="t.label"
        class="mst-tag"
        :style="{ '--chip-c': entry.color }"
      >
        <Icon :icon="t.icon" width="12" height="12" />
        {{ t.label }}
      </span>
    </div>

    <!-- ── Die Gabel ── -->
    <div
      v-if="entry.rivals.length > 0"
      class="mst-fork"
      :class="{ 'mst-fork--sealed': entry.state === 'blocked' }"
    >
      <Icon :icon="MEEP_SKILL_FORK_ICON" width="15" height="15" class="mst-fork-ico" />
      <span v-if="entry.state === 'blocked'">
        Sealed — you took
        <strong>{{ entry.rivals.map((r) => r.name).join(', ') }}</strong> at this rank.
      </span>
      <span v-else>
        Learning this seals
        <strong>{{ entry.rivals.map((r) => r.name).join(', ') }}</strong> for good. Rank
        {{ MEEP_TREE_TIERS_PER_BRANCH }} opens either way.
      </span>
    </div>

    <!-- ── Der Weg dorthin ── -->
    <div v-if="entry.prerequisites.length > 0" class="mst-path">
      <span class="mst-path-label">Still needed first</span>
      <span v-for="p in entry.prerequisites" :key="p.id" class="mst-path-row">
        <Icon :icon="p.icon" width="15" height="15" :style="{ color: entry.color }" />
        <span class="mst-path-name">{{ p.name }}</span>
        <span class="mst-path-cost">{{ p.cost }}</span>
      </span>
      <span v-if="entry.pathCost !== null" class="mst-path-total">
        <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="mst-path-img" />
        {{ entry.pathCost }} to reach it
      </span>
    </div>

    <!-- ── Preis ── -->
    <span
      v-if="entry.state !== 'bought' && entry.state !== 'blocked'"
      class="mst-cost"
      :class="{ 'mst-cost--cant': !entry.canAfford }"
    >
      <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="mst-cost-img" />
      {{ entry.cost }} meeps
      <template v-if="!entry.canAfford">· {{ entry.missing }} short</template>
    </span>
    <span v-else-if="entry.state === 'bought'" class="mst-done">✓ LEARNED</span>
  </div>
</template>

<style scoped>
/* Tooltip-Standard des Projekts. `pointer-events: none` ist nicht Kosmetik:
   ohne es klaute das Kärtchen den Hover der Karte, die es beschreibt. */
.mst-card {
  position: fixed;
  z-index: 60;
  width: v-bind(tipWidth);
  padding: 11px 13px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}

.mst-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mst-name {
  min-width: 0;
  font-size: 15.5px;
  font-weight: 900;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mst-meta {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  line-height: 1;
}

.mst-desc {
  font-size: 13px;
  line-height: 1.45;
  color: rgba(232, 220, 192, 0.78);
}

/* ── Vorher → Nachher ──
   EIN Kasten, nicht eine Kachel je Zeile: bei drei Effekten lesen sich drei
   gleich aussehende Kästen untereinander als ein einziger. */
.mst-changes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 11px;
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}

.mst-change {
  display: flex;
  align-items: center;
  gap: 7px;
}

.mst-change-label {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mst-change-from {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 900;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}

.mst-change-arrow {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(200, 144, 64, 0.6);
}

.mst-change-to {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 12.5px;
  font-weight: 900;
  color: #7ad0a0;
  background: rgba(122, 208, 160, 0.12);
  border: 1px solid rgba(122, 208, 160, 0.35);
  font-variant-numeric: tabular-nums;
}

/* Wo es SCHLECHTER wird, trägt dieselbe Marke die Warnfarbe — die Form bleibt,
   damit das Auge die Zielspalte nicht neu suchen muss. */
.mst-change-to--bad {
  color: #cc6050;
  background: rgba(204, 96, 80, 0.12);
  border-color: rgba(204, 96, 80, 0.35);
}

.mst-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.mst-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 3px;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chip-c, #c89040);
  background: color-mix(in srgb, var(--chip-c, #c89040) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-c, #c89040) 40%, transparent);
}

/* ── Die Gabel ──
   Dasselbe Lila wie der `CHOICE`-Chip auf der Karte und die Buff-Chips im Shop. */
.mst-fork {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid #5a3a7a;
  background: #1c1226;
  color: #c9a8e8;
  font-size: 12px;
  line-height: 1.4;
}

.mst-fork-ico {
  flex-shrink: 0;
  margin-top: 1px;
}

.mst-fork strong {
  color: #e0c8f8;
  font-weight: 900;
}

.mst-fork--sealed {
  border-color: #4a3a2a;
  background: #1a1610;
  color: rgba(232, 220, 192, 0.55);
}

.mst-fork--sealed strong {
  color: rgba(232, 220, 192, 0.8);
}

/* ── Der Weg dorthin ── */
.mst-path {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  background: #141410;
  border: 1px solid #32210c;
  border-left: 3px solid #c89040;
  border-radius: 4px;
}

.mst-path-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a52;
  line-height: 1;
}

.mst-path-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mst-path-name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 800;
  color: rgba(232, 220, 192, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mst-path-cost {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 900;
  color: rgba(232, 192, 64, 0.75);
  font-variant-numeric: tabular-nums;
}

.mst-path-total {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 1px;
  font-size: 12px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.mst-path-img {
  height: 15px;
  width: auto;
}

/* ── Preis ── */
.mst-cost {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.3);
  color: #a0ffa0;
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.mst-cost-img {
  height: 16px;
  width: auto;
}

.mst-cost--cant {
  color: #cc6050;
  background: rgba(180, 40, 40, 0.12);
  border-color: rgba(140, 40, 40, 0.3);
}

.mst-done {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #6ecc44;
  text-align: center;
}
</style>
