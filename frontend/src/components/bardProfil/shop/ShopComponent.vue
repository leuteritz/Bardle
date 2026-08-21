<template>
  <div class="shop-frame" :class="{ 'shop-frame--tucked': !detailsOpen }">
    <!-- Star Forge — links der wachsende Sonnenbaum, rechts die Spalte mit
         allem Kaufbaren: erreichbare Angebote oben, die Upgrade-Liste darunter,
         zuletzt die Schublade mit Gesperrtem. Eine Abteilungs-Rail stand
         einmal rechts daneben; sie ist gestrichen (Herleitung an
         `FORGE_OFFER_TITLE` in `constants/forge.ts`). -->
    <ForgeTreePanel ref="treeRef" class="shop-tree-col" />

    <!-- Die Detailspalte fährt als EIN Stück seitlich hinaus; stehen bleibt die
         Griffleiste. Die BREITE der Spalte wechselt dabei in einem einzigen
         Frame, das Panel gleitet per `transform` — siehe das CSS unten. -->
    <div class="shop-forge-col">
      <div
        class="shop-forge-slide"
        :class="{ 'shop-forge-slide--parked': !detailsOpen }"
        :inert="paneInert"
      >
        <StarForgePanel v-if="panelMounted" />
      </div>
      <ForgeDetailsHandle />
    </div>

    <!-- TEMP: admin shortcut — buys every ray, branch, leaf, relic and
         constellation the CURRENT star phase allows, free of charge. Floated
         into the tree's top corner so it never takes part in the layout: the
         two bottom ones are taken, by the zoom control and the shortcut row.
         Remove together with `starForgeStore.adminMaxAll()`. -->
    <button class="shop-admin-max" title="Admin: buy every forge upgrade at once" @click="maxOutForge">
      <Icon icon="game-icons:anvil-impact" width="16" height="16" />
      DEV · Max Forge
    </button>

    <!-- Nur ein LEAVE — der Schleier ist ab Frame 1 voll deckend und wird
         weggeblendet, nie eingeblendet. -->
    <Transition name="stl-reveal">
      <ShopTabLoader v-if="loaderVisible" :started-at="loaderStartedAt" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useForgeDetailsPane } from '@/composables/ui/useForgeDetailsPane'
import { onKeybinding } from '@/composables/system/useKeybindings'
import { useHerald } from '@/composables/ui/useHerald'
import {
  BARD_PROFILE_RAIL_MAX_PX,
  BARD_PROFILE_RAIL_MIN_PX,
  BARD_PROFILE_RAIL_VW,
  FORGE_DETAILS_RAIL_PX,
  FORGE_DETAILS_SLIDE_MS,
  FORGE_SHOP_LOADER_MIN_MS,
  FORGE_SHOP_LOADER_SETTLE_FRAMES,
} from '@/config/constants'
import ForgeTreePanel from './ForgeTreePanel.vue'
import StarForgePanel from './StarForgePanel.vue'
import ForgeDetailsHandle from './ForgeDetailsHandle.vue'
import ShopTabLoader from './ShopTabLoader.vue'

const forgeStore = useStarForgeStore()
const uiStore = useUiStore()
const { announceReceipt } = useHerald()

/**
 * Was der Zeiger berührt hat, ist gesehen — und der azurne „NEW"-Rahmen daran
 * erledigt.
 *
 * EIN Wächter für BEIDE Spalten: `spotlightId` ist `listHoverId ?? treeHoverId`,
 * ein Knoten im Baum und seine Zeile in der Liste melden sich also über dieselbe
 * Ref. Er hängt hier und nicht in einer der beiden Spalten, weil dies die
 * einzige Komponente ist, die beide überspannt — in `ForgeUpgradesSection`
 * verschwände er beim Abteilungswechsel mitsamt seinem `v-if`, obwohl der Baum
 * daneben weiterhin bedienbar ist.
 */
const { spotlightId, hoverId, pinned, clearPin, resetForgeSpotlight } = useForgeSpotlight()
const { detailsOpen, closeDetails } = useForgeDetailsPane()

watch(spotlightId, (id) => {
  if (id) forgeStore.acknowledgeShopEntry(id)
})

/**
 * Und derselbe Wächter noch einmal am ZEIGER allein.
 *
 * `spotlightId` ist `pinnedId ?? listHoverId ?? treeHoverId`, und seit der Fokus
 * dauerhaft steht (Herleitung an `hoverId` in `useForgeSpotlight`), bewegt er
 * sich beim Überfahren anderer Einträge nicht mehr. Quittiert wurde damit
 * ausgerechnet das, was der Spieler gerade NICHT ansieht — der angeheftete
 * Eintrag —, während die Marke an jeder überfahrenen Zeile stehenblieb.
 *
 * Zwei Wächter und keine Zusammenfassung: beide Fragen sind verschieden
 * („worauf zeigt er gerade" und „was hält er fest"), und beide sollen
 * quittieren. `acknowledgeShopEntry` ist idempotent, doppelte Meldungen kosten
 * also nichts.
 */
watch(hoverId, (id) => {
  if (id) forgeStore.acknowledgeShopEntry(id)
})

/**
 * Escape löst die ANHEFTUNG im Sternbaum — und meldet das, sonst schlösse
 * dieselbe Taste gleich das ganze Profil.
 *
 * `BardProfileMenu` entscheidet erst NACH dem Ereignisdurchlauf, ob es zumacht,
 * und liest dafür `defaultPrevented`; eine innere Ebene beansprucht die Taste
 * also mit `preventDefault()`. Dasselbe Protokoll bedient `TeamTabComponent`.
 *
 * Steht hier und nicht im Baum, aus zwei Gründen. Erstens ist dies die einzige
 * Komponente, die beide Spalten überspannt. Zweitens — und das ist der harte
 * Grund — **wird der Shop-Tab nach dem ersten Öffnen nie mehr abgerissen**:
 * `BardProfileMenu` rendert ihn als `v-if="mountedTabs.has('shop')"` plus
 * `v-show`, und `mountedTabs` wird nur befüllt. Ein `onMounted`-Listener bliebe
 * dauerhaft am Fenster hängen und verbrauchte die Taste auch im Idle-Orbit.
 */
const isVisible = computed(() => uiStore.bardActiveTab === 'shop')

/**
 * Das Recenter-Kürzel hängt aus demselben Grund hier wie Escape: der Tab bleibt
 * gemountet, ein `onKeybinding` im Baum verbrauchte die Taste also auch im
 * Idle-Orbit. Wer weiss, ob die Spalte sichtbar ist, meldet an — wer die Kamera
 * hält, führt aus.
 */
const treeRef = ref<InstanceType<typeof ForgeTreePanel> | null>(null)
let releaseRecenter: (() => void) | null = null

function onEsc(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  // Von innen nach aussen: erst die Anheftung, dann die Spalte, dann darf das
  // Modal. Zwei Ebenen in EINEM Tastendruck wären ein Zufallsergebnis — der
  // Spieler drückt einmal und verliert zwei Zustände, von denen er einen noch
  // brauchte.
  if (pinned.value) {
    clearPin()
    // Verbraucht: das Modal darüber prüft `defaultPrevented` und bleibt stehen.
    event.preventDefault()
    return
  }
  if (detailsOpen.value) {
    closeDetails()
    event.preventDefault()
  }
}

/* ── Was das geparkte Panel aus der Bedienung nimmt ────────────────────────
 *
 * Es steht hinter der Griffleiste und ist abgeschnitten, aber es steht — ohne
 * `inert` liefe die Tabulatorreihenfolge durch ein gutes Dutzend Knöpfe, die
 * niemand sieht.
 *
 * Umgeschaltet wird es NACH der Fahrt, nicht mit ihr, und das ist gemessen:
 * `inert` invalidiert den Fokusbaum eines grossen Teilbaums, und synchron zum
 * Klick fällt diese Arbeit genau in den ersten Frame der Bewegung. Alternierend
 * am Produktionsbuild, 4 Runden, längster Einzelframe beim Ausfahren:
 *
 *   mit `inert` synchron   39,0 ms · Frames > 33 ms: 2/2/1/2
 *   ohne `inert`           30,6 ms · Frames > 33 ms: 0/0/1/0
 *
 * Die Verzögerung kostet nichts, was jemand merkt. `inert` nimmt neben dem
 * Fokus auch die Klicks — und für die Dauer der Einfahrt ist genau das richtig:
 * auf ein Ziel, das gerade unter dem Zeiger wegfährt, klickt niemand absichtlich.
 * Danach stimmt der Zustand wieder. `setTimeout` und nicht `gameTimeout()` —
 * das hier ist Bedienung, keine Spielzeit.
 */
const paneInert = ref(true)
let inertTimer: ReturnType<typeof setTimeout> | null = null

watch(detailsOpen, (open) => {
  if (inertTimer !== null) clearTimeout(inertTimer)
  inertTimer = setTimeout(() => {
    inertTimer = null
    paneInert.value = !open
  }, FORGE_DETAILS_SLIDE_MS)
})

/* ── Der Ladeschleier ──────────────────────────────────────────────────────
 *
 * Gemessen am Produktionsbuild (Full HD, frische Sitzung, 1600-ms-Fenster,
 * Grundlast 17 ms / 0 Frames > 33 ms): das ERSTE Öffnen dieses Tabs kostet
 * 392 ms längsten Einzelframe, 3 Frames über 33 ms und 550 ms verlorene Zeit —
 * mehr als Team-Tab (308) und Boss-Arena (225). Wiederholte Öffnungen liegen
 * bei 47 ms, und die sieht niemand.
 *
 * Deshalb GENAU EINMAL je Sitzung. Das Flag darf komponentenlokal liegen, weil
 * der Tab nach dem ersten Öffnen nie mehr abgerissen wird (siehe oben) —
 * dasselbe wie `boardBuilt` im Team-Tab und `arenaBuilt` in der Arena.
 */
const loaderVisible = ref(false)
const loaderStartedAt = ref(0)
const shopBuilt = ref(false)
/**
 * Die Detailspalte entsteht einen Frame NACH dem Baum.
 *
 * Sie startet eingeklappt — niemand sieht also, wann sie kommt, und ihr Aufbau
 * muss nicht in denselben Frame wie der des Baums. Damit zerfallen die 392 ms
 * in zwei Lasten statt einer, und das erste Ausklappen findet ein fertiges
 * Panel vor, statt den Aufbau nachzuholen.
 */
const panelMounted = ref(false)

let settleFrame = 0
let revealTimer: ReturnType<typeof setTimeout> | null = null
let mountFrame = 0

function cancelReveal(): void {
  cancelAnimationFrame(settleFrame)
  if (revealTimer !== null) {
    clearTimeout(revealTimer)
    revealTimer = null
  }
}

function cancelInert(): void {
  if (inertTimer !== null) {
    clearTimeout(inertTimer)
    inertTimer = null
  }
}

/**
 * Erst zählen, was WIRKLICH gezeichnet wurde, dann die Mindeststandzeit
 * abwarten — ein einzelner rAF käme zurück, während der Baum noch seine Kanten
 * legt. `setTimeout` und nicht `gameTimeout()`: der Schleier ist reine Anzeige
 * und hat mit der Spielzeit nichts zu tun.
 */
function revealWhenPainted(): void {
  let left = FORGE_SHOP_LOADER_SETTLE_FRAMES
  const step = (): void => {
    if (left > 0) {
      left--
      settleFrame = requestAnimationFrame(step)
      return
    }
    shopBuilt.value = true
    const shown = performance.now() - loaderStartedAt.value
    revealTimer = setTimeout(
      () => {
        revealTimer = null
        loaderVisible.value = false
      },
      Math.max(0, FORGE_SHOP_LOADER_MIN_MS - shown),
    )
  }
  step()
}

onMounted(() => {
  mountFrame = requestAnimationFrame(() => {
    panelMounted.value = true
    // Die Zählung beginnt erst hier: sonst deckte der Schleier auf, während die
    // Spalte hinter ihm noch entsteht.
    if (loaderVisible.value) revealWhenPainted()
  })
})

watch(
  isVisible,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', onEsc)
      releaseRecenter ??= onKeybinding('forgeRecenter', () => treeRef.value?.recenterCamera())
      if (!shopBuilt.value && !loaderVisible.value) {
        loaderStartedAt.value = performance.now()
        loaderVisible.value = true
      }
      return
    }
    window.removeEventListener('keydown', onEsc)
    releaseRecenter?.()
    releaseRecenter = null
    cancelReveal()
    loaderVisible.value = false
    // Wer mitten im Aufbau wegwechselt, hat die Fläche trotzdem stehen — ein
    // zweiter Schleier beim nächsten Öffnen wäre reine Wartezeit für ein
    // Problem, das es dann nicht mehr gibt.
    if (panelMounted.value) shopBuilt.value = true
    // Aus demselben Grund wie oben: das `onBeforeUnmount` des Baums feuert beim
    // Tabwechsel gar nicht, weil er gemountet bleibt. Ohne diese Zeile stünde
    // die Anheftung der letzten Sitzung beim nächsten Öffnen noch da.
    //
    // `detailsOpen` wird hier BEWUSST nicht mitgeräumt: es ist Sitzungs- und
    // nicht Besuchsgedächtnis (siehe `useForgeDetailsPane`).
    resetForgeSpotlight()
  },
  { immediate: true },
)

onUnmounted(() => {
  window.removeEventListener('keydown', onEsc)
  releaseRecenter?.()
  releaseRecenter = null
  cancelReveal()
  cancelInert()
  cancelAnimationFrame(mountFrame)
})

function maxOutForge(): void {
  forgeStore.adminMaxAll()
  announceReceipt({
    // `forged`, nicht `forge`: jeder echte Forge-Kauf meldet sich unter dieser
    // Art. Mit `forge` trug ausgerechnet der Admin-Knopf ein anderes Label und
    // eine andere Farbe als alles, was er auslöst.
    kind: 'forged',
    eyebrow: 'ADMIN',
    headline: 'Forge maxed out',
    subline: 'For this star phase',
    // Ein Zustand, kein Vorgang: ein `×3` daran zählte nur die Klicks.
    countable: false,
  })
}

/** Die Detailspalte — dieselbe Breite wie die Schiene im Skill-Tree-Tab. */
const detailWidth = `clamp(${BARD_PROFILE_RAIL_MIN_PX}px, ${BARD_PROFILE_RAIL_VW}vw, ${BARD_PROFILE_RAIL_MAX_PX}px)`
const handleWidth = `${FORGE_DETAILS_RAIL_PX}px`
/** Ausgefahren trägt die Spalte beides nebeneinander, eingefahren nur die Leiste. */
const openWidth = `calc(${detailWidth} + ${handleWidth})`
const slideMs = `${FORGE_DETAILS_SLIDE_MS}ms`
</script>

<style scoped>
/* `clip` und nicht `hidden`, und das ist keine Kosmetik: `hidden` macht den
   Rahmen zu einem SCROLLPORT: er schneidet nicht nur ab, er lässt sich auch
   scrollen — nur eben ohne Leiste. Seit die Detailspalte einklappt, steht ihre
   Liste im geparkten Zustand ausserhalb dieses Rahmens, und ein
   `scrollIntoView()` darin zog prompt den ganzen Shop-Tab seitwärts (gemessen:
   448 px, der Baum halb aus dem Bild). `clip` schneidet genauso ab, erzeugt
   aber keinen Scrollport — damit ist die Fehlerklasse ausgeschlossen und nicht
   bloss ihr erster Fall. Der Kompakt-Breakpoint unten setzt bewusst wieder
   `overflow-y: auto`: dort SOLL der Rahmen scrollen, und dort ist die Spalte
   nie geparkt. */
.shop-frame {
  position: relative;
  display: flex;
  height: 100%;
  background: #111008;
  overflow: clip;
}

/* Der Baum bekommt jeden freien Pixel; die Forge-Spalte bleibt in einer
   lesbaren, begrenzten Breite über alle Desktop-Auflösungen (1280 → 4K).
   Die Naht zwischen zwei Spalten ist jeweils der `border-left` der rechten —
   eine zweite Linie hier verdoppelte sie. */
.shop-tree-col {
  flex: 1;
  min-width: 0;
}

/* Die Breite steht als `BARD_PROFILE_RAIL_*` in `constants/ui.ts` samt
   Herleitung — der Skill-Tree-Tab legt sein Detail-Blatt in dieselbe Schiene,
   und zwei eigene Zahlen dafür liefen still auseinander. Dazu kommt die
   Griffleiste, die auch eingefahren stehen bleibt.

   Diese Zahl wechselt HART, ohne Transition, und das ist Absicht: eine
   animierte `flex-basis` liefe pro Frame durch Layout (Performance-Regel 1) und
   liesse den `ResizeObserver` des Baums daneben pro Frame `fitScale` neu
   rechnen. So feuert er genau einmal je Umschaltung — und was man WANDERN
   sieht, ist das Panel darin, das per `transform` fährt. */
.shop-forge-col {
  position: relative;
  min-width: 0;
  flex: 0 0 v-bind(openWidth);
}

.shop-frame--tucked .shop-forge-col {
  flex-basis: v-bind(handleWidth);
}

/* Das Panel behält seine Breite IMMER — genau deshalb überlebt die
   Scrollposition von `.sf-body` das Zuklappen, ohne dass jemand sie sichert:
   es wird nie neu umbrochen, nur verschoben.

   Hier steht bewusst KEIN `transform: translateX(0)` und kein `will-change`:
   beides machte dieses Element zum Containing Block für `position: fixed`, und
   die beiden schwebenden Kärtchen darin (`ForgeRowTooltip`,
   `ForgeOfferTooltip`) sässen dann um die Panelkante versetzt. */
.shop-forge-slide {
  position: absolute;
  top: 0;
  bottom: 0;
  right: v-bind(handleWidth);
  width: v-bind(detailWidth);
  z-index: 1;
  transition: transform v-bind(slideMs) ease;
}

/* Geparkt: hinter der Griffleiste, vom `overflow: hidden` des Rahmens
   abgeschnitten. Verschoben wird, mehr nicht.

   Hier stand einmal ein `visibility: hidden` mit `0s linear <dauer>`
   Verzögerung, damit die geparkte Fläche nicht dauerhaft gerastert bleibt
   (`docs/performance.md`, Regel 5) — es ist zurückgenommen, und zwar gemessen.
   Am Produktionsbuild, Full HD, längster Einzelframe beim AUSfahren (die
   letzten beiden Zeilen alternierend über vier Runden, der Rest blockweise):

     mit `visibility`                       42 ms · 2 Frames > 33 ms
     dasselbe, Fahrt einen rAF verzögert    47 ms · 2 Frames > 33 ms
     ohne `visibility`, `inert` synchron    39 ms · 2 Frames > 33 ms
     ohne `visibility`, `inert` verzögert   25 ms · 0 Frames > 33 ms

   Das Wiederherstellen der Ebene fällt genau in den ersten Frame der Fahrt, und
   dort ist der Ruck am sichtbarsten. Der Versuch, ihn per rAF davorzuziehen,
   machte es schlechter statt besser: `visibility: visible` allein rastert noch
   nichts, das geschieht ohnehin erst beim nächsten Paint — der zusätzliche
   Frame verschob den Aufwand nur.

   Bezahlt wird das mit einer gerasterten Ebene in Ruhe (längster Frame 8,4 →
   11,1 ms, in beiden Fällen kein Frame über 33 ms). Was `visibility` sonst noch
   mit erledigte — dass die Tabulatorreihenfolge nicht durch ein Panel läuft,
   das gar nicht dasteht — übernimmt das `inert` am Element. */
.shop-forge-slide--parked {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .shop-forge-slide,
  .shop-forge-slide--parked {
    transition: none;
  }
}

/* Nur ein LEAVE. Ein `enter` hiesse, den Schleier einzublenden — und solange er
   halbdurchsichtig ist, sieht man genau das, was er verdecken soll. */
.stl-reveal-leave-active {
  transition: opacity 0.3s ease;
}

.stl-reveal-leave-to {
  opacity: 0;
}

/* ── TEMP admin button ─────────────────────────────────────────── */
/* Oben links in der Baumspalte. Die untere linke Ecke gehört der Kürzel-Zeile,
   die untere rechte der Zoom-Leiste — die obere Kante ist die einzige, die frei
   ist.

   `top` und `left` tragen DIESELBE Zahl, und das ist jetzt die ganze Regel. Hier
   stand eine Rechnung aus der Höhe des Ertrags-Kopfs, unter den der Knopf
   ausweichen musste; der Kopf ist weg, und mit ihm die zweite Quelle für diese
   Kante. Fällt mit dem Knopf zusammen weg. */
.shop-admin-max {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: 1px solid #4a3010;
  border-radius: 4px;
  background: #16110a;
  color: #c89040;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.shop-admin-max:hover {
  border-color: #c89040;
  color: #e8c040;
}

/* Narrow layouts: stack tree above the forge panel, rail becomes a strip.
   Der Klappmechanismus ist hier abgeschaltet — gestapelt gibt es keine Breite
   zurückzugewinnen, und ein Panel, das nach rechts hinausfährt, während der
   Rahmen selbst scrollt, wäre schlicht weg. */
@media (max-width: 900px) {
  .shop-frame {
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #5c3310 #111;
  }

  .shop-tree-col {
    flex: 0 0 420px;
    border-bottom: 2px solid #5c3310;
  }

  .shop-forge-col,
  .shop-frame--tucked .shop-forge-col {
    flex: 1 0 auto;
    overflow-y: visible;
  }

  .shop-forge-slide,
  .shop-forge-slide--parked {
    position: static;
    width: auto;
    transform: none;
    visibility: visible;
    transition: none;
  }

  .fdh {
    display: none;
  }
}
</style>
