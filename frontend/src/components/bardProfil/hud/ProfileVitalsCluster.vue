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
    <!--
      Der Cluster besitzt nur noch die Maße: die neunstufige Staffel am Ende der
      Datei setzt `--vb-w`/`--vb-h`, alles Weitere leitet die Leiste daraus ab.
      Er bleibt als eigenes Element stehen, weil er zugleich der Anker des
      Tooltips ist (`clear-ancestor`) — der Kasten weicht der Unterkante des
      ganzen Clusters aus, nicht der der Leiste.
    -->
    <div class="pv-cluster" :class="stateClass">
      <VitalityBar
        :current="playerStore.currentHP"
        :max="playerStore.maxHP"
        :regen-per-sec="regen"
        label-placement="inside"
        spark
        aria-role="status"
        :aria-label="ariaLabel"
      />
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
import { computed } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import VitalityBar from '@/components/ui/VitalityBar.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { sunVitalStage } from '@/utils/ui/format'

const playerStore = usePlayerStore()

const regen = computed(() => Math.round(playerStore.regenPerSec * 10) / 10)

/** Ungekürzt und mit Tausendertrennung — der einzige Grund, den Kasten
 *  überhaupt zu öffnen. Die Leiste selbst zeigt die gerundete Kurzform. */
const exactHp = computed(() => Math.ceil(playerStore.currentHP).toLocaleString())
const exactMax = computed(() => Math.round(playerStore.maxHP).toLocaleString())

/** Nur noch für den Tooltip: die Leiste färbt sich selbst. Beide fragen
 *  dieselbe Funktion — der Kasten darf nicht rot sein, während der Balken
 *  darunter noch gelb steht. */
const stateClass = computed(() => `pv--${sunVitalStage(playerStore.hpPercent)}`)

const ariaLabel = computed(
  () => `Sun health ${Math.ceil(playerStore.currentHP)} of ${playerStore.maxHP}`,
)
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

/* Die Leiste gibt ihre Breite NICHT ab, wenn die Kopfspalte eng wird.
   Als Flex-Item schrumpfte sie von sich aus: auf 1366 CSS-Pixeln blieben der
   Spalte 127px, und die Wurzel der Leiste fiel auf 115 — während ihr Balken
   seine 120 aus `--vb-w` behielt. Die Zahlen zentrieren sich aber über die
   WURZEL, der Balken ist das Kind darin; gemessen stand der Satz dadurch 2,5px
   links der Balkenmitte, also genau die halbe Differenz. Bei linksbündigem Satz
   fiel das nie auf, weil dort beide Kanten an derselben Stelle beginnen.

   Was die Staffel unten sagt, gilt damit auch dann, wenn es knapp wird. Läuft
   die Leiste über, greift die Reissleine, die der Kopf dafür hat: die Spalte
   trägt `overflow: hidden` und beschneidet sich selbst, statt die Reiter
   daneben zu verschieben (siehe `.rp-header-side` in `BardProfileMenu.vue`). */
.pv-cluster > * {
  flex-shrink: 0;
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
   (siehe `--vb-regen-display` unten) — Breite ist hier das knappe Gut, nicht
   Inhalt.

   `--vb-h` ist der EINZIGE Wert, der die Grösse der Leiste steuert: Schriftgrade,
   Label-Padding und Eckradius leitet sie per `calc()` daraus ab — deshalb führt
   die Staffel je Stufe nur zwei Zahlen. Sie entstand als Summe der alten
   Zweizeiligkeit (Zahlenzeile + Abstand + Balken) und wurde davon ausgehend um
   ein Siebtel zurückgenommen — die Leiste trug zu hoch und drängte sich an die
   obere Modalkante. */
.pv-cluster {
  --vb-w: 100px;
  --vb-h: 24px;
  padding: 0 4px 0 8px;

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
     und rundum gerundet wäre die Leiste eine Pille.

     Beide Verweise erreichen die Leiste, obwohl sie in einer anderen Komponente
     steht: `--bottom-notch-r` und `--hud-scale` liegen auf `:root` und werden
     wie jede Custom Property durch die Scope-Grenze vererbt. Aufgelöst wird der
     Ausdruck erst dort, wo `border-top-left-radius` ihn liest. */
  --vb-radius: 2px;
  --vb-radius-tl: min(
    calc(var(--vb-h) * 0.36),
    calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1) - 4px)
  );
  /* KEINE Breitenreserve für den laufenden Wert — sie verträgt sich nicht mit
     dem mittigen Satz, den `label-placement="inside"` trägt. Die Reserve zählt
     zur Breite des Satzes, seine Box sitzt damit zwar mittig, die sichtbaren
     Ziffern darin klebten aber rechts in ihrer Zelle und stünden neben der
     Achse. Was sie verhindern sollte — ein bei jedem Tick wandernder Satz —
     verhindert `font-variant-numeric: tabular-nums` in der Leiste ohnehin: die
     Breite ändert sich nur beim Wechsel der Stellenzahl. Ausgemessen an der
     Orbit-Leiste, die Herleitung steht in `PlayerHPBar.vue`.

     Für die Breite dieser Spalte ist das ein Gewinn: ohne Reserve wird der Satz
     schmaler, nicht breiter — der Überlauf, um den es im Block darüber geht,
     rückt weiter weg. */
  --vb-cur-reserve: 0;

  /* Der dritte Wert steht grösser, als die Leiste ihn von sich aus setzen würde
     (Default 0,25 · Höhe): auf Full HD wären das 12,5px neben einem 25px hohen
     Hauptwert — lesbar nur, wenn man weiss, dass dort etwas steht. Mit 0,3 trägt
     er denselben Grad wie das Maximum hinter dem Schrägstrich.

     Zwei gleich grosse Zahlen in einer Zeile verwischen nicht: der Regen-Wert
     ist grün und normal gesetzt, das Maximum cremeweiss und `font-weight: 800`.
     Farbe und Gewicht tragen die Hierarchie hier, nicht der Grad — und die Farbe
     ist ohnehin das, was ihn als Regeneration und nicht als zweite HP-Zahl
     liest.

     Kein Pixelboden wie im Orbit (`max(9px, …)`): dort wird die Leiste bis auf
     18px hinunter gestaffelt, hier erscheint der Wert überhaupt erst ab 1700px
     Fensterbreite — und da steht `--vb-h` schon auf 45. */
  --vb-regen-size: calc(var(--vb-h) * 0.3);

  /* Unter 1700 passt die Regeneration nicht mehr in die Leiste, ohne dass
     entweder der Text abgeschnitten würde oder die Trennklinge daneben ihre Luft
     verlöre. Sie ist der dritte Wert und weicht deshalb zuerst — was sie sagt,
     steht im Hover-Kasten; die beiden Zahlen und der Balken sind das, was der
     Kopf tragen MUSS.

     Über eine Variable und nicht über `:deep(.vb-regen)`: sonst hinge diese
     Datei am internen Klassennamen der Leiste, und genau diese Kopplung soll
     das gemeinsame Bauteil abschaffen. */
  --vb-regen-display: none;
}

@media (min-width: 1366px) {
  .pv-cluster {
    --vb-w: 120px;
    --vb-h: 28px;
    padding: 0 4px 0 8px;
  }
}

@media (min-width: 1536px) {
  .pv-cluster {
    --vb-w: 152px;
    --vb-h: 36px;
    padding: 0 4px 0 10px;
  }
}

@media (min-width: 1600px) {
  .pv-cluster {
    --vb-w: 168px;
    --vb-h: 40px;
    padding: 0 4px 0 10px;
  }
}

@media (min-width: 1700px) {
  /* Ab hier trägt die Leiste ihren dritten Wert wieder — und das kostet auf
     dieser und der nächsten Stufe zusätzliche BREITE, nicht nur Platz im Satz.
     Der Regen-Wert steht bei mittigem Satz absolut an der rechten Innenkante und
     wächst dem Satz ENTGEGEN, statt ihn zu verschieben; die beiden treffen sich
     also in der Mitte. Gemessen mit dem längsten Wert, den der Regenerations-
     Zweig hergibt („+45.5/s" — Zweigstufe mal Blattverstärker, verdoppelt durch
     Eternal Orbit): auf 197px überlappten Satz und Zahl um 7px.

     Die 21px kommen aus der Luft zur Trennklinge daneben, von der hier 29px
     standen — mehr als auf jeder anderen Stufe. Es bleiben 8,5px, gut ein Pixel
     weniger als die schmalste Stufe schon heute fährt. Weiter geht es nicht: die
     Klinge klebte sonst am Balken, und genau davor warnt der Block oben. */
  .pv-cluster {
    --vb-w: 218px;
    --vb-h: 45px;
    padding: 0 4px 0 12px;
    --vb-regen-display: inline;
  }
}

@media (min-width: 1800px) {
  /* Dieselbe Rechnung eine Stufe weiter: 224px trugen den langen Regen-Wert um
     5px nicht. Hier steht die Klinge weit genug weg, dass die 18px nicht ins
     Gewicht fallen. */
  .pv-cluster {
    --vb-w: 242px;
    --vb-h: 50px;
    padding: 0 4px 0 14px;
  }
}

@media (min-width: 1920px) {
  /* Die Höhe bleibt hier stehen — und mit ihr die der Kacheln gegenüber, die
     dieser Staffel folgen. 50px ist damit die Marke, auf der beide Seiten des
     Kopfes stehen. */
  .pv-cluster {
    --vb-w: 254px;
    --vb-h: 50px;
    padding: 0 6px 0 18px;
  }
}

@media (min-width: 2300px) {
  .pv-cluster {
    --vb-w: 348px;
    --vb-h: 57px;
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
    --vb-w: 436px;
    --vb-h: 66px;
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

/* Kein `prefers-reduced-motion`-Block mehr: alles, was sich hier bewegte, liegt
   jetzt in `VitalityBar` und wird dort angehalten. */
</style>
