<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useTeamSigil } from '@/composables/useTeamSigil'
import {
  ROLES,
  SIGIL_STAGE_SIZE,
  SIGIL_CREST_SIZE,
  TEAM_SIGIL_ZOOM_MIN,
  TEAM_SIGIL_ZOOM_MAX,
  TEAM_SIGIL_ZOOM_STEP,
  TEAM_SIGIL_ZOOM_DEFAULT,
  TEAM_SIGIL_FOCUS_ZOOM,
} from '@/config/constants'
import SigilSvgLayers from './SigilSvgLayers.vue'
import SigilRoleNode from './SigilRoleNode.vue'

const props = defineProps<{
  selectedRole: number | null
}>()

const emit = defineEmits<{
  'select-role': [roleIndex: number]
  'select-ally': [roleIndex: number, subSlot: number]
}>()

const {
  mainFilled,
  filledSlots,
  roleFull,
  sigilStage,
  showPentagram,
  showMandala,
  teamPower,
  rolePoints,
  allyPoints,
  embers,
} = useTeamSigil()

const roleColors = ROLES.map((r) => r.color)

// ── Zoom (mirrors ForgeTreePanel) ────────────────────────────────────────────
const panelEl = ref<HTMLElement | null>(null)
const zoom = ref(TEAM_SIGIL_ZOOM_DEFAULT)
const fitScale = ref(1)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!panelEl.value) return
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    fitScale.value = Math.min(rect.width, rect.height) / SIGIL_STAGE_SIZE
  })
  resizeObserver.observe(panelEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// ── Camera focus on the selected role cluster ────────────────────────────────
/** Focal point = centroid of the role node and its two allies (stage coords). */
const focusPoint = computed(() => {
  const i = props.selectedRole
  if (i === null) return null
  const r = rolePoints.value[i]
  const [a1, a2] = allyPoints.value[i]
  return { x: (r.x + a1.x + a2.x) / 3, y: (r.y + a1.y + a2.y) / 3 }
})

const totalScale = computed(
  () => fitScale.value * zoom.value * (focusPoint.value ? TEAM_SIGIL_FOCUS_ZOOM : 1),
)

/** Pans the stage so the focal point lands on the container center (screen px). */
const stageTransform = computed(() => {
  const s = totalScale.value
  const f = focusPoint.value
  const half = SIGIL_STAGE_SIZE / 2
  const pan = f ? `translate(${-(f.x - half) * s}px, ${-(f.y - half) * s}px) ` : ''
  return `${pan}translate(-50%, -50%) scale(${s})`
})

const zoomKnobPos = computed(() => {
  const t = (zoom.value - TEAM_SIGIL_ZOOM_MIN) / (TEAM_SIGIL_ZOOM_MAX - TEAM_SIGIL_ZOOM_MIN)
  return `${Math.round(t * 100)}%`
})

function zoomBy(direction: number): void {
  zoom.value = Math.min(
    TEAM_SIGIL_ZOOM_MAX,
    Math.max(TEAM_SIGIL_ZOOM_MIN, zoom.value + direction * TEAM_SIGIL_ZOOM_STEP),
  )
}

function onWheel(event: WheelEvent): void {
  zoomBy(event.deltaY < 0 ? 1 : -1)
}
</script>

<template>
  <div ref="panelEl" class="sigil-board" @wheel.prevent="onWheel">
    <!-- zoom control -->
    <div class="sigil-zoom">
      <button class="zoom-btn" aria-label="Zoom out" @click="zoomBy(-1)">−</button>
      <div class="zoom-track">
        <div class="zoom-knob" :style="{ bottom: zoomKnobPos }" />
      </div>
      <button class="zoom-btn" aria-label="Zoom in" @click="zoomBy(1)">＋</button>
    </div>

    <!-- scaled sigil stage -->
    <div
      class="sigil-stage"
      :style="{
        width: `${SIGIL_STAGE_SIZE}px`,
        height: `${SIGIL_STAGE_SIZE}px`,
        transform: stageTransform,
      }"
    >
      <SigilSvgLayers
        :stage="sigilStage"
        :filled-slots="filledSlots"
        :role-points="rolePoints"
        :role-colors="roleColors"
        :main-filled="mainFilled"
        :role-full="roleFull"
        :selected-role="selectedRole"
        :show-pentagram="showPentagram"
        :show-mandala="showMandala"
      />

      <!-- center crest -->
      <div
        class="sigil-crest-pulse"
        :style="{
          width: `${SIGIL_CREST_SIZE}px`,
          height: `${SIGIL_CREST_SIZE}px`,
          borderColor: sigilStage.crestColor,
          animationDuration: sigilStage.pulseSec > 0 ? `${sigilStage.pulseSec}s` : undefined,
          animationName: sigilStage.pulseSec > 0 ? undefined : 'none',
        }"
      />
      <div
        class="sigil-crest"
        :style="{ width: `${SIGIL_CREST_SIZE}px`, height: `${SIGIL_CREST_SIZE}px` }"
      >
        <Icon
          icon="game-icons:crenel-crown"
          width="30"
          height="30"
          :style="{ color: sigilStage.crestColor }"
        />
        <div class="sigil-crest-power" :style="{ color: sigilStage.crestColor }">
          {{ $formatNumber(teamPower) }}
        </div>
        <div class="sigil-crest-label">Team Power</div>
        <div
          class="sigil-crest-stage"
          :style="{ color: sigilStage.crestColor, textShadow: `0 0 9px ${sigilStage.crestColor}` }"
        >
          {{ sigilStage.name }}
        </div>
      </div>

      <!-- escalation embers -->
      <div
        v-for="(ember, k) in embers"
        :key="`ember-${k}`"
        class="sigil-ember"
        :style="{
          left: `${ember.x}px`,
          top: `${ember.y}px`,
          width: `${ember.size}px`,
          height: `${ember.size}px`,
          background: sigilStage.crestColor,
          boxShadow: `0 0 6px ${sigilStage.crestColor}`,
          animationDelay: `${ember.delaySec}s`,
          animationDuration: `${ember.durationSec}s`,
        }"
      />

      <!-- role nodes + ally satellites -->
      <SigilRoleNode
        v-for="(role, i) in ROLES"
        :key="role.key"
        :role-index="i"
        :point="rolePoints[i]"
        :ally-points="allyPoints[i]"
        :selected="selectedRole === i"
        :full="roleFull[i]"
        @select="emit('select-role', i)"
        @select-ally="(sub: number) => emit('select-ally', i, sub)"
      />
    </div>

  </div>
</template>

<style scoped>
.sigil-board {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at 42% 46%, #1c1409, #0b0705 72%);
}
.sigil-board::after {
  content: '';
  position: absolute;
  inset: 14px;
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-radius: 5px;
  pointer-events: none;
}

/* ── zoom (mirrors ForgeTreePanel) ── */
.sigil-zoom {
  position: absolute;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 6;
}
.zoom-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  color: #e8c040;
  background: rgba(20, 12, 2, 0.85);
  border: 1px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.zoom-btn:hover {
  background: rgba(40, 24, 6, 0.95);
  border-color: #c89040;
}
.zoom-track {
  width: 4px;
  height: 90px;
  background: rgba(200, 144, 64, 0.2);
  border-radius: 2px;
  position: relative;
}
.zoom-knob {
  position: absolute;
  left: 50%;
  transform: translate(-50%, 50%);
  width: 12px;
  height: 12px;
  background: #c89040;
  border-radius: 50%;
}

/* ── stage ── */
.sigil-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center center;
  /* camera pan/zoom (TEAM_SIGIL_CAMERA_MS) — also smooths wheel zoom */
  transition: transform 0.45s cubic-bezier(0.25, 0.8, 0.35, 1);
}
.sigil-crest-pulse {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid;
  pointer-events: none;
  animation: crest-pulse 3.5s ease-out infinite;
}
.sigil-crest {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: radial-gradient(circle at 50% 36%, #2a1f10, #0e0906);
  box-shadow:
    0 0 0 2px #7a5a1e,
    0 0 28px rgba(220, 170, 60, 0.3),
    inset 0 0 22px rgba(0, 0, 0, 0.75);
}
.sigil-crest-power {
  font-size: 28px;
  line-height: 1;
  text-shadow: 0 0 12px rgba(220, 170, 60, 0.45);
}
.sigil-crest-label {
  font-size: 8.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.6);
}
.sigil-crest-stage {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 2px;
}
.sigil-ember {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  animation: ember-rise 2.8s ease-out infinite;
  z-index: 1;
}

@keyframes crest-pulse {
  0% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1);
  }
  72%,
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.55);
  }
}
@keyframes ember-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(8px) scale(0.5);
  }
  22% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-34px) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sigil-stage {
    transition: none;
  }
  .sigil-crest-pulse,
  .sigil-ember {
    animation: none !important;
  }
}
</style>
