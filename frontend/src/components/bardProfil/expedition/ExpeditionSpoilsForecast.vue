<script setup lang="ts">
/**
 * Was diese Reise einbringen kann — und was ein Fehlschlag übrig lässt.
 *
 * Der Lohn kommt aus `expeditionStore.projectedRewardFor`, derselben Rechnung,
 * die `checkExpeditions` auszahlt. Eine zweite Fassung hier löge, sobald jemand
 * ein Glied der Kette ergänzt.
 *
 * Zurückgekehrt zeigt derselbe Rahmen die echte Beute — kein zweites Layout.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { MATERIALS } from '@/config/economy/materials'
import {
  EXPEDITION_SPOILS,
  EXPEDITION_CHANCE_GOOD,
  EXPEDITION_CHANCE_MID,
} from '@/config/constants'
import type { ExpeditionMission } from '@/types'
import ExpeditionSectionHead from './ExpeditionSectionHead.vue'

const props = defineProps<{ mission: ExpeditionMission }>()

const expeditionStore = useExpeditionStore()
const forgeStore = useStarForgeStore()

const done = computed(() => props.mission.status !== 'active')
const success = computed(() => props.mission.status === 'success')

const projected = computed(() => expeditionStore.projectedRewardFor(props.mission))
const spoilsDef = computed(() => EXPEDITION_SPOILS[props.mission.tier ?? 'common'])
const expectedDrops = computed(
  () => spoilsDef.value.materialRolls * spoilsDef.value.materialChance,
)

const odds = computed(() => Math.round(props.mission.successChance * 100))
const oddsClass = computed(() =>
  props.mission.successChance >= EXPEDITION_CHANCE_GOOD
    ? 'is-good'
    : props.mission.successChance >= EXPEDITION_CHANCE_MID
      ? 'is-mid'
      : 'is-poor',
)

/** Materialien, die wirklich heimkamen — Name und Bild aufgelöst. */
const haul = computed(() =>
  (props.mission.spoils?.materials ?? []).map((m) => {
    const def = MATERIALS.find((x) => x.id === m.id)
    return { id: m.id, qty: m.qty, name: def?.name ?? m.id, image: def?.image ?? '' }
  }),
)
</script>

<template>
  <section class="esf">
    <ExpeditionSectionHead
      :label="done ? 'Haul' : 'Forecast'"
      :readout="done ? undefined : `${odds}% odds`"
    />

    <div class="esf-body">
      <template v-if="!done">
        <span class="esf-pair">
          <img
            src="/img/BardAbilities/BardChime-128.png"
            class="esf-chime"
            alt=""
            aria-hidden="true"
          />
          <b class="esf-value">+{{ $formatNumber(projected.success) }}</b>
          <i class="esf-label">on success</i>
        </span>
        <span class="esf-pair esf-pair--dim">
          <b class="esf-value">+{{ $formatNumber(projected.failure) }}</b>
          <i class="esf-label">if lost</i>
        </span>
        <span
          class="esf-chip"
          v-tip="`${spoilsDef.materialRolls} rolls at ${Math.round(spoilsDef.materialChance * 100)}% each`"
        >
          <Icon icon="ph:diamond-fill" width="15" height="15" />≈{{ expectedDrops.toFixed(1) }}
        </span>
        <span v-if="spoilsDef.meep" class="esf-chip" v-tip="'Meep'">
          <Icon icon="game-icons:meeple" width="15" height="15" />×{{ spoilsDef.meep }}
        </span>
        <span v-if="forgeStore.failedExpeditionKeepsMaterials" class="esf-note">
          materials return either way
        </span>
      </template>

      <template v-else>
        <span v-for="m in haul" :key="m.id" class="esf-chip" v-tip="m.name">
          <img :src="m.image" :alt="m.name" class="esf-chip-img" />×{{ m.qty }}
        </span>
        <span v-if="mission.spoils?.meep" class="esf-chip" v-tip="'Meep'">
          <Icon icon="game-icons:meeple" width="15" height="15" />×{{ mission.spoils.meep }}
        </span>
        <span v-if="!haul.length && !mission.spoils?.meep" class="esf-note">
          Nothing came back but the crew.
        </span>
      </template>
    </div>

    <span class="esf-odds" :class="done ? (success ? 'is-good' : 'is-poor') : oddsClass">
      <span
        class="esf-odds-fill"
        :style="{ transform: `scaleX(${done ? 1 : mission.successChance})` }"
      />
    </span>
  </section>
</template>

<style scoped>
.esf {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.esf-body {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 9px;
}
.esf-pair {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
.esf-chime {
  width: 15px;
  height: 15px;
  object-fit: contain;
  align-self: center;
}
.esf-value {
  font-size: 15px;
  font-weight: 800;
  color: #ffd060;
  font-variant-numeric: tabular-nums;
}
.esf-pair--dim .esf-value {
  font-size: 13px;
  color: rgba(204, 96, 80, 0.85);
}
.esf-label {
  font-size: 10px;
  font-weight: 700;
  font-style: normal;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
}
.esf-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 11.5px;
  font-weight: 800;
  color: #a0f0d0;
  background: #141410;
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.esf-chip-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
.esf-note {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.28);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.esf-odds {
  display: block;
  height: 4px;
  background: #111008;
  border: 1px solid rgba(92, 51, 16, 0.55);
  border-radius: 4px;
  overflow: hidden;
}
.esf-odds-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: #52b830;
}
.esf-odds.is-mid .esf-odds-fill {
  background: #e8c040;
}
.esf-odds.is-poor .esf-odds-fill {
  background: #cc6050;
}

@media (max-height: 1250px) {
  .esf-body {
    flex-wrap: nowrap;
    overflow: hidden;
  }
  .esf-value {
    font-size: 13.5px;
  }
}
@media (min-height: 1601px) {
  .esf-value {
    font-size: 18px;
  }
  .esf-chip {
    font-size: 13px;
  }
}
</style>
