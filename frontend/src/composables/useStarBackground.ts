import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { STAR_COUNT } from '../config/constants'

type StarItem = {
  id: number
  el: HTMLDivElement
  onEnd: (e: AnimationEvent) => void
}

const STAR_CONNECTION_INTERVAL = 3000
const LINE_DURATION = 2000
const ANIMATION_SPEED_MIN = 10
const ANIMATION_SPEED_MAX = 200

export function useStarBackground() {
  const starsContainer = ref<HTMLElement>()
  const prefersReducedMotion = ref(false)
  const stars = ref<StarItem[]>([])
  let nextStarId = 1

  const intervals: ReturnType<typeof setInterval>[] = []
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const checkReducedMotion = () => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }

  async function connectRandomStars(): Promise<void> {
    if (!starsContainer.value || prefersReducedMotion.value) return
    await nextTick()
    const nodeList = starsContainer.value.querySelectorAll('.star')
    if (nodeList.length < 2) return

    const i1 = Math.floor(Math.random() * nodeList.length)
    let i2: number
    do {
      i2 = Math.floor(Math.random() * nodeList.length)
    } while (i1 === i2)

    const star1 = nodeList[i1] as HTMLElement
    const star2 = nodeList[i2] as HTMLElement

    const rect = starsContainer.value.getBoundingClientRect()
    const r1 = star1.getBoundingClientRect()
    const r2 = star2.getBoundingClientRect()

    const x1 = r1.left + r1.width / 2 - rect.left
    const y1 = r1.top + r1.height / 2 - rect.top
    const x2 = r2.left + r2.width / 2 - rect.left
    const y2 = r2.top + r2.height / 2 - rect.top

    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI

    const line = document.createElement('div')
    line.className = 'star-connection'
    line.style.cssText = `
      position: absolute;
      left: ${x1}px;
      top: ${y1}px;
      width: ${dist}px;
      height: 2px;
      background: linear-gradient(90deg, rgba(255,255,255,0.8), rgba(255,223,100,0.6), rgba(255,255,255,0.1));
      transform-origin: 0 0;
      transform: rotate(${angle}deg);
      pointer-events: none;
      z-index: 5;
      opacity: 0;
      animation: fadeInOut ${LINE_DURATION}ms ease-in-out;
    `
    starsContainer.value.appendChild(line)

    const timeoutId = setTimeout(() => {
      if (starsContainer.value && starsContainer.value.contains(line)) {
        starsContainer.value.removeChild(line)
      }
    }, LINE_DURATION)
    timeouts.push(timeoutId)
  }

  function removeStar(item: StarItem) {
    item.el.removeEventListener('animationend', item.onEnd as EventListener)
    if (starsContainer.value && item.el.parentElement === starsContainer.value) {
      starsContainer.value.removeChild(item.el)
    }
    const idx = stars.value.findIndex((s) => s.id === item.id)
    if (idx !== -1) stars.value.splice(idx, 1)
  }

  function spawnStar(): StarItem | null {
    if (!starsContainer.value) return null

    const star = document.createElement('div')
    star.className = 'star'

    const startLeft = Math.random() < 0.6 ? 105 + Math.random() * 20 : Math.random() * 100
    const speed = Math.random() * (ANIMATION_SPEED_MAX - ANIMATION_SPEED_MIN) + ANIMATION_SPEED_MIN
    const size = Math.random() * 4 + 2

    const starColors = [
      { bg: 'rgba(255, 255, 255, 0.95)', glow: 'rgba(255, 255, 255, 0.8)' },
      { bg: 'rgba(235, 240, 255, 0.9)', glow: 'rgba(200, 220, 255, 0.7)' },
      { bg: 'rgba(255, 248, 235, 0.9)', glow: 'rgba(255, 240, 200, 0.7)' },
      { bg: 'rgba(220, 225, 255, 0.85)', glow: 'rgba(180, 200, 255, 0.6)' },
      { bg: 'rgba(255, 240, 250, 0.9)', glow: 'rgba(255, 210, 240, 0.7)' },
      { bg: 'rgba(245, 245, 255, 0.92)', glow: 'rgba(230, 230, 255, 0.75)' },
    ]
    const color = starColors[Math.floor(Math.random() * starColors.length)]

    star.style.cssText = `
      position: absolute;
      left: ${startLeft}%;
      top: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      background: ${color.bg};
      border-radius: 50%;
      box-shadow: 0 0 10px ${color.glow};
      animation: moveLeftStar ${speed}s linear forwards, twinkle 3s ease-in-out infinite;
      will-change: transform, opacity;
      transform: translateZ(0);
      pointer-events: none;
    `
    star.style.setProperty('--start-left', `${startLeft}%`)

    const item: StarItem = {
      id: nextStarId++,
      el: star,
      onEnd: (e: AnimationEvent) => {
        if (e.animationName !== 'moveLeftStar') return
        removeStar(item)
        if (!prefersReducedMotion.value) {
          spawnStar()
        }
      },
    }

    star.addEventListener('animationend', item.onEnd as EventListener)
    starsContainer.value.appendChild(star)
    stars.value.push(item)
    return item
  }

  function createStars(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    starsContainer.value.innerHTML = ''
    stars.value.length = 0
    for (let i = 0; i < STAR_COUNT; i++) {
      spawnStar()
    }
  }

  function cleanup(): void {
    intervals.forEach((id) => clearInterval(id))
    timeouts.forEach((id) => clearTimeout(id))
    intervals.length = 0
    timeouts.length = 0

    stars.value.forEach((item) => {
      item.el.removeEventListener('animationend', item.onEnd as EventListener)
      if (starsContainer.value && item.el.parentElement === starsContainer.value) {
        starsContainer.value.removeChild(item.el)
      }
    })
    stars.value.length = 0

    if (starsContainer.value) {
      starsContainer.value.innerHTML = ''
    }
  }

  onMounted(async () => {
    checkReducedMotion()

    if (!prefersReducedMotion.value) {
      await nextTick()
      setTimeout(createStars, 100)

      const starConnectionInterval = setInterval(connectRandomStars, STAR_CONNECTION_INTERVAL)
      intervals.push(starConnectionInterval)
    }
  })

  onUnmounted(() => {
    cleanup()
  })

  return { starsContainer, prefersReducedMotion }
}
