<script setup lang="ts">
import { Icon } from '@iconify/vue'
import {
  HERALD_ARRIVAL_MIN_W,
  HERALD_ARRIVAL_MAX_W,
  HERALD_ARRIVAL_MIN_W_FLAT,
  HERALD_ARRIVAL_MAX_W_FLAT,
  HERALD_ARRIVAL_MIN_W_TALL,
  HERALD_ARRIVAL_MAX_W_TALL,
} from '@/config/constants'

/**
 * Die EINE Form, in der sich der Herold meldet.
 *
 * Zeremonie und Quittung sahen bis hierhin völlig verschieden aus: das Banner
 * mit weichem Auslauf und Kreis-Medaillon für den Galaxie-Sprung, eine
 * Toast-Karte im Holzrahmen für jeden Kauf. Zwei Stimmen für dieselbe Sache.
 *
 * Jetzt tragen beide dieselbe Grammatik — Auslauf statt Rahmen, Akzent-Haarlinie
 * oben und unten, Medaillon, einmaliger Glanz beim Auftritt — und
 * unterscheiden sich nur im MASSSTAB. Der steckt in `--hb-*`: eine Handvoll
 * Custom Properties, die der `--receipt`-Modifier überschreibt. Kein zweiter
 * Regelsatz, deshalb kann auch keiner der beiden auseinanderlaufen.
 */
defineProps<{
  /** Zeremonie (groß, selten) oder Quittung (kompakt, gestapelt). */
  size: 'ceremony' | 'receipt'
  /** Akzentfarbe als "r, g, b" — trägt Schein, Linien, Kopfzeile, Medaillon. */
  accent: string
  eyebrow: string
  headline: string
  subline?: string
  /** Portrait oder Rangemblem; schlägt `icon`. */
  imageSrc?: string
  /** Iconify-Name, im Medaillon gezeigt, wenn kein Bild da ist. */
  icon?: string
  /** Bild rund beschneiden (Portrait) statt einpassen (Emblem). */
  round?: boolean
  /**
   * Standzeit in ms. Gesetzt heißt: die untere Haarlinie läuft als UHR ab.
   * Fehlt sie, steht die Linie still — die Zeremonie zeigt keine Restzeit.
   */
  holdMs?: number
  /** Neustart-Schlüssel der Uhr; bei einer Quittung `receipt.seq`. */
  lineKey?: number
  /**
   * Breiter Zuschnitt für eine Zeremonie, die neben dem Text eine
   * Ablesungsspalte trägt (die Ankunft in einem Universum).
   *
   * Ein PROP und kein Inline-Style von außen: `--hb-min-w`/`--hb-max-w` stehen
   * in beiden Media-Blöcken, und ein Inline-Wert überstimmt sie alle — die
   * Karte spränge auf Full HD über den Viewport hinaus.
   */
  wide?: boolean
}>()
</script>

<template>
  <div class="hb" :class="[`hb--${size}`, { 'hb--wide': wide }]" :style="{ '--ac': accent }">
    <div class="hb-rule hb-rule--top" />
    <div class="hb-sweep" />

    <div class="hb-visual">
      <!-- Ein Slot MIT Fallback, kein Import: die Universumsscheibe wohnt unter
           `bardProfil/firmament/`, und diese Karte soll nicht dorthin greifen.
           Wer sie zeichnet, ist der Aufrufer — für alle anderen bleibt alles,
           wie es war. `--hb-visual` gilt in beiden Fällen. -->
      <slot name="visual">
        <img
          v-if="imageSrc"
          :src="imageSrc"
          alt=""
          class="hb-img"
          :class="round ? 'hb-img--round' : 'hb-img--emblem'"
        />
        <span v-else-if="icon" class="hb-medallion">
          <!-- Größe kommt aus dem CSS, nicht aus diesen Attributen: `--hb-visual`
               skaliert das Medaillon, das Glyph folgt ihm anteilig. Die Attribute
               sind nur der Wert, den Iconify vor dem ersten Layout einsetzt. -->
          <Icon :icon="icon" width="40" height="40" class="hb-icon" />
        </span>
      </slot>
    </div>

    <div class="hb-text">
      <div class="hb-eyebrow">{{ eyebrow }}</div>
      <div class="hb-headline">{{ headline }}</div>
      <div v-if="subline" class="hb-sub">{{ subline }}</div>
    </div>

    <!-- Zähler und Zahlenfeld der Quittung. Die Zeremonie füllt den Platz
         nicht, dann nimmt er auch keine Breite. -->
    <slot name="meta" />

    <div class="hb-rule hb-rule--bottom" :class="{ 'hb-rule--clocked': holdMs !== undefined }">
      <div
        v-if="holdMs !== undefined"
        :key="lineKey"
        class="hb-rule-clock"
        :style="{ animationDuration: `${holdMs}ms` }"
      />
    </div>
  </div>
</template>

<style scoped>
/* ── Der Maßstab ─────────────────────────────────────────────────────────────
 * Alles, was zwischen den beiden Größen verschieden ist, steht HIER und nur
 * hier. Jede Regel darunter liest die Variablen und gilt damit für beide.
 *
 * `.hb.hb--receipt` statt `.hb--receipt`: Spezifität 0,2,0 gegen 0,1,0. Damit
 * gewinnt der Modifier in JEDEM Media-Block, unabhängig von der Reihenfolge —
 * die Falle, die den Vorgänger zwang, seine kleinen Modifier im
 * Media-Query-Block noch einmal zu wiederholen, existiert konstruktiv nicht
 * mehr. */
.hb {
  --hb-pad-y: clamp(12px, 1.4vh, 22px);
  --hb-pad-x: clamp(28px, 2.4vw, 52px);
  --hb-gap: clamp(14px, 1.6vw, 26px);
  --hb-visual: clamp(52px, 4.6vw, 78px);
  --hb-headline: clamp(24px, 2.6vw, 42px);
  --hb-eyebrow: clamp(10px, 0.85vw, 14px);
  --hb-sub: clamp(12px, 1.05vw, 17px);
  --hb-min-w: clamp(320px, 30vw, 560px);
  --hb-max-w: min(680px, 46vw);
  /* Höhe der Haarlinien. Bei der Quittung dicker, weil die untere dort die
   * Restzeit trägt — als 1-px-Faden war sie nicht ablesbar. */
  --hb-rule-h: 1px;
  /* Der seitliche Akzent-Schein. Drei Werte statt einer Rechnung aus einem:
   * die box-shadow-Achse ist nicht proportional, ein gerechnetes Spread lief
   * bei der kleinen Fassung sofort daneben. */
  --hb-glow-x: 72px;
  --hb-glow-blur: 82px;
  --hb-glow-spread: -40px;
  /* Ab wo der Körper voll deckt — davor läuft er nach außen aus. */
  --hb-fade: 16%;
  /* Deckkraft des Körpers. */
  --hb-alpha: 0.95;
  /* Einrückung der Haarlinien — hängt bewusst NICHT an `--hb-fade`: der
   * Auslauf des Körpers und die Länge der Linien sind zwei verschiedene
   * Entscheidungen, und die Linie soll auch im deckenden Kern der Quittung an
   * derselben relativen Stelle sitzen wie im Banner. */
  --hb-rule-inset: 8%;
  /* Zeilen der Nebenzeile. */
  --hb-lines: 1;

  position: relative;
  display: flex;
  gap: var(--hb-gap);
  align-items: center;
  min-width: var(--hb-min-w);
  max-width: var(--hb-max-w);
  padding: var(--hb-pad-y) var(--hb-pad-x);
  overflow: hidden;
  background: linear-gradient(
    to right,
    rgba(17, 16, 8, 0),
    rgba(14, 13, 8, var(--hb-alpha)) var(--hb-fade),
    rgba(14, 13, 8, var(--hb-alpha)) calc(100% - var(--hb-fade)),
    rgba(17, 16, 8, 0)
  );
  box-shadow:
    calc(var(--hb-glow-x) * -1) 0 var(--hb-glow-blur) var(--hb-glow-spread) rgba(var(--ac), 0.6),
    var(--hb-glow-x) 0 var(--hb-glow-blur) var(--hb-glow-spread) rgba(var(--ac), 0.6);
}

/* Die Quittung steht auch ÜBER dem Profil-Modal, also über hellen
 * Panelflächen — der weiche Auslauf der Zeremonie franste dort aus. Deshalb
 * nicht „kein Auslauf", sondern ein SCHMALER: die Silhouette bleibt die des
 * Banners, der Kern ist praktisch undurchsichtig. */
/* Die Polsterung ist knapper als bei der Zeremonie, und nicht nur der Größe
 * wegen: der breite Rand ist Feiergeste. Eine Quittung trägt oft einen langen
 * Eigennamen („Ancient Bone Sword") neben einem Zahlenfeld — der Platz gehört
 * dort dem Wort, nicht dem Rand. */
.hb.hb--receipt {
  --hb-pad-y: clamp(8px, 0.9vh, 14px);
  --hb-pad-x: clamp(14px, 1.1vw, 24px);
  --hb-gap: clamp(10px, 1.1vw, 17px);
  --hb-visual: clamp(36px, 3.1vw, 52px);
  --hb-headline: clamp(17px, 1.55vw, 25px);
  --hb-eyebrow: clamp(9px, 0.7vw, 12px);
  --hb-sub: clamp(11px, 0.78vw, 13px);
  /* Die Obergrenze ist der Rangunterschied: eine Quittung darf NIE so breit
   * werden wie die Zeremonie darüber, sonst liest sich der Stapel als vier
   * gleichrangige Meldungen. Sie liegt unter deren `--hb-min-w`. */
  --hb-min-w: clamp(280px, 21vw, 400px);
  --hb-max-w: min(495px, 34vw);
  --hb-glow-x: 42px;
  --hb-glow-blur: 48px;
  --hb-glow-spread: -24px;
  --hb-fade: 10%;
  --hb-alpha: 0.985;
  --hb-rule-h: 2px;
  --hb-lines: 2;
}

/* Der breite Zuschnitt. Er verstellt AUSSCHLIESSLICH die Breite — Polsterung,
 * Medaillon und Schriftgrößen bleiben die der Zeremonie, sonst wären es drei
 * Maßstäbe statt zweier. Was er kauft, ist die Ablesungsspalte rechts.
 *
 * `.hb.hb--wide` statt `.hb--wide`: Spezifität 0,2,0 gegen 0,1,0, damit der
 * Modifier in JEDEM Media-Block gewinnt, unabhängig von der Reihenfolge —
 * dieselbe Vorsichtsmaßnahme wie beim `--receipt` darüber. Und die Werte
 * kommen per `v-bind` aus den Konstanten, nicht als Literale: sie stehen in
 * drei Blöcken, und eine vergessene Stelle fällt nur im Browser auf. */
.hb.hb--wide {
  --hb-min-w: v-bind(HERALD_ARRIVAL_MIN_W);
  --hb-max-w: v-bind(HERALD_ARRIVAL_MAX_W);
}

/* ── Die beiden Haarlinien ───────────────────────────────────────────────────
 * Oben Zierrat, unten Zierrat UND Uhr: die Quittung braucht eine Restzeit, und
 * statt ihr einen eigenen Balken danebenzustellen, läuft die untere Linie
 * selbst ab. Ein Element weniger im Bild, und die Anzeige bleibt dieselbe Form,
 * die die Zeremonie schon trägt. */
.hb-rule {
  position: absolute;
  right: var(--hb-rule-inset);
  left: var(--hb-rule-inset);
  height: var(--hb-rule-h);
  background: linear-gradient(to right, transparent, rgba(var(--ac), 0.9), transparent);
}

.hb-rule--top {
  top: 0;
}

.hb-rule--bottom {
  bottom: 0;
}

/* Die Uhr liegt ÜBER der Linie und leert sich; was zurückbleibt, ist die
 * gedämpfte Grundlinie darunter. `scaleX` statt `width` — Compositor-Arbeit,
 * kein Layout pro Frame. Der Keyframe-NAME steht hier, JS setzt nur die Dauer. */
.hb-rule--clocked {
  background: linear-gradient(to right, transparent, rgba(var(--ac), 0.22), transparent);
}

/* An den Enden nicht ganz transparent: die ablaufende Kante muss sichtbar
 * bleiben, sonst verschwindet die Uhr, bevor die Zeit um ist. */
.hb-rule-clock {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(var(--ac), 0.35),
    rgba(var(--ac), 1) 22%,
    rgba(var(--ac), 1) 78%,
    rgba(var(--ac), 0.35)
  );
  transform-origin: left center;
  animation: hb-clock linear both;
}

/* Einmaliger Glanz beim Auftritt — kein Dauerlauf. Er hängt am MOUNT des
 * Banners, nicht an der Verdichtung: bei fünf Klicks je Sekunde wächst nur der
 * Zähler, das Banner blitzt nicht erneut. */
.hb-sweep {
  position: absolute;
  top: 0;
  left: 0;
  width: 34%;
  height: 100%;
  pointer-events: none;
  background: linear-gradient(to right, transparent, rgba(255, 240, 200, 0.13), transparent);
  animation: hb-sweep 0.9s ease-out 0.15s both;
}

/* ── Medaillon / Portrait ── */
.hb-visual {
  flex-shrink: 0;
  animation: hb-visual-punch 0.45s cubic-bezier(0.2, 1.6, 0.4, 1);
}

.hb-img {
  display: block;
  width: var(--hb-visual);
  height: var(--hb-visual);
}

.hb-img--round {
  object-fit: cover;
  border: 3px solid rgba(var(--ac), 0.9);
  border-radius: 50%;
  box-shadow: 0 0 16px rgba(var(--ac), 0.7);
}

.hb-img--emblem {
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(var(--ac), 0.75));
}

.hb-medallion {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--hb-visual);
  height: var(--hb-visual);
  background: radial-gradient(circle at 50% 42%, rgba(var(--ac), 0.28), rgba(10, 9, 6, 0.6) 72%);
  border: 2px solid rgba(var(--ac), 0.85);
  border-radius: 50%;
  box-shadow:
    0 0 18px rgba(var(--ac), 0.6),
    inset 0 0 14px rgba(var(--ac), 0.35);
}

/* Anteilig zum Medaillon, nicht absolut: eine Größe, die mitwächst. */
.hb-icon {
  width: 52%;
  height: 52%;
  color: rgb(var(--ac));
  filter: drop-shadow(0 0 6px rgba(var(--ac), 0.8));
}

/* ── Text ── */
.hb-text {
  flex: 1 1 auto;
  min-width: 0;
}

.hb-eyebrow {
  margin-bottom: 3px;
  font-size: var(--hb-eyebrow);
  color: rgba(var(--ac), 0.92);
  text-shadow: 0 0 10px rgba(var(--ac), 0.5);
  letter-spacing: 4px;
}

.hb-headline {
  overflow: hidden;
  font-size: var(--hb-headline);
  font-weight: 700;
  line-height: 1.08;
  color: #f4ecd4;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 2px;
  text-shadow:
    0 0 20px rgba(var(--ac), 0.55),
    0 2px 6px rgba(0, 0, 0, 0.85);
  animation: hb-headline-punch 0.45s cubic-bezier(0.2, 1.6, 0.4, 1);
}

/* Bei der Quittung ZWEI Zeilen: die Wirkungszeile eines Forge-Kaufs ist ein
 * ganzer Satz („Offline earnings +20% and extends the offline cap by 4 hours.")
 * und endete einzeilig mitten im Wort. Die Zeremonie bleibt bei einer — ihre
 * Nebenzeile trägt nie mehr als eine Angabe. */
.hb-sub {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--hb-lines);
  line-clamp: var(--hb-lines);
  overflow: hidden;
  margin-top: 5px;
  font-size: var(--hb-sub);
  line-height: 1.25;
  color: rgba(232, 226, 208, 0.62);
  letter-spacing: 2px;
}

.hb.hb--receipt .hb-sub {
  margin-top: 3px;
  letter-spacing: 0.6px;
}

.hb.hb--receipt .hb-eyebrow {
  letter-spacing: 2.2px;
}

.hb.hb--receipt .hb-headline {
  letter-spacing: 0.4px;
}

/* ── Keyframes ── */
@keyframes hb-sweep {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(400%);
  }
}

@keyframes hb-headline-punch {
  0% {
    opacity: 0;
    transform: scale(1.4);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes hb-visual-punch {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes hb-clock {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}

/* Full HD / WUXGA — die flachsten Viewports. Höhe ist hier das knappe Maß:
 * unter einer Zeremonie können drei Quittungen stehen. Nur Zahlen, keine
 * wiederholten Regeln. */
@media (max-height: 1100px) {
  .hb {
    --hb-pad-y: clamp(9px, 1.1vh, 15px);
    --hb-pad-x: clamp(20px, 1.9vw, 38px);
    --hb-gap: clamp(10px, 1.2vw, 18px);
    --hb-visual: clamp(44px, 3.6vw, 60px);
    --hb-headline: clamp(20px, 2vw, 32px);
    --hb-eyebrow: clamp(9px, 0.7vw, 12px);
    --hb-sub: clamp(11px, 0.85vw, 14px);
    --hb-min-w: clamp(260px, 24vw, 420px);
    --hb-max-w: min(520px, 40vw);
  }

  .hb.hb--wide {
    --hb-min-w: v-bind(HERALD_ARRIVAL_MIN_W_FLAT);
    --hb-max-w: v-bind(HERALD_ARRIVAL_MAX_W_FLAT);
  }

  /* Enger als im großen Maßstab — bei 32 px reißt 2 px die Wörter auseinander. */
  .hb .hb-headline {
    letter-spacing: 1.5px;
  }

  .hb.hb--receipt {
    --hb-pad-y: clamp(6px, 0.7vh, 11px);
    --hb-pad-x: clamp(11px, 0.85vw, 17px);
    --hb-gap: clamp(8px, 0.75vw, 12px);
    --hb-visual: clamp(32px, 2.5vw, 42px);
    --hb-headline: clamp(15px, 1.28vw, 20px);
    --hb-eyebrow: clamp(8px, 0.6vw, 10px);
    --hb-sub: clamp(10px, 0.64vw, 12px);
    --hb-min-w: clamp(240px, 17vw, 320px);
    --hb-max-w: min(400px, 29vw);
  }
}

/* 4K: auf 2030 px Viewporthöhe wirkt die Standardgröße verloren — das galt
 * bisher nur für die Quittung, gilt aber für die Zeremonie genauso. */
@media (min-height: 1600px) {
  .hb {
    --hb-visual: clamp(78px, 4.6vw, 104px);
    --hb-headline: clamp(42px, 2.6vw, 54px);
    --hb-eyebrow: clamp(14px, 0.85vw, 18px);
    --hb-sub: clamp(17px, 1.05vw, 22px);
    --hb-min-w: clamp(560px, 30vw, 720px);
  }

  .hb.hb--wide {
    --hb-min-w: v-bind(HERALD_ARRIVAL_MIN_W_TALL);
    --hb-max-w: v-bind(HERALD_ARRIVAL_MAX_W_TALL);
  }

  .hb.hb--receipt {
    --hb-visual: clamp(52px, 3.1vw, 68px);
    --hb-headline: clamp(28px, 1.75vw, 36px);
    --hb-eyebrow: clamp(12px, 0.7vw, 15px);
    --hb-sub: clamp(14px, 0.82vw, 18px);
    --hb-min-w: clamp(360px, 21vw, 480px);
    --hb-max-w: min(580px, 34vw);
  }
}

/* Die Uhr bleibt bewusst STEHEN: sie ist die einzige Ablesung, wie lange die
 * Karte noch da ist — Information, kein Zierrat, und ein linearer Balken ist
 * keine Bewegungsreizung. Nur die Auftritte entfallen. */
@media (prefers-reduced-motion: reduce) {
  .hb-sweep,
  .hb-headline,
  .hb-visual {
    animation: none;
  }
}
</style>
