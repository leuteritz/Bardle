<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'

const CORNER_R = 20
const framePath = `M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,${380 - CORNER_R} A ${CORNER_R},${CORNER_R} 0 0,1 ${2 - CORNER_R},380`

type TabId = 'all' | 'clan' | 'region'

interface ChatMessage {
  id: number
  name: string
  text: string
  time: string
  channel: TabId
}

const NPC_NAMES = [
  'Grimbald',
  'Thessaly',
  'Brak der Händler',
  'Mystara',
  'Fenwick',
  'Ronja',
  'Aldric',
  'Syla',
  'Dorfwächter Hanz',
  'Bote Erwin',
]

const MESSAGE_POOLS: Array<{ text: string; channel: TabId }> = [
  { text: 'Der Händler hat seltene Waren – beeilt euch!', channel: 'all' },
  { text: 'Wer braucht Heiltränke? 50 Chimes das Stück.', channel: 'all' },
  { text: 'Hat jemand mein Schwert gesehen…?', channel: 'all' },
  { text: 'Gerücht: Im alten Turm soll ein Drache hausen.', channel: 'all' },
  { text: 'Die Sterne stehen ungünstig heute Nacht.', channel: 'all' },
  { text: 'Hat jemand das neue Lied von Bard gehört?', channel: 'all' },
  { text: 'Die Taverne hat Bärenschinken. Sehr empfehlenswert.', channel: 'all' },
  { text: 'Vorsicht vor dem Wolf im Dunkelwald!', channel: 'all' },
  { text: 'Neue Quest verfügbar – suche tapfere Helden!', channel: 'all' },
  { text: 'Der Bürgermeister erhöht die Steuern. Wieder.', channel: 'all' },
  { text: 'Clan-Raid startet in 10 Minuten! Alle bereit?', channel: 'clan' },
  { text: 'Wir brauchen noch 2 Heiler für den Boss-Kampf.', channel: 'clan' },
  { text: 'Schatz geteilt – jeder bekommt 200 Chimes.', channel: 'clan' },
  { text: 'Clan-Burg aufgewertet! Stufe 5 erreicht.', channel: 'clan' },
  { text: 'Unser Clan ist jetzt Rang 3 auf dem Scoreboard!', channel: 'clan' },
  { text: 'Nächster Clan-Event: Drachenjagd morgen 20 Uhr.', channel: 'clan' },
  { text: 'Alle ins Lager – wichtige Besprechung!', channel: 'clan' },
  { text: 'Achtung, Goblin-Angriff im Norden!', channel: 'region' },
  { text: 'Die Brücke im Süden ist eingestürzt.', channel: 'region' },
  { text: 'Der König schickt Truppen – Krieg zieht auf!', channel: 'region' },
  { text: 'Händler-Karawane erreicht bald den Marktplatz.', channel: 'region' },
  { text: 'Erdbeben erschütterte das östliche Gebirge.', channel: 'region' },
  { text: 'Neue Siedlung im Westen – Pioniere gesucht.', channel: 'region' },
  { text: 'Pestilenz in Dorf Grauhain – Quarantäne angeordnet.', channel: 'region' },
]

const activeTab = ref<TabId>('all')
const messages = ref<ChatMessage[]>([])
const messagesEl = ref<HTMLElement | null>(null)
const inputValue = ref('')
let timeoutId: ReturnType<typeof setTimeout> | null = null
let msgCounter = 0

const filteredMessages = computed(() =>
  activeTab.value === 'all'
    ? messages.value
    : messages.value.filter((m) => m.channel === activeTab.value),
)

function getTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function pushMessage(msg: ChatMessage) {
  messages.value.push(msg)
  if (messages.value.length > 100) messages.value.shift()
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
}

function addMessage() {
  const entry = MESSAGE_POOLS[Math.floor(Math.random() * MESSAGE_POOLS.length)]
  const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)]
  pushMessage({ id: ++msgCounter, name, text: entry.text, time: getTime(), channel: entry.channel })
}

function sendMessage() {
  const text = inputValue.value.trim()
  if (!text) return
  pushMessage({ id: ++msgCounter, name: 'Du', text, time: getTime(), channel: activeTab.value })
  inputValue.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') sendMessage()
}

function scheduleNext() {
  const delay = 3000 + Math.random() * 3000
  timeoutId = setTimeout(() => {
    addMessage()
    scheduleNext()
  }, delay)
}

onMounted(() => {
  for (let i = 0; i < 6; i++) addMessage()
  scheduleNext()
})

onUnmounted(() => {
  if (timeoutId !== null) clearTimeout(timeoutId)
})
</script>

<template>
  <div class="chat-hud">
    <div class="chat-panel">
      <!-- BARDLE-Titel -->
      <div class="chat-header">
        <span class="chat-header-deco">✦</span>
        <span class="chat-header-title">BARDLE</span>
        <span class="chat-header-deco">✦</span>
      </div>

      <div class="chat-divider" />

      <!-- Tabs -->
      <div class="chat-tabs">
        <button
          v-for="tab in ['all', 'clan', 'region'] as TabId[]"
          :key="tab"
          :class="['chat-tab', `chat-tab--${tab}`, { active: activeTab === tab }]"
          @click="activeTab = tab"
        >
          <span class="tab-icon">{{ tab === 'all' ? '🌍' : tab === 'clan' ? '🛡' : '🗺' }}</span>
          {{ tab === 'all' ? 'Alle' : tab === 'clan' ? 'Clan' : 'Region' }}
          <span v-if="tab !== 'all'" class="tab-badge">
            {{ messages.filter((m) => m.channel === tab).length }}
          </span>
        </button>
      </div>

      <!-- Nachrichten -->
      <div ref="messagesEl" class="chat-messages">
        <transition-group name="msg">
          <div
            v-for="msg in filteredMessages"
            :key="msg.id"
            :class="['chat-row', { 'chat-row--self': msg.name === 'Du' }]"
          >
            <span class="chat-time">{{ msg.time }}</span>
            <span :class="['chat-name', `chat-name--${msg.channel}`]">{{ msg.name }}</span>
            <span class="chat-sep">›</span>
            <span class="chat-text">{{ msg.text }}</span>
          </div>
        </transition-group>
      </div>

      <div class="chat-divider" />

      <!-- Eingabe -->
      <div class="chat-input-row">
        <span class="chat-input-channel-dot" :class="`dot--${activeTab}`" />
        <input
          v-model="inputValue"
          class="chat-input"
          :placeholder="
            activeTab === 'all'
              ? 'Allen schreiben…'
              : activeTab === 'clan'
                ? 'Clan schreiben…'
                : 'Region schreiben…'
          "
          maxlength="200"
          @keydown="onKeydown"
        />
        <button class="chat-send-btn" @click="sendMessage" title="Senden (Enter)">
          <span>↵</span>
        </button>
      </div>
    </div>

    <!-- Äußerer Goldrahmen SVG – unverändert -->
    <svg
      class="chat-frame-svg"
      viewBox="0 0 440 440"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="chatGoldGlow" x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        :d="framePath"
        fill="none"
        stroke="rgba(30,12,0,0.95)"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        :d="framePath"
        fill="none"
        stroke="#7a4e20"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        :d="framePath"
        fill="none"
        stroke="rgba(210,160,40,0.85)"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#chatGoldGlow)"
      />
      <path
        :d="framePath"
        fill="none"
        stroke="rgba(255,220,80,0.25)"
        stroke-width="1"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<style scoped>
/* ── HUD Root ── */
.chat-hud {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 10000;
  pointer-events: none;
  width: 440px;
  height: 440px;
}

.chat-panel {
  position: absolute;
  bottom: 0;
  right: 0;
  pointer-events: auto;
  width: 440px;
  height: 440px;
  clip-path: path(
    'M 440,0 L 0,0 L 0,440 L 440,440 Z M 220,0 L 220,2 A 218,218 0 0,0 2,220 L 0,220 L 0,0 Z'
  );
  background:
    radial-gradient(ellipse at 80% 20%, rgba(80, 50, 10, 0.18) 0%, transparent 60%),
    linear-gradient(160deg, #1a0d04 0%, #120900 60%, #0e0700 100%);
  display: flex;
  flex-direction: column;
  padding: 52px 28px 20px 52px;
  box-sizing: border-box;
}

/* ── BARDLE-Header ── */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
  margin-bottom: 8px;
}

.chat-header-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 6px;
  color: #ffe080;
  text-shadow:
    0 0 18px rgba(232, 192, 64, 0.95),
    0 0 8px rgba(200, 140, 20, 0.8),
    0 0 2px rgba(255, 240, 160, 0.6);
  text-transform: uppercase;
  user-select: none;
}

.chat-header-deco {
  font-size: 12px;
  color: rgba(210, 160, 40, 0.6);
  user-select: none;
  margin-top: 2px;
}

/* ── Trennlinie ── */
.chat-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(210, 160, 40, 0.5), transparent);
  flex-shrink: 0;
  margin: 4px 0;
}

/* ── Tabs ── */
.chat-tabs {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  margin: 8px 0 6px;
}

.chat-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  color: #8a7a60;
  font-size: 12px;
  font-family: Georgia, serif;
  letter-spacing: 0.5px;
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}

.chat-tab:hover {
  background: rgba(255, 200, 60, 0.06);
  border-color: rgba(122, 78, 32, 0.8);
  color: #c8a030;
}

.chat-tab.active {
  background: rgba(232, 192, 64, 0.08);
  border-color: rgba(210, 160, 40, 0.4);
  color: #ffe080;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

.chat-tab--all.active {
  border-bottom-color: #e8c040;
}
.chat-tab--clan.active {
  border-bottom-color: #52b830;
}
.chat-tab--region.active {
  border-bottom-color: #6080cc;
}

.tab-icon {
  font-size: 12px;
}

.tab-badge {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 9px;
  padding: 1px 5px;
  color: #7a6040;
  margin-left: 2px;
}

.chat-tab.active .tab-badge {
  background: rgba(232, 192, 64, 0.15);
  color: #c8a030;
}

/* ── Nachrichten ── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 4px 4px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #0e0700;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}
.chat-messages::-webkit-scrollbar-track {
  background: #0e0700;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.chat-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  font-size: 13px;
  line-height: 1.5;
  padding: 3px 6px;
  border-radius: 4px;
  transition: background 0.1s ease;
}

.chat-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.chat-row--self {
  background: rgba(232, 192, 64, 0.05);
  border-left: 2px solid rgba(232, 192, 64, 0.3);
  padding-left: 8px;
}

.chat-time {
  font-size: 10px;
  color: #5c3310;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.chat-name {
  flex-shrink: 0;
  font-weight: 700;
  font-size: 12px;
  font-family: Georgia, serif;
}

.chat-name--all {
  color: #e8c040;
}
.chat-name--clan {
  color: #52b830;
}
.chat-name--region {
  color: #6080cc;
}

.chat-sep {
  color: #4a3020;
  flex-shrink: 0;
  font-size: 11px;
}

.chat-text {
  color: #c8bfa8;
  word-break: break-word;
}

.msg-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.msg-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

/* ── Eingabe ── */
.chat-input-row {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.chat-input-channel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
  transition: background 0.2s;
}

.dot--all {
  background: #e8c040;
}
.dot--clan {
  background: #52b830;
}
.dot--region {
  background: #6080cc;
}

.chat-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid #5c3310;
  border-radius: 6px;
  color: #d0c8b0;
  font-size: 13px;
  font-family: Georgia, serif;
  padding: 7px 12px;
  box-sizing: border-box;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.chat-input:focus {
  border-color: rgba(210, 160, 40, 0.6);
  box-shadow: 0 0 8px rgba(210, 160, 40, 0.2);
}

.chat-input::placeholder {
  color: #4a3820;
}

.chat-send-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background: linear-gradient(to bottom, #c8980a, #7a5c08);
  border: 1px solid #e8b820;
  border-radius: 6px;
  color: #fff8e0;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.chat-send-btn:hover {
  background: linear-gradient(to bottom, #e8b020, #9a7010);
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.4);
}

.chat-send-btn:active {
  transform: scale(0.95);
}

/* ── Goldrahmen SVG ── */
.chat-frame-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 440px;
  height: 440px;
  pointer-events: none;
  z-index: 100;
  overflow: visible;
  animation: chat-pulse-glow 3.5s ease-in-out infinite;
}

@keyframes chat-pulse-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(180, 130, 28, 0.45))
      drop-shadow(0 0 3px rgba(90, 58, 10, 0.65));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(210, 160, 40, 0.65))
      drop-shadow(0 0 6px rgba(120, 82, 15, 0.75));
  }
}

@media (max-width: 600px) {
  .chat-hud {
    display: none;
  }
}
</style>
