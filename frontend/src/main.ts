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
  HUD_COLUMN_INSET,
  HUD_COLUMN_INSET_WIDE,
  HUD_COLUMN_MAX_W,
  HUD_COLUMN_MIN_W,
} from '@/config/constants'
import { usePersistence } from '@/composables/system/usePersistence'
import { useBattleStore } from '@/stores/battle/battleStore'
import { vInkCenter } from '@/utils/ui/textInkOffset'
import { vTip } from '@/utils/ui/tipDirective'
import { useGameStore } from '@/stores/core/gameStore'
import { gameIntervalMs, getGameSpeed, onGameSpeedChange } from '@/utils/game/gameClock'
import {
  disableTelemetry,
  enableTelemetry,
  telemetryCsv,
  telemetryElapsed,
  telemetryFirsts,
  telemetryRows,
} from '@/utils/game/telemetry'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.config.globalProperties.$formatNumber = formatNumber
// v-ink-center: rückt zentrierten Text auf seine optische Achse — MedievalSharp
// setzt die Glyphen asymmetrisch in ihre Boxen (siehe utils/ui/textInkOffset.ts).
app.directive('ink-center', vInkCenter)
// v-tip: die Kurzform der Tooltip-Sprache anstelle eines nativen `title` —
// eine Instanz für das ganze Dokument (siehe utils/ui/tipDirective.ts).
app.directive('tip', vTip)

// Vor dem Mount: `var(--bp-radius)` hat an seinen 40+ Fundstellen bewusst KEINEN
// Fallback, damit der Wert nur einmal existiert. Wird die Variable erst nach dem
// Mount gesetzt, rendert der erste Frame die Radien als 0 — heute noch nicht
// sichtbar, weil beides im selben Task läuft, aber nur solange dazwischen nichts
// einen Frame erzwingt.
document.documentElement.style.setProperty('--bp-radius', `${BARD_PROFILE_RADIUS}px`)
document.documentElement.style.setProperty('--bottom-notch-r', `${BOTTOM_BAR_NOTCH_R}px`)

// Die Skalare der EINEN HUD-Spaltenbreite. App.vue rechnet daraus `--hud-col-w`;
// hierher, weil `:root` kein `v-bind` annimmt — die Variable laege am
// Wurzelelement von App.vue und `:root` saehe sie nicht.
document.documentElement.style.setProperty('--hud-col-min', `${HUD_COLUMN_MIN_W}px`)
document.documentElement.style.setProperty('--hud-col-max', `${HUD_COLUMN_MAX_W}px`)
document.documentElement.style.setProperty('--hud-col-inset', `${HUD_COLUMN_INSET}px`)
document.documentElement.style.setProperty('--hud-col-inset-wide', `${HUD_COLUMN_INSET_WIDE}px`)

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
//
// Der Abstand ist SPIELzeit: bei laufendem Zeitraffer muss die Phasenkette
// entsprechend feiner abgetastet werden, sonst überspringt ein einzelner Aufruf
// bei 50× eine ganze Kampfphase.
let battleSyncTimer: ReturnType<typeof setInterval> | null = null
const startBattleSync = () => {
  if (battleSyncTimer) clearInterval(battleSyncTimer)
  battleSyncTimer = setInterval(() => {
    const bs = useBattleStore()
    if (bs.isAutoBattleInitialized && bs.autoBattleEnabled) {
      bs.syncFromTimestamps()
    }
  }, gameIntervalMs(BATTLE_SYNC_INTERVAL_MS))
}
startBattleSync()
onGameSpeedChange(startBattleSync)

// Der einzige Griff, den ein Messtreiber von außen braucht — nur im Dev-Build.
// Alles andere liest er aus den Pinia-Stores, die dort ohnehin am App-Knoten
// hängen.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__bardle = {
    setGameSpeed: (s: number) => useGameStore().setGameSpeed(s),
    getGameSpeed,
    enableTelemetry,
    disableTelemetry,
    telemetryRows,
    telemetryFirsts,
    telemetryElapsed,
    telemetryCsv,
  }
}

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
