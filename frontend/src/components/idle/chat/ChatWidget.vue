<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'

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
  if (messages.value.length > 50) messages.value.shift()
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
  for (let i = 0; i < 4; i++) addMessage()
  scheduleNext()
})

onUnmounted(() => {
  if (timeoutId !== null) clearTimeout(timeoutId)
})
</script>

<template>
  <div class="chat-hud">
    <div class="chat-panel">
      <div class="chat-frame">
        <!-- Kompass-Bezel SVG -->
        <svg
          class="chat-compass-svg"
          viewBox="0 0 220 220"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <mask id="chatBezelMask">
              <circle cx="110" cy="110" r="107" fill="white" />
              <circle cx="110" cy="110" r="91" fill="black" />
            </mask>
            <radialGradient id="chatBezelGrad" cx="50%" cy="50%" r="50%">
              <stop offset="83%" stop-color="#2a1204" />
              <stop offset="100%" stop-color="#3e1e08" />
            </radialGradient>
            <filter id="chatSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="110" cy="110" r="107" fill="url(#chatBezelGrad)" mask="url(#chatBezelMask)" />
          <circle
            cx="110"
            cy="110"
            r="109"
            stroke="rgba(60,38,10,0.7)"
            stroke-width="1"
            fill="none"
          />
          <circle
            cx="110"
            cy="110"
            r="107"
            stroke="rgba(210,160,40,0.95)"
            stroke-width="1.8"
            fill="none"
            filter="url(#chatSoftGlow)"
          />
          <circle
            cx="110"
            cy="110"
            r="104"
            stroke="rgba(100,68,15,0.6)"
            stroke-width="0.8"
            fill="none"
          />
          <circle
            cx="110"
            cy="110"
            r="101"
            stroke="rgba(160,115,30,0.35)"
            stroke-width="0.6"
            fill="none"
          />
          <circle
            cx="110"
            cy="110"
            r="99.5"
            stroke="rgba(175,130,38,0.6)"
            stroke-dasharray="2.2 15.16"
            stroke-width="2"
            fill="none"
            transform="rotate(-90 110 110)"
          />
          <circle
            cx="110"
            cy="110"
            r="99.5"
            stroke="rgba(210,165,48,0.8)"
            stroke-dasharray="5 151.27"
            stroke-width="2.5"
            fill="none"
            transform="rotate(-45 110 110)"
          />
          <circle
            cx="110"
            cy="110"
            r="92.5"
            stroke="rgba(205,158,42,0.55)"
            stroke-width="1"
            fill="none"
          />
          <circle
            cx="110"
            cy="110"
            r="91"
            stroke="rgba(50,32,8,0.9)"
            stroke-width="1.2"
            fill="none"
          />
          <circle cx="185" cy="35" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
          <circle cx="185" cy="185" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
          <circle cx="35" cy="185" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
          <circle cx="35" cy="35" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
        </svg>

        <!-- Titel oben -->
        <span class="chat-title-label">⚔ Chat</span>

        <!-- Chat-Inhalt im Kreis -->
        <div class="chat-ring">
          <div class="chat-tabs">
            <button
              :class="['chat-tab', { active: activeTab === 'all' }]"
              @click="activeTab = 'all'"
            >
              Alle
            </button>
            <button
              :class="['chat-tab', { active: activeTab === 'clan' }]"
              @click="activeTab = 'clan'"
            >
              Clan
            </button>
            <button
              :class="['chat-tab', { active: activeTab === 'region' }]"
              @click="activeTab = 'region'"
            >
              Region
            </button>
          </div>

          <div ref="messagesEl" class="chat-messages">
            <div v-for="msg in filteredMessages" :key="msg.id" class="chat-row">
              <span class="chat-time">{{ msg.time }}</span>
              <span :class="['chat-name', `chat-name--${msg.channel}`]">{{ msg.name }}:</span>
              <span class="chat-text">{{ msg.text }}</span>
            </div>
          </div>

          <div class="chat-input-row">
            <input
              v-model="inputValue"
              class="chat-input"
              placeholder="Nachricht eingeben…"
              maxlength="200"
              @keydown="onKeydown"
            />
            <button class="chat-send-btn" @click="sendMessage">↵</button>
          </div>
        </div>
      </div>
    </div>

    <!--
      Gespiegelter Rahmen: MiniMap ist unten-links (Rahmen oben-rechts).
      Chat ist unten-rechts → Rahmen oben-links gespiegelt.
      Panel 440×440, Kompass-Mitte (220,220), r=218
      Top-links des Kreises: (220, 2) → gespiegelt: Arc von (220,0) sweep=0 nach (2,220)
      Senkrecht nach unten: (2,220) → (2,440) → (0,440)
    -->
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
      <!-- Schatten -->
      <path
        d="M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,352 A 14,14 0 0,0 0,380"
        fill="none"
        stroke="rgba(30,12,0,0.95)"
        stroke-width="5"
        stroke-linecap="square"
        stroke-linejoin="miter"
      />
      <!-- Braun -->
      <path
        d="M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,352 A 14,14 0 0,0 0,380"
        fill="none"
        stroke="#7a4e20"
        stroke-width="3"
        stroke-linecap="square"
        stroke-linejoin="miter"
      />
      <!-- Gold + Glow -->
      <path
        d="M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,352 A 14,14 0 0,0 0,380"
        fill="none"
        stroke="rgba(210,160,40,0.85)"
        stroke-width="1.5"
        stroke-linecap="square"
        stroke-linejoin="miter"
        filter="url(#chatGoldGlow)"
      />
      <!-- Highlight -->
      <path
        d="M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,352 A 14,14 0 0,0 0,380"
        fill="none"
        stroke="rgba(255,220,80,0.25)"
        stroke-width="1"
        stroke-linecap="square"
      />
    </svg>
  </div>
</template>

<style scoped>
.chat-hud {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 9998;
  pointer-events: none;
}

/* ── Panel: nur dunkelbraun, kein Ornament ── */
.chat-panel {
  position: relative;
  pointer-events: auto;
  width: 440px;
  background: #1e1006;
  border: none;
  border-radius: 0;
  /*
    Gespiegelter clip-path zur MiniMap.
    MiniMap schneidet oben-RECHTS weg → Chat schneidet oben-LINKS weg.
    Kompass-Mitte (220,220), r=218 → Top: (220,2), Left: (2,220)
  */
  clip-path: path(
    'M 440,0 L 0,0 L 0,440 L 440,440 Z M 220,0 L 220,2 A 218,218 0 0,0 2,220 L 0,220 L 0,0 Z'
  );
  overflow: visible;
  display: flex;
  flex-direction: column;
}

/* ── Frame (440×440) ── */
.chat-frame {
  position: relative;
  z-index: 20;
  width: 440px;
  height: 440px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  background: transparent;
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

/* ── Kompass-SVG ── */
.chat-compass-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

/* ── Titel oben (wie N-Label in MiniMap) ── */
.chat-title-label {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  font-weight: 700;
  font-family: Georgia, 'Times New Roman', serif;
  letter-spacing: 2px;
  color: #ffe080;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.95),
    0 0 4px rgba(150, 100, 20, 0.8);
  z-index: 3;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}

/* ── Kreisförmiger Chat-Bereich ── */
.chat-ring {
  width: 360px;
  height: 360px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  z-index: 1;
  background: rgba(10, 6, 2, 0.88);
  display: flex;
  flex-direction: column;
  padding: 32px 42px 28px;
  box-sizing: border-box;
}

/* ── Tabs ── */
.chat-tabs {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 6px;
}

.chat-tab {
  background: #1a1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #b0b0a0;
  font-size: 10px;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  user-select: none;
}

.chat-tab:hover {
  background: #2a1a0a;
  border-color: #7a4e20;
  color: #e8c040;
}

.chat-tab.active {
  background: #2a1a08;
  border-color: #e8c040;
  color: #e8c040;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.6);
}

/* ── Nachrichten ── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.chat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  font-size: 10px;
  line-height: 1.45;
}

.chat-time {
  color: #5c3310;
  flex-shrink: 0;
}
.chat-name {
  flex-shrink: 0;
  font-weight: 700;
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
.chat-text {
  color: #b0b0a0;
}

/* ── Eingabe ── */
.chat-input-row {
  flex-shrink: 0;
  margin-top: 6px;
  display: flex;
  gap: 4px;
}

.chat-input {
  width: 100%;
  background: #111008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #c0c0b0;
  font-size: 10px;
  padding: 4px 8px;
  box-sizing: border-box;
}

.chat-input::placeholder {
  color: #5c3310;
}

.chat-send-btn {
  flex-shrink: 0;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.chat-send-btn:hover {
  background: linear-gradient(to bottom, #66d040, #3a9a22);
}

/* ── Goldener Rahmen SVG ── */
.chat-frame-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 440px;
  height: 440px;
  pointer-events: none;
  z-index: 100;
  overflow: visible;
}

@media (max-width: 600px) {
  .chat-hud {
    display: none;
  }
}
</style>
