<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { HudCardFold } from '@/types'

/**
 * Eine Karte der linken Spalte, zusammengefaltet: Akzentkante, Glyph, Name,
 * die EINE Zahl, eine Haarlinie.
 *
 * Es steht immer genau eine Karte aufgerissen; alles andere kommt hier durch.
 * Vorher stand jede voll da, alle sechs zugleich — gemessen rund 774 px auf
 * einem 1000er Viewport, also über zwei Drittel der Bühne, genau dort, wo der
 * Orbit läuft.
 *
 * Was die Zeile NICHT zeigt, trägt ihr Tooltip. Dafür die vorhandene
 * `.tip-*`-Sprache zu nehmen ist keine siebte Gestalt, sondern genau ihr Zweck.
 */
const props = defineProps<{
  fold: HudCardFold
  /** Nur der Landfall: seine Fläche IST der Griff, auch gefaltet. */
  tap?: () => void
  /**
   * Ein Ausweg, der auch gefaltet erreichbar bleiben muss — heute nur der
   * Not-Aus der Auto-Pick-Quittung.
   *
   * Er steht als Knopf IN der Zeile und nicht in ihrem Tooltip: `.tip` trägt
   * `pointer-events: none`, und die Blase schliesst, sobald der Zeiger den
   * Anker verlässt. Ein Knopf darin wäre nicht zu treffen.
   */
  action?: { title: string; run: () => void }
}>()

function onTap() {
  props.tap?.()
}
</script>

<template>
  <component
    :is="tap ? 'button' : 'div'"
    :type="tap ? 'button' : undefined"
    v-tip="{ text: fold.tipText, label: fold.tipLabel, color: fold.color }"
    class="hc hc--folded"
    :class="{ 'hc--tappable': tap }"
    :style="{ '--hc-color': fold.color }"
    role="status"
    @click="onTap"
  >
    <Icon :icon="fold.icon" class="hc-glyph" width="1.05em" height="1.05em" />
    <span class="hc-fold-name">{{ fold.name }}</span>
    <span
      class="hc-fold-val"
      :class="{
        'hc-fold-val--urgent': fold.urgent,
        'hc-fold-val--good': fold.mark === 'good',
        'hc-fold-val--bad': fold.mark === 'bad',
      }"
    >
      {{ fold.value }}
    </span>

    <button
      v-if="action && !tap"
      type="button"
      class="hc-fold-act"
      :title="action.title"
      @click.stop="action.run()"
    >
      ✕
    </button>

    <span class="hc-line" aria-hidden="true">
      <span class="hc-line__fill" :style="{ transform: `scaleX(${fold.ratio})` }"></span>
    </span>
  </component>
</template>

<style scoped>
/* Die Gestalt kommt vollständig aus `.hc-*` in rpg-theme.css. Hier steht nur,
   was allein diese Zeile weiß: dass eine davon ein Knopf sein kann. */
.hc--tappable {
  cursor: pointer;
}

.hc--tappable:hover {
  background: #241608;
}

.hc-fold-act {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
  padding: 0;
  border: 1px solid #3e2a14;
  border-radius: 3px;
  background: none;
  color: #6a6258;
  font-size: 0.82em;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.hc-fold-act:hover {
  color: #cc6050;
  border-color: #cc6050;
}
</style>
