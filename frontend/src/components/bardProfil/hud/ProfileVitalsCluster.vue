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
      <Icon icon="ph:heart-fill" width="30" height="30" class="pv-heart" aria-hidden="true" />

      <div class="pv-body">
        <div class="pv-line">
          <span class="pv-cur">{{ $formatNumber(Math.ceil(playerStore.currentHP)) }}</span>
          <span class="pv-sep">/</span>
          <span class="pv-max">{{ $formatNumber(playerStore.maxHP) }}</span>
          <span v-if="regen > 0" class="pv-regen">+{{ $formatNumber(regen) }}/s</span>
        </div>

        <div class="pv-track">
          <!-- Füllung als `scaleX` am Balken SELBST, nicht als Breite und nicht
               als Variable am Container (Performance-Regel 3). Dieselbe Lesart
               wie jede neuere Leiste des Spiels. -->
          <span class="pv-fill" :style="{ transform: `scaleX(${hpRatio})` }" aria-hidden="true" />
          <span class="pv-ticks" aria-hidden="true" />
          <!-- Treffer-Schlag auf EIGENER Ebene: der Schein steht statisch im
               CSS, animiert wird allein die Deckkraft (Performance-Regel 2/11).
               Ein pulsender box-shadow am Track hätte ihn samt Schatten pro
               Frame neu gerastert. -->
          <span
            class="pv-hit"
            :class="{ 'pv-hit--on': wasHit }"
            :style="hitDurationStyle"
            aria-hidden="true"
          />
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
        <span class="pv-tip-cap">Sun Vitality</span>
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
import { Icon } from '@iconify/vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { HP_CRIT_PERCENT, HP_HEALTHY_PERCENT, PLAYER_HP_HIT_FLASH_MS } from '@/config/constants'

const playerStore = usePlayerStore()

/** Kein eigener Ticker: `currentHP` ändert sich im Sekundentakt des Spiels und
 *  ist reaktiv — Vue rendert die Zeile von selbst. */
const hpRatio = computed(() => Math.min(1, Math.max(0, playerStore.hpPercent / 100)))

const regen = computed(() => Math.round(playerStore.regenPerSec * 10) / 10)

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
   umrandete Platte gegen die Reiter daneben stehen. Zusammengehalten wird er
   vom Herzen links und der gemeinsamen Grundlinie.

   `--pv-w` ist die Breite des Körpers: Zahlenzeile UND Leiste teilen sie sich,
   damit die Leiste nicht bei jeder Stellenzahl eine andere Länge bekommt. */
.pv-cluster {
  --pv-w: 214px;
  --pv-track-h: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  /* Abstand zur Holzecke des RpgFrame, die über dem Kopf liegt. */
  padding: 0 6px 0 18px;
  cursor: default;
}

.pv-heart {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  color: #cc2010;
  /* Statisch, kein Dauerläufer — der Schein rastert genau einmal. */
  filter: drop-shadow(0 0 7px rgba(220, 40, 18, 0.55));
}

.pv--yellow .pv-heart {
  color: #d8901c;
}
.pv--green .pv-heart {
  color: #cc4030;
}

.pv-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: var(--pv-w);
  min-width: 0;
}

.pv-line {
  display: flex;
  align-items: baseline;
  gap: 5px;
  line-height: 1;
  white-space: nowrap;
}

/* Der laufende Wert bekommt eine Breitenreserve: ohne sie rückt die ganze
   Zeile jedes Mal seitwärts, wenn aus „12.4K" ein „9.8K" wird — im Augenwinkel
   neben den Reitern ist genau das das Störende. */
.pv-cur {
  min-width: 5.4ch;
  font-size: 32px;
  font-weight: 900;
  color: #f2ead2;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.pv--yellow .pv-cur {
  color: #e8c040;
}
.pv--red .pv-cur {
  color: #ff7a62;
}

.pv-sep {
  font-size: 16px;
  font-weight: 400;
  color: #7a5820;
}

.pv-max {
  font-size: 16px;
  font-weight: 800;
  color: #8a7a52;
  font-variant-numeric: tabular-nums;
}

/* Die Regeneration ist die zweite Aussage der Zeile und tritt zurück: sie sagt,
   in welche Richtung sich der Wert davor bewegt, wenn nichts trifft. */
.pv-regen {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 800;
  color: #6e9a54;
  font-variant-numeric: tabular-nums;
}

/* ── Die Leiste ───────────────────────────────────────────────────────────
   Track und Segmentlinien im Rezept der PlayerHPBar, damit beide Anzeigen
   derselben Zahl auch gleich gelesen werden. */
.pv-track {
  position: relative;
  width: 100%;
  height: var(--pv-track-h);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 1px;
  box-shadow:
    inset 0 1px 4px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(80, 40, 8, 0.45);
}

.pv-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  /* `transform` statt `width`: der Umschlag bleibt Compositor-Arbeit. */
  transition: transform 0.45s ease;
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

/* Segmentlinien bei 25 / 50 / 75 % — dieselbe Teilung wie die grosse Leiste. */
.pv-ticks {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(25% - 0.5px),
    rgba(0, 0, 0, 0.45) calc(25% - 0.5px),
    rgba(0, 0, 0, 0.45) 25%
  );
}

.pv-hit {
  position: absolute;
  inset: 0;
  z-index: 3;
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

/* ── Tooltip ──────────────────────────────────────────────────────────────
   Überschrift · die exakten Zahlen · eine Zeile. Mehr nicht. */
.pv-tip {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 14px 13px;
}

.pv-tip-cap {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
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
   Gestaffelt nach BREITE, nicht nach Höhe: der Kopfstreifen ist auf jeder
   Zielauflösung 84px hoch (die clamp()-Werte der Reiter sind ab 1000px
   Viewporthöhe am Anschlag), die Seitenspalte daneben aber nicht — 292px bei
   1920×1080, 502px bei 2560×1440, über 1100px auf 4K.

   Gesamtbreite gegen verfügbare Spalte:
     Grundstufe  278 von 292 px */
@media (max-width: 1919px) {
  /* Keine Zielauflösung — die Reissleine für schmalere Fenster (1440×810 lässt
     nur 135px Spalte). */
  .pv-cluster {
    --pv-w: 100px;
    --pv-track-h: 8px;
    gap: 6px;
    padding: 0 4px 0 10px;
  }
  .pv-heart {
    width: 20px;
    height: 20px;
  }
  .pv-body {
    gap: 4px;
  }
  .pv-cur {
    font-size: 16px;
  }
  .pv-sep,
  .pv-max,
  .pv-regen {
    font-size: 11px;
  }
}

@media (min-width: 2400px) {
  .pv-cluster {
    --pv-w: 300px;
    --pv-track-h: 22px;
    gap: 12px;
  }
  .pv-heart {
    width: 36px;
    height: 36px;
  }
  .pv-cur {
    font-size: 38px;
  }
  .pv-sep,
  .pv-max {
    font-size: 18px;
  }
  .pv-regen {
    font-size: 15px;
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
    --pv-w: 380px;
    --pv-track-h: 26px;
    gap: 14px;
  }
  .pv-heart {
    width: 42px;
    height: 42px;
  }
  .pv-cur {
    font-size: 44px;
  }
  .pv-sep,
  .pv-max {
    font-size: 21px;
  }
  .pv-regen {
    font-size: 17px;
  }
  .pv-tip {
    padding: 15px 18px 17px;
  }
  .pv-tip-cap {
    font-size: 0.88rem;
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
  .pv-fill {
    transition: none;
  }
  .pv-hit--on {
    animation: none;
  }
}
</style>
