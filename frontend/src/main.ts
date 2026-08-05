import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/main.css'
import { formatNumber } from '@/config/ui/numberFormat'
import {
  BARD_PROFILE_RADIUS,
  BOTTOM_BAR_NOTCH_R,
  AUTO_SAVE_INTERVAL_MS,
  BATTLE_SYNC_INTERVAL_MS,
} from '@/config/constants'
import { usePersistence } from '@/composables/system/usePersistence'
import { useBattleStore } from '@/stores/battle/battleStore'
import { vInkCenter } from '@/utils/ui/textInkOffset'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.config.globalProperties.$formatNumber = formatNumber
// v-ink-center: rückt zentrierten Text auf seine optische Achse — MedievalSharp
// setzt die Glyphen asymmetrisch in ihre Boxen (siehe utils/ui/textInkOffset.ts).
app.directive('ink-center', vInkCenter)

// Vor dem Mount: `var(--bp-radius)` hat an seinen 40+ Fundstellen bewusst KEINEN
// Fallback, damit der Wert nur einmal existiert. Wird die Variable erst nach dem
// Mount gesetzt, rendert der erste Frame die Radien als 0 — heute noch nicht
// sichtbar, weil beides im selben Task läuft, aber nur solange dazwischen nichts
// einen Frame erzwingt.
document.documentElement.style.setProperty('--bp-radius', `${BARD_PROFILE_RADIUS}px`)
document.documentElement.style.setProperty('--bottom-notch-r', `${BOTTOM_BAR_NOTCH_R}px`)

app.mount('#app')

const { loadGame, saveGame } = usePersistence()
loadGame()

let saveTimer: ReturnType<typeof setInterval> | null = setInterval(saveGame, AUTO_SAVE_INTERVAL_MS)

// Der einzige periodische Antrieb der Auto-Battle-Phasenkette — bewusst hier und
// nicht in gameStore.tick(), der aus IdleGameComponent kommt und damit am
// Komponentenlebenszyklus hängt.
//
// Ein verstecktes Tab drosselt AUCH dieses Intervall (auf ~1/min). Das ist
// verkraftbar, weil syncFromTimestamps() den Zustand aus Zeitstempeln herleitet
// statt fortzuschreiben: Nach der Drosselung holt ein einzelner Aufruf alles
// Verpasste auf. Idempotent, deshalb ist häufiges Aufrufen unschädlich.
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
