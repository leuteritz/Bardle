<template>
  <div
    v-if="showResult"
    class="relative w-full max-w-5xl p-8 mx-4 border shadow-2xl bg-white/95 backdrop-blur-sm rounded-3xl border-amber-200"
  >
    <!-- Close Button -->
    <button
      @click="closeResult"
      class="absolute text-2xl text-gray-500 transition-colors top-4 right-4 hover:text-gray-700"
    >
      ✕
    </button>

    <!-- Battle Result Header -->
    <div
      class="relative flex flex-row items-center justify-between w-full px-2 mb-6 text-center"
      style="min-height: 3.5rem"
    >
      <span
        v-if="gameDuration"
        class="min-w-[90px] text-2xl font-bold border rounded-lg shadow px-4 py-1 flex items-center justify-center bg-gray-100 text-gray-700 border-gray-300 absolute left-0"
        style="left: 0"
      >
        {{ gameDuration }}
      </span>
      <h2
        class="mx-auto text-4xl font-bold"
        :class="result.won ? 'text-green-600' : 'text-red-600'"
      >
        {{ result.won ? 'VICTORY!' : 'DEFEAT!' }}
      </h2>
      <span
        v-if="typeof lpChange === 'number'"
        class="min-w-[90px] text-2xl font-bold border rounded-lg shadow px-4 py-1 flex items-center justify-center absolute right-0"
        :class="
          lpChange >= 0
            ? 'text-green-700 bg-green-100 border-green-300'
            : 'text-red-700 bg-red-100 border-red-300'
        "
        style="right: 0"
      >
        {{ lpChange >= 0 ? '+' : '' }}{{ lpChange }} LP
      </span>
    </div>
    <!-- LoL Ladebildschirm (5 vs 5) -->
    <div v-if="showResult" class="mb-8">
      <div class="relative flex flex-row w-full gap-6">
        <!-- Main Content -->
        <div
          class="flex flex-col items-center justify-center flex-1 px-2 py-8 border-4 shadow-2xl bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 rounded-2xl border-amber-300/40 backdrop-blur-md"
        >
          <!-- Team 1 (oben) -->
          <div class="flex flex-row items-end justify-center mb-4 space-x-4">
            <div
              v-for="(champ, idx) in team1"
              :key="'team1-' + idx"
              class="flex flex-col items-center"
            >
              <div
                class="relative flex items-center justify-center w-24 h-24 transition-transform duration-300 group hover:scale-110"
              >
                <img
                  :src="getChampionImage(champ.name)"
                  class="object-cover w-24 h-24 transition-all duration-300 border-4 rounded-full drop-shadow-lg border-amber-400 group-hover:shadow-2xl"
                  style="z-index: 1"
                  :alt="champ.name"
                />
                <div
                  class="absolute inset-0 border-4 border-yellow-600 rounded-full pointer-events-none"
                  style="z-index: 2"
                ></div>

                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute bottom-0 right-0 w-10 h-10 bg-white border-2 border-white rounded-full drop-shadow-lg"
                  style="z-index: 3"
                  :alt="champ.rank + ' Border'"
                />
              </div>
              <span
                class="mt-2 text-base font-bold text-gray-900 bg-white/80 px-2 py-0.5 rounded drop-shadow-lg border border-amber-200"
              >
                {{ champ.name }}
              </span>
              <span
                class="text-xs mt-1 text-gray-700 bg-white/70 px-2 py-0.5 rounded shadow border border-gray-200 flex flex-row gap-2 items-center"
              >
                <span class="font-semibold text-green-700">{{ champ.kills }} K</span>
                <span class="font-semibold text-red-700">{{ champ.deaths }} D</span>
                <span class="font-semibold text-blue-700">{{ champ.assists }} A</span>
              </span>
            </div>
          </div>
          <div class="mb-2 text-2xl font-bold text-amber-700">VS</div>
          <div class="flex flex-row items-start justify-center mt-2 space-x-4">
            <div
              v-for="(champ, idx) in team2"
              :key="'team2-' + idx"
              class="flex flex-col items-center"
            >
              <div
                class="relative flex items-center justify-center w-24 h-24 transition-transform duration-300 group hover:scale-110"
              >
                <img
                  :src="getChampionImage(champ.name)"
                  class="object-cover w-24 h-24 transition-all duration-300 border-4 border-blue-400 rounded-full shadow-xl group-hover:shadow-2xl"
                  style="z-index: 1"
                  :alt="champ.name"
                />
                <div
                  class="absolute inset-0 border-4 border-blue-600 rounded-full pointer-events-none"
                  style="z-index: 2"
                ></div>
                <!-- Optional: Rank-Icon Overlay -->
                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute bottom-0 right-0 w-10 h-10 bg-white border-2 border-white rounded-full shadow-md"
                  style="z-index: 3"
                  :alt="champ.rank + ' Border'"
                />
              </div>
              <span
                class="mt-2 text-base font-bold text-gray-900 bg-white/80 px-2 py-0.5 rounded shadow-sm border border-blue-200"
              >
                {{ champ.name }}
              </span>
              <span
                class="text-xs mt-1 text-gray-700 bg-white/70 px-2 py-0.5 rounded shadow border border-gray-200 flex flex-row gap-2 items-center"
              >
                <span class="font-semibold text-green-700">{{ champ.kills }} K</span>
                <span class="font-semibold text-red-700">{{ champ.deaths }} D</span>
                <span class="font-semibold text-blue-700">{{ champ.assists }} A</span>
              </span>
            </div>
          </div>
        </div>
        <!-- Chat Panel -->
        <div
          class="w-80 min-w-[300px] max-w-xs flex flex-col bg-white/90 border border-amber-300 rounded-2xl shadow-lg p-3 h-[32rem]"
        >
          <div class="flex items-center gap-2 mb-2 text-lg font-bold text-amber-800">
            <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6l-4 3V5z" />
            </svg>
            Chat
          </div>
          <div
            id="battle-chat-box"
            class="flex-1 p-2 mb-2 space-y-1 overflow-y-auto text-sm border rounded bg-white/70 border-amber-100"
          >
            <div
              v-for="(msg, idx) in chatMessages"
              :key="'msg-' + idx"
              class="flex items-start gap-2"
            >
              <span class="mr-2 text-xs text-gray-400 min-w-[40px]">{{ msg.time }}</span>
              <span class="font-bold text-amber-700" v-if="msg.user === 'Bard'"
                >{{ msg.user }}:</span
              >
              <span class="font-bold text-blue-700" v-else-if="msg.user === 'Team'"
                >{{ msg.user }}:</span
              >
              <span class="font-bold text-red-700" v-else>{{ msg.user }}:</span>
              <span class="break-words">{{ msg.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { ref, onMounted, defineExpose } from 'vue'
import { battleChatMessages } from '../config/battleChatMessages'

const props = defineProps<{
  result: any
  showResult: boolean
  mmrChange: number
  lpChange: number
}>()

const emit = defineEmits<{
  close: []
}>()

const gameStore = useGameStore()

function closeResult() {
  emit('close')
}

// Hilfsfunktion: champion.csv einlesen
async function loadChampions(): Promise<string[]> {
  const response = await fetch('/src/config/champion.csv')
  const text = await response.text()
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function getRandomChampions(champions: string[], count: number) {
  const arr = [...champions]
  const result = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * arr.length)
    result.push(arr.splice(idx, 1)[0])
  }
  return result
}

function getBorderImage(rank: string) {
  switch (rank) {
    case 'Iron':
      return '/img/RankBorder/RankIron.png'
    case 'Gold':
      return '/img/RankBorder/RankGold.png'
    case 'Silver':
      return '/img/RankBorder/RankSilver.png'
    case 'Bronze':
      return '/img/RankBorder/RankBronze.png'
    case 'Emerald':
      return '/img/RankBorder/RankEmerald.png'
    case 'Diamond':
      return '/img/RankBorder/RankDiamand.png'
    case 'Master':
      return '/img/RankBorder/RankMaster.png'
    case 'Grandmaster':
      return '/img/RankBorder/RankGrandMaster.png'
    case 'Challenger':
      return '/img/RankBorder/RankChallenger.png'
    case 'Platinum':
      return '/img/RankBorder/RankPlatin.png'
  }
}

function getChampionImage(name: string) {
  switch (name) {
    case 'Bard':
      return '/img/BardAbilities/Bard.png'
    default:
      return '/img/Enemy.png'
  }
}

interface ChampionWithStats {
  name: string
  rank: string
  kills: number
  deaths: number
  assists: number
}

const team1 = ref<ChampionWithStats[]>([])
const team2 = ref<ChampionWithStats[]>([])
const gameDuration = ref('')

const chatMessages = ref<any[]>([])

function getRandomTimeIncrement() {
  // Zeitinkrement zwischen 30 und 500 Sekunden
  return Math.floor(Math.random() * 471) + 30
}

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function showRandomChatMessagesSequentially() {
  chatMessages.value = []
  const messages = [...battleChatMessages]
  let currentTime = 120 // Start bei 02:00 (120 Sekunden)
  function showNext() {
    if (messages.length === 0) return
    const idx = Math.floor(Math.random() * messages.length)
    const msg = messages[idx]
    let chatMsg
    if (typeof msg === 'string') {
      const user = Math.random() < 0.5 ? 'Team' : 'Enemy'
      chatMsg = { user, text: msg, time: formatTime(currentTime) }
    } else if (typeof msg === 'object' && msg !== null) {
      const m = msg as any
      chatMsg = { user: m.user, text: m.text, time: formatTime(currentTime) }
    } else {
      chatMsg = { user: 'Team', text: String(msg), time: formatTime(currentTime) }
    }
    chatMessages.value.push(chatMsg)
    messages.splice(idx, 1)
    currentTime += getRandomTimeIncrement()
    if (messages.length > 0) {
      setTimeout(showNext, 1000)
    }
  }
  showNext()
}

function getRandomStats() {
  return {
    kills: Math.floor(Math.random() * 16), // 0-15
    deaths: Math.floor(Math.random() * 11), // 0-10
    assists: Math.floor(Math.random() * 21), // 0-20
  }
}

function getRandomDuration() {
  const min = 10
  const max = 70
  const minutes = Math.floor(Math.random() * (max - min + 1)) + min
  const seconds = Math.floor(Math.random() * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')} min`
}

function refreshTeams() {
  loadChampions().then((champions) => {
    // Bard immer als ersten Champion in Team 1

    const selected = getRandomChampions(champions, 9)
    team1.value = [
      { name: 'Bard', rank: gameStore.currentRank.tier, ...getRandomStats() },
      ...selected.slice(0, 4).map((name) => ({ name, rank: 'Silver', ...getRandomStats() })),
    ]
    team2.value = selected
      .slice(4, 9)
      .map((name) => ({ name, rank: 'Silver', ...getRandomStats() }))
    // Spieldauer generieren
    gameDuration.value = getRandomDuration()
  })
}

onMounted(() => {
  refreshTeams()
  showRandomChatMessagesSequentially()
})

defineExpose({ refreshTeams })
</script>

<script lang="ts">
export default {
  name: 'BattleResultComponent',
}
</script>
