<script setup lang="ts">
/**
 * Eine Karte im Pause-Overlay: der Champion.
 *
 * Sie steht IMMER an derselben Stelle — als erste Karte der Reihe, ganz oben
 * links. Vorher war der Fund eine volle Bannerzeile über den Karten, also eine
 * eigene Form an einer eigenen Stelle; und sobald der Stern wirklich spawnte,
 * verschwand sie ersatzlos, während seine 60-Sekunden-Uhr weiterlief. Beides
 * fasst diese Karte zusammen.
 *
 * ZWEI Zustände, EINE Karte:
 *
 *   • `awaited` — der Champion ist gefunden, sein Stern steht noch nicht am
 *     Himmel (bei ruhendem Idle-Layer wird er vorgemerkt und erscheint erst mit
 *     der Rückkehr). Es gibt nichts zu zählen, also trägt das Zifferblatt-Feld
 *     das Wappen der GEWÄHLTEN ROLLE statt eines Bogens: welcher Champion es
 *     wird, steht erst beim Spawn fest.
 *   • `active` — der Stern läuft. Dann zählt der Bogen seine Frist ab, das
 *     Bildnis zeigt den echten Champion und darunter steht, wie weit sein
 *     Planet heruntergekämpft ist.
 *
 * Bauplan und Maße kommen von den Nachbarn: Zifferblatt links, Körper rechts,
 * Bildnis hinter dem Text (`PauseVoidCard`), abbrennender Bogen und
 * Alarmumschlag (`PauseStarCard`). Der Bogen LEERT sich wie beim Stern — hier
 * verstreicht eine Gelegenheit, keine Gefahr rückt heran.
 *
 * Was sie darüber hinaus trägt, ist absichtlich sparsam: eine Goldlinie an der
 * Oberkante und ein Lichtstreifen, der einmal je Runde durchläuft. Beides
 * bewegt ausschließlich `transform`/`opacity`, und beides gibt es in der Reihe
 * nur EINMAL — daran ist sie als die wichtigste Karte zu erkennen.
 */
import { computed, ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { hpStageClass } from '@/utils/ui/format'
import {
  PAUSE_CHAMPION_CARD_WIDTH,
  PAUSE_CHAMPION_CREST_PX,
  PAUSE_CHAMPION_PIPS_MAX,
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_CARD_PAD_X,
  PAUSE_STAR_DIAL_PX,
  PAUSE_STAR_DIAL_GAP_PX,
  PAUSE_STAR_RING_RADIUS,
  PAUSE_STAR_RING_STROKE,
  PAUSE_STAR_RING_CIRCUMFERENCE,
  PAUSE_STAR_URGENT_SECS,
} from '@/config/constants'
import type { PauseChampionCallout } from '@/types'
import { gameNow } from '@/utils/game/gameClock'

const props = defineProps<{ callout: PauseChampionCallout }>()

const isActive = computed(() => props.callout.state === 'active')
const isUrgent = computed(() => isActive.value && props.callout.secs <= PAUSE_STAR_URGENT_SECS)

/**
 * Die Punkte der Begleitwelten: befreite zuerst und matt, noch besetzte danach
 * und leuchtend. Die Reihe füllt sich damit von links nach rechts, statt Lücken
 * zu reißen. Was über den Deckel geht, steht als Zahl daneben — bei sieben
 * Welten wäre eine volle Punktreihe eine Textur und kein Zählwerk.
 */
const pips = computed(() => {
  const shown = Math.min(props.callout.escortTotal, PAUSE_CHAMPION_PIPS_MAX)
  return Array.from({ length: shown }, (_, i) => i < props.callout.escortCleared)
})
const pipOverflow = computed(() =>
  Math.max(0, props.callout.escortTotal - PAUSE_CHAMPION_PIPS_MAX),
)

const hpPercent = computed(() => props.callout.bossHp * 100)

const ariaLabel = computed(() =>
  isActive.value
    ? `Champion star — ${props.callout.title}, ${props.callout.secs} seconds left`
    : `Champion found — ${props.callout.title}, ${props.callout.status ?? ''}`,
)

// ── Zeitbogen ───────────────────────────────────────────────────────────────
// Dieselbe Mechanik wie in `PauseStarCard`: die Karte kennt den ABSOLUTEN
// Endzeitpunkt und lässt den Bogen in EINEM Zug durchlaufen — eine lineare
// Animation über die volle Laufzeit, per negativer Verzögerung an die bereits
// verstrichene Zeit gesetzt. Damit hängt er an der Uhr des Browsers statt am
// Abtasttakt des Overlays und kostet kein einziges Vue-Update.
const arcEl = ref<SVGCircleElement | null>(null)

function armDial(): void {
  const el = arcEl.value
  if (!el) return
  const total = Math.max(1, props.callout.durationMs)
  const elapsed = Math.min(total, Math.max(0, total - (props.callout.endsAt - gameNow())))
  // Ohne Zurücksetzen samt erzwungenem Reflow übernimmt der Browser die
  // laufende Animation gleichen Namens mitsamt ihrer alten Phase.
  el.style.animationName = 'none'
  void el.getBoundingClientRect()
  el.style.animationDuration = `${total}ms`
  el.style.animationDelay = `${-elapsed}ms`
  // Leeren statt setzen: der Name steht in der Klasse. Vue hängt scoped
  // Keyframes einen Scope-Suffix an — ein hier geschriebener Name träfe sie
  // nicht mehr. Dieselbe Stelle wie in PauseStarCard und PauseVoidCard.
  el.style.animationName = ''
}

onMounted(armDial)
// Auch der Zustandswechsel zählt: im `awaited`-Zustand gibt es den Kreis noch
// gar nicht, er muss beim ersten Erscheinen angesetzt werden.
watch(
  [() => props.callout.endsAt, () => props.callout.durationMs, () => props.callout.state],
  armDial,
  { flush: 'post' },
)

/**
 * Statischer Rückfall für `prefers-reduced-motion` (dort schaltet die CSS-Regel
 * die Animation ab) — und damit der Bogen schon im ersten Frame richtig steht.
 * `secs` ist die Abhängigkeit, die den Wert im Sekundentakt nachführt.
 */
const dashOffset = computed(() => {
  void props.callout.secs
  const total = Math.max(1, props.callout.durationMs)
  const left = Math.min(1, Math.max(0, (props.callout.endsAt - gameNow()) / total))
  return PAUSE_STAR_RING_CIRCUMFERENCE * (1 - left)
})
</script>

<template>
  <div
    class="pcc"
    :class="{ 'pcc--urgent': isUrgent, 'pcc--awaited': !isActive }"
    :style="{
      '--pcc-color': callout.color,
      '--pcc-w': `${PAUSE_CHAMPION_CARD_WIDTH}px`,
      '--pcc-h': `${PAUSE_STAR_CARD_HEIGHT}px`,
      '--pcc-pad': `${PAUSE_STAR_CARD_PAD_X}px`,
      '--pcc-dial': `${PAUSE_STAR_DIAL_PX}px`,
      '--pcc-gap': `${PAUSE_STAR_DIAL_GAP_PX}px`,
      '--pcc-ring-stroke': PAUSE_STAR_RING_STROKE,
      '--pcc-circ': PAUSE_STAR_RING_CIRCUMFERENCE,
    }"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- Goldlinie der Oberkante — der Hausverlauf, statisch. Sie trägt in
         dieser Reihe nur die Champion-Karte. -->
    <span class="pcc__crown" aria-hidden="true" />
    <!-- Lichtstreifen, der einmal je Runde durchläuft. Bewegt wird allein ein
         transform (siehe „Performance" Regel 2). -->
    <span class="pcc__sheen" aria-hidden="true" />
    <!-- Alarm-Schein auf eigener Ebene: statischer Schatten, animiert wird nur
         seine Opazität (siehe „Performance" Regel 11). -->
    <span class="pcc__alarm" aria-hidden="true" />

    <!-- ── Zifferblatt bzw. Rollenwappen ── -->
    <div class="pcc-dial" aria-hidden="true">
      <template v-if="isActive">
        <svg class="pcc-dial__svg" viewBox="0 0 56 56">
          <circle
            class="pcc-dial__track"
            cx="28"
            cy="28"
            :r="PAUSE_STAR_RING_RADIUS"
            :stroke-width="PAUSE_STAR_RING_STROKE"
          />
          <circle
            ref="arcEl"
            class="pcc-dial__arc"
            cx="28"
            cy="28"
            :r="PAUSE_STAR_RING_RADIUS"
            :stroke-width="PAUSE_STAR_RING_STROKE"
            :stroke-dasharray="PAUSE_STAR_RING_CIRCUMFERENCE"
            :stroke-dashoffset="dashOffset"
          />
        </svg>
        <!-- `.y` gleicht das Seitenlager der MedievalSharp-Ziffern aus, genau
             wie im Zifferblatt der Stern-Karte. -->
        <span v-ink-center.y class="pcc-dial__secs"
          >{{ callout.secs }}<span class="pcc-dial__unit">s</span></span
        >
      </template>
      <template v-else>
        <span class="pcc-crest">
          <span class="pcc-crest__halo" />
          <Icon
            :icon="callout.roleIcon"
            :width="PAUSE_CHAMPION_CREST_PX"
            :height="PAUSE_CHAMPION_CREST_PX"
            class="pcc-crest__icon"
          />
        </span>
      </template>
    </div>

    <!-- ── Körper ── -->
    <div class="pcc-body">
      <!-- Bildnis: im laufenden Stern der echte Champion, davor die Rolle, die
           der Spieler gewählt hat. Rechts angeschnitten, nach links unter einen
           Verlauf auslaufend — dasselbe Muster wie bei der Void-Karte, und der
           Grund ist derselbe: nebeneinander blieben von 208 px kaum 56 für die
           Schrift, und ein langer Championname zerfiele zu „Aure…". -->
      <div class="pcc-art" aria-hidden="true">
        <img
          v-if="callout.art"
          :src="callout.art"
          alt=""
          class="pcc-art__img"
          :class="{ 'pcc-art__img--role': !isActive }"
          draggable="false"
          @dragstart.prevent
        />
        <span class="pcc-art__veil" />
      </div>

      <span class="pcc-eyebrow">{{ isActive ? 'Champion Star' : 'Champion Found' }}</span>
      <span class="pcc-name">{{ callout.title }}</span>

      <!-- Fußzeile: im Wartezustand der Hinweis, wann der Stern kommt; im
           laufenden Stern das Leben seines Champion-Planeten und daneben, wie
           viele Begleitwelten noch stehen. -->
      <span v-if="!isActive" class="pcc-status">{{ callout.status }}</span>
      <span v-else class="pcc-foot">
        <span class="pcc-hp" :class="hpStageClass(hpPercent)">
          <!-- Pro-Wert gesetzter Transform steht inline am Balken selbst, nicht
               als Variable am Container (siehe „Performance" Regel 3). -->
          <span class="pcc-hp__fill" :style="{ transform: `scaleX(${callout.bossHp})` }" />
        </span>
        <span v-if="pips.length > 0" class="pcc-pips">
          <span
            v-for="(cleared, i) in pips"
            :key="i"
            class="pcc-pip"
            :class="{ 'pcc-pip--cleared': cleared }"
          />
          <span v-if="pipOverflow > 0" class="pcc-pips__more">+{{ pipOverflow }}</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.pcc {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--pcc-gap);
  flex-shrink: 0;
  /* Maße und Innenabstand kommen inline aus den PAUSE_*-Konstanten — dieselbe
     Quelle, aus der das Overlay die Höhe seiner Reihe ableitet. */
  width: var(--pcc-w);
  height: var(--pcc-h);
  padding: 0 var(--pcc-pad);
  overflow: hidden;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--pcc-color) 45%, #2a1a06);
  border-left: 3px solid var(--pcc-color);
  background:
    radial-gradient(
      circle at 14% 50%,
      color-mix(in srgb, var(--pcc-color) 20%, transparent),
      transparent 62%
    ),
    #16140e;
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.7);
  /* Der Umschlag auf Alarm ist einmalig, keine Dauerschleife — Farbe und
     Rahmen dürfen deshalb eine Transition tragen (Performance-Regel 2). */
  transition:
    border-color 0.3s ease,
    background 0.3s ease;
}
.pcc--urgent {
  border-color: #cc6050;
}

/* Goldlinie der Oberkante — der Hausverlauf aus CLAUDE.md, statisch.
   `z-index` ist Pflicht: das Bildnis liegt im Körper und damit SPÄTER im
   Dokument; ohne die Ebene deckte es die rechte Hälfte der Linie ab, und die
   Goldlinie hörte mitten in der Karte auf. */
.pcc__crown {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 2;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
  pointer-events: none;
}

/* Ein Streifen, eine Ebene, ein transform — unabhängig davon, wie lange die
   Karte steht. */
.pcc__sheen {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 32%;
  background: linear-gradient(
    100deg,
    transparent,
    color-mix(in srgb, var(--pcc-color) 26%, transparent),
    transparent
  );
  animation: pcc-sheen 3.4s ease-in-out infinite;
  pointer-events: none;
}
@keyframes pcc-sheen {
  0%,
  62% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(430%);
  }
}

.pcc__alarm {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 1px rgba(255, 122, 106, 0.55),
    0 0 20px rgba(255, 122, 106, 0.3);
  opacity: 0;
  pointer-events: none;
}
.pcc--urgent .pcc__alarm {
  animation: pcc-alarm 1.1s ease-in-out infinite;
}
@keyframes pcc-alarm {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* ── Zifferblatt ── */
.pcc-dial {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--pcc-dial);
  height: var(--pcc-dial);
  flex-shrink: 0;
  /* Über dem Bildnis: es läuft bis unter das Zifferblatt aus. */
  z-index: 1;
}
.pcc-dial__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Start oben statt rechts: die Zeit läuft ab wie auf einer Uhr. */
  transform: rotate(-90deg);
  overflow: visible;
}
.pcc-dial__track {
  fill: none;
  stroke: rgba(122, 78, 32, 0.5);
}
/* Der Bogen brennt stetig ab: Dauer und (negative) Verzögerung schreibt
   `armDial` inline, der NAME steht hier, damit Vues Scope-Suffix an den
   Keyframes greift. Kein `transition` auf stroke-dashoffset — die Animation
   führt den Wert selbst, beides zusammen zöge gegeneinander. */
.pcc-dial__arc {
  fill: none;
  stroke: var(--pcc-color);
  stroke-linecap: round;
  animation-name: pcc-dial-drain;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  transition: stroke 300ms ease;
}
@keyframes pcc-dial-drain {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: var(--pcc-circ);
  }
}
.pcc--urgent .pcc-dial__arc {
  stroke: #ff7a6a;
}
.pcc-dial__secs {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  font-size: 1.3rem;
  font-weight: 800;
  line-height: 1;
  color: var(--pcc-color);
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 12px color-mix(in srgb, var(--pcc-color) 45%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.9);
  transition: color 300ms ease;
}
.pcc--urgent .pcc-dial__secs {
  color: #ff8a7a;
}
/* Die Einheit belegt KEINE Breite, sonst stünde nicht die Zahl mittig im Ring,
   sondern die Gruppe aus Zahl und „s" — dieselbe Begründung wie bei der
   Stern-Karte. `min-width: 0` ist Pflicht, weil Flex-Items sonst auf ihre
   Inhaltsbreite aufgehen. */
.pcc-dial__unit {
  width: 0;
  min-width: 0;
  font-size: 0.5em;
  font-weight: 700;
  opacity: 0.6;
}

/* ── Rollenwappen (Wartezustand) ── */
.pcc-crest {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
/* Eigene Ebene mit STATISCHEM Schein, animiert wird nur ihre Opazität
   (Performance-Regel 11) — ein atmender box-shadow rasterte jeden Frame neu. */
.pcc-crest__halo {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--pcc-color) 55%, transparent);
  box-shadow:
    inset 0 0 12px color-mix(in srgb, var(--pcc-color) 30%, transparent),
    0 0 16px color-mix(in srgb, var(--pcc-color) 35%, transparent);
  animation: pcc-crest-breathe 2.6s ease-in-out infinite;
}
@keyframes pcc-crest-breathe {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}
.pcc-crest__icon {
  position: relative;
  color: var(--pcc-color);
}

/* ── Körper ── */
.pcc-body {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
  /* Das Bild darf bis an die Kartenkante laufen; die Karte selbst clippt. */
  align-self: stretch;
  padding: 8px 0;
}

/* ── Bildnis ── */
/* Das BILD wird nach links ausgeblendet, nicht mit einer Farbe zugedeckt.
   Ein deckender Verlauf davor müsste exakt die Kartenfüllung treffen — und die
   trägt hier einen Rollenton, der zur linken Kante hin heller wird. Jeder feste
   Farbwert riss dort eine sichtbare senkrechte Naht. Die Maske ist statisch,
   kostet also nichts pro Frame. */
.pcc-art {
  position: absolute;
  top: -1px;
  right: calc(-1 * var(--pcc-pad));
  bottom: -1px;
  width: 82%;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.22) 34%,
    rgba(0, 0, 0, 0.8) 74%,
    #000 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.22) 34%,
    rgba(0, 0, 0, 0.8) 74%,
    #000 100%
  );
}
.pcc-art__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Die Champion-Icons sind quadratische Porträts — der Kopf sitzt oberhalb
     der Mitte, deshalb der hohe Anschnitt. */
  object-position: 50% 22%;
  transform: scale(1.08);
  opacity: 0.9;
}
/* Das Rollenbild ist eine freigestellte Grafik, kein Porträt: es soll ganz zu
   sehen sein und rechts stehen, statt formatfüllend beschnitten zu werden. */
.pcc-art__img--role {
  object-fit: contain;
  object-position: 78% 50%;
  transform: none;
  opacity: 0.75;
}
/* Nur noch die waagerechte Dämpfung: sie setzt das Bild von Ober- und
   Unterkante ab. Das seitliche Ausblenden macht die Maske am Container. */
.pcc-art__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(22, 20, 14, 0.55),
    transparent 32%,
    transparent 68%,
    rgba(22, 20, 14, 0.55)
  );
}

/* Text über dem Bild. */
.pcc-eyebrow,
.pcc-name,
.pcc-status,
.pcc-foot {
  position: relative;
  z-index: 1;
}

.pcc-eyebrow {
  font-size: 9.5px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 4px rgba(5, 3, 0, 0.95);
}

/* 14 px ist am LÄNGSTEN Championnamen bemessen, nicht am Platz: „Nunu &
   Willump" braucht bei 15 px 117 px und hätte in den 108 px des Kartenkörpers
   abgebrochen. Damit steht der Name immer noch eine Stufe über dem Namen der
   Void-Karte (13 px) — er ist die Hauptzeile dieser Karte. */
.pcc-name {
  font-size: 14px;
  line-height: 1.05;
  letter-spacing: 0.01em;
  color: var(--pcc-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow:
    0 0 12px color-mix(in srgb, var(--pcc-color) 45%, transparent),
    0 1px 4px rgba(5, 3, 0, 0.95);
}

/* Wartezustand: der Hinweis, wann der Stern kommt. */
.pcc-status {
  align-self: flex-start;
  max-width: 100%;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(6, 4, 0, 0.62);
  border: 1px solid color-mix(in srgb, var(--pcc-color) 35%, transparent);
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--pcc-color) 40%, #f2ead0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Fußzeile des laufenden Sterns ── */
.pcc-foot {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Lebensbalken des Champion-Planeten — dieselbe Ampel wie die Vitalitäts-
   Leiste des Panels und die Welten der Stern-Karte, damit derselbe Füllstand
   überall dieselbe Farbe hat. Gefüllt wird über scaleX, nicht über die Breite
   (siehe „Performance" Regel 10). */
.pcc-hp {
  position: relative;
  display: block;
  flex: 1;
  min-width: 0;
  height: 5px;
  overflow: hidden;
  border-radius: 2px;
  background: rgba(6, 4, 0, 0.72);
  box-shadow: inset 0 0 0 1px rgba(122, 78, 32, 0.65);
}
.pcc-hp__fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--hp-hi), var(--hp-lo));
  /* Passivschaden fällt im Sekundentakt an — der Balken rutscht ihm nach,
     statt zu springen. Dieselbe Kurve wie die Welten der Stern-Karte. */
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.pcc-hp.hp--high {
  --hp-hi: #74d448;
  --hp-lo: #2e7a1a;
}
.pcc-hp.hp--mid {
  --hp-hi: #f5d84a;
  --hp-lo: #a8760e;
}
.pcc-hp.hp--low {
  --hp-hi: #ff7a6a;
  --hp-lo: #8e2a20;
}

/* Begleitwelten als Punkte: befreite matt, noch besetzte leuchtend. */
.pcc-pips {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.pcc-pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--pcc-color);
}
.pcc-pip--cleared {
  background: rgba(122, 78, 32, 0.7);
}
.pcc-pips__more {
  margin-left: 1px;
  font-size: 9.5px;
  font-weight: 800;
  color: #b8a878;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .pcc__sheen {
    animation: none;
    opacity: 0;
  }
  .pcc-crest__halo {
    animation: none;
    opacity: 0.8;
  }
  .pcc--urgent .pcc__alarm {
    animation: none;
    opacity: 0.7;
  }
  /* Statt des stetigen Abbrennens greift der im Sekundentakt gebundene
     Attributwert — der Bogen steht dann still und rückt einmal je Sekunde. */
  .pcc-dial__arc {
    animation: none !important;
  }
  .pcc-dial__arc,
  .pcc-dial__secs,
  .pcc-hp__fill {
    transition: none;
  }
}
</style>
