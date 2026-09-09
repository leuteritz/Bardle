<script setup lang="ts">
import type { PlanetStatFlank, PlanetStatRow } from '@/utils/orbit/planetStatus'

defineProps<{
  rows: PlanetStatRow[]
  /** Level-Up wird gerade gehovert: alle beweglichen Kacheln zeigen ihr Ziel. */
  preview: boolean
  /** Auf welcher Seite der Sonne die Spalte steht — sie richtet sich zu ihr hin aus. */
  side: PlanetStatFlank
  /** Versalzeile über der Spalte: wovon die drei Zahlen reden. */
  caption: string
  /** Rollenfarbe für Wert, Leiste und Hover-Karte. */
  color: string
  /** Hinter der Sonne oder zerstört — dieselbe Aussage wie am gedimmten Readout. */
  dim: boolean
}>()
</script>

<template>
  <!-- Instrumentenspalte neben der Sonne: drei Messwerte in EINEM Rahmen, zur
       Sonne hin ausgerichtet. Unter der Schwelle in `PlanetStagePanel` legt eine
       Container-Query beide Spalten in eine Reihe unter die Sonne. -->
  <div class="psd" :class="[`psd--${side}`, { 'psd--dim': dim }]">
    <span class="psd-cap">{{ caption }}</span>
    <div class="psd-body">
      <div
        v-for="row in rows"
        :key="row.key"
        v-tip="{ label: row.label, text: row.tip, color }"
        class="psd-cell"
        :class="{ 'psd-cell--preview': preview && !!row.preview }"
      >
        <span class="psd-figure">
          <span class="psd-value">{{ preview && row.preview ? row.preview : row.value }}</span>
          <span v-if="row.suffix" class="psd-suffix">{{ row.suffix }}</span>
        </span>
        <span class="psd-label">{{ row.label }}</span>
        <span v-if="row.atCap" class="psd-cap-chip">MAX</span>
        <span v-if="row.bar !== undefined" class="psd-bar">
          <span class="psd-bar-fill" :style="{ width: row.bar * 100 + '%' }" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* EINE Schriftskala für die ganze Spalte; alle Grade in `em` dagegen. Radien und
   Rahmenstärken bleiben feste px — ein mitwachsender Radius risse auf 4K die
   4–5-px-Grenze. */
.psd {
  --psd-u: clamp(12.5px, 0.76vw, 19px);
  font-size: var(--psd-u);
  /* Über der Sonne: ihre Korona reicht weit über den Sonnenkörper hinaus und
     liegt auf z-index 1 — ohne diese Ebene wusch sie im Reihen-Rückfall die
     mittleren Zahlen weg. */
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.42em;
  width: clamp(112px, 13cqw, 196px);
  min-width: 0;
}

.psd-cap {
  display: block;
  font-size: 0.74em;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8a7c66;
  padding: 0 0.5em;
}

/* Ein Rahmen um die drei, nicht drei Kästen — die Spalte liest sich als EIN Gerät. */
.psd-body {
  display: flex;
  flex-direction: column;
  background: #14100a;
  border: 2px solid #3e200a;
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
}

.psd-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.06em;
  min-width: 0;
  padding: 0.55em 0.72em 0.62em;
}

.psd-cell + .psd-cell {
  border-top: 1px solid #2c2110;
}

.psd-figure {
  display: flex;
  align-items: baseline;
  gap: 0.1em;
  max-width: 100%;
}

.psd-value {
  font-size: 1.95em;
  font-weight: 800;
  line-height: 1;
  color: var(--rc, #e8c040);
  text-shadow: 0 0 12px color-mix(in srgb, var(--rc, #e8c040) 38%, transparent);
}

.psd-suffix {
  font-size: 0.86em;
  font-weight: 700;
  line-height: 1;
  color: color-mix(in srgb, var(--rc, #e8c040) 62%, #6f6247);
}

.psd-label {
  font-size: 0.74em;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9c8a5c;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Deckelmarke an der AUSSENkante der Kachel — innen liegt die Sonne. */
.psd-cap-chip {
  position: absolute;
  top: 3px;
  font-size: 0.5em;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #e8c040;
  background: #2a2008;
  border: 1px solid #5c4410;
  border-radius: 4px;
  padding: 0 2px;
}

.psd-bar {
  position: absolute;
  left: 0.5em;
  right: 0.5em;
  bottom: 3px;
  height: 3px;
  background: #241a10;
  border-radius: 4px;
  overflow: hidden;
}

.psd-bar-fill {
  display: block;
  height: 100%;
  background: var(--rc, #e8c040);
  border-radius: 4px;
}

/* Zur Sonne hin ausgerichtet: die linke Spalte rechtsbündig, die rechte links. */
.psd--left .psd-cap,
.psd--left .psd-cell {
  align-items: flex-end;
  text-align: right;
}

.psd--left .psd-cap-chip {
  left: 3px;
}

.psd--right .psd-cap,
.psd--right .psd-cell {
  align-items: flex-start;
  text-align: left;
}

.psd--right .psd-cap-chip {
  right: 3px;
}

/* Hinter der Sonne oder zerstört: die Zahlen sind nicht handlungsrelevant.
   Nur `opacity` fährt — `filter` gehört in keinen Übergang. */
.psd--dim {
  opacity: 0.5;
  transition: opacity 320ms ease;
}

/* Vorschau: derselbe Bestätigungston wie Effekt-Pille und HP-Balken. */
.psd-cell--preview .psd-value {
  color: #5ce66a;
  text-shadow: 0 0 12px rgba(92, 230, 106, 0.45);
}
.psd-cell--preview .psd-suffix {
  color: #7fbe86;
}
.psd-cell--preview .psd-label {
  color: #7fbe86;
}

/* Rückfall: zu schmal für zwei Spalten neben der Sonne — dieselben sechs
   Kacheln legen sich in EINE Reihe darunter. Die Schwelle steht auch in
   `PlanetStagePanel.vue` (dort bricht die Sonne auf eine eigene Zeile);
   `planetStatDeck.spec.ts` hält die beiden Zahlen zusammen. */
@container ps-orrery (max-width: 900px) {
  /* Flex-Basis NICHT 0: eine Spalte, die auf null schrumpfen kann, passt in
     die null Restbreite der ersten Zeile und wickelt nie um — sie stand
     unsichtbar am rechten Rand neben der Sonne. */
  .psd {
    flex-direction: row;
    align-items: center;
    width: auto;
    flex: 1 1 40%;
    max-width: 280px;
    gap: 0;
  }

  .psd-cap {
    display: none;
  }

  .psd-body {
    flex: 1 1 auto;
    flex-direction: row;
    min-width: 0;
  }

  .psd-cell {
    flex: 1 1 0;
    align-items: center;
    text-align: center;
    padding: 0.5em 0.3em 0.56em;
  }

  .psd-cell + .psd-cell {
    border-top: none;
    border-left: 1px solid #2c2110;
  }

  .psd-value {
    font-size: 1.6em;
  }

  .psd-cap-chip {
    right: 3px;
    left: auto;
  }

  /* Die beiden Hälften bilden eine durchgehende Leiste: aussen Rundung, innen
     dieselbe Trennlinie wie zwischen zwei Kacheln. */
  .psd--left .psd-body {
    border-right: none;
    border-radius: 5px 0 0 5px;
  }

  .psd--right .psd-body {
    border-left: 1px solid #2c2110;
    border-radius: 0 5px 5px 0;
  }
}
</style>
