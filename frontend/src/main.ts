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
setInterval(saveGame, 5000)
