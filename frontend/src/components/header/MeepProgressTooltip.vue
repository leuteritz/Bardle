<script setup lang="ts">
/**
 * Hover-Dashboard der Meep-Kachel im Header.
 *
 * Die Kachel kann nur „48" sagen. Meeps sind aber zwei Dinge zugleich: eine
 * WÄHRUNG, die im Skill Tree ausgegeben wird, und eine dauernde KRAFT, weil
 * jeder gehaltene Meep in die Battle Power einzahlt. Das Panel zeigt beide
 * Seiten — oben, was gerade hereinkommt, in der Mitte, was der Baum daraus
 * gemacht hat, unten die Bilanz.
 *
 * Ohne eigenen Timer: der Fortschritt zum nächsten Meep hängt an
 * `gameStore.pendingMeeps`, das mit jedem Chime des laufenden Durchlaufs
 * weiterwächst — Meeps fallen nicht mehr einzeln, sie sind der Lohn des
 * Aufbruchs.
 * Und da das Panel nur im geöffneten Zustand existiert (v-if hinter dem
 * Teleport in RpgBadgeTooltip), kostet der Header im Ruhezustand nichts.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_TREE_BRANCHES, type MeepTreeEffects } from '@/config/progression/meepTree'
import { formatNumber, formatNumberCompact } from '@/config/ui/numberFormat'
import { formatCompactDuration } from '@/utils/ui/format'
import { clampPercent } from '@/utils/orbit/geometry'
import {
  MS_PER_SECOND,
  MEEP_POWER_MULTIPLIER,
  MEEP_TREE_EFFECT_ROWS,
  MEEP_TOOLTIP_ICONS,
  UNIVERSE_TOOLTIP_IMAGES,
  UNIVERSE_TOOLTIP_MEEP_SCALE,
} from '@/config/constants'

const gameStore = useGameStore()
const meepTreeStore = useMeepTreeStore()

/* ── Der nächste Meep ────────────────────────────────────────────────────── */

const meepPercent = computed(() => clampPercent(gameStore.pendingMeepFill * 100))

const meepRemaining = computed(() => gameStore.chimesToNextMeep)

/** Sekundenertrag, mit dem die Schätzung rechnet — inkl. laufendem MVP-Buff. */
const chimeRate = computed(() => gameStore.chimesPerSecond * gameStore.mvpBuffMultiplier)

/**
 * Bewusst nur die passive Produktion: Klicks zahlen ebenfalls auf den Meep
 * ein, lassen sich aber nicht vorhersagen. Die Schätzung ist damit die
 * Obergrenze, nicht der Erwartungswert — dieselbe Rechnung wie im
 * Universums-Panel.
 */
const etaSeconds = computed(() =>
  chimeRate.value > 0 ? meepRemaining.value / chimeRate.value : Number.POSITIVE_INFINITY,
)

const etaText = computed(() =>
  Number.isFinite(etaSeconds.value)
    ? formatCompactDuration(etaSeconds.value * MS_PER_SECOND)
    : '—',
)

/* ── Skill Tree ──────────────────────────────────────────────────────────── */

const treeTotal = MEEP_TREE_BRANCHES.reduce((sum, b) => sum + b.nodes.length, 0)

const treePercent = computed(() =>
  clampPercent((meepTreeStore.boughtCount / Math.max(1, treeTotal)) * 100),
)

/**
 * Eine Zeile je Zweig: wie weit er steht, und was als Nächstes an ihm hängt.
 * Der nächste Knoten ist immer der erste ungekaufte — die Zweige sind lineare
 * Ketten, seine Voraussetzung ist damit erfüllt und `locked` bedeutet hier
 * ausschließlich „zu teuer".
 */
const branchRows = computed(() =>
  MEEP_TREE_BRANCHES.map((branch) => {
    const bought = branch.nodes.filter((n) => meepTreeStore.isBought(n.id)).length
    const next = branch.nodes.find((n) => !meepTreeStore.isBought(n.id)) ?? null
    return {
      id: branch.id,
      name: branch.name,
      tagline: branch.tagline,
      color: branch.color,
      bought,
      total: branch.nodes.length,
      percent: (bought / branch.nodes.length) * 100,
      next,
      affordable: next ? gameStore.meeps >= next.cost : false,
    }
  }),
)

/* ── Was der Baum bewirkt ────────────────────────────────────────────────── */

/** Neutral bleibt ungezeigt — das Panel listet nur, was tatsächlich wirkt. */
const activeEffects = computed(() => {
  const fx = meepTreeStore.fx as unknown as Record<string, number>
  const out: Array<{ key: string; label: string; value: string; good: boolean }> = []
  for (const row of MEEP_TREE_EFFECT_ROWS) {
    const raw = fx[row.key]
    if (raw === undefined) continue
    switch (row.kind) {
      case 'mult':
        if (raw === 1) continue
        out.push({ key: row.key, label: row.label, value: `×${trim(raw)}`, good: raw > 1 })
        break
      case 'lower':
        if (raw === 1) continue
        out.push({
          key: row.key,
          label: row.label,
          value: `−${Math.round((1 - raw) * 100)}%`,
          good: raw < 1,
        })
        break
      case 'pct':
        if (raw === 0) continue
        out.push({ key: row.key, label: row.label, value: `+${trim(raw * 100)}%`, good: true })
        break
      case 'flat':
        if (raw === 0) continue
        out.push({
          key: row.key,
          label: row.label,
          value: `+${formatNumberCompact(raw)}`,
          good: true,
        })
        break
      case 'rate':
        if (raw === 0) continue
        out.push({ key: row.key, label: row.label, value: `+${trim(raw)}/s`, good: true })
        break
      case 'hours':
        if (raw === 0) continue
        out.push({ key: row.key, label: row.label, value: `+${trim(raw)}h`, good: true })
        break
    }
  }
  return out
})

/** `2` statt `2.00`, `1.25` statt `1.2500` — zwei Stellen, ohne Nullschwanz. */
function trim(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/* ── Bilanz ──────────────────────────────────────────────────────────────── */

/** Battle Power, die ein einzelner gehaltener Meep im Moment beisteuert. */
const powerPerMeep = computed(
  () => MEEP_POWER_MULTIPLIER * (meepTreeStore.fx as MeepTreeEffects).meepPowerMult,
)

interface StatRow {
  key: string
  icon?: string
  image?: string
  imageScale?: number
  label: string
  value: string
  /** Ungekürzter Wert für das native title-Attribut, wo einer existiert. */
  full?: string
  /** Färbt den Wert in der Verlustfarbe — bislang nur der Void-Frass. */
  loss?: boolean
}

const count = (value: number) => ({
  value: formatNumberCompact(value),
  full: formatNumber(value),
})

const lifetimeRows = computed<StatRow[]>(() => [
  {
    key: 'earned',
    image: UNIVERSE_TOOLTIP_IMAGES.meeps,
    imageScale: UNIVERSE_TOOLTIP_MEEP_SCALE,
    label: 'Meeps guided',
    ...count(gameStore.totalMeepsEarned),
  },
  {
    key: 'spent',
    icon: MEEP_TOOLTIP_ICONS.spent,
    label: 'Meeps spent',
    ...count(gameStore.totalMeepsSpent),
  },
  // Der Frass DIESES Laufs steht direkt über der Ausbeute, denn er ist bereits
  // von ihr abgezogen — sonst suchte der Spieler die Differenz.
  ...(gameStore.meepsDevoured > 0
    ? [
        {
          key: 'devoured-run',
          icon: MEEP_TOOLTIP_ICONS.devoured,
          label: 'Devoured this run',
          loss: true,
          ...count(gameStore.meepsDevoured),
        },
      ]
    : []),
  {
    key: 'cost',
    icon: MEEP_TOOLTIP_ICONS.costPerMeep,
    label: 'Meeps on departure',
    ...count(gameStore.pendingMeeps),
  },
  {
    key: 'devoured-total',
    icon: MEEP_TOOLTIP_ICONS.devoured,
    label: 'Devoured by the Void',
    loss: true,
    ...count(gameStore.totalMeepsDevoured),
  },
  {
    key: 'eta',
    icon: MEEP_TOOLTIP_ICONS.eta,
    label: 'Next meep in',
    value: etaText.value,
  },
])
</script>

<template>
  <div class="mpt">
    <div class="mpt-goldline" aria-hidden="true"></div>

    <!-- ════════ Kopf: die Meeps selbst, und wie viele bereitstehen ════════ -->
    <header class="mpt-head">
      <img
        :src="UNIVERSE_TOOLTIP_IMAGES.meeps"
        class="mpt-head-img"
        alt=""
        aria-hidden="true"
      />
      <div class="mpt-head-text">
        <div class="mpt-name">Meeps</div>
        <div class="mpt-subname">Currency &amp; battle power</div>
      </div>
      <div class="mpt-head-held">
        <span class="mpt-head-held-v" :title="formatNumber(gameStore.meeps)">
          {{ formatNumberCompact(gameStore.meeps) }}
        </span>
        <span class="mpt-head-held-k">in hand</span>
      </div>
    </header>

    <!-- ════════ Der nächste Meep ════════ -->
    <section class="mpt-block">
      <div class="mpt-block-head">
        <span class="mpt-block-title">Next meep</span>
        <span class="mpt-count" :title="formatNumber(meepRemaining)">
          {{ formatNumberCompact(meepRemaining) }} chimes to go
        </span>
        <span class="mpt-pct">{{ meepPercent.toFixed(1) }}%</span>
      </div>

      <div class="mpt-bar">
        <div class="mpt-bar-fill" :style="{ width: `${meepPercent}%` }"></div>
      </div>

      <div class="mpt-status" :class="chimeRate > 0 ? 'mpt-status--flow' : 'mpt-status--idle'">
        <img
          :src="UNIVERSE_TOOLTIP_IMAGES.chimes"
          class="mpt-status-img"
          alt=""
          aria-hidden="true"
        />
        <span v-if="chimeRate > 0">
          {{ formatNumberCompact(gameStore.chimesForNextUniverse) }} chimes this run —
          {{ formatNumber(gameStore.pendingMeeps) }} meeps on departure
        </span>
        <span v-else>No passive chimes yet — build a chime works to set a pace</span>
        <span v-if="chimeRate > 0" class="mpt-status-rate">
          {{ formatNumberCompact(chimeRate) }}/s
        </span>
      </div>
    </section>

    <!-- ════════ Was die gehaltenen Meeps leisten ════════ -->
    <section class="mpt-block">
      <div class="mpt-tiles">
        <div class="mpt-tile">
          <Icon
            :icon="MEEP_TOOLTIP_ICONS.power"
            width="18"
            height="18"
            class="mpt-tile-icon"
            aria-hidden="true"
          />
          <span class="mpt-tile-v" :title="formatNumber(gameStore.totalPower)">
            {{ formatNumberCompact(gameStore.totalPower) }}
          </span>
          <span class="mpt-tile-k">Battle power</span>
        </div>
        <div class="mpt-tile">
          <Icon
            :icon="MEEP_TOOLTIP_ICONS.learnable"
            width="18"
            height="18"
            class="mpt-tile-icon"
            :class="{ 'mpt-tile-icon--hot': meepTreeStore.buyableNodeCount > 0 }"
            aria-hidden="true"
          />
          <span
            class="mpt-tile-v"
            :class="{ 'mpt-tile-v--hot': meepTreeStore.buyableNodeCount > 0 }"
          >
            {{ meepTreeStore.buyableNodeCount }}
          </span>
          <span class="mpt-tile-k">Ready to learn</span>
        </div>
        <div class="mpt-tile">
          <Icon
            :icon="MEEP_TOOLTIP_ICONS.tree"
            width="18"
            height="18"
            class="mpt-tile-icon"
            aria-hidden="true"
          />
          <span class="mpt-tile-v">{{ meepTreeStore.boughtCount }} / {{ treeTotal }}</span>
          <span class="mpt-tile-k">Nodes learned</span>
        </div>
      </div>
    </section>

    <!-- ════════ Der Baum, Zweig für Zweig ════════ -->
    <section class="mpt-block">
      <div class="mpt-block-head">
        <span class="mpt-block-title">Skill tree</span>
        <span class="mpt-pct">{{ Math.round(treePercent) }}%</span>
      </div>

      <div class="mpt-branches">
        <div
          v-for="b in branchRows"
          :key="b.id"
          class="mpt-branch"
          :class="{ 'mpt-branch--done': !b.next }"
        >
          <div class="mpt-branch-top">
            <span class="mpt-branch-dot" :style="{ background: b.color }" aria-hidden="true" />
            <span class="mpt-branch-name" :style="{ color: b.color }">{{ b.name }}</span>
            <span class="mpt-branch-count">{{ b.bought }} / {{ b.total }}</span>
          </div>

          <div class="mpt-branch-bar">
            <div
              class="mpt-branch-bar-fill"
              :style="{ width: `${b.percent}%`, background: b.color }"
            ></div>
          </div>

          <div v-if="b.next" class="mpt-branch-next">
            <span class="mpt-branch-next-name">{{ b.next.name }}</span>
            <span class="mpt-branch-next-fx">{{ b.next.effect }}</span>
            <span class="mpt-branch-cost" :class="{ 'mpt-branch-cost--ok': b.affordable }">
              <Icon
                v-if="!b.affordable"
                :icon="MEEP_TOOLTIP_ICONS.locked"
                width="12"
                height="12"
                aria-hidden="true"
              />
              <img
                v-else
                :src="UNIVERSE_TOOLTIP_IMAGES.meeps"
                alt=""
                aria-hidden="true"
                :style="{ transform: `scale(${UNIVERSE_TOOLTIP_MEEP_SCALE})` }"
              />
              {{ b.next.cost }}
            </span>
          </div>
          <div v-else class="mpt-branch-next mpt-branch-next--done">Branch complete</div>
        </div>
      </div>
    </section>

    <!-- ════════ Die gefalteten Effekte ════════ -->
    <section class="mpt-block">
      <div class="mpt-block-title mpt-block-title--solo">Tree effects in force</div>
      <div v-if="activeEffects.length > 0" class="mpt-fx">
        <span v-for="fx in activeEffects" :key="fx.key" class="mpt-chip">
          <span class="mpt-chip-k">{{ fx.label }}</span>
          <span class="mpt-chip-v" :class="{ 'mpt-chip-v--good': fx.good }">{{ fx.value }}</span>
        </span>
      </div>
      <div v-else class="mpt-empty">
        Nothing learned yet — the first node of every branch is the cheapest.
      </div>
    </section>

    <!-- ════════ Bilanz ════════ -->
    <section class="mpt-block">
      <div class="mpt-block-title mpt-block-title--solo">All time</div>
      <div class="mpt-rows">
        <div v-for="row in lifetimeRows" :key="row.key" class="mpt-row">
          <img
            v-if="row.image"
            :src="row.image"
            class="mpt-row-icon"
            :style="row.imageScale ? { transform: `scale(${row.imageScale})` } : undefined"
            alt=""
            aria-hidden="true"
          />
          <Icon
            v-else-if="row.icon"
            :icon="row.icon"
            class="mpt-row-icon"
            width="15"
            height="15"
            aria-hidden="true"
          />
          <span class="mpt-row-k">{{ row.label }}</span>
          <span class="mpt-row-v" :class="{ 'mpt-row-v--loss': row.loss }" :title="row.full">{{
            row.value
          }}</span>
        </div>
      </div>
      <div class="mpt-hint">
        Every meep in hand is worth {{ formatNumberCompact(powerPerMeep) }} battle power — spending
        them in the tree trades that power for a permanent effect.
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ================================================================
   Meep-Tooltip — Panel-Innenleben. Der Rahmen (Holz + Schatten)
   kommt von RpgBadgeTooltip; hier nur der Inhalt.

   Maßsystem wie in den beiden Nachbar-Panels: alles hängt an der
   Wurzel-font-size, die mit dem Viewport skaliert.
   ================================================================ */
.mpt {
  font-size: clamp(12px, 0.63vw, 16px);
  color: #d8cfc0;
  line-height: 1.35;
  border-radius: 2px;
  /* Sicherheitsnetz: mit allen fünf Zweigen und vollem Effektbeutel ist dies
     das höchste der drei Header-Panels — auf dem flachsten Referenz-Viewport
     (Full HD) scrollt es hier, statt unter dem Bildschirmrand zu enden. */
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.mpt-goldline {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* ── Kopf ──────────────────────────────────────────────────────── */
.mpt-head {
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 0.7em 0.9em;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

/* Das Meep-Sprite ist hochformatig und trägt oben wie unten einen breiten
   Alpha-Rand — ohne die Vergrößerung wirkt es neben dem Text zu klein.
   Dieselbe Korrektur trägt die Meep-Kachel im Header. */
.mpt-head-img {
  flex-shrink: 0;
  width: 2em;
  height: 2em;
  object-fit: contain;
  transform: scale(1.25);
}

.mpt-head-text {
  min-width: 0;
  flex: 1;
}

/* Orange wie die Meep-Zahl in der Kachel darüber — dieselbe Sache, dieselbe
   Farbe (Universe trägt Amethyst, Galaxy Grün). */
.mpt-name {
  font-size: 1.32em;
  font-weight: 700;
  color: #fed7aa;
  letter-spacing: 0.03em;
  line-height: 1.15;
}

.mpt-subname {
  font-size: 0.95em;
  color: #9b8461;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.mpt-head-held {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05em;
  flex-shrink: 0;
  padding: 0.25em 0.6em;
  border-radius: 4px;
  background: #141410;
  border: 1px solid #33220e;
}

.mpt-head-held-v {
  font-size: 1.2em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fdba74;
  line-height: 1;
}

.mpt-head-held-k {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8a7c66;
}

/* ── Blöcke ────────────────────────────────────────────────────── */
.mpt-block {
  padding: 0.7em 0.9em;
  border-bottom: 1px solid #26190c;
}

.mpt-block:last-child {
  border-bottom: none;
}

.mpt-block-head {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  margin-bottom: 0.5em;
}

.mpt-block-title {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #8a7c66;
}

.mpt-block-title--solo {
  display: block;
  margin-bottom: 0.55em;
}

.mpt-count {
  margin-left: auto;
  font-size: 0.88em;
  font-variant-numeric: tabular-nums;
  color: #8a7c66;
}

.mpt-pct {
  margin-left: auto;
  font-size: 1.3em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
}

/* Steht der Prozentwert neben einer Zählangabe, hat DIESE den Schub nach
   rechts — sonst schöben beide und die Zahlen klebten aneinander. */
.mpt-count + .mpt-pct {
  margin-left: 0;
}

/* ── Fortschrittsbalken ────────────────────────────────────────── */
/* Statisch: kein Schimmer, kein Puls. Das Panel steht über dem laufenden
   Orbit — ein zweiter animierter Balken wäre reine Frame-Kosten. */
.mpt-bar {
  position: relative;
  height: 0.85em;
  border-radius: 4px;
  background: #0d0904;
  border: 1px solid rgba(200, 144, 64, 0.42);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.mpt-bar-fill {
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  border-radius: 3px;
  background: linear-gradient(to right, #b85a1c 0%, #f08c28 55%, #fed7aa 100%);
}

/* ── Statuszeile ───────────────────────────────────────────────── */
.mpt-status {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin-top: 0.6em;
  padding: 0.4em 0.55em;
  border-radius: 4px;
  font-size: 0.98em;
  background: #1a1008;
  border: 1px solid #33220e;
}

.mpt-status-img {
  width: 1.25em;
  height: 1.25em;
  object-fit: contain;
  flex-shrink: 0;
}

.mpt-status--flow {
  color: #d8cfc0;
}

.mpt-status--idle {
  color: #a99b83;
  font-style: italic;
}

.mpt-status-rate {
  margin-left: auto;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}

/* ── Kernzahlen ────────────────────────────────────────────────── */
.mpt-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: #33220e;
  border: 1px solid #33220e;
  border-radius: 4px;
  overflow: hidden;
}

.mpt-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.14em;
  padding: 0.55em 0.3em;
  background: #141410;
}

.mpt-tile-icon {
  width: 1.5em;
  height: 1.5em;
  color: #a08a5e;
}

/* Lernbare Knoten sind der einzige HANDLUNGS-Hinweis im Panel — er bekommt
   die Signalfarbe der kaufbaren Zustände, nicht das Gold der Messwerte. */
.mpt-tile-icon--hot {
  color: #6ec040;
}

.mpt-tile-v {
  font-size: 1.28em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
  white-space: nowrap;
}

.mpt-tile-v--hot {
  color: #a8e878;
}

.mpt-tile-k {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8a7c66;
  white-space: nowrap;
}

/* ── Zweige ────────────────────────────────────────────────────── */
.mpt-branches {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}

.mpt-branch {
  padding: 0.4em 0.5em;
  border-radius: 4px;
  background: #141410;
  border: 1px solid #26190c;
}

.mpt-branch--done {
  border-color: #2e7a1a;
}

.mpt-branch-top {
  display: flex;
  align-items: center;
  gap: 0.4em;
}

.mpt-branch-dot {
  width: 0.5em;
  height: 0.5em;
  border-radius: 1px;
  transform: rotate(45deg);
  flex-shrink: 0;
}

.mpt-branch-name {
  font-size: 1em;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.mpt-branch-count {
  margin-left: auto;
  font-size: 0.88em;
  font-variant-numeric: tabular-nums;
  color: #8a7c66;
}

.mpt-branch-bar {
  height: 0.32em;
  margin: 0.3em 0;
  border-radius: 2px;
  background: #0d0904;
  overflow: hidden;
}

.mpt-branch-bar-fill {
  height: 100%;
  border-radius: 2px;
}

.mpt-branch-next {
  display: flex;
  align-items: center;
  gap: 0.45em;
  font-size: 0.9em;
  min-width: 0;
}

.mpt-branch-next-name {
  color: #d8cfc0;
  white-space: nowrap;
}

.mpt-branch-next-fx {
  color: #6f634f;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mpt-branch-next--done {
  color: #6ec040;
  font-style: italic;
}

.mpt-branch-cost {
  display: flex;
  align-items: center;
  gap: 0.25em;
  margin-left: auto;
  flex-shrink: 0;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  background: #1a1008;
  border: 1px solid #33220e;
  color: #8a7c66;
}

.mpt-branch-cost img {
  width: 1em;
  height: 1em;
  object-fit: contain;
}

.mpt-branch-cost--ok {
  border-color: #2e7a1a;
  color: #a8e878;
}

/* ── Effekt-Chips ──────────────────────────────────────────────── */
/* Chips statt Zeilen: die Zahl der wirkenden Effekte wächst von 0 auf 16 —
   ein festes Raster stünde am Anfang fast leer und am Ende zu eng. */
.mpt-fx {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
}

.mpt-chip {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  padding: 0.22em 0.5em;
  border-radius: 4px;
  font-size: 0.9em;
  background: #141410;
  border: 1px solid #33220e;
}

.mpt-chip-k {
  color: #93866f;
  white-space: nowrap;
}

.mpt-chip-v {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}

.mpt-chip-v--good {
  color: #a8e878;
}

.mpt-empty {
  font-size: 0.92em;
  color: #6f634f;
  font-style: italic;
}

/* ── Zweispaltige Zeilenblöcke ─────────────────────────────────── */
.mpt-rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 1.1em;
  row-gap: 0.1em;
}

.mpt-row {
  display: grid;
  grid-template-columns: 1.3em minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45em;
  padding: 0.18em 0;
  min-width: 0;
}

/* Überschreibt die Attributgröße, damit das Glyph der Panel-Schriftgröße
   folgt — feste 15px wären auf 2K/4K neben dem größeren Text ein Fleck. */
.mpt-row-icon {
  width: 1.3em;
  height: 1.3em;
  color: #a08a5e;
  object-fit: contain;
  flex-shrink: 0;
}

.mpt-row-k {
  font-size: 0.98em;
  color: #93866f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mpt-row-v {
  font-size: 0.98em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}

/* Gold zählt, was gewonnen wurde — der Void-Frass ist die einzige Zeile hier,
   die in die andere Richtung zeigt, und trägt deshalb die Verlustfarbe. */
.mpt-row-v--loss {
  color: #cc6050;
}

.mpt-hint {
  margin-top: 0.5em;
  font-size: 0.88em;
  color: #6f634f;
  font-style: italic;
}
</style>
