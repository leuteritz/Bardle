import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { STAR_COUNT } from '../config/constants'

type StarItem = {
  id: number
  el: HTMLDivElement
  x: number
  y: number
  vx: number
  vy: number
  targetVx: number
  targetVy: number
  nextDirectionChange: number
}

const SPEED_MIN = 5
const SPEED_MAX = 10
const DIR_CHANGE_MIN = 4000
const DIR_CHANGE_MAX = 10_000
const LERP_RATE = 1.5

const STAR_CONNECTION_INTERVAL = 3000
const LINE_DURATION = 2000

export function useStarBackground() {
  const starsContainer = ref<HTMLElement>()
  const prefersReducedMotion = ref(false)
  const stars: StarItem[] = []
  let nextStarId = 1
  let animFrame = 0
  let lastTimestamp = 0
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null

  const intervals: ReturnType<typeof setInterval>[] = []
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const checkReducedMotion = () => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }

  function getRandomVelocity(): { vx: number; vy: number } {
    const angle = Math.random() * Math.PI * 2
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
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

  function spawnStar(timestamp: number): StarItem | null {
    if (!starsContainer.value) return null

    const star = document.createElement('div')
    star.className = 'star'

    const size = Math.random() * 4 + 2
    const w = starsContainer.value.clientWidth || window.innerWidth
    const h = starsContainer.value.clientHeight || window.innerHeight

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
      left: 0;
      top: 0;
      width: ${size}px;
      height: ${size}px;
      background: ${color.bg};
      border-radius: 50%;
      box-shadow: 0 0 10px ${color.glow};
      animation: twinkle 3s ease-in-out infinite;
      will-change: transform, opacity;
      pointer-events: none;
    `

    const x = Math.random() * w
    const y = Math.random() * h
    const { vx, vy } = getRandomVelocity()
    const { vx: tvx, vy: tvy } = getRandomVelocity()

    const item: StarItem = {
      id: nextStarId++,
      el: star,
      x,
      y,
      vx,
      vy,
      targetVx: tvx,
      targetVy: tvy,
      nextDirectionChange:
        timestamp + DIR_CHANGE_MIN + Math.random() * (DIR_CHANGE_MAX - DIR_CHANGE_MIN),
    }

    star.style.transform = `translate(${x}px, ${y}px)`
    starsContainer.value.appendChild(star)
    stars.push(item)
    return item
  }

  function animateStars(timestamp: number): void {
    if (lastTimestamp === 0) lastTimestamp = timestamp
    const rawDelta = (timestamp - lastTimestamp) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    const w = starsContainer.value?.clientWidth ?? window.innerWidth
    const h = starsContainer.value?.clientHeight ?? window.innerHeight

    for (const star of stars) {
      const lerpFactor = Math.min(1, LERP_RATE * delta)
      star.vx += (star.targetVx - star.vx) * lerpFactor
      star.vy += (star.targetVy - star.vy) * lerpFactor

      star.x += star.vx * delta
      star.y += star.vy * delta

      const pad = 10
      if (star.x < -pad) star.x += w + pad * 2
      else if (star.x > w + pad) star.x -= w + pad * 2
      if (star.y < -pad) star.y += h + pad * 2
      else if (star.y > h + pad) star.y -= h + pad * 2

      star.el.style.transform = `translate(${star.x}px, ${star.y}px)`

      if (timestamp >= star.nextDirectionChange) {
        const { vx, vy } = getRandomVelocity()
        star.targetVx = vx
        star.targetVy = vy
        star.nextDirectionChange =
          timestamp + DIR_CHANGE_MIN + Math.random() * (DIR_CHANGE_MAX - DIR_CHANGE_MIN)
      }
    }

    animFrame = requestAnimationFrame(animateStars)
  }

  function handleResize(): void {
    if (resizeTimeout) clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      if (!starsContainer.value || stars.length === 0) return
      const w = starsContainer.value.clientWidth || window.innerWidth
      const h = starsContainer.value.clientHeight || window.innerHeight
      for (const star of stars) {
        star.x = Math.random() * w
        star.y = Math.random() * h
        star.el.style.transform = `translate(${star.x}px, ${star.y}px)`
      }
    }, 150)
  }

  function createStars(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    starsContainer.value.innerHTML = ''
    stars.length = 0
    const now = performance.now()
    for (let i = 0; i < STAR_COUNT; i++) {
      spawnStar(now)
    }
    lastTimestamp = 0
    animFrame = requestAnimationFrame(animateStars)
  }

  function cleanup(): void {
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = 0
    }
    intervals.forEach((id) => clearInterval(id))
    timeouts.forEach((id) => clearTimeout(id))
    intervals.length = 0
    timeouts.length = 0
    stars.length = 0
    window.removeEventListener('resize', handleResize)
    if (resizeTimeout) clearTimeout(resizeTimeout)

    if (starsContainer.value) {
      starsContainer.value.innerHTML = ''
    }
  }

  onMounted(async () => {
    checkReducedMotion()

    if (!prefersReducedMotion.value) {
      await nextTick()
      setTimeout(createStars, 100)
      window.addEventListener('resize', handleResize)

      const starConnectionInterval = setInterval(connectRandomStars, STAR_CONNECTION_INTERVAL)
      intervals.push(starConnectionInterval)
    }
  })

  onUnmounted(() => {
    cleanup()
  })

  return { starsContainer, prefersReducedMotion }
}
