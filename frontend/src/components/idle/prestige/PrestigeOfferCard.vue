<script setup lang="ts">
/**
 * Eine der drei Karten beim Prestige: wohin es geht und worunter.
 *
 * Universum und Vorsehung stehen auf EINER Karte und nicht in zwei Schritten
 * hintereinander — der Spieler trifft eine Entscheidung, nicht zwei.
 *
 * ── Warum hier fast nichts steht ────────────────────────────────────────────
 * Die Karte trug einmal die Beschreibung des Universums UND die der Vorsehung,
 * beide in 0.7rem. Das las niemand: drei Karten nebeneinander sind ein
 * VERGLEICH, und verglichen werden zwei Zahlen. Alles, was nicht Name oder Zahl
 * ist, stand nur zwischen dem Blick und der Entscheidung. Geblieben sind
 * deshalb: das Wappen, der Name des Universums, der Name der Vorsehung als
 * schmale Zwischenzeile — und die beiden Werte, so gross, dass man sie aus dem
 * Augenwinkel gegeneinander hält.
 *
 * Die Zahl steht dabei ÜBER dem Label und nicht dahinter: „x1.8" ist die
 * Antwort, „Champion DPS" nur die Frage dazu.
 */
import { Icon } from '@iconify/vue'
import { providenceEffectLines, PROVIDENCE_DOMAIN_LABELS } from '@/config/progression/providences'
import { PRESTIGE_CARD_UNIVERSE_ICON_PX } from '@/config/constants'
import type { ProvidenceDef, UniverseConfig } from '@/types'

defineProps<{
  universe: UniverseConfig
  providence: ProvidenceDef
}>()

const emit = defineEmits<{ pick: [] }>()
</script>

<template>
  <button class="po-card" @click="emit('pick')">
    <span class="po-domain">{{ PROVIDENCE_DOMAIN_LABELS[providence.domain] }}</span>

    <!-- WOHIN -->
    <Icon
      :icon="universe.icon"
      :width="PRESTIGE_CARD_UNIVERSE_ICON_PX"
      :height="PRESTIGE_CARD_UNIVERSE_ICON_PX"
      class="po-universe-icon"
      aria-hidden="true"
    />
    <h3 class="po-universe-name">{{ universe.name }}</h3>

    <!-- WORUNTER — schmale Zwischenzeile mit Zierstrichen, damit sie den Namen
         darüber nicht bedrängt und trotzdem als eigene Ebene lesbar bleibt. -->
    <div class="po-prov">
      <span class="po-prov-rule"></span>
      <span class="po-prov-name">{{ providence.name }}</span>
      <span class="po-prov-rule"></span>
    </div>

    <!-- WAS ES BRINGT UND WAS ES KOSTET -->
    <div class="po-effects">
      <div
        v-for="(line, i) in providenceEffectLines(providence)"
        :key="i"
        class="po-effect"
        :class="line.positive ? 'po-effect--up' : 'po-effect--down'"
      >
        <span class="po-value">
          <span class="po-arrow">{{ line.positive ? '▲' : '▼' }}</span>
          {{ line.value }}
        </span>
        <span class="po-label">{{ line.label }}</span>
      </div>
    </div>

    <span class="po-cta">Travel here</span>
  </button>
</template>

<style scoped>
.po-card {
  position: relative;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  padding: 1.6rem 1.1rem 1.1rem;
  text-align: center;
  cursor: pointer;
  background: #1a1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.2s;
}

.po-card:hover {
  background: #241708;
  border-color: #c89040;
  transform: translateY(-3px);
}

/* Die Domäne als Reiter: drei Karten aus drei Systemen sind der Kern des
   Angebots — ohne Beschriftung sähen sie aus wie drei Ziehungen aus einem Topf. */
.po-domain {
  position: absolute;
  top: 0.55rem;
  left: 0.7rem;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: #78c8be;
  text-transform: uppercase;
}

.po-universe-icon {
  margin-bottom: 0.55rem;
  color: #e8c040;
}

.po-universe-name {
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1.1;
  color: #e8c040;
}

.po-prov {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  align-self: stretch;
  margin: 0.75rem 0 1.1rem;
}

.po-prov-rule {
  flex: 1 1 0;
  height: 1px;
  background: #3e2a14;
}

.po-prov-name {
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  color: #a8e0d6;
  white-space: nowrap;
}

/* `margin-top: auto` hält den Vergleichsblock bei allen drei Karten auf
   derselben Höhe, egal wie lang der Name darüber umbricht. */
.po-effects {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-self: stretch;
  margin-top: auto;
}

/* Buff und Debuff tragen ihre Farbe als Kante, nicht als Fläche: drei Karten
   mit je einem grünen und einem roten Kasten wären sechs farbige Flächen auf
   einem Schirm, und keine davon hätte noch Gewicht. */
.po-effect {
  padding: 0.5rem 0.6rem;
  background: rgba(0, 0, 0, 0.32);
  border-left: 3px solid;
  border-radius: 4px;
}

.po-effect--up {
  border-left-color: #52b830;
}

.po-effect--down {
  border-left-color: #cc6050;
}

.po-value {
  display: block;
  font-size: 1.45rem;
  font-weight: 700;
  line-height: 1.1;
}

/* Der Pfeil trägt dieselbe Aussage wie die Farbe — und ist die einzige, die
   auch ohne Farbsehen ankommt. `x0.4` in Grün und `x0.55` in Rot sind sonst
   zwei fast gleich aussehende Zahlen. Klein gesetzt, damit er den Wert nicht
   verdrängt: verglichen wird die Zahl, der Pfeil ordnet sie nur ein. */
.po-arrow {
  font-size: 0.62em;
  vertical-align: 0.16em;
  opacity: 0.85;
}

.po-effect--up .po-value {
  color: #7fc95e;
}

.po-effect--down .po-value {
  color: #d9755f;
}

.po-label {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: #8a7a5c;
  text-transform: uppercase;
}

.po-cta {
  margin-top: 1rem;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  color: #6b5c42;
  text-transform: uppercase;
  transition: color 0.2s;
}

.po-card:hover .po-cta {
  color: #e8c040;
}
</style>
