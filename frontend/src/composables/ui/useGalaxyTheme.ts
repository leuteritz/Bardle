import { watch, onMounted } from 'vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'

/**
 * Die sechs Farbwerte einer Galaxie als Custom Properties am `<html>`.
 *
 * Sie springen am Schnitt, und das bleibt so — der Warp blendet seine Farbwelt
 * auf dem Sternfeld-Canvas über, nicht hier. Der Grund ist gemessen: der
 * Themewechsel steckt schon heute im teuersten Frame der ganzen Reise (~55 ms),
 * weil jedes Setzen dieser Properties einen Style-Recalc über das ganze Dokument
 * auslöst und `.cosmic-bg::before` eine 200 % breite Compositor-Ebene neu malt.
 * Über den Flug verteilt wären das ein Dutzend solcher Frames — mitten im
 * Höhepunkt, und die Kennzahl für einen Ruckler ist der LÄNGSTE Einzelframe.
 *
 * Sichtbar verloren geht dabei nichts: die Nebel stehen im Flug auf `opacity: 0`
 * (`.nebulas-warp`), und der Hintergrund-Gradient liegt unter Tint-Overlay,
 * Sternfeld und Vignette. Was man im Tunnel als Farbe sieht, malt das Canvas.
 */
function applyTheme(index: number): void {
  const theme = GALAXY_THEMES[index % GALAXY_THEMES.length]
  const root = document.documentElement
  root.style.setProperty('--cosmic-gradient', theme.gradient)
  root.style.setProperty('--galaxy-accent', theme.accentColor)
  root.style.setProperty('--nebula-1-color', theme.nebulaColors[0])
  root.style.setProperty('--nebula-2-color', theme.nebulaColors[1])
  root.style.setProperty('--nebula-3-color', theme.nebulaColors[2])
  root.style.setProperty('--nebula-4-color', theme.nebulaColors[3])
}

export function useGalaxyTheme(): void {
  const galaxyStore = useGalaxyStore()

  onMounted(() => {
    applyTheme(galaxyStore.currentThemeIndex)
  })

  watch(
    () => galaxyStore.currentThemeIndex,
    (newIndex) => {
      applyTheme(newIndex)
    },
  )
}
