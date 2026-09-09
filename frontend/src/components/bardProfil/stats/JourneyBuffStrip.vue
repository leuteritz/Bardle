<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useActiveBuffList } from '@/composables/ui/useActiveBuffList'
import { DRIFTER_BUFF_EXPIRY_WARN_SEC } from '@/config/constants'

/** Die laufenden Zeiteffekte im Kommandoband. Die dauerhafte Summe steht auf der
 *  Stats-Seite — sie ist Bilanz, kein Ticker. */
const { buffs } = useActiveBuffList()
</script>

<template>
  <section class="jt-strip" aria-label="Active buffs">
    <span v-ink-center class="jt-strip-lbl">
      Running <span class="jt-strip-count">{{ buffs.length }}</span>
    </span>
    <div class="jt-strip-row rpg-scrollbar">
      <span v-if="buffs.length === 0" class="jt-strip-empty">
        <Icon icon="game-icons:hourglass" width="15" height="15" aria-hidden="true" />
        Nothing running
      </span>
      <div
        v-for="b in buffs"
        :key="b.key"
        class="jt-buff"
        :class="{
          'is-expiring': b.timer && b.timer.secondsLeft <= DRIFTER_BUFF_EXPIRY_WARN_SEC,
          'is-ranked': !!b.rankColor,
        }"
        :style="{ '--buff': b.color, '--buff-rank': b.rankColor }"
        v-tip="`${b.name} — ${b.multiplier}× ${b.label}`"
      >
        <span class="jt-buff-icon">
          <img v-if="b.image" :src="b.image" class="jt-buff-art" alt="" aria-hidden="true" />
          <Icon v-else-if="b.icon" :icon="b.icon" class="jt-buff-glyph" aria-hidden="true" />
        </span>
        <span class="jt-buff-text">
          <span class="jt-buff-name">{{ b.name }}</span>
          <span class="jt-buff-label">
            <span class="jt-buff-mult">{{ b.multiplier }}×</span> {{ b.label }}
          </span>
        </span>
        <span v-if="b.timer" class="jt-buff-clock">
          <span class="jt-buff-sec">{{ b.timer.secondsLeft }}</span
          ><span class="jt-buff-unit">s</span>
        </span>
        <span v-else class="jt-buff-clock jt-buff-clock--galaxy">galaxy</span>
        <span v-if="b.timer" class="jt-buff-track" aria-hidden="true">
          <span class="jt-buff-progress" :style="{ transform: `scaleX(${b.timer.progress})` }" />
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Die Kachelreihe rollt waagerecht statt umzubrechen — die Bandhöhe darf nicht am
   Inhalt hängen, sonst nimmt jeder neue Buff der Sonne darunter Durchmesser.
   Deshalb wächst hier auch nichts in der Höhe: die Spur hat 44 px (kompakt 40),
   der Zugewinn dieser Zone ist Breite. */
.jt-strip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.jt-strip-lbl {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7a58;
}
.jt-strip-count {
  font-size: 11px;
  font-weight: 800;
  color: var(--rpg-gold);
}

.jt-strip-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-bottom: 1px;
  overflow-x: auto;
  overflow-y: hidden;
}

.jt-strip-empty {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 0;
  font-size: 12px;
  letter-spacing: 0.05em;
  color: #6b5a34;
  white-space: nowrap;
}

/* ein laufender Effekt: Glyph, Name + Achse, Uhr, Restleiste */
.jt-buff {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 0 0 auto;
  min-width: 0;
  padding: 3px 12px 5px 9px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--buff);
  border-radius: 4px;
  overflow: hidden;
  cursor: help;
}
.jt-buff.is-ranked {
  border-color: var(--buff-rank);
  border-left-color: var(--buff);
}
.jt-buff.is-expiring .jt-buff-sec {
  color: #cc6050;
}

.jt-buff-icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  background: #141410;
  border-radius: 4px;
}
.jt-buff-glyph {
  width: 16px;
  height: 16px;
  color: var(--buff);
}
.jt-buff-art {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.jt-buff-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.jt-buff-name {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.1;
  color: #f0e6c8;
  white-space: nowrap;
}
.jt-buff-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
}
.jt-buff-mult {
  color: var(--buff);
}

.jt-buff-clock {
  flex-shrink: 0;
  margin-left: 4px;
  font-size: 14px;
  font-weight: 900;
  color: var(--rpg-gold);
  /* zwei Stellen reserviert, sonst zuckt der Chip beim Wechsel 10 → 9 */
  min-width: 3.2ch;
  text-align: right;
}
.jt-buff-unit {
  font-size: 10px;
  color: #8a7a58;
}
.jt-buff-clock--galaxy {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7a58;
  min-width: 0;
}

.jt-buff-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: #0d0904;
}
.jt-buff-progress {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--buff);
}

@media (max-height: 1100px) {
  .jt-strip {
    gap: 3px;
  }
  .jt-strip-lbl {
    font-size: 9px;
  }
  .jt-buff {
    padding: 2px 10px 4px 8px;
  }
  .jt-buff-icon {
    width: 20px;
    height: 20px;
  }
}
</style>
