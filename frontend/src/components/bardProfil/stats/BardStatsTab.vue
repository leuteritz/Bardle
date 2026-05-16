<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useShopStore } from '@/stores/shopStore'

const SESSION_START = Date.now()

const gameStore = useGameStore()
const shopStore = useShopStore()

const { totalChimesEarned, chimesPerSecond, totalClicks, level, currentUniverse, chimesPerClick } =
  storeToRefs(gameStore)

const { buildingStats } = storeToRefs(shopStore)

const animated = ref(false)
const sessionSeconds = ref(Math.floor((Date.now() - SESSION_START) / 1000))
let sessionTimer: ReturnType<typeof setInterval>

onMounted(() => {
  sessionTimer = setInterval(() => {
    sessionSeconds.value = Math.floor((Date.now() - SESSION_START) / 1000)
  }, 1000)
  nextTick(() => {
    animated.value = true
  })
})

onUnmounted(() => clearInterval(sessionTimer))

const sessionTime = computed(() => {
  const s = sessionSeconds.value
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
})

const maxCPS = computed(() => {
  const vals = buildingStats.value.map((b) => b.currentCPS)
  return vals.length > 0 ? Math.max(...vals) : 1
})

// Klicker-Upgrade (baseCPS === 0)
const clickerUpgrade = computed(
  () => shopStore.shopUpgrades.find((u) => (u.baseCPS ?? 0) === 0) ?? null,
)

// Basis-CPC ohne Klicker-Upgrade-Bonus (nur für Anzeige der Aufschlüsselung)
const baseCPC = computed(() => gameStore.baseChimesPerClick)

// Bonus durch Klicker-Gebäude
const clickerBonus = computed(() => {
  const u = clickerUpgrade.value
  if (!u || u.level === 0) return 0
  return (u.baseCPC ?? 0) * u.level
})

// Gesamtbonus durch Augments/Skills/Modifier = finalCPC - base - clickerBonus
const extraBonus = computed(() => {
  const total = chimesPerClick.value
  return Math.max(0, total - baseCPC.value - clickerBonus.value)
})
</script>

<template>
  <div class="sv-root rpg-scrollbar">
    <!-- ══ LINKE SPALTE: Bard ══ -->
    <div class="sv-portrait-col">
      <img
        src="/img/BardAbilities/Bard.png"
        alt="Bard – The Wandering Caretaker"
        class="sv-bard-img"
      />
      <div class="sv-nameplate">
        <span class="sv-name">BARD</span>
        <span class="sv-subtitle">The Wandering Caretaker</span>
      </div>
    </div>

    <!-- ══ RECHTE SPALTE ══ -->
    <div class="sv-content-col rpg-scrollbar">
      <!-- ─ STATISTIKEN ─ -->
      <div class="sv-block">
        <div class="sv-block-label">Statistiken</div>
        <div class="sv-stat-grid">
          <div class="sv-stat">
            <div class="sv-stat-val">{{ $formatNumber(totalChimesEarned) }}</div>
            <div class="sv-stat-lbl">Gesamt-Chimes</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val sv-val-green">{{ $formatNumber(chimesPerSecond) }}</div>
            <div class="sv-stat-lbl">Chimes / Sek.</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val sv-val-blue">{{ $formatNumber(totalClicks) }}</div>
            <div class="sv-stat-lbl">Klicks</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val">{{ level }}</div>
            <div class="sv-stat-lbl">Level</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val sv-val-muted">{{ currentUniverse }}</div>
            <div class="sv-stat-lbl">Universum</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val sv-val-muted sv-val-sm">{{ sessionTime }}</div>
            <div class="sv-stat-lbl">Session</div>
          </div>
        </div>
      </div>

      <!-- ─ CLICK POWER ─ -->
      <div class="sv-block">
        <div class="sv-block-label">Click Power</div>

        <div class="sv-clickpower">
          <!-- Linke Seite: Icon + Name -->
          <div class="sv-clickpower-hero">
            <img
              v-if="clickerUpgrade"
              :src="clickerUpgrade.icon"
              :alt="clickerUpgrade.name"
              class="sv-clickpower-icon"
            />
            <div class="sv-clickpower-meta">
              <span class="sv-clickpower-name">
                {{ clickerUpgrade?.name ?? 'Klicker' }}
              </span>
              <span class="sv-clickpower-count" v-if="clickerUpgrade && clickerUpgrade.level > 0">
                ×{{ clickerUpgrade.level }}
              </span>
              <span class="sv-clickpower-count sv-val-muted" v-else>nicht gekauft</span>
            </div>
          </div>

          <!-- Rechte Seite: Aufschlüsselung -->
          <div class="sv-clickpower-breakdown">
            <div class="sv-cpc-row">
              <span class="sv-cpc-lbl">Basis</span>
              <span class="sv-cpc-val">{{ $formatNumber(baseCPC) }}</span>
            </div>
            <div class="sv-cpc-row" v-if="clickerBonus > 0">
              <span class="sv-cpc-lbl">Klicker ×{{ clickerUpgrade?.level }}</span>
              <span class="sv-cpc-val sv-val-blue">+{{ $formatNumber(clickerBonus) }}</span>
            </div>
            <div class="sv-cpc-row" v-if="extraBonus > 0">
              <span class="sv-cpc-lbl">Augments / Skills</span>
              <span class="sv-cpc-val sv-val-green">+{{ $formatNumber(extraBonus) }}</span>
            </div>
            <div class="sv-cpc-divider" />
            <div class="sv-cpc-row sv-cpc-row--total">
              <span class="sv-cpc-lbl">Gesamt / Klick</span>
              <span class="sv-cpc-val sv-cpc-total">{{ $formatNumber(chimesPerClick) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ─ GEBÄUDE ─ -->
      <div class="sv-block">
        <div class="sv-block-label">Gebäude</div>

        <ul class="sv-building-list" role="list">
          <li v-for="(b, index) in buildingStats" :key="b.id" class="sv-building-row">
            <div class="sv-rank">#{{ index + 1 }}</div>

            <img :src="b.icon" :alt="b.name" class="sv-building-icon" />

            <div class="sv-building-info">
              <!-- Zeile 1: Name + Count + aktueller CPS -->
              <div class="sv-building-top">
                <span class="sv-building-name">{{ b.name }}</span>
                <span class="sv-building-count">×{{ b.level }}</span>
                <span class="sv-building-output sv-val-green">
                  {{ $formatNumber(b.currentCPS) }}/s
                </span>
              </div>

              <!-- Zeile 2: Gesamt produziert + Anteil -->
              <div class="sv-building-produced">
                <span class="sv-produced-val">{{ $formatNumber(b.lifetimeProduction) }}</span>
                <span class="sv-produced-lbl">produziert</span>
                <span class="sv-produced-pct">{{ b.efficiency }}%</span>
              </div>

              <!-- Zeile 3: CPS-Balken -->
              <div class="rpg-progress-track sv-bar-track">
                <div
                  class="rpg-progress-bar sv-bar-fill"
                  :style="{
                    width: animated && maxCPS > 0 ? `${(b.currentCPS / maxCPS) * 100}%` : '0%',
                  }"
                />
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   STATS VIEW — groß, luftig, nur RPG-Tokens
══════════════════════════════════════════════ */

.sv-root {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--rpg-bg-deep);
  color: var(--rpg-text);
  font-family: var(--rpg-font-mono);
}

/* ─── Linke Spalte ──────────────────────────── */
.sv-portrait-col {
  width: 36%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 28px 20px;
  background: var(--rpg-bg-dark);
  border-right: 1px solid var(--rpg-wood-inner);
}

.sv-bard-img {
  width: 100%;
  max-width: 260px;
  height: auto;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 28px color-mix(in srgb, var(--rpg-gold) 22%, transparent));
}

.sv-nameplate {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.sv-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--rpg-gold);
  font-family: var(--rpg-font-mono);
}
.sv-subtitle {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

/* ─── Rechte Spalte ─────────────────────────── */
.sv-content-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 22px;
  overflow-y: auto;
  min-width: 0;
}

/* ─── Block ─────────────────────────────────── */
.sv-block {
  margin-bottom: 36px;
}
.sv-block-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rpg-wood-inner);
}

/* ─── Stat-Grid (3×2) ───────────────────────── */
.sv-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.sv-stat {
  padding: 18px 14px;
  background: var(--rpg-bg-dark);
  display: flex;
  flex-direction: column;
  gap: 7px;
  transition: background 0.12s;
}
.sv-stat:hover {
  background: var(--rpg-bg-hover);
}

.sv-stat-val {
  font-family: var(--rpg-font-mono);
  font-size: 26px;
  font-weight: 900;
  color: var(--rpg-gold);
  line-height: 1;
}
.sv-val-green {
  color: var(--rpg-green-top);
}
.sv-val-blue {
  color: var(--rpg-blue);
}
.sv-val-muted {
  color: var(--rpg-text-muted);
}
.sv-val-sm {
  font-size: 20px;
}

.sv-stat-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}

/* ─── Click Power Panel ─────────────────────── */
.sv-clickpower {
  display: flex;
  align-items: stretch;
  gap: 0;
  background: var(--rpg-bg-dark);
}

/* Linke Hero-Seite */
.sv-clickpower-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px 22px;
  border-right: 1px solid var(--rpg-wood-inner);
  flex-shrink: 0;
  min-width: 110px;
}
.sv-clickpower-icon {
  width: 64px;
  height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--rpg-blue) 35%, transparent));
}
.sv-clickpower-meta {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.sv-clickpower-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--rpg-gold-dim);
  font-family: var(--rpg-font-mono);
  letter-spacing: 0.05em;
}
.sv-clickpower-count {
  font-size: 11px;
  color: var(--rpg-text-muted);
  font-family: var(--rpg-font-mono);
}

/* Rechte Aufschlüsselung */
.sv-clickpower-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 20px 20px;
}

.sv-cpc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sv-cpc-row--total {
  margin-top: 2px;
}
.sv-cpc-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}
.sv-cpc-val {
  font-size: 14px;
  font-weight: 700;
  color: var(--rpg-text-muted);
  font-family: var(--rpg-font-mono);
}
.sv-cpc-total {
  font-size: 22px;
  font-weight: 900;
  color: var(--rpg-gold);
}
.sv-cpc-divider {
  height: 1px;
  background: var(--rpg-wood-inner);
  margin: 2px 0;
}

/* ─── Gebäude-Liste ─────────────────────────── */
.sv-building-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.sv-building-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 6px;
  border-bottom: 1px solid var(--rpg-bg-row);
  transition: background 0.1s;
}
.sv-building-row:last-child {
  border-bottom: none;
}
.sv-building-row:hover {
  background: var(--rpg-bg-hover);
}

/* Rang */
.sv-rank {
  font-size: 11px;
  font-weight: 700;
  color: var(--rpg-text-dim);
  font-family: var(--rpg-font-mono);
  min-width: 22px;
  text-align: right;
  flex-shrink: 0;
}

.sv-building-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}

.sv-building-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Zeile 1: Name + Count + Output */
.sv-building-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.sv-building-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--rpg-gold-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-family: var(--rpg-font-mono);
}
.sv-building-count {
  font-size: 13px;
  color: var(--rpg-text-dim);
  flex-shrink: 0;
  font-family: var(--rpg-font-mono);
}
.sv-building-output {
  font-size: 14px;
  font-weight: 700;
  margin-left: auto;
  flex-shrink: 0;
  font-family: var(--rpg-font-mono);
}

/* Zeile 2: Gesamt produziert + % */
.sv-building-produced {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sv-produced-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--rpg-gold);
  font-family: var(--rpg-font-mono);
}
.sv-produced-lbl {
  font-size: 10px;
  color: var(--rpg-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.sv-produced-pct {
  font-size: 11px;
  font-weight: 700;
  color: var(--rpg-orange);
  font-family: var(--rpg-font-mono);
  margin-left: auto;
}

/* Zeile 3: CPS-Bar */
.sv-bar-track {
  height: 5px;
}
.sv-bar-fill {
  height: 100%;
  transition: width 0.85s ease;
}
</style>
