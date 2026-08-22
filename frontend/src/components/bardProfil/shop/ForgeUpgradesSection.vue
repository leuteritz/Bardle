<template>
  <!-- Ein einziges `mouseenter`/`mouseleave` am Rahmen statt eines je Eintrag:
       zwischen zwei Zeilen liegen 8px Lücke, und fünfundvierzig Einzelhandler
       ließen den Spotlight bei jedem Übergang kurz ausgehen — und die
       Reihenfolge dabei jedes Mal auftauen. -->
  <div ref="wrapEl" class="fu-wrap" @mouseenter="freezeOrder" @mouseleave="leaveList">
    <!-- Was die Suche im Netz nebenan gerade durchlässt. Steht nur, solange
         gesucht wird — sonst wäre es eine Zeile, die nie etwas sagt. -->
    <div v-if="searchActive" class="fu-search-note">
      <Icon icon="lucide:search" width="14" height="14" class="fu-search-ico" />
      <span class="fu-search-count">{{ matchCount }}</span>
      <span class="fu-search-total">of {{ totalCount }}</span>
      <button class="fu-search-clear" type="button" @click="clearSearch">Clear</button>
    </div>

    <!-- ══ Die Töpfe ════════════════════════════════════════════════
         Ready · Saving up · und zuletzt das eingeklappte Archiv. Ein leerer
         Topf fällt ganz weg — Gesperrtes steht hier gar nicht erst, siehe
         `sections`. -->
    <section v-for="section in sections" :key="section.id" class="fu-group">
      <!-- Der Trenner. JEDER Topf trägt einen — auch die beiden kaufbaren: dass
           der Knopf in Farbe schon alles sage, hat als Begründung fürs Weglassen
           nicht getragen. Zwei davon, weil „kaufbar" und „am Sparen" zwei
           verschiedene Aufgaben sind. -->
      <div
        v-if="section.divider"
        class="fu-div"
        :style="{ '--div-c': section.divider.color }"
        role="separator"
      >
        <Icon :icon="section.divider.icon" width="17" height="17" class="fu-div-ico" />
        <span class="fu-div-label">{{ section.divider.label }}</span>
        <span class="fu-div-num">{{ section.entries.length }}</span>
      </div>

      <!-- Das Archiv trägt eine Schaltzeile statt eines Trenners — es ist das
           Einzige hier, was der Spieler zumachen kann, und eine Linie kann man
           nicht anklicken. Der Zähler steht deshalb IN der Schaltzeile, wo die
           anderen Töpfe ihn im Trenner tragen. -->
      <button
        v-if="section.id === 'grown'"
        class="fc-archive"
        :class="{ 'fc-archive--open': archiveOpen }"
        :aria-expanded="archiveOpen"
        @click="archiveOpen = !archiveOpen"
      >
        <span class="fc-archive-chevron">{{ archiveChevron }}</span>
        <Icon :icon="FORGE_UPGRADE_ARCHIVE_ICON" width="17" height="17" class="fc-archive-ico" />
        <span class="fc-archive-num">{{ section.entries.length }}</span>
        <span class="fc-archive-label">{{ FORGE_UPGRADE_ARCHIVE_LABEL }}</span>
      </button>

      <!-- Ausgewachsenes bleibt eine Kompaktzeile, alles Kaufbare die volle: im
           Archiv ist nichts zu entscheiden, und bei Vollausbau stellt es den
           Löwenanteil der Liste. -->
      <template v-if="section.id !== 'grown'">
        <ForgeUpgradeTile
          v-for="entry in section.entries"
          :key="entry.id"
          :entry="entry"
          :flashed="flashedId === entry.id"
          :fresh="freshIds.has(entry.id)"
          :bulk-count="bulkOf(entry.id)"
          :arrived="arrivedId === entry.id"
          @buy="grow"
          @buy-many="growMany"
        />
      </template>

      <template v-else-if="archiveOpen">
        <ForgeGrownRow v-for="entry in section.entries" :key="entry.id" :entry="entry" />
      </template>
    </section>

    <!-- Alle vier Töpfe leer — im frischen Spielstand der einzige Fall, und
         später keiner mehr. Bei laufender Suche steht der GRUND daneben: die
         Spalte ist sonst leer, und warum, sähe man nur in der anderen
         Bildhälfte. -->
    <div v-if="sections.length === 0" class="fu-none">
      <Icon :icon="FORGE_UPGRADE_EMPTY_ICON" width="26" height="26" class="fu-none-ico" />
      <template v-if="searchActive">
        <span class="fu-none-text">{{ emptySearchText }}</span>
        <button class="fu-none-clear" type="button" @click="clearSearch">Clear search</button>
      </template>
      <span v-else class="fu-none-text">Nothing to grow yet.</span>
    </div>
  </div>

  <!-- Die volle Auskunft zur Zeile unter dem Zeiger. Geschwister der Liste und
       `position: fixed` — läge es IN ihr, schöbe sein Erscheinen sie unter dem
       Zeiger weg, und der Hover ginge im selben Zug wieder aus. -->
  <ForgeRowTooltip :entry="tipEntry" :anchor="tipAnchor" />
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
 * Und gezeigt wird nur, was FREIGESCHALTET ist: kaufbar, am Sparen,
 * ausgewachsen. Gesperrtes fällt vor dem Einsortieren heraus (`sections`); wer
 * wissen will, was als Nächstes aufgeht, liest es am Baum links ab, wo der
 * Knoten sein Schloss und seinen Sperrsatz behält.
 *
 * Was ein Eintrag AUSFÜHRLICH zeigt, steht seit dem Umbau nicht mehr in der
 * Liste: fünfundvierzig volle Karten untereinander waren dieselbe Fläche
 * fünfundvierzig Mal, und keine davon gross genug, um auf einem 4K-Schirm etwas
 * herzumachen.
 *
 * Was daraus wurde, sind ZWEI Formen statt einer — nach dem, was der Eintrag
 * vom Spieler will:
 *
 *   • `ForgeUpgradeTile` für alles Kaufbare. Eine Zeile mit
 *     grosser Stufe, Name, Wirkungssprung, Materialband und einer Kauffläche,
 *     deren FARBE die Aussage trägt. Die 44px-Zeile davor trug ihre beiden
 *     wichtigsten Zahlen als die kleinsten Elemente der Spalte und die Stufe
 *     gar nicht.
 *   • `ForgeGrownRow` für das Archiv. Dort ist nichts zu entscheiden, und genau
 *     dieser Topf stellt bei Vollausbau den Löwenanteil — hier zahlt sich die
 *     alte Rechnung wirklich aus.
 *
 * Der Beschreibungssatz, der Rang und der Elternknoten bleiben im schwebenden
 * Kärtchen (`ForgeRowTooltip`). Ein Empfehlungs-Panel über der Liste gab es
 * einmal; es ist gestrichen, seine einzige eigene Fähigkeit — der Stapelkauf —
 * sitzt jetzt als `×N` im Kaufknopf jeder Zeile.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  forgeUpgradeBucket,
  forgeUpgradeMayTravel,
  useForgeUpgrades,
} from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useForgeSearch } from '@/composables/ui/useForgeSearch'
import { useForgeDetailsPane } from '@/composables/ui/useForgeDetailsPane'
import { forgeRowInView } from '@/utils/ui/forgeSpotlightView'
import ForgeUpgradeTile from './ForgeUpgradeTile.vue'
import ForgeGrownRow from './ForgeGrownRow.vue'
import ForgeRowTooltip from './ForgeRowTooltip.vue'
import type { ForgeUpgradeBucketId, ForgeUpgradeEntry, ForgeRowTipAnchor } from '@/types'
import {
  FORGE_UPGRADE_ARCHIVE_LABEL,
  FORGE_UPGRADE_ARCHIVE_ICON,
  FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED,
  FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN,
  FORGE_CARD_FLASH_MS,
  FORGE_DIVIDER_READY_COLOR,
  FORGE_DIVIDER_READY_ICON,
  FORGE_DIVIDER_READY_LABEL,
  FORGE_DIVIDER_SAVING_COLOR,
  FORGE_DIVIDER_SAVING_ICON,
  FORGE_DIVIDER_SAVING_LABEL,
  FORGE_SPOTLIGHT_ARRIVAL_MS,
  FORGE_SPOTLIGHT_SCROLL_DELAY_MS,
  FORGE_UPGRADE_EMPTY_ICON,
} from '@/config/constants'

const { upgradeEntries, entryById, freshIds, buyUpgrade, affordableLevels, buyMany } =
  useForgeUpgrades()
const { treeHoverId, listHoverId, pinnedId, focusTick, setListHover, clearPin } =
  useForgeSpotlight()
const { detailsOpen } = useForgeDetailsPane()
const { searchActive, matchIds, matchCount, totalCount, clearSearch } = useForgeSearch()

/**
 * Zwei Gründe für eine leere Spalte, und sie verlangen Verschiedenes.
 *
 * Diese Liste zeigt Gesperrtes grundsätzlich nicht (siehe `sections`) — eine
 * Suche kann also Treffer haben und hier trotzdem nichts hinterlassen. „Nichts
 * gefunden" wäre dann schlicht falsch: die Knoten stehen leuchtend im Netz
 * nebenan.
 */
const emptySearchText = computed(() =>
  matchCount.value > 0
    ? `${matchCount.value} matches, all still locked — they are lit in the tree.`
    : 'No node matches this search.',
)

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

/**
 * Und dieselbe Klammer um die STAPELZAHL.
 *
 * Sie hängt genauso an den Chimes: sobald der Vorrat eine Schwelle
 * überschreitet, wird aus „×3" ein „×4" — oder der Stapelknopf tritt überhaupt
 * erst neben das Verb und macht es schmaler. Beides passiert dann, wenn man
 * gerade auf den Knopf zielt.
 */
const frozenBulk = ref<Map<string, number> | null>(null)

/**
 * Wie viele Stufen je Eintrag gerade auf einmal gingen.
 *
 * NUR für das gerade Kaufbare: die Schleife hinter `affordableLevels()` läuft
 * je Knoten bis `FORGE_BULK_BUY_CAP`, und über alle fünfundvierzig gerechnet
 * liefe sie bei jedem Chime-Tick. Was nicht kaufbar ist, hat ohnehin keinen
 * Stapelknopf.
 */
const bulkCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of upgradeEntries.value) {
    if (entry.canBuy) counts.set(entry.id, affordableLevels(entry.id))
  }
  return counts
})

function freezeOrder(): void {
  frozenBuckets.value = new Map(
    upgradeEntries.value.map((entry) => [entry.id, forgeUpgradeBucket(entry)]),
  )
  frozenBulk.value = new Map(bulkCounts.value)
}

function leaveList(): void {
  frozenBuckets.value = null
  frozenBulk.value = null
  setListHover(null)
}

function bucketOf(entry: ForgeUpgradeEntry): ForgeUpgradeBucketId {
  return frozenBuckets.value?.get(entry.id) ?? forgeUpgradeBucket(entry)
}

function bulkOf(id: string): number {
  return (frozenBulk.value ?? bulkCounts.value).get(id) ?? 0
}

// ── Die Abschnitte ───────────────────────────────────────────────────────────
/** Die Linie mit Etikett über einer Gruppe — nur das Archiv trägt keine. */
interface UpgradeDivider {
  icon: string
  label: string
  color: string
}

interface UpgradeSection {
  /**
   * Der `v-for`-Schlüssel, und seit dem Wegfall der gesperrten Abschnitte
   * deckungsgleich mit dem Topf. Er bleibt trotzdem ein eigenes Feld: die
   * Vorlage fragt an zwei Stellen nach `'grown'`, und ein Schlüssel, der
   * zufällig gleich heisst, ist keine Zusage, dass er es bleibt.
   */
  id: 'ready' | 'reach' | 'grown'
  entries: ForgeUpgradeEntry[]
  divider?: UpgradeDivider
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
    /* Die Suche schneidet VOR den Töpfen: sie ist eine Frage an den ganzen
       Bestand, keine an einen von ihnen. */
    if (searchActive.value && !matchIds.value.has(entry.id)) continue
    const bucket = bucketOf(entry)
    /* Gesperrtes gehört nicht in diese Spalte. Sie beantwortet „was kann ich
       JETZT kaufen" — und ein Knoten, dessen Elternteil noch fehlt oder dessen
       Sonnenphase noch nicht angebrochen ist, beantwortet sie mit nichts. Im
       frühen Spielstand stellte er trotzdem den Löwenanteil der Liste.

       Der Ausblick darauf, was als Nächstes aufgeht, bleibt vollständig
       erhalten — er steht im Baum links, wo der gesperrte Knoten sein Schloss,
       seinen Sperrsatz und seinen Fortschrittsbalken behält. Das ist auch der
       Grund, warum hier gefiltert wird und nicht in `forgeUpgradeBucket()`:
       der Topf `'next'` bleibt eine gültige Aussage über den Eintrag, diese
       Liste zeigt ihn nur nicht mehr an. */
    if (bucket === 'next') continue
    pots[bucket].push(entry)
  }

  const out: UpgradeSection[] = [
    {
      id: 'ready',
      entries: pots.ready,
      divider: {
        icon: FORGE_DIVIDER_READY_ICON,
        label: FORGE_DIVIDER_READY_LABEL,
        color: FORGE_DIVIDER_READY_COLOR,
      },
    },
    {
      id: 'reach',
      entries: pots.reach,
      divider: {
        icon: FORGE_DIVIDER_SAVING_ICON,
        label: FORGE_DIVIDER_SAVING_LABEL,
        color: FORGE_DIVIDER_SAVING_COLOR,
      },
    },
    { id: 'grown', entries: pots.grown },
  ]

  return out.filter((section) => section.entries.length > 0)
})

/** Welche Zeile gerade quittiert. Rein visuell, daher reale Zeit. */
const flashedId = ref<string | null>(null)

function grow(id: string): void {
  if (!buyUpgrade(id)) return
  releaseFocus(id)
  flash(id)
}

/**
 * Der Kauf löst den Fokus — aber nur den auf dem GEKAUFTEN Eintrag.
 *
 * Dieselbe Regel wie im Baum (`handleNodeClick`), damit beide Kaufwege gleich
 * enden: was gekauft wurde, ist entschieden, und die Auswahl darf weiterziehen.
 * Ein Kauf auf einer ANDEREN Zeile lässt den Fokus stehen — er war nicht
 * gemeint, und ihn mitzunehmen risse dem Spieler die Auswahl unter der Hand weg.
 */
function releaseFocus(id: string): void {
  if (pinnedId.value === id) clearPin()
}

/**
 * Alles, was Vorrat und Lager gerade hergeben — der `×N` neben dem Verb.
 *
 * Die Zahl kommt aus der EINGEFRORENEN Karte, nicht frisch aus dem Store: der
 * Spieler hat auf das geklickt, was er gesehen hat. `buyMany` prüft ohnehin
 * jede Stufe einzeln und hält beim ersten Nein an — zu viel verlangen kann der
 * Klick also nicht.
 */
function growMany(id: string): void {
  const count = bulkOf(id)
  if (count < 1 || buyMany(id, count) === 0) return
  releaseFocus(id)
  flash(id)
}

function flash(id: string): void {
  flashedId.value = id
  setTimeout(() => {
    if (flashedId.value === id) flashedId.value = null
  }, FORGE_CARD_FLASH_MS)
}

const wrapEl = ref<HTMLElement | null>(null)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Ein Knoten, auf den der Spieler LINKS zeigt, muss rechts auch auffindbar
 * sein.
 *
 * Aufzuklappen ist dafür genau eines: das ARCHIV. Es ist keine Auswahl des
 * Spielers, sondern eine zugeklappte Schublade — und ein ausgewachsener Knoten
 * im Baum hat seine Zeile darin.
 */
function revealForSpotlight(id: string): void {
  const entry = entryById.value.get(id)
  if (!entry) return
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
 * fünfundvierzig. Die Wartezeit deckt zugleich das Aufklappen des Archivs ab,
 * das `revealForSpotlight()` ausgelöst haben kann. Rein visuell, daher reale
 * Zeit.
 */
/**
 * Welche Zeile gerade EINGETROFFEN ist.
 *
 * Nicht dasselbe wie „hervorgehoben": hervorgehoben ist die Zeile, solange der
 * Zeiger drüben auf ihrem Knoten steht; eingetroffen ist sie nur in den
 * Sekundenbruchteilen, in denen sie von ausserhalb hereingerollt kam. Das eine
 * ist ein Zustand, das andere ein Ereignis — und ein Ereignis braucht einen
 * eigenen Merker, weil es von selbst wieder vergeht.
 */
const arrivedId = ref<string | null>(null)
let arrivalTimer: ReturnType<typeof setTimeout> | null = null

function clearArrival(): void {
  if (arrivalTimer !== null) {
    clearTimeout(arrivalTimer)
    arrivalTimer = null
  }
  arrivedId.value = null
}

/**
 * Eine Zeile heranrollen — der gemeinsame Weg der beiden Anlässe darunter.
 *
 * Die Verzögerung deckt alles ab, was gleichzeitig noch in Bewegung sein kann:
 * ein Archiv, das für diese Zeile aufklappt, und die Detailspalte selbst, wenn
 * der Klick am Baum sie gerade ausgefahren hat.
 */
function scrollToRow(id: string): void {
  revealForSpotlight(id)
  scrollTimer = setTimeout(() => {
    scrollTimer = null
    const row = wrapEl.value?.querySelector<HTMLElement>(`[data-forge-id="${id}"]`)
    const box = wrapEl.value?.closest<HTMLElement>('[data-forge-scroll]')
    if (!row || !box) return
    // VORHER messen, nicht nachher: `block: 'nearest'` tut nichts, wenn die
    // Zeile schon ganz im Kasten steht — und dann ist auch nichts eingetroffen,
    // was sich zu markieren lohnte. Zwei Rechtecke je Hover-Wechsel, nie pro
    // Frame; dieselbe Rechnung macht das schwebende Kärtchen darunter schon.
    const r = row.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const wasOut = !forgeRowInView(r.top, r.bottom, b.top, b.bottom)

    /* Gerollt wird das SCROLLFELD, nicht die Zeile.
     *
     * `row.scrollIntoView()` stand hier und rollte JEDEN scrollbaren Vorfahren
     * mit — `.shop-frame` ist wegen seines `overflow` einer davon. Seit die
     * Detailspalte einklappt, steht ihre Liste im geparkten Zustand ausserhalb
     * des Rahmens; ein Hover über den Baum zog deshalb den ganzen Shop-Tab
     * seitwärts, bis die Zeile im Bild war. Gemessen: der Baum rutschte um
     * 448 px nach links aus dem Bild, und das geparkte Panel erschien, als
     * wäre es aufgeklappt — bei unverändertem `detailsOpen`.
     *
     * `block: 'nearest'` ist hier eins zu eins nachgebaut: nichts tun, solange
     * die Zeile ganz im Kasten steht, sonst den kürzeren der beiden Wege.
     * Dieselben zwei Rechtecke, die `wasOut` schon gemessen hat.
     */
    const above = r.top - b.top
    const below = r.bottom - b.bottom
    const delta = above < 0 ? above : below > 0 ? below : 0
    if (delta !== 0) box.scrollTo({ top: box.scrollTop + delta, behavior: 'smooth' })

    if (!wasOut) return
    arrivedId.value = id
    arrivalTimer = setTimeout(() => {
      arrivalTimer = null
      if (arrivedId.value === id) arrivedId.value = null
    }, FORGE_SPOTLIGHT_ARRIVAL_MS)
  }, FORGE_SPOTLIGHT_SCROLL_DELAY_MS)
}

watch(treeHoverId, (id) => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  clearArrival()
  if (id === null) return
  // Hinter einer GEPARKTEN Spalte wird nicht gerollt. Dort sieht es niemand —
  // und ein Archiv, das `revealForSpotlight()` dabei aufklappt, stünde beim
  // nächsten Ausfahren unerklärt offen. Die Zeilen liegen dann ausserdem
  // ausserhalb des Rahmens, und genau daraus wurde der seitwärts rutschende
  // Shop-Tab (siehe die Herleitung in `scrollToRow`).
  if (!detailsOpen.value) return
  // Gesperrt heisst leuchten, nicht rollen. Der Filter steht HIER und nicht an
  // `setTreeHover` — der trägt auch Hervorhebung, Kranz und Bedingungskette,
  // und die sind bei einer Sperre gerade die interessanteste Auskunft.
  if (!forgeUpgradeMayTravel(entryById.value.get(id))) return
  // Eine Anheftung HÄLT die Ansicht fest, das ist ihre einzige Aufgabe. Rollte
  // die Liste darunter weiter, führe sie zu einer Zeile, die gar nicht
  // hervorgehoben ist — der Spotlight steht ja beim angehefteten Knoten.
  if (pinnedId.value !== null) return
  scrollToRow(id)
})

/**
 * Der FOKUS rollt ebenfalls — und zwar ohne den `mayTravel`-Filter.
 *
 * Der Filter gehört dem ZEIGER: ein Schwenk über die Sperrliste soll die
 * Ansicht nicht durch den halben Baum fahren. Ein Fokus ist die absichtliche
 * Geste, und bei einem gesperrten Knoten ist die Zeile drüben genau das, wonach
 * gesucht wird — dort steht der Sperrgrund samt vollständiger Bedingungsliste.
 *
 * Nötig wurde das mit der einklappbaren Detailspalte: ein Klick im Baum fährt
 * sie aus und fokussiert, und die Zeile dazu muss dann im Bild stehen. Vorher
 * war ein Fokus immer eine Geste VOR einer bereits sichtbaren Liste.
 */
function scrollToFocus(): void {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  clearArrival()
  const id = pinnedId.value
  if (id === null) return
  // Dieselbe Bedingung wie beim Zeiger — sie greift hier nur nie: der Klick im
  // Baum ruft `openDetails()` VOR `setPin()`, die Spalte ist beim Eintreffen
  // dieses Wächters also schon ausgefahren. Sie steht trotzdem da, weil ein
  // Fokus auch aus einer anderen Geste kommen kann.
  if (!detailsOpen.value) return
  scrollToRow(id)
}

/** Der Fokus hat gewechselt. */
watch(pinnedId, scrollToFocus)

/**
 * „Zeig ihn mir nochmal" — dasselbe Rollen, ohne dass sich der Fokus geändert
 * hat. Ein zweiter Klick auf dieselbe Zeile oder denselben Knoten kommt hier
 * an; im Baum drüben hört derselbe Impuls auf die Kamera.
 */
watch(focusTick, scrollToFocus)


// ── Das schwebende Kärtchen ──────────────────────────────────────────────────
/**
 * Wo es hängt. Gemessen wird bei jedem HOVER-WECHSEL, nie pro Frame — und nur
 * die drei Kanten, die das Kärtchen braucht (`ForgeRowTipAnchor`).
 *
 * `getBoundingClientRect()` ist hier richtig und nicht teuer: der Zeiger wechselt
 * die Zeile ein paar Mal je Sekunde, nicht sechzig Mal. Ein `watch` statt eines
 * Handlers je Zeile, weil die Zeilen ihren Hover ohnehin schon ins Composable
 * melden.
 */
const tipAnchor = ref<ForgeRowTipAnchor | null>(null)

const tipEntry = computed<ForgeUpgradeEntry | null>(() =>
  listHoverId.value === null ? null : (entryById.value.get(listHoverId.value) ?? null),
)

watch(listHoverId, (id) => {
  if (id === null) {
    tipAnchor.value = null
    return
  }
  const row = wrapEl.value?.querySelector<HTMLElement>(`[data-forge-id="${id}"]`)
  if (!row) {
    tipAnchor.value = null
    return
  }
  const rect = row.getBoundingClientRect()
  tipAnchor.value = { top: rect.top, bottom: rect.bottom, left: rect.left }
})

/* Der Abschnittswechsel räumt diese Sektion per `v-if` ab — ein Zeiger, der
   dabei auf einer Zeile stand, ließe den Knoten am Baum sonst leuchten bleiben,
   und die eingefrorene Reihenfolge überlebte den Wechsel. */
onUnmounted(() => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  clearArrival()
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
   TRENNER
   Rezept der geteilten `.filter-divider` (rpg-theme.css) — Linie, Etikett,
   Linie —, nur grösser: 13px statt 11, gesperrt in Versalien, und die Linien
   in der Farbe des Grundes statt in Braun. Eigene Klassen und nicht die
   geteilte Regel erweitert, weil dort eine 11px-Zeile in einem Filterfenster
   hängt und beide sonst aneinandergekoppelt wären.

   Es bleibt eine LINIE: kein Balken, keine Fläche, keine Animation. Ein
   Trenner, der so schwer wiegt wie eine Zeile, wird selbst zum Eintrag.
══════════════════════════════════════════════════ */
.fu-div {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 7px 2px 3px;
}

.fu-div::before,
.fu-div::after {
  content: '';
  flex: 1;
  height: 2px;
  border-radius: 2px;
}

/* Zur Mitte hin kräftig, nach aussen auslaufend — das Etikett bekommt damit
   sein Gewicht aus der Linie, ohne dass die ganze Breite leuchtet. */
.fu-div::before {
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--div-c, #c89040) 55%, transparent)
  );
}

.fu-div::after {
  background: linear-gradient(
    to left,
    transparent,
    color-mix(in srgb, var(--div-c, #c89040) 55%, transparent)
  );
}

.fu-div-ico {
  flex-shrink: 0;
  color: var(--div-c, #c89040);
}

.fu-div-label {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  color: var(--div-c, #c89040);
}

.fu-div-num {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid color-mix(in srgb, var(--div-c, #c89040) 35%, #32210c);
  color: var(--div-c, #c89040);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

/* ══════════════════════════════════════════════════
   ARCHIV
   Die einzige Schaltzeile der Liste — und deshalb die einzige Gruppe ohne
   Trenner: eine Linie kann man nicht aufklappen. Sie trägt dafür dieselben
   Bausteine wie er (Glyph, Zähler, Versalien-Etikett), nur auf einer Fläche.

   Die Optik liegt als `.fc-archive*` global in `rpg-theme.css`: die Spalte hat
   seit dem Streifen-Umbau eine ZWEITE Schublade darunter (`ForgeVaultSection`),
   und zwei scoped Kopien derselben Geste liefen bei der nächsten Änderung
   auseinander.
══════════════════════════════════════════════════ */

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

.fu-none-clear {
  flex-shrink: 0;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 800;
  color: #e8c040;
  background: #1e1006;
  border: 1px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
}

.fu-none-clear:hover {
  border-color: #7a4e20;
}

/* ══════════════════════════════════════════════════
   TREFFERZEILE der Suche
══════════════════════════════════════════════════ */
.fu-search-note {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  background: #16140e;
  border: 1px solid #2a3a40;
  border-radius: 4px;
}

.fu-search-ico {
  flex-shrink: 0;
  color: #40c8e0;
}

.fu-search-count {
  font-size: 14px;
  font-weight: 900;
  color: #40c8e0;
  font-variant-numeric: tabular-nums;
}

.fu-search-total {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.45);
}

.fu-search-clear {
  flex-shrink: 0;
  padding: 3px 9px;
  font-size: 11.5px;
  font-weight: 800;
  color: #cc6050;
  background: none;
  border: 1px solid #4a3010;
  border-radius: 4px;
  cursor: pointer;
}

.fu-search-clear:hover {
  color: #e07060;
  border-color: #7a4e20;
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

  .fu-div {
    margin: 5px 2px 2px;
    gap: 8px;
  }

  .fu-div-label {
    font-size: 12px;
  }
}
</style>
