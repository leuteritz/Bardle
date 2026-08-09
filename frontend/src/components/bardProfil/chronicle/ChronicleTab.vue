<script setup lang="ts">
import { computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { CHRONICLE_TOTAL_STAGES } from '@/config/progression/achievements'
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
 */
const tracks = computed(() => (isActive.value ? store.trackViews : []))

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
      <span class="cr-head-main">
        <Icon icon="game-icons:book-cover" width="26" height="26" class="cr-head-icon" />
        <span v-ink-center class="cr-title">The Bard's Chronicle</span>
      </span>

      <span class="cr-head-meta">
        <span class="cr-rank">{{ store.rankTitle }}</span>
        <span class="cr-count">
          <span class="cr-count-num">{{ store.unlockedStageCount }}</span>
          <span class="cr-count-sep">/</span>
          <span class="cr-count-total">{{ CHRONICLE_TOTAL_STAGES }}</span>
        </span>
      </span>
    </header>

    <p class="cr-lede">
      Every track measures one part of the journey — and pays back into that same
      part. Deepen a system and it rewards you inside itself.
    </p>

    <div class="cr-grid-wrap">
      <div class="cr-grid">
        <ChronicleTrackCard v-for="track in tracks" :key="track.id" :track="track" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════
   CHRONICLE — Kopfzeile plus ein Raster aus acht Bahn-Karten.

   Die Spaltenzahl folgt der Modalbreite, nicht einer festen Zahl. Gemessen mit
   420 px Mindestbreite: drei Spalten auf Full HD (Karten 424 px) und drei auf
   2K (561 px) — das Raster wird also breiter, nicht enger besetzt.

   Drei ist hier die richtige Zahl, nicht bloß die, die herauskommt: bei zwei
   Spalten bräuchten die acht Karten vier Zeilen und der Tab müsste auf Full HD
   rollen (gemessen 553 px Platz gegen 548 px Karten — zu knapp, um es dem
   Zufall zu lassen). Bei vier Spalten fiele die Kartenbreite unter 320 px, und
   dort beginnen Name und Wirkungszeile zu ellipsieren.
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
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 4px 2px 9px;
  border-bottom: 1px solid #2c1806;
}

.cr-head-main {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.cr-head-icon {
  flex-shrink: 0;
  color: var(--rpg-gold-dim);
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

.cr-head-meta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Der Titel ist die Belohnung fürs Sammeln — er steht deshalb neben dem Zähler
   und nicht klein darunter. */
.cr-rank {
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-gold-dim);
}

.cr-count {
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding: 3px 10px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}

.cr-count-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--rpg-gold);
}

.cr-count-sep,
.cr-count-total {
  font-size: 13px;
  color: var(--rpg-text-muted);
}

.cr-lede {
  flex-shrink: 0;
  margin: 9px 2px 11px;
  max-width: 96ch;
  font-size: 13px;
  line-height: 1.4;
  color: var(--rpg-text-muted);
}

/* ─ Kartenraster ─ */
.cr-grid-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.cr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 12px;
  align-content: start;
}

/* Full HD / WUXGA: vier Kartenzeilen sollen möglichst ohne Rollen passen —
   also gibt die Kopfzeile Höhe ab, nicht die Karten ihre Lesbarkeit. */
@media (max-height: 1100px) {
  .cr-root {
    padding: 10px 12px 12px;
  }
  .cr-title {
    font-size: 18px;
  }
  .cr-lede {
    margin: 7px 2px 9px;
  }
  .cr-grid {
    gap: 10px;
  }
}

@media (min-height: 1600px) {
  .cr-title {
    font-size: 24px;
  }
  .cr-rank {
    font-size: 16px;
  }
  .cr-lede {
    font-size: 14px;
  }
  .cr-grid {
    gap: 15px;
  }
}
</style>
