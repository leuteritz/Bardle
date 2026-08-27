<template>
  <div v-if="entry && anchor" class="tip frt-card" :style="cardStyle" aria-hidden="true">
    <span class="tip-accent" aria-hidden="true" />

    <div class="tip-head">
      <Icon
        :icon="entry.icon"
        width="20"
        height="20"
        class="tip-ico"
        :style="{ color: entry.color }"
      />
      <span class="tip-name" :style="{ color: entry.color }">{{ entry.name }}</span>
      <span v-if="entry.state === 'maxed'" class="tip-chip">{{ FORGE_TIP_MAX_LABEL }}</span>
    </div>

    <div class="tip-meta">{{ metaLine }}</div>
    <div class="tip-effect">{{ effectText }}</div>

    <!-- Die GABEL von The Wandering. Sie steht nur hier und nicht in der
         Zeile: die Zeile zeigt, was ein Knoten TUT, das Kärtchen, was sein
         Kauf nebenbei zunichtemacht. Eine unwiderrufliche Entscheidung darf
         man nicht erst nach dem Klick erfahren. -->
    <div v-if="forkLine" class="tip-meta frt-fork">{{ forkLine }}</div>
  </div>
</template>

<script setup lang="ts">
/**
 * Was der Zeiger in der Liste streift — und zwar genau das, was die Kachel
 * darunter NICHT zeigt.
 *
 * Der Kopf der Spalte folgte dem Zeiger einmal selbst; seit er die EMPFEHLUNG
 * zeigt, hat die Liste ihren eigenen Weg gebraucht. Dieses Kärtchen ist er.
 *
 * Es trug bis zum Kachel-Umbau vier Zweige: Preis, Wirkungssprung, Sperrgrund
 * samt Balken und die MAX-Marke. Alle vier stehen jetzt gross in der Kachel
 * selbst — hier wären sie dieselbe Zahl in kleinerer Schrift, direkt neben
 * ihrem Original. Übrig bleibt, was in eine Zeile nie gepasst hat: der volle
 * Wortlaut der Wirkung, die Stufe und der Knoten, an dem der Eintrag hängt.
 *
 * Seine GESTALT teilt es mit der Knotenkarte im Netz (`.tip-*` in
 * `rpg-theme.css`): beide beschreiben denselben `ForgeUpgradeEntry`, und der
 * Kreis links und die Zeile rechts sind für den Spieler ein Ding. Zwei
 * Gestalten machten daraus zwei. Der Kopf ist deshalb auch wortgleich — Motiv,
 * Name, und ein Chip nur für die MAX-Marke. Der Rang stand dort einmal als
 * zweiter Chip; er beantwortet keine Frage, die vor dem Kauf gestellt wird.
 *
 * Zwei Regeln tragen es:
 *
 * 1. **`position: fixed`, links NEBEN der Spalte.** Alles, was im Fluss der
 *    Liste läge — eine aufklappende Zeile, ein eingeschobener Block — schöbe
 *    sie beim Erscheinen unter dem Zeiger weg, der Hover ginge aus, das
 *    Kärtchen verschwände, die Liste käme zurück. Genau dieses selbsttragende
 *    Flackern hat den Detailkopf schon einmal unbenutzbar gemacht.
 * 2. **EINE Instanz für die ganze Liste**, nicht eine je Zeile — bei
 *    Vollausbau stünden dort fünfundvierzig.
 *
 * Die Ausrichtung braucht die eigene Höhe NICHT: liegt die Zeile in der oberen
 * Bildhälfte, hängt das Kärtchen an ihrer Oberkante nach unten, sonst an ihrer
 * Unterkante nach oben. So bleibt es im Bild, ohne dass ein zweiter Reflow es
 * erst ausmessen müsste. Das trägt auch die gewachsene Höhe: nach unten fällt
 * sie nur aus der oberen Bildhälfte, nach oben nur aus der unteren.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ForgeUpgradeEntry, ForgeRowTipAnchor } from '@/types'
import { forgeEffectText } from '@/composables/ui/useForgeUpgrades'
import {
  FORGE_TIP_WIDTH_PX,
  FORGE_ROW_TIP_GAP_PX,
  FORGE_TIP_MAX_LABEL,
  FORGE_DETAIL_ENDLESS_META,
  FORGE_DETAIL_PARENT_PREFIX,
  MEEP_FORK_SEALED_PREFIX,
  MEEP_FORK_WARN_PREFIX,
} from '@/config/constants'

/** Die Kanten kommen fertig vom Aufrufer — gemessen wird nie hier. */
const props = defineProps<{
  entry: ForgeUpgradeEntry | null
  anchor: ForgeRowTipAnchor | null
}>()

const cardStyle = computed(() => {
  const a = props.anchor
  if (!a) return {}
  const above = a.top > window.innerHeight / 2
  return {
    '--tip-color': props.entry?.color ?? '',
    left: `${a.left - FORGE_TIP_WIDTH_PX - FORGE_ROW_TIP_GAP_PX}px`,
    top: `${above ? a.bottom : a.top}px`,
    transform: above ? 'translateY(-100%)' : 'none',
  }
})

const effectText = computed(() => (props.entry ? forgeEffectText(props.entry) : ''))

/** „Lv 3 / 6 · hangs on Wayfinder's Cache" — ein Bough trägt `Infinity`. */
const metaLine = computed(() => {
  const e = props.entry
  if (!e) return ''
  const parts = [
    Number.isFinite(e.maxLevel)
      ? `Lv ${e.level} / ${e.maxLevel}`
      : `Lv ${e.level} · ${FORGE_DETAIL_ENDLESS_META}`,
  ]
  if (e.parentName !== '') parts.push(`${FORGE_DETAIL_PARENT_PREFIX}${e.parentName}`)
  return parts.join(' · ')
})

/** „Learning this seals Longnight Watch“ — leer ausserhalb der Gabel. */
const forkLine = computed(() => {
  const rivals = props.entry?.rivals ?? []
  if (rivals.length === 0) return ''
  const names = rivals.map((r) => r.name).join(', ')
  return props.entry?.state === 'sealed'
    ? `${MEEP_FORK_SEALED_PREFIX}${names}`
    : `${MEEP_FORK_WARN_PREFIX}${names}`
})

const tipWidth = `${FORGE_TIP_WIDTH_PX}px`
</script>

<style scoped>
/* Nur die Lage. Alles Sichtbare steht als `.tip-*` global in `rpg-theme.css`,
   dieselbe Gestalt wie am Knoten im Netz. `pointer-events: none` steht dort
   mit und ist nicht Kosmetik: ohne es klaute das Kärtchen den Hover der Zeile,
   die es beschreibt. */
/* Die Gabelzeile trägt Warnfarbe, nicht die Leitfarbe des Knotens: sie sagt,
   was VERLOREN geht, und das ist im Projekt durchgehend rot. */
.frt-fork {
  color: #cc6050;
}

.frt-card {
  position: fixed;
  z-index: 60;
  width: v-bind(tipWidth);
}
</style>
