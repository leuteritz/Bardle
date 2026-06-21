import { ref, watch, readonly } from 'vue'
import { useRenderingPaused } from './useRenderingPaused'
import {
  MUSIC_DEFAULT_VOLUME,
  MUSIC_FADE_DURATION_MS,
  MUSIC_STORAGE_KEY,
} from '@/config/constants'

// ── Module-level singleton ──────────────────────────────────────────────────
// One HTMLAudioElement shared across all composable calls.

let audio: HTMLAudioElement | null = null
const volume = ref(MUSIC_DEFAULT_VOLUME)
const isMuted = ref(false)
const isPlaying = ref(false)
let _initialized = false
let _userHasInteracted = false
let _fadeTimer: ReturnType<typeof setInterval> | null = null

function _clearFade() {
  if (_fadeTimer !== null) {
    clearInterval(_fadeTimer)
    _fadeTimer = null
  }
}

function _effectiveVolume() {
  return isMuted.value ? 0 : volume.value
}

function _fadeTo(target: number, durationMs: number, onComplete?: () => void) {
  if (!audio) return
  _clearFade()
  const start = audio.volume
  const delta = target - start
  const steps = Math.max(1, Math.round(durationMs / 30))
  let step = 0
  _fadeTimer = setInterval(() => {
    step++
    if (!audio) {
      _clearFade()
      return
    }
    audio.volume = Math.max(0, Math.min(1, start + delta * (step / steps)))
    if (step >= steps) {
      _clearFade()
      onComplete?.()
    }
  }, 30)
}

function _tryPlay() {
  if (!audio || !_userHasInteracted) return
  if (audio.paused) {
    audio.volume = 0
    audio.play().catch(() => {
      // autoplay blocked — will retry on next interaction
    })
    _fadeTo(_effectiveVolume(), MUSIC_FADE_DURATION_MS)
    isPlaying.value = true
  }
}

function _pause() {
  if (!audio || audio.paused) return
  _fadeTo(0, MUSIC_FADE_DURATION_MS, () => {
    audio?.pause()
    isPlaying.value = false
  })
}

function _loadSettings() {
  try {
    const raw = localStorage.getItem(MUSIC_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { volume?: number; isMuted?: boolean }
    if (typeof parsed.volume === 'number') {
      volume.value = Math.max(0, Math.min(1, parsed.volume))
    }
    if (typeof parsed.isMuted === 'boolean') {
      isMuted.value = parsed.isMuted
    }
  } catch {
    // ignore corrupt settings
  }
}

function _saveSettings() {
  try {
    localStorage.setItem(
      MUSIC_STORAGE_KEY,
      JSON.stringify({ volume: volume.value, isMuted: isMuted.value }),
    )
  } catch {
    // ignore storage errors
  }
}

function _init() {
  if (_initialized || typeof window === 'undefined') return
  _initialized = true

  _loadSettings()

  audio = new Audio('/audio/SpaceMusic.mp3')
  audio.loop = true
  audio.volume = 0
  audio.preload = 'auto'

  // Start playback on first user gesture anywhere in the document
  const onFirstInteraction = () => {
    if (_userHasInteracted) return
    _userHasInteracted = true
    document.removeEventListener('click', onFirstInteraction)
    document.removeEventListener('keydown', onFirstInteraction)
    _tryPlay()
  }
  document.addEventListener('click', onFirstInteraction)
  document.addEventListener('keydown', onFirstInteraction)
}

export function useSpaceMusic() {
  _init()

  const { isRenderingPaused } = useRenderingPaused()

  // Pause/resume when tab loses or gains focus
  watch(
    isRenderingPaused,
    (paused) => {
      if (paused) {
        _pause()
      } else {
        _tryPlay()
      }
    },
    { immediate: false },
  )

  // Apply volume changes live
  watch(volume, (v) => {
    if (audio && !isMuted.value) {
      _fadeTo(v, 200)
    }
    _saveSettings()
  })

  // Apply mute state immediately
  watch(isMuted, (muted) => {
    if (audio) {
      _fadeTo(muted ? 0 : volume.value, 300)
    }
    _saveSettings()
  })

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  function setVolume(v: number) {
    volume.value = Math.max(0, Math.min(1, v))
    if (isMuted.value && v > 0) {
      isMuted.value = false
    }
  }

  return {
    volume: readonly(volume),
    isMuted: readonly(isMuted),
    isPlaying: readonly(isPlaying),
    toggleMute,
    setVolume,
  }
}
