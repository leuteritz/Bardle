<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { AUGMENT_RARITY_COLOR, AUTO_PICK_ICON } from '@/config/constants'
import { AUGMENTS } from '@/config/economy/augments'
import { augmentIcon } from '@/utils/game/rolledIcons'
import StatsColumnHeader from './StatsColumnHeader.vue'
import type { AugmentDefinition } from '@/types'

/**
 * Buffs & Augments — untere Hälfte der rechten Deckspalte.
 *
 * Stand vorher als Streifen unter der Sonne in `SolarEvolutionColumn`. Dort ist
 * jetzt das Chronicle; die Sammlung sitzt unter dem Galaxy-Archiv, weil beide
 * dasselbe tun: eine wachsende Liste zeigen, die auf halber Spaltenhöhe scrollt.
 *
 * Die Spaltenbreite ist jetzt FEST (die rechte Deckspalte, per Ziehgriff
 * verstellbar) statt mit der Viewportbreite mitzuwachsen. Deshalb braucht das
 * Raster hier keine Breiten-Media-Query mehr — `auto-fill` an einer bekannten
 * Breite genügt.
 */
const gameStore = useGameStore()
const synergyStore = useSynergyStore()
const augmentStore = useAugmentStore()

const { activeModifier, abilityCPSMultiplier, abilityCPCMultiplier, abilityPowerBonus } =
  storeToRefs(gameStore)
const { cpsSynergyMultiplier, powerSynergyMultiplier, dpsSynergyMultiplier } =
  storeToRefs(synergyStore)
const { temporaryCPSMultiplier } = storeToRefs(augmentStore)

const dpsPct = computed(() => Math.round((dpsSynergyMultiplier.value - 1) * 100))

/* ── Augment shelf ───────────────────────────────────────────── */
interface AugCard {
  aug: AugmentDefinition
  /** Das für diesen Platz gezogene Glyph — siehe `augmentIcon`. */
  icon: string
  key: string
  color: string
}

const augCards = computed<AugCard[]>(() =>
  gameStore.activeAugments.flatMap((id, idx) => {
    const aug = AUGMENTS.find((a) => a.id === id)
    if (!aug) return []
    // Der Platz in der Liste ist der Seed des Glyphs — dasselbe Augment ein
    // zweites Mal gezogen sieht anders aus, und zwar dauerhaft dasselbe „anders".
    return [
      { aug, icon: augmentIcon(id, idx), key: `${id}-${idx}`, color: AUGMENT_RARITY_COLOR[aug.rarity] },
    ]
  }),
)

/* ── Aggregate buff chips (augments + abilities + synergies) ─── */
const buffCPSPct = computed(() => {
  const mod = activeModifier.value
  const total =
    (mod.cpsMultiplier ?? 1) -
    1 +
    (abilityCPSMultiplier.value - 1) +
    (cpsSynergyMultiplier.value - 1) +
    (temporaryCPSMultiplier.value - 1)
  return Math.round(total * 100)
})

const buffCPCPct = computed(() => {
  const mod = activeModifier.value
  const total = (mod.cpcMultiplier ?? 1) - 1 + (abilityCPCMultiplier.value - 1)
  return Math.round(total * 100)
})

const buffPowerSynergyPct = computed(() => Math.round((powerSynergyMultiplier.value - 1) * 100))
const buffPowerFlat = computed(() => abilityPowerBonus.value)
const buffMeepPct = computed(() =>
  Math.round(((activeModifier.value.meepPowerMultiplier ?? 1) - 1) * 100),
)
const buffCDRPct = computed(() => {
  const mul = activeModifier.value.cooldownMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})
const buffExpPct = computed(() =>
  Math.round(((activeModifier.value.expeditionRewardMultiplier ?? 1) - 1) * 100),
)
const buffCostPct = computed(() => {
  const mul = activeModifier.value.buildingCostMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})
const buffEnemyPct = computed(() => {
  const mul = activeModifier.value.enemySpeedMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})

interface BuffChip {
  key: string
  icon: string
  label: string
  value: string
  positive: boolean
}

const totalChips = computed<BuffChip[]>(() => {
  const chips: BuffChip[] = []
  if (buffCPSPct.value > 0)
    chips.push({
      key: 'cps',
      icon: 'game-icons:sparkles',
      label: 'Production',
      value: `+${buffCPSPct.value}%`,
      positive: true,
    })
  if (buffCPCPct.value > 0)
    chips.push({
      key: 'cpc',
      icon: 'game-icons:hand',
      label: 'Click',
      value: `+${buffCPCPct.value}%`,
      positive: true,
    })
  if (buffPowerSynergyPct.value > 0 || buffPowerFlat.value > 0) {
    const parts: string[] = []
    if (buffPowerSynergyPct.value > 0) parts.push(`+${buffPowerSynergyPct.value}%`)
    if (buffPowerFlat.value > 0) parts.push(`+${buffPowerFlat.value}`)
    chips.push({
      key: 'power',
      icon: 'game-icons:mighty-force',
      label: 'Power',
      value: parts.join(' & '),
      positive: true,
    })
  }
  if (buffMeepPct.value > 0)
    chips.push({
      key: 'meep',
      icon: 'game-icons:meeple-king',
      label: 'Meep Power',
      value: `+${buffMeepPct.value}%`,
      positive: true,
    })
  if (dpsPct.value > 0)
    chips.push({
      key: 'dps',
      // Die Kacheln zeichnen auf 19 px: `sword-clash` verklumpte dort zu einem
      // Strichbündel. Gekreuzte Klingen gefüllt — dasselbe Zeichen, das der
      // Battle-Tab und die Kampfphase tragen.
      icon: 'ri:sword-fill',
      label: 'Combat DPS',
      value: `+${dpsPct.value}%`,
      positive: true,
    })
  if (buffCDRPct.value > 0)
    chips.push({
      key: 'cdr',
      icon: 'game-icons:sands-of-time',
      label: 'Cooldowns',
      value: `-${buffCDRPct.value}%`,
      positive: false,
    })
  if (buffExpPct.value > 0)
    chips.push({
      key: 'exp',
      // Ebenso `treasure-map` — auf 19 px ein Fleck. Der Kompass trägt dort und
      // hebt sich als Kreis von der rechteckigen Mauer-Kachel daneben ab.
      icon: 'ph:compass-fill',
      label: 'Expeditions',
      value: `+${buffExpPct.value}%`,
      positive: true,
    })
  if (buffCostPct.value > 0)
    chips.push({
      key: 'cost',
      icon: 'game-icons:stone-wall',
      label: 'Build Cost',
      value: `-${buffCostPct.value}%`,
      positive: false,
    })
  if (buffEnemyPct.value > 0)
    chips.push({
      key: 'enemy',
      icon: 'game-icons:turtle',
      label: 'Enemy Speed',
      value: `-${buffEnemyPct.value}%`,
      positive: false,
    })
  return chips
})

/* Die Kontextsuche des Panels filtert Chips und Karten gemeinsam */
const augmentSearch = ref('')

const filteredChips = computed(() => {
  const q = augmentSearch.value.trim().toLowerCase()
  if (!q) return totalChips.value
  return totalChips.value.filter((c) => c.label.toLowerCase().includes(q) || c.key.includes(q))
})

const filteredAugCards = computed(() => {
  const q = augmentSearch.value.trim().toLowerCase()
  if (!q) return augCards.value
  return augCards.value.filter(
    (c) =>
      c.aug.name.toLowerCase().includes(q) ||
      c.aug.effectLine.toLowerCase().includes(q) ||
      c.aug.rarity.toLowerCase().includes(q),
  )
})
</script>

<template>
  <section class="sf-panel sf-col">
    <StatsColumnHeader
      v-model="augmentSearch"
      title="Buffs & Augments"
      placeholder="Search augments…"
    />

    <div class="sf-p-body sf-aug-scroll rpg-scrollbar">
      <!-- Not-Aus für den Auto-Pick. Solange er läuft, öffnet sich das
           Auswahl-Modal nicht mehr — dieser Streifen ist damit der einzige
           dauerhaft erreichbare Weg zurück und steht deshalb ganz oben. -->
      <button
        v-if="gameStore.autoPickAugments"
        class="sf-auto-row"
        title="Augments are being picked at random on every level-up — click to choose yourself again"
        @click="gameStore.setAutoPickAugments(false)"
      >
        <Icon :icon="AUTO_PICK_ICON" width="17" height="17" class="sf-auto-icon" />
        <span class="sf-auto-lbl">Auto-Pick</span>
        <span class="sf-auto-state">On</span>
        <span class="sf-auto-stop">Stop</span>
      </button>

      <!-- Was das Deck als Ganzes bringt — die Zahl, die den Spieler wirklich
           interessiert, steht deshalb ganz oben und am größten. -->
      <div class="sf-sub-rule">
        <span class="sf-sub-lbl">Total Bonus</span>
        <span class="sf-sub-line"></span>
      </div>
      <div class="sf-tiles">
        <div v-if="filteredChips.length === 0" class="sf-empty-line">
          {{ totalChips.length === 0 ? 'No buffs active yet' : 'No buffs match' }}
        </div>
        <div v-for="chip in filteredChips" :key="chip.key" class="sf-tile">
          <div class="sf-tile__row">
            <Icon :icon="chip.icon" width="19" height="19" class="sf-tile__icon" />
            <span class="sf-tile__val" :class="chip.positive ? 'is-up' : 'is-down'">
              {{ chip.value }}
            </span>
          </div>
          <span class="sf-tile__lbl">{{ chip.label }}</span>
        </div>
      </div>

      <div class="sf-sub-rule">
        <span class="sf-sub-lbl">Active Augments</span>
        <span class="sf-sub-line"></span>
        <span class="sf-sub-count">{{ filteredAugCards.length }}</span>
      </div>
      <div v-if="filteredAugCards.length === 0" class="sf-empty-block">
        <Icon icon="game-icons:gems" width="26" height="26" class="sf-empty-icon" />
        <span>
          {{
            augCards.length === 0
              ? 'No augments active yet — level up to pick your first one'
              : 'No augments match your search'
          }}
        </span>
      </div>
      <div v-else class="sf-aug-grid">
        <div
          v-for="card in filteredAugCards"
          :key="card.key"
          class="sf-aug-card"
          :style="{ '--rarity': card.color }"
          :title="`${card.aug.name} — ${card.aug.effectLine}`"
        >
          <div class="sf-aug-icon">
            <Icon :icon="card.icon" width="26" height="26" class="sf-aug-glyph" />
          </div>
          <div class="sf-aug-body">
            <span class="sf-aug-name">{{ card.aug.name }}</span>
            <span class="sf-aug-effect">{{ card.aug.effectLine }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ═══ Buffs & Augments — untere Hälfte der rechten Deckspalte ═══
   Frameless wie jedes Deck-Panel: der geteilte kosmische Hintergrund scheint
   durch, getrennt wird allein durch die Haarlinie, die der Stack setzt. */
.sf-panel {
  position: relative;
  z-index: 1;
  background: transparent;
}

.sf-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.sf-p-body {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
}

.sf-aug-scroll {
  overflow-y: auto;
  /* Der Rahmen steht fest und schneidet bei voller Sammlung mitten durch eine
     Kartenreihe. Die letzten Pixel laufen deshalb weich aus — das liest sich als
     „hier geht es weiter" statt als abgeschnittenes Layout. Reicht der Inhalt
     nicht bis zum Rand, liegt dort ohnehin nichts, und die Maske bleibt
     unsichtbar. */
  mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent 100%);
}

/* ─ Auto-Pick-Streifen: der dauerhafte Aus-Knopf ─
   Grün wie alles Aktive im Spiel, damit auf einen Blick klar ist, dass hier
   etwas LÄUFT — und die rote Stop-Plakette rechts sagt, was ein Klick tut. */
.sf-auto-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
  padding: 7px 10px;
  background: #161a12;
  border: 1px solid #3a5a28;
  border-left: 3px solid #52b830;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}

.sf-auto-row:hover {
  background: #1c2216;
  border-color: #6ec040;
}

.sf-auto-icon {
  flex-shrink: 0;
  color: #52b830;
}

.sf-auto-lbl {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8fd070;
}

.sf-auto-state {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #52b830;
}

.sf-auto-stop {
  margin-left: auto;
  padding: 3px 10px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #cc6050;
  background: #2a0e0c;
  border: 1px solid #8a3020;
  border-radius: 3px;
}

.sf-auto-row:hover .sf-auto-stop {
  color: #ff9080;
  background: #3e1210;
  border-color: #cc4830;
}

/* Zwei Mikro-Rubriken teilen das Deck in „Summe" und „Einzelteile" — ohne sie
   lasen sich Chips und Karten wie zwei gleichrangige Pillen-Reihen. */
.sf-sub-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 0 8px;
}
.sf-sub-rule:not(:first-child) {
  margin-top: 14px;
}

.sf-sub-lbl {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7a52;
}

.sf-sub-line {
  flex: 1;
  height: 1px;
  background: #241a0c;
}

.sf-sub-count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  color: #8a7a52;
  font-variant-numeric: tabular-nums;
}

/* ─ Total Bonus: ein Tile je Wirkung, Zahl vor Beschriftung ─ */
.sf-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
  gap: 6px;
}

.sf-empty-line {
  grid-column: 1 / -1;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rpg-text-dim);
}

.sf-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 7px 10px 6px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
}

.sf-tile__row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.sf-tile__icon {
  flex-shrink: 0;
  color: #c89040;
}

.sf-tile__val {
  font-size: 19px;
  font-weight: 900;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sf-tile__val.is-up {
  color: var(--rpg-gold);
}
/* Weniger ist hier besser (Cooldowns, Baukosten) → grün statt gold */
.sf-tile__val.is-down {
  color: #52b830;
}

.sf-tile__lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Waagerechte Augment-Karten in einem fließenden Raster.
   Die 210px sind an der Panelbreite gemessen: 440px minus Polster ergibt 416,
   und zwei Spalten bräuchten 427 — also EINE über die ganze Breite. Das ist
   Absicht: zweispaltig ließ 205px je Karte, davon 142 für Text, und damit lief
   jede längere Wirkung in die Ellipse ("Every 10th Click Cou…"). Einspaltig
   stehen 365px zur Verfügung und der längste Eintrag passt.
   Zieht der Spieler die Spalte breiter, entstehen von selbst zwei. */
.sf-aug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 7px;
}

.sf-aug-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 7px 10px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--rarity);
  border-radius: 5px;
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--rarity) 8%, transparent);
  transition:
    box-shadow 0.15s,
    background 0.15s;
}
.sf-aug-card:hover {
  background: #221f18;
  box-shadow:
    inset 0 0 10px color-mix(in srgb, var(--rarity) 15%, transparent),
    0 0 8px color-mix(in srgb, var(--rarity) 30%, transparent);
}

/* Runder Sockel in der Seltenheitsfarbe — dieselbe Bildsprache wie die Karten
   in der Augment-Wahl, damit ein Augment dort und hier gleich aussieht. */
.sf-aug-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--rarity) 55%, #14120c);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--rarity) 18%, #14120c),
    #100e08 74%
  );
  color: var(--rarity);
}

.sf-aug-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sf-aug-name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--rarity);
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-aug-effect {
  font-size: 14px;
  font-weight: 900;
  color: var(--rpg-gold);
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Auf halber Spaltenhöhe ist kein Platz für einen hohen, zentrierten
   Leerzustand — die Meldung steht deshalb einzeilig neben ihrem Icon. */
.sf-empty-block {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.35;
  color: var(--rpg-text-dim);
}
.sf-empty-icon {
  color: #5c4a30;
  flex-shrink: 0;
}

/* Full HD / WUXGA: die flachsten Viewports. Gespart wird an Luft, nie an
   Schriftgrößen — das Panel hat hier rund 270px Innenhöhe. */
@media (max-height: 1100px) {
  .sf-tile {
    padding: 5px 9px 5px;
  }
  .sf-aug-card {
    padding: 5px 9px;
    gap: 9px;
  }
  .sf-aug-icon {
    width: 34px;
    height: 34px;
  }
  .sf-aug-glyph {
    width: 22px;
    height: 22px;
  }
  .sf-sub-rule:not(:first-child) {
    margin-top: 10px;
  }
}

/* 4K und höher: auf der großen Fläche schrumpfen 19px-Zahlen und 12px-Namen
   optisch zu Fußnoten — sie wachsen deshalb mit. */
@media (min-height: 1600px) {
  .sf-sub-lbl {
    font-size: 12px;
  }
  .sf-tile__val {
    font-size: 23px;
  }
  .sf-tile__lbl {
    font-size: 11.5px;
  }
  .sf-aug-icon {
    width: 48px;
    height: 48px;
  }
  .sf-aug-glyph {
    width: 31px;
    height: 31px;
  }
  .sf-tile__icon {
    width: 23px;
    height: 23px;
  }
  .sf-aug-name {
    font-size: 13.5px;
  }
  .sf-aug-effect {
    font-size: 16px;
  }
}
</style>
