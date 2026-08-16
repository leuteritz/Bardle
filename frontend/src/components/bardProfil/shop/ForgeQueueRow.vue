<template>
  <div
    class="fq-row"
    :class="[
      `fq-row--${entry.state}`,
      {
        'fq-row--ready': entry.canBuy,
        'fq-row--fresh': fresh,
        'fq-spot': spotlightId === entry.id,
        'fq-dimmed': spotlightId !== null && spotlightId !== entry.id,
      },
    ]"
    :style="{ '--node-c': entry.color }"
    :data-forge-id="entry.id"
    :title="fresh ? FORGE_FRESH_TITLE : undefined"
    @mouseenter="setListHover(entry.id)"
  >
    <div class="fq-flash" :class="{ 'fq-flash--on': flashed }" aria-hidden="true" />

    <!-- Der azurne Rahmen. Eigene Ebene mit STATISCHEM Schein, animiert wird nur
         ihre Deckkraft (Performance-Regel 2/11) — und auf `inset: 0`, weil die
         Zeile `overflow: hidden` trägt und ein negativer Einzug abgeschnitten
         würde. Genau derselbe Sitz wie beim Quittungsblitz darüber. -->
    <div v-if="fresh" class="fq-fresh" aria-hidden="true" />

    <Icon :icon="entry.icon" width="26" height="26" class="fq-ico" :style="{ color: entry.color }" />

    <div class="fq-text">
      <span class="fq-name" :style="{ color: entry.color }">{{ entry.name }}</span>
      <span class="fq-gain">{{ gainLine }}</span>
    </div>

    <!-- Steht VOR dem Preis, nicht hinter ihm: der Blick läuft die Zeile von
         links nach rechts, und „neu" ist die Auskunft, die zuerst greift.
         Ein `v-if` genügt ohne Zustandsprüfung — frisch kann nur sein, was
         kaufbar ist. -->
    <span v-if="fresh" class="fq-new" :aria-label="FORGE_FRESH_TITLE">{{ FORGE_FRESH_LABEL }}</span>

    <!-- Gesperrt: der Weg zur Freischaltung statt eines Preises, den man
         ohnehin nicht zahlen könnte. -->
    <div v-if="entry.state === 'locked'" class="fq-track">
      <i :style="{ transform: `scaleX(${entry.unlockProgress})` }" />
    </div>

    <span v-else-if="entry.state === 'maxed'" class="fq-badge">✦ MAX</span>

    <template v-else>
      <span class="fq-cost" :class="{ 'fq-cost--short': !entry.goldOk }">
        <img :src="FORGE_CHIME_IMAGE" class="fq-cost-img" alt="Chimes" />
        <span class="fq-cost-num">{{ formatNumber(entry.goldCost) }}</span>
      </span>
      <!-- Fehlendes Material bleibt sichtbar, auch wenn die Kasse reicht: sonst
           steht ein toter ＋-Knopf ohne Begründung daneben. -->
      <span
        v-for="mat in shortMaterials"
        :key="mat.id"
        class="fq-mat"
        :title="`${mat.have} / ${mat.need} ${mat.name}`"
      >
        <img v-if="mat.image" :src="mat.image" class="fq-mat-img" :alt="mat.name" />
        <span class="fq-mat-num">{{ mat.have }}/{{ mat.need }}</span>
      </span>
      <button
        class="fq-buy"
        :disabled="!entry.canBuy"
        :aria-label="`Grow ${entry.name}`"
        :title="entry.canBuy ? `Grow ${entry.name}` : entry.lockReason || 'Not affordable yet'"
        @click="$emit('buy', entry.id)"
      >
        ＋
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Ein Eintrag der Upgrade-Liste als ZEILE.
 *
 * Vorher war jeder Eintrag eine volle Karte mit Icon, Beschreibung,
 * Now-→-After, Kostenblock und Kaufknopf — bei Vollausbau fünfundvierzig davon
 * untereinander. Hier bleibt, was man beim Überfliegen braucht: was es ist, was
 * es bringt, was es kostet, und ein Knopf. Alles Weitere sagt das schwebende
 * Kärtchen, das dem Zeiger folgt (`ForgeRowTooltip`).
 *
 * Die ZEILE selbst tut nichts — gekauft wird über ihren ＋-Knopf. Sie war
 * einmal anklickbar (Klick heftete sie im Detailkopf an); mit der Anheftung ist
 * auch ihre `role="button"` gegangen, denn eine Fläche, die sich als Knopf
 * ankündigt und nichts tut, ist schlechter als gar keine — und eine breite
 * Kauffläche, die man beim Scrollen streift, wäre teuer bezahlt.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { formatNumber } from '@/config/ui/numberFormat'
import type { ForgeUpgradeEntry } from '@/types'
import {
  FORGE_CHIME_IMAGE,
  FORGE_CARD_FLASH_MS,
  FORGE_FRESH_LABEL,
  FORGE_FRESH_TITLE,
} from '@/config/constants'

/* Muster `SigilRoleNode.vue`: die Dauer steht in den Konstanten und wird von
   CSS und dem Timer in `ForgeUpgradesSection` aus derselben Quelle gelesen —
   den KEYFRAME-Namen setzt weiterhin die CSS-Klasse, nie JavaScript. */
const flashDuration = `${FORGE_CARD_FLASH_MS}ms`

const props = defineProps<{
  entry: ForgeUpgradeEntry
  flashed: boolean
  /** Seit dem letzten Blick des Spielers bezahlbar geworden — trägt den azurnen
   *  Rahmen, bis der Zeiger die Zeile einmal berührt hat. */
  fresh: boolean
}>()
defineEmits<{ (e: 'buy', id: string): void }>()

const { spotlightId, setListHover } = useForgeSpotlight()

/**
 * Was die nächste Stufe bringt, in einer Zeile: „+200% → +208%". Gesperrte und
 * ausgewachsene Einträge haben kein Danach — sie zeigen ihren Grund bzw. ihre
 * Wirkung.
 */
const gainLine = computed(() => {
  const e = props.entry
  if (e.state === 'locked') return e.lockReason
  if (e.state === 'maxed') return e.desc
  return `${e.level === 0 ? '—' : e.nowText} → ${e.nextText}`
})

/** Nur die Positionen, die das Lager NICHT deckt — gedeckte sagen nichts. */
const shortMaterials = computed(() => props.entry.materials.filter((mat) => !mat.ok))
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   ZEILE
   Dieselbe Fläche und derselbe Rand wie die Kompaktzeilen der übrigen
   Forge-Abschnitte (.fc-row in rpg-theme.css) — die Liste soll nicht wie ein
   zweites Bauteil aussehen.
══════════════════════════════════════════════════ */
.fq-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    opacity 0.12s ease;
}

.fq-row:hover {
  border-color: #7a4e20;
}

.fq-row--ready {
  border-color: #4a8a28;
}

.fq-row--ready:hover {
  border-color: #6ec040;
}

/* ── NEU SEIT DEM LETZTEN BLICK ──────────────────────────────────
   Azur, und zwar dasselbe Azur wie `ShopReadyBadge`: die Marke am Header, am
   Profil-Reiter und an der Abteilungs-Schiene hat den Spieler hergeführt, der
   Rahmen führt die Spur bis zum Eintrag zu Ende. Grün ist hier schon „kaufbar"
   (.fq-row--ready), Gold auf den Karten dasselbe — beide wären doppelt belegt.

   Steht NACH `--ready`: frisch ist immer auch kaufbar, und die spätere Regel
   gewinnt bei gleicher Spezifität. */
.fq-row--fresh {
  border-color: #60a5fa;
}

.fq-row--locked {
  opacity: 0.72;
}

.fq-row--maxed {
  background: #17170f;
}

/* Hover-Spotlight — dieselbe Bedeutung wie am Knoten im Baum. */
.fq-spot {
  background: #241a10;
  border-color: var(--node-c, #e8c040);
}

.fq-dimmed {
  opacity: 0.42;
}

.fq-ico {
  flex-shrink: 0;
}

.fq-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fq-name {
  font-size: 14.5px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fq-gain {
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.15;
  color: rgba(232, 220, 192, 0.42);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Preis ───────────────────────────────────────────────────── */
.fq-cost {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.fq-cost-img {
  height: 18px;
  width: auto;
  object-fit: contain;
}

.fq-cost-num {
  font-size: 13.5px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.fq-cost--short .fq-cost-num {
  color: #cc6050;
}

.fq-mat {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.fq-mat-img {
  height: 17px;
  width: auto;
  object-fit: contain;
}

.fq-mat-num {
  font-size: 12px;
  font-weight: 900;
  color: #cc6050;
  font-variant-numeric: tabular-nums;
}

/* ── Kaufknopf ───────────────────────────────────────────────── */
.fq-buy {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #6ec040;
  border-radius: 3px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-family: inherit;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  padding: 0;
  cursor: pointer;
}

.fq-buy:disabled {
  border-color: #4a3a1c;
  background: #241a0c;
  color: rgba(232, 216, 176, 0.5);
  cursor: not-allowed;
}

/* ── Freischalt-Fortschritt / MAX ────────────────────────────── */
.fq-track {
  flex: 0 0 84px;
  height: 6px;
  border-radius: 3px;
  background: #241708;
  overflow: hidden;
}

.fq-track i {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8a020);
}

.fq-badge {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(232, 192, 64, 0.12);
  border: 1px solid #5c3310;
  color: #e8c040;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

/* ── „NEW"-Schein und Chip ───────────────────────────────────── */
/* Eigene Ebene mit STATISCHEM Schein, animiert wird allein die Deckkraft
   (Performance-Regel 2/11) — dasselbe Rezept wie `.fc-glow` und `.best-buy-ring`.
   `inset: 0` statt `-1px`, weil die Zeile `overflow: hidden` trägt; der Schein
   liegt deshalb nach INNEN. */
.fq-fresh {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  border: 1px solid #bae6fd;
  box-shadow: inset 0 0 14px rgba(59, 130, 246, 0.45);
  pointer-events: none;
  animation: fq-fresh-breathe 2.2s ease-in-out infinite;
}

@keyframes fq-fresh-breathe {
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
   Ebenen gleichzeitig gegen den Spotlight an. Muster `MeepSkillCard.vue`. */
.fq-spot .fq-fresh {
  animation: none;
  opacity: 1;
}

.fq-dimmed .fq-fresh {
  animation: none;
  opacity: 0.3;
}

.fq-new {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 3px;
  border: 1px solid #bae6fd;
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  color: #fff;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

/* ── Kaufquittung ────────────────────────────────────────────── */
/* Eine eigene Ebene, deren DECKKRAFT animiert wird — kein `filter` und kein
   `box-shadow` im Lauf (Performance-Regel 2). */
.fq-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 245, 220, 0.3);
  opacity: 0;
  pointer-events: none;
}

.fq-flash--on {
  animation: fq-flash v-bind(flashDuration) ease-out;
}

@keyframes fq-flash {
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
  .fq-flash--on {
    animation: none;
  }

  /* Der Rahmen bleibt — nur sein Atmen fällt weg. */
  .fq-fresh {
    animation: none;
    opacity: 1;
  }
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fq-row {
    gap: 9px;
    padding: 8px 11px;
  }
}
</style>
