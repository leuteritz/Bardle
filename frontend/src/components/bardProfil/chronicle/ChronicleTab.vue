<script setup lang="ts">
import { computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { CHRONICLE_TOTAL_STAGES, CHRONICLE_RANKS } from '@/config/progression/achievements'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import ChronicleTrackCard from './ChronicleTrackCard.vue'

/**
 * The Bard's Chronicle — acht Meilenstein-Bahnen, eine je Spielsystem.
 *
 * Der Tab liest nur; jede Zahl stammt aus dem Store, dem sie gehört. Er zählt
 * auch nichts selbst mit: der Prüflauf hängt am Sekundentakt des Spiels, nicht
 * am Öffnen dieses Tabs — ein Meilenstein fällt also auch, wenn niemand
 * hinsieht.
 */
const uiStore = useUiStore()
const store = useAchievementStore()

const isActive = computed(() => uiStore.bardActiveTab === 'chronicle')

/**
 * Die Bahnen — aber nur, solange der Tab wirklich sichtbar ist.
 *
 * Der Grund ist nicht Zierde: `trackViews` liest Felder aus sieben Stores, und
 * eines davon (die Lebenszeit-Chimes) ändert sich jede Sekunde. Hinge die Liste
 * daran, während der Tab hinter einem anderen liegt, würde Vue achtmal pro
 * Sekunde neu rechnen und rendern, für nichts — die Tab-Layer werden nur
 * versteckt, nie abgebaut.
 *
 * Die Kopfzeile darunter darf dagegen immer lesen: `unlockedStageCount` kennt
 * nur die eigenen `stages`.
 */
const tracks = computed(() => (isActive.value ? store.trackViews : []))

const totalProgress = computed(() => store.unlockedStageCount / CHRONICLE_TOTAL_STAGES)

/** Der nächste Titel und wie viele Stufen bis dahin fehlen. */
const nextRank = computed(() => CHRONICLE_RANKS.find((r) => r.min > store.unlockedStageCount))
const toNextRank = computed(() =>
  nextRank.value ? nextRank.value.min - store.unlockedStageCount : 0,
)

/**
 * Die Titel als Marken auf dem Balken — der Spieler sieht, dass die Leiter
 * Stufen hat, und wo die nächste sitzt. „Unwritten" bei 0 bekommt keine Marke:
 * eine Kerbe am linken Anschlag markiert nichts.
 */
const rankMarks = computed(() =>
  CHRONICLE_RANKS.filter((r) => r.min > 0).map((r) => ({
    title: r.title,
    min: r.min,
    left: (r.min / CHRONICLE_TOTAL_STAGES) * 100,
    reached: store.unlockedStageCount >= r.min,
  })),
)

/** Beim Öffnen ist alles gesehen — das Abzeichen in der Tab-Leiste erlischt. */
watch(
  isActive,
  (active) => {
    if (active) store.markSeen()
  },
  { immediate: true },
)
</script>

<template>
  <div class="cr-root">
    <CosmicStageBackground />

    <header class="cr-head">
      <div class="cr-head-row">
        <span class="cr-head-main">
          <span class="cr-head-crest">
            <Icon icon="game-icons:book-cover" width="26" height="26" class="cr-head-icon" />
          </span>
          <span class="cr-head-titles">
            <span v-ink-center class="cr-title">The Bard's Chronicle</span>
            <span class="cr-lede">
              Every track measures one part of the journey — and pays back into that same part
            </span>
          </span>
        </span>

        <!-- Rang-Plakette: der Titel ist die Belohnung fürs Sammeln, also steht
             er groß und nicht als Beiwerk neben dem Zähler. -->
        <span class="cr-plaque" :class="{ 'cr-plaque--done': store.isComplete }">
          <span class="cr-plaque-rank">{{ store.rankTitle }}</span>
          <span class="cr-plaque-count">
            <span class="cr-plaque-num">{{ store.unlockedStageCount }}</span>
            <span class="cr-plaque-sep">/</span>
            <span class="cr-plaque-total">{{ CHRONICLE_TOTAL_STAGES }}</span>
            <span class="cr-plaque-word">stages</span>
          </span>
        </span>
      </div>

      <!-- Gesamtleiter. Die Füllung skaliert per transform, die Marken sitzen auf
           festen Prozentwerten — beides statisch, nichts pro Frame. -->
      <div class="cr-meter">
        <div class="cr-meter-track">
          <div class="cr-meter-fill" :style="{ transform: `scaleX(${totalProgress})` }" />
          <span
            v-for="mark in rankMarks"
            :key="mark.title"
            class="cr-meter-mark"
            :class="{ 'cr-meter-mark--reached': mark.reached }"
            :style="{ left: mark.left + '%' }"
            :title="`${mark.title} — ${mark.min} stages`"
          />
        </div>
        <span v-if="nextRank" class="cr-meter-next">
          {{ toNextRank }} more to <strong>{{ nextRank.title }}</strong>
        </span>
        <span v-else class="cr-meter-next cr-meter-next--done">The book is full</span>
      </div>
    </header>

    <div class="cr-grid-wrap">
      <div class="cr-grid">
        <ChronicleTrackCard v-for="track in tracks" :key="track.id" :track="track" />
      </div>
    </div>

    <!-- Rang-Leiter. Sie steht hier aus zwei Gründen: die Kerben auf dem Balken
         oben brauchen eine Beschriftung, und das Raster lässt unter sich Platz,
         weil acht Karten nie eine Zeile voll ausfüllen. -->
    <footer class="cr-ladder">
      <span class="cr-ladder-cap">Rank ladder</span>
      <div class="cr-ladder-row">
        <span
          v-for="mark in rankMarks"
          :key="mark.title"
          class="cr-rung"
          :class="{
            'cr-rung--reached': mark.reached,
            'cr-rung--current': mark.title === store.rankTitle,
          }"
        >
          <span class="cr-rung-num">{{ mark.min }}</span>
          <span class="cr-rung-title">{{ mark.title }}</span>
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════
   CHRONICLE — Kopfzeile plus ein Raster aus acht Bahn-Karten.

   Die Spaltenzahl folgt der Modalbreite, nicht einer festen Zahl — und die
   Modalbreite folgt NICHT allein der Viewportbreite: die Seitenpanels der
   Bottom-Bar skalieren mit der HÖHE, deshalb ist das Raster auf 1920×1070
   (1218 px) schmaler als auf 1920×950 (1291 px). Breiten-Media-Queries könnten
   das nicht treffen, `auto-fill` schon.

   Die 380 px Mindestbreite sind gemessen, nicht geschätzt. Bei 420 fiel WUXGA
   auf zwei Spalten und musste rollen (vier Zeilen à 146 px in 612 px Höhe);
   bei 380 trägt es drei. Nach unten begrenzt die Hover-Leiter: fünf Stufen
   brauchen je ~50 px, unter ~360 px Kartenbreite wird das eng.

   Ergebnis über die Referenzen: Full HD und WUXGA drei Spalten, 2K und 4K vier
   (dort greift der max-width-Deckel darunter).
════════════════════════════════════════════════════════════════════════════ */
.cr-root {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 12px 14px 14px;
  background: #111008;
  color: var(--rpg-text);
}

/* ─ Kopfzeile ─ */
.cr-head {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px 11px;
  border-bottom: 1px solid #2c1806;
}

.cr-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cr-head-main {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

/* Wappenkasten statt nacktem Glyph — dieselbe Sprache wie die Icon-Boxen der
   Karten darunter. */
.cr-head-crest {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #2c1806;
}

.cr-head-icon {
  color: var(--rpg-gold-dim);
}

.cr-head-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cr-title {
  font-size: 21px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-gold);
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.25);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cr-lede {
  font-size: 12px;
  line-height: 1.3;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─ Rang-Plakette ─ */
.cr-plaque {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 12px 7px;
  background: #1e1006;
  border: 1px solid #5c3310;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #2c1806;
}

.cr-plaque--done {
  border-color: var(--rpg-gold-dim);
}

.cr-plaque-rank {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-gold);
}

.cr-plaque-count {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-variant-numeric: tabular-nums;
}

.cr-plaque-num {
  font-size: 14px;
  font-weight: 700;
  color: #d8cbb0;
}

.cr-plaque-sep,
.cr-plaque-total {
  font-size: 12px;
  color: #6b5a3c;
}

.cr-plaque-word {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b5a3c;
}

/* ─ Gesamtleiter mit Rang-Marken ─ */
.cr-meter {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cr-meter-track {
  position: relative;
  flex: 1;
  height: 8px;
  overflow: hidden;
  background: #0d0b06;
  border: 1px solid #2c1806;
  border-radius: 3px;
}

.cr-meter-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: linear-gradient(to right, #c89040, #e8c060);
  transition: transform 0.3s ease-out;
}

/* Kerben der Titel. Eine Marke, die schon passiert ist, sitzt auf der Füllung
   und muss dunkel sein, um überhaupt zu erscheinen. */
.cr-meter-mark {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  margin-left: -1px;
  background: #3e2a10;
}

.cr-meter-mark--reached {
  background: #1a1008;
}

.cr-meter-next {
  flex-shrink: 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b5a3c;
}

.cr-meter-next strong {
  font-weight: 700;
  color: var(--rpg-gold-dim);
}

.cr-meter-next--done {
  color: var(--rpg-gold-dim);
}

/* ─ Kartenraster ─ */
.cr-grid-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* Platz für die angehobene Karte beim Hover: ohne ihn schiebt der Sprung von
     3 px die erste Zeile unter den Kopfzeilenrand. */
  padding: 4px 4px 0 0;
  margin-top: 8px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.cr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 12px;
  align-content: start;
  /* Deckel gegen absurd breite Karten und gegen eine einsame in der zweiten
     Zeile: ohne ihn ergeben sich auf 4K sieben Spalten (7 + 1), mit ihm vier
     (4 + 4) in derselben Kartenbreite, die Full HD auch zeigt. */
  max-width: 1780px;
  margin: 0 auto;
  width: 100%;
}

/* ─ Rang-Leiter als Fußzeile ─ */
.cr-ladder {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid #2c1806;
}

.cr-ladder-cap {
  flex-shrink: 0;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6b5a3c;
}

.cr-ladder-row {
  display: flex;
  flex: 1;
  gap: 6px;
}

/* Eine Sprosse je Titel. Gleiche Breiten, damit die Leiter als Skala liest und
   nicht als Aufzählung. */
.cr-rung {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  padding: 4px 9px 5px;
  background: #16140e;
  border: 1px solid #2c1806;
  border-radius: 4px;
}

.cr-rung-num {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: #6b5a3c;
  font-variant-numeric: tabular-nums;
}

.cr-rung-title {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b5a3c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cr-rung--reached {
  background: #1a1008;
  border-color: #5c3310;
}
.cr-rung--reached .cr-rung-num {
  color: var(--rpg-gold-dim);
}
.cr-rung--reached .cr-rung-title {
  color: #d8cbb0;
}

/* Der Titel, der gerade gilt. */
.cr-rung--current {
  background: #1e1006;
  border-color: var(--rpg-gold-dim);
}
.cr-rung--current .cr-rung-num,
.cr-rung--current .cr-rung-title {
  color: var(--rpg-gold);
}

/* Full HD / WUXGA: drei Kartenzeilen sollen möglichst ohne Rollen passen —
   also gibt die Kopfzeile Höhe ab, nicht die Karten ihre Lesbarkeit. */
@media (max-height: 1100px) {
  .cr-root {
    padding: 10px 12px 12px;
  }
  .cr-head {
    gap: 8px;
    padding-bottom: 9px;
  }
  .cr-title {
    font-size: 18px;
  }
  .cr-plaque-rank {
    font-size: 14px;
  }
  .cr-grid {
    gap: 10px;
  }
  .cr-grid-wrap {
    margin-top: 6px;
  }
  .cr-ladder {
    margin-top: 8px;
    padding-top: 7px;
  }
  .cr-rung {
    padding: 3px 7px 4px;
  }
  .cr-rung-title {
    font-size: 10px;
  }
}

@media (min-height: 1600px) {
  .cr-title {
    font-size: 24px;
  }
  .cr-lede {
    font-size: 13px;
  }
  .cr-plaque-rank {
    font-size: 18px;
  }
  .cr-meter-track {
    height: 10px;
  }
  .cr-meter-next {
    font-size: 12px;
  }
  .cr-grid {
    gap: 15px;
  }
}
</style>
