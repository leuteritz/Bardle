<script setup lang="ts">
/**
 * Der Ladeschleier der Star-Fight-Arena.
 *
 * Das Modal bringt Arena, Turret-Batterie, Striker-Squad, Loot-Banner und ein
 * 600×600-Planeten-SVG auf einen Schlag mit — gemessen 206 ms längster
 * Einzelframe und 722 ms verlorene Zeit, mitten in der Einblendung. Anders als
 * das erste Öffnen eines Tabs passiert das bei JEDEM Sternklick, ist also der
 * teuerste wiederkehrende Ruckler im Spiel.
 *
 * Der Schleier dreht die Reihenfolge um: erst blendet die billige Hülle sauber
 * ein, dann entsteht der Inhalt DAHINTER, dann wird er aufgedeckt. Die Zeit
 * bleibt dieselbe, aber niemand sieht mehr ein Standbild — die Karte läuft
 * währenddessen weiter, weil sie ausschließlich `transform` animiert und das im
 * Compositor liegt, also auch dann noch läuft, wenn der Hauptthread 200 ms
 * blockiert ist.
 *
 * Das Skelett darunter zeichnet den Zuschnitt der Arena nach: Ziel-HUD oben,
 * Planet in der Mitte, Loot- und Squad-Reihe darunter, Sonnenhorizont am unteren
 * Rand. Alles in Prozent, damit es dem Modal in jede Fenstergröße folgt.
 */
import { computed } from 'vue'
import { ROLES } from '@/config/constants'
import LoadingBeacon from '@/components/ui/LoadingBeacon.vue'

const props = defineProps<{
  /** Name des Bosses, auf den gleich geschossen wird. */
  bossName: string
  /** Galaxy-Bosse tragen das Lila des Modals, alle anderen das Kampf-Rot. */
  isGalaxyBoss: boolean
  /** `performance.now()` beim Aufziehen des Schleiers — Basis der Zeitangabe. */
  startedAt: number
}>()

const accent = computed(() => (props.isGalaxyBoss ? '#a850e0' : '#cc6050'))
const icon = computed(() => (props.isGalaxyBoss ? 'game-icons:galaxy' : 'game-icons:crowned-skull'))
const LOOT_TILES = 4
</script>

<template>
  <div class="sfl" :style="{ '--acc': accent }">
    <div class="sfl-skeleton" aria-hidden="true">
      <span class="sfl-horizon" />
      <span class="sfl-hud" />
      <span class="sfl-planet" />
      <div class="sfl-loot">
        <span v-for="i in LOOT_TILES" :key="`loot-${i}`" class="sfl-loot-tile" />
      </div>
      <div class="sfl-squad">
        <span v-for="role in ROLES" :key="role.key" class="sfl-squad-plaque" />
      </div>
      <span class="sfl-sheen" />
    </div>

    <LoadingBeacon
      class="sfl-beacon"
      :accent="accent"
      :icon="icon"
      :title="bossName"
      caption="Entering the arena"
      :started-at="startedAt"
    />
  </div>
</template>

<style scoped>
/* Deckend über der ganzen Bühne — der Inhalt mountet darunter. Eine 1 genügt,
   weil die Arena daneben einen eigenen Stapelkontext aufmacht (.sf-arena-wrap).
   Über den Ecksteuerelementen des Modals liegt der Schleier bewusst NICHT: die
   sitzen außerhalb von .sf-main, der Schließen-Button bleibt also auch während
   des Ladens erreichbar. Dasselbe gilt für Bard’s Rail: sie steht neben der
   Bühne, nicht darin — die Fähigkeiten bleiben während des Ladens bedienbar. */
.sfl {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  background: #0d0b06;
}
.sfl-skeleton {
  position: absolute;
  inset: 0;
  opacity: 0.6;
}

/* Sonnenhorizont: die flache Kuppel am unteren Rand der Arena. */
.sfl-horizon {
  position: absolute;
  left: -14%;
  right: -14%;
  bottom: -34%;
  height: 62%;
  border-radius: 50%;
  background: #14110a;
  border: 1px solid #2c2216;
}
/* Ziel-HUD: Bossname + HP-Streifen ganz oben. */
.sfl-hud {
  position: absolute;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  width: 44%;
  height: 6%;
  border-radius: 4px;
  background: #17150e;
  border: 1px solid color-mix(in srgb, var(--acc) 26%, #2c2216);
}
/* Planet mit dem Boss darauf — die größte Fläche der Arena. */
.sfl-planet {
  position: absolute;
  left: 50%;
  top: 40%;
  height: 42%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: color-mix(in srgb, var(--acc) 6%, #16130d);
  border: 1px solid color-mix(in srgb, var(--acc) 22%, #2c2216);
}
/* Loot-Banner unter dem Boss. */
.sfl-loot {
  position: absolute;
  left: 50%;
  top: 68%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}
.sfl-loot-tile {
  width: 46px;
  height: 46px;
  border-radius: 4px;
  background: #17150e;
  border: 1px solid #2c2216;
}
/* Striker-Squad: eine Plakette je Rolle, ganz unten. */
.sfl-squad {
  position: absolute;
  left: 50%;
  bottom: 5%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}
.sfl-squad-plaque {
  width: 74px;
  height: 62px;
  border-radius: 4px;
  background: #17150e;
  border: 1px solid #2c2216;
}
/* Ein einziger wandernder Glanz — eine Fläche, die verschoben wird. */
.sfl-sheen {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 32%;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(232, 192, 64, 0),
    rgba(232, 192, 64, 0.05),
    rgba(232, 192, 64, 0)
  );
  animation: sfl-sheen 2.1s ease-in-out infinite;
}

.sfl-beacon {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

@keyframes sfl-sheen {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(320%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sfl-sheen {
    animation: none !important;
    opacity: 0;
  }
}
</style>
