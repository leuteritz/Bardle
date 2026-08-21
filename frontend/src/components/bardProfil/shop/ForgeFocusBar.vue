<template>
  <!-- Die Farbe kommt INLINE ans Element, nicht als CSS-Variable an den
       Container (Performance-Regel 3). Ohne Auswahl bleibt sie `undefined`, und
       die Klasse darunter behält ihr Braun — eine Kante, die kommt und geht,
       wäre eine Bewegung mehr. -->
  <div class="ffb" :style="{ borderLeftColor: meta?.color }">
    <!-- ══ EINE AUSWAHL STEHT ══════════════════════════════════
         Ohne Auswahl bleibt die Leiste LEER — ihre Höhe ist trotzdem
         reserviert, sonst schöbe der erste Klick die Liste unter dem Zeiger
         weg (Herleitung an `FORGE_FOCUS_BAR_HEIGHT_PX`).

         Steht eine, dann mit denselben vier Angaben, an denen man die Zeile
         drüben und den Kreis im Baum wiedererkennt: Glyph, Farbe, Name, Stufe. Kein Preis und kein
         Kaufknopf — die Zeile darunter hat beides, und die wichtigste Handlung
         zweimal anzubieten macht keine von beiden schneller. -->
    <template v-if="meta !== null">
      <Icon
        :icon="meta.icon"
        :width="FORGE_FOCUS_ICON_PX"
        :height="FORGE_FOCUS_ICON_PX"
        class="ffb-ico"
        :style="{ color: meta.color }"
      />

      <span class="ffb-text">
        <span class="ffb-name" :style="{ color: meta.color }">{{ meta.name }}</span>
        <span class="ffb-tier">{{ meta.tierLabel }}</span>
      </span>

      <span class="ffb-lvl">
        {{ levelParts.big }}<span class="ffb-lvl-max">{{ levelParts.max }}</span>
      </span>

      <!-- Zurück ins Bild. Der Rand-Kompass im Baum stellt dieselbe Frage und
           kann sie nur ZEIGEN; dieser Knopf beantwortet sie. -->
      <button
        class="ffb-act"
        :title="FORGE_FOCUS_RECENTER_TITLE"
        :aria-label="FORGE_FOCUS_RECENTER_TITLE"
        @click="refocus"
      >
        <Icon :icon="FORGE_FOCUS_RECENTER_ICON" width="17" height="17" />
      </button>

      <!-- Das dritte Lösemittel neben Escape und einem Klick auf die leere
           Bühne — und das einzige, das man sieht. -->
      <button
        class="ffb-act ffb-act--clear"
        :title="FORGE_FOCUS_CLEAR_TITLE"
        :aria-label="FORGE_FOCUS_CLEAR_TITLE"
        @click="clearPin"
      >
        <Icon :icon="FORGE_FOCUS_CLEAR_ICON" width="17" height="17" />
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Was gerade festgehalten ist — der Kopf der Detailspalte.
 *
 * Sie ist mit dem Fokus entstanden. Ein Klick im Baum oder auf einer Zeile hält
 * ein Upgrade fest, und der Fokus BLEIBT stehen, bis ihn jemand ausdrücklich
 * löst. Damit stellt sich eine Frage, die es vorher nicht gab: Was ist gewählt,
 * wenn die zugehörige Zeile längst weggerollt ist und der Kreis im Baum
 * ausserhalb des Ausschnitts steht? Vorher beantwortete das niemand — die
 * Auswahl war nur an zwei Stellen zu sehen, und beide konnte man verlassen.
 *
 * Sie steht IMMER da, auch ohne Auswahl (Herleitung an
 * `FORGE_FOCUS_BAR_HEIGHT_PX`): eine Leiste, die mit dem Fokus erschiene,
 * schöbe bei jedem Klick die Liste um ihre Höhe — also genau die Zeile, die der
 * Spieler eben getroffen hat, unter seinem Zeiger weg.
 *
 * Ihre Daten kommen NICHT aus `useForgeUpgrades()`, sondern aus
 * `forgeFocusMeta()` — zwei Nachschläge in O(1) statt einer fünften Fabrik über
 * hundertfünfundfünfzig Einträge, die jede Sekunde neu rechnet. Die Herleitung
 * steht an der Funktion.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { forgeFocusMeta, forgeLevelParts } from '@/composables/ui/useForgeUpgrades'
import {
  FORGE_FOCUS_CLEAR_ICON,
  FORGE_FOCUS_CLEAR_TITLE,
  FORGE_FOCUS_ICON_PX,
  FORGE_FOCUS_RECENTER_ICON,
  FORGE_FOCUS_RECENTER_TITLE,
  FORGE_FOCUS_BAR_HEIGHT_PX,
  FORGE_FOCUS_BAR_HEIGHT_COMPACT_PX,
} from '@/config/constants'

const { pinnedId, refocus, clearPin } = useForgeSpotlight()

const barHeight = `${FORGE_FOCUS_BAR_HEIGHT_PX}px`
const barHeightCompact = `${FORGE_FOCUS_BAR_HEIGHT_COMPACT_PX}px`

const meta = computed(() => forgeFocusMeta(pinnedId.value))

/** Dieselbe Zerlegung wie in der Zeile drüben — `Lv 3` gross, `/ 6` klein. */
const levelParts = computed(() =>
  meta.value === null
    ? { big: '', max: '' }
    : forgeLevelParts(meta.value.level, meta.value.maxLevel),
)
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   DIE LEISTE
   Feste Höhe, flacher Grund: sie hängt unter der Sammelkauf-Leiste und über dem
   Rollfeld und liest sich als deren Fortsetzung, nicht als drittes Bauteil.
══════════════════════════════════════════════════ */
.ffb {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  height: v-bind(barHeight);
  padding: 0 14px 0 11px;
  background: #16140e;
  border-bottom: 1px solid #2a1a08;
  border-left: 3px solid #3a2a10;
  transition: border-left-color 0.12s ease;
}

/* ══════════════════════════════════════════════════
   GEWÄHLT
══════════════════════════════════════════════════ */
.ffb-ico {
  flex-shrink: 0;
}

/* Zwei Zeilen im Platz, den der Name allein bräuchte: der Rang darunter ordnet
   den Knoten im Baum ein, und er ist kurz. */
.ffb-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ffb-name {
  min-width: 0;
  font-size: 13.5px;
  font-weight: 900;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ffb-tier {
  min-width: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.1;
  text-transform: uppercase;
  color: #8a7550;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ffb-lvl {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.ffb-lvl-max {
  font-size: 11px;
  font-weight: 800;
  color: rgba(232, 192, 64, 0.45);
}

/* ══════════════════════════════════════════════════
   DIE BEIDEN KNÖPFE
   Quadratisch und flach: sie sind Bedienung, keine Handlung mit Folgen — der
   grüne Kaufknopf steht eine Zeile tiefer und darf hier keine Konkurrenz
   bekommen.
══════════════════════════════════════════════════ */
.ffb-act {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #3a2a10;
  border-radius: 4px;
  background: #1c1c18;
  color: #c89040;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    color 0.12s ease;
}

.ffb-act:hover {
  border-color: #7a4e20;
  background: #241a10;
  color: #e8c040;
}

.ffb-act--clear:hover {
  border-color: #a04838;
  color: #cc6050;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .ffb {
    height: v-bind(barHeightCompact);
    gap: 8px;
  }

  .ffb-name {
    font-size: 12.5px;
  }

  .ffb-lvl {
    font-size: 14px;
  }

  .ffb-act {
    width: 26px;
    height: 26px;
  }
}
</style>
