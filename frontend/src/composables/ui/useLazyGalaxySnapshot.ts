/* ── Standbild einer befreiten Galaxie, erst beim Eintritt ins Sichtfeld ──────
   `renderGalaxySnapshot` rastert SYNCHRON. Ein per Admin nachgetragenes Archiv
   bringt sonst Dutzende Rasterläufe in EINEN Frame, und die Leiste des
   Voyages-Reiters zwanzig Miniaturen beim Wiedereinblenden.

   Der Block stand wortgleich in drei Komponenten (Archivkarte, Übersichtskarte,
   Leistenzeile) — hier ist er einmal. */

import { ref, computed, unref, onMounted, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'
import { renderGalaxySnapshot, renderGalaxyThumb } from '@/utils/fx/galaxySnapshot'
import { ARCHIVE_SNAPSHOT_ROOT_MARGIN } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

export function useLazyGalaxySnapshot(
  record: Ref<CompletedGalaxyRecord> | (() => CompletedGalaxyRecord),
  variant: 'full' | 'thumb' = 'full',
): {
  root: Ref<HTMLElement | null>
  snapshot: ComputedRef<string>
  painted: Ref<boolean>
} {
  const root = ref<HTMLElement | null>(null)
  const painted = ref(false)
  const read = () => (typeof record === 'function' ? record() : unref(record))
  const render = variant === 'thumb' ? renderGalaxyThumb : renderGalaxySnapshot
  const snapshot = computed(() => (painted.value ? render(read()) : ''))

  let observer: IntersectionObserver | null = null
  const stop = () => {
    observer?.disconnect()
    observer = null
  }

  onMounted(() => {
    if (!root.value) return
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        painted.value = true
        stop()
      },
      { rootMargin: ARCHIVE_SNAPSHOT_ROOT_MARGIN },
    )
    observer.observe(root.value)
  })
  onBeforeUnmount(stop)

  return { root, snapshot, painted }
}
