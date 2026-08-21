<template>
  <div ref="hudEl" class="kb-hud" :class="{ 'kb-hud--in': revealed }" aria-label="Keyboard shortcuts">
    <!-- Der Griff öffnet die vollständige Übersicht; die Keycaps daneben lösen
         ihr Kürzel direkt aus, damit die Leiste auch mit der Maus bedienbar
         bleibt. Deshalb NICHT ein Button um alles herum. -->
    <button
      type="button"
      class="kb-hud__handle"
      :aria-label="`Show all shortcuts (${controlsCap})`"
      @click="openControls"
    >
      <Icon icon="lucide:keyboard" width="16" height="16" aria-hidden="true" />
      <span class="kb-hud__handle-cap">{{ controlsCap }}</span>
    </button>

    <span class="kb-hud__rule" aria-hidden="true" />

    <KeybindChip
      v-for="bind in hudBindings"
      :id="bind.id"
      :key="bind.id"
      :label="labelFor(bind)"
      :lit="isActive(bind.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import KeybindChip from './KeybindChip.vue'
import { useGamePause } from '@/composables/system/useGamePause'
import { useUiStore } from '@/stores/core/uiStore'
import { KEYBINDINGS, KEYBIND_HUD_REVEAL_MS, KEYBIND_RESUME_LABEL } from '@/config/constants'
import type { KeybindDef, KeybindId } from '@/types'

const uiStore = useUiStore()
const { isPaused } = useGamePause()

const hudBindings = computed(() => KEYBINDINGS.filter((b) => b.inHud))
const controlsCap = computed(() => KEYBINDINGS.find((b) => b.id === 'controls')?.cap ?? '?')

/**
 * Zustand einer Keycap: die Pause-Taste leuchtet, solange das Spiel steht —
 * gleich ob per Taste oder durch ein Fenster ohne Fokus.
 */
function isActive(id: KeybindId): boolean {
  return id === 'pause' && isPaused.value
}

function labelFor(bind: KeybindDef): string {
  return bind.id === 'pause' && isPaused.value ? KEYBIND_RESUME_LABEL : bind.label
}

// Die Leiste fährt erst herein, wenn der Spieler angekommen ist — beim Laden
// liegt ohnehin die Rollenwahl über dem Spiel.
const revealed = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Die Leiste belegt die Ankerlinie über dem Command Panel (dieselbe Höhe wie
 * die Signatur-Zeile links). Wer sonst noch dort sitzt, stapelt sich über ihr —
 * dafür veröffentlicht sie ihre gemessene Höhe als CSS-Variable, statt dass die
 * andere Stelle eine Zahl raten müsste. Fällt die Leiste weg, greift der
 * Default 0px und der Anker liegt wieder wie zuvor.
 */
const hudEl = ref<HTMLElement | null>(null)
let sizeObserver: ResizeObserver | null = null

function publishHeight(px: number) {
  document.documentElement.style.setProperty('--kb-hud-h', `${Math.round(px)}px`)
}

onMounted(() => {
  revealTimer = setTimeout(() => {
    revealed.value = true
    revealTimer = null
  }, KEYBIND_HUD_REVEAL_MS)

  if (hudEl.value) {
    publishHeight(hudEl.value.getBoundingClientRect().height)
    // Gemessen wird die Randbox, nicht contentRect: Innenabstand und Rahmen
    // gehören zur Höhe, an der sich die Nachbarn ausrichten.
    sizeObserver = new ResizeObserver(() => {
      if (hudEl.value) publishHeight(hudEl.value.getBoundingClientRect().height)
    })
    sizeObserver.observe(hudEl.value)
  }
})

onUnmounted(() => {
  if (revealTimer !== null) clearTimeout(revealTimer)
  sizeObserver?.disconnect()
  document.documentElement.style.removeProperty('--kb-hud-h')
})

function openControls() {
  uiStore.toggleControls()
}
</script>

<style scoped>
/* Spiegelbild der Signatur-Zeile unten links: gleiche Höhe über dem
   Bottom-Bar-Panel, gleicher Randabstand — die beiden Ecken tragen damit
   dasselbe Gewicht. Und dieselbe Zurückhaltung: kein Kasten, kein Rahmen,
   keine Goldlinie. Die Leiste steht frei über dem Command Panel und tritt erst
   beim Darüberfahren nach vorn; ein zweiter gerahmter Block direkt über der
   Bar-Silhouette hätte wie ein weiteres Panel gelesen.

   Der Chip selbst steht in `KeybindChip.vue` — dieselbe Darstellung trägt die
   Kürzel-Zeile unten links im Forge-Graphen.

   z-index 45 wie Musik-Widget und Enzyklopädie-Reiter: jedes Modal legt sich
   darüber, ohne dass die Leiste sie einzeln kennen muss. */
.kb-hud {
  position: fixed;
  bottom: calc(var(--hud-panel-size, 330px) + 8px);
  right: 0.75rem;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
  /* Einfahren und Zurücktreten laufen über dieselbe Eigenschaft — die
     Ruhe-Deckkraft steht deshalb am eingefahrenen Zustand, nicht hier. */
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 300ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.kb-hud--in {
  opacity: 0.62;
  transform: translateY(0);
}
.kb-hud--in:hover {
  opacity: 1;
}

/* ── Griff: öffnet die Übersicht ──────────────────────── */
.kb-hud__handle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  background: transparent;
  border: none;
  color: #8a7a52;
  cursor: pointer;
  transition: color 140ms ease;
}
.kb-hud__handle:hover {
  color: #e8c040;
}
.kb-hud__handle-cap {
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
}

.kb-hud__rule {
  width: 1px;
  height: 14px;
  background: rgba(122, 78, 32, 0.6);
}

/* Full HD ist der flachste Viewport — dort rückt die Leiste enger zusammen
   (der Schriftgrad der Chips gibt in `KeybindChip.vue` nach). */
@media (max-height: 1100px) {
  .kb-hud {
    gap: 8px;
  }
}
</style>
