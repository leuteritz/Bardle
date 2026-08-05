import { watch, onMounted } from 'vue'
import { useGalaxyStore } from '../stores/galaxyStore'
import { GALAXY_THEMES } from '../config/galaxyThemes'

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
