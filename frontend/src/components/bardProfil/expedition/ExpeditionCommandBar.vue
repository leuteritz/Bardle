<script setup lang="ts">
/**
 * Die Kopfleiste des Reiters — EIN durchgehendes Band, keine zwei Zeilen mehr.
 * Ihre Höhe ist GESETZT (`VOYAGE_COMMAND_BAR_H`): `.etc-bar` ist eine auto-Grid-
 * Zeile, was sie nimmt, nimmt sie der Bühne. Die Unterkante IST der Rangbalken.
 *
 * Drei Zonen aus einem Budget: Statussäule · Kartenspur · Aktionssäule.
 *
 * Der Schnitt ist ABLESUNG gegen HANDLUNG. Links steht, was der Spielstand sagt
 * — Rang und die Zeit bis zum nächsten Vertrag, als EIN Objekt: das Siegel
 * trägt den Fortschritt als Ring, die Ziffer und das Rang-Icon; die Uhr steht
 * daneben als grösste Zahl. Zähler, Belohnungssatz und die Haarlinie dazwischen
 * sind gefallen — die beiden ersten leben in `rankTitle` weiter, erreichbar per
 * Maus UND per Tab. Rechts steht nur, was man TUN kann: zwei Kacheln.
 *
 * Die Spur dazwischen trägt eine Karte je EXPEDITION — was läuft, mit wem, und
 * was startbereit ist. Die Zahlen-Ablesungen davor („In field 2/3",
 * „Contracts 4/5") sind ersatzlos entfallen: beides zählt man an den Karten ab.
 *
 * Der Focus-Knopf ist gefallen — die Leiste hat ihren eigenen Griff, und seit
 * die Detailspalte fort ist, ist sie der einzige Rand, den es zu falten gibt.
 * Der Dev-Spawn steht absolut in der Statussäule statt im Fluss:
 * sonst wäre die Reihe im Dev-Build 56 px breiter als beim Spieler.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useNotifyBadgeCount } from '@/composables/ui/useNotifyBadges'
import { buildVoyageFleetCards } from '@/utils/game/voyageFleet'
import { formatMinuteClock, toRoman } from '@/utils/ui/format'
import { getForgeConstellation } from '@/config/progression/starForge'
import {
  VOYAGE_COMMAND_BAR_H,
  VOYAGE_FLEET_ACT_H,
  VOYAGE_FLEET_ACT_W,
  VOYAGE_FLEET_ASIDE_W,
  VOYAGE_FLEET_BAND_GAP,
  VOYAGE_FLEET_BAND_PAD_X,
  VOYAGE_FLEET_RANK_W,
  VOYAGE_RANK_CLOCK_W,
  VOYAGE_RANK_MEDAL_GAP,
  VOYAGE_RANK_MEDAL_PX,
  VOYAGE_RANK_PAD_R,
  VOYAGE_RANK_RING_CIRCUMFERENCE,
  VOYAGE_RANK_RING_R,
  VOYAGE_RANK_RING_STROKE,
  FORGE_MASS_SEND_NODE,
} from '@/config/constants'
import type { VoyageRailRow } from '@/types'
import ExpeditionFleetLane from './ExpeditionFleetLane.vue'

const props = defineProps<{
  now: number
  collectFlashing: boolean
  selectedKey: string | null
  rows: VoyageRailRow[]
}>()
const emit = defineEmits<{
  'collect-all': []
  'send-all': []
  'open-upgrade': []
  open: [galaxy: number, pinKey: string | null]
}>()

const expeditionStore = useExpeditionStore()
const forgeStore = useStarForgeStore()
const isDev = import.meta.env.DEV

const mainH = `${VOYAGE_COMMAND_BAR_H}px`
const rankW = `${VOYAGE_FLEET_RANK_W}px`
const asideW = `${VOYAGE_FLEET_ASIDE_W}px`
const bandPadX = `${VOYAGE_FLEET_BAND_PAD_X}px`
const bandGap = `${VOYAGE_FLEET_BAND_GAP}px`
const actW = `${VOYAGE_FLEET_ACT_W}px`
const actH = `${VOYAGE_FLEET_ACT_H}px`
const medalPx = `${VOYAGE_RANK_MEDAL_PX}px`
const medalGap = `${VOYAGE_RANK_MEDAL_GAP}px`
const rankPadR = `${VOYAGE_RANK_PAD_R}px`
const clockW = `${VOYAGE_RANK_CLOCK_W}px`
const ringCirc = `${VOYAGE_RANK_RING_CIRCUMFERENCE}`
const ringStroke = `${VOYAGE_RANK_RING_STROKE}`
const ringBox = `0 0 ${VOYAGE_RANK_MEDAL_PX} ${VOYAGE_RANK_MEDAL_PX}`
const ringMid = VOYAGE_RANK_MEDAL_PX / 2

const readyCount = useNotifyBadgeCount('expedition')

const ARMADA_NAME = getForgeConstellation(FORGE_MASS_SEND_NODE)?.name ?? 'All Sails at Once'

const rank = computed(() => expeditionStore.ledgerRank)
const nextRank = computed(() => expeditionStore.nextLedgerRank)

/** Fortschritt im LAUFENDEN Rangband, damit der Balken nie bei null neu ansetzt. */
const rankProgress = computed(() => {
  const next = nextRank.value
  if (!next) return 1
  const span = next.required - rank.value.required
  if (span <= 0) return 1
  return Math.min(1, (expeditionStore.ledgerCompleted - rank.value.required) / span)
})

const ringOffset = computed(() => VOYAGE_RANK_RING_CIRCUMFERENCE * (1 - rankProgress.value))

/**
 * Was der nächste Rang aushändigt — nur noch in `rankTitle`. Das Siegel trägt
 * `tabindex`, und `v-tip` hängt an `focusin`: die Karte ist per Tab erreichbar.
 */
const nextRankRewards = computed(() => {
  const next = nextRank.value
  if (!next) return []
  const parts: string[] = []
  if (next.activeSlots > rank.value.activeSlots) {
    parts.push(`+${next.activeSlots - rank.value.activeSlots} field slot`)
  }
  if (next.offerSlots > rank.value.offerSlots) {
    parts.push(`+${next.offerSlots - rank.value.offerSlots} contract`)
  }
  const odds = Math.round((next.chanceBonus - rank.value.chanceBonus) * 100)
  if (odds > 0) parts.push(`+${odds}% odds`)
  return parts
})

/** Der Rangname ist aus dem Bild gefallen — hier bleibt er lesbar. */
const rankTitle = computed(() => {
  const next = nextRank.value
  if (!next) {
    return `${rank.value.name} — highest rank reached, ${expeditionStore.ledgerCompleted} runs`
  }
  return (
    `${rank.value.name} — ${expeditionStore.ledgerCompleted} of ${next.required} runs ` +
    `toward Rank ${toRoman(next.tier)}: ${nextRankRewards.value.join(' · ')}`
  )
})

const timeUntilNextSpawn = computed(() => Math.max(0, expeditionStore.nextSpawnAt - props.now))
const offersFull = computed(
  () => expeditionStore.availableExpeditions.length >= expeditionStore.maxAvailableOffers,
)

/**
 * Die Send-Kachel traegt DREI Zustaende, und der erste ist neu: bis „The Rising
 * Armada" geschmiedet ist, gibt es die Massen-Geste nicht. Sie faellt dabei
 * nicht weg — die Aktionssaeule ist auf 2 x 66 + 10 = VOYAGE_FLEET_ASIDE_W
 * ausgereizt, die Sperre lebt INNERHALB der Kachel.
 */
const sendLocked = computed(() => !forgeStore.expeditionsDepartTogether)

const hasCrewedOffer = computed(() =>
  expeditionStore.availableExpeditions.some((o) => expeditionStore.crewFor(o).every((c) => !!c)),
)

const canSendAll = computed(
  () => !sendLocked.value && expeditionStore.canStartExpedition && hasCrewedOffer.value,
)

/** Der Knopf sagt jetzt, WARUM er tot ist — vorher stand dort immer derselbe Satz. */
const sendTitle = computed(() => {
  if (sendLocked.value) return `${ARMADA_NAME} — fuse it in the Star Forge to send every crewed contract at once`
  if (!expeditionStore.canStartExpedition) return 'No free expedition slot'
  if (!hasCrewedOffer.value) return 'No crewed contract ready to send'
  return 'Send every crewed contract'
})

/** ZEITFREI — die Uhr sieht nur die Karte, nie ihr Platz. */
const cards = computed(() =>
  buildVoyageFleetCards(
    props.rows,
    expeditionStore.availableExpeditions,
    expeditionStore.activeExpeditions,
    {
      projectedReward: expeditionStore.projectedRewardFor,
      seatsOf: (offer) => expeditionStore.crewFor(offer),
      offerOdds: expeditionStore.offerOddsFor,
      canSend: expeditionStore.canStartExpedition,
    },
  ),
)
</script>

<template>
  <header class="ecb">
    <div class="ecb-main">
      <div class="ecb-rank">
        <!-- EIN Objekt: Ring, Rang-Icon und Ziffer liegen übereinander, nichts
             davon steht im Fluss. `tabindex`, damit die Karte samt dem
             Belohnungssatz per Tab aufgeht — `v-tip` hört auf `focusin`. -->
        <div
          class="ecb-seal"
          role="img"
          tabindex="0"
          :aria-label="rankTitle"
          v-tip="rankTitle"
        >
          <svg class="ecb-seal-ring" :viewBox="ringBox" aria-hidden="true">
            <circle class="ecb-seal-track" :cx="ringMid" :cy="ringMid" :r="VOYAGE_RANK_RING_R" />
            <circle
              class="ecb-seal-fill"
              :cx="ringMid"
              :cy="ringMid"
              :r="VOYAGE_RANK_RING_R"
              :transform="`rotate(-90 ${ringMid} ${ringMid})`"
              :style="{ strokeDashoffset: ringOffset }"
            />
          </svg>
          <Icon :icon="rank.icon" width="32" height="32" class="ecb-seal-ico" aria-hidden="true" />
          <span class="ecb-seal-num" aria-hidden="true">{{ toRoman(rank.tier) }}</span>
        </div>

        <!-- Die Zelle hängt am LABEL, nicht an der Zahl: es ist das breitere
             von beiden, also kann die Uhr die Zeile nicht verschieben. -->
        <div class="ecb-next" :class="{ 'is-full': offersFull }">
          <span class="ecb-next-value">{{
            offersFull ? 'FULL' : formatMinuteClock(timeUntilNextSpawn)
          }}</span>
          <span class="ecb-next-label">Next contract</span>
        </div>

        <!-- Absolut: `v-if` darf keine Zone umbauen, sonst sähe die Leiste im
             Dev-Build anders aus als beim Spieler. Rechte Ecke, weil der
             Rangtext linksbündig steht und die Spalte nie ganz füllt. -->
        <button
          v-if="isDev"
          class="ecb-admin"
          v-tip="'Force spawn expedition (dev)'"
          aria-label="Force spawn expedition (dev)"
          @click.stop="expeditionStore.forceSpawn()"
        >
          <Icon icon="ph:lightning-fill" width="15" height="15" />
        </button>
      </div>

      <ExpeditionFleetLane
        :cards="cards"
        :selected-key="selectedKey"
        :now="now"
        @open="(galaxy, pinKey) => emit('open', galaxy, pinKey)"
      />

      <div class="ecb-aside">
        <div class="ecb-acts">
          <!-- Gesperrt ist der Knopf NICHT `disabled`: das verschluckte Klick und
               Titel zugleich, und beides ist hier der Inhalt. -->
          <button
            class="ecb-act ecb-act--send"
            :class="{ 'is-muted': !canSendAll && !sendLocked, 'is-locked': sendLocked }"
            :disabled="!canSendAll && !sendLocked"
            v-tip="sendTitle"
            :aria-label="sendTitle"
            @click.stop="sendLocked ? emit('open-upgrade') : emit('send-all')"
          >
            <Icon icon="ph:tent-fill" width="34" height="34" class="ecb-act-glyph" />
            <template v-if="sendLocked">
              <Icon icon="lucide:lock" width="16" height="16" class="ecb-lock" />
              <span class="ecb-lock-label">Locked</span>
            </template>
          </button>

          <button
            class="ecb-act ecb-act--collect"
            :class="{
              'is-ready': readyCount > 0,
              'is-flashing': collectFlashing,
              'is-muted': readyCount === 0,
            }"
            :disabled="readyCount === 0"
            v-tip="'Collect all completed expeditions'"
            aria-label="Collect all completed expeditions"
            @click.stop="emit('collect-all')"
          >
            <Icon icon="ph:treasure-chest-fill" width="34" height="34" />
            <RpgNotifyBadge :count="readyCount" label="Expedition rewards ready" />
          </button>
        </div>
      </div>
    </div>

    <div class="ecb-progress">
      <div class="ecb-progress-fill" :style="{ transform: `scaleX(${rankProgress})` }" />
    </div>
  </header>
</template>

<style scoped>
.ecb {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1b120a 0%, #16100a 100%);
  border-bottom: 3px solid #5c3310;
}
/* Gesetzte Höhe, kein Padding-Ergebnis — die Aussenhöhe ist gebunden.
   KEIN overflow: die Notify-Plakette steht über der Buttonkante. */
.ecb-main {
  display: flex;
  align-items: center;
  gap: v-bind(bandGap);
  height: v-bind(mainH);
  padding: 0 v-bind(bandPadX);
}

/* ── Statussäule: Siegel UND Uhr, EINE Zeile ────────────────── */
/* Volle Bandhöhe, damit der Dev-Knopf an ihrer Unterkante sitzt. Waagerecht,
   nicht gestapelt: die Haarlinie zwischen Rang und Uhr ist gefallen — sie las
   die beiden als zwei Blöcke, obwohl sie eine Ecke teilen. Die Haarlinie RECHTS
   bleibt, sie gliedert das Band in Ablesung gegen Handlung. */
.ecb-rank {
  position: relative;
  flex: 0 0 v-bind(rankW);
  width: v-bind(rankW);
  height: 100%;
  display: flex;
  align-items: center;
  gap: v-bind(medalGap);
  min-width: 0;
  padding-right: v-bind(rankPadR);
  border-right: 1px solid #3e200a;
}

/* ── Das Rangsiegel ─────────────────────────────────────────── */
/* Drei Ebenen auf einer Fläche: Ring, Icon als gedämpfte Rückschicht, Ziffer.
   Fokussierbar, weil daran die einzige Auskunft über den nächsten Rang hängt. */
.ecb-seal {
  position: relative;
  flex-shrink: 0;
  width: v-bind(medalPx);
  height: v-bind(medalPx);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #1a1208;
  cursor: default;
}
.ecb-seal:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}
/* Fortschrittsring über `stroke-dashoffset`, nie über `conic-gradient`
   (Performance-Regel 11). */
.ecb-seal-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.ecb-seal-track {
  fill: none;
  stroke: #2a1c0e;
  stroke-width: v-bind(ringStroke);
}
.ecb-seal-fill {
  fill: none;
  stroke: #e8c040;
  stroke-width: v-bind(ringStroke);
  stroke-linecap: round;
  stroke-dasharray: v-bind(ringCirc);
  transition: stroke-dashoffset 0.45s ease;
}
/* Es trägt keine Auskunft, die die Ziffer nicht schon trägt — es ist das
   Gesicht des Ranges und wechselt mit ihm. */
.ecb-seal-ico {
  position: absolute;
  color: #e8c040;
  opacity: 0.16;
}
.ecb-seal-num {
  position: relative;
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  color: #e8c040;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.28);
}

/* ── Die Uhr: die grösste Zahl der Säule ────────────────────── */
/* Sie läuft jede Sekunde, der Rang steht tagelang still. Kein Icon mehr — das
   Label sagt dasselbe und steht ohnehin da. */
.ecb-next {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: v-bind(clockW);
  min-width: 0;
}
.ecb-next-value {
  font-size: 45px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
}
.ecb-next.is-full .ecb-next-value {
  color: #e8c040;
}
.ecb-next-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
  white-space: nowrap;
}

/* Der Dev-Spawn. Absolut, damit `v-if` keine Zone umbaut. */
.ecb-admin {
  position: absolute;
  right: 12px;
  bottom: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(200, 144, 64, 0.55);
  background: transparent;
  border: 1px dashed #3e200a;
  border-radius: 4px;
  cursor: pointer;
}
.ecb-admin:hover {
  color: #e8c040;
  border-color: #5c3310;
}

/* ── Aktionssäule: nur Handlungen ───────────────────────────── */
/* Keine Stapelung mehr — die Uhr ist nach links gewandert, also steht hier nur
   eine Reihe, senkrecht zentriert. */
.ecb-aside {
  flex: 0 0 v-bind(asideW);
  width: v-bind(asideW);
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.ecb-acts {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ecb-act {
  position: relative;
  flex-shrink: 0;
  width: v-bind(actW);
  height: v-bind(actH);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  overflow: visible;
  transition:
    background 0.16s ease,
    opacity 0.16s ease;
}
.ecb-act:active {
  transform: scale(0.96);
}
.ecb-act:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}
.ecb-act.is-muted {
  opacity: 0.36;
  cursor: not-allowed;
}
.ecb-act--send {
  color: #f0dca0;
  background: linear-gradient(to bottom, #7a5c20, #5c3e10);
  border: 1px solid #c9a84c;
}
.ecb-act--send:not(.is-muted):not(.is-locked):hover {
  background: linear-gradient(to bottom, #8e6c26, #6c4a14);
}

/* Gesperrt: die geteilte Sperr-Palette des Projekts, nicht die gedaempfte
   Goldkachel — sonst laese sich „noch nichts zu senden" wie „noch nicht
   freigeschaltet". Die Sperre bleibt INNERHALB der 66 x 96. */
.ecb-act--send.is-locked {
  color: #7a6f58;
  background: #1c1c18;
  border: 1px solid #3a3226;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
}
.ecb-act--send.is-locked:hover {
  color: #a89878;
  border-color: #5c3310;
}
.ecb-act--send.is-locked .ecb-act-glyph {
  opacity: 0.4;
}
/* Ueber dem Glyph, nicht auf ihm: Glyph plus Beschriftung stehen mittig im
   Fluss (34 + 6 + 11 in 96), es bleiben oben 22 px. */
.ecb-lock {
  position: absolute;
  top: 4px;
  right: 5px;
  color: #cc6050;
}
.ecb-lock-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: #7a6f58;
}
.ecb-act--collect {
  color: #b8e8cc;
  background: linear-gradient(to bottom, #2a5c3a, #1a3c24);
  border: 1px solid #3e7a52;
}
.ecb-act--collect.is-ready {
  color: #d8fff0;
  background: linear-gradient(to bottom, #2e7a4e, #1e5433);
  border-color: #64dcb4;
}
.ecb-act--collect.is-flashing {
  animation: ecb-flash 0.55s ease;
}
@keyframes ecb-flash {
  0% {
    opacity: 1;
  }
  40% {
    opacity: 0.45;
  }
  100% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ecb-act--collect.is-flashing {
    animation: none;
  }
}

/* ── Rangbalken: die Unterkante der Leiste ──────────────────── */
.ecb-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 3px;
  overflow: hidden;
  pointer-events: none;
}
.ecb-progress-fill {
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #c89040 45%, #e8c060);
  transition: transform 0.45s ease;
}
</style>
