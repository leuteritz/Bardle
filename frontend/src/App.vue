<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { titleMessages } from './config/messages'
import StatsPanelComponent from './components/bottom/StatsPanelComponent.vue'
import AbilityBarComponent from './components/bottom/AbilityBarComponent.vue'
import BardHudComponent from './components/bottom/BardHudComponent.vue'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import RankComponent from './components/RankComponent.vue'

// Einstellungen die sich nicht ändern
const STAR_COUNT = 300 // So viele Sterne werden gleichzeitig angezeigt
const MESSAGE_INTERVAL = 5000 // Alle 5 Sekunden wechselt die Nachricht
const STAR_CONNECTION_INTERVAL = 3000 // Alle 3 Sekunden entstehen neue Sterne-Verbindungen
const LINE_DURATION = 2000 // Verbindungslinien sind 2 Sekunden lang sichtbar
const ANIMATION_SPEED_MIN = 10 // Langsamste Geschwindigkeit für Sterne
const ANIMATION_SPEED_MAX = 200 // Schnellste Geschwindigkeit für Sterne

// Daten die sich ändern können (reactive)
const title = ref('Bardle') // Name des Spiels im Titel
const currentMsg = ref('') // Die gerade angezeigte Nachricht
const starsContainer = ref<HTMLElement>() // Verbindung zum HTML-Element mit den Sternen
const prefersReducedMotion = ref(false) // Speichert ob der Nutzer weniger Animationen will

// Listen zum Aufräumen von Timern
const intervals: ReturnType<typeof setInterval>[] = [] // Sammelt alle wiederholenden Timer
const timeouts: ReturnType<typeof setTimeout>[] = [] // Sammelt alle einmaligen Timer

// Prüft ob der Browser weniger Animationen anzeigen soll
const checkReducedMotion = () => {
  if (typeof window !== 'undefined') {
    prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
}

// Wählt eine zufällige Nachricht aus der Liste
function getRandomMessage(): void {
  if (titleMessages.length === 0) return // Stoppt wenn keine Nachrichten vorhanden
  const randomMsg = titleMessages[Math.floor(Math.random() * titleMessages.length)]
  currentMsg.value = randomMsg
}

// Verbindet zwei zufällige Sterne mit einer Linie
async function connectRandomStars(): Promise<void> {
  if (!starsContainer.value || prefersReducedMotion.value) return // Stoppt wenn Container fehlt oder Animationen aus

  await nextTick() // Wartet bis Vue fertig mit Updates ist
  const stars = starsContainer.value.querySelectorAll('.star')

  if (stars.length < 2) return // Braucht mindestens 2 Sterne

  // Wählt zwei verschiedene Sterne aus
  let index1 = Math.floor(Math.random() * stars.length)
  let index2: number
  do {
    index2 = Math.floor(Math.random() * stars.length)
  } while (index1 === index2) // Wiederholt bis zwei verschiedene Sterne gefunden

  const star1 = stars[index1] as HTMLElement
  const star2 = stars[index2] as HTMLElement

  // Berechnet wo sich die Sterne auf dem Bildschirm befinden
  const rect = starsContainer.value.getBoundingClientRect()
  const rect1 = star1.getBoundingClientRect()
  const rect2 = star2.getBoundingClientRect()

  // Findet die Mitte von jedem Stern
  const x1 = rect1.left + rect1.width / 2 - rect.left
  const y1 = rect1.top + rect1.height / 2 - rect.top
  const x2 = rect2.left + rect2.width / 2 - rect.left
  const y2 = rect2.top + rect2.height / 2 - rect.top

  // Berechnet Entfernung und Winkel zwischen den Sternen
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI

  // Erstellt eine Linie als HTML-Element
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

  starsContainer.value.appendChild(line) // Fügt die Linie zur Seite hinzu

  // Entfernt die Linie nach der festgelegten Zeit automatisch
  const timeoutId = setTimeout(() => {
    if (starsContainer.value && starsContainer.value.contains(line)) {
      starsContainer.value.removeChild(line)
    }
  }, LINE_DURATION)

  timeouts.push(timeoutId) // Speichert Timer-ID für späteres Aufräumen
}

// Erstellt alle Sterne auf der Seite
function createStars(): void {
  if (!starsContainer.value || prefersReducedMotion.value) return // Stoppt wenn Container fehlt oder Animationen aus

  starsContainer.value.innerHTML = '' // Löscht alle alten Sterne

  // Erstellt jeden einzelnen Stern
  for (let i = 0; i < STAR_COUNT; i++) {
    const star = document.createElement('div')
    star.className = 'star'

    // Entscheidet wo der Stern startet (50% rechts außerhalb, 50% im sichtbaren Bereich)
    const startLeft =
      Math.random() < 0.5
        ? 105 + Math.random() * 20 // Startet rechts außerhalb des Bildschirms
        : Math.random() * 100 // Startet irgendwo im sichtbaren Bereich

    // Gibt jedem Stern zufällige Eigenschaften
    const speed = Math.random() * (ANIMATION_SPEED_MAX - ANIMATION_SPEED_MIN) + ANIMATION_SPEED_MIN
    const delay = Math.random() * 10 // Wartet 0-10 Sekunden bevor Animation startet
    const size = Math.random() * 4 + 2 // Stern ist zwischen 2px und 6px groß

    // Setzt alle Stern-Eigenschaften auf einmal (ist schneller)
    star.style.cssText = `
      position: absolute;
      left: ${startLeft}%;
      top: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
      animation: moveLeftStar ${speed}s linear infinite, twinkle 3s ease-in-out infinite;
      animation-delay: ${delay}s;
      will-change: transform, opacity;
      transform: translateZ(0);
    `

    // Speichert Startposition für CSS-Animation
    star.style.setProperty('--start-left', `${startLeft}%`)
    starsContainer.value.appendChild(star) // Fügt Stern zur Seite hinzu
  }
}

// Räumt alle Timer auf um Speicher zu sparen
function cleanup(): void {
  intervals.forEach((id) => clearInterval(id)) // Stoppt alle wiederholenden Timer
  timeouts.forEach((id) => clearTimeout(id)) // Stoppt alle einmaligen Timer
  intervals.length = 0 // Leert die Liste
  timeouts.length = 0

  if (starsContainer.value) {
    starsContainer.value.innerHTML = '' // Entfernt alle Sterne von der Seite
  }
}

// Wird ausgeführt wenn die Komponente geladen ist
onMounted(async () => {
  checkReducedMotion() // Prüft Animation-Einstellungen
  getRandomMessage() // Lädt erste Nachricht

  if (!prefersReducedMotion.value) {
    // Erstellt Sterne nur wenn Animationen erwünscht sind
    await nextTick() // Wartet bis Vue fertig ist
    setTimeout(createStars, 100) // Erstellt Sterne nach kurzer Pause

    // Startet automatisches Erstellen von Sterne-Verbindungen
    const starConnectionInterval = setInterval(connectRandomStars, STAR_CONNECTION_INTERVAL)
    intervals.push(starConnectionInterval) // Speichert Timer-ID
  }

  // Startet automatisches Wechseln der Nachrichten
  const messageInterval = setInterval(getRandomMessage, MESSAGE_INTERVAL)
  intervals.push(messageInterval) // Speichert Timer-ID
})

// Wird ausgeführt wenn die Komponente entfernt wird
onUnmounted(() => {
  cleanup() // Räumt alle Timer auf um Speicher zu sparen
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
          class="relative w-full max-w-4xl overflow-hidden shadow-2xl border-purple-400/30 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl backdrop-blur-lg"
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
