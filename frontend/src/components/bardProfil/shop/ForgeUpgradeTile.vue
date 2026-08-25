<template>
  <div
    class="fut-row"
    :class="[
      `fut-row--${entry.state}`,
      {
        'fut-row--ready': entry.canBuy,
        'fut-row--short': short,
        'fc-spot': isSpot,
        'fut-row--focus': isFocused,
        'fc-dimmed': isDimmed,
        'fut-row--veiled': isVeiled,
        'fut-row--needed': focusRequired && !isFocused,
      },
    ]"
    :style="{ '--node-c': entry.color }"
    :data-forge-id="entry.id"
    :aria-current="isFocused ? 'true' : undefined"
    @mouseenter="setListHover(entry.id)"
    @click="focusNode(entry.id)"
  >
    <!-- Die Fokus-Marke. Dasselbe Glyph, das der Kreis im Baum trägt — daran
         erkennt man beide Seiten als DIESELBE Auswahl wieder. Sie ist der
         einzige Unterschied zwischen „der Zeiger steht hier" und „das hier ist
         festgehalten"; ohne sie wüsste niemand, ob die Hervorhebung hält. -->
    <span v-if="isFocused" class="fut-pin" aria-hidden="true">
      <Icon :icon="FORGE_PIN_ICON" width="100%" height="100%" />
    </span>

    <!-- WIRD FÜR DEN FOKUS GEBRAUCHT — die Marke, die den Schleier lesbar
         macht: sie steht an genau den Zeilen, die hell durch ihn hindurchstehen,
         und sagt WARUM.

         Derselbe Sitz wie die Pin-Marke, und beide treffen sich nie: eine Zeile,
         die der Fokus braucht, ist nicht selbst der Fokus (`isFocused` steht in
         der Weiche). Oben rechts ginge nicht — dort sitzt die NEU-Marke —, und
         die ganze rechte Höhe gehört der Kauffläche.

         Reiner Text, kein Glyph: die Zeile trägt schon Knotenbild, Stufe, Name,
         Wirkungssprung, Materialband und bis zu zwei Marken. Die Wortwahl ist
         die des Meep-Baums („Still needed first"), damit beide Leitern dasselbe
         sagen. -->
    <span v-if="focusRequired && !isFocused" class="fut-needed">{{ FORGE_FOCUS_REQ_LABEL }}</span>

    <!-- NEU SEIT DEM LETZTEN BLICK — dieselbe Marke, dieselbe Ecke wie am
         Header und am Profil-Reiter (`ShopReadyBadge`). Der Spieler folgt ihr
         von der Ecktaste bis hierher, ohne dass die Form unterwegs wechselt;
         genau das konnte die „NEW"-Pille im Fuß nicht, an deren Stelle sie
         steht.

         Die ZAHL ist dieselbe, die der Stapelknopf trägt: wie viele Stufen jetzt
         auf einmal gehen — und bei einer einzigen steht dort eine „1". Sie
         wiederholt sich damit bewusst; der Knopf ist die HANDLUNG („kauf sechs"),
         die Marke die MELDUNG („hier sind sechs dazugekommen"), und wer nur
         überfliegt, liest die Meldung zuerst.

         Eine Fassung ohne Ziffer stand hier einmal, weil die beiden sich
         gemessen überlappten (143 px² bei Full HD). Das war ein Sitz-Problem und
         keines der Aussage: die Marke ist seitdem kleiner, randlos und rückt
         fünf statt vier Pixel ein — sie streift die Rundung des Knopfs, statt
         auf ihm zu liegen.

         Innerhalb der Zeile und nicht überstehend, weil die Zeile
         `overflow: hidden` trägt — dieselbe Auflage wie an der Ecktaste im
         Header, wo `.header-side` sie stellt. Klickbar bleibt der Knopf: die
         Marke nimmt keine Zeiger an (Regel unten). -->
    <ShopReadyBadge
      v-if="fresh"
      class="fut-fresh-badge"
      :count="freshCount"
      :title="FORGE_FRESH_TITLE"
      :label="FORGE_FRESH_TITLE"
    />

    <div class="fut-flash" :class="{ 'fut-flash--on': flashed }" aria-hidden="true" />

    <!-- Die Ankunftsebene. Statischer Schein, animiert wird allein ihre
         Deckkraft (Performance-Regel 2/11) — und auf `inset: 0`, weil die Zeile
         `overflow: hidden` trägt und ein negativer Einzug abgeschnitten würde.
         Genau derselbe Sitz wie beim Quittungsblitz darüber.

         Sie hatte einmal zwei weitere Anlässe, und beide sind gefallen: „seit
         dem letzten Blick bezahlbar" (Azur) ist zur Marke in der Ecke geworden,
         „das Günstigste, was gerade geht" (grün) ersatzlos. Übrig bleibt ein
         EREIGNIS — die Zeile ist eben hereingerollt —, und damit atmet in der
         ganzen Liste nichts mehr dauerhaft. -->
    <div v-if="arrived" class="fut-halo fut-halo--arrived" aria-hidden="true" />

    <!-- Nackt, ohne Sockel: der gerahmte Kasten davor kostete Breite, die die
         Zeile für Stufe, Wirkung und Knopf braucht. Die Knotenfarbe trägt das
         Glyph selbst. -->
    <span class="fut-glyph">
      <Icon
        :icon="entry.icon"
        :width="FORGE_ROW_ICON_SIZE"
        :height="FORGE_ROW_ICON_SIZE"
        class="fut-ico"
        :style="{ color: entry.color }"
      />
      <!-- Hier hingen einmal ZWEI Abzeichen an diesem Glyph: ein Schloss für
           „gesperrt" und ein grüner Kreis mit Blitz für „kaufbar". Der grüne
           fiel zuerst, weil er das dritte Zeichen für dieselbe Sache war — die
           Zeile trägt bei `canBuy` grünen Grund, Waschung und einen grünen Knopf
           mit Preis, und in der Ecke oben rechts sitzt die NEU-Marke.

           Das Schloss ist mit den gesperrten Einträgen selbst gegangen: diese
           Liste zeigt nur noch Freigeschaltetes. Am Knoten im Baum hängt es
           weiter (`.fc-lock-badge` in rpg-theme.css) — dort ist es die
           Auskunft, die diese Spalte nicht mehr geben muss. -->
    </span>

    <!-- ══ KAUFBAR, IM SPAREN, GEDECKELT ═════════════════════════
         Die drei Zustände, die diese Liste noch führt. Hier stand einmal eine
         Weiche mit einem zweiten Zweig für GESPERRT — Sperrsatz statt Preis,
         Bedingungsliste statt Materialband, Name statt Stufe. Der ist mit den
         gesperrten Einträgen gegangen; was er zeigte, zeigt jetzt der Knoten
         im Baum. -->
    <div class="fut-main">
      <div class="fut-head">
        <span class="fut-text">
          <span class="fut-lvl">
            {{ levelParts.big }}<span class="fut-lvl-max">{{ levelParts.max }}</span>
          </span>
          <span class="fut-name" :style="{ color: entry.color }">
            <span
              v-for="(seg, i) in highlightSegments(entry.name, searchQuery)"
              :key="i"
              :class="{ 'fut-name-hit': seg.hit }"
              >{{ seg.text }}</span
            >
          </span>
        </span>

        <!-- Ein gedeckelter Strahl hat einen Sprung, den er nicht nehmen
             darf — der Grund ist hier die nützlichere Auskunft als das
             Zahlenpaar. -->
        <span v-if="entry.state === 'capped'" class="fut-capped">{{ entry.lockReason }}</span>
        <span v-else class="fut-delta">
          <span class="fut-delta-now">{{ nowText }}</span>
          <span class="fut-delta-arrow">→</span>
          <span class="fut-delta-next">{{ entry.nextText }}</span>
        </span>
      </div>

      <!-- Zweite Zeile: das Lager, und sonst nichts mehr.
           Rechts sass hier einmal die BEST-BUY-Pille; mit ihr ist der letzte
           Grund gefallen, den Fuß auch ohne Materialien zu stellen. Die
           Bedingung sitzt deshalb am FUSS und nicht mehr am Band darin: ein
           leerer Flex-Kasten wäre unsichtbar, aber `.fut-main` trägt
           `gap: 6px` — die Lücke darunter bliebe und wäre die einzige Zeile
           der Liste, die tiefer sitzt als ihre Nachbarn.

           Was das Lager kostet, steht rahmenlos (`flat`), also nur Bild und
           Zahl. Der Chime-Preis steht NICHT hier, sondern im Knopf
           (`:gold="0"` lässt ihn weg): er ist die eine Zahl, die jeder Eintrag
           hat, und gehört an die Stelle, an der geklickt wird. Die Materialien
           kann der Knopf nicht mittragen — zwei Positionen messen auch ohne
           Rahmen ~150px und machten ihn breiter als den Namen daneben. -->
      <div v-if="entry.materials.length > 0" class="fut-foot">
        <ForgeCostRow
          class="fut-mats"
          inline
          flat
          :label="false"
          :gold="0"
          :gold-ok="true"
          :materials="entry.materials"
        />
      </div>
    </div>

    <!-- Die Kauffläche. Feste Gesamtbreite über die volle Zeilenhöhe: die
         Kanten fluchten damit über die ganze Liste, und der Stapelknopf nimmt
         seine Breite dem Preisknopf ab, nicht der Zeile — sonst rückte die
         Kante jedes Mal, wenn die tickenden Chimes eine Schwelle
         überschreiten. -->
    <div class="fut-buy-group">
      <!-- NUR der Preis. Das Verb „FORGE" stand hier einmal darüber und ist
           gefallen — Herleitung im Kopfkommentar und an `FORGE_GROW_LABEL`.
           Es lebt weiter im `aria-label`: die Fläche zeigt eine Zahl, wer sie
           vorgelesen bekommt, braucht die Handlung dazu. Ein gedeckelter Knopf
           nennt dort seinen Zustand statt der Handlung, weil er sichtbar ein
           Schloss trägt und nichts zu forgen ist. -->
      <button
        class="fut-buy"
        :class="{
          'fut-buy--capped': entry.state === 'capped',
          'fut-buy--short': entry.state !== 'capped' && !entry.canBuy,
        }"
        :disabled="!entry.canBuy"
        :aria-label="buyAriaLabel"
        :title="buyTitle"
        @click.stop="$emit('buy', entry.id)"
      >
        <Icon
          v-if="entry.state === 'capped'"
          :icon="FORGE_LOCK_ICON"
          :width="FORGE_ROW_BUY_LOCK_SIZE"
          :height="FORGE_ROW_BUY_LOCK_SIZE"
          class="fut-buy-lock"
          aria-hidden="true"
        />
        <!-- Bis zu zwei Zeilen, Chimes oben, Meeps darunter. Gestapelt und
             nicht nebeneinander: die Kauffläche ist FEST breit, damit die
             Kanten über die ganze Liste fluchten — in der Höhe ist Platz, in
             der Breite nicht. Nur die Knoten von The Wandering tragen
             überhaupt eine zweite Zeile. -->
        <span v-else class="fut-buy-stack">
          <span v-if="entry.goldCost > 0" class="fut-buy-price" :class="priceFitClass">
            <img :src="FORGE_CHIME_IMAGE" class="fut-buy-chime" alt="Chimes" />
            {{ priceText }}
          </span>
          <span v-if="entry.meepCost > 0" class="fut-buy-price" :class="meepFitClass">
            <img :src="FORGE_MEEP_IMAGE" class="fut-buy-chime" alt="Meeps" />
            {{ meepText }}
          </span>
        </span>
      </button>

      <!-- Nur, wenn mehr als eine Stufe auf einmal geht. Die Zahl kommt aus
           der Liste (`ForgeUpgradesSection`) und ist dort eingefroren,
           solange der Zeiger über der Liste steht — dieselbe Regel wie bei
           der Reihenfolge, und aus demselben Grund. -->
      <button
        v-if="bulkCount > 1"
        class="fut-bulk"
        :aria-label="`${FORGE_GROW_LABEL} ${entry.name} ${bulkCount} times`"
        :title="`${entry.name} → ${FORGE_LEVEL_PREFIX}${entry.level + bulkCount}`"
        @click.stop="$emit('buyMany', entry.id)"
      >
        {{ bulkLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Ein Eintrag der Upgrade-Liste als ZEILE.
 *
 * Eine waagerechte Achse: nacktes Knoten-Glyph gross vorn · Stufe gross mit dem
 * Namen klein darunter · Wirkungssprung rechts · Kauffläche ganz rechts, und
 * unter Stufe und Name ein schmales Band mit dem Materialbedarf. Gemessen rund
 * 95px, und zwar für JEDEN Zustand gleich — auch für die gesperrte Zeile ohne
 * Knopf und Band.
 *
 * Drei Fassungen davor, alle drei aus demselben Grund zurückgenommen: sie
 * kosteten Fläche, ohne dafür etwas zu sagen (Herleitung samt Messwerten an
 * `FORGE_ROW_ICON_SIZE`). Zuletzt gefallen sind die gerahmten Chips um jede
 * Kostenposition.
 *
 * EINE Runde lief ganz ohne Glyph: die 3px-KANTE links in der Knotenfarbe
 * sollte es ersetzen — sie unterscheidet einen Eintrag ja auch und kostet ein
 * Zwölftel der Breite. Im fertigen Bild war die Liste damit eine Wand aus Text.
 * Das Glyph ist zurück und grösser als vorher; die Kante bleibt als leisere
 * Zweitstimme und wird beim Spotlight voll deckend, statt dass ein zweiter
 * Streifen danebentritt.
 *
 * Der Knopf ist EINE flache Fläche mit EINER Angabe: dem Preis, waagerecht
 * neben dem Chime-Bild. Das Verb „FORGE" stand darüber und ist gefallen — es
 * war in allen fünfundvierzig Zeilen dasselbe Wort und sagte damit nichts, was
 * der Reitername, die Sammelkaufleiste („Forge all ready") und die Quittung
 * nicht schon sagen. Dafür nahm es die obere Hälfte der Fläche und drückte die
 * einzige Angabe, die sich von Zeile zu Zeile UNTERSCHEIDET, in eine kleine
 * blasse Zweitzeile mit `opacity: 0.82`. Jetzt ist der Preis der Inhalt, voll
 * deckend und rund anderthalbmal so gross.
 *
 * Weil die Fläche fest breit ist (sonst rückte die Kante mit jedem Tick), trägt
 * der Preis eine Schriftstufe nach ZEICHENZAHL — `forgeRowPriceFit()`. Eine
 * feste grosse Schrift schnitte „123.45Qa" ab, und ein halber Preis ist keiner.
 *
 * Der gedeckelte Knopf ist der einzige ohne Preis: es ist nichts zu bezahlen,
 * solange der Deckel liegt. Er zeigt an derselben Stelle das Schloss
 * (`FORGE_LOCK_ICON`), das auch der gesperrte Knoten im Baum trägt.
 *
 * Seine FARBE ist die Aussage — grün heisst kaufbar, rot heisst „das
 * reicht nicht", bernstein heisst gedeckelt. Daran hängt mehr als die Optik:
 * die Kostenzeile darunter trägt seit dem `flat`-Umbau kein ✓/✕ mehr, ihr
 * Mangel steht allein in der roten Zahl. Der rote Knopf ist die zweite
 * Kodierung dazu — wer ihn entfärbt, muss die Zeichen zurückholen. Der Wegfall
 * des Verbs ändert daran nichts: die rote Zahl steht dort jetzt nur grösser.
 *
 * Der Knopf allein trug es aber NICHT. Eine Runde lang war er der einzige
 * verlässliche Unterschied zwischen kaufbar und nicht kaufbar — die Zeile
 * darunter unterschied sich nur in einer 1px-Rahmenfarbe —, und weil Rot die
 * Warnfarbe ist, die der Blick zuerst sucht, las sich eine Liste mit zwanzig
 * roten und fünf grünen Knöpfen als zwanzig Treffer und fünf Nebensachen. Die
 * Aussage liegt deshalb jetzt auf der GANZEN Zeile, in beide Richtungen:
 * kaufbar tritt hervor (`--ready`: grüner Grund, Waschung zum Knopf, statisches
 * Innenlicht), „reicht nicht" tritt zurück (`--short`: dunklerer Grund,
 * gedimmtes Glyph, flach-dunkelroter Knopf statt leuchtendem Verlauf).
 *
 * BEWEGT ist davon nichts, und inzwischen gilt das für die ganze Liste: die
 * eine atmende Zeile war die mit der BEST-BUY-Marke, und die ist gefallen. Bei
 * zwanzig kaufbaren Einträgen hätten sonst zwanzig Ebenen gegeneinander geatmet
 * — der Grund, warum es je nur eine geben durfte.
 *
 * Was sie NICHT ist: eine volle Karte mit Beschreibungssatz und beschriftetem
 * Now/After-Kasten. Die stand hier schon einmal und wurde zurückgenommen. Der
 * Beschreibungssatz, der Rang und der Elternknoten bleiben deshalb im
 * schwebenden Kärtchen (`ForgeRowTooltip`); das Archiv behält seine Einzeiler
 * (`ForgeGrownRow`).
 *
 * Die ZEILE selbst tut nichts — gekauft wird über ihre Knöpfe. Eine breite
 * Kauffläche, die man beim Scrollen streift, wäre teuer bezahlt (dieselbe
 * Entscheidung wie an der Skill-Karte).
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useForgeSearch } from '@/composables/ui/useForgeSearch'
import { highlightSegments } from '@/utils/ui/searchHighlight'
import { forgeLevelParts, forgeRowPriceFit } from '@/composables/ui/useForgeUpgrades'
import { formatNumber } from '@/config/ui/numberFormat'
import ForgeCostRow from './ForgeCostRow.vue'
import ShopReadyBadge from '@/components/ui/ShopReadyBadge.vue'
import type { ForgeUpgradeEntry } from '@/types'
import {
  FORGE_CARD_FLASH_MS,
  FORGE_SPOTLIGHT_ARRIVAL_MS,
  FORGE_CHIME_IMAGE,
  FORGE_MEEP_IMAGE,
  FORGE_FOCUS_DIM_OPACITY,
  FORGE_FOCUS_REQ_LABEL,
  FORGE_REQ_OPEN_COLOR,
  FORGE_COUNT_TOKEN,
  FORGE_FRESH_BADGE_ROW_PX,
  FORGE_FRESH_TITLE,
  FORGE_GROW_LABEL,
  FORGE_LEVEL_PREFIX,
  FORGE_LOCK_ICON,
  FORGE_PIN_ICON,
  FORGE_ROW_BULK_LABEL,
  FORGE_ROW_BULK_WIDTH_PX,
  FORGE_ROW_BUY_LOCK_SIZE,
  FORGE_ROW_BUY_WIDTH_PX,
  FORGE_ROW_BUY_WIDTH_COMPACT_PX,
  FORGE_ROW_ICON_SIZE,
  FORGE_SHORT_CHIMES_LABEL,
  FORGE_SHORT_MATERIAL_PREFIX,
  FORGE_TILE_CAPPED_LABEL,
} from '@/config/constants'

/* Muster `MeepSkillCard`: die Dauer steht in den Konstanten und wird von CSS
   und dem Timer in `ForgeUpgradesSection` aus derselben Quelle gelesen — den
   KEYFRAME-Namen setzt weiterhin die CSS-Klasse, nie JavaScript. */
const flashDuration = `${FORGE_CARD_FLASH_MS}ms`
const arriveMs = `${FORGE_SPOTLIGHT_ARRIVAL_MS}ms`
const buyWidth = `${FORGE_ROW_BUY_WIDTH_PX}px`
const buyWidthCompact = `${FORGE_ROW_BUY_WIDTH_COMPACT_PX}px`
const bulkWidth = `${FORGE_ROW_BULK_WIDTH_PX}px`
/* Statischer Wert, einmal je Zeile gesetzt — kein Frame-Wert (Performance-Regel
   3). Dasselbe Muster wie `bulkWidth` darüber. */
const freshBadgeSize = `${FORGE_FRESH_BADGE_ROW_PX}px`
const dimOpacity = String(FORGE_FOCUS_DIM_OPACITY)
const neededColor = FORGE_REQ_OPEN_COLOR

const props = withDefaults(
  defineProps<{
    entry: ForgeUpgradeEntry
    flashed: boolean
    /** Seit dem letzten Blick des Spielers bezahlbar geworden — trägt den azurnen
     *  Rahmen, bis der Zeiger die Zeile einmal berührt hat. */
    fresh: boolean
    /**
     * Wie viele Stufen Vorrat UND Lager gerade hergeben. Kommt von der Liste,
     * nicht aus `useForgeUpgrades()`: das Composable hier je Zeile aufzurufen
     * hiesse fünfundvierzig Kopien von `upgradeEntries` über fünfzig Knoten.
     */
    bulkCount?: number
    /**
     * Gerade von ausserhalb hereingerollt, weil der Zeiger drüben auf dem
     * zugehörigen Knoten steht. Ein EREIGNIS, kein Zustand — es vergeht von
     * selbst, und deshalb entscheidet die Liste darüber und nicht die Zeile:
     * nur sie weiss, ob die Zeile vorher überhaupt ausserhalb ihres Kastens lag.
     */
    arrived?: boolean
    /**
     * Der Fokus-Schleier liegt über der Liste.
     *
     * Kommt von der Liste und nicht aus `useForgeSpotlight()`: der Schleier
     * hängt nicht am Fokus allein, sondern daran, ob dabei überhaupt eine
     * SICHTBARE Zeile hell bleibt — und das weiss nur, wer die Abschnitte
     * rendert (`focusVeiled` in `ForgeUpgradesSection`).
     */
    focusVeiled?: boolean
    /** Diese Zeile ist eine noch offene Voraussetzung des fokussierten Knotens
     *  — sie bleibt hell und trägt die Marke. */
    focusRequired?: boolean
  }>(),
  { bulkCount: 0, arrived: false, focusVeiled: false, focusRequired: false },
)
defineEmits<{ (e: 'buy', id: string): void; (e: 'buyMany', id: string): void }>()

const { hoverId, pinnedId, setListHover, focusNode } = useForgeSpotlight()
/** Nur der FREITEXT hebt hervor — ein Facetten-Chip steht in keinem Namen. */
const { normalizedQuery: searchQuery } = useForgeSearch()

/** Diese Zeile ist die festgehaltene Auswahl. */
const isFocused = computed(() => pinnedId.value === props.entry.id)

/**
 * Der Zeiger meint diese Zeile — hier oder drüben auf ihrem Knoten.
 *
 * Der FOKUS zählt mit dazu: er ist die stärkere Form derselben Aussage. Beide
 * dürfen gleichzeitig gelten, und dann sieht die Zeile aus wie eine fokussierte,
 * über der zusätzlich der Zeiger steht.
 */
const isSpot = computed(() => hoverId.value === props.entry.id || isFocused.value)

/**
 * Zurücktreten tut die Zeile nur, solange ein ZEIGER unterwegs ist — nicht,
 * solange bloss ein Fokus steht.
 *
 * Das ist der Unterschied zum Baum, und er ist beabsichtigt. Dort trägt die
 * Dämpfung Auskunft: die Voraussetzungsknoten stehen hell in ihr. Hier trägt sie
 * keine — hundertvierundfünfzig dauerhaft auf 0,42 gesetzte Zeilen lesen sich
 * als abgeschaltete Liste, und zwar genau seit ein Klick die Hauptgeste ist. Der
 * Spieler soll die nächste Zeile lesen können, die er anklickt.
 */
const isDimmed = computed(
  () => hoverId.value !== null && hoverId.value !== props.entry.id && !isFocused.value,
)

/**
 * Zurückgetreten, weil ANDERSWO etwas festgehalten ist.
 *
 * Der Gegenpart zu `isDimmed` darüber, und getrennt von ihm, weil die beiden
 * verschieden lange stehen: der Zeiger ist flüchtig und darf hart dämpfen
 * (0,42), der Fokus steht bis zum Lösen und dämpft leiser
 * (`FORGE_FOCUS_DIM_OPACITY`). Treffen beide zusammen, gewinnt die spätere Regel
 * im Stylesheet — die des Zeigers, und das ist richtig: dann sieht der Spieler
 * gerade wirklich woandershin.
 *
 * Was den Schleier von der alten, zurückgenommenen Fassung unterscheidet, steht
 * nicht hier, sondern in `ForgeUpgradesSection`: er liegt nur, wenn er
 * gleichzeitig etwas HELL lässt.
 */
const isVeiled = computed(() => props.focusVeiled && !isFocused.value && !props.focusRequired)

/**
 * „Offen, aber es reicht nicht" — der Zustand, der ZURÜCKTRITT.
 *
 * Wörtlich dieselbe Weiche wie am Kaufknopf (`fut-buy--short`), und mit Absicht
 * nicht aus `entry.state` allein abgeleitet: `affordable` sagt nur, dass die
 * Chimes da sind — fehlt Material, ist die Zeile trotzdem nicht kaufbar. Die
 * einzige verlässliche Auskunft dazu ist `canBuy`.
 */
const short = computed(() => props.entry.state !== 'capped' && !props.entry.canBuy)

/**
 * Was in der NEU-Marke steht.
 *
 * `bulkCount` ist der eingefrorene Stand aus der Liste und fällt dort auf 0,
 * sobald ein Eintrag nicht mehr kaufbar ist — die Marke verschwände dann trotz
 * `fresh`, weil `ShopReadyBadge` bei `count === 0` gar nicht erscheint. Frisch
 * heisst immer auch kaufbar, also ist die Untergrenze eine Eins.
 */
const freshCount = computed(() => (props.bulkCount > 1 ? props.bulkCount : 1))


/** Stufe 0 hat kein Vorher — ein „+0%" behauptete eine Wirkung, die es nicht gibt. */
const nowText = computed(() => (props.entry.level === 0 ? '—' : props.entry.nowText))

/** Die grosse Zahl und ihre Obergrenze. Zerlegt in `useForgeUpgrades`, weil die
 *  Archivzeile dieselbe Angabe zeigt. */
const levelParts = computed(() => forgeLevelParts(props.entry.level, props.entry.maxLevel))

/**
 * Der Preis, EINMAL formatiert.
 *
 * Hier statt per `$formatNumber` im Template, weil die Schriftstufe darunter
 * seine Länge braucht — zweimal formatieren wäre dieselbe Arbeit ein zweites
 * Mal, je Zeile und bei jedem Tick, der den Preis bewegt.
 */
const priceText = computed(() => formatNumber(props.entry.goldCost))

/**
 * Wie gross er gesetzt wird. Die Kauffläche ist fest breit, die Zahl nicht —
 * Herleitung an `FORGE_ROW_PRICE_FIT_STEPS`.
 */
const priceFitClass = computed(() => forgeRowPriceFit(priceText.value.length))

/** Der Meep-Preis — 0 bei allem, was nicht auf der Straße steht. */
const meepText = computed(() => formatNumber(props.entry.meepCost))
const meepFitClass = computed(() => forgeRowPriceFit(meepText.value.length))

/**
 * Der Name des Knopfes für alle, die ihn nicht sehen.
 *
 * Auf der Fläche steht nur noch eine Zahl (oder ein Schloss); das Verb dazu
 * lebt hier. Ein gedeckelter Knopf nennt seinen ZUSTAND statt der Handlung —
 * „FORGE Ember Bough" an einem Knopf, der nichts forgen kann, wäre eine
 * Falschauskunft. Das WARUM steht im `title` darunter.
 */
const buyAriaLabel = computed(() =>
  props.entry.state === 'capped'
    ? `${FORGE_TILE_CAPPED_LABEL} ${props.entry.name}`
    : `${FORGE_GROW_LABEL} ${props.entry.name}`,
)

const bulkLabel = computed(() =>
  FORGE_ROW_BULK_LABEL.replace(FORGE_COUNT_TOKEN, String(props.bulkCount)),
)

/**
 * Der Satz beim Verweilen — die Auskunft, die der Knopf selbst nicht mehr
 * trägt.
 *
 * Kaufbar nennt er die ZIELSTUFE (sie stand einmal auf dem Knopf), sonst
 * WORAN es liegt. Das ist mehr als vorher: ein blankes „Not affordable yet"
 * liess offen, ob die Kasse oder das Lager leer ist.
 */
const buyTitle = computed(() => {
  const e = props.entry
  if (e.state === 'capped') return e.lockReason
  if (e.canBuy) return `${e.name} → ${FORGE_LEVEL_PREFIX}${e.level + 1}`
  if (!e.goldOk) return FORGE_SHORT_CHIMES_LABEL
  const missing = e.materials.find((mat) => !mat.ok)
  return missing ? `${FORGE_SHORT_MATERIAL_PREFIX}${missing.name}` : e.lockReason
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   ZEILE
   Fläche und Rand im Rezept der geteilten `.fc-card` (rpg-theme.css) — die
   Liste soll nicht wie ein zweites Bauteil neben Relikten und Konstellationen
   aussehen.
══════════════════════════════════════════════════ */
.fut-row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 11px;
  /* Gemessen an der HÖCHSTEN Fassung: Kopfzeile, Materialband und Pille im Fuß.
     Sie steht hier, damit die anderen — eine gesperrte Zeile ohne beides, eine
     ohne Pille — nicht aus der Reihe fallen.

     Das „NEW"-Fähnchen war einmal Teil dieser Messung und ist in die Ecke oben
     rechts gewandert. Die Zahl bleibt: es stand NEBEN dem Materialband, nicht
     darüber, und trug die Höhe deshalb nie.

     114 statt 103: Preis und Materialband sind gewachsen, und beide sassen
     vorher schon auf den letzten acht Pixeln Reserve. Die elf zusätzlichen sind
     LUFT, kein Inhalt — Glyph, Stufe, Name und Wirkungssprung stehen unverändert
     da. */
  min-height: 114px;
  padding: 13px 14px 13px 17px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
  /* Die ganze Zeile ist die Wählfläche — gekauft wird weiterhin nur über ihre
     Knöpfe, und die tragen `@click.stop`. */
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    opacity 0.12s ease;
}

/* ── Die Knotenkante ─────────────────────────────────────────
   Dieselbe Farbe wie das Glyph daneben, nur leiser: sie war einmal sein Ersatz
   und ist jetzt seine Wiederholung. Bleiben darf sie, weil sie auch dort trägt,
   wo das Glyph gedimmt ist — an den gesperrten Zeilen. Zurückgenommen in der
   Deckkraft, damit fünfundvierzig Streifen untereinander keine Leiter bilden;
   der Spotlight hebt genau diesen Streifen auf voll, statt einen zweiten
   danebenzusetzen. */
.fut-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--node-c, #7a4e20);
  opacity: 0.5;
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.12s ease;
}

.fut-row:hover {
  border-color: #7a4e20;
}

/* ── KAUFBAR ─────────────────────────────────────────────────
   Eine Runde lang war das hier EINE Zeile — `border-color: #4a8a28`. Beide Töne
   sind dunkel, auf 1px gegen `#32210c` kaum zu trennen, und der rote
   „reicht nicht"-Knopf der Nachbarzeile zog den Blick sogar zuerst an: die
   Warnfarbe schlug die Zusagefarbe, und eine Liste mit fünf kaufbaren unter
   zwanzig nicht kaufbaren Zeilen las sich als zwanzig rote Blöcke.

   Jetzt tragen es DREI Ebenen, und alle drei sind ZUSTAND — kein Dauerläufer,
   nichts davon wird pro Frame gerastert (Performance-Regel 2). Bei zwanzig
   gleichzeitig kaufbaren Zeilen ist das der ganze Preis:
     • der Grund wird grün getönt und HELLER als der neutrale (`#1c1c18`) —
       kaufbar soll „angeschaltet" wirken, nicht dunkler;
     • als zweite Schicht desselben `background` eine Waschung, die zum
       Kaufknopf hin aufleuchtet. Bewusst im `background` und nicht als
       `::after`: `.fut-row` ist `position: relative` OHNE `z-index` und damit
       kein Stapelkontext — eine Ebene mit `z-index: -1` fiele hinter den Grund
       der Zeile, eine ohne läge über der Schrift;
     • ein statisches Innenlicht, das die Kante von innen stützt.
   Der Rahmen geht auf `#6ec040`, dieselbe Kante wie Kaufknopf und Hover. */
/* Die oberste Ebene ist neu: derselbe Schimmer in der eigenen Farbe des
   Upgrades, den drüben der Kreis im Baum trägt. Verankert LINKS, wo die
   Knotenkante (`::before`) und das Glyph stehen — die Farbe wächst damit in die
   Zeile hinein, statt als Strich an ihrem Rand zu kleben.

   Schwächer als am Kreis (20 statt 30) und bei 44 % ausgelaufen: die Zeile ist
   breit, und alles rechts davon sind ZAHLEN — Kosten, Wirkungssprung, Preis am
   Knopf. Auf die wartet, wer spart, und sie stehen auf dem grünen Grund
   unverändert klar. */
.fut-row--ready {
  border-color: #6ec040;
  background:
    radial-gradient(
      120% 150% at 4% 50%,
      color-mix(in srgb, var(--node-c, #6ec040) 20%, transparent) 0%,
      transparent 44%
    ),
    linear-gradient(to left, rgba(82, 184, 48, 0.16), transparent 58%),
    #1e2a14;
  box-shadow:
    inset 0 0 0 1px rgba(110, 192, 64, 0.22),
    inset 0 0 26px -6px rgba(82, 184, 48, 0.22);
}

.fut-row--ready:hover {
  border-color: #9fe062;
}

/* Die Knotenkante wird mitgehoben. Sie ergibt über die Liste hinweg eine Leiter,
   und die ist der eigentliche Wert: `--short 0.28 · Basis 0.5 · --ready 0.8 ·
   fc-spot 1`. */
.fut-row--ready::before {
  opacity: 0.8;
}

/* Die Zahl, wegen der man überhaupt auf den Knopf sieht — auf einer kaufbaren
   Zeile darf sie das hellere Grün tragen. */
.fut-row--ready .fut-delta-next {
  color: #9fe062;
}

/* ── OFFEN, ABER ES REICHT NICHT ─────────────────────────────
   Die Gegenseite, und der Grund, warum die Unterscheidung überhaupt trägt:
   hervorheben allein genügt nicht, solange die Mehrheit gleich laut bleibt.

   Gedimmt wird, was KEINE Zahl ist — Grund, Knotenkante und das 56px-Glyph, das
   grösste Element der Zeile. Die Kosten, der Wirkungssprung und der Name bleiben
   voll deckend: wer spart, liest hier genau die Zahlen, auf die er wartet. Nur
   die Stufe tritt leicht zurück, sie ist die einzige Zahl ohne Bezug zum
   Warten. */
.fut-row--short {
  background: #191713;
}

.fut-row--short::before {
  opacity: 0.28;
}

.fut-row--short .fut-ico {
  opacity: 0.5;
}

.fut-row--short .fut-lvl {
  color: rgba(232, 220, 192, 0.72);
}

/* ── Der Zeiger meint diese Zeile ────────────────────────────
   Gleich, ob er auf ihr steht oder drüben auf ihrem Knoten im Baum. Die
   globalen Regeln dazu sind als `.fc-card.fc-spot` / `.fc-row.fc-spot`
   geschrieben und verlangen die Trägerklasse mit — diese Zeile heisst
   `.fut-row` und träfe keine von beiden. Sie stehen deshalb hier
   ausformuliert; die geteilten Regeln bleiben unangetastet.

   Doppelt geschrieben, mit Absicht: `.fut-row--ready:hover` wiegt eine Stufe
   mehr und färbte den Rahmen sonst grün, sobald der Zeiger wirklich auf der
   Zeile steht — auf den Knoten zeigen und auf seine Zeile zeigen sind EINE
   Geste und dürfen nicht zwei Farben ergeben.

   `background` und `box-shadow` müssen mit zurückgesetzt werden: eine kaufbare
   Zeile brächte sonst ihren grünen Grund samt Waschung und Innenlicht mit unter
   den Zeiger, und die Leitfarbe des Knotens hätte nichts, worauf sie sich legt. */
.fut-row.fc-spot.fc-spot {
  background: #241a10;
  border-color: var(--node-c, #e8c040);
  box-shadow: none;
}

.fut-row.fc-spot::before {
  width: 4px;
  opacity: 1;
}

/* ── Der Fokus liegt auf einer ANDEREN Zeile ─────────────────
   Die Dämpfung, die es hier lange NICHT gab: ein Fokus liess die Liste
   unverändert laut, und der festgehaltene Eintrag war unter fünfundvierzig
   Zeilen an einer 1px-Rahmenfarbe zu suchen.

   Was die alte, zurückgenommene Fassung falsch machte, war nicht das Dämpfen,
   sondern die AUSNAHMSLOSIGKEIT — jede andere Zeile ging auf 0,42, und eine
   Spalte, in der nichts mehr hervorsteht, liest sich als abgeschaltet. Deshalb
   zwei Auflagen: der Schleier liegt nur, wenn dabei etwas hell bleibt (der
   Anschlag steht in `ForgeUpgradesSection`), und was der Fokus noch braucht,
   steht voll deckend darin (`--needed`).

   Klasse je Zeile, NICHT als geerbte Variable am Listenrahmen
   (Performance-Regel 3) — dieselbe Auflage wie bei der Zeigerdämpfung darunter.
   Nur `opacity`, kein `filter`: fünfundvierzig gleichzeitig entsättigte Zeilen
   wären fünfundvierzig Ebenen (Performance-Regel 2). */
.fut-row.fut-row--veiled {
  opacity: v-bind(dimOpacity);
}

/* Klasse je Zeile, NICHT als geerbte Variable am Listenrahmen
   (Performance-Regel 3). Steht NACH dem Schleier: fallen beide zusammen,
   gewinnt die härtere — der Zeiger meint dann wirklich etwas anderes. */
.fut-row.fc-dimmed {
  opacity: 0.42;
}

/* ── Was der Fokus noch BRAUCHT ──────────────────────────────
   Die Zeile bleibt voll deckend und hebt ihre Knotenkante mit — dieselbe
   Leiter, die `--ready` (0,8) und `fc-spot` (1) schon benutzen, hier ohne
   deren Verbreiterung auf 4px: gebraucht ist nicht gemeint. Kein eigener
   Rahmen: Rot heisst in dieser Spalte „das reicht nicht" (`--short`), und die
   Aussage stünde sonst zweimal in zwei Bedeutungen an derselben Zeile. */
.fut-row.fut-row--needed::before {
  opacity: 1;
}

/* Die Marke. Sitzt, wo sonst die Pin-Marke sitzt — sie treffen sich nie.
   Innerhalb der Zeile, weil die `overflow: hidden` trägt; `pointer-events`
   bleiben aus, damit sie den Klick auf die Zeile nicht schluckt. */
.fut-needed {
  position: absolute;
  top: 5px;
  left: 6px;
  z-index: 3;
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, v-bind(neededColor) 45%, transparent);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.45);
  color: v-bind(neededColor);
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.09em;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
}

/* ── Die FESTGEHALTENE Auswahl ───────────────────────────────
   Der Zeiger geht weiter, der Fokus bleibt — und man muss den Unterschied
   sehen können, ohne die Maus zu bewegen. `fc-spot` gilt für beide und liefert
   Rahmen und volle Kante; hier kommt DRAUF, was nur der Fokus hat: ein
   statischer Innenring in der Knotenfarbe und die Pin-Marke oben rechts.

   Statischer ZUSTAND, kein Dauerläufer — der Ring ist ein `box-shadow`, der
   genau einmal umschlägt (Performance-Regel 2). Bei fünfundvierzig sichtbaren
   Zeilen trägt ihn immer nur EINE.

   Doppelt geschrieben wie `.fc-spot` darüber, und aus demselben Grund:
   `.fut-row--ready:hover` wiegt eine Stufe mehr und färbte den Rahmen sonst
   grün, sobald der Zeiger auf der fokussierten Zeile steht. */
.fut-row.fut-row--focus.fut-row--focus {
  border-color: var(--node-c, #e8c040);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--node-c, #e8c040) 45%, transparent);
}

/* Die Marke sitzt oben LINKS, über der Knotenkante — nicht rechts: dort steht
   über die volle Zeilenhöhe die Kauffläche, und eine Marke darüber läge auf dem
   Knopf. Links ist die Ecke frei, weil das Glyph darunter mittig sitzt; das
   Schloss am Glyph klebt an dessen unterer Ecke und trifft sie nie. */
.fut-pin {
  position: absolute;
  top: 6px;
  left: 7px;
  width: 15px;
  height: 15px;
  line-height: 0;
  color: var(--node-c, #e8c040);
  pointer-events: none;
  z-index: 3;
}

/* ── DIE NEU-MARKE ───────────────────────────────────────────
   Sitz und Mass für `ShopReadyBadge`; die Marke selbst bringt Farbe, Rundung
   und Schein mit (Custom Properties vererben über die Scope-Grenze).

   5px und nicht negativ: die Zeile trägt `overflow: hidden`, ein überstehendes
   Eck wäre abgeschnitten — dieselbe Auflage, unter der die Marke an der
   Header-Ecktaste innerhalb ihrer Platte sitzt. Der fünfte Pixel ist gemessen:
   bei vier lag die Marke auf der Ecke des Stapelknopfs, bei fünf streift sie
   nur noch dessen Rundung.

   `pointer-events: none` überschreibt das `auto` der Komponente, das dort für
   die Tooltips am Header steht. Hier liegt die Marke über der oberen rechten
   Ecke des KAUFKNOPFS, und ein Klick, der 18px daneben ins Leere ginge, wäre
   der teuerste Fehlklick der Spalte. */
.fut-fresh-badge.fut-fresh-badge {
  --sbadge-d: v-bind(freshBadgeSize);
  --sbadge-top: 5px;
  --sbadge-right: 5px;
  z-index: 4;
  pointer-events: none;
}

/* ══════════════════════════════════════════════════
   ICON · STUFE · NAME · MATERIAL
══════════════════════════════════════════════════ */
/* `align-self: center` ist Pflicht: die Zeile trägt `align-items: stretch`, und
   ohne sie zöge das SVG auf die volle Zeilenhöhe. */
/* Der Träger des Schloss-Abzeichens — sonst hinge es an der ZEILE und läge in
   deren Ecke. Er hat die Maße des Glyphs, keinen Rahmen und keinen Innenabstand:
   der gerahmte Sockel, den es hier einmal gab, kostete Breite, die die Zeile für
   Stufe, Wirkung und Knopf braucht. `line-height: 0` hält ihn exakt auf
   Icon-Höhe, damit die Zeilenmitte nicht wandert. */
.fut-glyph {
  position: relative;
  flex-shrink: 0;
  align-self: center;
  line-height: 0;
}

.fut-ico {
  flex-shrink: 0;
  align-self: center;
}

/* Zwei Zeilen: oben Stufe/Name/Wirkung, darunter das Lager. */
.fut-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.fut-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.fut-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* `padding: 0` ausdrücklich: `.fc-cost--bare` nimmt dem Block seinen
   Innenabstand, aber der Kompakt-Block von `rpg-theme.css` setzt `.fc-cost`
   danach noch einmal — bei gleicher Spezifität gewinnt die spätere Regel. */
.fut-mats {
  min-width: 0;
  padding: 0;
}

/* Das Lager wächst mit dem Preis mit — sonst bliebe „habe / brauche" als
   einzige Angabe der Zeile auf der alten Grösse zurück, während die Zahl im
   Knopf daneben um die Hälfte zulegt. Beides sind Kosten, beide liest der
   Spieler vor demselben Klick.

   Nur HIER, per `:deep()`: die globalen `.fc-cost-*` in `rpg-theme.css` tragen
   dieselben Paare auch bei Relikten, Konstellationen und im Handel, und die
   sollen sich nicht mitverändern. */
.fut-mats :deep(.fc-cost-img),
.fut-mats :deep(.fc-cost-ph) {
  height: 26px;
}

.fut-mats :deep(.fc-cost-ph) {
  width: 26px;
}

.fut-mats :deep(.fc-cost-qty) {
  font-size: 18px;
}

.fut-mats :deep(.fc-cost-need) {
  font-size: 15px;
}

/* Die grösste Zahl der Zeile. `tabular-nums`, damit die Ziffern über die Liste
   hinweg auf derselben Kante stehen. */
.fut-lvl {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  color: #e8dcc0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.fut-lvl-max {
  font-size: 13px;
  font-weight: 800;
  color: rgba(232, 220, 192, 0.4);
}

/* Die zweite Zeile: nur noch das Materialband. Rechts stand hier die
   BEST-BUY-Pille, die den Kasten auch dann füllte, wenn ein Eintrag ohne
   Materialien auskommt — deshalb hängt der Fuß jetzt selbst am `v-if` und nicht
   mehr das Band darin. */
.fut-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.fut-name {
  min-width: 0;
  font-size: 13.5px;
  font-weight: 900;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Derselbe Ton wie der Suchring am Knoten — was hier leuchtet, leuchtet dort. */
.fut-name-hit {
  color: #40c8e0;
}

/* ══════════════════════════════════════════════════
   WAS DIE NÄCHSTE STUFE BRINGT
   Das Danach trägt die Farbe, nicht das Jetzt — es ist die Zahl, wegen der man
   auf den Knopf sieht. Dasselbe Grün wie `.fc-delta-value--next`.

   `flex: 0 1 auto`: die Spalte nimmt ihre natürliche Breite und gibt sie erst
   her, wenn der Platz sonst nicht reicht — vor ihr kürzt der Name.

   KEIN Flex nach innen: eine Krone trägt hier Wörter statt Zahlen („Open →
   Forged"), und ein Flex-Container kann kein `text-overflow` — er schnitte
   mitten im Wort ab. Als blockifiziertes Flex-KIND mit `nowrap` bekommt die
   Spalte ihre Auslassungspunkte.
══════════════════════════════════════════════════ */
.fut-delta {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fut-delta-now {
  color: rgba(232, 220, 192, 0.5);
  font-variant-numeric: tabular-nums;
}

.fut-delta-arrow {
  margin: 0 5px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
}

.fut-delta-next {
  color: #7ad0a0;
  font-variant-numeric: tabular-nums;
}

/* Der Grund, warum ein Kernstrahl gerade nicht weiterwächst. Bernstein, weil
   Rot hier schon „fehlt dir" heisst und Grün „kaufbar".

   `shrink: 6` und nicht `1` wie beim Wirkungssprung nebenan: dieser Satz ist
   drei- bis viermal so breit wie ein Zahlenpaar und drückte den Namen daneben
   gemessen um 8-10px aus seiner Spalte — „Chimes / Se…" statt „Chimes / Sec",
   und das schon vor dem Knopf-Umbau. Der NAME ist die Identität der Zeile, der
   Grund steht ausserdem im `title` des Knopfes; er gibt deshalb zuerst nach.
   Beim Wirkungssprung bleibt es ausdrücklich umgekehrt (Kommentar dort).

   Die Sechs ist der ANSCHLAG, nicht eine Zahl unter vielen: der Satz UMBRICHT
   (kein `nowrap`) und steht damit bei rund 139px auf seiner Mindestbreite —
   gemessen gibt er von dort keinen Pixel mehr her, gleich wie hoch der Faktor
   steht. Die letzten zwei Pixel, die den beiden Kernstrahl-Namen fehlen, sind
   damit nicht mehr hier zu holen. */
.fut-capped {
  flex: 0 6 auto;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.25;
  color: rgba(255, 200, 80, 0.72);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ══════════════════════════════════════════════════
   DIE KAUFFLÄCHE
   Feste Gesamtbreite, volle Zeilenhöhe. Der Stapelknopf nimmt seine Breite dem
   Preisknopf ab, nicht der Zeile — Herleitung an `FORGE_ROW_BULK_WIDTH_PX`.
══════════════════════════════════════════════════ */
.fut-buy-group {
  flex: 0 0 v-bind(buyWidth);
  align-self: stretch;
  display: flex;
  gap: 4px;
  min-width: 0;
}

/* EINE flache Fläche mit EINER Angabe. `row` und nicht mehr `column`: seit das
   Verb gefallen ist, gibt es keine zweite Zeile mehr, die darunter passen
   müsste — Bild und Zahl stehen nebeneinander wie in jeder anderen
   Kostenangabe des Spiels (`.fc-cost-pair`).
   Die Farbe trägt die Aussage — siehe Kopfkommentar. */
.fut-buy {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 6px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-family: inherit;
  cursor: pointer;
  transition:
    filter 0.12s ease,
    border-color 0.12s ease;
}

/* KEIN `opacity` mehr: die Zahl war der Zusatz unter dem Wort, jetzt ist sie
   der Inhalt. Die Grösse steht nicht hier, sondern in den vier Stufen darunter
   — die Fläche ist fest breit, die Zahl nicht. */
.fut-buy-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.fut-buy-price {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Die Stufen zu `FORGE_ROW_PRICE_FIT_STEPS`. Als Klasse und nicht als
   berechneter Inline-Wert: es sind vier feste Zustände, keine laufende Grösse
   — und der Kompaktblock unten braucht sie ohnehin ein zweites Mal.

   Gemessen wurde gegen den ENGSTEN Fall: eine Zeile MIT Stapelknopf, der dem
   Preis 46 Pixel abnimmt. Dort bleiben 104px Innenbreite (Full HD: 86), und
   jede Stufe passt mit mindestens drei Pixeln Luft hinein. */
.fut-buy-price--xl {
  font-size: 23px;
}

.fut-buy-price--l {
  font-size: 21px;
}

.fut-buy-price--m {
  font-size: 19px;
}

.fut-buy-price--s {
  font-size: 16.5px;
}

.fut-buy-chime {
  height: 28px;
  width: auto;
  object-fit: contain;
}

/* Die kleinste Stufe nimmt auch das Bild mit herunter — sie trägt sieben bis
   acht Zeichen („123.45Qa"), und dort ist das Chime-Bild die letzte Position,
   die noch Platz hergeben kann, ohne dass die ZAHL leidet. Nur diese eine
   Stufe weicht ab: über den anderen dreien bliebe die Währung sonst in jeder
   Zeile unterschiedlich gross. */
.fut-buy-price--s .fut-buy-chime {
  height: 22px;
}

/* Das Schloss des gedeckelten Knopfes steht dort, wo sonst der Preis steht —
   allein und mittig. Es erbt die Bernsteinfarbe der Fläche über
   `currentColor`. */
.fut-buy-lock {
  flex-shrink: 0;
}

/* ── Reicht nicht ────────────────────────────────────────────
   Rot, und zwar der ganze Knopf. Es ist die zweite Kodierung zu der roten Zahl
   im Materialband, seit dort das ✕ fehlt — und die einzige Stelle, an der das
   Fehlen überhaupt eine Form hat. Kein `filter: grayscale`: ein ausgegrauter
   Verlauf trägt seine fast schwarze Schrift nicht mehr (Rezept `.fc-act`).

   FLACH und dunkel, nicht mehr als leuchtender Verlauf
   (`linear-gradient(#a83c2c, #6e1e12)`). Der Grund ist die Rangfolge im Bild:
   Rot ist die Warnfarbe, die der Blick zuerst sucht, und zwanzig leuchtend rote
   Knöpfe schlugen fünf grüne — genau umgekehrt zu dem, was die Liste sagen soll.
   „Noch nicht" ist ohnehin kein Fehler.

   Rot BLEIBT es, in Rahmen, Grund und Schrift: `.fc-cost--flat` in
   `rpg-theme.css` verzichtet auf das ✕ ausdrücklich nur deshalb, weil dieser
   Knopf komplett umschlägt. Wer ihn entfärbt, muss die Zeichen zurückholen. */
.fut-buy--short {
  border-color: #a04838;
  background: #2a1512;
  color: #e89a8c;
  cursor: not-allowed;
}

/* Gedeckelt: kein Preis, kein Rot. Es fehlt nichts — es ist nur noch nicht so
   weit. Bernstein wie jeder andere Wartezustand der Spalte. */
.fut-buy--capped {
  border-color: #7a4e20;
  background: #3a2a10;
  color: #e8c040;
  cursor: not-allowed;
}

.fut-buy:hover:not(:disabled) {
  filter: brightness(1.12);
}

/* ── Stapelkauf ──────────────────────────────────────────────
   Dunkleres Grün als der Hauptknopf: dieselbe Handlung, nur mehrfach — kein
   zweiter Akzent daneben. */
.fut-bulk {
  flex: 0 0 v-bind(bulkWidth);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #4a8a28;
  border-radius: 4px;
  background: #16210c;
  color: #9fe062;
  font-family: inherit;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease;
}

.fut-bulk:hover {
  border-color: #6ec040;
  background: #1c2e10;
}

/* ══════════════════════════════════════════════════
   DIE ANKUNFTSEBENE UND DIE KAUFQUITTUNG
   Je eine eigene Ebene mit STATISCHEM Schein, animiert wird allein die
   Deckkraft (Performance-Regel 2/11) — dasselbe Rezept wie `.fc-glow` und
   `.msc-glow`. `inset: 0` statt `-1px`, weil die Zeile `overflow: hidden`
   trägt; der Schein liegt deshalb nach INNEN.

   In der LISTE ATMET NICHTS MEHR. Die Ebene trug einmal auch die BEST-BUY-Marke
   in Grün — eine dauerhafte Animation, die es je Liste genau einmal geben
   durfte, damit sie Vorrang zeigen konnte. Die Marke ist gefallen, und mit ihr
   der Dauerläufer: übrig ist ein EREIGNIS, das genau einmal abläuft und dann
   verschwindet. Das ist auch der Grund, warum die kaufbare Zeile ihren Auftritt
   rein statisch bestreitet — daran ändert sich nichts.
══════════════════════════════════════════════════ */
.fut-halo {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  pointer-events: none;
}

/* Die Zeile ist eben hereingerollt, weil der Zeiger drüben auf ihrem Knoten
   steht.

   In der KNOTENFARBE: sie sagt nicht, WAS diese Zeile ist — das trägt die Zeile
   selbst —, sondern WOHER der Blick kommt, und das ist der Knoten links.
   Einmalig und mit `forwards`: ein Atmen hiesse „Zustand", und eingetroffen ist
   man genau einmal. */
.fut-halo--arrived {
  border: 1px solid var(--node-c, #c89040);
  box-shadow: inset 0 0 16px color-mix(in srgb, var(--node-c, #c89040) 42%, transparent);
  animation: fut-halo-arrive v-bind(arriveMs) ease-out 1 forwards;
}

@keyframes fut-halo-arrive {
  0% {
    opacity: 0;
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.fut-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 245, 220, 0.3);
  opacity: 0;
  pointer-events: none;
  z-index: 2;
}

.fut-flash--on {
  animation: fut-flash v-bind(flashDuration) ease-out;
}

@keyframes fut-flash {
  0% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fut-flash--on {
    animation: none;
  }

  /* Die Ankunftskurve endet bei `opacity: 0` und trägt `forwards`. Bliebe sie
     nur abgeschaltet, wäre der Rahmen unsichtbar statt ruhig — die Deckkraft
     muss ausdrücklich zurückgesetzt werden. Derselbe Fallstrick wie bei
     `.node-spot` im Baum. */
  .fut-halo--arrived {
    animation: none;
    opacity: 1;
  }
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste UND schmalste Viewport
   Die Spalte misst dort 499px statt 560; Stufe, Wirkung und Knopf teilen sich
   61 Pixel weniger.
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  /* Waagerecht so knapp wie vor dem Umbau, senkrecht mit der neuen Luft: die
     zusätzliche HÖHE ist der Zweck, die Breite wird hier gebraucht. Bei
     `12px/15px` und `gap: 9` fehlten dem längsten Namen der Liste gemessen drei
     Pixel — die holt dieser Block zurück, ohne dem Preis welche zu nehmen. */
  .fut-row {
    gap: 8px;
    min-height: 103px;
    padding: 11px 11px 11px 14px;
  }

  .fut-main {
    gap: 7px;
  }

  .fut-head {
    gap: 6px;
  }

  /* Die Grösse steht als Attribut am `<Icon>`; CSS schlägt es. */
  .fut-ico {
    width: 48px;
    height: 48px;
  }

  .fut-lvl {
    font-size: 23px;
  }

  .fut-lvl-max {
    font-size: 12px;
  }

  .fut-delta {
    font-size: 13.5px;
  }

  .fut-capped {
    font-size: 12.5px;
  }

  .fut-mats :deep(.fc-cost-row) {
    gap: 12px;
  }

  .fut-mats :deep(.fc-cost-img),
  .fut-mats :deep(.fc-cost-ph) {
    height: 24px;
  }

  .fut-mats :deep(.fc-cost-ph) {
    width: 24px;
  }

  .fut-mats :deep(.fc-cost-qty) {
    font-size: 16px;
  }

  .fut-mats :deep(.fc-cost-need) {
    font-size: 13.5px;
  }

  .fut-buy-group {
    flex-basis: v-bind(buyWidthCompact);
  }

  /* Alle vier Stufen brauchen ihr Gegenstück — eine ausgelassene fiele auf den
     Wert des breiten Viewports zurück und liefe in der schmaleren Fläche
     über. */
  .fut-buy-price--xl {
    font-size: 21px;
  }

  .fut-buy-price--l {
    font-size: 19px;
  }

  .fut-buy-price--m {
    font-size: 16.5px;
  }

  .fut-buy-price--s {
    font-size: 14px;
  }

  /* 22 statt 25: auf Full HD bleiben einer Zeile MIT Stapelknopf nur 86px
     Innenbreite, und bei 25 lag die sechsstellige Stufe („888.88") gemessen mit
     0,6px Luft an der Kante. Das Bild gibt sie her, die Zahl nicht — sie ist
     der Grund, warum der Knopf da ist. */
  .fut-buy-chime {
    height: 22px;
  }

  .fut-buy-price--s .fut-buy-chime {
    height: 18px;
  }
}
</style>
