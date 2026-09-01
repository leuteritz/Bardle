import { onMounted, watch, nextTick, type Ref, type WatchSource } from 'vue'
import { blitSprite } from '@/utils/fx/spaceBody'

/**
 * Ein Körperporträt in einer Karte: der Sprite wird EINMAL in ein eigenes
 * Canvas des Hosts geblittet — beim Mount und wenn sich `deps` ändern, nie im
 * Frame. `build` liefert den Cache-Eintrag (oder `null` in jsdom).
 */
export function useBodyPortrait(
  host: Ref<HTMLElement | null>,
  build: () => HTMLCanvasElement | null,
  deps: WatchSource | WatchSource[],
): void {
  function paint(): void {
    const el = host.value
    if (!el) return
    blitSprite(el, build())
  }
  onMounted(() => void nextTick(paint))
  watch(deps, () => void nextTick(paint))
}
