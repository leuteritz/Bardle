<template>
  <aside class="cs-detail">
    <template v-if="detail">
      <!-- Clearing the subject leaves the overview card standing in this
           column; there is no list to go BACK to, it never went away. -->
      <div class="cs-detail-nav">
        <button
          v-if="wide"
          class="cs-back-btn"
          title="Clear the selection (Esc)"
          @click="$emit('back')"
        >
          <span class="cs-back-arrow">✕</span>
          Close
        </button>
        <div class="cs-detail-steps">
          <button
            class="cs-nav-btn"
            :disabled="total < 2"
            aria-label="Previous champion"
            @click="$emit('prev')"
          >←</button>
          <span class="cs-nav-pos">{{ index + 1 }} / {{ total }}</span>
          <button
            class="cs-nav-btn"
            :disabled="total < 2"
            aria-label="Next champion"
            @click="$emit('next')"
          >→</button>
        </div>
      </div>

      <!-- Hero — art plus the WHOLE identity: name, then tier, role, traits and
           origin as one chip run directly under it. Split across the corners and
           a section further down, "who is this" took four separate readings. -->
      <div class="cs-detail-hero">
        <img
          :src="detail.image"
          :alt="detail.name"
          class="cs-detail-img rpg-img"
          :class="{ grayscale: detail.locked }"
        />
        <div class="cs-hero-foot">
          <div class="cs-detail-name">{{ detail.name }}</div>
          <div class="cs-hero-chips">
            <span class="cs-hero-chip" :style="{ '--cc': detail.tierColor }">
              ★{{ detail.starLevel }} {{ detail.tierName }}
            </span>
            <span class="cs-hero-chip cs-hero-chip--role" :style="{ '--cc': detail.roleColor }">
              {{ detail.roleLabel }}
            </span>
            <span
              v-for="trait in detail.traits"
              :key="trait.id"
              class="cs-hero-chip"
              :style="{ '--cc': trait.color }"
            >
              <Icon :icon="trait.icon" class="cs-hero-chip-icon" />
              {{ trait.name }}
            </span>
            <!-- Runeterra carries no synergy entry, so the origin can be absent -->
            <span
              v-if="detail.origin"
              class="cs-hero-chip"
              :style="{ '--cc': detail.origin.color }"
            >
              <Icon :icon="detail.origin.icon" class="cs-hero-chip-icon" />
              {{ detail.origin.origin }}
            </span>
          </div>
        </div>
      </div>

      <!-- Info body. It never scrolls: it asks for the height it needs and the
           hero above takes whatever is left. -->
      <div class="cs-detail-body">
        <!-- Tier — its name and stars ride in the hero chip, so what stands here
             is only what does not fit up there. -->
        <div class="cs-block" :style="{ '--ac': detail.tierColor }">
          <Icon :icon="detail.tierIcon" width="22" height="22" class="cs-block-icon" />
          <p class="cs-block-text">{{ detail.tierDescription }}</p>
          <span
            class="cs-spawn"
            :class="{ 'is-locked': detail.spawnPercent == null }"
            title="This tier's current spawn chance"
          >
            {{ spawnLabel }}
          </span>
        </div>

        <!-- Home planet — where the champion is FROM, and for a locked one its
             single actionable fact: that planet has to fall first. Drawn with the
             game's own planet renderer, so the player is looking at the thing they
             have to find in orbit rather than at a word for it. The block's left
             edge carries the state, which is why the step line needs no box. -->
        <div
          v-if="detail.homePlanet"
          class="cs-block cs-home"
          :class="detail.locked ? 'cs-home--locked' : 'cs-home--done'"
        >
          <PlanetGlyph
            :type="detail.homePlanet.type"
            :size="SHOP_HOME_PLANET_GLYPH_SIZE"
            class="cs-home-glyph"
          />
          <div class="cs-home-text">
            <span class="cs-home-name">{{ detail.homePlanet.name }}</span>
            <span class="cs-home-step">
              <Icon
                icon="game-icons:planet-conquest"
                width="15"
                height="15"
                class="cs-home-step-icon"
              />
              {{ homeStepLabel }}
            </span>
          </div>
        </div>

        <!-- Cost breakdown. A locked champion shows it too: the price is fixed, so
             the stock counters double as a farming target long before the champion
             becomes buyable. -->
        <div class="cs-cost" :class="{ 'cs-cost--preview': detail.locked }">
          <div class="cs-cost-label">
            {{ detail.locked ? 'Recruit Cost · once unlocked' : 'Recruit Cost' }}
          </div>
          <div class="cs-detail-rows">
            <div
              v-for="mat in detail.materials"
              :key="mat.id"
              class="cs-mat-row"
              :class="mat.ok ? 'cs-mat-row--ok' : 'cs-mat-row--missing'"
              :style="{ '--cost-c': mat.color }"
            >
              <img :src="mat.image" :alt="mat.name" class="rpg-img cs-mat-img" />
              <span class="cs-mat-name">{{ mat.name }}</span>
              <span class="cs-mat-amount">
                {{ formatNumber(mat.have) }} / {{ formatNumber(mat.need) }}
              </span>
              <span class="cs-mat-state">{{ mat.ok ? '✓' : '✕' }}</span>
              <i class="cs-mat-fill" :style="fillStyle(mat.have, mat.need)"></i>
            </div>
            <div
              class="cs-mat-row"
              :class="detail.chimes.ok ? 'cs-mat-row--ok' : 'cs-mat-row--missing'"
            >
              <img
                src="/img/BardAbilities/BardChime-128.png"
                alt="Chimes"
                class="rpg-img cs-mat-img"
              />
              <span class="cs-mat-name">Chimes</span>
              <span class="cs-mat-amount">
                {{ formatNumber(detail.chimes.have) }} / {{ formatNumber(detail.chimes.need) }}
              </span>
              <span class="cs-mat-state">{{ detail.chimes.ok ? '✓' : '✕' }}</span>
              <i
                class="cs-mat-fill"
                :style="fillStyle(detail.chimes.have, detail.chimes.need)"
              ></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Buy footer -->
      <div class="cs-detail-footer">
        <!-- Seat row: which main seat this recruit takes, and who holds it now.
             The switch is the whole replace flow — asking after the purchase
             would break every buy that is only meant to collect. -->
        <div
          v-if="detail.seat"
          class="cs-seat"
          :class="{ 'cs-seat--open': !detail.seat.occupant, 'cs-seat--armed': armed }"
          :style="{ '--seat-c': detail.seat.roleColor }"
        >
          <Icon :icon="detail.seat.roleIcon" width="20" height="20" class="cs-seat-role" />
          <img
            v-if="detail.seat.occupant"
            :src="detail.seat.occupant.image"
            :alt="detail.seat.occupant.name"
            class="rpg-img cs-seat-face"
            :width="SEAT_PORTRAIT"
            :height="SEAT_PORTRAIT"
          />
          <span class="cs-seat-text">
            <b class="cs-seat-role-label">{{ detail.seat.roleLabel }} seat</b>
            <span class="cs-seat-state">{{ seatText }}</span>
          </span>
          <button
            v-if="canArm"
            type="button"
            class="cs-seat-switch"
            role="switch"
            :aria-checked="takeSeat"
            :aria-label="`Take the ${detail.seat.roleLabel} seat from ${detail.seat.occupant?.name}`"
            @click="$emit('update:takeSeat', !takeSeat)"
          >
            <i class="cs-seat-knob"></i>
            <span>Take seat</span>
          </button>
        </div>
        <button
          class="cs-buy-btn"
          :class="{ 'cs-buy-btn--ready': detail.canBuy }"
          :disabled="!detail.canBuy"
          @click="$emit('buy', detail.name)"
        >
          <!-- the locked button names the ONE thing that changes it -->
          <span v-if="detail.locked">
            <Icon icon="lucide:lock" width="15" height="15" class="cs-buy-lock" />
            {{ lockedButtonLabel }}
          </span>
          <span v-else-if="detail.canBuy">Recruit {{ detail.name }}</span>
          <span v-else>Missing Resources</span>
        </button>
      </div>
    </template>
    <div v-else class="cs-detail-empty">
      <CosmicStageBackground />
      <div class="cs-detail-empty-content">
        <div class="cs-detail-empty-box">
          <Icon
            icon="lucide:mouse-pointer-click"
            width="38"
            height="38"
            class="cs-detail-empty-icon"
          />
        </div>
        <span class="cs-detail-empty-title">Select a Card</span>
        <span class="cs-detail-empty-text">
          Click a champion or item card to view its details and buy it here.
        </span>
      </div>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Icon } from '@iconify/vue'
import CosmicStageBackground from '../../../ui/CosmicStageBackground.vue'
import PlanetGlyph from '../../../ui/PlanetGlyph.vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { SHOP_HOME_PLANET_GLYPH_SIZE, TEAM_SHOP_SEAT_PORTRAIT_SIZE } from '@/config/constants'
import type { ShopChampionDetail } from '@/types'

/**
 * Right-hand detail panel of the Champion Shop — purely presentational.
 * Identity (name, tier, role, traits, origin) rides on the hero; below it the
 * tier note, the home planet and the cost breakdown, then the only Recruit
 * button plus prev/next navigation.
 */
export default defineComponent({
  name: 'ChampionDetailPanel',
  components: { Icon, CosmicStageBackground, PlanetGlyph },
  props: {
    detail: {
      type: Object as () => ShopChampionDetail | null,
      default: null,
    },
    index: { type: Number, default: -1 },
    total: { type: Number, default: 0 },
    /** Standing in the shop's own column rather than over it — shows Close. */
    wide: { type: Boolean, default: false },
    /** Armed seat switch — the recruit replaces whoever holds the role's main seat. */
    takeSeat: { type: Boolean, default: false },
  },
  emits: ['prev', 'next', 'buy', 'back', 'update:takeSeat'],
  setup(props) {
    const spawnLabel = computed(() => {
      const pct = props.detail?.spawnPercent
      return pct != null ? `Spawn ${pct}%` : 'Spawn — locked'
    })

    const homeStepLabel = computed(() => {
      const d = props.detail
      if (!d) return ''
      return d.locked
        ? `Clear its boss in the orbit to bring ${d.name} into the shop.`
        : `Planet rescued — ${d.name} can be recruited.`
    })

    const lockedButtonLabel = computed(() => {
      const planet = props.detail?.homePlanet
      return `Locked · Rescue ${planet ? `a ${planet.name}` : 'its planet'}`
    })

    const fillStyle = (have: number, need: number) => ({
      transform: `scaleX(${need > 0 ? Math.min(1, have / need) : 1})`,
    })

    // Nur ein besetzter Sitz ist eine Entscheidung — ein freier wird ohne
    // Nachfrage besetzt, und ein gesperrter Champion wird gar nicht erst gekauft.
    const canArm = computed(() => !!props.detail?.seat?.occupant && !props.detail?.locked)
    const armed = computed(() => canArm.value && props.takeSeat)

    // Kurz gehalten: die Zeile muss auf Full HD neben dem Schalter auch einen
    // langen Namen wie „Aurelion Sol“ ungekürzt tragen.
    const seatText = computed(() => {
      const seat = props.detail?.seat
      if (!seat) return ''
      if (!seat.occupant) return 'Open — recruit claims it'
      return armed.value ? `${seat.occupant.name} leaves` : `${seat.occupant.name} holds it`
    })

    return {
      formatNumber,
      fillStyle,
      spawnLabel,
      homeStepLabel,
      lockedButtonLabel,
      canArm,
      armed,
      seatText,
      SEAT_PORTRAIT: TEAM_SHOP_SEAT_PORTRAIT_SIZE,
      SHOP_HOME_PLANET_GLYPH_SIZE,
    }
  },
})
</script>

<style scoped>
/* ══ Champion detail panel (right column of the shop) ══
   The column swaps subjects and is never a layer over the grid, so there is one
   width and one set of rules — the old narrow variant had no caller left. */
.cs-detail {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #14100a;
}

/* ── Back + prev / next navigation ── */
.cs-detail-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  flex-shrink: 0;
}
.cs-detail-steps {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.cs-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 11px;
  background: #141410;
  border: 1px solid #7a4e20;
  border-radius: 4px;
  color: #e8c040;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.cs-back-btn:hover {
  background: #241a0c;
  border-color: #c89040;
  color: #f0d870;
}
.cs-back-arrow {
  font-size: 16px;
  line-height: 1;
}
.cs-nav-btn {
  width: 38px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border: 1px solid #7a4e20;
  border-radius: 4px;
  color: #e8c040;
  font-size: 17px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}
.cs-nav-btn:hover:not(:disabled) {
  background: #241a0c;
  border-color: #c89040;
}
.cs-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cs-nav-pos {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #b89a5a;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ── Hero ──
   The one part of the panel that gains from extra room, so it is what absorbs
   it: the body asks for the height it needs, the hero takes the rest. The vh
   clamp that used to stand here guessed at that and was right on the reference
   viewport only. */
.cs-detail-hero {
  position: relative;
  flex: 1 1 auto;
  min-height: 168px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  border-bottom: 2px solid #5c3310;
  background: #111008;
}
.cs-detail-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
/* Bottom-anchored, with room for two chip rows reserved: stepping the list with
   ←/→ then keeps the same window on the art instead of resizing it under every
   champion that carries one trait more than the last.
   The scrim belongs to the FOOT, not to the whole hero — a full-cover gradient
   dimmed the splash everywhere and left barely a readable strip of art in the
   narrow column. `padding-top` is its falloff zone. */
.cs-hero-foot {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  min-height: 122px;
  padding: 36px 18px 14px;
  background: linear-gradient(
    to top,
    rgba(13, 11, 6, 0.96) 0%,
    rgba(13, 11, 6, 0.9) 52%,
    rgba(13, 11, 6, 0.55) 78%,
    transparent 100%
  );
}
.cs-detail-name {
  font-size: 34px;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.97);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
/* Every chip carries its own scrim, so the run holds over a bright splash
   without a plate behind the group. */
.cs-hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.62);
  border: 1px solid var(--cc, #7a4e20);
  color: color-mix(in srgb, var(--cc, #e8c040) 55%, #fff);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.25;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
.cs-hero-chip-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--cc, #e8c040);
}
/* The role reads solid everywhere else in the shop, and the filled block anchors
   the run. */
.cs-hero-chip--role {
  background: var(--cc);
  border-color: var(--cc);
  color: #111008;
  font-weight: 900;
  text-shadow: none;
}

/* ── Info body — never a scrollport ──
   `clip` rather than `hidden`: hidden is a scrollport and can still be moved
   programmatically, clip cannot. */
.cs-detail-body {
  flex: 0 0 auto;
  overflow: clip;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Blocks carry no headline: glyph, accent edge and content say what they are.
   The edge is also where the state lives. */
.cs-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px 11px 15px;
  border-radius: 4px;
  background: #1a170f;
  border: 1px solid #2a2318;
  border-left: 3px solid var(--ac, #7a4e20);
}
.cs-block-icon {
  flex-shrink: 0;
  color: var(--ac, #e8c040);
}
.cs-block-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.42;
  color: #b0a184;
}
.cs-spawn {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #161208;
  background: var(--ac, #e8c040);
  padding: 3px 9px;
  border-radius: 4px;
  line-height: 1.5;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.cs-spawn.is-locked {
  color: #b89a5a;
  background: transparent;
  border: 1px solid #5c3310;
}

/* ── Home planet ──
   Nothing animates: the glyph is the same renderer the orbit uses, and a shop
   panel full of spinning planets is exactly the per-element repaint the orbit
   cannot afford. */
.cs-home--done {
  --ac: #6ec040;
}
.cs-home--locked {
  --ac: #cc6050;
}
.cs-home-glyph {
  flex-shrink: 0;
  /* the planet renderer paints its own light — a plain dark well behind it
     keeps the rings readable on the card */
  border-radius: 4px;
  background: radial-gradient(ellipse at 50% 45%, #16130c, #0c0a06 72%);
}
.cs-home-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.cs-home-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #e8c040;
}
.cs-home-step {
  display: inline-flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--ac);
}
.cs-home-step-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--ac);
}

/* ── Cost ── */
.cs-cost {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
/* The one label left standing: the locked state renames it, so the words carry
   something the rows do not. */
.cs-cost-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b89a5a;
}
/* Cost the player cannot pay yet — same rows, one step quieter, so it reads as
   a target rather than as a transaction. */
.cs-cost--preview .cs-detail-rows {
  opacity: 0.72;
}
.cs-detail-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cs-mat-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1c1c18;
  border: 1px solid color-mix(in srgb, var(--cost-c, #e8c040) 40%, transparent);
  border-radius: 4px;
  padding: 8px 11px;
  overflow: hidden;
}
.cs-mat-row--missing {
  border-color: rgba(204, 96, 80, 0.5);
}
.cs-mat-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex-shrink: 0;
}
.cs-mat-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: #d8d0bc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-mat-amount {
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.cs-mat-row--ok .cs-mat-amount {
  color: var(--cost-c, #e8c040);
}
.cs-mat-row--missing .cs-mat-amount {
  color: #cc6050;
}
.cs-mat-state {
  width: 15px;
  text-align: center;
  font-size: 14px;
  font-weight: 900;
  flex-shrink: 0;
}
.cs-mat-row--ok .cs-mat-state {
  color: #6ec040;
}
.cs-mat-row--missing .cs-mat-state {
  color: #cc6050;
}
/* How far the stock has come. scaleX, not width — the value moves when the store
   moves, and a width would relayout the row on every tick. */
.cs-mat-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  transform-origin: left center;
  background: var(--cost-c, #e8c040);
  opacity: 0.75;
  transition: transform 0.25s ease-out;
}
.cs-mat-row--missing .cs-mat-fill {
  background: #cc6050;
}

/* Buy footer */
.cs-detail-footer {
  padding: 12px 18px 14px;
  border-top: 2px solid #3e200a;
  background: #16120a;
  flex-shrink: 0;
}
/* a full-column button reads as a banner, not as a press */
.cs-buy-btn {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 14px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid #3a3226;
  color: #7a6f58;
  cursor: not-allowed;
}
.cs-buy-btn--ready {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #eaffe0;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.25);
  transition: filter 0.15s ease;
}
.cs-buy-btn--ready:hover {
  filter: brightness(1.12);
}
.cs-buy-btn span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.cs-buy-lock {
  flex-shrink: 0;
  color: #cc6050;
}

/* Seat row — same width as the button beneath it, so both read as one block. */
.cs-seat {
  width: 100%;
  max-width: 420px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid #3a3226;
  border-left: 3px solid var(--seat-c, #7a4e20);
}
.cs-seat--open {
  border-color: #3f6b28;
  border-left-color: var(--seat-c, #7a4e20);
}
.cs-seat--armed {
  background: #1a2414;
  border-color: #6ec040;
  border-left-color: var(--seat-c, #7a4e20);
}
.cs-seat-role {
  flex-shrink: 0;
  color: var(--seat-c, #e8c040);
}
.cs-seat-face {
  flex-shrink: 0;
  border-radius: 3px;
  border: 1px solid var(--seat-c, #7a4e20);
  object-fit: cover;
}
.cs-seat-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}
.cs-seat-role-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--seat-c, #e8c040);
}
.cs-seat-state {
  font-size: 12px;
  color: #b8ab90;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cs-seat--open .cs-seat-state {
  color: #a8d98a;
}
.cs-seat--armed .cs-seat-state {
  color: #eaffe0;
}
/* The switch is the entire replace flow — off by default, one press wide. */
.cs-seat-switch {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #141410;
  border: 1px solid #3a3226;
  color: #9a8f78;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.cs-seat-switch:hover {
  border-color: #5c3310;
  color: #c8b894;
}
.cs-seat-knob {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #3a3226;
  transition: background 0.12s ease;
}
.cs-seat--armed .cs-seat-switch {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border-color: #6ec040;
  color: #eaffe0;
}
.cs-seat--armed .cs-seat-knob {
  background: #eaffe0;
}

/* Empty state — no champion selected yet. Sits on the shared cosmic starfield
   (CosmicStageBackground paints absolutely inside; content stays above it). */
.cs-detail-empty {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #111008;
  overflow: hidden;
}
.cs-detail-empty-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.cs-detail-empty-box {
  width: 84px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 20, 16, 0.85);
  border: 2px dashed #5c3310;
  border-radius: 4px;
  margin-bottom: 4px;
}
.cs-detail-empty-icon {
  color: #c89040;
  /* Periodic "tap": a short press-down with a gold flash, then a long rest —
     reads as "click here" instead of a generic pulse. */
  animation: cs-empty-tap 3.2s ease-in-out infinite;
}
.cs-detail-empty-title {
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #e8c040;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
}
.cs-detail-empty-text {
  max-width: 230px;
  font-size: 12.5px;
  line-height: 1.5;
  color: #a08c68;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}
@keyframes cs-empty-tap {
  0%,
  78%,
  100% {
    transform: translate(0, 0) scale(1);
    filter: drop-shadow(0 0 0 rgba(232, 192, 64, 0));
  }
  84% {
    transform: translate(1px, 3px) scale(0.9);
    filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.55));
  }
  92% {
    transform: translate(0, 0) scale(1.04);
    filter: drop-shadow(0 0 10px rgba(232, 192, 64, 0.35));
  }
}
@media (prefers-reduced-motion: reduce) {
  .cs-detail-empty-icon {
    animation: none;
  }
}

/* Compact layout on flatter viewports (Full HD). The hero height is NOT here —
   that one settles itself, see .cs-detail-hero. */
@media (max-height: 1100px) {
  .cs-detail-name {
    font-size: 30px;
  }
  .cs-hero-foot {
    min-height: 110px;
    gap: 7px;
    padding: 32px 16px 12px;
  }
  .cs-detail-body {
    gap: 10px;
    padding: 13px 16px;
  }
  .cs-block {
    padding: 9px 12px 9px 14px;
  }
}
</style>
