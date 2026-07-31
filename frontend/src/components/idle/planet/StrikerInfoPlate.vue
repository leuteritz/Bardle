<template>
  <!-- Geteilte Info-Plate im Star-Fight-Modal: HP-Bar → HP-Text → Name →
       Schadenswert. Genutzt von RoleStrikerSquad (Champions) und
       TurretBatteryHUD (Turret-Planeten) — Akzentfarbe kommt per Prop. -->
  <div class="sip" :class="{ 'sip--rail': hasRail }" :style="{ '--rc': color }">
    <div class="sip-hp-track" :class="{ 'sip-hp-track--low': hpLow }">
      <div class="sip-hp-ghost" :style="{ width: hpPct + '%' }" />
      <div
        class="sip-hp-fill"
        :class="{ 'sip-hp-fill--low': hpLow }"
        :style="{ width: hpPct + '%' }"
      />
      <div class="sip-hp-ticks" />
    </div>
    <span class="sip-hp-text" :class="{ 'sip-hp-text--down': hpDown }">{{ hpText }}</span>
    <span class="sip-name-row">
      <span class="sip-name">{{ name }}</span>
      <span v-if="level" class="sip-level" :title="`Champion level ${level}`">{{ level }}</span>
    </span>
    <span class="sip-stats">{{ stats }}</span>
    <!-- Stat-Rail: nur Champions liefern sie — Turret-Plates lassen sie weg und
         sehen damit exakt aus wie zuvor. Vier fertige Strings, keine Store-Zugriffe
         hier drin: die Plate steckt in einer Einheit, die bei jedem Angriff
         animiert wird, und darf nichts rechnen. -->
    <div v-if="hasRail" class="sip-rail">
      <span
        v-for="c in statCells"
        :key="c.short"
        class="sip-cell"
        :style="{ '--sc': c.color }"
        :title="c.title"
      >
        <span class="sip-cell-key">{{ c.short }}</span>
        <span class="sip-cell-val">{{ c.value }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StrikerStatCell } from '@/types'

const props = defineProps<{
  /** Akzentfarbe (Rollen- bzw. Turret-Farbe) — färbt Bar, Linie und Stats. */
  color: string
  hpPct: number
  /** Fertiger HP-Text, z. B. "12 / 20" oder "DOWN 3s". */
  hpText: string
  /** Rote Down-Typo statt Akzentfarbe (Champion am Boden). */
  hpDown?: boolean
  name: string
  stats: string
  /** Champion-Level als Chip neben dem Namen — Turret-Plates lassen es weg. */
  level?: number
  /** Vier Champion-Stats als fertige Zellen; leer/undefined = keine Rail. */
  statCells?: StrikerStatCell[]
}>()

const hpLow = computed(() => props.hpPct < 25)
const hasRail = computed(() => (props.statCells?.length ?? 0) > 0)
</script>

<style scoped>
/* ── Karte — dunkle Plate mit Farb-Signaturlinie oben ────────────────────── */
.sip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: var(--sip-min-w, 96px);
  /* Die Rail braucht mehr Grundbreite als der bloße Name — ohne sie bliebe eine
     Platte mit kurzem Namen bei 96px stehen und würde die Zahlen kappen. */
  padding: 4px 10px 5px;
  border-radius: 4px;
  background: rgba(8, 5, 2, 0.92);
  border: 1px solid color-mix(in srgb, var(--rc) 40%, #3a2410);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

.sip--rail {
  --sip-min-w: 112px;
}

.sip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--rc) 75%, #e8c060),
    transparent
  );
}

/* ── HP-Bar — schräge Esports-Energiezelle in Akzentfarbe ────────────────── */
.sip-hp-track {
  position: relative;
  width: calc(100% - 8px);
  height: 7px;
  margin: 3px 4px 0;
  transform: skewX(-16deg);
  background: linear-gradient(
    to bottom,
    rgba(4, 2, 0, 0.9),
    color-mix(in srgb, var(--rc, #c8922a) 12%, rgba(6, 3, 0, 0.9))
  );
  border: 1px solid color-mix(in srgb, var(--rc, #c8922a) 55%, #0a0806);
  border-radius: 2px;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.85),
    0 0 10px color-mix(in srgb, var(--rc, #c8922a) 26%, transparent);
  overflow: hidden;
}

.sip-hp-track--low {
  border-color: #8a2018;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.85),
    0 0 10px rgba(220, 30, 30, 0.35);
}

.sip-hp-ghost {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(255, 235, 200, 0.32);
  transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.sip-hp-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background:
    repeating-linear-gradient(
      -45deg,
      transparent 0 4px,
      rgba(255, 255, 255, 0.14) 4px 6px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--rc, #c8922a) 78%, #fff) 0%,
      var(--rc, #c8922a) 45%,
      color-mix(in srgb, var(--rc, #c8922a) 55%, #000) 100%
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 0 8px color-mix(in srgb, var(--rc, #c8922a) 65%, transparent);
  transition: width 0.25s linear;
}

/* Energie-Spitze: heller glühender Saum an der aktuellen HP-Kante */
.sip-hp-fill::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 2px;
  background: color-mix(in srgb, var(--rc, #c8922a) 35%, #fff);
  box-shadow: 0 0 6px color-mix(in srgb, var(--rc, #c8922a) 40%, #fff);
}

.sip-hp-fill--low {
  background:
    repeating-linear-gradient(
      -45deg,
      transparent 0 4px,
      rgba(255, 255, 255, 0.12) 4px 6px
    ),
    linear-gradient(to bottom, #ff5f5f 0%, #cc1e1e 45%, #8a0d0d 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 140, 140, 0.45),
    0 0 8px rgba(220, 30, 30, 0.7);
  animation: sip-hp-pulse 1.1s ease-in-out infinite;
}

.sip-hp-fill--low::after {
  background: #ffd0c8;
  box-shadow: 0 0 6px rgba(255, 120, 100, 0.9);
}

/* Segment-Zellen: schmale Schrägschnitte alle 20 % */
.sip-hp-ticks {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(20% - 2px),
    rgba(0, 0, 0, 0.6) calc(20% - 2px),
    rgba(0, 0, 0, 0.6) 20%
  );
  pointer-events: none;
}

@keyframes sip-hp-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* HP-Zahl als Held der Plate — groß, konturiert, Akzentfarben-Glow */
.sip-hp-text {
  font-size: 1.05rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--rc, #c8922a) 38%, #fff);
  letter-spacing: 0.03em;
  white-space: nowrap;
  -webkit-text-stroke: 1px rgba(10, 5, 0, 0.85);
  paint-order: stroke fill;
  text-shadow:
    0 0 10px color-mix(in srgb, var(--rc, #c8922a) 65%, transparent),
    0 0 24px color-mix(in srgb, var(--rc, #c8922a) 30%, transparent),
    0 2px 3px rgba(0, 0, 0, 0.95);
  line-height: 1.15;
  margin-top: 1px;
}

.sip-hp-text--down {
  color: #ff6050;
  text-shadow:
    0 0 10px rgba(255, 60, 40, 0.75),
    0 0 24px rgba(220, 30, 20, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

/* Name und Level teilen sich eine Zeile — mit nur einem Kind sieht sie exakt
   aus wie die frühere reine Namenszeile (Turret-Plates) */
.sip-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}

.sip-name {
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: rgba(240, 230, 204, 0.85);
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

/* Level als gefüllter Chip in Rollenfarbe — dieselbe Umkehrung (dunkle Schrift
   auf Akzentfarbe), die auch der Captain-Tag der Detailseite benutzt */
.sip-level {
  flex-shrink: 0;
  padding: 0 5px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--rc) 82%, #f0e6cc);
  color: #0c0803;
  font-size: 0.6rem;
  font-weight: 900;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.sip-stats {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--rc) 70%, #f0e6cc);
  text-transform: uppercase;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 8px color-mix(in srgb, var(--rc) 40%, transparent),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

/* ── Stat-Rail — vier Zellen, jede in der Farbe ihres Stats ──────────────────
   Was ein Champion im Kampf leistet, steht jetzt an ihm dran statt nur im
   Profil: PWR treibt den Orbit-Schaden am Boss, VIT die HP-Leiste direkt
   darüber, FOC die Cooldowns der Rollenfähigkeit, FOR die Beute am Ende.
   Zwei Spalten, Kürzel ÜBER dem Wert. Beides ist erzwungen, nicht Geschmack:
   auf Stufe 50 stehen die Werte bei "+393%", vier nebeneinander werden auf den
   schmalen Plates abgeschnitten — und breitere Plates gehen nicht, die stünden
   dann 2px auseinander (gemessen). Gestapelt braucht eine Zelle nur die Breite
   ihrer Zahl, und die Rail passt in die Platte, die ohnehin da ist. Die Höhe
   dafür ist vorhanden: unter der tiefsten Platte liegen über 100px frei.
   Rein statisch: kein Filter, keine Animation, nichts pro Frame. */
.sip-rail {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3px 8px;
  width: 100%;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid color-mix(in srgb, var(--rc) 28%, transparent);
}

.sip-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 0;
}

.sip-cell-key {
  font-size: 0.48rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  line-height: 1.2;
  color: color-mix(in srgb, var(--sc) 55%, rgba(240, 230, 204, 0.5));
}

.sip-cell-val {
  font-size: 0.64rem;
  font-weight: 900;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--sc);
  text-shadow:
    0 0 7px color-mix(in srgb, var(--sc) 45%, transparent),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

@media (prefers-reduced-motion: reduce) {
  .sip-hp-fill--low {
    animation: none;
  }
}
</style>
