<script setup lang="ts">
/**
 * The one search bar of the game.
 *
 * Every filter field — Champion Shop, Champion Select, Champion Picker, Team
 * Synergies, Role Selection, Encyclopedia and the three Bard-Stats columns —
 * used to carry its own copy of "magnifier + input + clear button", three of
 * them with their own colors and without a clear button at all. This component
 * is that markup, once: the Champion Shop's look is the reference.
 *
 * The wrapper is the field (border, background, focus glow); the input itself
 * is transparent and simply flexes inside it. That is what lets the optional
 * `trailing` slot (Ctrl-K hint, result counter) sit *inside* the field next to
 * the clear button instead of being absolutely positioned over the input.
 *
 * Layout is deliberately NOT set here: the component brings no `flex`/`width`
 * of its own, so each call site keeps sizing it through the class it passes.
 */
import { computed, ref, useSlots } from 'vue'
import { Icon } from '@iconify/vue'
import { SEARCH_BAR_ICON_PX } from '@/config/constants'

const props = withDefaults(
  defineProps<{
    /** v-model — the current query. */
    modelValue: string
    placeholder?: string
    /** `md` = the 46px Champion-Shop bar, `sm` = the 34px compact one. */
    size?: 'md' | 'sm'
    /** Falls back to the placeholder, which already describes the field. */
    ariaLabel?: string
    /** Set where the field toggles a filter panel below it. */
    ariaExpanded?: boolean
  }>(),
  { placeholder: 'Search…', size: 'md', ariaLabel: undefined, ariaExpanded: undefined },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** Clear button pressed — the query is already emptied when this fires. */
  clear: []
  focus: []
  blur: []
  escape: []
}>()

const slots = useSlots()
const inputRef = ref<HTMLInputElement | null>(null)

const hasValue = computed(() => props.modelValue.length > 0)
const iconPx = computed(() => SEARCH_BAR_ICON_PX[props.size])

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function clear(): void {
  emit('update:modelValue', '')
  emit('clear')
}

/* Call sites that focus the field from the outside (Ctrl+K in the Encyclopedia,
   tapping the morphing Role-Selection header) reach the input through these. */
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})
</script>

<template>
  <div class="sb" :class="[`sb--${size}`, { 'sb--filled': hasValue }]">
    <Icon
      icon="lucide:search"
      class="sb-icon"
      :width="iconPx"
      :height="iconPx"
      aria-hidden="true"
    />
    <input
      ref="inputRef"
      class="sb-input"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :aria-label="ariaLabel ?? placeholder"
      :aria-expanded="ariaExpanded"
      @input="onInput"
      @focus="emit('focus')"
      @blur="emit('blur')"
      @keydown.escape.prevent="emit('escape')"
    />
    <!-- Stays mounted while empty so the field width never jumps when the
         first character is typed -->
    <button
      class="sb-clear"
      :class="{ 'sb-clear--visible': hasValue }"
      type="button"
      aria-label="Clear search"
      @click="clear"
      @keydown.enter.prevent="clear"
      @keydown.space.prevent="clear"
    >
      <Icon icon="lucide:x" width="1.15em" height="1.15em" aria-hidden="true" />
    </button>
    <span v-if="slots.trailing" class="sb-trailing">
      <slot name="trailing" />
    </span>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   Shared search bar — the Champion Shop's field, extracted.
   The wrapper carries border, fill and focus state; the input is
   transparent inside it.
══════════════════════════════════════════════════════════════ */
.sb {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid #5c3310;
  border-radius: var(--bp-radius);
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
}
.sb:hover {
  border-color: #7a4e20;
}
.sb:focus-within {
  border-color: #c89040;
  background: rgba(0, 0, 0, 0.45);
  box-shadow: 0 0 8px rgba(200, 144, 64, 0.3);
}

.sb-icon {
  flex-shrink: 0;
  color: #8a6030;
  pointer-events: none;
  transition: color 0.15s;
}
.sb:focus-within .sb-icon {
  color: #c89040;
}

.sb-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #e8d8b0;
  background: transparent;
  border: none;
  outline: none;
}
.sb-input::placeholder {
  color: #7a6040;
  font-weight: 500;
}

/* Hidden until there is something to clear, but always holding its box */
.sb-clear {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--bp-radius);
  color: rgba(122, 80, 32, 0);
  opacity: 0;
  transform: scale(0.7);
  pointer-events: none;
  cursor: pointer;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}
.sb-clear--visible {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
  color: rgba(200, 144, 64, 0.55);
}
.sb-clear--visible:hover {
  color: #e8c040;
  background: rgba(122, 80, 32, 0.18);
}
.sb-clear--visible:focus-visible {
  outline: 1px solid #c89040;
  outline-offset: -2px;
}

/* Ctrl-K hint / result counter — sits inside the field, right of the clear button */
.sb-trailing {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}

/* ─── Default size: the Champion Shop bar ─── */
.sb--md {
  height: 46px;
  gap: 8px;
  padding: 0 8px 0 12px;
}
.sb--md .sb-input {
  font-size: 15px;
}
.sb--md .sb-clear {
  width: 28px;
  height: 28px;
  font-size: 13px;
}

/* ─── Compact size: Bard Stats column headers, Champion Picker ─── */
.sb--sm {
  height: 34px;
  gap: 6px;
  padding: 0 5px 0 9px;
}
.sb--sm .sb-input {
  font-size: 13px;
}
.sb--sm .sb-clear {
  width: 22px;
  height: 22px;
  font-size: 11px;
}
</style>
