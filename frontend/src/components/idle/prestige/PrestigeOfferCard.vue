<script setup lang="ts">
/**
 * Eine der drei Karten beim Prestige: wohin es geht und worunter.
 *
 * Universum und Vorsehung stehen bewusst auf EINER Karte und nicht in zwei
 * Schritten hintereinander. Vorher wählte der Spieler erst den Ort und dann,
 * blind für dessen Wirkung, die Bedingung; jetzt ist beides eine Entscheidung —
 * und die Karte kann zeigen, was sie zusammen bedeuten.
 *
 * Die Hierarchie folgt der Frage: WOHIN (Wappen, Name) steht oben und gross,
 * WORUNTER (Vorsehung, Domäne) darunter, WAS ES KOSTET (Plus und Minus) im
 * abgesetzten Block am Fuss — das ist die Zeile, an der der Spieler vergleicht,
 * und sie liegt bei allen drei Karten auf derselben Höhe.
 */
import { Icon } from '@iconify/vue'
import {
  providenceEffectLines,
  PROVIDENCE_DOMAIN_LABELS,
} from '@/config/progression/providences'
import { PROVIDENCE_CARD_ICON_PX, PROVIDENCE_CHIP_ICON_PX } from '@/config/constants'
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
      :width="PROVIDENCE_CARD_ICON_PX"
      :height="PROVIDENCE_CARD_ICON_PX"
      class="po-universe-icon"
      aria-hidden="true"
    />
    <h3 class="po-universe-name">{{ universe.name }}</h3>
    <p class="po-universe-desc">{{ universe.description }}</p>

    <div class="po-rule"></div>

    <!-- WORUNTER -->
    <div class="po-prov-head">
      <Icon
        :icon="providence.icon"
        :width="PROVIDENCE_CHIP_ICON_PX"
        :height="PROVIDENCE_CHIP_ICON_PX"
        class="po-prov-icon"
        aria-hidden="true"
      />
      <span class="po-prov-name">{{ providence.name }}</span>
    </div>
    <p class="po-prov-desc">{{ providence.description }}</p>

    <!-- WAS ES KOSTET -->
    <div class="po-effects">
      <div v-for="(line, i) in providenceEffectLines(providence)" :key="i" class="po-effect">
        <span :class="line.positive ? 'po-up' : 'po-down'">
          {{ line.positive ? '▲' : '▼' }}
        </span>
        <span class="po-effect-text">{{ line.text }}</span>
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
  padding: 1.4rem 1rem 1rem;
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
  background: #221608;
  border-color: #c89040;
  transform: translateY(-3px);
}

/* Die Domäne als Reiter: drei Karten aus drei Systemen sind der Kern des
   Angebots — ohne Beschriftung sähen sie aus wie drei Ziehungen aus einem Topf. */
.po-domain {
  position: absolute;
  top: 0.5rem;
  left: 0.6rem;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: #78c8be;
  text-transform: uppercase;
}

.po-universe-icon {
  margin-bottom: 0.5rem;
  color: #e8c040;
}

.po-universe-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: #e8c040;
}

.po-universe-desc {
  margin-top: 0.15rem;
  font-size: 0.7rem;
  color: #8a7a5c;
}

.po-rule {
  width: 70%;
  height: 1px;
  margin: 0.85rem 0;
  background: linear-gradient(to right, transparent, #5c3310, transparent);
}

.po-prov-head {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  justify-content: center;
}

.po-prov-icon {
  color: #a8e0d6;
}

.po-prov-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #a8e0d6;
}

.po-prov-desc {
  margin-top: 0.3rem;
  margin-bottom: 0.85rem;
  font-size: 0.7rem;
  line-height: 1.35;
  color: #8a7a5c;
}

/* `margin-top: auto` hält den Vergleichsblock bei allen drei Karten auf
   derselben Höhe, egal wie lang die Beschreibung darüber ausfällt. */
.po-effects {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
  padding: 0.6rem;
  margin-top: auto;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #3e2a14;
  border-radius: 4px;
}

.po-effect {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
}

.po-effect-text {
  color: #a99b83;
}

.po-up {
  color: #52b830;
}

.po-down {
  color: #cc6050;
}

.po-cta {
  margin-top: 0.8rem;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: #6b5c42;
  text-transform: uppercase;
  transition: color 0.2s;
}

.po-card:hover .po-cta {
  color: #e8c040;
}
</style>
