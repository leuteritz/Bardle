import { ref } from 'vue'

// Shared trigger state — consumed by NebulaFlythroughComponent, called from AdminQuickActionsPanel
const triggerRequested = ref(false)

export function useNebulaTrigger() {
  function triggerNow() {
    triggerRequested.value = true
  }

  return { triggerRequested, triggerNow }
}
