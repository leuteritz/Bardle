import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/main.css'
import { formatNumber } from './config/numberFormat'
import { usePersistence } from './composables/usePersistence'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.config.globalProperties.$formatNumber = formatNumber

app.mount('#app')

const { loadGame, saveGame } = usePersistence()
loadGame()

let saveTimer: ReturnType<typeof setInterval> | null = setInterval(saveGame, 5000)

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (saveTimer) {
      clearInterval(saveTimer)
      saveTimer = null
    }
    saveGame()
  } else {
    if (!saveTimer) {
      saveTimer = setInterval(saveGame, 5000)
    }
  }
})
