import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

interface FitScaleOptions {
  /** Upper bound so text keeps a sane size on very large screens. */
  maxScale?: number
  /** Breathing room (px) kept free around the content on each side. */
  padding?: number
}

/**
 * Scales a fixed-design element so it always fits its container — both axes,
 * shrinking on small desktops and growing (up to maxScale) on large ones.
 *
 * The content keeps its natural layout size; `scale` is meant to be applied
 * as `transform: scale(...)`. offsetWidth/offsetHeight ignore transforms, so
 * remeasuring stays stable while the transform is active.
 */
export function useFitScale(
  container: Ref<HTMLElement | null>,
  content: Ref<HTMLElement | null>,
  options: FitScaleOptions = {},
) {
  const { maxScale = 1, padding = 12 } = options
  const scale = ref(1)
  let observer: ResizeObserver | null = null

  function measure(): void {
    const box = container.value
    const el = content.value
    if (!box || !el) return
    const availW = box.clientWidth - padding * 2
    const availH = box.clientHeight - padding * 2
    const w = el.offsetWidth
    const h = el.offsetHeight
    if (w <= 0 || h <= 0 || availW <= 0 || availH <= 0) return
    scale.value = Math.min(maxScale, availW / w, availH / h)
  }

  function observe(): void {
    observer?.disconnect()
    if (!container.value || !content.value) return
    observer = new ResizeObserver(measure)
    observer.observe(container.value)
    observer.observe(content.value)
    measure()
  }

  onMounted(observe)
  // v-if targets mount later than the composable — re-observe when refs appear
  watch([container, content], observe)
  onBeforeUnmount(() => observer?.disconnect())

  return { scale }
}
