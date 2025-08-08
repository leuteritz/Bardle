<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import { titleMessages } from './config/messages'
import StatsPanelComponent from './components/bottom/StatsPanelComponent.vue'
import AbilityBarComponent from './components/bottom/AbilityBarComponent.vue'
import BardHudComponent from './components/bottom/BardHudComponent.vue'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import RankComponent from './components/RankComponent.vue'

const gameStore = useGameStore()

const title = ref('Bardle')

const currentMsg = ref('')

function getRandomMsg() {
  const randomMsg = titleMessages[Math.floor(Math.random() * titleMessages.length)]
  currentMsg.value = randomMsg
}

function connectRandomStars() {
  const starsContainer = document.getElementById('stars')
  if (!starsContainer) return
  const stars = starsContainer.getElementsByClassName('star')

  if (stars.length < 2) return

  // Zwei verschiedene Sterne zufällig auswählen
  let index1 = Math.floor(Math.random() * stars.length)
  let index2
  do {
    index2 = Math.floor(Math.random() * stars.length)
  } while (index1 === index2)

  const star1 = stars[index1]
  const star2 = stars[index2]

  // Positionen relativ zum Container bestimmen
  const rect = starsContainer.getBoundingClientRect()
  const rect1 = star1.getBoundingClientRect()
  const rect2 = star2.getBoundingClientRect()

  // Mittelpunktkoodinaten
  const x1 = rect1.left + rect1.width / 2 - rect.left
  const y1 = rect1.top + rect1.height / 2 - rect.top
  const x2 = rect2.left + rect2.width / 2 - rect.left
  const y2 = rect2.top + rect2.height / 2 - rect.top

  // Abstand und Winkel berechnen
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI

  // Linie als div erzeugen
  const line = document.createElement('div')
  line.style.position = 'absolute'
  line.style.left = x1 + 'px'
  line.style.top = y1 + 'px'
  line.style.width = dist + 'px'
  line.style.height = '2px'
  line.style.background =
    'linear-gradient(90deg, rgba(255,255,255,0.8), rgba(255,223,100,0.6), rgba(255,255,255,0.1))'
  line.style.transformOrigin = '0 0'
  line.style.transform = `rotate(${angle}deg)`
  line.style.pointerEvents = 'none'
  line.style.zIndex = '5'

  // Linie zum Container hinzufügen
  starsContainer.appendChild(line)

  // Nach 2s entfernen
  setTimeout(() => {
    starsContainer.removeChild(line)
  }, 2000)
}

// Erweiterte Sterne-Funktion für bewegende Sterne
function createStars() {
  const starsContainer = document.getElementById('stars')
  if (starsContainer) {
    starsContainer.innerHTML = ''

    for (let i = 0; i < 500; i++) {
      const star = document.createElement('div')
      star.className = 'star'

      // Mische bestehende und neue Sterne
      let startLeft
      if (Math.random() < 0.5) {
        // 40% der Sterne starten von rechts außerhalb
        startLeft = 105 + Math.random() * 20 // 105% - 125%
      } else {
        // 60% der Sterne starten im sichtbaren Bereich
        startLeft = Math.random() * 100 // 0% - 100%
      }

      star.style.left = startLeft + '%'
      star.style.top = Math.random() * 100 + '%'
      star.style.setProperty('--start-left', startLeft + '%')

      // Verschiedene Verzögerungen für natürlichen Fluss
      const speed = Math.random() * 25 + 15
      const delay = Math.random() * 30 // 0-30 Sekunden Verzögerung

      star.style.animation = `moveLeftStar ${speed}s linear infinite, twinkle 3s ease-in-out infinite`
      star.style.animationDelay = delay + 's'

      const size = Math.random() * 4 + 2
      star.style.width = size + 'px'
      star.style.height = size + 'px'
      star.style.background = 'rgba(255, 255, 255, 0.95)'
      star.style.borderRadius = '50%'
      star.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.8)'
      star.style.position = 'absolute'

      starsContainer.appendChild(star)
    }
  }
}

onMounted(() => {
  getRandomMsg()
  setInterval(() => {
    gameStore.gernerateMeeps()
  }, 1000)

  // Bewegende Sterne erstellen
  setTimeout(() => {
    createStars()
  }, 100)

  // 3s zwischen Linien zwischen zufälligen Sternen erstellen
  setInterval(() => {
    connectRandomStars()
  }, 2000)

  setInterval(() => {
    getRandomMsg()
  }, 5000)
})
</script>

<template>
  <div class="min-h-screen cosmic-bg">
    <div class="stars" id="stars"></div>
    <div class="flex flex-col justify-between p-4 w-full min-h-screen font-['MedievalSharp']">
      <!-- Top -->
      <div class="z-50 grid w-full h-8 grid-cols-3">
        <!-- Linke Spalte: RankComponent -->
        <div class="flex items-center justify-center col-span-1">
          <div class="flex items-start justify-center col-span-1 mb-44">
            <p class="text-xl break-words cursor-default select-none text-amber-500 drop-shadow-lg">
              {{ currentMsg }}
            </p>
          </div>
        </div>

        <!-- Titel -->
        <h1
          class="flex items-start justify-center col-span-1 text-4xl font-bold text-amber-600 drop-shadow-lg"
        >
          {{ title }}
        </h1>

        <!-- Rechte Spalte: Message -->
        <div class="flex items-center justify-end col-span-1">
          <RankComponent />
        </div>
      </div>

      <!-- Mitte mit Grid Layout -->
      <div class="grid w-full h-full grid-cols-5">
        <!-- Bild -->
        <div class="relative z-20 flex items-center justify-end w-full col-span-1">
          <img
            src="/img/BardPortalRichtig.png"
            alt="Game Character"
            class="relative z-30 w-48 h-48 -right-10"
          />

          <div class="absolute w-24 h-48 bg-yellow-500 rounded-full shadow-lg -right-12"></div>
        </div>

        <div class="w-full col-span-3">
          <GameCenterComponent />
        </div>

        <!-- Rechte Spalte -->
        <div class="relative z-20 flex items-center justify-start w-full col-span-1">
          <img
            src="/img/PortalEndeRichtig.png"
            alt="Game Character"
            class="relative z-30 w-48 h-48 -left-10"
          />

          <div class="absolute w-24 h-48 bg-yellow-500 rounded-full shadow-lg -left-12"></div>
        </div>
      </div>

      <!-- Bottom Panel  -->
      <div class="z-20 flex justify-center w-full">
        <div
          class="w-full max-w-4xl overflow-hidden border shadow-xl border-amber-400 bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 rounded-xl"
        >
          <!-- Main Content Grid - Reduzierte Höhe -->
          <div class="grid grid-cols-12 min-h-[140px]">
            <!-- Left Section: Bard HUD -->
            <div
              class="flex items-center justify-center col-span-3 p-1 border-r border-amber-500/30 bg-gradient-to-br from-amber-600/30 to-orange-600/30"
            >
              <div class="w-full max-w-[200px]">
                <BardHudComponent />
              </div>
            </div>

            <!-- Center Section: Ability Bar -->
            <div
              class="flex items-center justify-center col-span-6 p-1 bg-gradient-to-br from-amber-700/30 to-orange-700/30"
            >
              <div class="w-full max-w-lg">
                <AbilityBarComponent />
              </div>
            </div>

            <!-- Right Section: Stats Panel -->
            <div
              class="flex items-center justify-center col-span-3 p-1 border-l border-amber-500/30 bg-gradient-to-br from-amber-600/30 to-orange-600/30"
            >
              <div class="w-full">
                <StatsPanelComponent />
              </div>
            </div>
          </div>

          <!-- Dünnere Top border decoration -->
          <div class="h-0.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Kosmischer Hintergrund */
.cosmic-bg {
  background: linear-gradient(45deg, #1e1b4b, #312e81, #3730a3, #1e40af);
  background-size: 400% 400%;
  animation: cosmicShift 20s ease infinite;
}

@keyframes cosmicShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Sterne im Hintergrund */
.stars {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;
  z-index: 1 !important;
  overflow: hidden !important;
}

.star {
  position: absolute !important;
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 50% !important;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8) !important;
}

/* Bewegungsanimation: von rechts nach links mit left property */
@keyframes moveLeftStar {
  0% {
    left: var(--start-left); /* Startet von der ursprünglichen Position */
  }
  100% {
    left: -10%;
  }
}

/* Twinkle-Animation für funkelnde Sterne */
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
</style>
