<script setup lang="ts">
/**
 * Die Detailschiene neben der Orbit-Bühne.
 *
 * Sie zeigte bis zum Umbau genau EINEN Knoten — den gerade angeklickten — und
 * ohne Auswahl einen Leerzustand mit drei Sprungzielen. Wer wissen wollte, was
 * überhaupt lernbar ist, musste die Bühne mit dreissig Knoten selbst absuchen.
 *
 * Jetzt ist sie der Rahmen um zwei Teile:
 *   1. **Empfehlung** (`MeepBestBuyPanel`) — was jetzt zu holen lohnt, mit
 *      Kaufknopf, auf reservierter Fläche.
 *   2. **Liste** (`MeepSkillList`) — alles Lernbare, nach Töpfen gegliedert,
 *      frisch Aufgegangenes oben. Der einzige Scrollbereich.
 *
 * Der angeklickte Knoten ersetzt die Liste NICHT mehr; er wird darin
 * angesprungen und hervorgehoben. Was der Zeiger streift, sagt das schwebende
 * Kärtchen (`MeepSkillTooltip`, hängt in der Liste) — ausserhalb des Flusses,
 * damit es nichts verschieben kann.
 *
 * **Warum hier kein Kopfband mehr steht.** Es trug Titel, Meep-Bestand und die
 * Bilanz „x / 25 learned · y / 1188 invested". Jedes davon steht anderswo, und
 * zwar dauerhaft statt nur bei offenem Reiter: der Bestand in der Kopfleiste
 * des Spiels, Bilanz und Zweigfortschritt in `MeepProgressTooltip` am
 * Meep-Zähler und im Statistik-Reiter (`useStatCatalog`). Was der Reiter tut,
 * sagt sein eigenes Symbol und darunter das BEST-BUY-Abzeichen.
 * Der Gewinn ist HÖHE, und Höhe ist auf Full HD das knappe Gut: die 83px des
 * Kopfbands (92px ab 2K) gehen vollständig an die Liste — dort rund eine ganze
 * Karte mehr. Das Panel bleibt gleich gross, seine Höhe klemmt gegen die
 * Schiene, und die ändert sich nicht.
 */
import MeepBestBuyPanel from './MeepBestBuyPanel.vue'
import MeepSkillList from './MeepSkillList.vue'

defineProps<{ nodeId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <aside class="msd-root">
    <MeepBestBuyPanel />

    <div class="msd-body">
      <MeepSkillList :selected-id="nodeId" @select="emit('select', $event)" />
    </div>
  </aside>
</template>

<style scoped>
/* ══════════════════════════════════════════════════
   SCHIENE
   Dieselbe Fläche und dieselbe Naht wie die Forge-Spalte im Shop (.sf-panel):
   eine Detail-Schiene im Bard-Profil ist EINE Art von Ort, nicht eine je
   Reiter. Die Breite kommt von aussen (`SkillTreeComponent`), damit beide
   Reiter dieselbe Zahl lesen.
══════════════════════════════════════════════════ */
.msd-root {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #111008;
  border-left: 2px solid #5c3310;
}

/* ── Körper ───────────────────────────────────────────────── */
.msd-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 18px 22px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.msd-body::-webkit-scrollbar {
  width: 4px;
}

.msd-body::-webkit-scrollbar-track {
  background: #111;
}

.msd-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
   Die Werte sind die des Shops.
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .msd-body {
    padding: 10px 15px 18px;
  }
}
</style>
