<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import AdminQuickActionsPanel from './AdminQuickActionsPanel.vue'
import AdminSectionsList from './AdminSectionsList.vue'

const props = withDefaults(defineProps<{ inline?: boolean }>(), { inline: false })

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

function onKeydown(e: KeyboardEvent) {
  if (props.inline) return
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault()
    toggle()
  }
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- ── STANDALONE MODE ─────────────────────────────────────────── -->
  <template v-if="!inline">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-[110] rpg-overlay" @click.self="isOpen = false" />
    </Transition>

    <!-- Modal -->
    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="fixed z-[120] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(780px,95vw)] max-h-[88vh] flex flex-col rpg-frame"
      >
        <button class="modal-close-btn" @click="isOpen = false">✕</button>

        <!-- Gold accent bar -->
        <div class="rpg-accent-bar" />

        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-3 rpg-header">
          <Icon icon="game-icons:wrench" width="20" height="20" class="admin-icon" style="color: #e8c040" />
          <span class="admin-title">Admin Dashboard</span>
          <span class="admin-shortcut ml-auto">Ctrl+Shift+A</span>
        </div>

        <AdminQuickActionsPanel />
        <AdminSectionsList />
      </div>
    </Transition>
  </template>

  <!-- ── INLINE MODE (inside App.vue modal) ─────────────────────── -->
  <template v-else>
    <AdminQuickActionsPanel />
    <AdminSectionsList />
  </template>
</template>

<style scoped>
/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, -48%);
}

/* ── Header text ── */
.admin-icon {
  color: var(--rpg-gold);
  font-size: 1.125rem;
}
.admin-title {
  font-family: var(--rpg-font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--rpg-gold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.admin-shortcut {
  font-family: var(--rpg-font-mono);
  font-size: 0.75rem;
  color: var(--rpg-text-dim);
}
</style>
