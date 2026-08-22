<script setup lang="ts">
import AdminQuickActionsPanel from './AdminQuickActionsPanel.vue'
import AdminGalaxyJumpPanel from './AdminGalaxyJumpPanel.vue'
import AdminStarPhasePanel from './AdminStarPhasePanel.vue'
import AdminDrifterPanel from './AdminDrifterPanel.vue'
import AdminVoidPanel from './AdminVoidPanel.vue'
import AdminMaxEverythingPanel from './AdminMaxEverythingPanel.vue'
import AdminGameSpeedPanel from './AdminGameSpeedPanel.vue'
import AdminBadgeLabPanel from './AdminBadgeLabPanel.vue'
</script>

<template>
  <!-- Dashboard-Raster: füllt die volle Modalhöhe, kein Y-Scroll.
       Oben der Endzustand-Knopf über beide Spalten, darunter links Quick
       Actions + die beiden Weltereignis-Panels (Drifter, Void Tide), rechts
       Galaxy Jump + Star Phase. Die beiden Weltereignisse stehen bewusst
       nebeneinander: sie sind dieselbe Art von Werkzeug — etwas in den Orbit
       setzen, das dort von selbst weiterläuft. -->
  <div class="admin-dash">
    <!-- Erste Zeile, volle Breite: er tut, was alle Quick Actions zusammen tun. -->
    <AdminMaxEverythingPanel class="admin-dash-hero" />
    <div class="admin-dash-left">
      <AdminQuickActionsPanel dashboard />
      <!-- Die beiden Weltereignisse teilen sich EINE Zeile statt zwei. Beide
           tragen ein dreispaltiges Kachelraster, das in halber Breite noch
           bequem sitzt — untereinander gestellt nahmen sie Quick Actions dagegen
           so viel Höhe weg, dass dessen Inhalt abgeschnitten wurde (gemessen:
           279 px Inhalt in 47 px Kasten). Das Dashboard hatte Breite übrig, aber
           keine Höhe. -->
      <div class="admin-dash-events">
        <AdminDrifterPanel dashboard />
        <AdminVoidPanel dashboard />
      </div>
    </div>
    <div class="admin-dash-right">
      <!-- Ganz oben, weil er kein einzelnes System stellt, sondern den Takt für
           ALLE darunter — und weil man ihn beim Messen zuerst sucht. -->
      <AdminGameSpeedPanel />
      <AdminGalaxyJumpPanel dashboard />
      <AdminStarPhasePanel dashboard />
      <!-- Das Prüfwerkzeug für die Notify-Marken. -->
      <AdminBadgeLabPanel />
    </div>
  </div>
</template>

<style scoped>
.admin-dash {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(10px, 1.3vw, 18px);
  padding: clamp(10px, 1.8vh, 20px);
  overflow: hidden;
}

.admin-dash-hero {
  grid-column: 1 / -1;
}

.admin-dash-left,
.admin-dash-right {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
  min-height: 0;
}

/* Die Weltereignis-Panels brauchen genau ihre Inhaltshöhe (feste Kachelreihen);
   die Resthöhe geht an Quick Actions, dessen Kacheln sich strecken dürfen —
   sie waren vorher ohnehin die überdehnten Flächen der Spalte.
   Als `:last-child` geschrieben galt das nur, solange genau zwei Panels in der
   Spalte standen; mit dem dritten hätte die Regel still das falsche getroffen. */
.admin-dash-left > :first-child {
  flex: 1;
  min-height: 0;
}
.admin-dash-left > :not(:first-child) {
  flex: 0 0 auto;
}

/* Full HD und WUXGA: die Spalte trägt mehr Inhalt als Höhe da ist — gemessen
   667 px Spalte gegen 396 px allein für die beiden Weltereignis-Panels. Quick
   Actions blieben davon 255 px, und sein Kachelraster wurde auf die Mindestzeile
   gestaucht, bis Icon und Beschriftung übereinanderlagen. Sie ROLLT darum wie
   die rechte Spalte, statt ihren ersten Inhalt zu quetschen. */
@media (max-height: 1100px) {
  .admin-dash-left {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #5c3310 #111;
  }
  /* `height: auto` schlägt das `height: 100%` der Karte — ohne das füllt sie in
     der rollenden Spalte weiter die volle Höhe und schiebt die Weltereignisse
     aus dem Bild. */
  .admin-dash-left > :first-child {
    flex: 0 0 auto;
    height: auto;
  }
}

/* Drifter und The Void nebeneinander, gleich breit. `align-items: start`,
   damit das kürzere der beiden nicht auf die Höhe des längeren gestreckt wird
   und dabei sein Kachelraster auseinanderzieht. */
.admin-dash-events {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: clamp(10px, 1.3vw, 18px);
}

/* Die rechte Spalte ROLLT, seit sie vier Panels trägt, und darum trägt jedes
   Panel darin seine Inhaltshöhe — es gibt kein „wer füllt den Rest" mehr.

   Der Weg dahin steht hier, weil beide Sackgassen plausibel aussehen: die
   Sternphasen-Karte streckt ihr `fill`-Prop (`height: 100%`), NICHT die alte
   Klasse `admin-dash-grow` — sie behalten hiess, das Badge Lab auf gemessene
   2 px zu drücken. Und `flex: 1` an das Badge Lab zu hängen kehrte das nur um:
   in einer überfüllten Spalte schrumpft `flex: 1` bis auf `min-height: 0`. */
.admin-dash-right {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.admin-dash-right > * {
  flex: 0 0 auto;
}
</style>
