import { defineStore } from 'pinia'
import { SECTIONS } from '../config/sections'
import type { SectionProgress } from '../types'

export const useSectionStore = defineStore('section', {
  state: () => ({
    activeSectionId: 1,
    highestUnlockedSectionId: 1,
    sectionProgress: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [i + 1, { rescueCount: 0, completed: false }]),
    ) as Record<number, SectionProgress>,
  }),

  getters: {
    activeSection(): (typeof SECTIONS)[0] | undefined {
      return SECTIONS.find((s) => s.id === this.activeSectionId)
    },

    activeSectionProgress(): SectionProgress {
      return this.sectionProgress[this.activeSectionId]
    },

    requiredRescues(): number {
      return this.activeSection?.requiredRescues ?? 0
    },

    progressPercent(): number {
      const req = this.requiredRescues
      if (req === 0) return 100
      return Math.min(100, Math.floor((this.activeSectionProgress.rescueCount / req) * 100))
    },

    isSectionUnlocked(): (id: number) => boolean {
      return (id: number) => id <= this.highestUnlockedSectionId
    },
  },

  actions: {
    onBossDefeated() {
      const progress = this.sectionProgress[this.activeSectionId]
      if (!progress) return

      progress.rescueCount++
      const config = SECTIONS.find((s) => s.id === this.activeSectionId)
      if (config && progress.rescueCount >= config.requiredRescues && !progress.completed) {
        progress.completed = true
        const nextId = this.activeSectionId + 1
        if (nextId <= 10 && nextId > this.highestUnlockedSectionId) {
          this.highestUnlockedSectionId = nextId
        }
      }
    },

    navigateToSection(id: number) {
      if (id < 1 || id > 10 || id > this.highestUnlockedSectionId) return
      this.activeSectionId = id
    },
  },
})
