<template>
  <div
    class="fut-row"
    :class="[
      `fut-row--${entry.state}`,
      {
        'fut-row--ready': entry.canBuy,
        'fut-row--fresh': fresh,
        'fc-spot': spotlightId === entry.id,
        'fc-dimmed': spotlightId !== null && spotlightId !== entry.id,
      },
    ]"
    :style="{ '--node-c': entry.color }"
    :data-forge-id="entry.id"
    @mouseenter="setListHover(entry.id)"
  >
    <div class="fut-flash" :class="{ 'fut-flash--on': flashed }" aria-hidden="true" />

    <!-- Der azurne Rahmen. Eigene Ebene mit STATISCHEM Schein, animiert wird nur
         ihre Deckkraft (Performance-Regel 2/11) — und auf `inset: 0`, weil die
         Zeile `overflow: hidden` trägt und ein negativer Einzug abgeschnitten
         würde. Genau derselbe Sitz wie beim Quittungsblitz darüber. -->
    <div v-if="fresh" class="fut-fresh" aria-hidden="true" />

    <!-- Nackt, ohne Sockel: der gerahmte Kasten davor kostete Breite, die die
         Zeile für Stufe, Wirkung und Knopf braucht. Die Knotenfarbe trägt das
         Glyph selbst. Es steht VOR der Weiche und damit in jedem Zustand — eine
         gesperrte Zeile ist sonst die einzige ohne Bild, und ausgerechnet sie
         hat am wenigsten sonst, woran man sie erkennt. -->
    <Icon
      :icon="entry.icon"
      :width="FORGE_ROW_ICON_SIZE"
      :height="FORGE_ROW_ICON_SIZE"
      class="fut-ico"
      :style="{ color: entry.color }"
    />

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
        <span class="fut-lock">
          <Icon :icon="FORGE_LOCK_ICON" width="15" height="15" class="fut-lock-ico" />
          {{ entry.lockReason }}
        </span>
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
            <span class="fut-name-row">
              <span class="fut-name" :style="{ color: entry.color }">{{ entry.name }}</span>
              <span v-if="fresh" class="fut-tag" :aria-label="FORGE_FRESH_TITLE">
                {{ FORGE_FRESH_LABEL }}
              </span>
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
          @click="$emit('buy', entry.id)"
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
          @click="$emit('buyMany', entry.id)"
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
  FORGE_CARD_FLASH_MS,
  FORGE_CHIME_IMAGE,
  FORGE_COUNT_TOKEN,
  FORGE_FRESH_LABEL,
  FORGE_FRESH_TITLE,
  FORGE_GROW_LABEL,
  FORGE_LEVEL_PREFIX,
  FORGE_LOCK_ICON,
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
     * Wie viele Stufen Vorrat UND Lager gerade hergeben. Kommt von der Liste,
     * nicht aus `useForgeUpgrades()`: das Composable hier je Zeile aufzurufen
     * hiesse fünfundvierzig Kopien von `upgradeEntries` über fünfzig Knoten.
     */
    bulkCount?: number
  }>(),
  { bulkCount: 0 },
)
defineEmits<{ (e: 'buy', id: string): void; (e: 'buyMany', id: string): void }>()

const { spotlightId, setListHover } = useForgeSpotlight()

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

.fut-row--ready {
  border-color: #4a8a28;
}

.fut-row--ready:hover {
  border-color: #6ec040;
}

/* ── NEU SEIT DEM LETZTEN BLICK ──────────────────────────────────
   Azur, und zwar dasselbe Azur wie `ShopReadyBadge`: die Marke am Header, am
   Profil-Reiter und an der Abteilungs-Schiene hat den Spieler hergeführt, der
   Rahmen führt die Spur bis zum Eintrag zu Ende. Grün ist hier schon „kaufbar",
   Gold auf den Karten dasselbe — beide wären doppelt belegt.

   Steht NACH `--ready`: frisch ist immer auch kaufbar, und die spätere Regel
   gewinnt bei gleicher Spezifität. */
.fut-row--fresh {
  border-color: #60a5fa;
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
   Geste und dürfen nicht zwei Farben ergeben. */
.fut-row.fc-spot.fc-spot {
  background: #241a10;
  border-color: var(--node-c, #e8c040);
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

/* ══════════════════════════════════════════════════
   ICON · STUFE · NAME · MATERIAL
══════════════════════════════════════════════════ */
/* `align-self: center` ist Pflicht: die Zeile trägt `align-items: stretch`, und
   ohne sie zöge das SVG auf die volle Zeilenhöhe. */
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

.fut-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
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
   Verlauf trägt seine fast schwarze Schrift nicht mehr (Rezept `.fc-act`). */
.fut-buy--short {
  border-color: #cc6050;
  background: linear-gradient(to bottom, #a83c2c, #6e1e12);
  color: #ffe0d6;
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

.fut-lock-ico {
  flex-shrink: 0;
  color: rgba(200, 144, 64, 0.7);
}

/* `.fc-track` liegt ohnehin absolut an der Unterkante — hier bekommt sie nur
   mehr Stärke, weil sie in einer 96px-Zeile sonst verschwindet. Absolut ist
   sie richtig: eine gesperrte Zeile hat keinen Knopf, und im Fluss stünde sie
   in einer Spalte, die es nicht mehr gibt. */
.fut-track {
  height: 4px;
}

/* ══════════════════════════════════════════════════
   „NEU"-SCHEIN UND KAUFQUITTUNG
   Je eine eigene Ebene mit STATISCHEM Schein, animiert wird allein die
   Deckkraft (Performance-Regel 2/11) — dasselbe Rezept wie `.fc-glow` und
   `.msc-glow`. `inset: 0` statt `-1px`, weil die Zeile `overflow: hidden`
   trägt; der Schein liegt deshalb nach INNEN.
══════════════════════════════════════════════════ */
.fut-fresh {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  border: 1px solid #bae6fd;
  box-shadow: inset 0 0 16px rgba(59, 130, 246, 0.42);
  pointer-events: none;
  animation: fut-fresh-breathe 2.2s ease-in-out infinite;
}

@keyframes fut-fresh-breathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* Ruhig stellen, sobald der Blick ohnehin auf der Zeile liegt oder sie
   zurückgetreten ist — sonst atmen bei einem Schwenk über die Liste ein Dutzend
   Ebenen gleichzeitig gegen den Spotlight an. */
.fut-row.fc-spot .fut-fresh {
  animation: none;
  opacity: 1;
}

.fut-row.fc-dimmed .fut-fresh {
  animation: none;
  opacity: 0.3;
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
  .fut-fresh {
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
