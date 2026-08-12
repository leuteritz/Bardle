<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import { useGameStore } from '@/stores/core/gameStore'
import { usePersistence } from '@/composables/system/usePersistence'
import { AUGMENTS } from '@/config/economy/augments'
import { augmentIcon } from '@/utils/game/rolledIcons'
import {
  AUGMENT_ACTIVE_CAP,
  AUGMENT_RARITY_COLOR,
  AUGMENT_RARITY_LABEL,
  AUTO_PICK_ICON,
} from '@/config/constants'
import type { AugmentDefinition } from '@/types'

const gameStore = useGameStore()

const { resetGame } = usePersistence()
const handleReset = () => {
  if (window.confirm('Really delete save? This action cannot be undone.')) {
    resetGame()
  }
}

/**
 * Die drei Karten samt ihrem ausgewürfelten Glyph. Der Seed ist der Platz, den
 * die gewählte Karte gleich in `activeAugments` einnimmt — dadurch trägt sie im
 * Augment-Deck später exakt dasselbe Motiv wie hier im Modal.
 */
const options = computed<(AugmentDefinition & { icon: string })[]>(() => {
  const slot = gameStore.activeAugments.length
  return gameStore.pendingAugmentOptions
    .map((id) => AUGMENTS.find((a) => a.id === id))
    .filter((a): a is AugmentDefinition => !!a)
    .map((a) => ({ ...a, icon: augmentIcon(a.id, slot) }))
})

/* Tastatur: 1–3 wählt die Karte an dieser Position, Esc überspringt. Der Listener
   hängt global, greift aber nur solange die Wahl offen ist — sonst würde eine
   gedrückte 1 im laufenden Spiel eine Auswahl auslösen. */
function onKeydown(e: KeyboardEvent) {
  if (!gameStore.pendingAugmentChoice) return
  if (e.key === 'Escape') {
    gameStore.skipAllAugments()
    return
  }
  const index = Number(e.key) - 1
  const pick = options.value[index]
  if (pick) gameStore.chooseAugment(pick.id)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="fade">
    <div
      v-if="gameStore.pendingAugmentChoice"
      class="fixed inset-0 z-[200] flex items-center justify-center rpg-overlay"
    >
      <div class="relative w-full max-w-3xl mx-4 overflow-hidden rpg-frame aug-modal">
        <RpgFrame />
        <div class="rpg-accent-bar"></div>

        <!-- Header -->
        <div class="relative flex items-center justify-center px-5 py-4 rpg-header">
          <div class="text-center">
            <div class="aug-level">Level {{ gameStore.level }}</div>
            <h2 v-ink-center class="aug-title">Choose an Augment</h2>
            <!-- Der Deckel gehört in den Kopf, nicht in einen Tooltip: bei
                 vollem Satz verdrängt die Wahl etwas, und wer das erst danach
                 merkt, hat die Entscheidung nicht getroffen, sondern erlitten. -->
            <div class="aug-slots">
              <template v-if="gameStore.activeAugments.length < AUGMENT_ACTIVE_CAP">
                {{ gameStore.activeAugments.length }} / {{ AUGMENT_ACTIVE_CAP }} attuned
              </template>
              <template v-else>
                {{ AUGMENT_ACTIVE_CAP }} / {{ AUGMENT_ACTIVE_CAP }} attuned — the weakest gives way
              </template>
            </div>
          </div>

          <button class="aug-reset-btn" title="Delete save" @click.stop="handleReset">
            <Icon icon="lucide:trash-2" width="14" height="14" />
          </button>
        </div>

        <!-- Cards -->
        <div class="flex flex-row gap-3 px-5 pt-5 pb-3">
          <button
            v-for="(aug, i) in options"
            :key="aug.id"
            class="aug-card"
            :class="`aug-card--${aug.rarity}`"
            :style="{ '--stagger': `${i * 70}ms`, '--rarity': AUGMENT_RARITY_COLOR[aug.rarity] }"
            @click="gameStore.chooseAugment(aug.id)"
          >
            <span class="aug-key">{{ i + 1 }}</span>

            <!-- Icon-Bühne: Sockel + Ring tragen die Seltenheit -->
            <span class="aug-stage">
              <Icon :icon="aug.icon" width="52" height="52" class="aug-stage__icon" />
            </span>

            <span v-ink-center class="aug-name">{{ aug.name }}</span>
            <span class="aug-rarity">{{ AUGMENT_RARITY_LABEL[aug.rarity] }}</span>

            <!-- Der Effekt ist die eigentliche Entscheidung → größtes Textelement -->
            <span class="aug-effect">{{ aug.effectLine }}</span>
            <span class="aug-desc">{{ aug.description }}</span>

            <span class="aug-select">Select</span>
          </button>
        </div>

        <!-- Footer -->
        <div class="aug-footer">
          <div class="aug-footer__row">
            <button
              class="aug-auto"
              title="Keeps picking one of the three at random on every level-up — no more interruptions"
              @click="gameStore.setAutoPickAugments(true)"
            >
              <Icon :icon="AUTO_PICK_ICON" width="16" height="16" />
              Auto-Pick
            </button>
            <button class="aug-skip" @click="gameStore.skipAllAugments()">Skip</button>
          </div>
          <!-- Der Rückweg gehört neben den Schalter: sonst schaltet der Spieler
               das Fenster ab, in dem der einzige Aus-Knopf stand. -->
          <span class="aug-footer__note">
            Auto-Pick chooses at random from now on — stop it in
            <b>Bard Stats → Augments</b>
          </span>
          <span class="aug-hint">
            <span class="aug-hint__key">1</span>
            <span class="aug-hint__key">2</span>
            <span class="aug-hint__key">3</span>
            to pick · <span class="aug-hint__key">Esc</span> to skip
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Header ──────────────────────────────────────────────────────── */
.aug-level {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
}

.aug-slots {
  margin-top: 2px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7a52;
}

.aug-title {
  font-size: 21px;
  font-weight: 700;
  line-height: 1.15;
  color: #e8c040;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}

/* ── Karte ───────────────────────────────────────────────────────── */
.aug-card {
  /* `--rarity` kommt inline aus AUGMENT_RARITY_COLOR — dieselbe Quelle, aus der
     die Augment-Liste im Bard-Stats-Tab ihre Farben zieht (grau → blau →
     violett → gold). Die gedämpfte Variante für Rahmen und Bänder wird hier
     abgeleitet, damit es nur EINEN Farbwert je Seltenheit im Projekt gibt. */
  --rarity-dim: color-mix(in srgb, var(--rarity) 45%, #14120c);
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 18px 12px 14px;
  background: #16140e;
  border: 2px solid var(--rarity-dim);
  border-radius: 5px;
  cursor: pointer;
  /* Nur transform/opacity animieren — die Karte liegt über dem laufenden Orbit */
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease;
  animation: aug-card-in 0.34s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: var(--stagger);
}

@keyframes aug-card-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}

.aug-card:hover {
  background: #1c1a12;
  border-color: var(--rarity);
  transform: translateY(-3px);
}

.aug-card:active {
  transform: translateY(-1px) scale(0.99);
}


/* ── Tastatur-Ziffer ─────────────────────────────────────────────── */
.aug-key {
  position: absolute;
  top: 7px;
  left: 8px;
  width: 17px;
  height: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  color: #7a6f52;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 3px;
}

.aug-card:hover .aug-key {
  color: var(--rarity);
  border-color: var(--rarity-dim);
}

/* ── Icon-Bühne ──────────────────────────────────────────────────── */
.aug-stage {
  position: relative;
  width: 92px;
  height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--rarity);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--rarity) 22%, #14120c),
    #100e08 72%
  );
  /* Statisch — der Schein wird nie animiert, nur die Karte bewegt sich */
  box-shadow:
    0 0 16px color-mix(in srgb, var(--rarity) 26%, transparent),
    inset 0 0 14px color-mix(in srgb, var(--rarity) 14%, transparent);
  transition: transform 0.16s ease;
}

.aug-card:hover .aug-stage {
  transform: scale(1.06);
}

.aug-stage__icon {
  width: 52px;
  height: 52px;
  color: var(--rarity);
  /* Statischer Schatten — die Bühne wird nur beim Hover skaliert, nie animiert */
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
}

/* Legendary bekommt einen zweiten, atmenden Ring. Der Schein steht statisch im
   Pseudo-Element, animiert wird ausschließlich dessen opacity (Compositor). */
.aug-card--legendary .aug-stage::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid var(--rarity);
  box-shadow: 0 0 18px color-mix(in srgb, var(--rarity) 55%, transparent);
  opacity: 0.3;
  pointer-events: none;
  animation: aug-legendary 2.4s ease-in-out infinite;
}

@keyframes aug-legendary {
  50% {
    opacity: 0.9;
  }
}

/* ── Text ────────────────────────────────────────────────────────── */
.aug-name {
  margin-top: 3px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  color: #f0e6cc;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.aug-rarity {
  padding: 1px 9px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rarity);
  background: color-mix(in srgb, var(--rarity) 13%, transparent);
  border: 1px solid var(--rarity-dim);
  border-radius: 3px;
}

.aug-effect {
  margin-top: 2px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  color: #e8c040;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.aug-desc {
  font-size: 11px;
  line-height: 1.35;
  text-align: center;
  color: #8a8068;
}

/* ── Select ──────────────────────────────────────────────────────── */
.aug-select {
  width: 100%;
  margin-top: auto;
  padding-top: 8px;
  padding-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  color: var(--rarity);
  background: color-mix(in srgb, var(--rarity) 10%, #100e08);
  border: 1px solid var(--rarity-dim);
  border-radius: 4px;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    border-color 0.16s ease;
}

.aug-card:hover .aug-select {
  color: #16140e;
  background: var(--rarity);
  border-color: var(--rarity);
}

/* ── Footer ──────────────────────────────────────────────────────── */
.aug-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding-bottom: 14px;
}

.aug-footer__row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.aug-footer__note {
  font-size: 10.5px;
  line-height: 1.3;
  text-align: center;
  color: #6b6047;
}
.aug-footer__note b {
  font-weight: 700;
  color: #8a7a52;
}

/* Der Auto-Pick ist eine Umschaltung, kein Zug im Spiel → gerahmt und ruhig,
   damit er neben den drei Karten nicht um die Aufmerksamkeit kämpft. */
.aug-auto {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a7a52;
  background: #16140e;
  border: 1px solid #3a2c14;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.aug-auto:hover {
  color: #e8c040;
  background: #1e1a10;
  border-color: #7a5a20;
  transform: translateY(-1px);
}

.aug-auto:active {
  transform: translateY(0) scale(0.97);
}

.aug-skip {
  font-size: 12px;
  color: #7a6f52;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.16s ease;
}
.aug-skip:hover {
  color: #cfc6a8;
}

.aug-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #5e553f;
}

.aug-hint__key {
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 800;
  color: #8a7a52;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 3px;
}

/* ── Save löschen ────────────────────────────────────────────────── */
/* Papierkorb statt ✕: die Aktion löscht den Spielstand, sie schließt nichts. */
.aug-reset-btn {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: linear-gradient(to bottom, #4a1010, #2e0808);
  border: 1.5px solid #8a3020;
  border-radius: 4px;
  color: #cc6050;
  cursor: pointer;
  z-index: 10;
  opacity: 0.35;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    background 0.12s ease,
    border-color 0.12s ease;
}

.aug-reset-btn:hover {
  opacity: 1;
  background: linear-gradient(to bottom, #6a1818, #4a0e0e);
  color: #ff9080;
  border-color: #cc4830;
  transform: translateY(-50%) scale(1.1);
}

.aug-reset-btn:active {
  transform: translateY(-50%) scale(0.9);
}

/* Full HD ist der flachste Referenz-Viewport — dort rückt die Karte enger */
@media (max-height: 1100px) {
  .aug-stage {
    width: 78px;
    height: 78px;
  }
  .aug-stage__icon {
    width: 44px;
    height: 44px;
  }
  .aug-card {
    padding: 14px 10px 12px;
    gap: 6px;
  }
  .aug-effect {
    font-size: 15px;
  }
}

/* Ab 2K würden 768px Modalbreite auf der Fläche verlorengehen — Bühne, Schrift
   und Rahmen wachsen einmalig mit, Full HD bleibt davon unberührt. */
@media (min-width: 2400px) {
  .aug-modal {
    max-width: 960px;
  }
  .aug-stage {
    width: 106px;
    height: 106px;
  }
  .aug-stage__icon {
    width: 60px;
    height: 60px;
  }
  .aug-name {
    font-size: 17px;
  }
  .aug-effect {
    font-size: 18px;
  }
  .aug-desc {
    font-size: 12px;
  }
  .aug-title {
    font-size: 24px;
  }
}

@media (min-width: 3400px) {
  .aug-modal {
    max-width: 1120px;
  }
  .aug-stage {
    width: 124px;
    height: 124px;
  }
  .aug-stage__icon {
    width: 70px;
    height: 70px;
  }
  .aug-name {
    font-size: 19px;
  }
  .aug-effect {
    font-size: 21px;
  }
  .aug-desc {
    font-size: 13px;
  }
  .aug-title {
    font-size: 27px;
  }
}
</style>
