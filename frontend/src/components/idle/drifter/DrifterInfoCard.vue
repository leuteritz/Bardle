<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useHudCardColumn } from '@/composables/ui/useHudCardColumn'
import {
  getDrifter,
  drifterFxStage,
  DRIFTER_BUFF_EFFECT_LABELS,
  DRIFTER_BUFF_LABEL_ALL,
} from '@/config/world/drifters'
import DrifterBody from './DrifterBody.vue'
import type { DrifterBuffEffects } from '@/types'
import { DRIFTER_CARD_ICON, HUD_CARD_PORTRAIT_PX } from '@/config/constants'

/**
 * Was fliegt da gerade, was bringt es, und wie lange ist es noch da — als
 * Fokus der Kartenspalte.
 *
 * Ein Drifter ist nur Sekunden im Bild. Ohne diese Karte müsste man das Objekt
 * erst finden, erkennen und bewerten, bevor man weiß, ob sich der Klick lohnt —
 * bei einem 10-Sekunden-Fenster ist das zu viel verlangt. Genau darum steht sie
 * im Rang der Spalte als `fleeting` VOR dem Omen und vor dem Void auf dem Weg:
 * was Sekunden hat und dann für immer weg ist, bekommt den Aufriss.
 *
 * Sie steht erst, wenn der Körper ganz im Bild ist — nicht beim Spawn. Den
 * Anflug trägt allein der Randping, der dort steht, wo der Drifter hereinzieht.
 * Die Schwelle rechnet `useHudCardColumn`, aus derselben Uhr wie der Countdown.
 */
const { drifterCard } = useHudCardColumn()

const def = computed(() => (drifterCard.value ? getDrifter(drifterCard.value.defId) : undefined))

/** Zweite Zeile der Wirkung: die Dauer des Buffs, falls es einen gibt. */
const buffLine = computed(() => {
  const d = def.value
  if (!d?.buff) return ''
  const keys = Object.keys(d.buff.effects) as (keyof DrifterBuffEffects)[]
  if (keys.length === 0) return ''
  const label = keys.length === 1 ? DRIFTER_BUFF_EFFECT_LABELS[keys[0]] : DRIFTER_BUFF_LABEL_ALL
  const mult = Math.max(...keys.map((k) => d.buff!.effects[k] ?? 1))
  return `${mult}× ${label} · ${Math.round(d.buff.durationMs / 1000)}s`
})

const headline = computed(() => {
  const s = drifterCard.value?.state
  if (s === 'collected') return 'Collected'
  if (s === 'escaped') return 'Drifted away'
  return 'In sight'
})
</script>

<template>
  <div
    v-if="drifterCard && def"
    class="hc dic"
    :class="`dic--${drifterCard.state}`"
    :style="{ '--hc-color': def.color, '--dic-rarity': drifterCard.rarityColor }"
    role="status"
  >
    <!-- Rangstreifen: der Rang oben, die Eigenfarbe links. Zwei Aussagen, zwei
         Kanten. Statisch, nie animiert. -->
    <span class="dic-rank" aria-hidden="true"></span>

    <div class="hc-head">
      <Icon :icon="DRIFTER_CARD_ICON" width="1.05em" height="1.05em" class="hc-glyph dic-glyph" />
      <span class="hc-label">{{ headline }}</span>

      <span
        v-if="drifterCard.state === 'inbound'"
        class="hc-clock"
        :class="{ 'hc-clock--urgent': drifterCard.urgent }"
        :title="`${drifterCard.remainingSeconds}s left to catch it`"
      >
        <span class="hc-clock__num">{{ drifterCard.remainingSeconds }}</span>
        <span class="hc-clock__unit">s</span>
      </span>
      <span
        v-else
        class="hc-mark"
        :class="drifterCard.state === 'collected' ? 'hc-mark--good' : 'hc-mark--bad'"
      >
        {{ drifterCard.state === 'collected' ? '✓' : '✕' }}
      </span>
    </div>

    <div class="hc-main">
      <!-- Die Bühne zeigt den KÖRPER, nicht das Glyph. Das ist der Zweck der
           Karte: sie soll sagen, WONACH man am Himmel sucht, und dafür taugt
           nur die Silhouette, die dort auch wirklich fliegt. -->
      <span class="hc-stage hc-stage--round">
        <span class="dic-body">
          <DrifterBody
            :kind="def.body"
            :color="def.color"
            :motion="drifterFxStage(def.rarity).motion"
            :px="HUD_CARD_PORTRAIT_PX"
            :detail="drifterFxStage(def.rarity).detail"
          />
        </span>
      </span>

      <span class="hc-body">
        <span class="hc-name">{{ def.name }}</span>
        <!-- Der Effekt ist der Grund, warum die Karte existiert — er darf
             umbrechen, aber niemals abgeschnitten werden. -->
        <span class="hc-effect">{{ def.effectLine }}</span>
        <span class="hc-meta">
          <span class="dic-rarity">{{ def.rarity }}</span>
          <template v-if="buffLine">
            <span>·</span>
            <span>{{ buffLine }}</span>
          </template>
        </span>
      </span>
    </div>

    <!-- Mehrstufige Typen sagen an, wie oft noch getroffen werden muss — sonst
         wirkt ein Treffer ohne Belohnung wie ein Fehlklick. -->
    <div v-if="drifterCard.state === 'inbound' && drifterCard.hitsLeft > 0" class="dic-hits">
      <span class="hc-gauge__lbl">Strikes left</span>
      <span class="dic-pips">
        <span
          v-for="i in def.hits"
          :key="i"
          class="dic-pip"
          :class="{ 'dic-pip--done': i <= def.hits - drifterCard.hitsLeft }"
        ></span>
      </span>
    </div>

    <span class="hc-bar">
      <span class="hc-bar__fill" :style="{ transform: `scaleX(${drifterCard.progress})` }"></span>
    </span>
  </div>
</template>

<style scoped>
/* Fläche, Rahmen, Skala und alle Bausteine kommen aus `.hc-*` (rpg-theme.css).
   Hier steht nur, was allein diese Karte hat: der Rangstreifen, der Körper auf
   der Bühne und die Treffer-Pips. */
.dic-rank {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    to right,
    transparent,
    var(--dic-rarity),
    var(--dic-rarity) 70%,
    transparent
  );
  pointer-events: none;
}

.dic-glyph {
  color: var(--hc-mute);
}

.dic-body {
  position: relative;
  width: 72%;
  height: 72%;
}

.dic-rarity {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--dic-rarity);
}

.dic-hits {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.dic-pips {
  display: flex;
  gap: 0.28em;
}

.dic-pip {
  width: 0.62em;
  height: 0.62em;
  border-radius: 50%;
  border: 1px solid var(--hc-well-border);
  background: var(--hc-well);
}

.dic-pip--done {
  border-color: var(--hc-color);
  background: var(--hc-color);
}

/* Der Ausgang schlägt auf die Kante durch. */
.dic--collected {
  --hc-color: #6ec040;
}

.dic--escaped {
  --hc-color: #9a9086;
}
</style>
