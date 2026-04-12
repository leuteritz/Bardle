<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/config/numberFormat'

const gameStore = useGameStore()
</script>

<template>
  <div class="hstats">
    <!-- ── Chimes-Block ── -->
    <div class="hstats-block">
      <div class="hstats-row">
        <span class="hstats-lbl hstats-lbl--gold">C/Click</span>
        <span class="hstats-val hstats-val--gold">{{
          formatNumber(gameStore.chimesPerClick)
        }}</span>
      </div>
      <div class="hstats-row">
        <span class="hstats-lbl hstats-lbl--green">C/s</span>
        <span class="hstats-val hstats-val--green">{{
          formatNumber(gameStore.chimesPerSecond)
        }}</span>
      </div>
    </div>

    <!-- ── Trenner ── -->
    <div class="hstats-sep" aria-hidden="true" />

    <!-- ── DMG-Block ── -->
    <div class="hstats-block">
      <div class="hstats-row">
        <span class="hstats-lbl hstats-lbl--red">Click</span>
        <span class="hstats-val hstats-val--red">{{ formatNumber(gameStore.dmgPerClick) }}</span>
      </div>
      <div class="hstats-row">
        <span class="hstats-lbl hstats-lbl--red">DPS</span>
        <span class="hstats-val hstats-val--red">{{ formatNumber(gameStore.dmgPerSecond) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ════════════════════════════════════
   WRAPPER
   ════════════════════════════════════ */
.hstats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  flex-shrink: 0;
  padding: 6px 16px;
  min-width: 160px;
  background: linear-gradient(170deg, rgba(20, 14, 4, 0.6) 0%, rgba(10, 7, 2, 0.6) 100%);
  /* Alle 4 Seiten identisch – ein einziger border-Wert */
  border: 1px solid rgba(122, 78, 32, 0.35);
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

/* ════════════════════════════════════
   BLOCK
   ════════════════════════════════════ */
.hstats-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 5px 0;
}

/* ════════════════════════════════════
   ZEILE
   ════════════════════════════════════ */
.hstats-row {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

/* ════════════════════════════════════
   LABEL
   ════════════════════════════════════ */
.hstats-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  flex-shrink: 0;
  width: 44px;
}
.hstats-lbl--gold {
  color: rgba(251, 191, 36, 0.5);
}
.hstats-lbl--green {
  color: rgba(116, 212, 72, 0.5);
}
.hstats-lbl--red {
  color: rgba(255, 122, 80, 0.5);
}

/* ════════════════════════════════════
   WERT
   ════════════════════════════════════ */
.hstats-val {
  font-size: clamp(0.95rem, 1.25vw, 1.15rem);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 36px;
  text-align: right;
  flex: 1;
}
.hstats-val--gold {
  color: #fbbf24;
  filter: drop-shadow(0 0 7px rgba(251, 191, 36, 0.65));
}
.hstats-val--green {
  color: #74d448;
  filter: drop-shadow(0 0 7px rgba(116, 212, 72, 0.6));
}
.hstats-val--red {
  color: #ff7a50;
  filter: drop-shadow(0 0 7px rgba(255, 100, 60, 0.6));
}

/* ════════════════════════════════════
   TRENNER
   ════════════════════════════════════ */
.hstats-sep {
  height: 1px;
  margin: 1px 0;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 200, 80, 0.22) 15%,
    rgba(255, 200, 80, 0.22) 85%,
    transparent
  );
}
</style>
