<script setup lang="ts">
/**
 * Der Ladeschleier des Shop-Tabs.
 *
 * Warum ausgerechnet dieser Tab einen bekommt, obwohl `docs/performance.md`
 * (Regel 9) für alle übrigen ausdrücklich abrät: gemessen am Produktionsbuild,
 * Full HD, frische Sitzung, 1600-ms-Fenster — das ERSTE Öffnen kostet
 * **392 ms längsten Einzelframe**, 3 Frames über 33 ms und 550 ms verlorene
 * Zeit. Das ist teurer als Team-Tab (308) und Boss-Arena (225), also die
 * teuerste Fläche des Spiels, und nicht das 72–136-ms-Band, für das sich ein
 * Schleier nicht lohnt. Ab dem zweiten Öffnen bleiben 47 ms — deshalb läuft er
 * GENAU EINMAL je Sitzung (`shopBuilt` in `ShopComponent`).
 *
 * Das Skelett zeigt die Spalte EINGEKLAPPT, weil sie so aufgeht: rechts ein
 * schmaler Streifen in der Breite der Griffleiste, nicht die volle Detailseite.
 * Ein Platzhalter, der etwas anderes verspricht als das, was kommt, hat den
 * Ruckler nur gegen einen Sprung getauscht.
 *
 * Bewegt wird ausschliesslich `transform` (Sheen und Beacon-Ringe): der
 * Schleier steht per Definition in den Frames, in denen der Hauptthread
 * blockiert ist — Compositor-Animationen laufen dort weiter, alles andere
 * friert ein und macht den Ruckler erst sichtbar.
 */
import { computed } from 'vue'
import LoadingBeacon from '@/components/ui/LoadingBeacon.vue'
import {
  FORGE_DETAILS_RAIL_PX,
  FORGE_SHOP_LOADER_ACCENT,
  FORGE_SHOP_LOADER_CAPTION,
  FORGE_SHOP_LOADER_ICON,
  FORGE_SHOP_LOADER_TITLE,
  FORGE_SHOP_SKELETON_RINGS,
  FORGE_SHOP_SKELETON_SUN_PCT,
} from '@/config/constants'

defineProps<{
  /** `performance.now()` beim Aufziehen — Basis der Sekundenangabe im Beacon. */
  startedAt: number
}>()

/**
 * Die Knoten des Baum-Skeletts, Ring für Ring gleichmässig verteilt und bei
 * 12 Uhr beginnend.
 *
 * Prozentkoordinaten in einem QUADRATISCHEN Kasten (`.stl-orbits` trägt
 * `aspect-ratio: 1`) — auf der vollen Fläche gerechnet zöge jeder Ring zu einer
 * Ellipse aus, und das Skelett verspräche eine Anordnung, die der Baum nicht
 * hat. Dasselbe Vorgehen wie beim Sigil-Skelett im Team-Tab.
 */
const skeletonNodes = computed(() =>
  FORGE_SHOP_SKELETON_RINGS.flatMap((ring, ringIndex) =>
    Array.from({ length: ring.n }, (_, i) => {
      const rad = ((-90 + (360 / ring.n) * i) * Math.PI) / 180
      return {
        key: `${ringIndex}-${i}`,
        style: {
          left: `${50 + ring.r * Math.cos(rad)}%`,
          top: `${50 + ring.r * Math.sin(rad)}%`,
          width: `${ring.d}%`,
        },
      }
    }),
  ),
)

const railWidth = `${FORGE_DETAILS_RAIL_PX}px`
const sunSize = `${FORGE_SHOP_SKELETON_SUN_PCT}%`
</script>

<template>
  <div class="stl">
    <div class="stl-tree">
      <!-- Sonne und Ringe. Der echte Baum steht in einer Bühne, die pan- und
           zoombar ist; das Skelett bildet nur die RUHELAGE nach — mehr wäre
           ein Versprechen auf eine Kamera, die der Spieler danach woanders
           vorfindet. -->
      <div class="stl-orbits" aria-hidden="true">
        <span class="stl-sun" />
        <span v-for="node in skeletonNodes" :key="node.key" class="stl-node" :style="node.style" />
      </div>

      <!-- Die beiden belegten Ecken der Baumspalte: unten links die
           Kantenlegende, unten rechts die Zoom-Leiste. -->
      <span class="stl-mark stl-mark--legend" aria-hidden="true" />
      <span class="stl-mark stl-mark--zoom" aria-hidden="true" />

      <!-- Ein einziger wandernder Glanz: eine Fläche, die verschoben wird —
           kein Verlauf, der pro Frame neu entsteht. -->
      <span class="stl-sheen" aria-hidden="true" />

      <LoadingBeacon
        class="stl-beacon"
        :accent="FORGE_SHOP_LOADER_ACCENT"
        :icon="FORGE_SHOP_LOADER_ICON"
        :title="FORGE_SHOP_LOADER_TITLE"
        :caption="FORGE_SHOP_LOADER_CAPTION"
        :started-at="startedAt"
      />
    </div>

    <!-- Die Griffleiste, wie sie gleich dastehen wird. -->
    <div class="stl-rail" aria-hidden="true">
      <span class="stl-rail-mark stl-rail-mark--chevron" />
      <span class="stl-rail-mark stl-rail-mark--count" />
      <span class="stl-rail-mark stl-rail-mark--dot" />
    </div>
  </div>
</template>

<style scoped>
/* Ab Frame 1 voll deckend — der Schleier blendet NICHT ein. Eine Blende hiesse,
   ihn so lange halbdurchsichtig zu zeigen, und dahinter sähe man genau das,
   was verdeckt werden soll.

   z-index 30 und nicht 10: der DEV-Knopf der Baumspalte liegt auf 20. */
.stl {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  overflow: hidden;
  background: #111008;
}

.stl-tree {
  position: relative;
  flex: 1;
  min-width: 0;
}

/* Quadratisch, damit die Ringe Kreise bleiben. */
.stl-orbits {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  height: 82%;
  aspect-ratio: 1;
  opacity: 0.5;
}

.stl-sun {
  position: absolute;
  left: 50%;
  top: 50%;
  width: v-bind(sunSize);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #1e1a10;
  border: 1px solid #3a2c1a;
}

/* `width` kommt inline aus der Ringtabelle, die Höhe folgt per aspect-ratio —
   so trägt die Konstante EINE Zahl je Ring statt zweier, die auseinanderlaufen. */
.stl-node {
  position: absolute;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #17150e;
  border: 1px solid #3a2c1a;
}

.stl-mark {
  position: absolute;
  bottom: 16px;
  height: 30px;
  border-radius: 4px;
  background: #16110a;
  border: 1px solid #2a1a08;
}

.stl-mark--legend {
  left: 14px;
  width: 132px;
}

.stl-mark--zoom {
  right: 14px;
  width: 108px;
}

.stl-sheen {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 34%;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(232, 192, 64, 0),
    rgba(232, 192, 64, 0.05),
    rgba(232, 192, 64, 0)
  );
  animation: stl-sheen 2.1s ease-in-out infinite;
}

@keyframes stl-sheen {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}

.stl-beacon {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

/* Genau die Masse der Griffleiste, die gleich hier steht — samt ihrer Naht. */
.stl-rail {
  flex: 0 0 v-bind(railWidth);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 14px;
  border-left: 2px solid #5c3310;
  background: #14100c;
}

.stl-rail-mark {
  background: #241a0e;
  border-radius: 4px;
}

.stl-rail-mark--chevron {
  width: 14px;
  height: 14px;
}

.stl-rail-mark--count {
  width: 20px;
  height: 18px;
}

.stl-rail-mark--dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@media (prefers-reduced-motion: reduce) {
  .stl-sheen {
    animation: none;
    opacity: 0;
  }
}
</style>
