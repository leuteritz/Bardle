<template>
  <div class="sr sf-panel">
    <ForgeFocusCard />

    <!-- Laufende Segen des Handels: das Einzige in dieser Spalte mit einer Uhr,
         die abläuft, ohne dass man etwas tut. Gekauft werden sie eine Rolle
         tiefer, im Angebotsstreifen. -->
    <div v-if="activeBuffs.length > 0" class="sf-buffs">
      <div v-for="buff in activeBuffs" :key="buff.id" class="blessing-chip">
        <Icon icon="ph:sparkle-fill" width="17" height="17" class="blessing-icon" />
        <span class="blessing-name">{{ buffLabel(buff.id) }}</span>
        <span class="blessing-time">{{ formatClock(buff.expiresAt - forgeStore.forgeNow) }}</span>
      </div>
    </div>

    <!-- Der Sammelkauf steht UNTER den Segen, und das ist kein Zufall: seit er
         nur noch erscheint, wenn wirklich etwas kaufbar ist, sind beide bedingt,
         und dann entscheidet, wie oft etwas umschaltet. Ein Segen läuft eine
         Stunde. Die Leiste kommt und geht, sooft die Chimes eine Kaufschwelle
         kreuzen — also ständig. Das Häufige gehört nach unten: von dort schiebt
         es nur die Liste, die im selben Frame ohnehin ihren `READY TO GROW`-Block
         auf- oder zumacht. Stünde es oben, ruckte die Segensreihe bei jeder
         Schwelle mit. -->
    <ForgeBuyAllBar />

    <!-- ══ Scrolling body ════════════════════════════════════════
         Vier Blöcke, in der Reihenfolge, in der der Spieler sie braucht: was
         er verfolgt, dann was gerade erreichbar ist, dann der Baum als Liste,
         zuletzt die Schublade mit Gesperrtem und Fertigem. -->
    <!-- `data-forge-scroll` markiert den EINEN Rollkasten dieser Spalte.
         `ForgeUpgradesSection` muss ihn finden, um zu messen, ob eine Zeile
         schon im Bild stand, bevor sie hereingerollt wird — ein
         `closest('.sf-body')` täte dasselbe, koppelte die Liste aber an eine
         CSS-Klasse, die hier jederzeit umbenannt werden dürfte. Ein Attribut
         ist eine Zusage, ein Klassenname ist es nicht. -->
    <div class="sr-scroll sf-body" data-forge-scroll>
      <ForgePursuitCard />
      <ForgeOfferStrip />
      <ForgeUpgradesSection />
      <ForgeVaultSection />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Die Detailspalte des Skill-Tree-Reiters.
 *
 * Über dem Scrollfeld die Fokus-Karte (`ForgeFocusCard`) und der Sammelkauf
 * (`ForgeBuyAllBar`) — Letzterer ist mit der Kopfleiste über dem Baum hierher
 * gezogen, weil das Kaufbare in dieser Spalte steht.
 *
 * Sie zeigte bis zum Umbau EINE von vier Abteilungen, ausgewählt an einer
 * Reiter-Schiene ganz rechts (`ForgeSectionRail`, gestrichen). Drei dieser vier
 * Abteilungen — Relikte, Konstellationen, Handel — sind zusammen ein knappes
 * Dutzend Käufe, und ob eine davon gerade etwas hergab, stand allein an einer
 * 18px-Marke an einem Reiter, den der Spieler nicht offen hatte.
 *
 * Jetzt steht alles gleichzeitig da, und diese Komponente ist nur noch der
 * Rahmen darum: ein fester Kopf aus drei Leisten, darunter ein Scrollfeld mit
 * den drei Blöcken. Was sie zeigen, steht in ihnen selbst; was sie rechnen, in
 * `useForgeOffers` und `useForgeUpgrades`.
 *
 * ── Die Reihenfolge des Kopfes ──────────────────────────────────────────────
 * Nach Beständigkeit sortiert, nicht nach Wichtigkeit: Fokus, Segen,
 * Sammelkauf. Der Fokus steht, bis der Spieler ihn löst; die Segen wechseln
 * stündlich; der Sammelkauf kommt und geht, sooft die Chimes eine Kaufschwelle
 * kreuzen — also ständig. Was häufig umschaltet, gehört nach unten, denn von
 * dort schiebt es nur die Liste, die im selben Frame ohnehin ihren
 * `READY TO GROW`-Block auf- oder zumacht.
 *
 * Der kosmische Handel stand hier einmal ganz oben, über der Fokus-Karte. Er ist
 * zurück in den Angebotsstreifen gewandert: ein Dauerbalken über der Karte machte
 * den Kopf zu einem Stapel aus vier Dingen, bevor die erste Upgrade-Zeile kam,
 * und die Karte ist das, weswegen der Spieler hersieht.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatClock } from '@/utils/ui/format'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import ForgeBuyAllBar from './ForgeBuyAllBar.vue'
import ForgeFocusCard from './ForgeFocusCard.vue'
import ForgePursuitCard from './ForgePursuitCard.vue'
import ForgeOfferStrip from './ForgeOfferStrip.vue'
import ForgeUpgradesSection from './ForgeUpgradesSection.vue'
import ForgeVaultSection from './ForgeVaultSection.vue'
import type { ForgeActiveBuff } from '@/types'

const forgeStore = useStarForgeStore()

const activeBuffs = computed(() =>
  forgeStore.activeBuffs.filter((b) => b.expiresAt > forgeStore.forgeNow),
)

function buffLabel(id: ForgeActiveBuff['id']): string {
  return id === 'cpcX2' ? '2× Chimes / Click' : '2× Chimes / Sec'
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   PANEL
   Flaeche, Naht und Schriftskala kommen als `.sr` aus dem Theme. Der Satz
   darueber — „a sidebar in this game reads as one kind of place, not one per
   tab" — stand hier seit jeher als Vorsatz; seit es die Sprache gibt, ist er
   derselbe Code.
══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   RUNNING BLESSINGS
══════════════════════════════════════════════════ */
.sf-buffs {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 11px 18px;
  border-bottom: 1px solid #2a1a08;
  background: #14100c;
}

.blessing-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  background: rgba(150, 80, 220, 0.12);
  border: 1px solid rgba(150, 80, 220, 0.4);
  border-radius: 4px;
}

.blessing-icon {
  color: #c9a0ff;
  flex-shrink: 0;
}

.blessing-name {
  font-size: 13.5px;
  font-weight: 900;
  color: #c9a0ff;
}

.blessing-time {
  font-size: 13px;
  font-weight: 700;
  color: rgba(201, 160, 255, 0.7);
  font-variant-numeric: tabular-nums;
}

/* ══════════════════════════════════════════════════
   BODY
══════════════════════════════════════════════════ */
/* Rollkasten und Scrollbar stehen als `.sr-scroll` im Theme. Die Masse
   bleiben eigen: diese Spalte ist 400–560 px breit, nicht 260, und traegt
   Karten statt Zeilen. */
.sf-body {
  padding: 10px 18px 26px;
  gap: 13px;
}

/* Die drei Blöcke dürfen nie von der Flexspalte gestaucht werden — Kinder mit
   `overflow: hidden` schrumpften sonst zu einem Streifen. */
.sf-body > * {
  flex-shrink: 0;
}

/* Stacked layout (below every desktop reference) — the tree carries the seam
   as its bottom edge there, so the panel drops its own. */
@media (max-width: 900px) {
  .sf-panel {
    border-left: none;
  }
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD is the flattest viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .sf-buffs {
    padding: 9px 15px;
  }

  .sf-body {
    padding: 9px 15px 22px;
    gap: 11px;
  }
}
</style>
