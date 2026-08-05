<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { BOSS_RAGE_DMG_MULT } from '@/config/constants'
import { useBossFightHud } from '@/composables/orbit/useBossFightHud'
import BossTimerRing from './BossTimerRing.vue'

const props = defineProps<{
  /** Gemeinsamer 4-Hz-Zeitstempel des Modals — Basis aller Ringe und Countdowns. */
  now: number
  /** Boss steht hinter der Sonne — Kampf pausiert. */
  bossBehindSun: boolean
}>()

const {
  activeBoss,
  isGalaxyBoss,
  hpPct,
  starSecsLeft,
  starTimePct,
  starRingCritical,
  starRingColor,
  planetProgress,
  rageActive,
  rageSecsLeft,
  rageRingPct,
  novaSecsLeft,
  novaRingPct,
  novaDmgDisplay,
  autoSecsLeft,
  autoRingPct,
  autoDmgDisplay,
  strikeAimTarget,
} = useBossFightHud(computed(() => props.now))
</script>

<template>
    <div v-if="activeBoss" class="sf-hud">
      <!-- Planeten-Fortschritt des Sterns: wo stehe ich, wie viele gibt es -->
      <div v-if="planetProgress" class="sf-pp">
        <div class="sf-pp-bars" aria-hidden="true">
          <span
            v-for="i in planetProgress.total"
            :key="i"
            class="sf-pp-pip"
            :class="{
              'sf-pp-pip--cleared': i <= planetProgress.cleared,
              'sf-pp-pip--current': i === planetProgress.current,
            }"
          />
        </div>
        <span class="sf-pp-label">
          Planet
          <span class="sf-pp-num">{{ planetProgress.current }}</span>
          <span class="sf-pp-sep">/</span>
          {{ planetProgress.total }}
        </span>
      </div>

      <span v-if="isGalaxyBoss" class="sf-boss-galaxy-badge">✦ GALAXY BOSS ✦</span>
      <div class="sf-name-row">
        <span class="sf-name-line" />
        <span v-ink-center class="sf-boss-name" :class="{ 'sf-boss-name--galaxy': isGalaxyBoss }">
          {{ activeBoss.bossName }}
        </span>
        <span class="sf-name-line" />
      </div>

      <!-- Eclipse-Status: Boss steht hinter der Sonne — kein Kampf,
           Klicks richten keinen Schaden an, Fähigkeiten warten -->
      <Transition name="sf-callout">
        <div v-if="bossBehindSun" class="sf-eclipse-banner">
          <span class="sf-eclipse-banner-line" />
          <div class="sf-eclipse-banner-core">
            <span class="sf-eclipse-banner-title">✦ Behind the Sun ✦</span>
            <span class="sf-eclipse-banner-sub">
              Combat paused — the boss cannot be hit
            </span>
          </div>
          <span class="sf-eclipse-banner-line sf-eclipse-banner-line--right" />
        </div>
      </Transition>
      <div class="sf-hp-row">
        <!-- Star-Despawn-Ring: Restzeit, bis der Stern verschwindet -->
        <BossTimerRing
          v-if="starSecsLeft !== null"
          :secs="starSecsLeft"
          label="SEC"
          :pct="starTimePct / 100"
          :color="starRingColor"
          :pulse="starRingCritical"
          title="Time until the star vanishes"
        />

        <div class="sf-hp-center">
          <div
            class="sf-hp-track"
            :class="{
              'sf-hp-track--critical': hpPct < 25,
              'sf-hp-track--galaxy': isGalaxyBoss,
            }"
          >
            <div class="sf-hp-ghost" :style="{ width: hpPct + '%' }" />
            <div
              class="sf-hp-fill"
              :class="{
                'sf-hp-fill--galaxy': isGalaxyBoss,
                'sf-hp-fill--low': hpPct < 50 && !isGalaxyBoss,
                'sf-hp-fill--critical': hpPct < 25,
              }"
              :style="{ width: hpPct + '%' }"
            />
            <div class="sf-hp-ticks" aria-hidden="true" />
            <div class="sf-hp-inline">
              <span class="sf-hp-numbers">
                {{ formatNumber(activeBoss.currentHP) }}
                <span class="sf-hp-sep">/</span>
                {{ formatNumber(activeBoss.maxHP) }}
              </span>
              <span v-ink-center class="sf-hp-pct" :class="{ 'sf-hp-pct--critical': hpPct < 25 }">
                {{ Math.round(hpPct) }}%
              </span>
            </div>
          </div>

          <!-- Strike-Ziel-Ansage: erscheint, sobald der Ring voll ist
               und der Boss sein Opfer im Visier hat — verschwindet
               mit dem Abschuss -->
          <Transition name="sf-callout" mode="out-in">
            <div v-if="strikeAimTarget" :key="strikeAimTarget" class="sf-strike-next">
              <span class="sf-strike-next-label">Strike</span>
              <span class="sf-strike-next-arrow">→</span>
              <span class="sf-strike-next-name">{{ strikeAimTarget }}</span>
            </div>
          </Transition>
        </div>

        <!-- Strike-Ring: Auto-Attack des Bosses — kurzer Cooldown,
             trifft EIN zufälliges Ziel (Champion, Planet oder Sonne) -->
        <BossTimerRing
          :secs="autoSecsLeft"
          label="STRIKE"
          :pct="autoRingPct"
          color="#d8d0c0"
          :badge="`${autoDmgDisplay} dmg`"
          title="Strike — the boss jabs one random living champion, planet slot or the sun itself"
        />

        <!-- Rage-Ring: Cooldown bis zur nächsten Rage bzw. Restdauer -->
        <BossTimerRing
          :secs="rageSecsLeft"
          label="RAGE"
          :pct="rageRingPct"
          :color="rageActive ? '#ff5c85' : '#ff2e63'"
          :text-color="rageActive ? '#ffb0c4' : undefined"
          :label-color="rageActive ? 'rgba(255, 120, 150, 0.85)' : undefined"
          :pulse="rageActive"
          :intense-glow="rageActive"
          :badge="`×${BOSS_RAGE_DMG_MULT} dmg`"
          badge-color="rgba(255, 92, 133, 0.75)"
          :title="
            rageActive
              ? 'The boss is raging — double damage!'
              : 'Time until the boss enrages'
          "
        />

        <!-- Nova-Ring: Cooldown der Shock Nova — läuft synchron zum
             Ring des Boss-Sterns im Idle-Orbit -->
        <BossTimerRing
          :secs="novaSecsLeft"
          label="NOVA"
          :pct="novaRingPct"
          color="#ff8a30"
          :badge="`${novaDmgDisplay} dmg`"
          title="Shock Nova — the boss unleashes a wave that hits every champion, every planet slot and the sun"
        />
      </div>
    </div>
</template>

<style scoped>
/* ── prefers-reduced-motion ───────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .sf-hp-track--critical,
  .sf-pp-pip--current,
  .sf-eclipse-banner-title {
    animation: none;
  }
}

/* ── Ziel-HUD oben — rahmenlos, verdrängt keinen Platz ───────────────────── */
.sf-hud {
  position: absolute;
  /* nicht mehr am oberen Rand — sitzt auf Höhe der Star-Ringe, näher am Boss */
  top: 58px;
  left: 50%;
  transform: translateX(-50%);
  width: min(860px, 76%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

/* Ring — HP-Bar — Ring: eine Reihe, alle drei vertikal zentriert */
.sf-hp-row {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
}

/* Mittelspalte der HP-Zeile: Leiste + daran hängende Threat-Anzeige */
.sf-hp-row .sf-hp-center {
  position: relative;
  flex: 1;
  min-width: 0;
}

/* ── Planeten-Fortschritt — Segment-Pips + großes Label über der HP-Zeile ── */
.sf-pp {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sf-pp-bars {
  display: flex;
  gap: 6px;
}

.sf-pp-pip {
  width: 28px;
  height: 7px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(120, 60, 10, 0.55);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.7);
}

/* Geschafft: grün gefüllt — gleiche Signatur wie "kaufbar/aktiv" */
.sf-pp-pip--cleared {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border-color: #6ec040;
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.4);
}

/* Aktueller Planet: gold glühend, sanfter Puls */
.sf-pp-pip--current {
  background: linear-gradient(to bottom, #e8c060, #c89040);
  border-color: #e8c040;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.55);
  animation: sf-pp-current-pulse 1.4s ease-in-out infinite alternate;
}

.sf-pp-label {
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(232, 192, 64, 0.85);
  white-space: nowrap;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.sf-pp-num {
  font-size: 1.35rem;
  color: #ffe9b0;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.6),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.sf-pp-sep {
  opacity: 0.5;
  margin: 0 2px;
}

.sf-boss-galaxy-badge {
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  color: rgba(200, 60, 255, 0.85);
  text-transform: uppercase;
  text-shadow:
    0 0 8px rgba(180, 40, 255, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Bossname zwischen dünnen HUD-Klammerlinien */
.sf-name-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
}

.sf-name-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.45));
}

.sf-name-line:last-child {
  background: linear-gradient(to left, transparent, rgba(232, 192, 64, 0.45));
}

.sf-boss-name {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #e8c040;
  text-transform: uppercase;
  text-shadow:
    0 0 18px rgba(232, 192, 64, 0.6),
    0 0 40px rgba(200, 130, 20, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.95);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 78%;
}

.sf-boss-name--galaxy {
  color: #dd99ff;
  text-shadow:
    0 0 18px rgba(200, 100, 255, 0.65),
    0 0 40px rgba(160, 50, 255, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

/* Werte leben jetzt IN der Leiste: Zahlen links, Prozent rechts */
.sf-hp-inline {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 14px;
}

.sf-hp-pct {
  font-size: 1.15rem;
  font-weight: 900;
  color: #ffe9b0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.sf-hp-pct--critical {
  color: #ffb0a8;
  text-shadow:
    0 0 10px rgba(255, 60, 40, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Segment-Ticks alle 10 % — liest sich wie ein Raid-Boss-Balken */
.sf-hp-ticks {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(10% - 1px),
    rgba(0, 0, 0, 0.4) calc(10% - 1px),
    rgba(0, 0, 0, 0.4) 10%
  );
  pointer-events: none;
}

/* ── Epische Boss-HP-Leiste — groß, segmentiert, Werte innenliegend ──────── */
.sf-hp-numbers {
  font-size: 1.05rem;
  font-weight: 900;
  color: #f4ead0;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 8px rgba(0, 0, 0, 0.7);
}

.sf-hp-sep {
  opacity: 0.45;
  margin: 0 4px;
}

.sf-hp-track {
  position: relative;
  width: 100%;
  height: 32px;
  border-radius: 4px;
  background: rgba(6, 3, 0, 0.78);
  border: 1px solid #5c3310;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.8),
    0 0 22px rgba(200, 130, 20, 0.18),
    0 4px 14px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

/* Critical-Puls über opacity eines Pseudo-Glows — animierter box-shadow
   würde die breite HP-Leiste jede Frame neu painten */
.sf-hp-track--critical {
  border-color: #8a2018;
}

.sf-hp-track--critical::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 4px;
  box-shadow: inset 0 0 18px rgba(220, 40, 40, 0.6);
  pointer-events: none;
  animation: sf-hp-crit-pulse 0.7s ease-in-out infinite alternate;
  z-index: 2;
}

.sf-hp-track--galaxy {
  border-color: #5a2478;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.8),
    0 0 22px rgba(160, 40, 220, 0.22),
    0 4px 14px rgba(0, 0, 0, 0.6);
}

/* Ghost-Trail: heller Balken zieht dem echten HP-Stand verzögert hinterher */
.sf-hp-ghost {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(255, 235, 200, 0.3);
  transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.sf-hp-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(to bottom, #58c030 0%, #2e7a1a 55%, #236012 100%);
  transition: width 0.15s ease-out;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.28),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35);
}

.sf-hp-fill--low {
  background: linear-gradient(to bottom, #e8a030 0%, #c07018 55%, #8a5410 100%);
}

.sf-hp-fill--critical {
  background: linear-gradient(to bottom, #ff4030 0%, #c01818 55%, #801010 100%);
  box-shadow:
    0 0 16px rgba(220, 30, 30, 0.55),
    inset 0 2px 0 rgba(255, 140, 120, 0.3),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35);
}

.sf-hp-fill--galaxy {
  background: linear-gradient(to bottom, #c040f0 0%, #8010c0 55%, #58087a 100%);
  box-shadow:
    0 0 16px rgba(180, 40, 255, 0.5),
    inset 0 2px 0 rgba(230, 150, 255, 0.3),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35);
}

/* Banner im HUD: großer Titel + Erklärzeile zwischen goldenen Linien */
.sf-eclipse-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(560px, 88%);
}

.sf-eclipse-banner-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.65));
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.35);
}

.sf-eclipse-banner-line--right {
  background: linear-gradient(to left, transparent, rgba(232, 192, 64, 0.65));
}

.sf-eclipse-banner-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.sf-eclipse-banner-title {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #ffe9b0;
  text-shadow:
    0 0 16px rgba(255, 210, 90, 0.75),
    0 0 36px rgba(232, 150, 30, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
  animation: sf-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

.sf-eclipse-banner-sub {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(232, 192, 64, 0.6);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* ── Strike-Ziel-Ansage unter der HP-Leiste: "STRIKE → NAME" — nur während
   der Anvisier-Phase sichtbar, Crimson passend zur Zielscheibe ────────────── */
.sf-strike-next {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: baseline;
  gap: 9px;
  white-space: nowrap;
  pointer-events: none;
}

.sf-strike-next-label {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 140, 120, 0.75);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.sf-strike-next-arrow {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgba(255, 160, 140, 0.6);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.sf-strike-next-name {
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffd8cc;
  text-shadow:
    0 0 14px rgba(255, 90, 60, 0.7),
    0 0 30px rgba(255, 60, 40, 0.3),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.sf-callout-enter-active {
  animation: sf-callout-in 0.22s ease-out;
}

.sf-callout-leave-active {
  transition: opacity 0.3s ease;
}

.sf-callout-leave-to {
  opacity: 0;
}

/* ── Kompakt-Layout für Full-HD-Höhen (Viewport ≤ 1100px) ─────────────────
   Auf 1080p ist die Arena deutlich flacher als auf 1440p+ — HUD, Boss,
   Loot und Striker skalieren gemeinsam herunter, damit Boss, HP-Leiste
   und dmg/s-Anzeige nicht kollidieren. */
@media (max-height: 1100px) {
  .sf-hud {
    top: 44px;
    gap: 5px;
    width: min(720px, 70%);
  }

  .sf-hp-row {
    gap: 12px;
  }

  /* Ring-Kompaktgrößen: siehe BossTimerRing.vue (eigene max-height-Query) */

  .sf-hp-track {
    height: 24px;
  }

  .sf-hp-inline {
    padding: 0 10px;
  }

  .sf-hp-numbers {
    font-size: 0.85rem;
  }

  .sf-hp-pct {
    font-size: 0.95rem;
  }

  .sf-boss-name {
    font-size: 1.35rem;
  }

  .sf-pp {
    gap: 10px;
  }

  .sf-pp-label {
    font-size: 0.85rem;
  }

  .sf-pp-num {
    font-size: 1.05rem;
  }

  .sf-pp-pip {
    width: 22px;
    height: 6px;
  }
}

@keyframes sf-pp-current-pulse {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

@keyframes sf-hp-crit-pulse {
  from {
    opacity: 0.25;
  }
  to {
    opacity: 1;
  }
}

@keyframes sf-eclipse-breathe {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

@keyframes sf-callout-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(1.25);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}
</style>
