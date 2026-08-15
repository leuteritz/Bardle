<script setup lang="ts">
/**
 * Ein Eintrag der Skill-Liste.
 *
 * Bewusst grösser als die Zeile der Forge-Liste (`ForgeQueueRow`): dort stehen
 * bei Vollausbau fünfundvierzig Einträge untereinander und jede Zierde kostet
 * fünfundvierzigmal — hier sind es rund zehn offene, weil je Zweig immer nur
 * der nächste Rang aufgeht. Der Knopf trägt deshalb ein Wort statt des `＋`,
 * und Name, Preis und Wirkung stehen in lesbarer Grösse nebeneinander.
 *
 * Die KARTE selbst tut nichts — gelernt wird über ihren Knopf. Eine breite
 * Kauffläche, die man beim Scrollen streift, wäre teuer bezahlt (dieselbe
 * Entscheidung wie an der Forge-Zeile).
 *
 * Was der Zeiger streift, sagt das schwebende Kärtchen daneben
 * (`MeepSkillTooltip`) — es liegt ausserhalb des Flusses und kann die Liste
 * deshalb nicht verschieben.
 */
import { Icon } from '@iconify/vue'
import { useMeepSpotlight } from '@/composables/ui/useMeepSpotlight'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_TREE_BADGE_ICON } from '@/config/progression/meepTree'
import {
  MEEP_SKILL_CARD_ICON_SIZE,
  MEEP_SKILL_FLASH_MS,
  MEEP_SKILL_FORK_ICON,
  MEEP_SKILL_FORK_LABEL,
  MEEP_SKILL_FRESH_LABEL,
  MEEP_SKILL_LEARN_LABEL,
} from '@/config/constants'
import type { MeepSkillBucketId, MeepSkillEntry } from '@/types'

/* Muster `ForgeQueueRow`: die Dauer steht in den Konstanten und wird von CSS
   und dem Timer in `MeepSkillList` aus derselben Quelle gelesen — den
   KEYFRAME-Namen setzt weiterhin die CSS-Klasse, nie JavaScript. */
const flashDuration = `${MEEP_SKILL_FLASH_MS}ms`

const props = defineProps<{
  entry: MeepSkillEntry
  /** Der EINGEFRORENE Topf, nicht der aktuelle — er entscheidet das Aussehen,
   *  damit eine Karte unter dem Zeiger nicht die Farbe wechselt, während sie
   *  an Ort und Stelle stehen bleibt. */
  bucket: MeepSkillBucketId
  flashed: boolean
}>()

const emit = defineEmits<{ buy: [id: string]; select: [id: string] }>()

const { spotlightId, setListHover } = useMeepSpotlight()
const meepTree = useMeepTreeStore()

/**
 * Überfahren heisst angesehen — dieselbe Geste wie am Knoten der Orbit-Bühne
 * (`MeepOrbitStage.onHover`). Ohne sie stünde der pinke Zähler im Header still,
 * während der Spieler die ganze Liste vor sich hat; mit ihr bleibt er genau so
 * richtig wie zuvor.
 */
function onEnter(): void {
  setListHover(props.entry.id)
  meepTree.acknowledgeNode(props.entry.id)
}
</script>

<template>
  <div
    class="msc-card"
    :class="[
      `msc-card--${bucket}`,
      {
        'fc-spot': spotlightId === entry.id,
        'fc-dimmed': spotlightId !== null && spotlightId !== entry.id,
      },
    ]"
    :style="{ '--node-c': entry.color }"
    :data-meep-id="entry.id"
    @mouseenter="onEnter"
  >
    <div class="msc-flash" :class="{ 'msc-flash--on': flashed }" aria-hidden="true" />

    <!-- Frisch aufgegangen atmet auf EIGENER Ebene: der Schein ist statisches
         CSS, animiert wird nur seine Deckkraft (Performance-Regel 2). -->
    <div v-if="bucket === 'fresh'" class="msc-glow" aria-hidden="true" />

    <button class="msc-face" :title="entry.name" @click="emit('select', entry.id)">
      <span class="msc-ico">
        <Icon
          :icon="entry.icon"
          :width="MEEP_SKILL_CARD_ICON_SIZE"
          :height="MEEP_SKILL_CARD_ICON_SIZE"
          :style="{ color: entry.color }"
        />
      </span>

      <span class="msc-text">
        <span class="msc-name-row">
          <span class="msc-name" :style="{ color: entry.color }">{{ entry.name }}</span>
          <span v-if="bucket === 'fresh'" class="msc-tag msc-tag--new">
            {{ MEEP_SKILL_FRESH_LABEL }}
          </span>
          <span v-else-if="entry.rivals.length > 0 && bucket !== 'sealed'" class="msc-tag msc-tag--fork">
            <Icon :icon="MEEP_SKILL_FORK_ICON" width="12" height="12" />
            {{ MEEP_SKILL_FORK_LABEL }}
          </span>
        </span>
        <span class="msc-meta">{{ entry.branchName }} · Rank {{ entry.rank }}</span>
        <span class="msc-effect">{{ entry.effect }}</span>
      </span>
    </button>

    <!-- Rechte Spalte: was hier steht, hängt daran, ob noch etwas zu
         entscheiden ist. Gelernt und versiegelt tragen ein Zeichen statt eines
         Preises, den niemand mehr zahlt. -->
    <div class="msc-side">
      <span v-if="bucket === 'learned'" class="msc-state msc-state--done">✓ Learned</span>
      <span v-else-if="bucket === 'sealed'" class="msc-state msc-state--sealed">⊘ Sealed</span>

      <template v-else>
        <span class="msc-cost" :class="{ 'msc-cost--short': !entry.canAfford }">
          <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="msc-cost-img" />
          <span class="msc-cost-num">{{ entry.cost }}</span>
        </span>
        <button
          class="msc-buy"
          :disabled="!entry.canBuy"
          :title="
            entry.canBuy
              ? `Learn ${entry.name}`
              : bucket === 'locked'
                ? 'Learn the rank below first'
                : `${entry.missing} more meeps needed`
          "
          @click="emit('buy', entry.id)"
        >
          {{ MEEP_SKILL_LEARN_LABEL }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════
   KARTE
   Fläche und Rand im Rezept der geteilten `.fc-card` (rpg-theme.css), nur
   höher: die Zeile trägt hier drei Textzeilen statt zwei, und der Knopf ist
   beschriftet.

   `.fc-spot`/`.fc-dimmed` stehen im Markup, aber die globalen Regeln dazu sind
   als `.fc-card.fc-spot` / `.fc-row.fc-spot` geschrieben und verlangen die
   Trägerklasse mit — diese Karte heisst `.msc-card` und traf keine von beiden.
   Die Kopplung zur Orbit-Bühne war damit in dieser Richtung ohne jede Wirkung.
   Sie steht deshalb unten ausformuliert; die geteilten Regeln bleiben
   unangetastet, sie gehören dem Shop.
══════════════════════════════════════════════════ */
.msc-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    opacity 0.12s ease;
}

.msc-card:hover {
  border-color: #7a4e20;
}

/* Frisch aufgegangen trägt Gold, kaufbar trägt Grün — im Projekt heisst Grün
   durchgehend „kaufbar/aktiv", und Gold ist die Auszeichnung darin. */
.msc-card--fresh {
  border-color: #c89040;
}

.msc-card--ready {
  border-color: #4a8a28;
}

.msc-card--ready:hover {
  border-color: #6ec040;
}

.msc-card--locked {
  opacity: 0.7;
}

.msc-card--learned {
  background: #101a14;
  border-color: #3f6b2c;
}

.msc-card--sealed {
  background: #17150f;
  border-color: #3a2a12;
  opacity: 0.62;
}

/* ── Der Zeiger meint diese Karte ─────────────────────────────
   Gleich, ob er auf ihr steht oder drüben auf ihrem Knoten. Der zweite Fall ist
   der Grund für die LEITKANTE: kommt der Zeiger von der Bühne, ist die Liste
   gerade hierher gerollt, und ein Rahmen allein sagt bei zehn gleich hohen
   Karten zu wenig. Der Streifen trägt die Zweigfarbe des Knotens — dieselbe,
   die drüben sein Ring trägt, und dieselbe, in der Name und Glyph hier schon
   stehen.

   Doppelt geschrieben, mit Absicht: `.msc-card--ready:hover` wiegt eine Stufe
   mehr und färbte den Rahmen sonst grün, sobald der Zeiger wirklich auf der
   Karte steht — auf den Knoten zeigen und auf seine Karte zeigen sind EINE
   Geste und dürfen nicht zwei Farben ergeben. Alles hier ist Zustand; der
   Umschlag trägt die Transition der Karte, kein Dauerläufer. */
.msc-card.fc-spot.fc-spot {
  border-color: var(--node-c, #e8c040);
  background: color-mix(in srgb, var(--node-c, #e8c040) 10%, #241a10);
}

.msc-card.fc-spot::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--node-c, #e8c040);
  pointer-events: none;
}

/* Zurücktreten, solange woandershin gezeigt wird. Klasse je Karte, NICHT als
   geerbte Variable am Listenrahmen (Performance-Regel 3). */
.msc-card.fc-dimmed {
  opacity: 0.42;
}

/* Und der Schein der frischen Karte hört auf zu atmen — sonst wäre der lauteste
   Punkt im Bild genau die Karte, auf die der Spieler gerade NICHT zeigt. */
.msc-card.fc-dimmed .msc-glow {
  animation: none;
  opacity: 0.3;
}

/* Der Schein der frischen Karte — statisches CSS, animiert wird nur `opacity`.
   Rezept `.fc-glow`; hier eigen, weil er die Kartenmasse braucht. */
.msc-glow {
  position: absolute;
  inset: -1px;
  border-radius: 5px;
  border: 1px solid #e8c060;
  box-shadow: 0 0 18px 1px rgba(232, 192, 64, 0.45);
  pointer-events: none;
  animation: msc-breathe 2.2s ease-in-out infinite;
}

@keyframes msc-breathe {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

/* Quittung des Kaufs — eine Transition auf eigener Ebene, kein Dauerläufer. */
.msc-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 245, 220, 0.3);
  opacity: 0;
  pointer-events: none;
}

.msc-flash--on {
  animation: msc-flash v-bind(flashDuration) ease-out;
}

@keyframes msc-flash {
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

/* ── Die linke Hälfte: ein Knopf, weil sie auswählt ──────────
   Ein Klick hebt den Knoten auf der Orbit-Bühne hervor; gekauft wird rechts.
   Deshalb ein echter `<button>` und keine Fläche mit `role` — sie tut wirklich
   etwas. */
.msc-face {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.msc-ico {
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

.msc-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.msc-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.msc-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msc-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.07em;
  line-height: 1.3;
}

.msc-tag--new {
  color: #e8c040;
  background: rgba(232, 192, 64, 0.14);
  border: 1px solid rgba(232, 192, 64, 0.42);
}

/* Dasselbe Lila wie der Gabelsatz im Kärtchen und die Buff-Chips im Shop. */
.msc-tag--fork {
  color: #c9a8e8;
  background: rgba(90, 58, 122, 0.22);
  border: 1px solid #5a3a7a;
}

.msc-meta {
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.42);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msc-effect {
  font-size: 13.5px;
  font-weight: 800;
  line-height: 1.25;
  color: rgba(232, 220, 192, 0.82);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Die rechte Hälfte: Preis und Entscheidung ─────────────── */
.msc-side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 7px;
}

.msc-cost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.msc-cost-img {
  height: 20px;
  width: auto;
  object-fit: contain;
}

.msc-cost-num {
  font-size: 15px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.msc-cost--short .msc-cost-num {
  color: #cc6050;
}

/* Gesperrt wird flach und heller beschriftet statt gedimmt — ein ausgegrauter
   Grünverlauf trägt seine fast schwarze Schrift nicht mehr. Rezept `.fc-act`. */
.msc-buy {
  min-width: 74px;
  padding: 7px 13px;
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

.msc-buy:hover:not(:disabled) {
  filter: brightness(1.12);
}

.msc-buy:disabled {
  border-color: #4a3a1c;
  background: #241a0c;
  color: rgba(232, 216, 176, 0.55);
  cursor: not-allowed;
}

.msc-state {
  padding: 6px 11px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.msc-state--done {
  color: rgba(160, 255, 160, 0.8);
  background: rgba(82, 184, 48, 0.12);
  border: 1px solid rgba(82, 184, 48, 0.45);
}

.msc-state--sealed {
  color: rgba(232, 220, 192, 0.45);
  background: #1a1610;
  border: 1px solid #3a2a12;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .msc-card {
    gap: 10px;
    padding: 10px 12px;
  }

  .msc-face {
    gap: 10px;
  }

  .msc-ico {
    width: 42px;
    height: 42px;
  }

  .msc-name {
    font-size: 15px;
  }

  .msc-effect {
    font-size: 13px;
  }

  .msc-buy {
    padding: 6px 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .msc-glow {
    animation: none;
    opacity: 0.8;
  }

  .msc-flash--on {
    animation: none;
  }
}
</style>
