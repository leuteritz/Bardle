import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useShopStore } from './shopStore'
import type { Mission } from '../types'

const MISSIONS: Mission[] = [
  {
    id: 'first_notes',
    name: 'Erste Töne',
    icon: '🎵',
    description: 'Verdiene insgesamt 500 Chimes und beginne deine Reise.',
    condition: { type: 'totalChimes', target: 500 },
    rewardUpgrade: {
      id: 'reward_silver_strings',
      name: 'Silberne Saiten',
      description: 'Deine Saiten glänzen silbern. +5% auf alle CpS-Quellen.',
      icon: '🎸',
      cost: 0,
      effect: { type: 'cpsMultiplier', value: 1.05 },
    },
    claimed: false,
  },
  {
    id: 'street_performer',
    name: 'Straßenmusikant',
    icon: '🎤',
    description: 'Klicke insgesamt 100 Mal und trainiere deine Finger.',
    condition: { type: 'totalClicks', target: 100 },
    rewardUpgrade: {
      id: 'reward_nimble_fingers',
      name: 'Flinke Finger',
      description: 'Jahrelange Übung macht sich bezahlt. +15% CpC global.',
      icon: '✋',
      cost: 0,
      effect: { type: 'cpcMultiplier', value: 1.15 },
    },
    claimed: false,
  },
  {
    id: 'building_collector',
    name: 'Gebäudemeister',
    icon: '🏛️',
    description: 'Besitze 3 verschiedene Gebäudetypen gleichzeitig.',
    condition: { type: 'ownedBuildingTypes', target: 3 },
    rewardUpgrade: {
      id: 'reward_harmonic_architecture',
      name: 'Architektonische Harmonie',
      description: 'Jedes Gebäude verstärkt das andere. +10% CpS.',
      icon: '🏗️',
      cost: 0,
      effect: { type: 'cpsMultiplier', value: 1.1 },
    },
    claimed: false,
  },
  {
    id: 'planet_saver_1',
    name: 'Planetenretter I',
    icon: '🌍',
    description: 'Bringe irgendein Gebäude auf Stufe 10.',
    condition: { type: 'singleBuildingLevel', target: 10 },
    rewardUpgrade: {
      id: 'reward_planet_song_1',
      name: 'Planetenlied Vol. I',
      description: 'Deine Melodie rettet den ersten Planeten. +20% CpS.',
      icon: '🌐',
      cost: 0,
      effect: { type: 'cpsMultiplier', value: 1.2 },
    },
    claimed: false,
  },
  {
    id: 'galactic_bard',
    name: 'Galaktischer Barde',
    icon: '🌌',
    description: 'Verdiene insgesamt 50.000 Chimes.',
    condition: { type: 'totalChimes', target: 50_000 },
    rewardUpgrade: {
      id: 'reward_cosmic_frequency',
      name: 'Kosmische Frequenz',
      description: 'Dein Klang reist durch die Galaxis. +10% CpC global.',
      icon: '📡',
      cost: 0,
      effect: { type: 'cpcMultiplier', value: 1.1 },
    },
    claimed: false,
  },
  {
    id: 'building_master',
    name: 'Meister der Werke',
    icon: '⚙️',
    description: 'Investiere insgesamt 50 Stufen in Gebäude.',
    condition: { type: 'totalBuildingLevels', target: 50 },
    rewardUpgrade: {
      id: 'reward_synergy_boost',
      name: 'Synergiemeister',
      description: 'Alle Gebäude arbeiten in perfekter Harmonie. +25% CpS.',
      icon: '⚡',
      cost: 0,
      effect: { type: 'cpsMultiplier', value: 1.25 },
    },
    claimed: false,
  },
  {
    id: 'ten_worlds',
    name: 'Zehn Welten',
    icon: '🪐',
    description: 'Rette alle 10 Planeten – besitze alle 10 Gebäudetypen.',
    condition: { type: 'ownedBuildingTypes', target: 10 },
    rewardUpgrade: {
      id: 'reward_star_concert',
      name: 'Sternenkonzert',
      description: 'Das Konzert der gesamten Galaxis. +30% CpS.',
      icon: '⭐',
      cost: 0,
      effect: { type: 'cpsMultiplier', value: 1.3 },
    },
    claimed: false,
  },
  {
    id: 'upgrade_master',
    name: 'Aufgestiegener Barde',
    icon: '✨',
    description: 'Kaufe 5 permanente Upgrades.',
    condition: { type: 'permanentUpgradeCount', target: 5 },
    rewardUpgrade: {
      id: 'reward_transcendent_melody',
      name: 'Transzendente Melodie',
      description: 'Jenseits aller Grenzen. +50% CpS.',
      icon: '🔮',
      cost: 0,
      effect: { type: 'cpsMultiplier', value: 1.5 },
    },
    claimed: false,
  },
  {
    id: 'click_legend',
    name: 'Klick-Legende',
    icon: '👆',
    description: 'Klicke insgesamt 1.000 Mal.',
    condition: { type: 'totalClicks', target: 1_000 },
    rewardUpgrade: {
      id: 'reward_virtuoso_click',
      name: 'Virtuoser Klick',
      description: 'Ein Meister der Fingertechnik. +50% CpC global.',
      icon: '🎯',
      cost: 0,
      effect: { type: 'cpcMultiplier', value: 1.5 },
    },
    claimed: false,
  },
  {
    id: 'galaxy_legend',
    name: 'Legende der Galaxie',
    icon: '🏆',
    description: 'Verdiene insgesamt 1.000.000 Chimes.',
    condition: { type: 'totalChimes', target: 1_000_000 },
    rewardUpgrade: {
      id: 'reward_legendary_symphony',
      name: 'Legendäre Symphonie',
      description: 'Die ewige Symphonie der Unendlichkeit. +100% CpS.',
      icon: '👑',
      cost: 0,
      effect: { type: 'cpsMultiplier', value: 2.0 },
    },
    claimed: false,
  },
]

export const useMissionStore = defineStore('mission', () => {
  const missions = ref<Mission[]>(JSON.parse(JSON.stringify(MISSIONS))) // ← war: Mission[]

  const claimReward = (missionId: string) => {
    const mission = missions.value.find((m) => m.id === missionId)
    if (!mission || mission.claimed) return
    mission.claimed = true

    const shopStore = useShopStore()
    shopStore.addMissionReward({ ...mission.rewardUpgrade, purchased: false })
  }

  return { missions, claimReward }
})
