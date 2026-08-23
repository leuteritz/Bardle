import { computed, ref, watch, onScopeDispose, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMissionStore } from '@/stores/progression/missionStore'
import {
  getMission,
  missionChapterIndex,
  missionObjectiveLine,
  missionRewardLabel,
  missionRewardParts,
} from '@/config/progression/missions'
import { MISSION_CLAIM_FLASH_MS } from '@/config/constants'
import { toRoman } from '@/utils/ui/format'
import type { MissionDef, MissionRewardPart } from '@/types'

/**
 * Was der Spieler von der Leiter sieht — die laufende Mission, und während des
 * Abschlussblitzes die eben eingelöste.
 *
 * Der Grund für das Composable steckt im zweiten Halbsatz: `_claim()` rückt
 * `index` sofort weiter, gezeigt wird aber noch die Stufe, die gerade gefallen
 * ist. Diese eingefrorene Fassung samt Kapitelfarbe und Belohnungslabel
 * aufzulösen brauchen jetzt ZWEI Stellen — die HUD-Karte draußen und die Zeile
 * im Pause-Overlay, wo der Herold (z-index 9700) unter dem Panel liegt und
 * seine Zeremonie niemand sieht.
 *
 * Kein eigener Takt: `activeView` ist ein Pinia-Getter über
 * `progressMetricValue`, und keine der 25 Auflösungen liest eine Zeitquelle.
 * Der Fortschritt läuft dadurch von selbst mit dem Spiel-Tick weiter — auch
 * pausiert, denn der Tick kennt keine Pause.
 */
export interface MissionFace {
  id: string
  def: MissionDef
  name: string
  task: string
  chapterName: string
  chapterNumeral: string
  color: string
  progress: number
  target: number
  ratio: number
  rewardLabel: string
  /** Derselbe Lohn zerlegt — die Plakette der HUD-Karte setzt Betrag und
   *  Einheit getrennt, die Pause-Zeile liest weiter das Label. */
  rewardParts: MissionRewardPart[]
}

export function useMissionFace(): {
  face: ComputedRef<MissionFace | null>
  flashing: ComputedRef<boolean>
} {
  const missionStore = useMissionStore()
  const { activeView, lastClaimed } = storeToRefs(missionStore)

  const flashed = ref<MissionFace | null>(null)
  let flashTimer: ReturnType<typeof setTimeout> | null = null

  function faceOf(def: MissionDef, progress: number, ratio: number): MissionFace {
    const chapter = missionStore.chapterOf(def)
    return {
      id: def.id,
      def,
      name: def.name,
      task: missionObjectiveLine(def),
      chapterName: chapter.name,
      chapterNumeral: toRoman(missionChapterIndex(def) + 1),
      color: chapter.color,
      progress,
      target: def.target,
      ratio,
      rewardLabel: missionRewardLabel(def),
      rewardParts: missionRewardParts(def),
    }
  }

  watch(
    () => lastClaimed.value.seq,
    (seq) => {
      if (!seq) return
      const def = getMission(lastClaimed.value.defId)
      if (!def) return
      flashed.value = faceOf(def, def.target, 1)
      // Wanduhr: die Frist schützt die Lesezeit des Spielers, keinen Spielwert.
      if (flashTimer) clearTimeout(flashTimer)
      flashTimer = setTimeout(() => {
        flashed.value = null
        flashTimer = null
      }, MISSION_CLAIM_FLASH_MS)
    },
  )

  // onScopeDispose statt onUnmounted: so läuft das Composable auch außerhalb
  // einer Komponenteninstanz auf (Spec).
  onScopeDispose(() => {
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = null
  })

  const face = computed<MissionFace | null>(() => {
    if (flashed.value) return flashed.value
    const view = activeView.value
    if (!view) return null
    return faceOf(view, view.progress, view.ratio)
  })

  return { face, flashing: computed(() => flashed.value !== null) }
}
