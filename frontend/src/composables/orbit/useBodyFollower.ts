import { onBeforeUnmount, watch, type Ref } from 'vue'
import {
  registerBodyFollower,
  setBodyFollowerAmp,
  unregisterBodyFollower,
} from '@/utils/orbit/flightLive'

/** Hängt den Sonnenkörper an den Treffer-Ruck — die Sternfeld-Schleife schreibt seinen Transform. */
export function useBodyFollower(
  el: Ref<HTMLElement | null>,
  enabled: () => boolean,
  ampPx: () => number,
): void {
  let current: HTMLElement | null = null
  const sync = () => {
    const next = enabled() ? el.value : null
    if (next !== current) {
      if (current) unregisterBodyFollower(current)
      if (next) registerBodyFollower(next, ampPx())
      current = next
    } else if (current) {
      setBodyFollowerAmp(current, ampPx())
    }
  }
  watch([el, enabled, ampPx], sync, { flush: 'post', immediate: true })
  onBeforeUnmount(() => {
    if (current) unregisterBodyFollower(current)
    current = null
  })
}
