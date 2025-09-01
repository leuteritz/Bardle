<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { titleMessages } from './config/messages'
import StatsPanelComponent from './components/bottom/StatsPanelComponent.vue'
import AbilityBarComponent from './components/bottom/AbilityBarComponent.vue'
import BardHudComponent from './components/bottom/BardHudComponent.vue'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import RankComponent from './components/RankComponent.vue'
import { useGameStore } from './stores/gameStore'
import { useBattleStore } from './stores/battleStore'

const gameStore = useGameStore()
const battleStore = useBattleStore()

// Konstante Settings
const STAR_COUNT = 500
const MESSAGE_INTERVAL = 5000
const STAR_CONNECTION_INTERVAL = 3000
const LINE_DURATION = 2000
const ANIMATION_SPEED_MIN = 10
const ANIMATION_SPEED_MAX = 200

// Reactive State
const title = ref('Bardle')
const currentMsg = ref('')
const starsContainer = ref<HTMLElement>()
const prefersReducedMotion = ref(false)

// Timer-Listen
const intervals: ReturnType<typeof setInterval>[] = []
const timeouts: ReturnType<typeof setTimeout>[] = []

// Neues: Stern-Typ und reaktives Array
type StarItem = {
  id: number
  el: HTMLDivElement
  onEnd: (e: AnimationEvent) => void
}

const stars = ref<StarItem[]>([])
let nextStarId = 1

const checkReducedMotion = () => {
  if (typeof window !== 'undefined') {
    prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
}

// Message-Rotation
function getRandomMessage(): void {
  if (titleMessages.length === 0) return
  const randomMsg = titleMessages[Math.floor(Math.random() * titleMessages.length)]
  currentMsg.value = randomMsg
}

// Linie zwischen zwei zufälligen Sternen
async function connectRandomStars(): Promise<void> {
  if (!starsContainer.value || prefersReducedMotion.value) return
  await nextTick()
  const nodeList = starsContainer.value.querySelectorAll('.star')
  if (nodeList.length < 2) return

  let i1 = Math.floor(Math.random() * nodeList.length)
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

// Hilfsfunktionen zum Erstellen und Entfernen von Sternen
function removeStar(item: StarItem) {
  // Listener ab
  item.el.removeEventListener('animationend', item.onEnd as EventListener)
  // DOM-Entfernung
  if (starsContainer.value && item.el.parentElement === starsContainer.value) {
    starsContainer.value.removeChild(item.el)
  }
  // Array bereinigen
  const idx = stars.value.findIndex((s) => s.id === item.id)
  if (idx !== -1) stars.value.splice(idx, 1)
}

function spawnStar(): StarItem | null {
  if (!starsContainer.value) return null

  const star = document.createElement('div')
  star.className = 'star'

  // 60% außerhalb rechts, 40% im Viewport
  const startLeft = Math.random() < 0.6 ? 105 + Math.random() * 20 : Math.random() * 100

  const speed = Math.random() * (ANIMATION_SPEED_MAX - ANIMATION_SPEED_MIN) + ANIMATION_SPEED_MIN
  const size = Math.random() * 4 + 2

  // WICHTIG: moveLeftStar einmalig (forwards), twinkle bleibt infinite
  star.style.cssText = `
    position: absolute;
    left: ${startLeft}%;
    top: ${Math.random() * 100}%;
    width: ${size}px;
    height: ${size}px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
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
      // Nur auf moveLeftStar reagieren, twinkle ist unendlich
      if (e.animationName !== 'moveLeftStar') return
      removeStar(item)
      // Optional: neuen Stern erzeugen, um die Zielanzahl zu halten
      if (!prefersReducedMotion.value) {
        spawnStar()
      }
    },
  }

  // Listener registrieren
  star.addEventListener('animationend', item.onEnd as EventListener)

  // DOM-Anfügen + Array pflegen
  starsContainer.value.appendChild(star)
  stars.value.push(item)
  return item
}

function createStars(): void {
  if (!starsContainer.value || prefersReducedMotion.value) return
  // Säubern (idempotent)
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

  // Alle Stern-Listener und DOM entfernen
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
  getRandomMessage()

  if (!prefersReducedMotion.value) {
    await nextTick()
    setTimeout(createStars, 100)

    const starConnectionInterval = setInterval(connectRandomStars, STAR_CONNECTION_INTERVAL)
    intervals.push(starConnectionInterval)
  }

  const messageInterval = setInterval(getRandomMessage, MESSAGE_INTERVAL)
  intervals.push(messageInterval)
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="min-h-screen cosmic-bg" :class="{ 'reduce-motion': prefersReducedMotion }">
    <!-- Container für alle Sterne, wird nur bei aktivierten Animationen angezeigt -->
    <div
      ref="starsContainer"
      class="stars"
      id="stars"
      v-show="!prefersReducedMotion"
      aria-hidden="true"
    ></div>

    <div class="flex flex-col justify-between p-4 w-full min-h-screen font-['MedievalSharp']">
      <!-- Oberer Bereich mit Navigation -->
      <div class="z-50 grid w-full h-8 grid-cols-3">
        <!-- Links: Rang-Komponente -->
        <div class="flex items-center justify-start col-span-1">
          <RankComponent />
        </div>

        <!-- Mitte: Spiel-Titel -->
        <h1
          class="flex items-start justify-center col-span-1 text-4xl font-bold text-amber-600 drop-shadow-lg"
        >
          {{ title }}
        </h1>

        <!-- Rechts: Wechselnde Nachrichten -->
        <div class="flex items-center justify-center col-span-1 mb-44">
          <p
            class="text-xl transition-opacity duration-500 cursor-default select-none text-amber-500 drop-shadow-lg"
          >
            {{ currentMsg }}
          </p>
        </div>
        <div class="absolute z-20 top-3 right-3">
          <div
            class="px-3 py-1 transition-colors duration-200 border rounded-full shadow-lg backdrop-blur-sm bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 group-hover:from-purple-500/30 group-hover:to-pink-500/30"
          >
            <span
              class="text-sm font-bold text-transparent whitespace-nowrap bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300"
            >
              ⏱ {{ battleStore.formatTime(gameStore.inGameTime) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Hauptbereich mit 3 Spalten (responsive) -->
      <div class="grid w-full h-full grid-cols-1 gap-4 lg:grid-cols-5">
        <!-- Links: Charakter mit Portal-Effekt -->
        <div
          class="relative z-20 flex items-center justify-center w-full lg:justify-end lg:col-span-1"
        >
          <img
            src="/img/BardPortalRichtig.png"
            alt="Game Character"
            class="relative z-30 w-32 h-32 lg:w-48 lg:h-48 lg:-right-10"
            loading="lazy"
          />
          <!-- Leuchtender Hintergrund hinter dem Charakter -->
          <div
            class="absolute w-16 h-32 bg-yellow-500 rounded-full shadow-lg lg:w-24 lg:h-48 lg:-right-12"
          ></div>
        </div>

        <!-- Mitte: Hauptspiel-Komponente -->
        <div class="w-full lg:col-span-3">
          <GameCenterComponent />
        </div>

        <!-- Rechts: Zweiter Charakter mit Portal-Effekt -->
        <div
          class="relative z-20 flex items-center justify-center w-full lg:justify-start lg:col-span-1"
        >
          <img
            src="/img/PortalEndeRichtig.png"
            alt="Game Character"
            class="relative z-30 w-32 h-32 lg:w-48 lg:h-48 lg:-left-10"
            loading="lazy"
          />
          <!-- Leuchtender Hintergrund hinter dem Charakter -->
          <div
            class="absolute w-16 h-32 bg-yellow-500 rounded-full shadow-lg lg:w-24 lg:h-48 lg:-left-12"
          ></div>
        </div>
      </div>

      <!-- Unterer Bereich mit Spieler-Informationen -->
      <div class="z-20 flex justify-center w-full">
        <div
          class="relative w-full max-w-4xl overflow-hidden shadow-2xl border-purple-400/30 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl"
          :class="{ 'opacity-50': gameStore.isCPSModalOpen }"
        >
          <!-- Animated Background -->
          <div class="absolute inset-0 opacity-20">
            <div
              class="absolute w-32 h-32 bg-purple-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
            ></div>
            <div
              class="absolute bg-pink-500 rounded-full top-4 right-4 w-28 h-28 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
            ></div>
            <div
              class="absolute w-24 h-24 bg-yellow-500 rounded-full bottom-4 left-1/2 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
            ></div>
          </div>

          <!-- 3-spaltiges Layout für verschiedene Bildschirmgrößen -->
          <div class="relative z-10 grid grid-cols-1 md:grid-cols-12 min-h-[140px] gap-2 md:gap-0">
            <!-- Links: Charakter-Status -->
            <div
              class="flex items-center justify-center p-1 md:col-span-3 md:border-r border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-sm"
            >
              <div class="w-full max-w-[200px]">
                <BardHudComponent />
              </div>
            </div>

            <!-- Mitte: Fähigkeiten-Leiste -->
            <div
              class="flex items-center justify-center p-1 md:col-span-6 bg-gradient-to-br from-purple-600/20 to-pink-600/10 backdrop-blur-sm"
            >
              <div class="w-full max-w-lg">
                <AbilityBarComponent />
              </div>
            </div>

            <!-- Rechts: Statistiken -->
            <div
              class="flex items-center justify-center p-1 md:col-span-3 md:border-l border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-sm"
            >
              <div class="w-full">
                <StatsPanelComponent />
              </div>
            </div>
          </div>

          <!-- Glassmorphism Border Effect -->
          <div class="absolute inset-0 border pointer-events-none rounded-xl border-white/20"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Einstellungen die überall verwendet werden können */
:root {
  --star-base-size: 2px;
  --star-max-size: 6px;
  --cosmic-gradient: linear-gradient(45deg, #1e1b4b, #312e81, #3730a3, #1e40af);
}

/* Sich bewegender Hintergrund mit Farbverlauf */
.cosmic-bg {
  background: var(--cosmic-gradient);
  background-size: 400% 400%;
  animation: cosmicShift 20s ease infinite;
}

/* Stillstehender Hintergrund für Nutzer die keine Animationen wollen */
.cosmic-bg.reduce-motion {
  animation: none;
  background-position: 0% 50%;
}

/* Langsame Farbverschiebung für kosmischen Effekt */
@keyframes cosmicShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Container der über den ganzen Bildschirm geht */
.stars {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important; /* Sterne können nicht angeklickt werden */
  z-index: 1 !important;
  overflow: hidden !important;
}

/* Aussehen der einzelnen Sterne */
.star {
  position: absolute !important;
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 50% !important; /* Macht den Stern rund */
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8) !important; /* Leuchten um den Stern */
  will-change:
    transform, opacity !important; /* Sagt dem Browser: diese Eigenschaften ändern sich */
  transform: translateZ(0) !important; /* Aktiviert Hardware-Beschleunigung */
}

/* Optimierung für die Linien zwischen Sternen */
.star-connection {
  will-change: opacity; /* Diese Eigenschaft ändert sich */
}

/* Animation die Linien ein- und ausblendet */
@keyframes fadeInOut {
  0% {
    opacity: 0; /* Unsichtbar */
  }
  20% {
    opacity: 0.8; /* Fast sichtbar */
  }
  80% {
    opacity: 0.8; /* Fast sichtbar */
  }
  100% {
    opacity: 0; /* Wieder unsichtbar */
  }
}

/* Sterne bewegen sich von ihrer Startposition nach links raus */
@keyframes moveLeftStar {
  0% {
    left: var(--start-left); /* Startet an der ursprünglichen Position */
  }
  100% {
    left: -10%; /* Endet links außerhalb des Bildschirms */
  }
}

/* Sterne funkeln wie echte Sterne */
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.4; /* Schwach leuchtend */
  }
  50% {
    opacity: 1; /* Hell leuchtend */
  }
}

/* Schaltet alle Animationen aus wenn der Nutzer das will */
@media (prefers-reduced-motion: reduce) {
  .cosmic-bg {
    animation: none !important;
  }

  .star {
    animation: none !important;
  }

  .star-connection {
    animation: none !important;
  }
}

/* Sanfte Übergänge für besseres Aussehen */
.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 500ms;
}

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

.backdrop-blur-lg {
  backdrop-filter: blur(16px);
}

.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}
</style>
