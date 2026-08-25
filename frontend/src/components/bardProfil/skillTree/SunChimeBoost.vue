<template>
  <!-- `aria-hidden`, weil die Zahl reine Wiederholung ist: was sie sagt, steht
       als Chimes/Sek in der Kopfzeile des Spiels, die neben dem offenen Profil
       sichtbar bleibt. -->
  <div class="scb" :style="seatStyle" aria-hidden="true">
    <span class="scb-lens" />
    <span v-ink-center.x.y="fontPx" class="scb-value">×{{ boostText }}</span>
    <span v-ink-center class="scb-cap">{{ FORGE_SUN_BOOST_CAPTION }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Was den Chime-Ertrag vervielfacht — als EINE Zahl, im Kern der Sonne.
 *
 * ── Woher sie kommt ─────────────────────────────────────────────────────────
 * Hier stand einmal ein ERTRAGS-KOPF: eine 100px hohe Leiste über der
 * Baumbühne, links ein 84px-Ring mit der Zahl darin, rechts ein Chip je
 * Herkunft. Sie stimmte in der Rechnung und scheiterte an ihrem Platz — die
 * wichtigste Auskunft der Spalte stand am Rand, während in der Mitte der Bühne
 * ein Sternkörper saß, der gar nichts sagte. Und sie kostete den Viewport
 * hundert Pixel, wo `fitScale` `min(width, height)` nimmt: auf Full HD ist die
 * Höhe das Knappe.
 *
 * Die Zahl steht deshalb jetzt IN dem, was sie ergibt. Der Körper ist dafür
 * gewachsen (`SHOP_SUN_MIN_DIAMETER`/`_MAX_DIAMETER`, 170/240 → 240/320), und
 * das Netz ist ihm gewichen — die Herleitung dazu steht an `FORGE_RAY_DIST`.
 *
 * ── Warum eine LINSE darunter liegt ─────────────────────────────────────────
 * Es gibt keine Textfarbe, die auf allen drei Körpern liest. Der Sternkern ist
 * in JEDER Phase sehr hell (`STAR_PHASE_DATA[i].core` läuft von `#fff0e0` bis
 * `#ffffff`, und der Verlauf mischt zusätzlich `white 92%` hinein), der Komet
 * ist dunkelbraun (`#8a7a68`), das Schwarze Loch reines `#000`. Eine Farbweiche
 * je Körper wären drei Sonderfälle für eine Aussage; eine dunkle, weich
 * auslaufende Scheibe unter der Zahl ist EINE Ebene für alle drei — und sie
 * liest sich als das, was sie darstellt: der Kern.
 *
 * ── Warum sie NEBEN dem Körper hängt und nicht darin ────────────────────────
 * Sie ist Geschwister von `CometDisc`/`BlackHoleDisc`/`.tree-stage-sun` im
 * `.sun-wrapper`, nicht deren Kind. Der Komet taumelt (`comet-tumble`), die
 * Plasmascheibe atmet (`tree-sun-pulse`) — eine Zahl, die mitrotiert oder
 * mitpulsiert, ist keine Anzeige mehr.
 *
 * ── Was hier NICHT läuft ────────────────────────────────────────────────────
 * Kein Timer, kein rAF, keine Animation. Alle Maße hängen an `diameter` (ändert
 * sich beim Phasenwechsel) und `scale` (ändert sich beim Zoomschritt) — nichts
 * davon ist ein Wert pro Frame. Sie stehen als Custom Properties am Element
 * SELBST und nicht an einem Container: der Subtree darunter sind drei Spans
 * (Performance-Regel 3).
 */
import { computed } from 'vue'
import { useShopStore } from '@/stores/economy/shopStore'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import {
  FORGE_SUN_BOOST_CAPTION,
  FORGE_SUN_BOOST_CAPTION_RATIO,
  FORGE_SUN_BOOST_FONT_RATIO,
  FORGE_SUN_BOOST_FONT_RATIO_LONG,
  FORGE_SUN_BOOST_LENS_ASPECT,
  FORGE_SUN_BOOST_LENS_FRACTION,
  FORGE_SUN_BOOST_LONG_CHARS,
  FORGE_SUN_BOOST_MAX_READ_SCALE,
  FORGE_SUN_BOOST_MIN_SCREEN_PX,
} from '@/config/constants'

const props = defineProps<{
  /** Kantenlänge des Körpers, der gerade in der Mitte steht — Komet,
   *  Plasmascheibe oder Schwarzes Loch. Eine Quelle, `bodyDiameter`. */
  diameter: number
  /** Der Zoom der Bühne. Er entscheidet allein darüber, ob die Untergrenze
   *  unten greift; die Zahl selbst skaliert ohnehin mit der Bühne. */
  scale: number
}>()

const shopStore = useShopStore()

/** Das Netto-Produkt der ganzen Multiplikatorkette. */
const totalMultiplier = computed(() =>
  shopStore.cpsFactorBreakdown.reduce((product, entry) => product * entry.factor, 1),
)

/**
 * Die Zahl, so kurz wie der Kern es verlangt.
 *
 * Ab 1000 übernimmt `formatNumberCompact` — dieselbe Kurzform, die Kopfzeile,
 * Materialspalten und Minimap tragen. Ausgeschrieben stand hier im Endzustand
 * `×1,042,548`: zehn Zeichen, die auch aus einem 320px-Körper links und rechts
 * hinausliefen. `×1.04M` sind sechs und bleiben drin — und es ist die
 * Schreibweise, in der der Spieler jede andere Zahl des Spiels schon liest.
 */
const boostText = computed(() => {
  const m = totalMultiplier.value
  if (m < 10) return m.toFixed(2)
  if (m < 1000) return m.toFixed(1)
  return formatNumberCompact(m)
})

/** Eine Stufe kleiner, sobald die Zahl breiter wird als der Kern. */
const isLong = computed(() => boostText.value.length + 1 > FORGE_SUN_BOOST_LONG_CHARS)

const fontPx = computed(() =>
  Math.round(
    props.diameter * (isLong.value ? FORGE_SUN_BOOST_FONT_RATIO_LONG : FORGE_SUN_BOOST_FONT_RATIO),
  ),
)

/**
 * Die Zahl ZOOMT MIT — bis zu der Größe, unter der sie nicht mehr zu lesen ist.
 *
 * Sie gehört der Sonne und nicht dem Bildschirm; eine vollständige
 * Gegenskalierung (`--inv-scale`, wie sie die Tooltips der Bühne tragen) ließe
 * sie beim Herauszoomen über den geschrumpften Körper hinausragen. Am unteren
 * Anschlag fiele sie aber auf 16px, und „ganz herausgezoomt" ist genau der
 * Zustand, in dem man die Übersicht sucht.
 *
 * Angewandt wird der Faktor auf die GANZE Gruppe, Linse mit: skalierte man nur
 * den Text, stünde er auf seiner eigenen Trägerfläche über.
 */
const readScale = computed(() =>
  Math.min(
    FORGE_SUN_BOOST_MAX_READ_SCALE,
    Math.max(1, FORGE_SUN_BOOST_MIN_SCREEN_PX / (fontPx.value * (props.scale || 1))),
  ),
)

const seatStyle = computed(() => ({
  '--scb-lens': `${Math.round(props.diameter * FORGE_SUN_BOOST_LENS_FRACTION)}px`,
  '--scb-lens-h': `${Math.round(
    props.diameter * FORGE_SUN_BOOST_LENS_FRACTION * FORGE_SUN_BOOST_LENS_ASPECT,
  )}px`,
  '--scb-font': `${fontPx.value}px`,
  '--scb-cap': `${Math.round(props.diameter * FORGE_SUN_BOOST_CAPTION_RATIO)}px`,
  transform: `translate(-50%, -50%) scale(${readScale.value.toFixed(3)})`,
}))
</script>

<style scoped>
/* Derselbe Vertrag wie `CometDisc` und `BlackHoleDisc`: absolut in der Mitte
   des Elternteils, Größe aus den eigenen Maßen — sie braucht den `.sun-wrapper`
   nur als Anker.

   `z-index: 7` liegt über der Scheibe (1), dem Kaufblitz (5) und der
   Phasenvorschau (6): der Blitz ist eine Quittung von einem halben Augenblick,
   die Zahl ist die Auskunft, um derentwillen der Körper überhaupt so groß ist.

   `pointer-events: none` wie der ganze Wrapper — sie ist ein Ergebnis, keine
   Schaltfläche, und ein Zug an der Bühne muss auch in ihrer Mitte greifen
   (gemessen: die Scheibe fing dort einmal den `pointerdown` ab). */
.scb {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.06em;
  pointer-events: none;
  user-select: none;
}

/* Die Trägerfläche. Sie läuft nach außen VOLLSTÄNDIG aus — deshalb hat sie
   nirgends eine Kante, die als aufgeklebte Scheibe läse, und deshalb verträgt
   sie sich mit allen drei Körpern: auf dem Plasma ist sie ein Schattenband, auf
   dem Kometen ein Krater, auf dem Schwarzen Loch fällt sie mit dessen
   Ereignishorizont zusammen.

   Eine ELLIPSE und kein Kreis, Begründung an `FORGE_SUN_BOOST_LENS_ASPECT`: sie
   fasst einen Textblock, und der ist breit und flach. Rund gefasst deckte sie
   oben und unten die Kuppen des Körpers mit ab, und die Sonne las sich als
   dunkler Ring mit Saum.

   Statisch — kein Wert daran ändert sich je pro Frame. `z-index: -1` stellt sie
   unter die Geschwister IM eigenen Stapelkontext (`.scb` trägt ein `transform`);
   dasselbe Rezept wie `.node-glow` am Knoten. */
.scb-lens {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  width: var(--scb-lens, 160px);
  height: var(--scb-lens-h, 92px);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  /* ZWEI Verläufe auf EINER Ebene, nicht zwei Elemente: der erste ist der
     satte Kern direkt hinter der Schrift, der zweite ein weiter, schwacher
     Hauch, der ihn ins Plasma überführt. Einstufig gemessen hatte die Linse bei
     jeder Steilheit eine sichtbare Kante — entweder als Balken um den Text oder
     als Ring weiter außen. Zwei Kurven, die an verschiedenen Stellen auslaufen,
     haben keine gemeinsame. */
  background:
    radial-gradient(
      ellipse at 50% 50%,
      rgba(4, 3, 1, 0.9) 0%,
      rgba(4, 3, 1, 0.74) 32%,
      rgba(4, 3, 1, 0.3) 58%,
      transparent 78%
    ),
    radial-gradient(
      ellipse at 50% 50%,
      rgba(4, 3, 1, 0.42) 0%,
      rgba(4, 3, 1, 0.2) 52%,
      rgba(4, 3, 1, 0.06) 80%,
      transparent 100%
    );
}

/* Der Schein ist DUNKEL, nicht hell: er klebt die Ziffern an die Linse, statt
   sie vom Körper abzuheben. Statischer `text-shadow`, keine Animation darauf
   (Performance-Regel 2). */
.scb-value {
  font-size: var(--scb-font, 60px);
  font-weight: 900;
  line-height: 1;
  color: #ffd870;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 0 calc(var(--scb-font, 60px) * 0.16) rgba(4, 3, 1, 0.9);
}

.scb-cap {
  font-size: var(--scb-cap, 18px);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1;
  color: rgba(232, 192, 110, 0.72);
  white-space: nowrap;
  text-shadow: 0 0 calc(var(--scb-cap, 18px) * 0.4) rgba(4, 3, 1, 0.9);
}
</style>
