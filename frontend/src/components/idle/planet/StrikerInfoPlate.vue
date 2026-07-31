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
    <span class="sip-name">{{ name }}</span>
    <!-- Kennwert-Zeile: Level-Chip + Schadenswert. Das Level steht bewusst
         NICHT mehr neben dem Namen — dort verbrauchte es genau die Breite, die
         der Name für sich braucht, und schob die Karte in ihre Nachbarin.
         Hier unten ist die Zeile ohnehin nur halb gefüllt. Turret-Plates
         liefern kein Level und behalten damit ihre reine Schadenszeile. -->
    <span class="sip-meta">
      <span v-if="level" class="sip-level" :title="`Champion level ${level}`">
        <span class="sip-level-tag">LVL</span>
        <span class="sip-level-num">{{ level }}</span>
      </span>
      <span class="sip-stats">{{ stats }}</span>
    </span>
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
/* ── Karte — dunkle Plate mit Farb-Signaturlinie oben ─────────────────────────
   Jede Größe hier ist `em` gegen `--sip-u` (rpg-theme.css) — die Karte hat
   genau EINEN Maßstab und wächst als Ganzes mit der Auflösung mit, statt in
   Einzelteilen. Fix in px bleiben nur die Dinge, die NICHT mitwachsen dürfen:
   Radien (Projektregel: max. 4–5px), Hairline-Borders und Schlagschatten —
   skaliert würden daraus weiche, unscharfe Kanten. */
.sip {
  position: relative;
  font-size: var(--sip-u);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08em;
  min-width: calc(var(--sip-min-w-u, 8.1) * 1em);
  /* Deckel gegen lange Champion-Namen ("Nunu & Willump"): fünf Plates stehen
     mit 13 % Arenabreite Abstand nebeneinander — ohne Grenze schiebt ein
     langer Name die Karte in die Nachbarin. Darüber greift die Ellipse.
     `cqw` misst gegen den Striker-Container (.rsq): 11.5 % gegen 13 % Abstand
     lässt auf jeder Auflösung dieselbe relative Lücke. Die Turret-Plates
     stehen außerhalb dieses Containers — für sie fällt `cqw` auf den Viewport
     zurück und ist damit weit jenseits ihrer Textbreite, dort gewinnt `em`. */
  max-width: min(14.5em, 11.5cqw);
  padding: 0.34em 0.85em 0.42em;
  border-radius: 4px;
  background: rgba(8, 5, 2, 0.92);
  border: 1px solid color-mix(in srgb, var(--rc) 40%, #3a2410);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

/* Die Rail braucht mehr Grundbreite als der bloße Name — ohne sie bliebe eine
   Platte mit kurzem Namen auf der Basisbreite stehen und würde die vier
   Stat-Kacheln zusammenquetschen. */
.sip--rail {
  --sip-min-w-u: 10;
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
  width: calc(100% - 0.68em);
  height: 0.6em;
  margin: 0.25em 0.34em 0;
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
  font-size: 1.42em;
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
  margin-top: 0.08em;
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
.sip-name {
  max-width: 100%;
  font-size: 1em;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: rgba(240, 230, 204, 0.85);
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

/* Kennwert-Zeile: Chip links, Schadenswert rechts */
.sip-meta {
  display: flex;
  align-items: center;
  gap: 0.42em;
  max-width: 100%;
  margin-top: 0.06em;
}

/* ── Level-Chip — zweigeteilt wie ein Nameplate-Rang ──────────────────────────
   Links der "LVL"-Reiter in Rollenfarbe (dunkle Schrift, dieselbe Umkehrung
   wie der Captain-Tag der Detailseite), rechts die Zahl auf dunklem Feld in
   Rollenfarbe. Beide Hälften teilen sich einen Rahmen; `stretch` hält sie auf
   gleicher Höhe, obwohl der Reiter kleiner gesetzt ist als die Zahl. */
.sip-level {
  flex-shrink: 0;
  display: inline-flex;
  align-items: stretch;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--rc) 55%, #3a2410);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.75);
  line-height: 1;
}

.sip-level-tag,
.sip-level-num {
  display: grid;
  place-items: center;
  font-weight: 900;
  line-height: 1;
}

.sip-level-tag {
  padding: 0.22em 0.34em;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--rc) 68%, #f4ecd6),
    color-mix(in srgb, var(--rc) 92%, #6a4410)
  );
  color: #0c0803;
  font-size: 0.62em;
  letter-spacing: 0.12em;
  text-shadow: 0 1px 0 color-mix(in srgb, var(--rc) 45%, #fff);
}

.sip-level-num {
  padding: 0.12em 0.36em;
  background: rgba(6, 3, 0, 0.92);
  color: color-mix(in srgb, var(--rc) 42%, #fff);
  font-size: 0.9em;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  text-shadow: 0 0 7px color-mix(in srgb, var(--rc) 55%, transparent);
}

.sip-stats {
  font-size: 0.84em;
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
  /* minmax(0, 1fr) statt 1fr: die Werte sind `nowrap`, und eine `1fr`-Spalte
     kann nicht unter ihre min-content-Breite — die Rail hätte damit das
     max-width der Karte von innen wieder aufgedrückt. */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.24em;
  width: 100%;
  margin-top: 0.36em;
  padding-top: 0.36em;
  border-top: 1px solid color-mix(in srgb, var(--rc) 28%, transparent);
}

/* Jede Zelle eine eigene Kachel mit Farbkante oben: die vier Stats sind sonst
   acht gleich aussehende Textfetzen in einem 2×2-Raster — welcher Wert zu
   welchem Kürzel gehört, muss man da abzählen. Rein statisch (Farbfläche +
   Kante), kein Filter, keine Animation: die Plate steckt in einer Einheit,
   die bei jedem Angriff durchs Bild schnipst. */
.sip-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.04em;
  min-width: 0;
  padding: 0.18em 0.14em 0.22em;
  border-radius: 3px;
  border-top: 2px solid color-mix(in srgb, var(--sc) 60%, transparent);
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--sc) 14%, rgba(6, 3, 0, 0.55)),
    rgba(6, 3, 0, 0.55)
  );
}

.sip-cell-key {
  font-size: 0.65em;
  font-weight: 900;
  letter-spacing: 0.1em;
  line-height: 1.2;
  color: color-mix(in srgb, var(--sc) 55%, rgba(240, 230, 204, 0.5));
}

.sip-cell-val {
  font-size: 0.87em;
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
