<template>
  <nav class="fr-rail" role="tablist" aria-label="Star Forge sections">
    <button
      v-for="sec in tabs"
      :key="sec.id"
      class="fr-cell"
      :class="{ 'fr-cell--on': active === sec.id }"
      :style="{ '--tab-c': sec.accent }"
      role="tab"
      :title="sec.label"
      :aria-selected="active === sec.id"
      @click="$emit('select', sec.id)"
    >
      <span class="fr-ico-wrap">
        <Icon
          :icon="sec.icon"
          :width="FORGE_RAIL_ICON_SIZE"
          :height="FORGE_RAIL_ICON_SIZE"
          class="fr-ico"
        />
        <ShopReadyBadge
          :count="readyCounts[sec.id]"
          :flare="flares[sec.id].value"
          :label="readyLabel(sec.label, readyCounts[sec.id])"
        />
      </span>
      <span class="fr-label">{{ sec.wrapLabel ?? sec.label }}</span>
    </button>

    <span class="fr-gap" />

    <!-- ══ Der Handel als Fußkachel ══════════════════════════════════
         Er ist der einzige Abschnitt mit einer laufenden Uhr, und die soll man
         sehen, ohne ihn zu öffnen. Als gleichrangiger vierter Reiter oben wäre
         die Zeit hinter einem Klick verschwunden. -->
    <button
      class="fr-deal"
      :class="{ 'fr-deal--on': active === bargainSection.id }"
      role="tab"
      :title="bargainSection.label"
      :aria-selected="active === bargainSection.id"
      @click="$emit('select', bargainSection.id)"
    >
      <!-- Das Laufband bringt seine eigene Maske mit: läge das `overflow` an der
           Kachel, schnitte sie den Schein der Marke daneben ab. -->
      <span class="fr-shine-mask" aria-hidden="true">
        <span class="fr-shine" />
      </span>
      <span class="fr-ico-wrap">
        <Icon
          :icon="bargainSection.icon"
          width="25"
          height="25"
          class="fr-ico fr-ico--deal"
        />
        <ShopReadyBadge
          :count="readyCounts.bargain"
          :flare="flares.bargain.value"
          :label="readyLabel(bargainSection.label, readyCounts.bargain)"
        />
      </span>
      <span class="fr-clock">{{ formatCompactDuration(forgeStore.bargainRestockRemainingMs) }}</span>
      <span class="fr-deal-label">{{ FORGE_RAIL_BARGAIN_LABEL }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
/**
 * Die vier Abteilungen der Forge, senkrecht.
 *
 * Vorher standen sie als waagerechte Reiterleiste ÜBER der Spalte: volle Breite
 * mal rund 46px Höhe, auf dem flachsten Viewport (Full HD) der teuerste Platz
 * im ganzen Tab, und „Constellations" passte bei vier Zellen à 117px trotzdem
 * nicht (zwei Container-Queries nur dafür). Senkrecht kosten sie 78px BREITE —
 * und Breite ist in diesem Layout billig, seit der Baum die freie Fläche füllt.
 */
import { computed, type Ref } from 'vue'
import { Icon } from '@iconify/vue'
import ShopReadyBadge from '@/components/ui/ShopReadyBadge.vue'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useBadgeFlare } from '@/composables/ui/useBadgeFlare'
import { formatCompactDuration } from '@/utils/ui/format'
import type { ForgeSectionId } from '@/types'
import {
  FORGE_PANEL_SECTIONS,
  FORGE_RAIL_ICON_SIZE,
  FORGE_RAIL_BARGAIN_LABEL,
} from '@/config/constants'

defineProps<{ active: ForgeSectionId }>()
/* `select` und nicht `update:active`: der Icon-Wächter
   (`__tests__/config/icons.spec.ts`) liest jede Zeichenkette der Form
   `prefix:name` als Iconify-Namen, und ein v-model-Ereignis sähe für ihn aus
   wie ein Icon aus einem unbekannten Set. */
defineEmits<{ (e: 'select', id: ForgeSectionId): void }>()

const forgeStore = useStarForgeStore()

const BARGAIN_ID: ForgeSectionId = 'bargain'

const tabs = computed(() => FORGE_PANEL_SECTIONS.filter((sec) => sec.id !== BARGAIN_ID))
const bargainSection = computed(
  () => FORGE_PANEL_SECTIONS.find((sec) => sec.id === BARGAIN_ID) ?? FORGE_PANEL_SECTIONS[0],
)

/**
 * Nur, was JETZT getan werden kann — eine geschlossene Abteilung sagt damit
 * trotzdem „hier wartet etwas".
 *
 * Die Rechnung stand einmal hier und liegt jetzt als `shopReadyCounts` im
 * `starForgeStore`: dieselben vier Zahlen tragen inzwischen auch die Abzeichen
 * an der Shop-Ecktaste und am Shop-Tab. Ein Store-Getter rechnet für alle drei
 * Leser genau einmal je Änderung, drei lokale `computed` täten es dreimal.
 *
 * Gezeigt wird die Zahl in DERSELBEN Marke wie dort (`ShopReadyBadge`) — der
 * Spieler folgt dem azurnen Abzeichen vom Header bis in diese Schiene.
 */
const readyCounts = computed<Record<ForgeSectionId, number>>(() => forgeStore.shopReadyCounts)

/**
 * Ein Aufblitzen je Abteilung: die Marke meldet sich, wenn IHRE Zahl steigt —
 * nicht, wenn irgendwo im Shop etwas erschwinglich wird.
 *
 * Ein Aufruf je Abteilung über die STATISCHE Liste: Zahl und Reihenfolge der
 * Composable-Aufrufe liegen damit fest, wie es sich gehört. Die Refs bleiben
 * Refs (kein `reactive`-Umweg, der beim Entpacken seinen Typ verliert) — im
 * Template steht deshalb `.value`.
 */
const flares = Object.fromEntries(
  FORGE_PANEL_SECTIONS.map((sec) => [
    sec.id,
    useBadgeFlare(() => forgeStore.shopReadyCounts[sec.id]),
  ]),
) as Record<ForgeSectionId, Ref<boolean>>

const readyLabel = (label: string, count: number) =>
  `${count} ${label} ${count === 1 ? 'purchase is' : 'purchases are'} affordable`
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   RAIL
══════════════════════════════════════════════════ */
.fr-rail {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #16120a;
  border-left: 2px solid #3e200a;
}

.fr-gap {
  flex: 1;
  min-height: 0;
}

/* ══════════════════════════════════════════════════
   ABTEILUNGS-ZELLE
══════════════════════════════════════════════════ */
.fr-cell {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  /* Waagerecht knapp bemessen: die Zelle ist 78px breit, und die längste
     Silbe von „Constellations" braucht davon fast alles. Mit 6px Polsterung
     lief die Spalte gemessen um 4px über. */
  padding: 15px 4px;
  border: 0;
  border-bottom: 1px solid #2a1a08;
  background: transparent;
  color: rgba(200, 144, 64, 0.6);
  font-family: inherit;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}

.fr-cell:hover:not(.fr-cell--on) {
  background: #1c1408;
  color: rgba(232, 192, 64, 0.85);
}

/* Der aktive Strich sitzt an der INNEN liegenden Kante — er zeigt zur Spalte,
   deren Inhalt er bestimmt. */
.fr-cell--on {
  background: #1e1408;
  color: var(--tab-c, #e8c040);
  box-shadow: inset 3px 0 0 var(--tab-c, #e8c040);
}

.fr-ico-wrap {
  position: relative;
  display: flex;
  /* Sitz und Maß der azurnen Marke (`ShopReadyBadge`).

     Rechts -8px und nicht mehr: die klippende Kante ist `.shop-frame`
     (`overflow: hidden`) und fällt mit der Außenkante der Schiene zusammen.
     Gemessen bleiben der Marke dort 16,5px auf Full HD — genug für sie selbst,
     der äußerste Rand ihres 20px-Scheins wird um 3,5px beschnitten. Der ist beim
     Aufblitzen ohnehin fast durchsichtig; bei -10px wären es 5,5px, und weiter
     nach innen liefe die Marke auf das 27px-Glyph. */
  --sbadge-d: 18px;
  --sbadge-top: -7px;
  --sbadge-right: -8px;
}

.fr-ico {
  color: currentColor;
}

.fr-label {
  max-width: 100%;
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.2;
  color: currentColor;
  /* „Constellations" passt in keine 78px-Zelle. Getrennt wird an der Stelle,
     die `wrapLabel` markiert (weiches Trennzeichen) — Chrome wendet die
     automatische Silbentrennung hier NICHT an und brach gemessen mitten im
     Wort als „CONSTELLATIO / NS". `break-word` bleibt als Netz für ein
     künftiges Label ohne markierte Trennstelle. */
  hyphens: manual;
  overflow-wrap: break-word;
}

/* ══════════════════════════════════════════════════
   HANDEL — Fußkachel mit laufender Uhr
══════════════════════════════════════════════════ */
.fr-deal {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 13px 6px 15px;
  border: 0;
  border-top: 1px solid #2a1a08;
  background: linear-gradient(160deg, #1c130a, #241608);
  color: #e8c040;
  font-family: inherit;
  cursor: pointer;
  /* Sichtbar, damit die Marke samt Schein über die Kachelkante ragen darf. Das
     Laufband bringt seine eigene Maske mit. */
  overflow: visible;
  transition: box-shadow 0.18s ease;
}

.fr-deal--on {
  box-shadow: inset 3px 0 0 #e8c040;
}

.fr-shine-mask {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Ein wanderndes Band, keine animierte `background-position` — der Lauf bleibt
   Compositor-Arbeit (dieselbe Mechanik wie `.bg-shine` auf der Handelskarte). */
.fr-shine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -45%;
  width: 45%;
  background: linear-gradient(105deg, transparent, rgba(255, 225, 150, 0.16), transparent);
  pointer-events: none;
  animation: fr-sweep 5s ease-in-out infinite;
}

@keyframes fr-sweep {
  0% {
    transform: translateX(0);
  }
  60%,
  100% {
    transform: translateX(340%);
  }
}

.fr-ico--deal {
  color: #e8c040;
}

.fr-clock {
  position: relative;
  font-size: 11.5px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.fr-deal-label {
  position: relative;
  font-size: 9.5px;
  font-weight: 700;
  text-align: center;
  line-height: 1.15;
  color: rgba(200, 144, 64, 0.55);
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fr-cell {
    gap: 6px;
    padding: 11px 5px;
  }

  .fr-deal {
    gap: 5px;
    padding: 10px 5px 12px;
  }
}

/* Gestapeltes Layout (unter jeder Desktop-Referenz): die Rail wird zur Leiste. */
@media (max-width: 900px) {
  .fr-rail {
    flex-direction: row;
    height: auto;
    border-left: 0;
    border-top: 2px solid #3e200a;
  }

  .fr-cell,
  .fr-deal {
    flex: 1 1 0;
    border-bottom: 0;
    border-top: 0;
  }

  .fr-cell--on,
  .fr-deal--on {
    box-shadow: inset 0 3px 0 var(--tab-c, #e8c040);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fr-shine {
    animation: none;
  }
}
</style>
