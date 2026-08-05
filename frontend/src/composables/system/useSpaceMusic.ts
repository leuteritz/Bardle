import { ref, watch, readonly } from 'vue'
import { useRenderingPaused } from './useRenderingPaused'
import { useStarGroupStore } from '@/stores/starGroupStore'
import {
  MUSIC_DEFAULT_VOLUME,
  MUSIC_FADE_DURATION_MS,
  MUSIC_STORAGE_KEY,
  BOSS_MUSIC_PATH,
  BOSS_MUSIC_VOLUME,
  BOSS_MUSIC_FADE_MS,
} from '@/config/constants'

// ── Module-level singleton ──────────────────────────────────────────────────
// One HTMLAudioElement per track, shared across all composable calls.

let audio: HTMLAudioElement | null = null
let bossAudio: HTMLAudioElement | null = null

const volume = ref(MUSIC_DEFAULT_VOLUME)
const isMuted = ref(false)
const isPlaying = ref(false)
const isBossPlaying = ref(false)

let _initialized = false
let _userHasInteracted = false
let _fadeTimer: ReturnType<typeof setInterval> | null = null
let _bossFadeTimer: ReturnType<typeof setInterval> | null = null

function _clearFade() {
  if (_fadeTimer !== null) {
    clearInterval(_fadeTimer)
    _fadeTimer = null
  }
}

function _clearBossFade() {
  if (_bossFadeTimer !== null) {
    clearInterval(_bossFadeTimer)
    _bossFadeTimer = null
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

function _fadeBossTo(target: number, durationMs: number, onComplete?: () => void) {
  if (!bossAudio) return
  _clearBossFade()
  const start = bossAudio.volume
  const delta = target - start
  const steps = Math.max(1, Math.round(durationMs / 30))
  let step = 0
  _bossFadeTimer = setInterval(() => {
    step++
    if (!bossAudio) {
      _clearBossFade()
      return
    }
    bossAudio.volume = Math.max(0, Math.min(1, start + delta * (step / steps)))
    if (step >= steps) {
      _clearBossFade()
      onComplete?.()
    }
  }, 30)
}

function _tryPlay() {
  if (!audio || !_userHasInteracted) return
  if (isBossPlaying.value) return
  if (audio.paused) {
    audio.volume = 0
    audio.play().catch(() => {
      // autoplay blocked — will retry on next interaction
    })
    _fadeTo(_effectiveVolume(), MUSIC_FADE_DURATION_MS)
    isPlaying.value = true
  }
}

function _startBossMusic() {
  if (!bossAudio || !_userHasInteracted) return
  // Duck main track to silence — keep it running to avoid play() restart issues
  _fadeTo(0, BOSS_MUSIC_FADE_MS)
  bossAudio.currentTime = 0
  bossAudio.volume = 0
  bossAudio.play().catch(() => {})
  _fadeBossTo(isMuted.value ? 0 : BOSS_MUSIC_VOLUME, BOSS_MUSIC_FADE_MS)
  isBossPlaying.value = true
}

function _stopBossMusic() {
  if (!isBossPlaying.value) return
  _fadeBossTo(0, BOSS_MUSIC_FADE_MS, () => {
    bossAudio?.pause()
    isBossPlaying.value = false
    if (!isMuted.value) {
      _fadeTo(_effectiveVolume(), BOSS_MUSIC_FADE_MS)
    }
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

  bossAudio = new Audio(BOSS_MUSIC_PATH)
  bossAudio.loop = true
  bossAudio.volume = 0
  bossAudio.preload = 'auto'

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

  // Boss music — active for the entire lifetime of a champion/galaxy_boss star
  const starGroupStore = useStarGroupStore()
  watch(
    () => starGroupStore.hasActiveChampionStar || starGroupStore.hasActiveGalaxyBossStar,
    (hasBossStar) => {
      if (hasBossStar) {
        _startBossMusic()
      } else {
        _stopBossMusic()
      }
    },
  )
}

export function useSpaceMusic() {
  _init()

  const { isRenderingPaused } = useRenderingPaused()

  // Pause/resume when tab loses or gains focus
  watch(
    isRenderingPaused,
    (paused) => {
      if (paused) {
        _clearFade()
        _clearBossFade()
        audio?.pause()
        if (isBossPlaying.value) bossAudio?.pause()
      } else {
        if (isBossPlaying.value) {
          audio?.play().catch(() => {})  // resume main (stays ducked at 0)
          bossAudio?.play().catch(() => {})
        } else {
          _tryPlay()
        }
      }
    },
    { immediate: false },
  )

  // Apply volume changes — skip while boss is active (main is ducked)
  watch(volume, (v) => {
    if (audio && !isMuted.value && !isBossPlaying.value) {
      _fadeTo(v, 200)
    }
    _saveSettings()
  })

  // Apply mute state — guard main track when boss is playing
  watch(isMuted, (muted) => {
    if (audio && !isBossPlaying.value) {
      _fadeTo(muted ? 0 : volume.value, 300)
    }
    if (bossAudio && isBossPlaying.value) {
      _fadeBossTo(muted ? 0 : BOSS_MUSIC_VOLUME, 300)
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
    isBossPlaying: readonly(isBossPlaying),
    toggleMute,
    setVolume,
  }
}
