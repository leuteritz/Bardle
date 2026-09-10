<template>
  <!-- Kein Knopf, solange es nichts zu holen gibt — und kein abgeschalteter
       an seiner Stelle: 58px, die nichts anbieten, sind der teuerste Platz der
       Spalte für die geringste Auskunft. Die Bedingung ist DIESELBE, an der der
       `READY TO GROW`-Trenner in der Liste darunter hängt (`plan.count === 0`
       gilt genau dann, wenn kein Eintrag `canBuy` ist, siehe
       `forgeUpgrades.spec.ts`) — die Leiste kommt und geht also im selben Frame
       wie ein Listenblock, der ohnehin auf- und zuklappt.

       Der Streifen liegt AUSSERHALB des Scrollfelds und ist deshalb kein
       `position: sticky`: eine klebende Leiste im Scrollfeld braucht einen
       deckenden Grund über durchlaufendem Inhalt und verschiebt beim ersten
       Rollen alles um ihre eigene Höhe. Als eigenes Kind der Spalte steht sie
       einfach — und `.sf-body` daneben behält sein `flex: 1`. -->
  <div v-if="plan.count > 0" class="fba-shell">
    <button
      class="fba"
      :class="{ 'fba--flash': flashing }"
      :aria-label="FORGE_BUY_ALL_LABEL"
      :title="title"
      @mouseenter="freeze"
      @mouseleave="thaw"
      @click="handleClick"
    >
      <!-- Rein visuelle Quittung. Nur `opacity` — Performance-Regel 2; der
           Wortlaut der eigentlichen Meldung liegt im Herold. -->
      <span class="fba-flash" aria-hidden="true" />
      <span class="fba-aura" aria-hidden="true" />
      <span class="fba-sweep" aria-hidden="true" />

      <Icon
        :icon="FORGE_BUY_ALL_ICON"
        :width="FORGE_BUY_ALL_ICON_SIZE"
        :height="FORGE_BUY_ALL_ICON_SIZE"
        class="fba-glyph"
      />
      <span class="fba-label">
        <span class="fba-word fba-word--buy">{{ buyAllWords[0] }}</span>
        <span class="fba-word fba-word--all">{{ buyAllWords[1] }}</span>
      </span>
      <span class="fba-count">{{ plan.count }}</span>
      <span class="fba-cost">
        <img :src="FORGE_CHIME_IMAGE" class="fba-cost-img" alt="Chimes" />
        <span class="fba-cost-num">{{ formatNumber(plan.chimeCost) }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * Der Sammelkauf der Forge-Spalte — ALLES, was Vorrat und Lager gerade decken.
 *
 * Die Zahl in der Pille zählt seit dem Umbau STUFEN, nicht Einträge: ein Knoten
 * kann ein Dutzend davon auf sich vereinen. Der Klick räumt ab, bis nichts mehr
 * kaufbar ist — und weil die Leiste an genau dieser Frage hängt, verschwindet
 * sie danach von selbst, statt zum nächsten Klick einzuladen.
 *
 * Er sass bis zum Umbau in einer Kopfleiste ÜBER DEM BAUM, zusammen mit einem
 * Suchfeld und acht Ring-Filterchips. Beide sind gestrichen (Herleitung an
 * `FORGE_BUY_ALL_LABEL` in `constants/forge.ts`); was bleibt, ist die eine
 * Handlung — und die steht jetzt dort, wo das Kaufbare steht: am Kopf der
 * Spalte, deren Liste jede einzelne Zeile mit eigenem Kaufknopf zeigt.
 *
 * Was die Leiste gegenüber dem alten Knopf KANN: sie nennt den Preis, bevor
 * geklickt wird. `buyAllPlan` rechnet den Lauf durch, ohne zu kaufen — dieselbe
 * Simulation (`planBuyAll`), aus der `buyAllReady()` gleich seine Kaufliste
 * baut. Die beiden können damit nicht auseinanderlaufen; der Plan zeigt den
 * ERSTEN Durchlauf und ist damit eine Untergrenze (Herleitung dort).
 *
 * Kaufweg, Quittung und Verdichtung liegen vollständig woanders
 * (`useForgeUpgrades` / `useForgeHerald`) — hier steht nur, wie aus einer Zahl
 * ein Knopf wird.
 */
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { useForgeUpgrades, type ForgeBuyAllPlan } from '@/composables/ui/useForgeUpgrades'
import {
  FORGE_BUY_ALL_ICON,
  FORGE_BUY_ALL_ICON_SIZE,
  FORGE_BUY_ALL_LABEL,
  FORGE_BUY_ALL_TITLE,
  FORGE_BUY_ALL_COST_TOKEN,
  FORGE_COUNT_TOKEN,
  FORGE_CHIME_IMAGE,
  FORGE_CARD_FLASH_MS,
} from '@/config/constants'

const { buyAllPlan, buyAllReady } = useForgeUpgrades()

const buyAllWords = computed(() => FORGE_BUY_ALL_LABEL.split(' '))

/**
 * Die angezeigte Zahl steht still, solange der Zeiger auf dem Knopf liegt.
 *
 * Derselbe Grund wie bei `frozenBulk` in `ForgeUpgradesSection`: Anzahl und
 * Preis hängen an den Chimes und ändern sich damit im Sekundentakt — und zwar
 * genau, während man auf den Knopf zielt. Der Spieler klickt auf das, was er
 * gesehen hat; `buyAllReady()` prüft ohnehin jeden Eintrag einzeln neu und kann
 * damit nie mehr ausgeben, als da ist.
 */
const frozenPlan = ref<ForgeBuyAllPlan | null>(null)

const plan = computed<ForgeBuyAllPlan>(() => frozenPlan.value ?? buyAllPlan.value)

/**
 * EIN Frost überlebt niemals einen leeren Plan — die Invariante der ganzen
 * Leiste, und sie steht deshalb hier an einer Stelle statt als Bedingung an
 * jedem Schreiber.
 *
 * Der Grund ist `mouseleave`: es feuert NICHT, wenn ein Element unter dem Zeiger
 * aus dem DOM genommen wird. Genau das passiert, sobald ein Sammelkauf alles
 * abräumt — der Knopf verschwindet unter der Maus, `thaw()` läuft nie, und ein
 * eingefrorenes `{ count: 0 }` bliebe stehen. Kämen später wieder Chimes herein,
 * läse `plan` weiter die alte Null: die Liste zeigte ihren `READY TO GROW`-Block,
 * die Leiste darüber bliebe weg. Gemessen aufgetreten, nicht befürchtet.
 *
 * `flush: 'pre'` (die Vorgabe) räumt den Frost ab, BEVOR die Komponente neu
 * zeichnet — es gibt also keinen Frame mit der alten Zahl.
 */
watch(buyAllPlan, (fresh) => {
  if (fresh.count === 0) frozenPlan.value = null
})

function freeze(): void {
  frozenPlan.value = buyAllPlan.value
}

function thaw(): void {
  frozenPlan.value = null
}

const title = computed(() =>
  FORGE_BUY_ALL_TITLE.replace(FORGE_COUNT_TOKEN, String(plan.value.count)).replace(
    FORGE_BUY_ALL_COST_TOKEN,
    formatNumber(plan.value.chimeCost),
  ),
)

// ── Quittung im Knopf ────────────────────────────────────────────────────────
/** Rein visuell, daher reale Zeit. */
const flashing = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

function handleClick(): void {
  if (buyAllReady() === 0) return

  /* Neu einfrieren statt auftauen: der Zeiger liegt nach dem Klick noch auf dem
     Knopf, und der eingefrorene Stand ist jetzt der von VOR dem Kauf. Ohne das
     zeigte die Leiste eine Anzahl an, die sie eben verbraucht hat. Räumt der Kauf
     alles ab, nimmt der Wächter oben diesen Frost sofort wieder weg. */
  frozenPlan.value = buyAllPlan.value

  flashing.value = true
  if (flashTimer !== null) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashing.value = false
  }, FORGE_CARD_FLASH_MS)
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   STREIFEN
   Derselbe getönte Grund und derselbe 2px-Saum wie jeder Kopfstreifen im
   Projekt. Der Innenabstand ist der von `.sf-body` darunter — der Knopf steht
   damit auf einer Kante mit den Zeilen, die er sammelt.
══════════════════════════════════════════════════ */
.fba-shell {
  flex-shrink: 0;
  padding: 12px 18px 8px;
}

/* ══════════════════════════════════════════════════
   KNOPF
   Das geteilte `.fc-act`-Rezept (rpg-theme.css) — Grünverlauf, heller Rand,
   fast schwarze Schrift. Eigene Klasse statt der geteilten Regel, weil dieser
   Knopf als EINZIGER eine Zählpille und einen Preisblock trägt; die Farben sind
   die Kopie, die Herleitung steht dort.
══════════════════════════════════════════════════ */
.fba {
  position: relative;
  overflow: hidden;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  padding: 11px 14px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  isolation: isolate;
  transition:
    filter 0.15s ease,
    transform 0.15s ease;
}

/* Kein `:not(:disabled)` mehr an Hover und Druckpunkt: der Knopf ist nur da,
   wenn er auch geht. */
.fba:hover {
  filter: brightness(1.12);
}

.fba:active {
  transform: translateY(1px);
}

.fba:focus-visible {
  outline: none;
  border-color: #e8c060;
}

.fba-glyph {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  color: currentColor;
}

/* Der Wortlaut nimmt den Restplatz und schiebt Pille und Preis an die rechte
   Kante — dieselbe Leserichtung wie in der Zeile darunter: erst was passiert,
   dann was es kostet. */
.fba-label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: baseline;
  gap: 0.28em;
  flex: 1;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fba-word {
  display: inline-block;
  will-change: transform, opacity;
}

.fba-word--buy {
  color: #08130a;
  font-style: italic;
  animation: fba-word-buy 3.8s ease-in-out infinite;
}

.fba-word--all {
  color: #e8c040;
  font-size: 1.12em;
  font-style: italic;
  letter-spacing: 0.08em;
  animation: fba-word-all 3.8s 0.16s ease-in-out infinite;
}

@keyframes fba-word-buy {
  0%,
  70%,
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }

  77% {
    opacity: 0.94;
    transform: translateY(-2px) rotate(-2deg);
  }

  84% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
}

@keyframes fba-word-all {
  0%,
  70%,
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }

  77% {
    opacity: 0.94;
    transform: translateY(-3px) rotate(2deg);
  }

  84% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
}

/* Die ANZAHL ist die Information, der Blitz trägt nur die Bedeutung — sie
   bekommt deshalb einen eigenen Träger statt bloss eines Punktes im Satz. */
.fba-count {
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.3);
  color: #eaffd8;
  font-size: 14px;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.fba-cost {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.fba-cost-img {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.fba-cost-num {
  font-size: 13.5px;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.fba-aura,
.fba-sweep {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  will-change: transform, opacity;
}

.fba-aura {
  inset: 2px;
  border: 2px solid #e8c040;
  opacity: 0;
  transform: scale(0.94);
  animation: fba-aura 3.8s ease-out infinite;
}

.fba-sweep {
  top: -30%;
  bottom: -30%;
  left: -18%;
  width: 12%;
  background: #e8c040;
  opacity: 0;
  transform: translateX(-220%) skewX(-18deg);
  animation: fba-sweep 3.8s ease-in-out infinite;
}

@keyframes fba-aura {
  0%,
  54%,
  100% {
    opacity: 0;
    transform: scale(0.94);
  }

  62% {
    opacity: 0.58;
    transform: scale(0.99);
  }

  78% {
    opacity: 0;
    transform: scale(1.04);
  }
}

@keyframes fba-sweep {
  0%,
  14%,
  100% {
    opacity: 0;
    transform: translateX(-220%) skewX(-18deg);
  }

  20% {
    opacity: 0.34;
  }

  42% {
    opacity: 0.08;
    transform: translateX(1040%) skewX(-18deg);
  }

  48% {
    opacity: 0;
    transform: translateX(1040%) skewX(-18deg);
  }
}

/* ── Kaufquittung ───────────────────────────────────────────────────────────── */
.fba-flash {
  position: absolute;
  inset: 0;
  background: #eaffd8;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}

.fba--flash .fba-flash {
  opacity: 0.45;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fba-shell {
    padding: 9px 15px 6px;
  }

  .fba {
    gap: 8px;
    min-height: 46px;
    padding: 9px 12px;
    font-size: 13px;
  }

  .fba-count {
    font-size: 13px;
    padding: 2px 8px;
  }

  .fba-cost-num {
    font-size: 12.5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fba-aura,
  .fba-sweep,
  .fba-word--buy,
  .fba-word--all {
    animation: none;
    transform: none;
  }

  .fba-aura,
  .fba-sweep {
    opacity: 0;
  }
}
</style>
