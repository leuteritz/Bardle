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
         Zeile jetzt für Stufe, Wirkung und Knopf braucht. Die Knotenfarbe trägt
         das Glyph selbst. -->
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

        <!-- Was das Lager kostet. Der Chime-Preis steht NICHT hier, sondern im
             Knopf (`:gold="0"` lässt ihn weg) — er ist die eine Zahl, die jeder
             Eintrag hat, und gehört an die Stelle, an der geklickt wird. Die
             Materialien kann der Knopf nicht mittragen: zwei Chips „habe /
             brauche" samt ✓ brauchen gemessen ~180px, und so breit darf er
             nicht werden, ohne dem Namen daneben die Hälfte zu nehmen. -->
        <ForgeCostRow
          v-if="entry.materials.length > 0"
          class="fut-mats"
          inline
          chips
          :label="false"
          :gold="0"
          :gold-ok="true"
          :materials="entry.materials"
        />
      </div>

      <!-- Die Kauffläche: Verb oben, Preis darunter — die Form aus der
           Vorlage. Feste Breite über die volle Zeilenhöhe, damit die grünen
           Kanten über die ganze Liste hinweg fluchten und der Knopf die
           grösste Fläche der Zeile ist statt ihres kleinsten Elements. Ein
           gedeckelter Strahl trägt keinen Preis: bei ihm ist nichts zu
           bezahlen, sondern zu warten. -->
      <button
        class="fut-buy"
        :class="{ 'fut-buy--capped': entry.state === 'capped' }"
        :disabled="!entry.canBuy"
        :aria-label="`Grow ${entry.name}`"
        :title="entry.canBuy ? `Grow ${entry.name}` : entry.lockReason || 'Not affordable yet'"
        @click="$emit('buy', entry.id)"
      >
        <span class="fut-buy-verb">{{ buyLabel }}</span>
        <ForgeCostRow
          v-if="entry.state !== 'capped'"
          class="fut-buy-cost"
          inline
          chips
          :label="false"
          :gold="entry.goldCost"
          :gold-ok="entry.goldOk"
        />
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Ein Eintrag der Upgrade-Liste als ZEILE.
 *
 * Eine waagerechte Achse: nacktes Icon · Stufe gross mit dem Namen klein
 * darunter · Wirkungssprung · Kaufknopf, und unter Stufe und Name ein schmales
 * Band mit dem Materialbedarf. Gemessen 101px auf Full HD, 114px ab 2K — und
 * zwar für JEDEN Zustand gleich, auch für die gesperrte Zeile ohne Knopf.
 *
 * Zwei Fassungen davor, beide aus demselben Grund verworfen (Herleitung samt
 * Messwerten an `FORGE_ROW_ICON_SIZE`):
 *
 *   • die 44px-Zeile, in der Preis und Wirkungssprung die KLEINSTEN Elemente
 *     der Spalte waren, die Stufe gar nicht vorkam und ein unbeschriftetes `＋`
 *     kaufte;
 *   • die zweistöckige Kachel danach, die das löste, aber ~150px je Eintrag
 *     kostete — bei Vollausbau fünfundvierzig Stück, von denen drei gleichzeitig
 *     zu sehen waren.
 *
 * Die Zeile hat beides: zwei Drittel der Höhe und trotzdem 26px-Stufe,
 * 15px-Wirkung und einen Knopf, der Verb UND Preis trägt. Bezahlt wird das mit
 * BREITE statt mit Höhe — der Icon-Sockel ist weggefallen, und Verb und Preis
 * stapeln im Knopf, statt sich die Zeile zu teilen.
 *
 * Was der Knopf NICHT trägt, ist das Material. Die Fassung mit allem darin ist
 * gebaut und wieder zurückgenommen worden: zwei Chips „habe / brauche" samt ✓
 * messen ~180px, der Knopf brach damit auf zwei Kostenzeilen um (gemessen 136px
 * Zeilenhöhe gegen 98px bei den Nachbarn) und nahm dem Namen so viel Breite,
 * dass Name UND Wirkungswert abgeschnitten wurden. Das Material steht deshalb
 * als eigenes Band unter Stufe und Name; im Knopf bleibt der Chime-Preis — die
 * eine Zahl, die jeder Eintrag hat.
 *
 * Die Preiszeile liegt auf einem DUNKLEN Streifen im grünen Knopf und nicht
 * direkt auf dem Grün: ein fehlender Betrag ist rot mit ✕, und Rot auf Grün
 * wäre die einzige Stelle im Spiel, an der die Zweitkodierung des Mangels
 * kippt. Ein Knopf bleibt es trotzdem — ein Rahmen, ein `<button>`, ein
 * Klickziel.
 *
 * Was sie NICHT ist: eine volle Karte mit Beschreibungssatz und beschriftetem
 * Now/After-Kasten. Die stand hier schon einmal und wurde zurückgenommen. Der
 * Beschreibungssatz, der Rang und der Elternknoten bleiben deshalb im
 * schwebenden Kärtchen (`ForgeRowTooltip`); das Archiv behält seine Einzeiler
 * (`ForgeGrownRow`).
 *
 * Die ZEILE selbst tut nichts — gekauft wird über ihren Knopf. Eine breite
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
  FORGE_FRESH_LABEL,
  FORGE_FRESH_TITLE,
  FORGE_LOCK_ICON,
  FORGE_ROW_BUY_WIDTH_PX,
  FORGE_ROW_BUY_WIDTH_COMPACT_PX,
  FORGE_ROW_ICON_SIZE,
  FORGE_TILE_CAPPED_LABEL,
} from '@/config/constants'

/* Muster `MeepSkillCard`: die Dauer steht in den Konstanten und wird von CSS
   und dem Timer in `ForgeUpgradesSection` aus derselben Quelle gelesen — den
   KEYFRAME-Namen setzt weiterhin die CSS-Klasse, nie JavaScript. */
const flashDuration = `${FORGE_CARD_FLASH_MS}ms`
const buyWidth = `${FORGE_ROW_BUY_WIDTH_PX}px`
const buyWidthCompact = `${FORGE_ROW_BUY_WIDTH_COMPACT_PX}px`

const props = defineProps<{
  entry: ForgeUpgradeEntry
  flashed: boolean
  /** Seit dem letzten Blick des Spielers bezahlbar geworden — trägt den azurnen
   *  Rahmen, bis der Zeiger die Zeile einmal berührt hat. */
  fresh: boolean
}>()
defineEmits<{ (e: 'buy', id: string): void }>()

const { spotlightId, setListHover } = useForgeSpotlight()

/** Stufe 0 hat kein Vorher — ein „+0%" behauptete eine Wirkung, die es nicht gibt. */
const nowText = computed(() => (props.entry.level === 0 ? '—' : props.entry.nowText))

/** Die grosse Zahl und ihre Obergrenze. Zerlegt in `useForgeUpgrades`, weil
 *  Empfehlungskopf und Archivzeile dieselbe Angabe zeigen. */
const levelParts = computed(() => forgeLevelParts(props.entry.level, props.entry.maxLevel))

/**
 * Die Beschriftung der Verb-Zeile — einzeilig, weil der Knopf seine Breite
 * nicht mehr mit dem Preis teilt, sondern über ihm steht.
 */
const buyLabel = computed(() =>
  props.entry.state === 'capped' ? FORGE_TILE_CAPPED_LABEL : forgeGrowLabel(props.entry.level),
)
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   ZEILE
   Fläche und Rand im Rezept der geteilten `.fc-card` (rpg-theme.css) — die
   Liste soll nicht wie ein zweites Bauteil neben Relikten und Konstellationen
   aussehen.

   Die Mindesthöhe ist die Höhe des Knopfes samt Innenabstand. Sie steht hier,
   damit eine GESPERRTE Zeile — die keinen Knopf hat — nicht aus der Reihe
   fällt.
══════════════════════════════════════════════════ */
.fut-row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 11px;
  /* Gemessen an der vollen Zeile (Kopfzeile + Materialband). Sie steht hier,
     damit eine GESPERRTE Zeile — die weder Band noch Knopf hat — nicht aus der
     Reihe fällt. */
  min-height: 114px;
  padding: 11px 13px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    opacity 0.12s ease;
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

/* Die Leitkante. Kommt der Zeiger vom Baum, ist die Liste gerade hierher
   gerollt, und ein Rahmen allein sagt bei mehreren gleich hohen Zeilen zu
   wenig. Muster `MeepSkillCard`. */
.fut-row.fc-spot::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--node-c, #e8c040);
  pointer-events: none;
  z-index: 1;
}

/* Klasse je Zeile, NICHT als geerbte Variable am Listenrahmen
   (Performance-Regel 3). */
.fut-row.fc-dimmed {
  opacity: 0.42;
}

/* ══════════════════════════════════════════════════
   ICON · STUFE · NAME
══════════════════════════════════════════════════ */
.fut-ico {
  flex-shrink: 0;
  align-self: center;
}

/* Zwei Zeilen: oben Stufe/Name/Wirkung, darunter das Lager. Die Materialien
   stehen hier und nicht im Knopf — zwei Chips „habe / brauche" samt ✓ brauchen
   gemessen ~180px, und ein so breiter Knopf nähme dem Namen die Hälfte. Der
   Chime-Preis bleibt trotzdem im Knopf: er ist die eine Zahl, die jeder
   Eintrag hat. */
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

/* Die Chips sind hier etwas kleiner als in einer Karte: die Zeile trägt sie
   als NEBENauskunft unter dem Namen, nicht als ihren Hauptinhalt. */
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

.fut-mats :deep(.fc-cost-pair) {
  padding: 4px 8px;
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
   Verb oben auf Grün, Chime-Preis darunter auf Dunkel — die Form aus der
   Vorlage. Feste Breite über die volle Zeilenhöhe: alle grünen Kanten der
   Liste fluchten damit, und der Preis steht immer an derselben Stelle.

   Warum die Preiszeile DUNKEL ist und nicht direkt auf dem Grün liegt: fehlt
   der Betrag, wird er rot mit ✕ ausgewiesen, und Rot auf Grün wäre die einzige
   Stelle im Spiel, an der die Zweitkodierung des Mangels kippt.
══════════════════════════════════════════════════ */
.fut-buy {
  flex: 0 0 v-bind(buyWidth);
  align-self: stretch;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: 1px solid #6ec040;
  border-radius: 4px;
  /* Der Grund der PREISZEILE — der Grünverlauf sitzt an der Verb-Zeile, sonst
     müsste sie ihn wieder überdecken. */
  background: #14120b;
  font-family: inherit;
  cursor: pointer;
}

.fut-buy-verb {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px 8px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.03em;
  line-height: 1.15;
  white-space: nowrap;
}

/* Ein gedeckelter Strahl hat keine Preiszeile — das Verb nimmt den ganzen
   Knopf. */
.fut-buy--capped .fut-buy-verb {
  flex: 1;
}

.fut-buy-cost {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.55);
}

.fut-buy-cost :deep(.fc-cost-row) {
  justify-content: center;
}

/* Grösser als in einer Karte — der Preis ist hier die zweite Hälfte des
   Knopfes, und ein 26px-Bild sähe darin nicht verloren, sondern richtig aus. */
.fut-buy-cost :deep(.fc-cost-img) {
  height: 26px;
}

.fut-buy:hover:not(:disabled) .fut-buy-verb {
  filter: brightness(1.12);
}

/* Gesperrt wird flach und heller beschriftet statt gedimmt — ein ausgegrauter
   Grünverlauf trägt seine fast schwarze Schrift nicht mehr. Rezept `.fc-act`.
   Die Kasse bleibt, wie sie ist: WAS fehlt, steht dort ohnehin rot mit ✕, und
   ausgerechnet das ist die Auskunft, wegen der man auf einen toten Knopf
   sieht. */
.fut-buy:disabled {
  border-color: #4a3a1c;
  cursor: not-allowed;
}

.fut-buy:disabled .fut-buy-verb {
  background: #241a0c;
  color: rgba(232, 216, 176, 0.55);
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
   mehr Stärke, weil sie in einer 84px-Zeile sonst verschwindet. Absolut ist
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
   Die Spalte misst dort 499px statt 560; Icon, Stufe, Wirkung und Knopf teilen
   sich 61 Pixel weniger. Die Icon-Grösse steht als Attribut am `<Icon>` und
   wird hier per CSS überschrieben — bei Iconify schlägt CSS das Attribut, und
   eine zweite Konstante für dieselbe Sache liefe still auseinander.
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fut-row {
    gap: 9px;
    min-height: 101px;
    padding: 9px 11px;
  }

  .fut-main {
    gap: 5px;
  }

  .fut-head {
    gap: 8px;
  }

  .fut-ico {
    width: 38px;
    height: 38px;
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
    gap: 8px;
  }

  .fut-mats :deep(.fc-cost-pair) {
    padding: 3px 7px;
  }

  .fut-mats :deep(.fc-cost-img),
  .fut-mats :deep(.fc-cost-ph) {
    height: 20px;
  }

  .fut-mats :deep(.fc-cost-ph) {
    width: 20px;
  }

  .fut-buy {
    flex-basis: v-bind(buyWidthCompact);
  }

  .fut-buy-verb {
    padding: 8px 6px;
    font-size: 14px;
  }

  .fut-buy-cost {
    padding: 6px;
  }

  .fut-buy-cost :deep(.fc-cost-img) {
    height: 24px;
  }
}
</style>
