<script setup lang="ts">
/**
 * Der zweite Schritt des Prestige: unter welcher Vorsehung wird das eben
 * gewählte Universum bereist.
 *
 * Bewusst im selben Modal und nicht als eigenes Overlay danach: Universum und
 * Vorsehung ergeben ZUSAMMEN den Charakter des Laufs. Käme die Wahl erst nach
 * dem Reset, hätte der Spieler sein Universum blind gewählt — und die Karte, die
 * seine Wirtschaft färbt, stünde nicht mehr neben der, die seinen Kosmos färbt.
 *
 * Rein darstellend: die Komponente hält keinen Zustand, sie zeigt das Angebot
 * des Stores und meldet den Klick nach oben.
 */
import { Icon } from '@iconify/vue'
import {
  providenceEffectLines,
  PROVIDENCE_DOMAIN_LABELS,
} from '@/config/progression/providences'
import { PROVIDENCE_CARD_ICON_PX, PROVIDENCE_CARD_MIN_WIDTH_PX } from '@/config/constants'
import type { ProvidenceDef } from '@/types'

defineProps<{
  cards: ProvidenceDef[]
  /** Das im ersten Schritt gewählte Ziel — steht als Erinnerung im Kopf. */
  universeName: string
}>()

const emit = defineEmits<{ pick: [id: string]; back: [] }>()

function pick(id: string) {
  emit('pick', id)
}
</script>

<template>
  <div class="prov-step">
    <p class="prov-lead">
      Bound for <span class="prov-lead-target">{{ universeName }}</span
      >. The cosmos offers three roads — one may be walked.
    </p>

    <div
      class="prov-grid"
      :style="{ '--prov-card-min': `${PROVIDENCE_CARD_MIN_WIDTH_PX}px` }"
    >
      <button
        v-for="card in cards"
        :key="card.id"
        class="prov-card"
        @click="pick(card.id)"
      >
        <span class="prov-domain">{{ PROVIDENCE_DOMAIN_LABELS[card.domain] }}</span>

        <Icon
          :icon="card.icon"
          :width="PROVIDENCE_CARD_ICON_PX"
          :height="PROVIDENCE_CARD_ICON_PX"
          class="prov-icon"
          aria-hidden="true"
        />

        <h4 class="prov-name">{{ card.name }}</h4>
        <p class="prov-desc">{{ card.description }}</p>

        <div class="prov-effects">
          <div
            v-for="(line, i) in providenceEffectLines(card)"
            :key="i"
            class="prov-effect"
          >
            <span :class="line.positive ? 'prov-up' : 'prov-down'">
              {{ line.positive ? '▲' : '▼' }}
            </span>
            <span class="prov-effect-text">{{ line.text }}</span>
          </div>
        </div>
      </button>
    </div>

    <div class="prov-actions">
      <button class="prov-back-btn" @click="emit('back')">← Choose another universe</button>
    </div>
  </div>
</template>

<style scoped>
.prov-step {
  padding: 1.5rem;
}

.prov-lead {
  margin-bottom: 1.1rem;
  font-size: 0.85rem;
  color: var(--rpg-text-dim);
  text-align: center;
}

.prov-lead-target {
  color: var(--rpg-gold);
}

.prov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--prov-card-min), 1fr));
  gap: 1rem;
}

.prov-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.1rem 0.9rem 0.9rem;
  text-align: center;
  cursor: pointer;
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.2s;
}

.prov-card:hover {
  background: var(--rpg-bg-hover);
  border-color: #78c8be;
  transform: scale(1.03);
}

/* Die Domäne sitzt als Reiter oben in der Karte: drei Karten aus drei Systemen
   sind der Kern des Angebots — ohne Beschriftung sähen sie aus wie drei
   beliebige Ziehungen aus einem Topf. */
.prov-domain {
  position: absolute;
  top: 0.4rem;
  left: 0.5rem;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: #78c8be;
  text-transform: uppercase;
}

.prov-icon {
  margin-bottom: 0.5rem;
  color: #a8e0d6;
}

.prov-name {
  margin-bottom: 0.35rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--rpg-gold);
}

.prov-desc {
  margin-bottom: 0.75rem;
  font-size: 0.7rem;
  line-height: 1.35;
  color: var(--rpg-text-dim);
}

.prov-effects {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  padding: 0.55rem;
  margin-top: auto;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}

.prov-effect {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.prov-effect-text {
  color: var(--rpg-text-muted);
}

.prov-up {
  color: var(--rpg-green-top);
}

.prov-down {
  color: var(--rpg-red);
}

.prov-actions {
  display: flex;
  justify-content: center;
  margin-top: 1.1rem;
}

.prov-back-btn {
  padding: 0.4rem 1.1rem;
  font-size: 0.8rem;
  color: var(--rpg-text-dim);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.prov-back-btn:hover {
  color: var(--rpg-text-muted);
  border-color: var(--rpg-text-dim);
}
</style>
