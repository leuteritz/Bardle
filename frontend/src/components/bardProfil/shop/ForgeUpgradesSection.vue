<template>
  <!-- Ein einziges `mouseenter`/`mouseleave` am Rahmen statt eines je Eintrag:
       zwischen zwei Zeilen liegen 8px Lücke, und fünfundvierzig Einzelhandler
       ließen den Spotlight bei jedem Übergang kurz ausgehen — und die
       Reihenfolge dabei jedes Mal auftauen. -->
  <div ref="wrapEl" class="fu-wrap" @mouseenter="freezeOrder" @mouseleave="leaveList">
    <!-- ══ Die Töpfe ════════════════════════════════════════════════
         Ready · Saving up · Next up · und zuletzt das eingeklappte Archiv. Ein
         leerer Topf fällt ganz weg.

         Der Ringfilter, der bis zum Umbau hier oben klebte, steht jetzt in der
         Kopfleiste über dem Baum (`ForgeToolbar`) — dort hat er die doppelte
         Breite und Platz für einen Fortschrittsring je Ring. -->
    <section
      v-for="(section, sectionIndex) in sections"
      :key="section.id"
      class="fu-group"
      :style="{ '--group-c': section.accent }"
    >
      <!-- Das Archiv trägt eine Schaltzeile statt einer Überschrift — es ist
           das Einzige hier, was der Spieler zumachen kann. -->
      <button
        v-if="section.id === 'grown'"
        class="fu-archive-toggle"
        :class="{ 'fu-archive-toggle--open': archiveOpen }"
        :aria-expanded="archiveOpen"
        @click="archiveOpen = !archiveOpen"
      >
        <span class="fu-archive-chevron">{{ archiveChevron }}</span>
        <Icon :icon="FORGE_UPGRADE_ARCHIVE_ICON" width="17" height="17" class="fu-archive-ico" />
        <span class="fu-archive-num">{{ section.entries.length }}</span>
        <span class="fu-archive-label">{{ FORGE_UPGRADE_ARCHIVE_LABEL }}</span>
        <span class="fu-archive-hint">{{ section.hint }}</span>
      </button>

      <header v-else class="fu-head">
        <Icon :icon="section.icon" width="20" height="20" class="fu-head-ico" />
        <span class="fu-head-title">{{ section.title }}</span>
        <span class="fu-head-num">{{ section.entries.length }}</span>
        <span class="fu-head-hint">{{ section.hint }}</span>
        <!-- Die Bedienungsanleitung steht genau EINMAL, am obersten Kopf. -->
        <span v-if="sectionIndex === 0" class="fu-head-tip">{{ FORGE_QUEUE_HEAD_HINT }}</span>
      </header>

      <template v-if="section.id !== 'grown' || archiveOpen">
        <ForgeQueueRow
          v-for="entry in section.entries"
          :key="entry.id"
          :entry="entry"
          :flashed="flashedId === entry.id"
          @buy="grow"
        />
      </template>
    </section>

    <!-- Sucht der Spieler etwas, das es nicht gibt, sagt eine leere Liste sonst
         „nichts kaufbar" statt „nichts gefunden". -->
    <div v-if="sections.length === 0" class="fu-none">
      <Icon :icon="FORGE_SEARCH_ICON" width="26" height="26" class="fu-none-ico" />
      <span class="fu-none-text">{{ hasFilter ? 'Nothing matches that filter.' : 'Nothing to grow yet.' }}</span>
      <button v-if="hasFilter" class="fu-none-reset" @click="resetForgeFilter">Clear filter</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Der erste Abschnitt der Forge-Spalte: alles Kaufbare des Sternbaums als
 * Liste.
 *
 * Alle Zahlen kommen aus `useForgeUpgrades()`, derselben Quelle, aus der der
 * Baum links liest: ein Kauf hier färbt den Kreis dort im selben Frame, weil
 * beide Seiten dieselben Pinia-Getter lesen und nichts zwischenspeichern.
 *
 * Gegliedert wird nach dem, was der Spieler TUN kann (`FORGE_UPGRADE_BUCKETS`),
 * nicht nach dem Ring — die Herleitung steht dort.
 *
 * Was ein Eintrag AUSFÜHRLICH zeigt, steht seit dem Umbau nicht mehr in der
 * Liste, sondern im Detailkopf darüber (`ForgeNodeDetail`): fünfundvierzig
 * volle Karten untereinander waren dieselbe Fläche fünfundvierzig Mal, und
 * keine davon gross genug, um auf einem 4K-Schirm etwas herzumachen. Hier
 * bleibt, was man beim Überfliegen braucht — eine Zeile je Eintrag.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { forgeUpgradeBucket, useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useForgeFilter } from '@/composables/ui/useForgeFilter'
import ForgeQueueRow from './ForgeQueueRow.vue'
import type { ForgeUpgradeBucketId, ForgeUpgradeEntry } from '@/types'
import {
  FORGE_UPGRADE_BUCKETS,
  FORGE_UPGRADE_ARCHIVE_LABEL,
  FORGE_UPGRADE_ARCHIVE_HINT,
  FORGE_UPGRADE_ARCHIVE_ICON,
  FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED,
  FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN,
  FORGE_CARD_FLASH_MS,
  FORGE_SPOTLIGHT_SCROLL_DELAY_MS,
  FORGE_QUEUE_HEAD_HINT,
  FORGE_SEARCH_ICON,
} from '@/config/constants'

const { upgradeEntries, entryById, buyUpgrade } = useForgeUpgrades()
const { treeHoverId, setListHover } = useForgeSpotlight()
const { searchQuery, activeTier, hasFilter, matchesForgeFilter, resetForgeFilter } = useForgeFilter()

// ── Eingefrorene Reihenfolge ─────────────────────────────────────────────────
/**
 * Warum die Liste unter dem Mauszeiger stillsteht.
 *
 * „Kaufbares ganz oben" und „die Chimes ticken jede Sekunde" vertragen sich
 * nicht von selbst: sobald der Vorrat eine Schwelle überschreitet, wechselt
 * eine Zeile den Topf und alles darunter rutscht — und zwar genau, während man
 * auf einen Knopf zielt.
 *
 * Stattdessen friert die ZUORDNUNG ein, sobald der Zeiger die Liste betritt,
 * und rechnet beim Verlassen neu. Was ein Eintrag anzeigt — Rahmen, Kosten,
 * Knopfzustand — folgt weiter live; nur wo er steht, hält still.
 */
const frozenBuckets = ref<Map<string, ForgeUpgradeBucketId> | null>(null)

function freezeOrder(): void {
  frozenBuckets.value = new Map(
    upgradeEntries.value.map((entry) => [entry.id, forgeUpgradeBucket(entry)]),
  )
}

function leaveList(): void {
  frozenBuckets.value = null
  setListHover(null)
}

function bucketOf(entry: ForgeUpgradeEntry): ForgeUpgradeBucketId {
  return frozenBuckets.value?.get(entry.id) ?? forgeUpgradeBucket(entry)
}

// ── Die Abschnitte ───────────────────────────────────────────────────────────
interface UpgradeSection {
  id: ForgeUpgradeBucketId
  title: string
  hint: string
  icon: string
  accent: string
  entries: ForgeUpgradeEntry[]
}

const ARCHIVE_SECTION = {
  id: 'grown' as const,
  title: FORGE_UPGRADE_ARCHIVE_LABEL,
  hint: FORGE_UPGRADE_ARCHIVE_HINT,
  icon: FORGE_UPGRADE_ARCHIVE_ICON,
  accent: '#4a8a28',
}

const archiveOpen = ref(false)

const archiveChevron = computed(() =>
  archiveOpen.value ? FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN : FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED,
)

const sections = computed<UpgradeSection[]>(() => {
  const pots: Record<ForgeUpgradeBucketId, ForgeUpgradeEntry[]> = {
    ready: [],
    reach: [],
    next: [],
    grown: [],
  }

  for (const entry of upgradeEntries.value) {
    if (!matchesForgeFilter(entry)) continue
    pots[bucketOf(entry)].push(entry)
  }

  // Nur „Next up" wird umsortiert — dort ist die Nähe zur Freischaltung die
  // Aussage. Die anderen drei behalten die Katalogreihenfolge des Baums
  // (Ray → Branch → Leaf → Bough), damit innerhalb eines Topfes nichts wandert.
  pots.next.sort((a, b) => b.unlockProgress - a.unlockProgress)

  return [...FORGE_UPGRADE_BUCKETS, ARCHIVE_SECTION]
    .map((section) => ({ ...section, entries: pots[section.id] }))
    .filter((section) => section.entries.length > 0)
})

/** Welche Zeile gerade quittiert. Rein visuell, daher reale Zeit. */
const flashedId = ref<string | null>(null)

function grow(id: string): void {
  if (!buyUpgrade(id)) return
  flashedId.value = id
  setTimeout(() => {
    if (flashedId.value === id) flashedId.value = null
  }, FORGE_CARD_FLASH_MS)
}

const wrapEl = ref<HTMLElement | null>(null)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Ein Knoten, auf den der Spieler LINKS zeigt, muss rechts auch auffindbar
 * sein. Seit die Liste filtert, sucht und ein Archiv hat, kann seine Zeile
 * gerade ausgeblendet sein — `querySelector` fände dann nichts und es passierte
 * sichtbar gar nichts. Ring, Suchwort und Archiv sind reine Ansichtszustände;
 * sie nachzuziehen ist billiger als ein Zeigen, das ins Leere läuft.
 */
function revealForSpotlight(id: string): void {
  const entry = entryById.value.get(id)
  if (!entry) return
  if (activeTier.value !== 'all' && entry.tier !== activeTier.value) activeTier.value = 'all'
  if (!matchesForgeFilter(entry)) searchQuery.value = ''
  if (bucketOf(entry) === 'grown') archiveOpen.value = true
}

/**
 * Zeigt der Spieler LINKS auf einen Knoten, rollt die Liste dessen Zeile nur
 * dann ins Bild, wenn sie gerade nicht darin steht: `block: 'nearest'` tut von
 * sich aus nichts, solange das Element vollständig sichtbar ist, und nimmt
 * sonst den kürzesten Weg.
 *
 * NUR vom Baum aus. Die Zeile unter dem Zeiger ist per Definition sichtbar, und
 * ein Rollen unter dem Zeiger schöbe die nächste Zeile darunter — der Hover
 * spränge weiter und löste das nächste Rollen aus.
 *
 * Verzögert, damit ein Schwenk über den Baum EINEN Rollbefehl absetzt statt
 * fünfundvierzig. Die Wartezeit deckt zugleich den Neuaufbau ab, den
 * `revealForSpotlight()` ausgelöst haben kann. Rein visuell, daher reale Zeit.
 */
watch(treeHoverId, (id) => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  if (id === null) return
  revealForSpotlight(id)
  scrollTimer = setTimeout(() => {
    wrapEl.value
      ?.querySelector<HTMLElement>(`[data-forge-id="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, FORGE_SPOTLIGHT_SCROLL_DELAY_MS)
})

/* Der Abschnittswechsel räumt diese Sektion per `v-if` ab — ein Zeiger, der
   dabei auf einer Zeile stand, ließe den Knoten am Baum sonst leuchten bleiben,
   und die eingefrorene Reihenfolge überlebte den Wechsel. */
onUnmounted(() => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  frozenBuckets.value = null
  setListHover(null)
})
</script>

<style scoped>
.fu-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fu-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ══════════════════════════════════════════════════
   ABSCHNITTSKOPF
   Derselbe Strich wie die Tier-Köpfe im Champion-Shop: getönt an der Kante,
   nach rechts auslaufend. Er trägt den Topf, nicht den Ring.
══════════════════════════════════════════════════ */
.fu-head {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 8px 2px 9px;
  margin-top: 5px;
}

.fu-head::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--group-c, #c89040),
    color-mix(in srgb, var(--group-c, #c89040) 35%, transparent) 55%,
    transparent
  );
}

.fu-group:first-of-type .fu-head {
  margin-top: 0;
  padding-top: 0;
}

.fu-head-ico {
  align-self: center;
  flex-shrink: 0;
  color: var(--group-c, #c89040);
}

.fu-head-title {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--group-c, #c89040);
  white-space: nowrap;
}

.fu-head-num {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.4);
  color: var(--group-c, #c89040);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.fu-head-hint {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Steht ganz rechts und gibt als Erstes nach, wenn die Spalte eng wird — die
   Zahl links davon ist wichtiger als der Hinweis. */
.fu-head-tip {
  flex-shrink: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 700;
  text-align: right;
  color: rgba(255, 255, 255, 0.24);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ══════════════════════════════════════════════════
   ARCHIV
══════════════════════════════════════════════════ */
.fu-archive-toggle {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  margin-top: 5px;
  padding: 10px 13px;
  border: 1px solid #2a1a08;
  border-radius: 4px;
  background: #16140e;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.fu-archive-toggle:hover {
  border-color: #3e200a;
  background: #1a1710;
}

.fu-archive-toggle--open {
  border-color: #3e200a;
}

.fu-archive-chevron {
  flex-shrink: 0;
  width: 11px;
  color: rgba(200, 144, 64, 0.55);
  font-size: 13px;
  line-height: 1;
}

.fu-archive-ico {
  flex-shrink: 0;
  color: var(--group-c, #4a8a28);
}

.fu-archive-num {
  flex-shrink: 0;
  color: rgba(232, 220, 192, 0.75);
  font-size: 14px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.fu-archive-label {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.6);
}

.fu-archive-hint {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.26);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ══════════════════════════════════════════════════
   LEERE LISTE
══════════════════════════════════════════════════ */
.fu-none {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 20px 16px;
  border: 1px solid #2a1a08;
  border-radius: 4px;
  background: #16140e;
}

.fu-none-ico {
  flex-shrink: 0;
  color: rgba(200, 144, 64, 0.35);
}

.fu-none-text {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.45);
}

.fu-none-reset {
  flex-shrink: 0;
  padding: 6px 11px;
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1e1006;
  color: #e8c040;
  font-family: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.fu-none-reset:hover {
  border-color: #c89040;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fu-wrap {
    gap: 8px;
  }

  .fu-group {
    gap: 7px;
  }

  .fu-head {
    padding: 6px 2px 7px;
    margin-top: 3px;
  }

  .fu-group:first-of-type .fu-head {
    margin-top: 0;
    padding-top: 0;
  }

  .fu-archive-toggle {
    margin-top: 3px;
    padding: 8px 12px;
  }
}
</style>
