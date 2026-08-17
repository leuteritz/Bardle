<template>
  <!--
    Der Zustand der Sonne, links im Kopf des Profils.

    Er steht hier, weil das Profil das Spiel NICHT pausiert: `useGamePause`
    kennt den offenen Reiter gar nicht, `useRenderingPaused` stoppt nur das
    Zeichnen des Idle-Layers. Schaden aus Void, Boss und Orbit fällt weiter,
    die Regeneration läuft weiter — nur die `PlayerHPBar` liegt mit z-index 20
    unter dem Modal und ist nicht zu sehen. Wer im Shop stöbert, während seine
    Sonne ausbrennt, soll das nicht erst beim Schliessen erfahren.

    `clear-ancestor`: der Kasten weicht der Unterkante des ganzen Clusters aus,
    nicht der des Herzens — sonst läge er auf der Leiste, die er erklärt.
  -->
  <RpgBadgeTooltip clear-ancestor=".pv-cluster">
    <div class="pv-cluster" :class="stateClass" role="status" :aria-label="ariaLabel">
      <div class="pv-track">
        <!-- Geisterspur UNTER der Füllung: sie trägt denselben Anteil, folgt ihm
             aber verzögert. Sichtbar wird sie deshalb nur beim Einschlag — der
             Streifen, den die zurückschnellende Füllung freigibt, ist genau der
             Schaden dieses Treffers. Rezept aus `StarFightBossHud.vue`
             (`.sf-hp-ghost`), dort über `width`, hier über `transform`. -->
        <span class="pv-ghost" :style="ghostStyle" aria-hidden="true" />

        <!-- Füllung als `scaleX` am Balken SELBST, nicht als Breite und nicht
             als Variable am Container (Performance-Regel 3). Dieselbe Lesart
             wie jede neuere Leiste des Spiels. -->
        <span class="pv-fill" :style="{ transform: `scaleX(${hpRatio})` }" aria-hidden="true" />

        <!-- Der Glanzkeil an der Füllkante. Er MUSS eine eigene Ebene sein: als
             Kind der Füllung wäre er von deren `scaleX` mitverzerrt worden — je
             weniger HP, desto breiter der Keil. Diese Ebene ist so breit wie der
             Track und wird nur VERSCHOBEN, ihre linke Kante sitzt damit immer
             auf der Füllkante. Was rechts übersteht, klemmt das `overflow`. -->
        <span class="pv-edge" :style="edgeStyle" aria-hidden="true" />

        <span class="pv-ticks" aria-hidden="true" />

        <!-- Treffer-Schlag auf EIGENER Ebene: der Schein steht statisch im
             CSS, animiert wird allein die Deckkraft (Performance-Regel 2/11).
             Ein pulsender box-shadow am Track hätte ihn samt Schatten pro
             Frame neu gerastert. Er liegt UNTER der Beschriftung — der Text
             bleibt im Schlag lesbar. -->
        <span
          class="pv-hit"
          :class="{ 'pv-hit--on': wasHit }"
          :style="hitDurationStyle"
          aria-hidden="true"
        />

        <!--
          Die Zahlen stehen IM Balken, und zwar zweimal.

          Der Grund ist die wandernde Füllkante: links steht der Text auf
          leuchtendem Grün, rechts auf fast schwarzem Track. EINE Textfarbe ist
          dort zwangsläufig irgendwann falsch, und eine Umschaltschwelle würde
          die Zahl mitten im Absinken umspringen lassen. Stattdessen liegen zwei
          deckungsgleiche Ebenen übereinander — hell für den dunklen Grund,
          dunkel für die Füllung —, und beide werden an der Füllkante
          gegeneinander abgeschnitten. Bei halb überlaufener Ziffer trägt jede
          Zeichenhälfte die Farbe, die auf IHREM Untergrund lesbar ist. Rezept
          aus `UniverseRescueTrack.vue`, hier mit beidseitigem Schnitt.

          `v-ink-center.y`: MedievalSharp sitzt in seiner Zeilenbox nicht mittig;
          über die volle Kopfhöhe ist der Versatz sichtbar.
        -->
        <div class="pv-label pv-label--on-track" :style="trackClipStyle">
          <span v-ink-center.y class="pv-cur">{{
            $formatNumber(Math.ceil(playerStore.currentHP))
          }}</span>
          <span v-ink-center.y class="pv-sep">/</span>
          <span v-ink-center.y class="pv-max">{{ $formatNumber(playerStore.maxHP) }}</span>
          <span v-if="regen > 0" v-ink-center.y class="pv-regen"
            >+{{ $formatNumber(regen) }}/s</span
          >
        </div>
        <!-- Die dunkle Zwillingsebene. `aria-hidden`, sonst liest ein
             Screenreader jede Zahl doppelt. -->
        <div class="pv-label pv-label--on-fill" :style="fillClipStyle" aria-hidden="true">
          <span v-ink-center.y class="pv-cur">{{
            $formatNumber(Math.ceil(playerStore.currentHP))
          }}</span>
          <span v-ink-center.y class="pv-sep">/</span>
          <span v-ink-center.y class="pv-max">{{ $formatNumber(playerStore.maxHP) }}</span>
          <span v-if="regen > 0" v-ink-center.y class="pv-regen"
            >+{{ $formatNumber(regen) }}/s</span
          >
        </div>
      </div>
    </div>

    <!--
      Der Kasten sagt genau das, was die Leiste NICHT sagen kann: die exakten
      Zahlen (dort steht „5,3K") und wie schnell sie sich von selbst füllt.
      Schaden, Heilung und Zusammenbrüche der Lebenszeit standen hier einmal —
      sie gehören in den Stats-Reiter, nicht in einen Kasten, der über einem
      Menü aufgeht, das der Spieler gerade bedient.
    -->
    <template #tip>
      <div class="pv-tip" :class="stateClass">
        <span class="pv-tip-lead">{{ exactHp }} / {{ exactMax }}</span>
        <span class="pv-tip-sub">
          <span class="pv-tip-sub-label">Regen</span>
          <span class="pv-tip-sub-value">+{{ $formatNumber(regen) }} / s</span>
        </span>
      </div>
    </template>
  </RpgBadgeTooltip>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { HP_CRIT_PERCENT, HP_HEALTHY_PERCENT, PLAYER_HP_HIT_FLASH_MS } from '@/config/constants'

const playerStore = usePlayerStore()

/** Kein eigener Ticker: `currentHP` ändert sich im Sekundentakt des Spiels und
 *  ist reaktiv — Vue rendert die Zeile von selbst. */
const hpRatio = computed(() => Math.min(1, Math.max(0, playerStore.hpPercent / 100)))

const regen = computed(() => Math.round(playerStore.regenPerSec * 10) / 10)

/** Die beiden Textebenen schneiden sich GEGENSEITIG an der Füllkante — jede
 *  gibt frei, was die andere trägt. Nur die dunkle zu beschneiden (so macht es
 *  der Rescue-Balken im Header) genügt hier nicht: bei 900er Schnitt und halber
 *  Kopfhöhe schaut der schwarze Schein der hellen Ebene unter jeder dunklen
 *  Glyphe hervor, und die Zahl liest sich wie doppelt gedruckt.
 *
 *  Die Füllung liegt auf `inset: 0` — anders als beim Rescue-Balken, dessen
 *  Füller 2px innerhalb des Tracks beginnt, braucht der Schnitt keinen
 *  Ausgleich und damit keine Konstante. */
const fillClipStyle = computed(() => ({
  clipPath: `inset(0 ${(1 - hpRatio.value) * 100}% 0 0)`,
}))

const trackClipStyle = computed(() => ({
  clipPath: `inset(0 0 0 ${hpRatio.value * 100}%)`,
}))

/** Die Kante wird VERSCHOBEN, nicht skaliert (siehe Kommentar im Template).
 *  Bei leerem Balken bliebe sonst ein heller Strich an der linken Kante stehen —
 *  ein Glanz auf einer Füllung, die es nicht gibt. */
const edgeStyle = computed(() => ({
  transform: `translateX(${hpRatio.value * 100}%)`,
  opacity: hpRatio.value > 0.004 ? 1 : 0,
}))

/** Die Geisterspur läuft NUR beim Absinken nach. Steigt der Wert — und das tut er
 *  durch die Regeneration jede Sekunde —, springt sie ohne Übergang mit: sonst
 *  liefe pausenlos eine Transition auf einer Ebene, die in dieser Richtung
 *  ohnehin von der Füllung verdeckt ist. */
const hpRising = ref(true)

const ghostStyle = computed(() => ({
  transform: `scaleX(${hpRatio.value})`,
  transitionDuration: hpRising.value ? '0s' : '1.05s',
}))

/** Ungekürzt und mit Tausendertrennung — der einzige Grund, den Kasten
 *  überhaupt zu öffnen. Die Kachel selbst zeigt die gerundete Kurzform. */
const exactHp = computed(() => Math.ceil(playerStore.currentHP).toLocaleString())
const exactMax = computed(() => Math.round(playerStore.maxHP).toLocaleString())

/** Dieselben Umschlagpunkte wie der Vitalitäts-Strip des Pause-Overlays —
 *  zwei Anzeigen desselben Werts dürfen nicht bei verschiedenen Anteilen
 *  die Farbe wechseln. */
const stateClass = computed(() => {
  if (playerStore.hpPercent > HP_HEALTHY_PERCENT) return 'pv--green'
  if (playerStore.hpPercent > HP_CRIT_PERCENT) return 'pv--yellow'
  return 'pv--red'
})

const ariaLabel = computed(
  () => `Sun health ${Math.ceil(playerStore.currentHP)} of ${playerStore.maxHP}`,
)

// ── Treffer-Schlag ──────────────────────────────────────────────────────────
// Rein visuell, deshalb `setTimeout` und nicht `gameTimeout()`: der Rückruf
// ändert keinen Spielzustand, er räumt nur eine Klasse ab.
const wasHit = ref(false)
let hitTimer: ReturnType<typeof setTimeout> | null = null

/** Die Dauer steht EINMAL in der Konstante und wird an das Element geschrieben;
 *  der Keyframe-NAME bleibt in der CSS-Klasse (Performance-Regel 10 — Vue hängt
 *  scoped Keyframes einen Suffix an, den ein aus JS gesetzter Name verfehlt). */
const hitDurationStyle = computed(() => ({ animationDuration: `${PLAYER_HP_HIT_FLASH_MS}ms` }))

watch(
  () => playerStore.currentHP,
  (now, before) => {
    // Vor dem `return`: die Richtung steuert die Geisterspur und muss auch dann
    // stimmen, wenn kein Treffer vorliegt. Der Rückruf läuft als `pre`-Watcher
    // vor dem Rendern, die Dauer greift also im selben Bild wie der neue Anteil.
    hpRising.value = now >= before
    if (now >= before) return
    wasHit.value = false
    if (hitTimer) clearTimeout(hitTimer)
    // Ein Frame Pause, damit ein zweiter Treffer in Folge die Animation wirklich
    // neu anstösst statt sie stehen zu lassen.
    requestAnimationFrame(() => {
      wasHit.value = true
      hitTimer = setTimeout(() => {
        wasHit.value = false
        hitTimer = null
      }, PLAYER_HP_HIT_FLASH_MS)
    })
  },
)

onUnmounted(() => {
  if (hitTimer) clearTimeout(hitTimer)
})
</script>

<style scoped>
/* ── Der Cluster ──────────────────────────────────────────────────────────
   Keine Karte, keine Kante: er sitzt IM Kopfstreifen des Modals und würde als
   umrandete Platte gegen die Reiter daneben stehen.

   Ein Herz-Glyph stand hier einmal davor. Es nahm auf Full HD 40 der 292px
   breiten Seitenspalte — und sagte nichts, was nicht schon dastand: die
   eingefärbte Leiste, die Zahl und der Kopf des Tooltips benennen den Wert
   dreifach. Die Breite gehört seitdem der Leiste.

   Eine Zahlenzeile ÜBER der Leiste stand hier ebenfalls einmal. Sie kostete die
   halbe Höhe des Clusters und liess der Leiste selbst auf Full HD 20px — genug
   für die Farbe des Zustands, zu wenig für sein Gewicht. Beides steckt jetzt in
   EINER Form: der Balken nimmt die volle Kopfhöhe und trägt seine Zahlen selbst.
   Er steht damit auf Augenhöhe mit den Q W E R-Pips gegenüber.

   `--pv-w` ist seine Breite, `--pv-h` seine Höhe; alle Schriftgrade leiten sich
   aus `--pv-h` ab, damit die Staffel am Ende der Datei je Stufe nur noch zwei
   Zahlen führt — dasselbe Vorgehen wie beim Bereitschafts-Cluster gegenüber. */
.pv-cluster {
  display: flex;
  align-items: center;
  min-width: 0;
  cursor: default;
}

/* ── Die Leiste ───────────────────────────────────────────────────────────
   Segmentlinien im Rezept der PlayerHPBar, damit beide Anzeigen derselben Zahl
   auch gleich gelesen werden. Die Fassung ist kräftiger als dort: über die volle
   Kopfhöhe wirkt eine 1px-Linie wie ein Versehen, nicht wie ein Rahmen. */
.pv-track {
  position: relative;
  width: var(--pv-w);
  height: var(--pv-h);
  min-width: 0;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.58);
  border-radius: 2px;
  /* Die obere linke Ecke folgt der RUNDUNG DES MODALS, an dessen Kante sie sitzt.
     Eine scharfe Ecke steht dort gegen den Bogen des Holzrahmens statt mit ihm zu
     laufen — die Leiste ist das einzige Element des Kopfes, das nah genug daran
     liegt, dass man es sieht.

     Formel wortgleich aus `StarFightModal.vue` (dort viermal, für dasselbe
     Modal): Aussenradius `--bottom-notch-r × --hud-scale` minus 4px, der
     sichtbaren Stärke des Holzrahmens — `RpgFrame` versetzt seine Kontur um
     BOTTOM_BAR_EDGE_INSET (2) nach innen und zieht darauf einen 3,5px-Strich.
     Gedeckelt über die eigene Höhe, damit die Kurve auf schmalen Stufen nicht
     den halben Balken auffrisst; welcher der beiden Werte führt, wechselt je
     nach Auflösung.

     Die anderen drei Ecken bleiben bei 2px. Sie stehen an keiner Rahmenkante,
     und rundum gerundet wäre die Leiste eine Pille. */
  border-top-left-radius: min(
    calc(var(--pv-h) * 0.36),
    calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1) - 4px)
  );
  box-shadow:
    inset 0 0 0 1px rgba(122, 78, 32, 0.55),
    inset 0 2px 7px rgba(0, 0, 0, 0.78);
}

.pv-ghost {
  position: absolute;
  inset: 0;
  z-index: 0;
  transform-origin: left center;
  background: rgba(255, 235, 200, 0.3);
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  /* Die DAUER steht inline am Element — sie hängt an der Richtung. */
}

.pv-fill {
  position: absolute;
  inset: 0;
  z-index: 1;
  transform-origin: left center;
  /* `transform` statt `width`: der Umschlag bleibt Compositor-Arbeit. */
  transition: transform 0.45s ease;
}

/* Der Glanzkeil sitzt am LINKEN Rand dieser Ebene — die Ebene selbst ist so breit
   wie der Track und wird an die Füllkante geschoben. */
.pv-edge {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.7) 0,
    rgba(255, 255, 255, 0.22) 2px,
    rgba(255, 255, 255, 0) 7px
  );
  transition:
    transform 0.45s ease,
    opacity 0.2s linear;
}

.pv--green .pv-fill {
  background: linear-gradient(90deg, #2e7a1a 0%, #52b830 100%);
}
.pv--yellow .pv-fill {
  background: linear-gradient(90deg, #9a6c14 0%, #e8c040 100%);
}
.pv--red .pv-fill {
  background: linear-gradient(90deg, #a81206 0%, #f83820 100%);
}

/* Segmentmarken bei 25 / 50 / 75 % — dieselbe Teilung wie die grosse Leiste,
   aber als KERBEN an Ober- und Unterkante statt als durchgehende Linien. Über
   20px Höhe ist eine ganze Linie eine feine Marke; über die volle Kopfhöhe
   zerschneidet sie die Leiste in vier Kacheln und läuft mitten durch die Zahlen.
   Zwei Kopien desselben Streifenmusters, jede ein knappes Viertel hoch. */
.pv-ticks {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent calc(25% - 0.5px),
      rgba(0, 0, 0, 0.5) calc(25% - 0.5px),
      rgba(0, 0, 0, 0.5) 25%
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent calc(25% - 0.5px),
      rgba(0, 0, 0, 0.5) calc(25% - 0.5px),
      rgba(0, 0, 0, 0.5) 25%
    );
  background-position:
    top left,
    bottom left;
  background-size: 100% 22%;
  background-repeat: no-repeat;
}

.pv-hit {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  opacity: 0;
  background: rgba(255, 90, 45, 0.85);
}

.pv-hit--on {
  animation-name: pv-hit-flash;
  animation-timing-function: ease-out;
}

@keyframes pv-hit-flash {
  from {
    opacity: 0.9;
  }
  to {
    opacity: 0;
  }
}

/* ── Die Beschriftung ─────────────────────────────────────────────────────
   Zwei deckungsgleiche Ebenen, siehe Kommentar im Template. Alles, was beide
   gemeinsam haben, steht hier EINMAL — läuft der Satz auseinander, sieht man an
   der Füllkante einen Doppelrand statt eines sauberen Farbwechsels. */
.pv-label {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: calc(var(--pv-h) * 0.07);
  padding: 0 calc(var(--pv-h) * 0.22);
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  /* Synchron mit `.pv-fill`: der Farbwechsel läuft mit der Kante, nicht hinter
     ihr her. Der einzige Wert dieser Datei, der nicht `transform` ist — auf
     zwei Elementen, höchstens einmal je Spielsekunde. */
  transition: clip-path 0.45s ease;
}

.pv-label--on-fill {
  z-index: 6;
}

/* Der laufende Wert bekommt eine Breitenreserve: ohne sie rückt der Trenner
   dahinter jedes Mal seitwärts, wenn aus „12.4K" ein „9.8K" wird — im Augenwinkel
   neben den Reitern ist genau das das Störende. */
.pv-cur {
  min-width: 4.8ch;
  font-size: calc(var(--pv-h) * 0.5);
  font-weight: 900;
  color: #fff6e2;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.pv-sep {
  font-size: calc(var(--pv-h) * 0.3);
  font-weight: 400;
  color: rgba(255, 246, 226, 0.42);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.pv-max {
  font-size: calc(var(--pv-h) * 0.3);
  font-weight: 800;
  color: rgba(255, 246, 226, 0.6);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Die Regeneration ist die dritte Aussage und steht am anderen Ende: sie sagt,
   in welche Richtung sich der Wert bewegt, wenn nichts trifft. */
.pv-regen {
  margin-left: auto;
  font-size: calc(var(--pv-h) * 0.25);
  font-weight: 800;
  color: #9fd07a;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Die dunkle Ebene: derselbe Satz, die Farben eines Textes auf hellem Grund.
   Der Schein geht nach OBEN statt nach unten — auf einer leuchtenden Füllung
   trennt ein heller Saum die Glyphe besser ab als ein schwarzer Schatten. */
.pv-label--on-fill .pv-cur,
.pv-label--on-fill .pv-sep,
.pv-label--on-fill .pv-max,
.pv-label--on-fill .pv-regen {
  color: #241202;
  text-shadow: 0 1px 0 rgba(255, 240, 180, 0.45);
}

/* Ohne Saum: der helle Schein trägt die 900er Hauptzahl, frisst aber die
   kleineren Nebenwerte von unten auf, bis sie milchig wirken. Sie stehen
   stattdessen kräftiger. */
.pv-label--on-fill .pv-sep {
  color: rgba(36, 18, 2, 0.62);
  text-shadow: none;
}

.pv-label--on-fill .pv-max {
  color: rgba(36, 18, 2, 0.9);
  text-shadow: none;
}

.pv-label--on-fill .pv-regen {
  color: #1d3308;
  text-shadow: none;
}

/* Warn- und Alarmzustand auf dem TRACK: dort, wo der Text auf Schwarz steht, ist
   die Zustandsfarbe wieder das Signal. Sie ging beim Umzug in den Balken einmal
   verloren — die Zahl war auch bei 3 % Lebenszeit cremeweiss, und die Warnung
   hing allein an einem roten Streifen, den bei diesem Stand kaum noch jemand
   sieht. Auf der FÜLLUNG bleibt es beim Kontrastpaar: dort trägt die Farbe schon
   der Untergrund. */
.pv--yellow .pv-label--on-track .pv-cur {
  color: #f2cc5c;
}

.pv--red .pv-label--on-track .pv-cur {
  color: #ff7a62;
}

/* Der Alarmzustand ist die eine Füllung, die selbst dunkel ist — ihr Verlauf
   beginnt auf #a81206. Dunkle Schrift darauf war gemessen nicht mehr zu lesen,
   und gerade bei knapper Lebenszeit steht die Zahl ganz links, also auf der
   dunkelsten Stelle. Hier trägt deshalb AUCH die Füllung hellen Text — beide
   Ebenen sind dann gleich, der Schnitt dazwischen fällt nicht auf. */
.pv--red .pv-label--on-fill .pv-cur {
  color: #fff6e2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.pv--red .pv-label--on-fill .pv-sep {
  color: rgba(255, 246, 226, 0.42);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.pv--red .pv-label--on-fill .pv-max {
  color: rgba(255, 246, 226, 0.6);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.pv--red .pv-label--on-fill .pv-regen {
  color: #cdeeb0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* ── Tooltip ──────────────────────────────────────────────────────────────
   Die exakten Zahlen · eine Zeile. Mehr nicht. */
.pv-tip {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 14px 13px;
}

.pv-tip-lead {
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1.05;
  color: #f2ead2;
  font-variant-numeric: tabular-nums;
}

.pv--yellow .pv-tip-lead {
  color: #e8c040;
}
.pv--red .pv-tip-lead {
  color: #ff7a62;
}

.pv-tip-sub {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-top: 7px;
  border-top: 1px solid #2e2416;
}

.pv-tip-sub-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #8a7a52;
}

.pv-tip-sub-value {
  font-size: 0.95rem;
  font-weight: 800;
  color: #6e9a54;
  font-variant-numeric: tabular-nums;
}

/* ── Auflösungsstufen ─────────────────────────────────────────────────────
   Gestaffelt nach der GEMESSENEN Seitenspalte, nicht nach der Monitorklasse —
   dieselben Schwellen wie im Bereitschafts-Cluster gegenüber, damit beide Seiten
   des Kopfes immer zusammen wachsen. Der Grund steht dort ausführlich: ein
   Full-HD-Schirm unter Windows-Skalierung 125 % liefert dem Browser 1536 CSS-
   Pixel, nicht 1920, und eine Staffel nach Monitorklasse zeigt dort die
   Notgrössen.

     CSS-Breite | Spalte | Cluster gesamt
     ---------- | ------ | --------------
       1280     |  119   | 108
       1366     |  143   | 132
       1536     |  183   | 166   ← Full HD @ 125 %
       1600     |  197   | 182
       1700     |  223   | 210   ← Full HD @ 112 %
       1800     |  250   | 240
       1920     |  293   | 278   ← Full HD @ 100 %
       2300     |  409   | 372
       3400     |  759   | 460 */
/* Zur Breite unterhalb von 1700: die Zahlen sind bei kleiner Schrift breiter, als
   man schätzt. Als sie noch ÜBER dem Balken standen, liefen sie bis 1707 aus der
   Spalte und wurden von deren `overflow: hidden` abgeschnitten, um bis zu 29px,
   die der Spieler nie zu sehen bekam. Im Balken beschneidet sie jetzt dessen
   eigenes `overflow` — sichtbarer wird ein Überlauf dadurch nicht.

   Die Spalte einfach auszureizen löst es nicht: dann bleibt der Trennklinge
   daneben 1px Luft und sie klebt am Balken. Stattdessen weicht der DRITTE Wert
   (siehe `.pv-regen` unten) — Breite ist hier das knappe Gut, nicht Inhalt.

   `--pv-h` ist der EINZIGE Wert, der die Grösse der Leiste steuert: Schriftgrade,
   Label-Padding und Eckradius hängen per `calc()` daran. Die Staffel entstand als
   Summe der alten Zweizeiligkeit (Zahlenzeile + Abstand + Balken) und wurde davon
   ausgehend um ein Siebtel zurückgenommen — die Leiste trug zu hoch und drängte
   sich an die obere Modalkante. */
.pv-cluster {
  --pv-w: 100px;
  --pv-h: 24px;
  padding: 0 4px 0 8px;
}

/* Unter 1700 passt die Regeneration nicht mehr in die Leiste, ohne dass entweder
   der Text abgeschnitten würde oder die Trennklinge daneben ihre Luft verlöre.
   Sie ist der dritte Wert und weicht deshalb zuerst — was sie sagt, steht im
   Hover-Kasten; die beiden Zahlen und der Balken sind das, was der Kopf
   tragen MUSS. */
.pv-regen {
  display: none;
}

@media (min-width: 1366px) {
  .pv-cluster {
    --pv-w: 120px;
    --pv-h: 28px;
    padding: 0 4px 0 8px;
  }
}

@media (min-width: 1536px) {
  .pv-cluster {
    --pv-w: 152px;
    --pv-h: 36px;
    padding: 0 4px 0 10px;
  }
}

@media (min-width: 1600px) {
  .pv-cluster {
    --pv-w: 168px;
    --pv-h: 40px;
    padding: 0 4px 0 10px;
  }
}

@media (min-width: 1700px) {
  /* Ab hier trägt die Leiste ihren dritten Wert wieder. */
  .pv-cluster {
    --pv-w: 197px;
    --pv-h: 45px;
    padding: 0 4px 0 12px;
  }
  .pv-regen {
    display: inline;
  }
}

@media (min-width: 1800px) {
  .pv-cluster {
    --pv-w: 224px;
    --pv-h: 50px;
    padding: 0 4px 0 14px;
  }
}

@media (min-width: 1920px) {
  /* Die Höhe bleibt hier stehen: sie soll unter den 64px hohen Pips gegenüber
     bleiben, damit die Leiste neben ihnen steht statt gegen sie. */
  .pv-cluster {
    --pv-w: 254px;
    --pv-h: 50px;
    padding: 0 6px 0 18px;
  }
}

@media (min-width: 2300px) {
  .pv-cluster {
    --pv-w: 348px;
    --pv-h: 57px;
  }
  .pv-tip {
    padding: 13px 16px 15px;
  }
  .pv-tip-lead {
    font-size: 1.7rem;
  }
  .pv-tip-sub-label {
    font-size: 0.95rem;
  }
  .pv-tip-sub-value {
    font-size: 1.05rem;
  }
}

@media (min-width: 3400px) {
  .pv-cluster {
    --pv-w: 436px;
    --pv-h: 66px;
  }
  .pv-tip {
    padding: 15px 18px 17px;
  }
  .pv-tip-lead {
    font-size: 1.95rem;
  }
  .pv-tip-sub-label {
    font-size: 1.08rem;
  }
  .pv-tip-sub-value {
    font-size: 1.18rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pv-fill,
  .pv-ghost,
  .pv-edge,
  .pv-label--on-fill {
    transition: none;
  }
  .pv-hit--on {
    animation: none;
  }
}
</style>
