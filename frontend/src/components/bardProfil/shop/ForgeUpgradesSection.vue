<template>
  <!-- Ein einziges `mouseenter`/`mouseleave` am Rahmen statt eines je Eintrag:
       zwischen zwei Karten liegen 11px Lücke, und fünfundvierzig Einzelhandler
       ließen den Spotlight bei jedem Übergang kurz ausgehen — und die
       Reihenfolge dabei jedes Mal auftauen. -->
  <div ref="wrapEl" class="fu-wrap" @mouseenter="freezeOrder" @mouseleave="leaveList">
    <!-- ══ Ringfilter ═══════════════════════════════════════════════
         Die vier Ringe sind keine Abschnitte mehr, sondern eine Auswahl. Sie
         klebt oben, weil die Liste im Spätspiel fünfundvierzig Einträge lang
         ist und der Filter sonst nach dem ersten Bildschirm weg wäre. -->
    <nav class="fu-filters" aria-label="Filter upgrades by ring">
      <!-- Ohne Zähler: „All" ist kein Ring, sondern das Aufheben der Auswahl —
           und die vier Ringzahlen daneben summieren sich ohnehin sichtbar. Die
           fünf Chips müssen in EINE Zeile passen (gemessen: 438px innen bei
           Full HD), und ein fünfter Zähler kostet dort 30 davon. -->
      <button
        class="fu-filter"
        :class="{ 'fu-filter--on': activeTier === 'all' }"
        @click="activeTier = 'all'"
      >
        <span class="fu-filter-label">{{ FORGE_UPGRADE_FILTER_ALL_LABEL }}</span>
      </button>
      <button
        v-for="chip in filterChips"
        :key="chip.tier"
        class="fu-filter"
        :class="{ 'fu-filter--on': activeTier === chip.tier, 'fu-filter--spent': chip.open === 0 }"
        :style="{ '--chip-c': chip.accent }"
        :title="chip.title"
        @click="activeTier = chip.tier"
      >
        <!-- Der endlose Ring trägt sein Zeichen statt eines Glyphs: bei 12px
             wäre `game-icons:infinity` ein grauer Fleck. -->
        <span v-if="chip.tier === 'bough'" class="fu-filter-endless">
          {{ FORGE_ENDLESS_SYMBOL }}
        </span>
        <span class="fu-filter-label">{{ chip.shortTitle }}</span>
        <span class="fu-filter-num">{{ chip.open }}</span>
      </button>
    </nav>

    <!-- ══ Die Töpfe ════════════════════════════════════════════════
         Ready · Saving up · Next up · und zuletzt das eingeklappte Archiv. Ein
         leerer Topf fällt ganz weg. -->
    <section
      v-for="section in sections"
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
      </header>

      <!-- Die Renderform folgt dem ECHTEN Zustand, nicht dem Topf. Beides
           läuft nur solange auseinander, wie die Reihenfolge eingefroren ist:
           wer eine Karte fertig kauft, sieht sie an Ort und Stelle zur
           MAX-Zeile werden und erst nach dem Verlassen der Liste ins Archiv
           wandern. Sie unter dem Zeiger wegspringen zu lassen wäre schlimmer. -->
      <template v-if="section.id !== 'grown' || archiveOpen">
        <template v-for="entry in section.entries" :key="entry.id">
          <!-- Gesperrt: ein Einzeiler mit dem Grund und dem Weg dorthin. Eine
               volle Karte für etwas, das man nicht kaufen kann, verdrängt nur
               die, die man kaufen kann. -->
          <div
            v-if="entry.state === 'locked'"
            class="fc-row fc-row--locked"
            :class="spotClasses(entry.id)"
            :style="{ '--node-c': entry.color }"
            :data-forge-id="entry.id"
            :title="entry.desc"
            @mouseenter="setListHover(entry.id)"
          >
            <Icon :icon="entry.icon" width="27" height="27" :style="{ color: entry.color }" />
            <div class="fc-row-body">
              <span class="fc-row-name">{{ entry.name }}</span>
              <span class="fc-row-meta">
                <Icon icon="lucide:lock" width="14" height="14" />
                {{ entry.lockReason }}
              </span>
            </div>
            <div class="fc-track">
              <i :style="{ transform: `scaleX(${entry.unlockProgress})` }" />
            </div>
          </div>

          <!-- Ausgewachsen: nur noch, was er bringt. -->
          <div
            v-else-if="entry.state === 'maxed'"
            class="fc-row fc-row--max"
            :class="spotClasses(entry.id)"
            :style="{ '--node-c': entry.color }"
            :data-forge-id="entry.id"
            :title="entry.desc"
            @mouseenter="setListHover(entry.id)"
          >
            <Icon :icon="entry.icon" width="27" height="27" :style="{ color: entry.color }" />
            <div class="fc-row-body">
              <span class="fc-row-name" :style="{ color: entry.color }">{{ entry.name }}</span>
              <span class="fc-row-meta fc-row-meta--gain">{{ entry.desc }}</span>
            </div>
            <span class="fc-badge">✦ MAX</span>
          </div>

          <article
            v-else
            class="fc-card"
            :class="[
              {
                'fc-card--ready': entry.canBuy,
                'fc-card--owned': entry.level > 0 && !entry.canBuy,
              },
              spotClasses(entry.id),
            ]"
            :style="{ '--node-c': entry.color }"
            :data-forge-id="entry.id"
            @mouseenter="setListHover(entry.id)"
          >
            <div v-if="entry.canBuy" class="fc-glow" aria-hidden="true" />
            <div
              class="fc-flash"
              :class="{ 'fc-flash--on': flashedId === entry.id }"
              aria-hidden="true"
            />

            <header class="fc-card-head">
              <div class="fc-ico">
                <Icon :icon="entry.icon" width="38" height="38" :style="{ color: entry.color }" />
              </div>
              <div class="fc-id">
                <div class="fc-name-row">
                  <span class="fc-name" :style="{ color: entry.color }">{{ entry.name }}</span>
                  <!-- Seit die Liste nicht mehr nach Ringen gliedert, ist
                       dieser Chip die einzige Stelle, die den Ring nennt. -->
                  <span class="fc-chip" :style="{ '--chip-c': tierAccent(entry.tier) }">
                    {{ entry.tierLabel }}
                  </span>
                </div>
                <!-- Pips zeigen einen WEG mit Ende. Ein Bough hat keins: das
                     `v-for` liefe über `Infinity` und hinge den Tab auf, und
                     selbst gedeckelt sagte eine Perlenreihe hier etwas Falsches.
                     Stattdessen steht die erreichte Stufe für sich. -->
                <div class="fc-lvl-row">
                  <template v-if="Number.isFinite(entry.maxLevel)">
                    <span class="fc-pips">
                      <i
                        v-for="step in entry.maxLevel"
                        :key="step"
                        class="fc-pip"
                        :class="{ 'fc-pip--on': step <= entry.level }"
                      />
                    </span>
                    <span class="fc-lvl">Lv {{ entry.level }} / {{ entry.maxLevel }}</span>
                  </template>
                  <template v-else>
                    <span class="fc-endless">{{ FORGE_ENDLESS_SYMBOL }}</span>
                    <span class="fc-lvl">Lv {{ entry.level }} · no final level</span>
                  </template>
                </div>
              </div>
            </header>

            <p class="fc-desc">{{ entry.desc }}</p>

            <div class="fc-delta">
              <div class="fc-delta-cell">
                <span class="fc-delta-label">Now</span>
                <span class="fc-delta-value">{{ entry.level === 0 ? '—' : entry.nowText }}</span>
              </div>
              <span class="fc-delta-arrow">→</span>
              <div class="fc-delta-cell fc-delta-cell--next">
                <span class="fc-delta-label">After growing</span>
                <span class="fc-delta-value fc-delta-value--next">{{ entry.nextText }}</span>
              </div>
            </div>

            <ForgeCostRow
              :gold="entry.goldCost"
              :gold-ok="entry.goldOk"
              :materials="entry.materials"
            />

            <!-- Warum der Knopf nicht geht, steht AUF ihm — siehe buttonLabel(). -->
            <button class="fc-act" :disabled="!entry.canBuy" @click="grow(entry)">
              {{ buttonLabel(entry) }}
            </button>
          </article>
        </template>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Der erste Reiter der Forge-Spalte: alles Kaufbare des Sternbaums als Liste.
 *
 * Vorher war jeder Knoten nur als Kreis auf der Leinwand erreichbar — man
 * musste zoomen, hovern und einen Tooltip lesen, einen Knoten nach dem anderen.
 * Es gab keine Stelle, an der stand, was gerade bezahlbar ist.
 *
 * Alle Zahlen kommen aus `useForgeUpgrades()`, derselben Quelle, aus der der
 * Baum links liest: ein Kauf hier färbt den Kreis dort im selben Frame, weil
 * beide Seiten dieselben Pinia-Getter lesen und nichts zwischenspeichern.
 *
 * Gegliedert wird nach dem, was der Spieler TUN kann (`FORGE_UPGRADE_BUCKETS`),
 * nicht nach dem Ring — die Herleitung steht dort. Der Ring bleibt als Chip auf
 * der Karte und als Filter über der Liste.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { forgeUpgradeBucket, useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import ForgeCostRow from './ForgeCostRow.vue'
import type { ForgeUpgradeBucketId, ForgeUpgradeEntry, ForgeUpgradeTier } from '@/types'
import {
  FORGE_UPGRADE_GROUPS,
  FORGE_UPGRADE_BUCKETS,
  FORGE_UPGRADE_ARCHIVE_LABEL,
  FORGE_UPGRADE_ARCHIVE_HINT,
  FORGE_UPGRADE_ARCHIVE_ICON,
  FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED,
  FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN,
  FORGE_UPGRADE_FILTER_ALL_LABEL,
  FORGE_ENDLESS_SYMBOL,
  FORGE_CARD_FLASH_MS,
  FORGE_SHORT_CHIMES_LABEL,
  FORGE_SHORT_MATERIAL_PREFIX,
  FORGE_GROW_LABEL,
  FORGE_GROW_NEXT_PREFIX,
  FORGE_SPOTLIGHT_SCROLL_DELAY_MS,
} from '@/config/constants'

const { upgradeEntries, entryById, buyUpgrade } = useForgeUpgrades()
const { spotlightId, treeHoverId, setListHover } = useForgeSpotlight()

// ── Ringfilter ───────────────────────────────────────────────────────────────
const activeTier = ref<ForgeUpgradeTier | 'all'>('all')

/** Leitfarbe eines Rings — für den Tier-Chip auf der Karte und den Filter. */
const TIER_ACCENT = new Map(FORGE_UPGRADE_GROUPS.map((group) => [group.tier, group.accent]))

function tierAccent(tier: ForgeUpgradeTier): string {
  return TIER_ACCENT.get(tier) ?? '#c89040'
}

/**
 * Der Zähler auf einem Chip ist bewusst „was hier noch offen ist" und nicht
 * „was hier gerade bezahlbar ist": er darf sich nur bei einem KAUF ändern. Eine
 * Zahl, die mit den Chimes hoch- und runterspringt, macht die Leiste unruhig,
 * die als Einzige der Liste immer im Bild steht.
 */
const filterChips = computed(() =>
  FORGE_UPGRADE_GROUPS.map((group) => ({
    tier: group.tier,
    title: group.title,
    shortTitle: group.shortTitle,
    accent: group.accent,
    open: upgradeEntries.value.filter(
      (entry) => entry.tier === group.tier && forgeUpgradeBucket(entry) !== 'grown',
    ).length,
  })),
)

// ── Eingefrorene Reihenfolge ─────────────────────────────────────────────────
/**
 * Warum die Liste unter dem Mauszeiger stillsteht.
 *
 * „Kaufbares ganz oben" und „die Chimes ticken jede Sekunde" vertragen sich
 * nicht von selbst: sobald der Vorrat eine Schwelle überschreitet, wechselt
 * eine Karte den Topf und alles darunter rutscht — und zwar genau, während man
 * auf einen Knopf zielt. Vorher wurde deshalb gar nicht nach Kaufbarkeit
 * sortiert.
 *
 * Stattdessen friert die ZUORDNUNG ein, sobald der Zeiger die Liste betritt,
 * und rechnet beim Verlassen neu. Was ein Eintrag anzeigt — Rahmen, Kosten,
 * Knopfbeschriftung — folgt weiter live; nur wo er steht, hält still.
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
    if (activeTier.value !== 'all' && entry.tier !== activeTier.value) continue
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

/**
 * Der Eintrag unter dem Zeiger — hier oder drüben am Baum — tritt hervor, alle
 * anderen zurück. Dieselben zwei Klassen für Karte und Kompaktzeile: was sie
 * bedeuten, hängt am Eintrag, nicht an seiner Renderform.
 */
function spotClasses(id: string): Record<string, boolean> {
  return {
    'fc-spot': spotlightId.value === id,
    'fc-dimmed': spotlightId.value !== null && spotlightId.value !== id,
  }
}

/**
 * Ein gedeckelter Strahl wartet nicht auf Chimes, sondern auf seine vier
 * Geschwister — und ein Knopf, der nur `disabled` ist, lässt den Spieler raten,
 * ob die Kasse oder das Lager leer ist. Beides steht direkt darüber, aber der
 * Knopf ist die Stelle, auf die er schaut.
 */
function buttonLabel(entry: ForgeUpgradeEntry): string {
  if (entry.state === 'capped') return entry.lockReason
  if (!entry.goldOk) return FORGE_SHORT_CHIMES_LABEL
  const short = entry.materials.find((mat) => !mat.ok)
  if (short) return `${FORGE_SHORT_MATERIAL_PREFIX}${short.need - short.have} ${short.name}`
  if (entry.level === 0) return FORGE_GROW_LABEL
  return `${FORGE_GROW_NEXT_PREFIX}${entry.level + 1}`
}

/** Welche Karte gerade quittiert. Rein visuell, daher reale Zeit. */
const flashedId = ref<string | null>(null)

function grow(entry: ForgeUpgradeEntry): void {
  if (!buyUpgrade(entry.id)) return
  flashedId.value = entry.id
  setTimeout(() => {
    if (flashedId.value === entry.id) flashedId.value = null
  }, FORGE_CARD_FLASH_MS)
}

const wrapEl = ref<HTMLElement | null>(null)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Ein Knoten, auf den der Spieler LINKS zeigt, muss rechts auch auffindbar
 * sein. Seit die Liste filtert und ein Archiv hat, kann seine Karte gerade
 * ausgeblendet sein — `querySelector` fände dann nichts und es passierte
 * sichtbar gar nichts. Filter und Archiv sind reine Ansichtszustände; sie
 * nachzuziehen ist billiger als ein Zeigen, das ins Leere läuft.
 */
function revealForSpotlight(id: string): void {
  const entry = entryById.value.get(id)
  if (!entry) return
  if (activeTier.value !== 'all' && entry.tier !== activeTier.value) activeTier.value = 'all'
  if (bucketOf(entry) === 'grown') archiveOpen.value = true
}

/**
 * Zeigt der Spieler LINKS auf einen Knoten, rollt die Liste dessen Karte nur
 * dann ins Bild, wenn sie gerade nicht darin steht: `block: 'nearest'` tut von
 * sich aus nichts, solange das Element vollständig sichtbar ist, und nimmt
 * sonst den kürzesten Weg.
 *
 * NUR vom Baum aus. Die Karte unter dem Zeiger ist per Definition sichtbar, und
 * ein Rollen unter dem Zeiger schöbe die nächste Karte darunter — der Hover
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

/* Der Reiterwechsel räumt diese Sektion per `v-if` ab — ein Zeiger, der dabei
   auf einer Karte stand, ließe den Knoten am Baum sonst leuchten bleiben, und
   die eingefrorene Reihenfolge überlebte den Wechsel. */
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
  gap: 11px;
}

.fu-group {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

/* ══════════════════════════════════════════════════
   RINGFILTER
   Klebt an der Oberkante des Rollbereichs (`.sf-body`). Der deckt oben und
   unten je etwas Polsterung ab, durch die sonst Karten hindurchscrollen: die
   `padding-top` des Rollbereichs (::before) und die Lücke bis zum ersten
   Abschnitt (::after). Beide Höhen sind die des .sf-body-Wertes und werden im
   Kompakt-Block mitgezogen.
══════════════════════════════════════════════════ */
.fu-filters {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 3px 0 4px;
  background: #111008;
}

.fu-filters::before,
.fu-filters::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  background: #111008;
}

.fu-filters::before {
  bottom: 100%;
  height: 10px;
}

.fu-filters::after {
  top: 100%;
  height: 11px;
}

/* Die Maße sind gemessen, nicht gewählt: fünf Chips müssen bei Full HD in die
   438px passen, die die Spalte innen hergibt (`clamp(340px, 32vw, 470px)`
   minus der 16px Polsterung des Rollbereichs auf jeder Seite). Mit 11.5px und
   9px Polsterung waren es 457px und die Reihe brach um — eine klebende Leiste
   in zwei Zeilen frisst 66px Höhe auf dem flachsten Viewport, den das Projekt
   kennt. `flex-wrap` bleibt trotzdem als Netz für die schmalste Spalte. */
.fu-filter {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #16120a;
  color: rgba(200, 144, 64, 0.65);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}

.fu-filter:hover:not(.fu-filter--on) {
  border-color: #5c3310;
  color: rgba(232, 192, 64, 0.9);
}

.fu-filter--on {
  background: #1e1408;
  border-color: var(--chip-c, #c89040);
  color: var(--chip-c, #e8c040);
}

/* Ein Ring, in dem nichts mehr offen ist, verschwindet NICHT — eine Chipreihe,
   die ihre Breite ändert, wäre der zweite Sprung, den dieser Umbau abschafft. */
.fu-filter--spent:not(.fu-filter--on) {
  opacity: 0.45;
}

.fu-filter-endless {
  font-size: 13px;
  line-height: 1;
  color: var(--chip-c, #c89040);
}

/* Blanke Zahl statt Pille: fünf Kästchen kosteten in dieser Spalte zusammen
   40px, die die Reihe in eine zweite Zeile drückten. */
.fu-filter-num {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.fu-filter--on .fu-filter-num {
  color: var(--chip-c, #e8c040);
}

/* ══════════════════════════════════════════════════
   ABSCHNITTSKOPF
   Derselbe Strich wie die Tier-Köpfe im Champion-Shop: getönt an der Kante,
   nach rechts auslaufend. Er trägt jetzt den Topf statt des Rings.
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

/* Der erste Abschnitt hängt direkt unter der Filterleiste — die Luft, die den
   Strich vorher von der Zeile darüber trennte, hat dort keinen Nachbarn. */
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

/* ══════════════════════════════════════════════════
   ARCHIV
   Eine Zeile in der Höhe der Kompaktzeilen darunter, damit das Ende der Liste
   nicht wie ein weiterer Abschnitt aussieht.
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
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fu-wrap,
  .fu-group {
    gap: 9px;
  }

  /* Die Polsterung des Rollbereichs geht dort auf 9px zurück — beide
     Deckflächen der klebenden Leiste ziehen mit. */
  .fu-filters::before,
  .fu-filters::after {
    height: 9px;
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
