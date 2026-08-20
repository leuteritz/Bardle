<template>
  <!-- Ein einziges `mouseenter`/`mouseleave` am Rahmen statt eines je Eintrag:
       zwischen zwei Zeilen liegen 8px Lücke, und fünfundvierzig Einzelhandler
       ließen den Spotlight bei jedem Übergang kurz ausgehen — und die
       Reihenfolge dabei jedes Mal auftauen. -->
  <div ref="wrapEl" class="fu-wrap" @mouseenter="freezeOrder" @mouseleave="leaveList">
    <!-- ══ Die Töpfe ════════════════════════════════════════════════
         Ready · Saving up · Next up · und zuletzt das eingeklappte Archiv. Ein
         leerer Topf fällt ganz weg. -->
    <section v-for="section in sections" :key="section.id" class="fu-group">
      <!-- Der Trenner. JEDER Topf trägt einen — auch die beiden kaufbaren: dass
           der Knopf in Farbe schon alles sage, hat als Begründung fürs Weglassen
           nicht getragen. Vier davon, weil „kaufbar", „am Sparen" und die beiden
           Sperrgründe vier verschiedene Aufgaben sind; Herleitung an
           `FORGE_DIVIDER_PARENT_LABEL`. -->
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
          :best="bestOf(entry.id)"
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
         später keiner mehr. -->
    <div v-if="sections.length === 0" class="fu-none">
      <Icon :icon="FORGE_UPGRADE_EMPTY_ICON" width="26" height="26" class="fu-none-ico" />
      <span class="fu-none-text">Nothing to grow yet.</span>
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
 * Was ein Eintrag AUSFÜHRLICH zeigt, steht seit dem Umbau nicht mehr in der
 * Liste: fünfundvierzig volle Karten untereinander waren dieselbe Fläche
 * fünfundvierzig Mal, und keine davon gross genug, um auf einem 4K-Schirm etwas
 * herzumachen.
 *
 * Was daraus wurde, sind ZWEI Formen statt einer — nach dem, was der Eintrag
 * vom Spieler will:
 *
 *   • `ForgeUpgradeTile` für alles Kaufbare und Gesperrte. Eine Zeile mit
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
  FORGE_DIVIDER_PARENT_ICON,
  FORGE_DIVIDER_PARENT_LABEL,
  FORGE_DIVIDER_PHASE_ICON,
  FORGE_DIVIDER_PHASE_LABEL,
  FORGE_DIVIDER_PHASE_MANY_LABEL,
  FORGE_DIVIDER_READY_COLOR,
  FORGE_DIVIDER_READY_ICON,
  FORGE_DIVIDER_READY_LABEL,
  FORGE_DIVIDER_SAVING_COLOR,
  FORGE_DIVIDER_SAVING_ICON,
  FORGE_DIVIDER_SAVING_LABEL,
  FORGE_PHASE_TOKEN,
  FORGE_SPOTLIGHT_ARRIVAL_MS,
  FORGE_SPOTLIGHT_SCROLL_DELAY_MS,
  FORGE_UPGRADE_EMPTY_ICON,
  STAR_PHASE_DATA,
} from '@/config/constants'

const { upgradeEntries, entryById, bestBuyId, freshIds, buyUpgrade, affordableLevels, buyMany } =
  useForgeUpgrades()
const { treeHoverId, listHoverId, pinnedId, setListHover } = useForgeSpotlight()

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
 * Und dieselbe Klammer um die BEST-BUY-Marke.
 *
 * Sie zeigt auf den GÜNSTIGSTEN kaufbaren Eintrag und hängt damit doppelt an den
 * tickenden Chimes: sobald ein billigerer Eintrag bezahlbar wird, springt die
 * Marke samt ihrer atmenden Ebene auf eine andere Zeile. Ohne die Klammer
 * passierte genau das, während der Zeiger auf einem Knopf steht — dieselbe
 * Unruhe, gegen die schon die eingefrorene Reihenfolge steht.
 *
 * Als Kästchen und nicht als blanker String, damit `null` dasselbe heisst wie
 * bei den beiden Karten daneben — „nicht eingefroren". „Eingefroren, und es gibt
 * gerade keinen" ist ein eigener Zustand und muss unterscheidbar bleiben.
 */
const frozenBest = ref<{ id: string | null } | null>(null)

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
  frozenBest.value = { id: bestBuyId.value }
}

function leaveList(): void {
  frozenBuckets.value = null
  frozenBulk.value = null
  frozenBest.value = null
  setListHover(null)
}

function bucketOf(entry: ForgeUpgradeEntry): ForgeUpgradeBucketId {
  return frozenBuckets.value?.get(entry.id) ?? forgeUpgradeBucket(entry)
}

function bulkOf(id: string): number {
  return (frozenBulk.value ?? bulkCounts.value).get(id) ?? 0
}

/** Trägt diese Zeile die BEST-BUY-Marke — die eine bewegte Ebene der Liste? */
function bestOf(id: string): boolean {
  return (frozenBest.value ? frozenBest.value.id : bestBuyId.value) === id
}

// ── Die Abschnitte ───────────────────────────────────────────────────────────
/** Die Linie mit Etikett über einer Gruppe — nur die gesperrten tragen eine. */
interface UpgradeDivider {
  icon: string
  label: string
  color: string
}

interface UpgradeSection {
  /**
   * Der `v-for`-Schlüssel, nicht der Topf: „Next up" erscheint als ZWEI
   * Abschnitte (Eltern- und Phasensperre), und zwei gleiche Schlüssel
   * nebeneinander sind ein Vue-Fehler, kein Schönheitsfehler.
   */
  id: 'ready' | 'reach' | 'lockedParent' | 'lockedPhase' | 'grown'
  entries: ForgeUpgradeEntry[]
  divider?: UpgradeDivider
}

const archiveOpen = ref(false)

const archiveChevron = computed(() =>
  archiveOpen.value ? FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN : FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED,
)

/**
 * Das Etikett über den phasengesperrten Einträgen.
 *
 * Es nennt die Phase nur, wenn darunter wirklich NUR eine wartet: die Knoten
 * öffnen bei vier verschiedenen Phasen, und „Waiting on Dawn · 18" wäre für
 * zwölf der achtzehn schlicht falsch. Die Tönung nimmt in beiden Fällen die
 * nächste — das Tor, das als erstes aufgeht.
 */
function phaseDivider(entries: ForgeUpgradeEntry[]): UpgradeDivider {
  const phases = new Set(entries.map((entry) => entry.lockPhase))
  const nearest = Math.min(...phases)
  const data = STAR_PHASE_DATA[nearest]
  return {
    icon: FORGE_DIVIDER_PHASE_ICON,
    color: data?.phasePrimary ?? '#c89040',
    label:
      phases.size === 1 && data
        ? FORGE_DIVIDER_PHASE_LABEL.replace(FORGE_PHASE_TOKEN, data.name)
        : FORGE_DIVIDER_PHASE_MANY_LABEL,
  }
}

const sections = computed<UpgradeSection[]>(() => {
  const pots: Record<ForgeUpgradeBucketId, ForgeUpgradeEntry[]> = {
    ready: [],
    reach: [],
    next: [],
    grown: [],
  }

  for (const entry of upgradeEntries.value) {
    pots[bucketOf(entry)].push(entry)
  }

  /* Der Topf „Next up" zerfällt beim ANZEIGEN in zwei, je Sperrgrund einen.
     Die Weiche steht am Eintrag (`lockKind`) und nicht hier, damit sie nicht
     am fertigen Sperrsatz hängt; `forgeUpgradeBucket()` bleibt unangetastet
     und damit auch die eingefrorene Reihenfolge.

     Elternsperren zuerst: die Liste ordnet durchgehend nach „was kann ich
     tun" — kaufen, sparen, den Elternknoten wachsen lassen, und ganz zuletzt
     das, wogegen nur Warten hilft. */
  const phaseLocked = pots.next.filter((entry) => entry.lockKind === 'phase')
  // Die RESTMENGE und kein zweiter Gleichheitstest: zwei Filter auf feste Werte
  // sind zusammen nur so lange vollstaendig, wie niemand einen dritten Grund
  // ergaenzt — und der Kronen-Ring hat mit `'prestige'` genau das getan. Ein
  // Eintrag, der durch beide faellt, verschwindet aus der Liste, statt falsch
  // einsortiert zu werden; das ist der teurere Fehler.
  const parentLocked = pots.next.filter((entry) => entry.lockKind !== 'phase')

  // Innerhalb der Elternsperren zählt die Nähe zur Freischaltung, innerhalb der
  // Phasensperren das nächste Tor. Die übrigen Töpfe behalten die
  // Katalogreihenfolge des Baums (Ray → Branch → Leaf → Bough).
  parentLocked.sort((a, b) => b.unlockProgress - a.unlockProgress)
  phaseLocked.sort((a, b) => a.lockPhase - b.lockPhase)

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
    {
      id: 'lockedParent',
      entries: parentLocked,
      divider: {
        icon: FORGE_DIVIDER_PARENT_ICON,
        label: FORGE_DIVIDER_PARENT_LABEL,
        color: '#c89040',
      },
    },
    { id: 'lockedPhase', entries: phaseLocked, divider: phaseDivider(phaseLocked) },
    { id: 'grown', entries: pots.grown },
  ]

  return out.filter((section) => section.entries.length > 0)
})

/** Welche Zeile gerade quittiert. Rein visuell, daher reale Zeit. */
const flashedId = ref<string | null>(null)

function grow(id: string): void {
  if (!buyUpgrade(id)) return
  flash(id)
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
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
 * Die ANHEFTUNG rollt ebenfalls — und zwar ohne den `mayTravel`-Filter.
 *
 * Der Filter gehört dem ZEIGER: ein Schwenk über die Sperrliste soll die
 * Ansicht nicht durch den halben Baum fahren. Eine Anheftung ist die
 * absichtliche Geste, und bei einem gesperrten Knoten ist die Zeile drüben
 * genau das, wonach gesucht wird — dort steht der Sperrgrund samt
 * vollständiger Bedingungsliste.
 *
 * Nötig wurde das mit der einklappbaren Detailspalte: ein Klick im Baum fährt
 * sie aus und heftet an, und die Zeile dazu muss dann im Bild stehen. Vorher
 * war eine Anheftung immer eine Geste VOR einer bereits sichtbaren Liste.
 */
watch(pinnedId, (id) => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  clearArrival()
  if (id === null) return
  scrollToRow(id)
})

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
