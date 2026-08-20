<template>
  <div
    class="fut-row"
    :class="[
      `fut-row--${entry.state}`,
      {
        'fut-row--ready': entry.canBuy,
        'fut-row--short': short,
        'fut-row--best': showBest,
        'fut-row--fresh': fresh,
        'fc-spot': isSpot,
        'fut-row--focus': isFocused,
        'fc-dimmed': isDimmed,
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

    <div class="fut-flash" :class="{ 'fut-flash--on': flashed }" aria-hidden="true" />

    <!-- Die EINE atmende Ebene der Zeile. Statischer Schein, animiert wird allein
         ihre Deckkraft (Performance-Regel 2/11) — und auf `inset: 0`, weil die
         Zeile `overflow: hidden` trägt und ein negativer Einzug abgeschnitten
         würde. Genau derselbe Sitz wie beim Quittungsblitz darüber.

         Zwei Anlässe, EINE Ebene: „seit dem letzten Blick bezahlbar" (azur) und
         „das Günstigste, was gerade geht" (grün). Sie wird UMGEFÄRBT statt eine
         zweite darüberzulegen — dasselbe Rezept, das `ForgeTreePanel` für
         `.node-circle--fresh .node-glow` schon begründet: zwei Keyframes auf
         einer Ebene überlagern sich nicht, und zwei Ebenen kosten das Doppelte
         für dieselbe Aussage. Azur gewinnt, weil „neu" die seltenere und
         flüchtigere Auskunft ist. -->
    <div
      v-if="fresh || showBest || arrived"
      class="fut-halo"
      :class="arrived ? 'fut-halo--arrived' : fresh ? 'fut-halo--fresh' : 'fut-halo--best'"
      aria-hidden="true"
    />

    <!-- Nackt, ohne Sockel: der gerahmte Kasten davor kostete Breite, die die
         Zeile für Stufe, Wirkung und Knopf braucht. Die Knotenfarbe trägt das
         Glyph selbst. Es steht VOR der Weiche und damit in jedem Zustand — eine
         gesperrte Zeile ist sonst die einzige ohne Bild, und ausgerechnet sie
         hat am wenigsten sonst, woran man sie erkennt. -->
    <span class="fut-glyph">
      <Icon
        :icon="entry.icon"
        :width="FORGE_ROW_ICON_SIZE"
        :height="FORGE_ROW_ICON_SIZE"
        class="fut-ico"
        :style="{ color: entry.color }"
      />
      <!-- Dieselbe Marke wie am Knoten im Baum (`.fc-lock-badge`, rpg-theme.css):
           die Sperre sitzt in beiden Spalten an derselben Ecke desselben Motivs.
           Der Träger ist nur dafür da — er hat die Maße des Glyphs, keinen
           Rahmen und keinen Innenabstand, kostet die Zeile also keine Breite. -->
      <span v-if="entry.state === 'locked'" class="fc-lock-badge" aria-hidden="true">
        <Icon :icon="FORGE_LOCK_ICON" width="100%" height="100%" />
      </span>
    </span>

    <!-- ══ GESPERRT ══════════════════════════════════════════════
         Der Weg zur Freischaltung statt eines Preises, den man ohnehin nicht
         zahlen könnte. Hier führt der NAME, nicht die Stufe: ein „Lv 0" gross
         gesetzt wäre die einzige Zahl der Zeile — und sie sagte nichts. Der
         Balken liegt an der Unterkante, damit die Zeile so hoch bleibt wie
         ihre Nachbarn. -->
    <template v-if="entry.state === 'locked'">
      <div class="fut-main">
        <span class="fut-name fut-name--lead" :style="{ color: entry.color }">
          {{ entry.name }}
        </span>
        <!-- Vor dem Sperrsatz steht das WARUM, nicht noch einmal das „zu": das
             Schloss trägt jetzt das Motiv links. Sonne bei einer Phasensperre,
             Astwerk bei einer Elternsperre — dieselben zwei Glyphen, mit denen
             der Trenner die Zeile eingeordnet hat, und dieselbe Weiche
             (`entry.lockKind`). -->
        <span v-if="!showReqList" class="fut-lock">
          <Icon :icon="lockWhyIcon" width="15" height="15" class="fut-lock-why" />
          {{ entry.lockReason }}
        </span>

        <!-- Ab ZWEI Bedingungen tritt der Satz zurück und die Liste übernimmt.
             Ein Satz kann nur die erste offene nennen — bei einer Krone, die
             drei Knoten verlangt, sähe der Spieler nach jedem erfüllten
             Vorgänger einen neuen Satz und wüsste nie, wie viele noch kommen.
             Die Zahlenpaare sind dieselbe Form wie im Archiv nebenan
             (`ForgeVaultSection`), damit „Moon Orbit 2/3" überall gleich
             aussieht. -->
        <template v-else>
          <div class="fut-reqs-head">{{ FORGE_REQ_HEADING }}</div>
          <ul class="fut-reqs">
            <li v-for="req in entry.reqs" :key="req.id" :class="{ 'fut-req--met': req.met }">
              <span class="fut-req-mark">{{
                req.met ? FORGE_REQ_MET_MARK : FORGE_REQ_OPEN_MARK
              }}</span>
              <span class="fut-req-name">{{ req.name }}</span>
              <span class="fut-req-num">{{ req.have }}/{{ req.need }}</span>
            </li>
          </ul>
        </template>
      </div>

      <div v-if="entry.unlockProgress > 0" class="fc-track fut-track">
        <i :style="{ transform: `scaleX(${entry.unlockProgress})` }" />
      </div>
    </template>

    <!-- ══ KAUFBAR, IM SPAREN, GEDECKELT ═════════════════════════ -->
    <template v-else>
      <div class="fut-main">
        <div class="fut-head">
          <span class="fut-text">
            <span class="fut-lvl">
              {{ levelParts.big }}<span class="fut-lvl-max">{{ levelParts.max }}</span>
            </span>
            <span class="fut-name" :style="{ color: entry.color }">{{ entry.name }}</span>
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

        <!-- Zweite Zeile: links das Lager, rechts die Marke.
             Die Marke stand einmal oben neben dem NAMEN und ist von dort
             gewichen — gemessen ist die Kopfzeile nur 234px (Full HD) bzw. 263px
             breit, und mit der Pille daneben verlor der längste Name 13 bis 19
             Pixel an die Auslassungspunkte. Ausgerechnet die Zeile, auf die die
             Marke zeigt, war damit die einzige mit beschnittenem Namen. Hier
             unten ist die Breite frei: das Materialband ist kurz und darf
             schrumpfen, der Name oben bekommt seine ~146px zurück. -->
        <div class="fut-foot">
          <!-- Was das Lager kostet — rahmenlos (`flat`), also nur Bild und Zahl.
               Der Chime-Preis steht NICHT hier, sondern im Knopf (`:gold="0"`
               lässt ihn weg): er ist die eine Zahl, die jeder Eintrag hat, und
               gehört an die Stelle, an der geklickt wird. Die Materialien kann
               der Knopf nicht mittragen — zwei Positionen messen auch ohne
               Rahmen ~150px und machten ihn breiter als den Namen daneben. -->
          <ForgeCostRow
            v-if="entry.materials.length > 0"
            class="fut-mats"
            inline
            flat
            :label="false"
            :gold="0"
            :gold-ok="true"
            :materials="entry.materials"
          />

          <!-- Höchstens EINE, und „NEW" gewinnt — aus demselben Grund wie beim
               Schein darüber: „neu" ist die seltenere und flüchtigere Auskunft. -->
          <span v-if="fresh" class="fut-tag" :aria-label="FORGE_FRESH_TITLE">
            {{ FORGE_FRESH_LABEL }}
          </span>
          <!-- Zwei Wortlaute, einer davon je Viewport ausgeblendet — Muster
               `.ft-buy-all-label` in der Kopfleiste. -->
          <span
            v-else-if="showBest"
            class="fut-tag fut-tag--best"
            :aria-label="bestTitle"
            :title="bestTitle"
          >
            <span class="fut-tag-long">{{ FORGE_BEST_BUY_LABEL }}</span>
            <span class="fut-tag-short">{{ FORGE_BEST_BUY_SHORT_LABEL }}</span>
          </span>
        </div>
      </div>

      <!-- Die Kauffläche. Feste Gesamtbreite über die volle Zeilenhöhe: die
           Kanten fluchten damit über die ganze Liste, und der Stapelknopf nimmt
           seine Breite dem Verb ab, nicht der Zeile — sonst rückte die Kante
           jedes Mal, wenn die tickenden Chimes eine Schwelle überschreiten. -->
      <div class="fut-buy-group">
        <button
          class="fut-buy"
          :class="{
            'fut-buy--capped': entry.state === 'capped',
            'fut-buy--short': entry.state !== 'capped' && !entry.canBuy,
          }"
          :disabled="!entry.canBuy"
          :aria-label="`${FORGE_GROW_LABEL} ${entry.name}`"
          :title="buyTitle"
          @click.stop="$emit('buy', entry.id)"
        >
          <span class="fut-buy-verb">{{ buyLabel }}</span>
          <span v-if="entry.state !== 'capped'" class="fut-buy-price">
            <img :src="FORGE_CHIME_IMAGE" class="fut-buy-chime" alt="Chimes" />
            {{ $formatNumber(entry.goldCost) }}
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
    </template>
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
 * Der Knopf ist EINE flache Fläche ohne innere Trennlinie: Wort oben, Preis
 * darunter. Seine FARBE ist die Aussage — grün heisst kaufbar, rot heisst „das
 * reicht nicht", bernstein heisst gedeckelt. Daran hängt mehr als die Optik:
 * die Kostenzeile darunter trägt seit dem `flat`-Umbau kein ✓/✕ mehr, ihr
 * Mangel steht allein in der roten Zahl. Der rote Knopf ist die zweite
 * Kodierung dazu — wer ihn entfärbt, muss die Zeichen zurückholen.
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
 * BEWEGT ist davon nichts. Genau eine Zeile der Liste atmet — die mit der
 * BEST-BUY-Marke, also der günstigste kaufbare Eintrag. Bei zwanzig kaufbaren
 * Einträgen atmeten sonst zwanzig Ebenen gegeneinander, und die Marke hätte
 * keinen Vorrang mehr zu zeigen.
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
import { forgeGrowLabel, forgeLevelParts } from '@/composables/ui/useForgeUpgrades'
import ForgeCostRow from './ForgeCostRow.vue'
import type { ForgeUpgradeEntry } from '@/types'
import {
  FORGE_BEST_BUY_LABEL,
  FORGE_BEST_BUY_SHORT_LABEL,
  FORGE_CARD_FLASH_MS,
  FORGE_SPOTLIGHT_ARRIVAL_MS,
  FORGE_CHIME_IMAGE,
  FORGE_COUNT_TOKEN,
  FORGE_DIVIDER_PARENT_ICON,
  FORGE_REQ_HEADING,
  FORGE_REQ_MET_MARK,
  FORGE_REQ_OPEN_MARK,
  FORGE_DIVIDER_PHASE_ICON,
  FORGE_FRESH_LABEL,
  FORGE_FRESH_TITLE,
  FORGE_GROW_LABEL,
  FORGE_LEVEL_PREFIX,
  FORGE_LOCK_ICON,
  FORGE_PIN_ICON,
  FORGE_ROW_BULK_LABEL,
  FORGE_ROW_BULK_WIDTH_PX,
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

const props = withDefaults(
  defineProps<{
    entry: ForgeUpgradeEntry
    flashed: boolean
    /** Seit dem letzten Blick des Spielers bezahlbar geworden — trägt den azurnen
     *  Rahmen, bis der Zeiger die Zeile einmal berührt hat. */
    fresh: boolean
    /**
     * Das Günstigste, was Chimes UND Lager gerade decken — dieselbe Marke, die
     * der Baum links als Ring um seinen Knoten legt. Kommt von der Liste, weil
     * `bestBuyId` dort ohnehin gegen die tickenden Chimes eingefroren wird; die
     * Zeile selbst kann das nicht entscheiden, sie kennt nur sich.
     */
    best?: boolean
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
  }>(),
  { best: false, bulkCount: 0, arrived: false },
)
defineEmits<{ (e: 'buy', id: string): void; (e: 'buyMany', id: string): void }>()

const { hoverId, pinnedId, setListHover, focusNode } = useForgeSpotlight()

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
 * „Offen, aber es reicht nicht" — der Zustand, der ZURÜCKTRITT.
 *
 * Wörtlich dieselbe Weiche wie am Kaufknopf (`fut-buy--short`), und mit Absicht
 * nicht aus `entry.state` allein abgeleitet: `affordable` sagt nur, dass die
 * Chimes da sind — fehlt Material, ist die Zeile trotzdem nicht kaufbar. Die
 * einzige verlässliche Auskunft dazu ist `canBuy`.
 */
const short = computed(
  () => props.entry.state !== 'capped' && props.entry.state !== 'locked' && !props.entry.canBuy,
)

/**
 * Das Glyph vor dem Sperrsatz sagt das WARUM — das „zu" trägt das Schloss am
 * Motiv. Beide Fälle kommen aus `lockKind` und nicht aus dem Satz daneben, und
 * es sind dieselben zwei Glyphen, die der Trenner über der Zeile führt: die
 * Zeile wiederholt damit, wo sie einsortiert wurde.
 *
 * `lockKind` ist bei einem gesperrten Knoten immer gesetzt (`lockedFor()` gibt
 * nur `'phase'` oder `'parent'` zurück); die Elternsperre ist der Rückfall.
 */
const lockWhyIcon = computed(() =>
  props.entry.lockKind === 'phase' ? FORGE_DIVIDER_PHASE_ICON : FORGE_DIVIDER_PARENT_ICON,
)

/**
 * Zeigt die Zeile ihre Bedingungen als LISTE statt als Satz?
 *
 * Erst ab zwei. Eine einzelne Bedingung als Liste zu setzen wäre eine
 * Aufzählung mit einem Punkt — der Satz sagt dasselbe kürzer und steht seit
 * jeher dort.
 *
 * Eine PHASENSPERRE behält den Satz in jedem Fall: gegen sie hilft nur Warten,
 * und die Vorgänger daneben aufzuzählen legte eine Aufgabe nahe, die es gerade
 * nicht gibt.
 */
const showReqList = computed(
  () =>
    props.entry.lockKind !== 'phase' &&
    // Ein Prestige-Tor ebenso wenig: die Vorgaengerliste ist dann meist
    // vollstaendig erfuellt, und lauter Haekchen sagen nicht, was fehlt.
    props.entry.lockKind !== 'prestige' &&
    props.entry.reqs.length > 1,
)

/**
 * Die BEST-BUY-Marke wird gezeigt — aber nicht neben „NEW": beide Auskünfte
 * hängen an derselben atmenden Ebene und derselben Pillenposition, und eine
 * frische Zeile ist ohnehin schon die auffälligste der Liste.
 */
const showBest = computed(() => props.best && !props.fresh)

/** Warum diese Zeile die Marke trägt. Wortlaut wie an `MeepSkillNode`. */
const bestTitle = `${FORGE_BEST_BUY_LABEL} — cheapest you can afford`

/** Stufe 0 hat kein Vorher — ein „+0%" behauptete eine Wirkung, die es nicht gibt. */
const nowText = computed(() => (props.entry.level === 0 ? '—' : props.entry.nowText))

/** Die grosse Zahl und ihre Obergrenze. Zerlegt in `useForgeUpgrades`, weil die
 *  Archivzeile dieselbe Angabe zeigt. */
const levelParts = computed(() => forgeLevelParts(props.entry.level, props.entry.maxLevel))

const buyLabel = computed(() =>
  props.entry.state === 'capped' ? FORGE_TILE_CAPPED_LABEL : forgeGrowLabel(),
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
  /* Gemessen an der HÖCHSTEN Fassung: Kopfzeile mit „NEW"-Fähnchen plus
     Materialband. Sie steht hier, damit die anderen — eine gesperrte Zeile ohne
     beides, eine ohne Fähnchen — nicht aus der Reihe fallen. */
  min-height: 103px;
  padding: 11px 13px 11px 16px;
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
.fut-row--ready {
  border-color: #6ec040;
  background:
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

/* ── DAS GÜNSTIGSTE, WAS GERADE GEHT ────────────────────────
   Die stärkste Kante der Liste, dazu die eine atmende Ebene. Steht NACH
   `--ready`, weil best immer auch kaufbar ist. */
.fut-row--best {
  border-color: #9fe062;
}

/* ── NEU SEIT DEM LETZTEN BLICK ──────────────────────────────────
   Azur, und zwar dasselbe Azur wie `ShopReadyBadge`: die Marke am Header, am
   Profil-Reiter und an der Abteilungs-Schiene hat den Spieler hergeführt, der
   Rahmen führt die Spur bis zum Eintrag zu Ende. Grün ist hier schon „kaufbar",
   Gold auf den Karten dasselbe — beide wären doppelt belegt.

   Steht NACH `--ready` und `--best`: frisch ist immer auch kaufbar, und die
   spätere Regel gewinnt bei gleicher Spezifität. Das Innenlicht wird mit
   umgefärbt — ein azurner Rahmen über grünem Innenlicht wären zwei Aussagen an
   derselben Kante. Der grün getönte GRUND bleibt: frisch heisst „neu bezahlbar",
   die Zeile ist also beides und soll auch beides zeigen. */
.fut-row--fresh {
  border-color: #60a5fa;
  box-shadow:
    inset 0 0 0 1px rgba(96, 165, 250, 0.24),
    inset 0 0 26px -6px rgba(59, 130, 246, 0.24);
}

.fut-row--locked {
  opacity: 0.72;
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

/* Klasse je Zeile, NICHT als geerbte Variable am Listenrahmen
   (Performance-Regel 3). */
.fut-row.fc-dimmed {
  opacity: 0.42;
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
  gap: 6px;
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

.fut-mats :deep(.fc-cost-img),
.fut-mats :deep(.fc-cost-ph) {
  height: 22px;
}

.fut-mats :deep(.fc-cost-ph) {
  width: 22px;
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

/* Die zweite Zeile: Lager links, Marke rechts an die Kante. `margin-left: auto`
   an der Pille und nicht `justify-content: space-between`, weil das Band ganz
   fehlen kann — die Marke soll dann trotzdem rechts stehen, nicht allein links. */
.fut-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.fut-foot > .fut-tag {
  margin-left: auto;
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

/* Gesperrt führt der Name — er ist dort die einzige Auskunft, die etwas
   unterscheidet. */
.fut-name--lead {
  font-size: 17px;
  line-height: 1.15;
}

.fut-tag {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #bae6fd;
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  color: #fff;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1.3;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

/* Dieselbe Pille in Grün. Sie ersetzt „NEW", sie steht nie daneben — die Weiche
   sitzt im Template, nicht hier. Verlauf und Tinte im Rezept des Kaufknopfes,
   damit Marke und Handlung dieselbe Farbe sprechen. */
.fut-tag--best {
  border-color: #9fe062;
  background: linear-gradient(135deg, #52b830, #2e7a1a);
  color: #08130a;
  text-shadow: none;
}

/* Die Kurzform tritt erst im Kompakt-Block an ihre Stelle. */
.fut-tag-short {
  display: none;
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
   Rot hier schon „fehlt dir" heisst und Grün „kaufbar". */
.fut-capped {
  flex: 0 1 auto;
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
   Verb ab, nicht der Zeile — Herleitung an `FORGE_ROW_BULK_WIDTH_PX`.
══════════════════════════════════════════════════ */
.fut-buy-group {
  flex: 0 0 v-bind(buyWidth);
  align-self: stretch;
  display: flex;
  gap: 4px;
  min-width: 0;
}

/* EINE flache Fläche, keine innere Trennlinie: Wort oben, Preis darunter.
   Die Farbe trägt die Aussage — siehe Kopfkommentar. */
.fut-buy {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
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

.fut-buy-verb {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  white-space: nowrap;
}

.fut-buy-price {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  /* Dieselbe Tinte, nur zurückgenommen: eine zweite Farbe auf der Fläche wäre
     entweder unlesbar oder ein zweiter Akzent, wo nur ein Zusatz steht. */
  opacity: 0.82;
}

.fut-buy-chime {
  height: 22px;
  width: auto;
  object-fit: contain;
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
   GESPERRT
══════════════════════════════════════════════════ */
.fut-lock {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.25;
  color: rgba(255, 200, 80, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Trägt seit dem Schloss-Abzeichen am Motiv das WARUM (Sonne oder Astwerk) und
   heißt deshalb nicht mehr `--lock-ico`. */
.fut-lock-why {
  flex-shrink: 0;
  color: rgba(200, 144, 64, 0.7);
}

/* Die Bedingungsliste eines Knotens, der MEHRERE Vorgänger verlangt.

   Eine Zeile je Bedingung, und sie sind bewusst schmaler gesetzt als der
   Sperrsatz, den sie ersetzen: drei davon müssen in dieselbe Zeilenhöhe passen
   wie ein einzelner Satz, sonst spränge die Liste rechts bei jedem gesperrten
   Zusammenlauf auseinander. Gemessen an der Kronen-Zeile mit drei Bedingungen:
   3 × 16px + 2 × 3px Abstand = 54px gegen die 52px, die der Satz plus sein
   Abstand belegen. */
/* Kopf ueber der Bedingungsliste — wortgleich mit dem im Baum. Bei EINER
   Bedingung steht dort der Satz und kein Kopf. */
.fut-reqs-head {
  margin-bottom: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #8a7550;
}

.fut-reqs {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fut-reqs li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 16px;
  color: rgba(255, 200, 80, 0.62);
}

/* Erfüllt: dasselbe Grün, das im ganzen Projekt „kaufbar" heißt. Die Farbe
   trägt die Auskunft, nicht das Zeichen allein — drei Häkchen untereinander
   sind auf einen Blick nicht von drei Kreuzen zu unterscheiden. */
.fut-req--met {
  color: rgba(110, 192, 64, 0.85);
}

.fut-req-mark {
  flex-shrink: 0;
  width: 11px;
  text-align: center;
}

.fut-req-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Die Zahl steht rechts und in Tabellenziffern: untereinander sollen die
   Schrägstriche eine Spalte bilden. */
.fut-req-num {
  flex-shrink: 0;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: inherit;
  opacity: 0.85;
}

/* `.fc-track` liegt ohnehin absolut an der Unterkante — hier bekommt sie nur
   mehr Stärke, weil sie in einer 96px-Zeile sonst verschwindet. Absolut ist
   sie richtig: eine gesperrte Zeile hat keinen Knopf, und im Fluss stünde sie
   in einer Spalte, die es nicht mehr gibt. */
.fut-track {
  height: 4px;
}

/* ══════════════════════════════════════════════════
   DIE ATMENDE EBENE UND DIE KAUFQUITTUNG
   Je eine eigene Ebene mit STATISCHEM Schein, animiert wird allein die
   Deckkraft (Performance-Regel 2/11) — dasselbe Rezept wie `.fc-glow` und
   `.msc-glow`. `inset: 0` statt `-1px`, weil die Zeile `overflow: hidden`
   trägt; der Schein liegt deshalb nach INNEN.

   HÖCHSTENS EINE je Zeile, und über die ganze Liste hinweg höchstens eine grüne:
   die Marke sitzt am günstigsten kaufbaren Eintrag, und den gibt es einmal. Das
   ist der Grund, warum die kaufbare Zeile ihren Auftritt sonst rein statisch
   bestreitet — bei zwanzig kaufbaren Einträgen atmeten sonst zwanzig Ebenen
   gegeneinander, und die Marke hätte keinen Vorrang mehr, den sie zeigen könnte.
══════════════════════════════════════════════════ */
.fut-halo {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  pointer-events: none;
  animation: fut-halo-breathe 2.2s ease-in-out infinite;
}

/* Neu seit dem letzten Blick — azur, wie `ShopReadyBadge` am Header und am
   Profil-Reiter, die den Spieler hergeführt haben. */
.fut-halo--fresh {
  border: 1px solid #bae6fd;
  box-shadow: inset 0 0 16px rgba(59, 130, 246, 0.42);
}

/* Das Günstigste, was gerade geht — grün, wie der `.best-buy-ring` am Knoten im
   Baum. Beide zeigen auf denselben Eintrag und müssen dieselbe Farbe sprechen. */
.fut-halo--best {
  border: 1px solid #9fe062;
  box-shadow: inset 0 0 16px rgba(82, 184, 48, 0.42);
}

/* Der DRITTE Anlass derselben Ebene: die Zeile ist eben hereingerollt, weil der
   Zeiger drüben auf ihrem Knoten steht.

   In der KNOTENFARBE und nicht in Azur oder Grün — die beiden sagen, WAS diese
   Zeile ist (neu bezahlbar, das Günstigste). Diese hier sagt, WOHER der Blick
   kommt, und das ist der Knoten links. Einmalig und mit `forwards`: ein Atmen
   hiesse „Zustand", und eingetroffen ist man genau einmal. */
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

@keyframes fut-halo-breathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* Ruhig stellen, sobald der Blick ohnehin auf der Zeile liegt oder sie
   zurückgetreten ist — sonst atmt sie beim Schwenk über die Liste gegen den
   Spotlight an. */
.fut-row.fc-spot .fut-halo {
  animation: none;
  opacity: 1;
}

.fut-row.fc-dimmed .fut-halo {
  animation: none;
  opacity: 0.3;
}

/* …aber NICHT die Ankunft. Sie ist ein Ereignis und kein Zustand, und die
   eintreffende Zeile IST immer der Spotlight — die Regel darüber stellte
   ausgerechnet die Marke stumm, die den Weg erklärt. Ein Fallstrick, der ohne
   diese vier Zeilen als „Effekt funktioniert nicht" ankommt und keinen Grund
   mitliefert. */
.fut-row.fc-spot .fut-halo--arrived,
.fut-row.fc-dimmed .fut-halo--arrived {
  animation: fut-halo-arrive v-bind(arriveMs) ease-out 1 forwards;
  opacity: 0;
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

  /* Der Rahmen bleibt — nur sein Atmen fällt weg. */
  .fut-halo {
    animation: none;
    opacity: 1;
  }

  /* Auch hier: die Ankunftskurve endet bei `opacity: 0` und trägt `forwards`.
     Bliebe sie nur abgeschaltet, wäre die Marke unsichtbar statt ruhig — sie
     muss ausdrücklich zurückgesetzt werden. Derselbe Fallstrick wie bei
     `.node-spot` im Baum. */
  .fut-row.fc-spot .fut-halo--arrived,
  .fut-row.fc-dimmed .fut-halo--arrived,
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
  .fut-row {
    gap: 9px;
    min-height: 93px;
    padding: 9px 11px 9px 14px;
  }

  .fut-main {
    gap: 5px;
  }

  .fut-head {
    gap: 8px;
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

  .fut-name--lead {
    font-size: 16px;
  }

  /* Die Marke gibt dem Namen 28px zurück — Herleitung an
     `FORGE_BEST_BUY_SHORT_LABEL`. */
  .fut-tag-long {
    display: none;
  }

  .fut-tag-short {
    display: inline;
  }

  .fut-delta {
    font-size: 13.5px;
  }

  .fut-capped,
  .fut-lock {
    font-size: 12.5px;
  }

  .fut-mats :deep(.fc-cost-row) {
    gap: 12px;
  }

  .fut-mats :deep(.fc-cost-img),
  .fut-mats :deep(.fc-cost-ph) {
    height: 20px;
  }

  .fut-mats :deep(.fc-cost-ph) {
    width: 20px;
  }

  .fut-buy-group {
    flex-basis: v-bind(buyWidthCompact);
  }

  .fut-buy-verb {
    font-size: 15px;
  }

  .fut-buy-price {
    font-size: 14px;
  }

  .fut-buy-chime {
    height: 20px;
  }
}
</style>
