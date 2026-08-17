<template>
  <div
    class="fut-tile"
    :class="[
      `fut-tile--${entry.state}`,
      {
        'fut-tile--ready': entry.canBuy,
        'fut-tile--fresh': fresh,
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
         Kachel `overflow: hidden` trägt und ein negativer Einzug abgeschnitten
         würde. Genau derselbe Sitz wie beim Quittungsblitz darüber. -->
    <div v-if="fresh" class="fut-fresh" aria-hidden="true" />

    <div class="fut-head">
      <span class="fut-ico">
        <Icon
          :icon="entry.icon"
          :width="FORGE_TILE_ICON_SIZE"
          :height="FORGE_TILE_ICON_SIZE"
          :style="{ color: entry.color }"
        />
      </span>

      <span class="fut-text">
        <span class="fut-name-row">
          <span class="fut-name" :style="{ color: entry.color }">{{ entry.name }}</span>
          <span v-if="fresh" class="fut-tag" :aria-label="FORGE_FRESH_TITLE">
            {{ FORGE_FRESH_LABEL }}
          </span>
        </span>

        <!-- Ein gedeckelter Strahl hat einen Sprung, den er nicht nehmen darf —
             der Grund ist dort die nützlichere Zeile. Ein gesperrter zeigt gar
             keine: sein Grund steht gross in der Fusszeile. -->
        <span v-if="entry.state === 'capped'" class="fut-capped">{{ entry.lockReason }}</span>
        <span v-else-if="entry.state !== 'locked'" class="fut-delta">
          <span class="fut-delta-now">{{ nowText }}</span>
          <span class="fut-delta-arrow">→</span>
          <span class="fut-delta-next">{{ entry.nextText }}</span>
        </span>
      </span>

      <span class="fut-lvl">{{ levelText }}</span>
    </div>

    <!-- Gesperrt: der Weg zur Freischaltung statt eines Preises, den man ohnehin
         nicht zahlen könnte. Der Balken bleibt weg, wo er nichts sagt — eine
         Phasensperre steht immer auf null, und ein dauerhaft leerer Balken liest
         sich als Fehler. -->
    <div v-if="entry.state === 'locked'" class="fut-foot fut-foot--lock">
      <span class="fut-lock">
        <Icon :icon="FORGE_LOCK_ICON" width="16" height="16" class="fut-lock-ico" />
        {{ entry.lockReason }}
      </span>
      <div v-if="entry.unlockProgress > 0" class="fc-track fut-track">
        <i :style="{ transform: `scaleX(${entry.unlockProgress})` }" />
      </div>
    </div>

    <div v-else class="fut-foot">
      <ForgeCostRow
        class="fut-cost"
        :gold="entry.goldCost"
        :gold-ok="entry.goldOk"
        :materials="entry.materials"
        :label="false"
      />
      <button
        class="fut-buy"
        :disabled="!entry.canBuy"
        :aria-label="`Grow ${entry.name}`"
        :title="entry.canBuy ? `Grow ${entry.name}` : entry.lockReason || 'Not affordable yet'"
        @click="$emit('buy', entry.id)"
      >
        {{ entry.state === 'capped' ? FORGE_TILE_CAPPED_LABEL : FORGE_GROW_LABEL }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Ein Eintrag der Upgrade-Liste als KACHEL.
 *
 * Sie ersetzt die 44px-Zeile, die hier stand: dort waren Preis und
 * Wirkungssprung — die beiden Zahlen, wegen derer der Spieler überhaupt
 * hersieht — die kleinsten Elemente der ganzen Spalte, die Stufe fehlte
 * vollständig, und gekauft wurde über ein unbeschriftetes `＋`.
 *
 * Gebaut ist sie aus Teilen, die das Projekt schon trägt, nicht aus neuen: der
 * Icon-Sockel und der beschriftete Knopf stammen von `MeepSkillCard`, die
 * Kostenleiste ist die geteilte `ForgeCostRow` (26px Bild / 17px Zahl, immer
 * „habe / brauche" samt ✓/✕), und Preis NEBEN Knopf ist die Fusszeile aus
 * `MeepBestBuyPanel` — übereinander kostete dieselbe Auskunft dort gemessen
 * fast das Doppelte an Höhe.
 *
 * Was sie NICHT ist: eine volle Karte mit Beschreibungssatz und beschriftetem
 * Now/After-Kasten. Die stand hier schon einmal und wurde zurückgenommen — bei
 * Vollausbau fünfundvierzig davon untereinander. Der Beschreibungssatz, der
 * Rang und der Elternknoten bleiben deshalb im schwebenden Kärtchen
 * (`ForgeRowTooltip`); das Archiv behält seine Einzeiler (`ForgeGrownRow`).
 *
 * Die KACHEL selbst tut nichts — gekauft wird über ihren Knopf. Eine breite
 * Kauffläche, die man beim Scrollen streift, wäre teuer bezahlt (dieselbe
 * Entscheidung wie an der Skill-Karte).
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import ForgeCostRow from './ForgeCostRow.vue'
import type { ForgeUpgradeEntry } from '@/types'
import {
  FORGE_CARD_FLASH_MS,
  FORGE_ENDLESS_SYMBOL,
  FORGE_FRESH_LABEL,
  FORGE_FRESH_TITLE,
  FORGE_GROW_LABEL,
  FORGE_LOCK_ICON,
  FORGE_TILE_CAPPED_LABEL,
  FORGE_TILE_ICON_SIZE,
} from '@/config/constants'

/* Muster `MeepSkillCard`: die Dauer steht in den Konstanten und wird von CSS
   und dem Timer in `ForgeUpgradesSection` aus derselben Quelle gelesen — den
   KEYFRAME-Namen setzt weiterhin die CSS-Klasse, nie JavaScript. */
const flashDuration = `${FORGE_CARD_FLASH_MS}ms`

const props = defineProps<{
  entry: ForgeUpgradeEntry
  flashed: boolean
  /** Seit dem letzten Blick des Spielers bezahlbar geworden — trägt den azurnen
   *  Rahmen, bis der Zeiger die Kachel einmal berührt hat. */
  fresh: boolean
}>()
defineEmits<{ (e: 'buy', id: string): void }>()

const { spotlightId, setListHover } = useForgeSpotlight()

/** Stufe 0 hat kein Vorher — ein „+0%" behauptete eine Wirkung, die es nicht gibt. */
const nowText = computed(() => (props.entry.level === 0 ? '—' : props.entry.nowText))

/** Ein Astral Bough hat keine Höchststufe; `Lv 25 / Infinity` wäre der rohe Wert. */
const levelText = computed(() =>
  Number.isFinite(props.entry.maxLevel)
    ? `Lv ${props.entry.level} / ${props.entry.maxLevel}`
    : `Lv ${props.entry.level} / ${FORGE_ENDLESS_SYMBOL}`,
)
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   KACHEL
   Fläche und Rand im Rezept der geteilten `.fc-card` (rpg-theme.css) — die
   Liste soll nicht wie ein zweites Bauteil neben Relikten und Konstellationen
   aussehen.
══════════════════════════════════════════════════ */
.fut-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px 14px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    opacity 0.12s ease;
}

.fut-tile:hover {
  border-color: #7a4e20;
}

.fut-tile--ready {
  border-color: #4a8a28;
}

.fut-tile--ready:hover {
  border-color: #6ec040;
}

/* ── NEU SEIT DEM LETZTEN BLICK ──────────────────────────────────
   Azur, und zwar dasselbe Azur wie `ShopReadyBadge`: die Marke am Header, am
   Profil-Reiter und an der Abteilungs-Schiene hat den Spieler hergeführt, der
   Rahmen führt die Spur bis zum Eintrag zu Ende. Grün ist hier schon „kaufbar",
   Gold auf den Karten dasselbe — beide wären doppelt belegt.

   Steht NACH `--ready`: frisch ist immer auch kaufbar, und die spätere Regel
   gewinnt bei gleicher Spezifität. */
.fut-tile--fresh {
  border-color: #60a5fa;
}

.fut-tile--locked {
  opacity: 0.72;
}

/* ── Der Zeiger meint diese Kachel ────────────────────────────
   Gleich, ob er auf ihr steht oder drüben auf ihrem Knoten im Baum. Die
   globalen Regeln dazu sind als `.fc-card.fc-spot` / `.fc-row.fc-spot`
   geschrieben und verlangen die Trägerklasse mit — diese Kachel heisst
   `.fut-tile` und träfe keine von beiden. Sie stehen deshalb hier
   ausformuliert; die geteilten Regeln bleiben unangetastet.

   Doppelt geschrieben, mit Absicht: `.fut-tile--ready:hover` wiegt eine Stufe
   mehr und färbte den Rahmen sonst grün, sobald der Zeiger wirklich auf der
   Kachel steht — auf den Knoten zeigen und auf seine Kachel zeigen sind EINE
   Geste und dürfen nicht zwei Farben ergeben. */
.fut-tile.fc-spot.fc-spot {
  background: #241a10;
  border-color: var(--node-c, #e8c040);
}

/* Die Leitkante. Kommt der Zeiger vom Baum, ist die Liste gerade hierher
   gerollt, und ein Rahmen allein sagt bei mehreren gleich hohen Kacheln zu
   wenig. Muster `MeepSkillCard`. */
.fut-tile.fc-spot::before {
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

/* Klasse je Kachel, NICHT als geerbte Variable am Listenrahmen
   (Performance-Regel 3). */
.fut-tile.fc-dimmed {
  opacity: 0.42;
}

/* ══════════════════════════════════════════════════
   KOPFZEILE
══════════════════════════════════════════════════ */
.fut-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

/* Statischer Radialverlauf in der Knotenfarbe — dieselbe Bühne wie an der
   Skill-Karte und im Empfehlungs-Panel. */
.fut-ico {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--node-c, #c89040) 18%, #14120c),
    #100e08 74%
  );
  border: 1px solid color-mix(in srgb, var(--node-c, #c89040) 42%, #32210c);
}

.fut-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fut-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.fut-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* ── Was die nächste Stufe bringt ─────────────────────────────
   Das Danach trägt die Farbe, nicht das Jetzt — es ist die Zahl, wegen der man
   auf den Knopf sieht. Dasselbe Grün wie `.fc-delta-value--next`. */
.fut-delta {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fut-delta-now {
  color: rgba(232, 220, 192, 0.5);
  font-variant-numeric: tabular-nums;
}

.fut-delta-arrow {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}

.fut-delta-next {
  color: #7ad0a0;
  font-variant-numeric: tabular-nums;
}

/* Der Grund, warum ein Kernstrahl gerade nicht weiterwächst. Bernstein, weil
   Rot hier schon „fehlt dir" heisst und Grün „kaufbar". */
.fut-capped {
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  color: rgba(255, 200, 80, 0.72);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fut-lvl {
  flex-shrink: 0;
  align-self: flex-start;
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid #32210c;
  color: rgba(232, 220, 192, 0.68);
  font-size: 12.5px;
  font-weight: 900;
  line-height: 1.25;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ══════════════════════════════════════════════════
   FUSSZEILE — Preis NEBEN dem Knopf
   Übereinander kostete dieselbe Auskunft in `MeepBestBuyPanel` gemessen 135
   statt 72 Pixel; die Beschriftung „Cost" entfällt, weil der Knopf daneben
   schon sagt, wofür die Zahl steht.
══════════════════════════════════════════════════ */
.fut-foot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 9px;
  border-top: 1px solid #2a1a08;
}

.fut-cost {
  flex: 1;
  min-width: 0;
}

/* Die geteilte Kostenleiste steht sonst in einer vollen Karte und darf dort
   grosszügig atmen. Hier teilt sie sich die Zeile mit dem Knopf: 12px statt
   14px halten Chime-Preis und zwei Materialien auf Full HD einzeilig. */
.fut-cost :deep(.fc-cost-row) {
  gap: 12px;
}

/* Gesperrt wird flach und heller beschriftet statt gedimmt — ein ausgegrauter
   Grünverlauf trägt seine fast schwarze Schrift nicht mehr. Rezept `.fc-act`. */
.fut-buy {
  flex-shrink: 0;
  min-width: 92px;
  padding: 8px 14px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1.2;
  cursor: pointer;
}

.fut-buy:hover:not(:disabled) {
  filter: brightness(1.12);
}

.fut-buy:disabled {
  border-color: #4a3a1c;
  background: #241a0c;
  color: rgba(232, 216, 176, 0.55);
  cursor: not-allowed;
}

/* ── Fusszeile einer gesperrten Kachel ───────────────────────── */
.fut-foot--lock {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.fut-lock {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.25;
  color: rgba(255, 200, 80, 0.7);
}

.fut-lock-ico {
  flex-shrink: 0;
  color: rgba(200, 144, 64, 0.7);
}

.fut-track {
  height: 7px;
}

/* ══════════════════════════════════════════════════
   „NEU"-SCHEIN UND KAUFQUITTUNG
   Je eine eigene Ebene mit STATISCHEM Schein, animiert wird allein die
   Deckkraft (Performance-Regel 2/11) — dasselbe Rezept wie `.fc-glow` und
   `.msc-glow`. `inset: 0` statt `-1px`, weil die Kachel `overflow: hidden`
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

/* Ruhig stellen, sobald der Blick ohnehin auf der Kachel liegt oder sie
   zurückgetreten ist — sonst atmen bei einem Schwenk über die Liste ein Dutzend
   Ebenen gleichzeitig gegen den Spotlight an. */
.fut-tile.fc-spot .fut-fresh {
  animation: none;
  opacity: 1;
}

.fut-tile.fc-dimmed .fut-fresh {
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
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fut-tile {
    gap: 8px;
    padding: 11px 12px;
  }

  .fut-head {
    gap: 10px;
  }

  .fut-ico {
    width: 42px;
    height: 42px;
  }

  .fut-name {
    font-size: 15px;
  }

  .fut-delta {
    font-size: 13.5px;
  }

  .fut-foot {
    padding-top: 8px;
  }

  .fut-buy {
    padding: 7px 12px;
  }
}
</style>
