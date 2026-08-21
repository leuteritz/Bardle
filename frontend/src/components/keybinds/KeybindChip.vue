<template>
  <button
    type="button"
    class="kb-chip"
    :class="{ 'kb-chip--lit': lit }"
    :aria-label="`${text} (${cap})`"
    @click="triggerKeybind(id)"
  >
    <KeyCap :cap="cap" :size="size" :pressed="flashing" :lit="lit" />
    <span class="kb-chip__label">{{ text }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Ein Kürzel, so wie das Spiel es überall zeigt: Keycap, Versalien-Label,
 * kein Kasten — und ein Klick löst dasselbe aus wie die Taste.
 *
 * Cap und Beschriftung kommen aus KEYBINDINGS, die Aufrufseite reicht nur die
 * ID. Zwei Stellen zeigen ihn: die schwebende Leiste über dem Command Panel
 * und die Zeile unten links im Forge-Graphen.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import KeyCap from './KeyCap.vue'
import { triggerKeybind, useKeybindings } from '@/composables/system/useKeybindings'
import { KEYBINDINGS, KEYBIND_FLASH_MS } from '@/config/constants'
import type { KeybindId } from '@/types'

const props = withDefaults(
  defineProps<{
    id: KeybindId
    /** Überschreibt die Beschriftung der Registry — Pause zeigt „Resume". */
    label?: string
    /** true hebt Taste und Label dauerhaft hervor (Pause an, Kamera verschoben). */
    lit?: boolean
    size?: 'sm' | 'md'
  }>(),
  { label: undefined, lit: false, size: 'sm' },
)

const bind = computed(() => KEYBINDINGS.find((b) => b.id === props.id))
const cap = computed(() => bind.value?.cap ?? '?')
const text = computed(() => props.label ?? bind.value?.label ?? '')

// Dieselbe Rückmeldung für Tastendruck und Mausklick, weil beide über
// `triggerKeybind` laufen.
const { lastTriggered } = useKeybindings()
const flashing = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

watch(lastTriggered, (hit) => {
  if (hit?.id !== props.id) return
  flashing.value = true
  if (flashTimer !== null) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashing.value = false
    flashTimer = null
  }, KEYBIND_FLASH_MS)
})

onUnmounted(() => {
  if (flashTimer !== null) clearTimeout(flashTimer)
})
</script>

<style scoped>
.kb-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
.kb-chip:hover {
  transform: translateY(-1px);
}
/* Ohne Kasten dahinter trägt der Text seinen Kontrast selbst — ein statischer
   Schatten, damit die Zeile auch über einem hellen Nebel lesbar bleibt. */
.kb-chip__label {
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
  color: #b8a878;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  transition: color 160ms ease;
}
.kb-chip:hover .kb-chip__label,
.kb-chip--lit .kb-chip__label {
  color: #e8c040;
}

/* Full HD ist der flachste Viewport — dort gibt der Schriftgrad nach. */
@media (max-height: 1100px) {
  .kb-chip__label {
    font-size: 0.8rem;
  }
}
</style>
