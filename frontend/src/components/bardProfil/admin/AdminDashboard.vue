<script setup lang="ts">
import AdminQuickActionsPanel from './AdminQuickActionsPanel.vue'
import AdminGalaxyJumpPanel from './AdminGalaxyJumpPanel.vue'
import AdminStarPhasePanel from './AdminStarPhasePanel.vue'
import AdminDrifterPanel from './AdminDrifterPanel.vue'
import AdminVoidPanel from './AdminVoidPanel.vue'
import AdminMaxEverythingPanel from './AdminMaxEverythingPanel.vue'
</script>

<template>
  <!-- Dashboard-Raster: füllt die volle Modalhöhe, kein Y-Scroll.
       Links Quick Actions + die beiden Weltereignis-Panels (Drifter, Void
       Tide), rechts Galaxy Jump + Star Phase. Die beiden Weltereignisse stehen
       bewusst nebeneinander: sie sind dieselbe Art von Werkzeug — etwas in den
       Orbit setzen, das dort von selbst weiterläuft. -->
  <div class="admin-dash">
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
      <AdminGalaxyJumpPanel dashboard />
      <AdminStarPhasePanel dashboard class="admin-dash-grow" />
      <!-- Der Endzustand-Knopf steht unten über die volle Spaltenbreite: er tut,
           was die neun Quick Actions zusammen tun, und wäre als zehnte Kachel im
           3er-Raster eine vierte Zeile mit zwei Lücken.
           Warum RECHTS und nicht unter Quick Actions: die linke Spalte hat keine
           Höhe übrig. Gemessen (Full HD) kostete er dort 66 px, und Quick Actions
           lief um 18 px über — die letzten drei Knöpfe standen unter der
           Kartenkante. Rechts gibt die Sternphasen-Karte den Platz aus ihrem
           gestreckten Kachelraster ab, ohne selbst überzulaufen. -->
      <AdminMaxEverythingPanel />
    </div>
  </div>
</template>

<style scoped>
.admin-dash {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(10px, 1.3vw, 18px);
  padding: clamp(10px, 1.8vh, 20px);
  overflow: hidden;
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

/* Drifter und The Void nebeneinander, gleich breit. `align-items: start`,
   damit das kürzere der beiden nicht auf die Höhe des längeren gestreckt wird
   und dabei sein Kachelraster auseinanderzieht. */
.admin-dash-events {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: clamp(10px, 1.3vw, 18px);
}

/* Nicht positionell, sondern benannt: als `:first-child`/`:last-child`
   geschrieben galt die Regel nur, solange genau zwei Panels in der Spalte
   standen — mit dem dritten hätte `:last-child` still den Endzustand-Knopf
   gestreckt statt die Sternphasen-Karte. Wer wächst, sagt es selbst. */
.admin-dash-right > * {
  flex: 0 0 auto;
}
.admin-dash-right > .admin-dash-grow {
  flex: 1;
  min-height: 0;
}
</style>
