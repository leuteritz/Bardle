<script setup lang="ts">
/**
 * Alles Lernbare des Meep-Baums als Liste — der Körper der Detailschiene.
 *
 * Alle Zahlen kommen aus `useMeepSkills()`, derselben Quelle, aus der die
 * Orbit-Bühne links liest: ein Kauf hier färbt den Kreis dort im selben Frame,
 * weil beide Seiten dieselben Pinia-Getter lesen und nichts zwischenspeichern.
 *
 * Gegliedert wird nach dem, was der Spieler TUN kann (`MEEP_SKILL_BUCKETS`),
 * nicht nach Zweig — nach Zweig gegliedert stünde das Kaufbare über fünf
 * Überschriften verstreut. Der Zweig bleibt als Zeile auf der Karte.
 *
 * Ganz oben steht `fresh`: was gerade erst aufgegangen ist und der Spieler noch
 * nie gesehen hat. Das ist „die neusten oben", und es kostet kein Feld im
 * Spielstand — die Unterscheidung liest `meepTreeStore.acknowledged`, das die
 * Notify-Abzeichen ohnehin schon führt.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { meepSkillBucket, useMeepSkills } from '@/composables/ui/useMeepSkills'
import { useMeepSpotlight } from '@/composables/ui/useMeepSpotlight'
import { useActionToast } from '@/composables/ui/useActionToast'
import MeepSkillCard from './MeepSkillCard.vue'
import MeepSkillTooltip from './MeepSkillTooltip.vue'
import type { MeepSkillBucketId, MeepSkillEntry, MeepSkillTipAnchor } from '@/types'
import {
  MEEP_SKILL_ALL_DONE,
  MEEP_SKILL_ALL_DONE_ICON,
  MEEP_SKILL_ARCHIVE_CHEVRON_CLOSED,
  MEEP_SKILL_ARCHIVE_CHEVRON_OPEN,
  MEEP_SKILL_ARCHIVE_HINT,
  MEEP_SKILL_ARCHIVE_ICON,
  MEEP_SKILL_ARCHIVE_LABEL,
  MEEP_SKILL_ARCHIVE_SEALED_LABEL,
  MEEP_SKILL_BUCKETS,
  MEEP_SKILL_FLASH_MS,
  MEEP_SPOTLIGHT_SCROLL_DELAY_MS,
} from '@/config/constants'

const props = defineProps<{ selectedId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()

const { skillEntries, entryById, buySkill } = useMeepSkills()
const { orbitHoverId, listHoverId, setListHover } = useMeepSpotlight()
const { showToast } = useActionToast()

/** Die beiden Zustände, an denen nichts mehr zu entscheiden ist. */
const ARCHIVE_BUCKETS: readonly MeepSkillBucketId[] = ['learned', 'sealed']

// ── Eingefrorene Reihenfolge ─────────────────────────────────────────────────
/**
 * Warum die Liste unter dem Mauszeiger stillsteht.
 *
 * „Frisch aufgegangenes ganz oben" und „Überfahren heisst angesehen" vertragen
 * sich nicht von selbst: in dem Moment, in dem der Zeiger eine Karte aus
 * NEWLY UNLOCKED berührt, quittiert `acknowledgeNode` sie, ihr Topf wechselt
 * auf READY TO LEARN, und sie rutscht mitsamt ihrem Lernknopf unter der Hand
 * weg. Derselbe Effekt entsteht, wenn der Meep-Bestand eine Schwelle
 * überschreitet.
 *
 * Stattdessen friert die ZUORDNUNG ein, sobald der Zeiger die Liste betritt,
 * und rechnet beim Verlassen neu. Was eine Karte anzeigt — Preis, Knopfzustand,
 * Rahmen — folgt weiter live; nur wo sie steht, hält still.
 *
 * Muster `frozenBuckets` in `ForgeUpgradesSection`.
 */
const frozenBuckets = ref<Map<string, MeepSkillBucketId> | null>(null)

function freezeOrder(): void {
  frozenBuckets.value = new Map(skillEntries.value.map((e) => [e.id, meepSkillBucket(e)]))
}

function leaveList(): void {
  frozenBuckets.value = null
  setListHover(null)
}

function bucketOf(entry: MeepSkillEntry): MeepSkillBucketId {
  return frozenBuckets.value?.get(entry.id) ?? meepSkillBucket(entry)
}

// ── Die Abschnitte ───────────────────────────────────────────────────────────
interface SkillSection {
  id: MeepSkillBucketId
  title: string
  hint: string
  icon: string
  accent: string
  entries: MeepSkillEntry[]
}

/**
 * Innerhalb eines Topfs steht der HÖHERE Rang oben.
 *
 * Auch das ist „die neusten oben": Rang 5 ist der jüngste Fortschritt eines
 * Zweigs, Rang 1 das, was seit dem ersten Aufbruch dasteht. Bei gleichem Rang
 * entscheidet der Preis, dann die Katalogreihenfolge — beides nur, damit die
 * Reihenfolge überhaupt eindeutig ist und nicht bei jeder Neuberechnung
 * wechselt.
 */
function byNewestFirst(a: MeepSkillEntry, b: MeepSkillEntry): number {
  if (a.rank !== b.rank) return b.rank - a.rank
  return a.cost - b.cost
}

const sections = computed<SkillSection[]>(() => {
  const pots = new Map<MeepSkillBucketId, MeepSkillEntry[]>()
  for (const entry of skillEntries.value) {
    const bucket = bucketOf(entry)
    const pot = pots.get(bucket)
    if (pot) pot.push(entry)
    else pots.set(bucket, [entry])
  }

  return MEEP_SKILL_BUCKETS.map((def) => ({
    ...def,
    entries: (pots.get(def.id) ?? []).slice().sort(byNewestFirst),
  })).filter((section) => section.entries.length > 0)
})

/** Gelerntes und Versiegeltes in EINER Schublade — an beidem ist nichts mehr
 *  zu entscheiden, und zwei gleich aussehende Schaltzeilen untereinander lesen
 *  sich als eine. Gelerntes steht darin oben. */
const archiveEntries = computed(() => {
  const learned: MeepSkillEntry[] = []
  const sealed: MeepSkillEntry[] = []
  for (const entry of skillEntries.value) {
    const bucket = bucketOf(entry)
    if (bucket === 'learned') learned.push(entry)
    else if (bucket === 'sealed') sealed.push(entry)
  }
  learned.sort(byNewestFirst)
  sealed.sort(byNewestFirst)
  return { learned, sealed, all: [...learned, ...sealed] }
})

const archiveOpen = ref(false)

const archiveChevron = computed(() =>
  archiveOpen.value ? MEEP_SKILL_ARCHIVE_CHEVRON_OPEN : MEEP_SKILL_ARCHIVE_CHEVRON_CLOSED,
)

function toggleArchive(): void {
  archiveOpen.value = !archiveOpen.value
}

// ── Kaufen ───────────────────────────────────────────────────────────────────
/** Welche Karte gerade quittiert. Rein visuell, daher reale Zeit. */
const flashedId = ref<string | null>(null)

function learn(id: string): void {
  const entry = entryById.value.get(id)
  if (!buySkill(id)) return
  flashedId.value = id
  if (entry) showToast(`${entry.name} learned!`, 'perk')
  setTimeout(() => {
    if (flashedId.value === id) flashedId.value = null
  }, MEEP_SKILL_FLASH_MS)
}

// ── Anspringen ───────────────────────────────────────────────────────────────
const wrapEl = ref<HTMLElement | null>(null)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Zeigt oder klickt der Spieler LINKS auf einen Knoten, rollt die Liste dessen
 * Karte nur dann ins Bild, wenn sie gerade nicht darin steht: `block: 'nearest'`
 * tut von sich aus nichts, solange das Element vollständig sichtbar ist, und
 * nimmt sonst den kürzesten Weg.
 *
 * NUR von der Bühne aus. Die Karte unter dem Zeiger ist per Definition sichtbar,
 * und ein Rollen unter dem Zeiger schöbe die nächste Karte darunter — der Hover
 * spränge weiter und löste das nächste Rollen aus.
 *
 * Verzögert, damit ein Schwenk über die Bühne EINEN Rollbefehl absetzt statt
 * dreissig. Die Wartezeit deckt zugleich das Aufklappen des Archivs ab. Rein
 * visuell, daher reale Zeit.
 */
function revealAndScroll(id: string): void {
  const entry = entryById.value.get(id)
  if (entry && ARCHIVE_BUCKETS.includes(bucketOf(entry))) archiveOpen.value = true
  scrollTimer = setTimeout(() => {
    wrapEl.value
      ?.querySelector<HTMLElement>(`[data-meep-id="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, MEEP_SPOTLIGHT_SCROLL_DELAY_MS)
}

watch(orbitHoverId, (id) => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  if (id === null) return
  revealAndScroll(id)
})

/* Ein Klick auf der Bühne ist die absichtlichere Geste als ein Hover — er
   springt die Karte auch dann an, wenn der Zeiger inzwischen weitergewandert
   ist. */
watch(
  () => props.selectedId,
  (id) => {
    if (scrollTimer !== null) clearTimeout(scrollTimer)
    if (id === null) return
    revealAndScroll(id)
  },
)

// ── Das schwebende Kärtchen ──────────────────────────────────────────────────
/**
 * Wo es hängt. Gemessen wird bei jedem HOVER-WECHSEL, nie pro Frame — und nur
 * die drei Kanten, die das Kärtchen braucht (`MeepSkillTipAnchor`).
 *
 * `getBoundingClientRect()` ist hier richtig und nicht teuer: der Zeiger
 * wechselt die Karte ein paar Mal je Sekunde, nicht sechzig Mal.
 */
const tipAnchor = ref<MeepSkillTipAnchor | null>(null)

const tipEntry = computed<MeepSkillEntry | null>(() =>
  listHoverId.value === null ? null : (entryById.value.get(listHoverId.value) ?? null),
)

watch(listHoverId, (id) => {
  if (id === null) {
    tipAnchor.value = null
    return
  }
  const card = wrapEl.value?.querySelector<HTMLElement>(`[data-meep-id="${id}"]`)
  if (!card) {
    tipAnchor.value = null
    return
  }
  const rect = card.getBoundingClientRect()
  tipAnchor.value = { top: rect.top, bottom: rect.bottom, left: rect.left }
})

onUnmounted(() => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  frozenBuckets.value = null
  setListHover(null)
})
</script>

<template>
  <!-- Ein einziges `mouseenter`/`mouseleave` am Rahmen statt eines je Karte:
       zwischen zwei Karten liegen 9px Lücke, und dreissig Einzelhandler liessen
       die eingefrorene Reihenfolge bei jedem Übergang kurz auftauen. -->
  <div ref="wrapEl" class="msl-wrap" @mouseenter="freezeOrder" @mouseleave="leaveList">
    <section
      v-for="section in sections"
      :key="section.id"
      class="msl-group"
      :style="{ '--group-c': section.accent }"
    >
      <header class="msl-head">
        <Icon :icon="section.icon" width="20" height="20" class="msl-head-ico" />
        <span class="msl-head-title">{{ section.title }}</span>
        <span class="msl-head-num">{{ section.entries.length }}</span>
        <span class="msl-head-hint">{{ section.hint }}</span>
      </header>

      <MeepSkillCard
        v-for="entry in section.entries"
        :key="entry.id"
        :entry="entry"
        :bucket="section.id"
        :flashed="flashedId === entry.id"
        @buy="learn"
        @select="emit('select', $event)"
      />
    </section>

    <!-- ── Das Archiv ──
         Eine Schaltzeile statt einer Überschrift — es ist das Einzige hier, was
         der Spieler zumachen kann. -->
    <template v-if="archiveEntries.all.length > 0">
      <button
        class="msl-archive-toggle"
        :class="{ 'msl-archive-toggle--open': archiveOpen }"
        :aria-expanded="archiveOpen"
        @click="toggleArchive"
      >
        <span class="msl-archive-chevron">{{ archiveChevron }}</span>
        <Icon :icon="MEEP_SKILL_ARCHIVE_ICON" width="17" height="17" class="msl-archive-ico" />
        <span class="msl-archive-num">{{ archiveEntries.learned.length }}</span>
        <span class="msl-archive-label">{{ MEEP_SKILL_ARCHIVE_LABEL }}</span>
        <template v-if="archiveEntries.sealed.length > 0">
          <span class="msl-archive-num">{{ archiveEntries.sealed.length }}</span>
          <span class="msl-archive-label">{{ MEEP_SKILL_ARCHIVE_SEALED_LABEL }}</span>
        </template>
        <span class="msl-archive-hint">{{ MEEP_SKILL_ARCHIVE_HINT }}</span>
      </button>

      <MeepSkillCard
        v-for="entry in archiveOpen ? archiveEntries.all : []"
        :key="entry.id"
        :entry="entry"
        :bucket="bucketOf(entry)"
        :flashed="false"
        @buy="learn"
        @select="emit('select', $event)"
      />
    </template>

    <!-- Ein fertiger Baum hat keinen offenen Topf mehr — ohne diesen Satz
         stünde dort nur das zugeklappte Archiv und sähe nach einem Fehler aus. -->
    <div v-if="sections.length === 0" class="msl-none">
      <Icon :icon="MEEP_SKILL_ALL_DONE_ICON" width="26" height="26" class="msl-none-ico" />
      <span class="msl-none-text">{{ MEEP_SKILL_ALL_DONE }}</span>
    </div>
  </div>

  <!-- Die volle Auskunft zur Karte unter dem Zeiger. Geschwister der Liste und
       `position: fixed` — läge es IN ihr, schöbe sein Erscheinen sie unter dem
       Zeiger weg, und der Hover ginge im selben Zug wieder aus. -->
  <MeepSkillTooltip :entry="tipEntry" :anchor="tipAnchor" />
</template>

<style scoped>
.msl-wrap {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.msl-group {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

/* ── Topfkopf ──
   Derselbe auslaufende Strich wie über den Töpfen der Shop-Liste (.fu-head):
   getönt an der Kante, nach rechts verlaufend. Hier trägt er die Topffarbe. */
.msl-head {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 8px 2px 9px;
  margin-top: 5px;
}

.msl-head::after {
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

.msl-group:first-of-type .msl-head {
  margin-top: 0;
  padding-top: 0;
}

.msl-head-ico {
  align-self: center;
  flex-shrink: 0;
  color: var(--group-c, #c89040);
}

.msl-head-title {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--group-c, #c89040);
  white-space: nowrap;
}

.msl-head-num {
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

.msl-head-hint {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Archiv-Schaltzeile ── */
.msl-archive-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 5px;
  padding: 10px 13px;
  border: 1px solid #2a1a08;
  border-radius: 4px;
  background: #16140e;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.msl-archive-toggle:hover {
  border-color: #3e200a;
  background: #1a1710;
}

.msl-archive-toggle--open {
  border-color: #3e200a;
}

.msl-archive-chevron {
  flex-shrink: 0;
  width: 11px;
  color: rgba(200, 144, 64, 0.55);
  font-size: 13px;
  line-height: 1;
}

.msl-archive-ico {
  flex-shrink: 0;
  color: rgba(74, 138, 40, 0.75);
}

.msl-archive-num {
  flex-shrink: 0;
  color: rgba(232, 220, 192, 0.75);
  font-size: 14px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.msl-archive-label {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.6);
}

.msl-archive-hint {
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

/* ── Der fertige Baum ── */
.msl-none {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 20px 16px;
  border: 1px solid #2a1a08;
  border-radius: 4px;
  background: #16140e;
}

.msl-none-ico {
  flex-shrink: 0;
  color: rgba(232, 192, 64, 0.6);
}

.msl-none-text {
  font-size: 14px;
  font-weight: 800;
  color: rgba(232, 220, 192, 0.75);
}

@media (max-height: 1100px) {
  .msl-wrap,
  .msl-group {
    gap: 8px;
  }

  .msl-head {
    padding: 6px 2px 7px;
    margin-top: 3px;
  }

  .msl-archive-toggle {
    margin-top: 3px;
    padding: 8px 12px;
  }
}
</style>
