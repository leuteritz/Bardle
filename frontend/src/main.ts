import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/main.css'
import { formatNumber } from './config/numberFormat'
import {
  BARD_PROFILE_RADIUS,
  BOTTOM_BAR_NOTCH_R,
  AUTO_SAVE_INTERVAL_MS,
  BATTLE_SYNC_INTERVAL_MS,
} from './config/constants'
import { usePersistence } from './composables/usePersistence'
import { useBattleStore } from './stores/battleStore'
import { vInkCenter } from './utils/textInkOffset'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.config.globalProperties.$formatNumber = formatNumber
// v-ink-center: rückt zentrierten Text auf seine optische Achse — MedievalSharp
// setzt die Glyphen asymmetrisch in ihre Boxen (siehe utils/textInkOffset.ts).
app.directive('ink-center', vInkCenter)

app.mount('#app')
document.documentElement.style.setProperty('--bp-radius', `${BARD_PROFILE_RADIUS}px`)
document.documentElement.style.setProperty('--bottom-notch-r', `${BOTTOM_BAR_NOTCH_R}px`)

const { loadGame, saveGame } = usePersistence()
loadGame()

let saveTimer: ReturnType<typeof setInterval> | null = setInterval(
  saveGame,
  AUTO_SAVE_INTERVAL_MS,
)

// Keep the battle loop alive even when the browser throttles setInterval on hidden tabs.
// syncFromTimestamps() is idempotent and safe to call frequently.
setInterval(() => {
  const bs = useBattleStore()
  if (bs.isAutoBattleInitialized && bs.autoBattleEnabled) {
    bs.syncFromTimestamps()
  }
}, BATTLE_SYNC_INTERVAL_MS)

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (saveTimer) {
      clearInterval(saveTimer)
      saveTimer = null
    }
    saveGame()
  } else {
    if (!saveTimer) {
      saveTimer = setInterval(saveGame, AUTO_SAVE_INTERVAL_MS)
    }
  }
})
