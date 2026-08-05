import { onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'

/**
 * Windowing for a uniform, sectioned CSS grid — only the rows near the viewport
 * are rendered, the rest is replaced by padding so the scrollbar never lies.
 *
 * It exists because the champion picker and the champion shop both render every
 * owned champion at once (160+ cards): opening them laid out and painted the
 * whole list in a single frame, which is felt as a freeze rather than as a slow
 * frame. Rendering only what is on screen removes the work instead of spreading
 * it out.
 *
 * Uniform is the precondition: every card is `rowHeight` tall, every gap is
 * `gap`, and the columns come from `repeat(auto-fill, minmax(minColumnWidth, 1fr))`.
 * Section OFFSETS are not assumed — each section's grid element is measured
 * against the scroll container, so headers, filters and collapsed sections above
 * it can be any height at all.
 *
 * Cost: one rect read per section per scroll burst (rAF-throttled), never per
 * frame and never per card.
 */
export interface VirtualGridSection<T> {
  /** Stable identity of the section — the key its grid element registers under. */
  key: string | number
  items: T[]
  /** Collapsed sections render nothing and are skipped entirely. */
  collapsed?: boolean
}

export interface VirtualGridWindow<T> {
  items: T[]
  /** Padding that stands in for the rows above and below the rendered slice. */
  padTop: number
  padBottom: number
}

export function useVirtualGrid<T>(options: {
  scrollEl: Ref<HTMLElement | null>
  sections: ComputedRef<VirtualGridSection<T>[]>
  minColumnWidth: number
  rowHeight: number
  gap: number
  /** Rows kept alive beyond each edge so scrolling never shows a blank strip. */
  overscanRows: number
}) {
  const { scrollEl, sections, minColumnWidth, rowHeight, gap, overscanRows } = options

  const gridEls = new Map<string | number, HTMLElement>()
  /** Visible row range per section — everything outside becomes padding. */
  const ranges = ref(new Map<string | number, { start: number; end: number }>())
  const columns = ref(1)

  let frame: number | null = null
  let resizeObserver: ResizeObserver | null = null

  const rowPitch = rowHeight + gap

  function columnsFor(width: number): number {
    // mirrors repeat(auto-fill, minmax(minColumnWidth, 1fr))
    return Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)))
  }

  /**
   * Recomputes the visible row range of every registered section. Reads layout,
   * so it runs at most once per animation frame and never during one.
   */
  function measure(): void {
    const container = scrollEl.value
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const next = new Map<string | number, { start: number; end: number }>()

    for (const section of sections.value) {
      if (section.collapsed) continue
      const el = gridEls.get(section.key)
      if (!el) continue
      const cols = columnsFor(el.clientWidth)
      if (cols !== columns.value) columns.value = cols

      const totalRows = Math.ceil(section.items.length / cols)
      // grid top relative to the scroll container's own viewport
      const offset = el.getBoundingClientRect().top - containerRect.top
      const firstVisible = Math.floor((-offset - gap) / rowPitch)
      const lastVisible = Math.ceil((containerRect.height - offset) / rowPitch)

      next.set(section.key, {
        start: Math.max(0, Math.min(totalRows, firstVisible - overscanRows)),
        end: Math.max(0, Math.min(totalRows, lastVisible + overscanRows)),
      })
    }
    ranges.value = next
  }

  function scheduleMeasure(): void {
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      measure()
    })
  }

  /** Template ref callback — one per section grid. */
  function setGridEl(key: string | number, el: unknown): void {
    const node = el as HTMLElement | null
    if (node) {
      gridEls.set(key, node)
      scheduleMeasure()
    } else {
      gridEls.delete(key)
    }
  }

  /**
   * The slice to render for a section. Before the first measurement lands, this
   * returns the opening window (one screenful worth of overscan) rather than
   * everything — the first paint is exactly the point of the whole exercise.
   */
  function windowOf(section: VirtualGridSection<T>): VirtualGridWindow<T> {
    const cols = columns.value
    const totalRows = Math.ceil(section.items.length / cols)
    const range = ranges.value.get(section.key)
    const start = range ? range.start : 0
    const end = range ? range.end : Math.min(totalRows, overscanRows * 2 + 1)

    // Padding is derived from the FULL height minus what is actually rendered,
    // not from the row count alone: a section that renders no row at all
    // contributes no gap either, and assuming one made the scroll height wobble
    // by exactly `gap` as sections scrolled out of the window.
    const rendered = Math.max(0, end - start)
    const fullHeight = totalRows * rowHeight + Math.max(0, totalRows - 1) * gap
    const renderedHeight = rendered * rowHeight + Math.max(0, rendered - 1) * gap
    // Both paddings are clamped against the same budget, so padTop + rendered +
    // padBottom is always exactly fullHeight — a section scrolled fully past the
    // window would otherwise claim one pitch too many and jitter the scrollbar.
    const padTop = Math.min(start * rowPitch, Math.max(0, fullHeight - renderedHeight))

    return {
      items: section.items.slice(start * cols, end * cols),
      padTop,
      padBottom: Math.max(0, fullHeight - renderedHeight - padTop),
    }
  }

  onMounted(() => {
    const container = scrollEl.value
    if (!container) return
    container.addEventListener('scroll', scheduleMeasure, { passive: true })
    resizeObserver = new ResizeObserver(scheduleMeasure)
    resizeObserver.observe(container)
    scheduleMeasure()
  })

  onBeforeUnmount(() => {
    scrollEl.value?.removeEventListener('scroll', scheduleMeasure)
    resizeObserver?.disconnect()
    if (frame !== null) cancelAnimationFrame(frame)
    gridEls.clear()
  })

  // a changed filter, search or collapse state reshapes every section
  watch(sections, scheduleMeasure, { deep: false })

  return { setGridEl, windowOf, remeasure: scheduleMeasure }
}
