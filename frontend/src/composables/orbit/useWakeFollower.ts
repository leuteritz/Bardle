import { onBeforeUnmount, watch, type Ref } from 'vue'
import { registerWakeFollower, unregisterWakeFollower } from '@/utils/orbit/flightLive'

/** Hängt den Schweif-Kranz an den Kurs — die Sternfeld-Schleife schreibt seinen Transform. */
export function useWakeFollower(el: Ref<HTMLElement | null>, enabled: () => boolean): void {
  let current: HTMLElement | null = null
  const sync = () => {
    const next = enabled() ? el.value : null
    if (next === current) return
    if (current) unregisterWakeFollower(current)
    if (next) registerWakeFollower(next)
    current = next
  }
  watch([el, enabled], sync, { flush: 'post', immediate: true })
  onBeforeUnmount(() => {
    if (current) unregisterWakeFollower(current)
    current = null
  })
}
