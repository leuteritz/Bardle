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
      <Icon icon="ph:heart-fill" width="18" height="18" class="pv-heart" aria-hidden="true" />

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

    <template #tip>
      <div class="pv-tip">
        <header class="pv-tip-head">
          <span class="pv-tip-title">Sun Vitality</span>
          <span class="pv-tip-pct">{{ Math.round(playerStore.hpPercent) }}%</span>
        </header>
        <p class="pv-tip-note">
          The cosmos keeps turning while this menu is open — damage lands and the sun mends
          whether or not you are watching.
        </p>
        <dl class="pv-tip-lines">
          <dt>Regeneration</dt>
          <dd>{{ $formatNumber(regen) }} / s</dd>
          <dt>Damage taken</dt>
          <dd>{{ $formatNumber(playerStore.totalDamageTaken) }}</dd>
          <dt>Restored</dt>
          <dd>{{ $formatNumber(Math.round(playerStore.totalHpRegenerated)) }}</dd>
          <dt>Times burned out</dt>
          <dd>{{ playerStore.timesDowned }}</dd>
          <template v-if="forgeStore.sunReprieveOwned">
            <dt>Warden's Reprieve</dt>
            <dd :class="reprieveReady ? 'pv-tip-ok' : 'pv-tip-spent'">
              {{ reprieveReady ? 'Ready' : 'Spent this phase' }}
            </dd>
          </template>
        </dl>
      </div>
    </template>
  </RpgBadgeTooltip>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { HP_CRIT_PERCENT, HP_HEALTHY_PERCENT, PLAYER_HP_HIT_FLASH_MS } from '@/config/constants'

const playerStore = usePlayerStore()
const forgeStore = useStarForgeStore()
const solarStore = useSolarUpgradeStore()

/** Kein eigener Ticker: `currentHP` ändert sich im Sekundentakt des Spiels und
 *  ist reaktiv — Vue rendert die Zeile von selbst. */
const hpRatio = computed(() => Math.min(1, Math.max(0, playerStore.hpPercent / 100)))

const regen = computed(() => Math.round(playerStore.regenPerSec * 10) / 10)

/** Dieselben Umschlagpunkte wie der Vitalitäts-Strip des Pause-Overlays —
 *  zwei Anzeigen desselben Werts dürfen nicht bei verschiedenen Anteilen
 *  die Farbe wechseln. */
const stateClass = computed(() => {
  if (playerStore.hpPercent > HP_HEALTHY_PERCENT) return 'pv--green'
  if (playerStore.hpPercent > HP_CRIT_PERCENT) return 'pv--yellow'
  return 'pv--red'
})

const reprieveReady = computed(() => playerStore.reprieveUsedInPhase !== solarStore.starPhase)

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
   vom Herzen links und der gemeinsamen Grundlinie. */
.pv-cluster {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  /* Abstand zur Holzecke des RpgFrame, die über dem Kopf liegt. */
  padding: 0 6px 0 18px;
  cursor: default;
}

.pv-heart {
  flex-shrink: 0;
  color: #cc2010;
  /* Statisch, kein Dauerläufer — der Schein rastert genau einmal. */
  filter: drop-shadow(0 0 6px rgba(220, 40, 18, 0.55));
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
  gap: 3px;
  min-width: 0;
}

.pv-line {
  display: flex;
  align-items: baseline;
  gap: 4px;
  line-height: 1;
}

/* Der laufende Wert bekommt eine Breitenreserve: ohne sie rückt die ganze
   Zeile jedes Mal seitwärts, wenn aus „12.4K" ein „9.8K" wird — im Augenwinkel
   neben den Reitern ist genau das das Störende. */
.pv-cur {
  min-width: 5.4ch;
  font-size: 15px;
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
  font-size: 12px;
  font-weight: 400;
  color: #7a5820;
}

.pv-max {
  font-size: 12px;
  font-weight: 800;
  color: #8a7a52;
  font-variant-numeric: tabular-nums;
}

/* Die Regeneration ist die zweite Aussage der Zeile und tritt zurück: sie sagt,
   in welche Richtung sich der Wert davor bewegt, wenn nichts trifft. */
.pv-regen {
  margin-left: 3px;
  font-size: 11px;
  font-weight: 800;
  color: #6e9a54;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Die Leiste ───────────────────────────────────────────────────────────
   Track und Segmentlinien im Rezept der PlayerHPBar, damit beide Anzeigen
   derselben Zahl auch gleich gelesen werden. */
.pv-track {
  position: relative;
  width: 148px;
  height: 6px;
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

/* ── Tooltip ──────────────────────────────────────────────────────────── */
.pv-tip {
  padding: 9px 12px 11px;
}

.pv-tip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.pv-tip-title {
  font-size: 0.95rem;
  font-weight: 900;
  color: #e8c040;
}

.pv-tip-pct {
  font-size: 0.85rem;
  font-weight: 900;
  color: #b89b5a;
  font-variant-numeric: tabular-nums;
}

.pv-tip-note {
  margin: 0 0 8px;
  font-size: 0.78rem;
  font-weight: 400;
  line-height: 1.35;
  color: #a89a74;
}

.pv-tip-lines {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 12px;
  margin: 0;
  padding-top: 7px;
  border-top: 1px solid #2e2416;
}

.pv-tip-lines dt {
  font-size: 0.76rem;
  font-weight: 700;
  color: #8a7a52;
  white-space: nowrap;
}

.pv-tip-lines dd {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 800;
  color: #ded0a6;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pv-tip-ok {
  color: #7a9a6a;
}
.pv-tip-spent {
  color: #8a7a52;
}

/* ── Auflösungsstufen ─────────────────────────────────────────────────────
   Full HD ist der flachste Viewport: dort ist der Kopfstreifen am engsten und
   die Leiste gibt Breite ab, bevor der Cluster die Reiter drängt. */
@media (max-height: 1100px) {
  .pv-track {
    width: 118px;
  }
  .pv-cur {
    font-size: 14px;
  }
}

@media (min-width: 2400px) {
  .pv-track {
    width: 176px;
    height: 7px;
  }
  .pv-cur {
    font-size: 17px;
  }
  .pv-max,
  .pv-regen {
    font-size: 13px;
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
