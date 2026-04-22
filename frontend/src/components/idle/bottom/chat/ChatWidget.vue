<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { createRandomChatMessage, type ChatMessage, type TabId } from '@/composables/useRandomChat'

const CORNER_R = 20
const framePath = `M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,${380 - CORNER_R} A ${CORNER_R},${CORNER_R} 0 0,1 ${2 - CORNER_R},380`

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

const tabMeta: Record<TabId, { label: string; icon: string }> = {
  all: { label: 'Alle', icon: '✦' },
  clan: { label: 'Clan', icon: '🛡' },
  region: { label: 'Region', icon: '🗺' },
}

const channelTotals = computed(() => ({
  all: messages.value.length,
  clan: messages.value.filter((m) => m.channel === 'clan').length,
  region: messages.value.filter((m) => m.channel === 'region').length,
}))

function getTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function pushMessage(msg: ChatMessage) {
  messages.value.push(msg)
  if (messages.value.length > 100) messages.value.shift()

  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

function addMessage() {
  pushMessage(createRandomChatMessage(++msgCounter))
}

function sendMessage() {
  const text = inputValue.value.trim()
  if (!text) return

  pushMessage({
    id: ++msgCounter,
    name: 'Du',
    text,
    time: getTime(),
    channel: activeTab.value,
  })

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
      <div class="chat-surface-fill" />
      <div class="chat-surface-glow" />
      <div class="chat-surface-floor" />

      <div class="chat-header-arc">
        <div class="chat-tabs">
          <button
            v-for="tab in ['all', 'clan', 'region'] as TabId[]"
            :key="tab"
            :class="['chat-tab', `chat-tab--${tab}`, { active: activeTab === tab }]"
            @click="activeTab = tab"
          >
            <span class="chat-tab__icon">{{ tabMeta[tab].icon }}</span>
            <span class="chat-tab__label">{{ tabMeta[tab].label }}</span>
            <span class="chat-tab__badge">
              {{
                tab === 'all' ? channelTotals.all : messages.filter((m) => m.channel === tab).length
              }}
            </span>
          </button>
        </div>
      </div>

      <div class="chat-body">
        <div ref="messagesEl" class="chat-messages">
          <transition-group name="msg">
            <div
              v-for="msg in filteredMessages"
              :key="msg.id"
              :class="[
                'chat-row',
                `chat-row--${msg.channel}`,
                { 'chat-row--self': msg.name === 'Du' },
              ]"
            >
              <div class="chat-row__top">
                <span class="chat-time">{{ msg.time }}</span>
                <span :class="['chat-name', `chat-name--${msg.channel}`]">{{ msg.name }}</span>
              </div>

              <div class="chat-row__body">
                <span class="chat-sep">✦</span>
                <span class="chat-text">{{ msg.text }}</span>
              </div>
            </div>
          </transition-group>
        </div>

        <div class="chat-input-wrap">
          <div class="chat-divider" />

          <div class="chat-input-shell">
            <span class="chat-input-channel-dot" :class="`dot--${activeTab}`" />

            <input
              v-model="inputValue"
              class="chat-input"
              :placeholder="
                activeTab === 'all'
                  ? 'An alle schreiben…'
                  : activeTab === 'clan'
                    ? 'Dem Clan schreiben…'
                    : 'In die Region schreiben…'
              "
              maxlength="200"
              @keydown="onKeydown"
            />

            <button class="chat-send-btn" @click="sendMessage" title="Senden (Enter)">
              <span class="chat-send-btn__icon">➜</span>
            </button>
          </div>
        </div>
      </div>
    </div>

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
.chat-hud {
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 10000;
  width: 440px;
  height: 440px;
  pointer-events: none;
}

.chat-panel {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 440px;
  height: 440px;
  pointer-events: auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  clip-path: path('M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,440 L 440,440 Z');
  background: transparent;
}

.chat-surface-fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
}

.chat-surface-glow {
  position: absolute;
  inset: auto 0 0 0;
  height: 140px;
  z-index: 0;
  background:
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 0%,
      rgba(18, 7, 2, 0.1) 24%,
      rgba(18, 7, 2, 0.28) 100%
    ),
    linear-gradient(180deg, rgba(103, 47, 10, 0.08), rgba(43, 16, 5, 0.2));
  pointer-events: none;
}

.chat-surface-floor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120px;
  z-index: 0;
  background: linear-gradient(180deg, rgba(30, 12, 4, 0.72) 0%, rgba(22, 8, 2, 0.98) 100%), #160802;
  pointer-events: none;
}

.chat-header-arc {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 96px;
  padding: 14px 14px 0 54px;
  display: flex;
  align-items: flex-start;
  z-index: 2;
}

.chat-header-arc::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 115%, rgba(255, 205, 96, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(92, 50, 18, 0.24), rgba(46, 22, 8, 0.08));
  pointer-events: none;
}

.chat-tabs {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  padding-left: 2px;
  padding-top: 6px;
}

.chat-tab {
  min-width: 0;
  min-height: 48px;
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 8px 9px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(78, 44, 18, 0.52), rgba(40, 20, 8, 0.62));
  border: 1px solid rgba(255, 214, 140, 0.08);
  color: #c6ae7d;
  box-shadow:
    inset 0 1px 0 rgba(255, 238, 190, 0.04),
    0 6px 12px rgba(0, 0, 0, 0.18);
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    background 0.16s ease,
    box-shadow 0.16s ease;
}

.chat-tab:hover {
  transform: translateY(-1px);
  color: #f1dbab;
  border-color: rgba(232, 192, 64, 0.16);
}

.chat-tab.active {
  color: #fff0c3;
  background: linear-gradient(180deg, rgba(110, 63, 23, 0.68), rgba(54, 28, 10, 0.76));
  border-color: rgba(232, 192, 64, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 244, 210, 0.06),
    0 8px 16px rgba(0, 0, 0, 0.22);
}

.chat-tab--clan.active {
  border-color: rgba(82, 184, 48, 0.22);
}

.chat-tab--region.active {
  border-color: rgba(96, 128, 204, 0.22);
}

.chat-tab__icon {
  font-size: 13px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-tab__label {
  min-width: 0;
  font-family: Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.chat-tab__badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 228, 160, 0.08);
  color: #ebd39c;
  font-size: 10px;
  font-weight: 700;
}

.chat-body {
  position: absolute;
  inset: 96px 14px 0 14px;
  z-index: 2;
}

.chat-messages {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 88px;
  overflow-y: auto;
  padding: 2px 2px 8px 2px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 78, 24, 0.95) rgba(20, 10, 4, 0.28);
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(20, 10, 4, 0.24);
  border-radius: 999px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8c5d1b, #5d3810);
  border-radius: 999px;
}

.chat-row {
  padding: 10px 12px 11px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(58, 29, 11, 0.56), rgba(33, 16, 7, 0.72));
  border: 1px solid rgba(255, 214, 140, 0.07);
  box-shadow:
    inset 0 1px 0 rgba(255, 238, 190, 0.03),
    0 4px 10px rgba(0, 0, 0, 0.14);
  transition:
    transform 0.14s ease,
    border-color 0.14s ease,
    background 0.14s ease;
}

.chat-row:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 214, 140, 0.1);
}

.chat-row--self {
  background: linear-gradient(180deg, rgba(88, 52, 16, 0.65), rgba(42, 22, 8, 0.78));
  border-color: rgba(232, 192, 64, 0.14);
}

.chat-row__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.chat-row__body {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.chat-time {
  color: #806042;
  font-size: 11px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.chat-name {
  font-size: 13px;
  line-height: 1;
  font-weight: 700;
  font-family: Georgia, serif;
}

.chat-name--all {
  color: #f0c85f;
}

.chat-name--clan {
  color: #6aca48;
}

.chat-name--region {
  color: #7ea0f5;
}

.chat-sep {
  color: #8b6941;
  font-size: 11px;
  line-height: 1.5;
  padding-top: 1px;
  flex-shrink: 0;
}

.chat-text {
  color: #e3d5ba;
  font-size: 15px;
  line-height: 1.42;
  word-break: break-word;
}

.msg-enter-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.msg-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.chat-input-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  z-index: 3;
}

.chat-divider {
  height: 1px;
  margin: 0 0 10px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(232, 192, 64, 0.08) 12%,
    rgba(232, 192, 64, 0.34) 50%,
    rgba(232, 192, 64, 0.08) 88%,
    transparent 100%
  );
}

.chat-input-shell {
  display: grid;
  grid-template-columns: 10px 1fr 50px;
  align-items: center;
  gap: 10px;
  min-height: 60px;
  padding: 10px 10px 10px 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(64, 30, 10, 0.9), rgba(24, 10, 4, 0.96));
  border: 1px solid rgba(232, 192, 64, 0.1);
  box-shadow:
    inset 0 1px 0 rgba(255, 238, 190, 0.03),
    0 8px 16px rgba(0, 0, 0, 0.22);
}

.chat-input-channel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}

.dot--all {
  background: #e8c040;
  color: #e8c040;
}

.dot--clan {
  background: #52b830;
  color: #52b830;
}

.dot--region {
  background: #6080cc;
  color: #6080cc;
}

.chat-input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: #efe1c6;
  font-size: 15px;
  line-height: 1.3;
  font-family: Georgia, serif;
}

.chat-input::placeholder {
  color: #8b704d;
}

.chat-send-btn {
  width: 50px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #d7a62d 0%, #ac7110 55%, #7c4d09 100%);
  border: 1px solid rgba(255, 226, 146, 0.42);
  color: #fff7df;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 8px 16px rgba(0, 0, 0, 0.24);
  transition:
    transform 0.14s ease,
    filter 0.14s ease;
}

.chat-send-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.chat-send-btn:active {
  transform: scale(0.96);
}

.chat-send-btn__icon {
  font-size: 18px;
  transform: translateX(1px);
}

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
