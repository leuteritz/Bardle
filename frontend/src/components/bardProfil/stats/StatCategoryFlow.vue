<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { StatCategoryView, StatEntry } from '@/types'

const props = defineProps<{
  categories: StatCategoryView[]
  /** Free-text filter coming from the panel header search box. */
  query: string
}>()

const searching = computed(() => props.query.trim().length > 0)
const hitCategories = computed(() => props.categories.filter((c) => c.stats.length > 0))

interface Hit {
  cat: StatCategoryView
  stat: StatEntry
  /** Erste Kachel ihrer Kategorie — sie trägt die Marke, auf die die Leiste rollt. */
  first: boolean
}

const hits = computed<Hit[]>(() =>
  hitCategories.value.flatMap((cat) => cat.stats.map((stat, i) => ({ cat, stat, first: i === 0 }))),
)

/** Kopfzahlen zuerst, dann der Rest — die Reihenfolge im Katalog bleibt sonst. */
function ordered(cat: StatCategoryView): StatEntry[] {
  return [...cat.stats.filter((s) => s.highlight), ...cat.stats.filter((s) => !s.highlight)]
}
</script>

<template>
  <div v-if="searching && hits.length === 0" class="st-empty">
    <Icon icon="lucide:search-x" width="30" height="30" class="st-empty-ico" aria-hidden="true" />
    <span>No stat matches “{{ query }}”</span>
  </div>

  <!-- Trefferansicht: ein flaches Raster über alle Kategorien, nach Kategorie sortiert -->
  <div v-else-if="searching" class="st-grid st-grid--hits">
    <div
      v-for="h in hits"
      :key="`${h.cat.id}-${h.stat.key}`"
      class="st-cell"
      :class="{ 'is-lead': h.stat.highlight }"
      :data-cat="h.first ? h.cat.id : undefined"
      :style="{ '--accent': h.cat.accent }"
      v-tip="h.stat.hint ?? h.stat.label"
    >
      <span class="st-cell-val">{{ h.stat.value }}</span>
      <span class="st-cell-lbl">{{ h.stat.label }}</span>
      <span class="st-cell-cat">
        <i class="st-cell-dot" aria-hidden="true" />
        {{ h.cat.label }}
      </span>
    </div>
  </div>

  <template v-else>
    <section
      v-for="cat in categories"
      :key="cat.id"
      class="st-band"
      :data-cat="cat.id"
      :style="{ '--accent': cat.accent }"
    >
      <header class="st-band-head">
        <Icon :icon="cat.icon" class="st-band-ico" width="26" height="26" aria-hidden="true" />
        <span class="st-band-name" v-tip="cat.blurb">{{ cat.label }}</span>
        <span v-ink-center class="st-band-count">{{ cat.totalCount }}</span>
        <span class="st-band-rule" aria-hidden="true" />
      </header>

      <div class="st-grid">
        <div
          v-for="stat in ordered(cat)"
          :key="stat.key"
          class="st-cell"
          :class="{ 'is-lead': stat.highlight }"
          v-tip="stat.hint ?? stat.label"
        >
          <span class="st-cell-val">{{ stat.value }}</span>
          <span class="st-cell-lbl">{{ stat.label }}</span>
        </div>
      </div>
    </section>
  </template>
</template>

<style scoped>
/* ── ein Band je Kategorie ──────────────────────────────────────────
   Volle Breite statt nebeneinander gestellter Kategorien: mehrspaltig gesetzt
   liest sich der Katalog Spalte für Spalte, und die Markierung in der Leiste
   verlöre ihren Sinn. */
.st-band {
  min-width: 0;
}
.st-band + .st-band {
  margin-top: 14px;
}

.st-band-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 8px;
  /* deckend, sonst laufen die Kacheln sichtbar unter dem Kopf durch */
  background: #111008;
}

.st-band-ico {
  flex-shrink: 0;
  color: var(--accent);
}

.st-band-name {
  flex-shrink: 0;
  max-width: 60%;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
}

.st-band-rule {
  flex: 1;
  height: 1px;
  min-width: 0;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--accent) 35%, transparent),
    #241a0c 45%,
    #241a0c
  );
}

.st-band-count {
  flex-shrink: 0;
  min-width: 34px;
  padding: 2px 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, #141008);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, #241a0c);
  border-radius: 4px;
}

/* ── die Werte ──────────────────────────────────────────────────────
   Zahl zuerst, Beschriftung darunter: bei 300 Werten wird nach Zahlen gesucht,
   nicht nach Sätzen. */
.st-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}

.st-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 9px 11px;
  background: #141008;
  border: 1px solid #241a0c;
  border-radius: 4px;
}
.st-cell:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, #241a0c);
}

/* Kopfzahl einer Kategorie: eigene Kante, eigene Farbe, größere Ziffer */
.st-cell.is-lead {
  padding-left: 10px;
  background: #1a1008;
  border-left: 2px solid var(--accent);
}

.st-cell-val {
  font-size: 19px;
  font-weight: 900;
  line-height: 1.05;
  color: #f0e6c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-cell.is-lead .st-cell-val {
  font-size: 22px;
  color: var(--accent);
}

.st-cell-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7a58;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Herkunftsmarke — nur in der Trefferansicht, wo die Bandköpfe fehlen */
.st-cell-cat {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b5a34;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-cell-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.st-grid--hits {
  padding-top: 12px;
}

.st-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 0;
  font-size: 14px;
  letter-spacing: 0.06em;
  color: #6b5a34;
}
.st-empty-ico {
  color: #5c3310;
}

@media (max-height: 1100px) {
  .st-band + .st-band {
    margin-top: 11px;
  }
  .st-band-head {
    gap: 8px;
    padding: 9px 0 6px;
  }
  .st-band-name {
    font-size: 19px;
  }
  .st-grid {
    grid-template-columns: repeat(auto-fill, minmax(186px, 1fr));
    gap: 6px;
  }
  .st-cell {
    padding: 7px 9px;
  }
  .st-cell-val {
    font-size: 17px;
  }
  .st-cell.is-lead .st-cell-val {
    font-size: 20px;
  }
}
</style>
