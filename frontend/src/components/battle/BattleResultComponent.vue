<template>
  <div
    v-if="showResult"
    class="relative w-full p-8 mx-4 shadow-2xl bg-white/95 backdrop-blur-sm rounded-3xl border-amber-200"
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
        class="min-w-[90px] text-2xl font-bold border rounded-lg shadow px-4 py-1 flex items-center justify-center bg-gray-100 text-gray-700 border-gray-300 absolute left-0"
        style="left: 0"
      >
        {{ formatTime(gameTime) }}
      </span>
      <h2
        class="mx-auto text-4xl font-bold"
        :class="result.won ? 'text-green-600' : 'text-red-600'"
      >
        {{ result.won ? 'VICTORY!' : 'DEFEAT!' }}
      </h2>
      <BattleMessageComponent />
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
    <!-- LoL Loading Screen (5 vs 5) -->
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
                  class="object-cover w-24 h-24 transition-all duration-300 border-4 border-blue-500 rounded-full drop-shadow-lg group-hover:shadow-2xl"
                  style="z-index: 1"
                  :alt="champ.name"
                />

                <div
                  v-if="champ.name === 'Bard'"
                  class="absolute inset-0 border-4 rounded-full pointer-events-none border-amber-500"
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
                :title="champ.name"
              >
                {{ champ.name.length > 10 ? champ.name.slice(0, 10) + '...' : champ.name }}
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
                  class="object-cover w-24 h-24 transition-all duration-300 border-4 border-red-500 rounded-full shadow-xl group-hover:shadow-2xl"
                  style="z-index: 1"
                  :alt="champ.name"
                />
                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute bottom-0 right-0 w-10 h-10 bg-white border-2 border-white rounded-full shadow-md"
                  style="z-index: 2"
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

        <!-- Chat Panel + Minimap als Spalte -->
        <div
          class="w-80 min-w-[300px] max-w-xs flex flex-col bg-white/90 border border-amber-300 rounded-2xl shadow-lg p-3 h-[32rem]"
        >
          <div class="flex flex-col flex-1 h-full">
            <!-- Chat  -->
            <div class="flex-1 min-h-0 mb-2" style="max-height: 48%">
              <ChatPanelComponent :chat-messages="chatMessages" />
            </div>
            <!-- Minimap -->
            <div class="flex items-center justify-center flex-1 min-h-0" style="max-height: 40%">
              <MiniMapComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useGameStore } from '../../stores/gameStore'
import { ref, onMounted, watch, nextTick, defineComponent } from 'vue'
import { battleChatMessages } from '../../config/battleChatMessages'
import MiniMapComponent from './MiniMapComponent.vue'
import ChatPanelComponent from './ChatPanelComponent.vue'
import BattleMessageComponent from './BattleMessageComponent.vue'

export default defineComponent({
  name: 'BattleResultComponent',
  components: { MiniMapComponent, ChatPanelComponent, BattleMessageComponent },
  props: {
    result: { type: Object, required: true },
    showResult: { type: Boolean, required: true },
    mmrChange: { type: Number, required: true },
    lpChange: { type: Number, required: true },
  },
  setup(props, { emit, expose }) {
    const team1 = ref<any[]>([])
    const team2 = ref<any[]>([])
    const gameStore = useGameStore()
    const gameTime = ref(120) // 120 s -> 02:00 min
    const chatMessages = ref<any[]>([])

    function closeResult() {
      emit('close')
    }
    async function loadChampions() {
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
    function formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }
    function getRandomTimeIncrement() {
      return Math.floor(Math.random() * 471) + 30
    }
    function showRandomChatMessagesSequentially() {
      chatMessages.value = []

      if (!team1.value.length || !team2.value.length) {
        setTimeout(() => showRandomChatMessagesSequentially(), 100)
        return
      }
      const messages = [...battleChatMessages]

      function showNext() {
        if (messages.length === 0) return
        const idx = Math.floor(Math.random() * messages.length)
        const msg = messages[idx]
        let chatMsg
        if (typeof msg === 'string') {
          const allChampions = [
            ...team1.value.map((champ) => ({ name: champ.name, team: 1 })),
            ...team2.value.map((champ) => ({ name: champ.name, team: 2 })),
          ]

          const randomChampion = allChampions[Math.floor(Math.random() * allChampions.length)]

          chatMsg = {
            user: randomChampion.name,
            text: msg,
            time: formatTime(gameTime.value),
            team: randomChampion.team,
          }
        }
        chatMessages.value.push(chatMsg)
        messages.splice(idx, 1)
        gameTime.value += getRandomTimeIncrement()
        if (messages.length > 0) {
          setTimeout(showNext, gameStore.gameSpeed)
        }
      }
      showNext()
    }

    function getStats() {
      return {
        kills: 0,
        deaths: 0,
        assists: 0,
      }
    }

    function refreshTeams() {
      loadChampions().then((champions) => {
        const selected = getRandomChampions(champions, 9)
        team1.value = [
          { name: 'Bard', rank: gameStore.currentRank.tier, ...getStats() },
          ...selected.slice(0, 4).map((name) => ({ name, rank: 'Silver', ...getStats() })),
        ]
        team2.value = selected.slice(4, 9).map((name) => ({ name, rank: 'Silver', ...getStats() }))
      })
    }

    function randomStatsTick() {
      ;[team1.value, team2.value].forEach((team) => {
        team.forEach((champ) => {
          if (Math.random() < 0.5) champ.kills += Math.round(Math.random() * 3)
          if (Math.random() < 0.3) champ.deaths += Math.round(Math.random() * 2)
          if (Math.random() < 0.7) champ.assists += Math.round(Math.random() * 7)
        })
      })
      setTimeout(randomStatsTick, gameStore.gameSpeed)
    }

    onMounted(() => {
      refreshTeams()
      showRandomChatMessagesSequentially()
      randomStatsTick()
    })

    expose({ refreshTeams })
    watch(
      () => chatMessages.value.length,
      async () => {
        await nextTick()
        const chatBox = document.getElementById('battle-chat-box')
        if (chatBox) {
          chatBox.scrollTop = chatBox.scrollHeight
        }
      },
    )
    return {
      team1,
      team2,
      gameTime,
      chatMessages,
      closeResult,
      getChampionImage,
      getBorderImage,
      formatTime,
      refreshTeams,
      ...props,
    }
  },
})
</script>
