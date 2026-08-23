<script setup lang="ts">
/**
 * Hover-Karte des Level-Fortschritts in der Header-Mitte.
 *
 * Zwei Anker öffnen sie — der Chimes-Tropfen und der Level-Badge darunter.
 * Für den Spieler sind beide dasselbe Ding, also tragen sie dieselbe Karte.
 *
 * Die Gestalt kommt aus der Shop-Kartensprache (`.ftip-*` in `rpg-theme.css`).
 * `.ftip` selbst steht NICHT hier: Rahmen und Schatten liefert schon
 * `RpgBadgeTooltip`, ein zweiter läge darin.
 *
 * Die Karte existiert nur im geöffneten Zustand (v-if hinter dem Teleport),
 * der Header kostet im Ruhezustand nichts.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { BARD_ABILITIES } from '@/config/progression/bardAbilities'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import { formatCompactDuration } from '@/utils/ui/format'
import {
  MS_PER_SECOND,
  NOTIFY_BADGE_TITLE,
  AUGMENT_LEVEL_INTERVAL,
  AUGMENT_FALLBACK_ICON,
} from '@/config/constants'

const gameStore = useGameStore()
const abilityStore = useBardAbilityStore()

const nextLevel = computed(() => gameStore.level + 1)
const percent = computed(() => Math.round(gameStore.levelProgress))

/* Der Rest DIESER Stufe, nicht `chimesToNextLevel` — der rechnet gegen den
   ausgabefähigen Bestand und fiele beim Einkauf zurück. */
const remaining = computed(() =>
  Math.max(0, gameStore.totalChimesThisLevel - gameStore.currentLevelChimes),
)

/** Idle-Schätzung: Klicks zählen nicht mit, sonst spränge die Zahl bei jedem. */
const etaText = computed(() => {
  const rate = gameStore.chimesPerSecond * gameStore.mvpBuffMultiplier
  if (rate <= 0 || remaining.value <= 0) return ''
  return formatCompactDuration((remaining.value / rate) * MS_PER_SECOND)
})

interface GrantRow {
  id: string
  icon?: string
  cap?: string
  color?: string
  text: string
}

/* Was die nächste Stufe wirklich fallen lässt. Skillpunkte stehen bewusst
   nicht dabei: sie werden nirgends ausgegeben — Fähigkeitsränge steigen
   allein mit dem Level (bardAbilityStore.rankOf). */
const grants = computed<GrantRow[]>(() => {
  const rows: GrantRow[] = []
  if (nextLevel.value % AUGMENT_LEVEL_INTERVAL === 0)
    rows.push({ id: 'augment', icon: AUGMENT_FALLBACK_ICON, text: 'Augment offer' })
  for (const def of BARD_ABILITIES) {
    if (abilityStore.nextRankLevelOf(def.id) !== nextLevel.value) continue
    const rank = abilityStore.rankOf(def.id)
    rows.push({
      id: def.id,
      cap: def.key,
      color: def.color,
      text: rank === 0 ? `${def.name} unlocked` : `${def.name} — Rank ${rank + 1}`,
    })
  }
  return rows
})
</script>

<template>
  <div class="lvt">
    <span class="ftip-accent" aria-hidden="true" />

    <div class="ftip-head lvt-head">
      <span class="lvt-emblem">{{ gameStore.level }}</span>
      <span class="ftip-name lvt-name">{{ NOTIFY_BADGE_TITLE.level }}</span>
      <span class="ftip-chip lvt-chip">→ {{ nextLevel }}</span>
    </div>

    <div class="lvt-body">
      <div class="lvt-figures">
        <span class="lvt-have">{{ formatNumberCompact(gameStore.currentLevelChimes) }}</span>
        <span class="lvt-sep">/</span>
        <span class="lvt-need">{{ formatNumberCompact(gameStore.totalChimesThisLevel) }}</span>
        <span class="lvt-pct">{{ percent }}%</span>
      </div>

      <div class="lvt-bar">
        <i
          class="lvt-bar-fill"
          :style="{ transform: `scaleX(${gameStore.levelProgress / 100})` }"
        />
      </div>

      <div class="ftip-meta lvt-meta">
        {{ formatNumberCompact(remaining) }} Chimes to go<template v-if="etaText">
          · ~{{ etaText }}</template
        >
      </div>

      <div v-if="grants.length > 0" class="ftip-block lvt-grants">
        <div class="lvt-grants-label">Next level grants</div>
        <div v-for="g in grants" :key="g.id" class="lvt-grant">
          <Icon v-if="g.icon" :icon="g.icon" width="18" height="18" class="lvt-grant-ico" />
          <span v-else class="lvt-grant-cap" :style="{ '--cap-c': g.color }">{{ g.cap }}</span>
          <span class="lvt-grant-text">{{ g.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Nur was die `.ftip-*`-Skala nicht schon sagt. Maßsystem wie bei den
   Nachbar-Panels: alles hängt an der Wurzel-font-size. */
.lvt {
  position: relative;
  /* Hält die Akzentleiste in den Ecken des geerbten Rahmens. */
  overflow: hidden;
  border-radius: 2px;
  --tip-color: #e8c040;
  font-size: clamp(13px, 0.72vw, 17px);
  color: #d8cfc0;
  line-height: 1.35;
}

.lvt-head {
  padding: 0.72em 0.85em 0.6em;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.lvt-emblem {
  flex-shrink: 0;
  width: 2.2em;
  height: 2.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(to bottom, #4a8a28, #2e6018);
  border: 2px solid #6ec040;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 1.02em;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}

.lvt-name {
  font-size: 1.16em;
  color: #f0d870;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.lvt-chip {
  font-size: 0.84em;
  font-variant-numeric: tabular-nums;
}

.lvt-body {
  display: flex;
  flex-direction: column;
  gap: 0.62em;
  padding: 0.8em 0.85em 0.85em;
}

.lvt-figures {
  display: flex;
  align-items: baseline;
  gap: 0.28em;
}

.lvt-have {
  font-size: 1.6em;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.lvt-sep {
  font-size: 1.05em;
  color: rgba(255, 255, 255, 0.24);
}

.lvt-need {
  font-size: 1.05em;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.55);
  font-variant-numeric: tabular-nums;
}

.lvt-pct {
  margin-left: auto;
  font-size: 1.6em;
  font-weight: 900;
  color: #f0d870;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* Statisch: kein Schimmer, kein Puls — die Karte steht über dem laufenden Orbit. */
.lvt-bar {
  position: relative;
  height: 0.72em;
  border-radius: 4px;
  background: #0d0904;
  border: 1px solid rgba(200, 144, 64, 0.42);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

/* scaleX statt width: der Füllstand wandert jede Sekunde weiter. */
.lvt-bar-fill {
  position: absolute;
  inset: 1px;
  transform-origin: left center;
  border-radius: 3px;
  background: linear-gradient(to right, #c89040, #f0d060);
  transition: transform 0.4s ease-out;
}

/* Kräftiger als `.ftip-meta`: dort steht eine Herkunftsangabe, hier die
   Restrechnung — die liest man. */
.lvt-meta {
  font-size: 1em;
  color: rgba(232, 220, 192, 0.7);
  font-variant-numeric: tabular-nums;
}

.lvt-grants {
  display: flex;
  flex-direction: column;
  gap: 0.42em;
  border-left: 3px solid var(--tip-color);
}

.lvt-grants-label {
  font-size: 0.78em;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b89a5a;
}

.lvt-grant {
  display: flex;
  align-items: center;
  gap: 0.55em;
  font-size: 1em;
  color: #e8dcc0;
}

.lvt-grant-ico {
  flex-shrink: 0;
  color: #c89040;
}

.lvt-grant-cap {
  flex-shrink: 0;
  width: 1.6em;
  height: 1.6em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  border: 1px solid var(--cap-c, #7a4e20);
  background: color-mix(in srgb, var(--cap-c, #7a4e20) 18%, #12100a);
  color: var(--cap-c, #e8c040);
  font-size: 0.82em;
  font-weight: 900;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .lvt-bar-fill {
    transition: none;
  }
}
</style>
