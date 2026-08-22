<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="isPaused"
        class="pause-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        @click.self="unpause"
      >
        <!-- Drifting star dust -->
        <div class="pause-particles" aria-hidden="true">
          <span v-for="i in 14" :key="i" class="particle" :style="particleStyle(i)" />
        </div>

        <div ref="stageEl" class="pause-stage" @click.self="unpause">
          <div
            ref="panelEl"
            class="pause-panel"
            :style="{
              transform: `scale(${panelScale})`,
              width: `${PAUSE_PANEL_DESIGN_WIDTH}px`,
            }"
          >
          <!-- Shared cosmic starfield inside the panel — same backdrop component
               as the shop/skill-tree tabs. Sits above the flat panel fill
               (#111008) but below the content (z-index: -1). -->
          <CosmicStageBackground class="pause-cosmic-bg" />
          <RpgFrame />
          <!-- Kopfzeile: Titel und Uhr teilen sich EINE Zeile. Getrennt
               untereinander kostete das Paar 133 px Panelhöhe — die teuerste
               Grösse im Panel, weil der Fit-Scale auf jeder Referenzauflösung
               höhenlimitiert ist. -->
          <header class="pause-head">
            <h1 class="pause-title">Paused</h1>
            <div class="pause-timer" role="timer" aria-label="Pause duration">
              <span class="pause-timer__tag">Adrift for</span>
              <span class="pause-timer__value">
                <!-- Zweite, deckungsgleiche Lage derselben Ziffern: sie trägt
                     KEINE Farbe, nur den kräftigen Schein, und allein ihre
                     Opazität atmet. Der Takt lag vorher auf `text-shadow` der
                     Ziffern selbst — das rastert die Zeile in jedem Frame neu
                     (siehe „Performance" Regel 2 und 11). -->
                <span class="pause-timer__glow" aria-hidden="true">
                  <span
                    v-for="(ch, i) in timerChars"
                    :key="i"
                    :class="ch === ':' ? 'timer-sep' : 'timer-digit'"
                  >{{ ch }}</span>
                </span>
                <span
                  v-for="(ch, i) in timerChars"
                  :key="i"
                  :class="ch === ':' ? 'timer-sep' : 'timer-digit'"
                >{{ ch }}</span>
              </span>
            </div>
          </header>
          <span class="pause-head__rule" aria-hidden="true"></span>

          <!-- Zwei Spalten statt zehn Bänder: links, was während der Pause
               hereinkam, rechts, wie es steht. Nebeneinander statt untereinander
               spart rund 200 px Höhe — und weil der Fit-Scale höhenlimitiert
               ist, wächst dadurch die Skalierung des GANZEN Overlays.

               Beide Spalten sind `stretch` und verteilen ihren Überschuss mit
               `space-between`; die Body-Höhe ist die der höheren. Getrennt wird
               mit einer Haarlinie, nicht mit zwei Kästen. -->
          <div
            class="pause-body"
            :style="{
              '--state-col-w': `${PAUSE_STATE_COL_WIDTH}px`,
              '--body-gap': `${PAUSE_BODY_COL_GAP}px`,
            }"
          >
            <!-- ── Links: die Bilanz ─────────────────────────────────── -->
            <section class="tally-col">
              <h2 class="col-head">The tally</h2>

              <!-- Der Heiligenschein liegt als eigene Ebene hinter der Münze und
                   blendet im Takt auf; die Münze selbst trägt ihren Schatten
                   statisch. Vorher atmete ein `drop-shadow`-Filter direkt am
                   Bild — jeder Frame eine Neurasterung (siehe „Performance"
                   Regel 2). -->
              <!-- ZWEI Ablesungen, nicht eine: was hereinkam, und wie weit es
                   bis zum nächsten Meep noch trägt. Beide Füllstände laufen
                   während der Pause weiter — die Produktion zahlt ein, auch
                   wenn niemand klickt —, und deshalb gehören sie in dieselbe
                   Zeile.

                   Gezählt wird in CHIMES, nicht in Klicks. Die Klickstrecke
                   (`clicksToNextMeep`) rechnet bewusst nur über den Klickwert
                   und ist im Stillstand die falsche Größe; sie steht draußen
                   an der Passiv-Kachel, wo geklickt wird. -->
              <div
                class="chime-readout"
                :style="{
                  '--readout-orb': `${PAUSE_READOUT_ORB_PX}px`,
                  '--readout-gap': `${PAUSE_READOUT_GAP_PX}px`,
                }"
              >
                <div class="chime-readout__part">
                  <span class="chime-orb">
                    <span class="chime-orb__halo" aria-hidden="true" />
                    <img src="/img/BardAbilities/BardChime.png" alt="" class="chime-img" />
                  </span>
                  <span class="chime-stack">
                    <span class="chime-value-row">
                      <!-- Kurzform, nicht formatNumber: die hängt immer zwei
                           Nachkommastellen an („999.99K", sieben Zeichen) und
                           macht die Zahl damit unbegrenzt breit. Dieselbe
                           Stelle wie bei den Kill-Chips und beim SunLedger. -->
                      <span v-ink-center.y class="chime-value"
                        >+{{ formatNumberCompact(accumulatedChimes) }}</span
                      >
                    </span>
                    <span class="chime-cap">Chimes gathered</span>
                  </span>
                </div>

                <div class="chime-readout__part">
                  <span class="chime-orb">
                    <span class="chime-orb__halo chime-orb__halo--meep" aria-hidden="true" />
                    <!-- Original, nicht `-128`: eine 256er Fassung des Meeps
                         gibt es nicht, und 128 reicht bei 72 px Anzeige auf
                         einem 2×-Schirm nicht. Der Chime daneben nimmt aus
                         demselben Grund das Original. -->
                    <img :src="MEEP_ART_IMAGE" alt="" class="chime-img" />
                  </span>
                  <span class="chime-stack">
                    <span class="chime-value-row">
                      <!-- Steht die Strecke auf 0, ist der Meep fällig — dann
                           das Wort, nicht „0". -->
                      <span v-ink-center.y class="chime-value chime-value--meep">{{
                        chimesToNextMeep > 0 ? formatNumberCompact(chimesToNextMeep) : 'Ready'
                      }}</span>
                      <!-- Der Bestand steht NEBEN der Zahl, nicht unter ihr und
                           nicht in der Beschriftung: als dritte Zeile machte er
                           den Block 23 px höher (Fit-Scale), in der
                           Beschriftung war die Zeile mit 370 px zu breit und
                           brach um. -->
                      <span class="chime-value-note"
                        >· {{ formatNumberCompact(gameStore.pendingMeeps) }} pending</span
                      >
                    </span>
                    <span class="chime-cap">To next meep</span>
                  </span>
                </div>
              </div>

              <!-- Kills aufgeschlüsselt: die Gesamtzahl steht im Kopf, darunter
                   steht, was tatsächlich gefallen ist. Zeilen ohne Treffer
                   bleiben stehen und dimmen nur ab — sonst spränge das Layout,
                   sobald während der Pause die erste Kategorie dazukommt. -->
              <div class="tally-block">
                <span class="sec-head">
                  <Icon icon="game-icons:crossed-swords" width="18" height="18" class="sec-head__icon" aria-hidden="true" />
                  Kills
                  <span v-if="pauseKills > 0" class="sec-head__n">{{ formatNumber(pauseKills) }}</span>
                </span>
                <!-- Ein Chip je Kategorie nebeneinander statt einer Liste
                     untereinander: waagerecht bekommt dieselbe Zahl doppelt so
                     viel Schrift. Getrennt wird mit dem Farbstrich der
                     Kategorie, nicht mit fünf Kästchen. -->
                <div class="kill-row">
                  <div
                    v-for="row in killBreakdown"
                    :key="row.key"
                    class="kill-chip"
                    :class="{ 'kill-chip--zero': row.count === 0 }"
                    :style="{ '--kill-color': row.color }"
                    :title="row.title"
                  >
                    <!-- Kurzform, nicht formatNumber: die hängt immer zwei
                         Nachkommastellen an („12.35K", sechs Zeichen) und lief in
                         einem 117-px-Chip gemessen über. Dieselbe Stelle wie beim
                         SunLedger. -->
                    <span class="kill-chip__count">{{ formatNumberCompact(row.count) }}</span>
                    <span class="kill-chip__label">{{ row.label }}</span>
                  </div>
                </div>
              </div>

              <!-- Fünf Karten je Reihe, zwei Reihen — damit passen alle zehn
                   Materialien hinein. Die Karten haben KEINE eigene Fassung
                   (kein Rahmen, keine Füllung, keine Aura): der Platz, den sie
                   gekostet haben, gehört dem Bild — es füllt seine Zelle
                   vollständig aus. Übrig bleiben Bild und Menge. -->
              <div class="tally-block">
                <span class="sec-head">
                  <Icon icon="game-icons:ore" width="18" height="18" class="sec-head__icon" aria-hidden="true" />
                  Materials
                  <span v-if="totalMaterials > 0" class="sec-head__n">{{ formatNumber(totalMaterials) }}</span>
                </span>
                <span v-if="visibleMaterials.length === 0" class="mat-empty">Nothing yet</span>
                <TransitionGroup
                  v-else
                  tag="div"
                  name="mat-pop"
                  class="mat-grid"
                  :style="{
                    '--mat-cols': PAUSE_MATERIAL_COLUMNS,
                    '--mat-rows': PAUSE_MATERIAL_ROWS,
                    '--mat-row-h': `${PAUSE_MATERIAL_CELL_PX}px`,
                    '--mat-gap': `${PAUSE_MATERIAL_GAP_PX}px`,
                    '--mat-grid-w': `${PAUSE_MATERIAL_TILE_WIDTH}px`,
                  }"
                >
                  <div
                    v-for="mat in visibleMaterials"
                    :key="mat.id"
                    class="mat-card"
                    :style="{ '--mat-color': mat.color }"
                    :title="`${mat.name} — ${mat.rarity}`"
                  >
                    <img v-if="mat.image" :src="mat.image" :alt="mat.name" class="mat-card__img" />
                    <!-- Vier der zehn Materialien haben in den Stammdaten kein
                         Bild; sie bekommen dasselbe Monogramm wie im Loot-Band
                         des Star-Fight-Modals, statt leer zu bleiben. -->
                    <span v-else class="mat-card__mono">{{ mat.monogram }}</span>
                    <span class="mat-card__amount"
                      ><span class="mat-card__x" aria-hidden="true">×</span
                      >{{ formatNumber(mat.amount) }}</span
                    >
                  </div>
                  <div v-if="hiddenMaterialCount > 0" key="more" class="mat-card mat-card--more">
                    +{{ hiddenMaterialCount }}
                  </div>
                </TransitionGroup>
              </div>

              <!-- Auto-Battle-Bilanz der Pause -->
              <div class="tally-block">
                <span class="sec-head">
                  <Icon icon="ri:sword-fill" width="18" height="18" class="sec-head__icon" aria-hidden="true" />
                  Auto Battle
                </span>
                <div class="battle-strip">
                  <template v-if="pauseBattleTotal > 0">
                    <span class="battle-strip__record">
                      <span class="battle-strip__wins">{{ pauseBattleWins }}W</span>
                      <span class="battle-strip__sep">·</span>
                      <span class="battle-strip__losses">{{ pauseBattleLosses }}L</span>
                    </span>
                    <span
                      class="battle-strip__lp"
                      :class="pauseBattleLp > 0 ? 'lp--pos' : pauseBattleLp < 0 ? 'lp--neg' : 'lp--zero'"
                    >{{ pauseBattleLp > 0 ? '+' : '' }}{{ pauseBattleLp }} LP</span>
                    <span v-if="pauseBattleChimes > 0" class="battle-strip__chimes">
                      <img
                        src="/img/BardAbilities/BardChime-128.png"
                        alt=""
                        class="battle-strip__chime-img"
                      />
                      +{{ formatNumber(pauseBattleChimes) }}
                    </span>
                  </template>
                  <span v-else class="battle-strip__idle">No battles finished yet</span>
                </div>
              </div>
            </section>

            <!-- ── Rechts: der Zustand ───────────────────────────────── -->
            <section class="state-col">
              <h2 class="col-head">Where you stand</h2>

              <!-- Die Scheibe bleibt frei: Ring und Plakette lagen vorher genau
                   auf der Fläche, an der die Phase erkennbar ist — Korona,
                   Farbe, Oberfläche. Die HP stehen deshalb als eigene Leiste
                   darunter.

                   Links und rechts die Bilanz der laufenden Pause: was die Sonne
                   verloren und was sie zurückgewonnen hat. Beides läuft pausiert
                   weiter — Void-Einschläge und Boss-Enrage treffen sie, die
                   Regeneration hält dagegen.

                   Die beiden Ledger-Spalten sind gleich breit. Das ist Bedingung,
                   nicht Geschmack: nur so steht die Scheibe mittig in IHRER
                   Spalte (gemessen `.sun-hero` gegen `.state-col`, Toleranz
                   null). -->
              <div class="state-block">
                <div class="sun-block" :style="{ '--sun-d': `${sunDiameter}px` }">
                  <SunLedger tone="regen" :total="pauseRegen" />
                  <div
                    class="sun-hero"
                    :style="{ width: `${sunDiameter}px`, height: `${sunDiameter}px` }"
                  >
                    <div class="sun-hero__disc" aria-hidden="true">
                      <CometDisc v-if="solarStore.isCometState" :diameter="sunDiameter" />
                      <PhaseSunDisc v-else :diameter="sunDiameter" />
                    </div>
                  </div>
                  <SunLedger tone="damage" :total="pauseDamage" :pops="damagePops" />
                </div>
                <span class="sun-phase-label" :style="{ color: sunPhaseLabelColor }">
                  {{ sunPhase.name }}
                </span>
              </div>

              <!-- Der Streifen bleibt ein eigenes Element dieser Datei: seine
                   HÖHE geht in die Panelhöhe und damit in den Fit-Scale des
                   GANZEN Overlays ein. -->
              <div class="vital-strip">
                <VitalityBar
                  :current="playerStore.currentHP"
                  :max="playerStore.maxHP"
                  :regen-per-sec="regen"
                  label-placement="inside"
                  spark
                  :aria-label="`Health ${Math.ceil(playerStore.currentHP)} of ${playerStore.maxHP}`"
                />
              </div>

              <div class="state-rows">
                <PauseMetaPillar
                  label="Universe"
                  :value="toRoman(gameStore.currentUniverse)"
                  :sub="universeName"
                  :pct="universePct"
                  :meter="`${gameStore.currentUniverse} / ${gameStore.totalUniverses}`"
                  :color="JOURNEY_AXIS_COLORS.universe"
                />
                <PauseMetaPillar
                  label="Galaxy"
                  :value="String(galaxyStore.currentGalaxy)"
                  :sub="galaxyName"
                  :pct="galaxyPct"
                  :meter="`${galaxyStore.starsRescued} / ${galaxyStore.starsRequired} ✦`"
                  :color="JOURNEY_AXIS_COLORS.galaxy"
                />
                <PauseMetaPillar
                  label="Level"
                  :value="String(gameStore.level)"
                  :sub="levelSub"
                  :pct="gameStore.levelProgress"
                  :meter="`${Math.floor(gameStore.levelProgress)} %`"
                  :color="JOURNEY_AXIS_COLORS.level"
                  emphasis
                />
              </div>
            </section>
          </div>

          <!-- ── Das Kit-Band ───────────────────────────────────────────────
               Fähigkeitenleiste und Buff-Reihe stehen im freien Bild bei
               z-index 10001 und lagen damit ÜBER diesem Overlay (9998) — nicht
               ausgeblendet, sondern mitten auf dem Panel. App.vue hängt beide
               pausiert hierher um; es ist dieselbe Instanz, nur mit anderer
               Form (`dock: 'pause'`).

               Quer statt als dritte Spalte: die Kacheln sind das einzige im
               Panel, das der Spieler wiedererkennen muss, und in einer schmalen
               Säule blieben sie klein. Die Höhe dafür kommt aus der einzeilig
               gewordenen Callout-Reihe und dem gekürzten Bühnenpuffer.

               Beide Spalten sind auf PAUSE_KIT_BAND_H fest reserviert: liefe
               die Höhe mit der Zahl der Buffs, spränge der Fit-Scale des
               ganzen Overlays, sobald während der Pause einer ausläuft. -->
          <section
            class="kit-band"
            :style="{
              '--pause-kit-gap': `${PAUSE_KIT_GAP_PX}px`,
              '--pause-kit-chip-h': `${PAUSE_KIT_EFFECT_CHIP_H}px`,
              '--pause-kit-band-h': `${PAUSE_KIT_BAND_H}px`,
              '--pause-kit-effect-w': `${PAUSE_KIT_EFFECT_COL_W}px`,
            }"
          >
            <div class="kit-col">
              <span class="sec-head">
                <Icon
                  icon="game-icons:magic-palm"
                  width="18"
                  height="18"
                  class="sec-head__icon"
                  aria-hidden="true"
                />
                Your kit
              </span>
              <!-- Anzeige, kein Bedienfeld — deshalb Zeilen statt Kacheln.
                   Der Tick ist derselbe, der auch die Karten unten fortschreibt:
                   Abklingzeiten enden auch im Stillstand. -->
              <div class="kit-dock">
                <PauseKitPanel :tick="starTick" />
              </div>
            </div>

            <div class="kit-col kit-col--effects">
              <span class="sec-head">
                <Icon
                  icon="game-icons:hourglass"
                  width="18"
                  height="18"
                  class="sec-head__icon"
                  aria-hidden="true"
                />
                Active effects
              </span>
              <div id="pause-buff-dock" class="kit-dock" />
            </div>
          </section>

          <!-- Awaiting on return — immer gerendert mit fester Zeilenhöhe, damit
               aufpoppende Badges die Panel-Höhe (und den Fit-Scale) nie ändern -->
          <div
            class="callout-section"
            :style="{
              '--star-card-h': `${PAUSE_STAR_CARD_HEIGHT}px`,
              '--star-card-gap': `${PAUSE_STAR_CARD_GAP_PX}px`,
              '--star-card-rows': PAUSE_CALLOUT_ROWS,
            }"
          >
            <!-- Kopfzeile mit fester Höhe: die Level-Up-Marke sitzt neben der
                 Überschrift statt zwischen den Flyby-Karten. Sie ist kein
                 laufender Vorgang, sondern etwas, das auf eine Entscheidung
                 wartet — und die Kartenreihe bleibt dadurch sortenrein. -->
            <div class="callout-head">
              <span class="callout-heading">Awaiting your return</span>
              <Transition name="callout-pop">
                <span v-if="pendingAugmentCount > 0" class="level-chip">
                  <Icon
                    icon="ph:arrow-fat-up-fill"
                    width="14"
                    height="14"
                    class="level-chip__icon"
                    aria-hidden="true"
                  />
                  Level-Up
                  <span class="level-chip__count">×{{ pendingAugmentCount }}</span>
                </span>
              </Transition>
            </div>
            <TransitionGroup
              v-if="
                activeResourceStars.length > 0 || championCallout || voidThreat
              "
              tag="div"
              name="callout-pop"
              class="callout-row"
            >
              <!-- Der Champion steht IMMER an erster Stelle, ganz oben links —
                   auch dann, wenn sonst nichts läuft. Er ist der Höhepunkt
                   einer Galaxierunde, und eine Karte, die je nach Lage um eine
                   Kartenbreite wandert, muss man erst suchen. Die eine Karte
                   deckt beide Zustände ab: gefunden-und-wartend sowie
                   Stern-läuft-samt-Uhr. -->
              <PauseChampionCard
                v-if="championCallout"
                key="champion"
                :callout="championCallout"
              />
              <!-- Der Void läuft während der Pause weiter — Kader und Turrets
                   feuern auch pausiert, also darf er auch pausiert verloren
                   gehen. Er steht deshalb VOR den Stern-Karten: von allem, was
                   hier abläuft, ist er das einzige, das der Sonne wehtut. -->
              <PauseVoidCard
                v-if="voidThreat"
                key="void-threat"
                :secs="voidThreat.secs"
                :ends-at="voidThreat.endsAt"
                :duration-ms="voidThreat.durationMs"
                :name="voidThreat.name"
                :color="voidThreat.color"
                :dweller="voidThreat.dweller"
                :count="voidThreat.count"
                :worn="voidThreat.worn"
              />

              <!-- Ein Flyby, eine Karte: Zifferblatt der Restzeit, echte
                   Planetenkunst der Slots mit ihren Boss-HP, Akzent in der
                   Spektralfarbe des Sterns. Höchstens
                   RESOURCE_STAR_MAX_CONCURRENT nebeneinander. -->
              <PauseStarCard
                v-for="s in activeResourceStars"
                :key="s.id"
                :secs="s.secs"
                :ends-at="s.endsAt"
                :duration-ms="s.durationMs"
                :color="s.color"
                :planets="s.planets"
              />
            </TransitionGroup>
            <div v-else class="callout-row callout-row--empty">
              <span class="callout-empty">All quiet so far — the cosmos drifts on</span>
            </div>
          </div>

          <!-- Fußzeile statt Knopf: der einzige Ausgang braucht keinen Rahmen,
               um gefunden zu werden — eine Trennlinie darüber genügt. Die Tasten
               stehen weiterhin IN der Zeile, nicht als Hinweis darunter: sie
               gehören zu derselben Handlung. Beschriftung bleibt optisch mittig
               (Dreispalter), die Tasten sitzen an der rechten Kante. -->
          <button
            class="continue-btn"
            :aria-label="`Resume journey — press ${pauseCap} or ${PAUSE_ESCAPE_CAP}`"
            @click="unpause"
          >
            <span class="continue-btn__main">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="6 3 21 12 6 21 6 3" />
              </svg>
              Resume journey
            </span>
            <span class="continue-btn__keys" aria-hidden="true">
              <KeyCap :cap="pauseCap" size="sm" tone="inherit" />
              <KeyCap :cap="PAUSE_ESCAPE_CAP" size="sm" tone="inherit" />
            </span>
          </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGamePause } from '@/composables/system/useGamePause'
import { onKeybinding } from '@/composables/system/useKeybindings'
import { useFitScale } from '@/composables/ui/useFitScale'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useUiStore } from '@/stores/core/uiStore'
import { getVoidRift } from '@/config/world/void'
import { formatNumber, formatNumberCompact } from '@/config/ui/numberFormat'
import { universes } from '@/config/progression/universes'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import { MATERIALS, materialIconMd } from '@/config/economy/materials'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  PAUSE_SUN_MIN_DIAMETER,
  PAUSE_SUN_MAX_DIAMETER,
  PAUSE_SUN_VH_FACTOR,
  PAUSE_PANEL_DESIGN_WIDTH,
  PAUSE_PANEL_MAX_SCALE,
  PAUSE_STATE_COL_WIDTH,
  PAUSE_BODY_COL_GAP,
  JOURNEY_AXIS_COLORS,
  PAUSE_MATERIAL_COLUMNS,
  PAUSE_MATERIAL_ROWS,
  PAUSE_MATERIAL_CELL_PX,
  PAUSE_MATERIAL_GAP_PX,
  PAUSE_MATERIAL_TILE_WIDTH,
  PAUSE_LEDGER_MAX_POPS,
  DAMAGE_FLOAT_DURATION_MS,
  MATERIAL_RARITY_COLOR,
  MATERIAL_RARITY_ORDER,
  LOOT_MONOGRAM_MAX_CHARS,
  ROLE_BY_KEY,
  ROLE_ART_MD_SUFFIX,
  PAUSE_CHAMPION_FALLBACK_ICON,
  KEYBINDINGS,
  PAUSE_ESCAPE_CAP,
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_CARD_GAP_PX,
  PAUSE_CALLOUT_ROWS,
  PAUSE_READOUT_ORB_PX,
  PAUSE_READOUT_GAP_PX,
  PAUSE_KIT_GAP_PX,
  PAUSE_KIT_EFFECT_CHIP_H,
  PAUSE_KIT_EFFECT_COL_W,
  PAUSE_KIT_BAND_H,
  MEEP_ART_IMAGE,
  PAUSE_STAR_HP_STEPS,
  STAR_TIMER_TICK_MS,
  VOID_SEVERITY_COLOR,
  VOID_KIT_ACCENT,
  SCOREBOARD_STAT_COLORS,
} from '@/config/constants'
import type { PauseChampionCallout, PlanetType } from '@/types'
import { splitDuration, toRoman } from '@/utils/ui/format'
import {
  championStarDeadlineAt,
  starDeadlineAt,
  starRemainingMs,
  starTotalMs,
} from '@/utils/orbit/starLifetime'
import { pauseDustStyle } from '@/utils/fx/particleField'
import PhaseSunDisc from '@/components/idle/sun/PhaseSunDisc.vue'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import PauseKitPanel from './PauseKitPanel.vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import VitalityBar from '@/components/ui/VitalityBar.vue'
import KeyCap from '@/components/keybinds/KeyCap.vue'
import PauseChampionCard from './PauseChampionCard.vue'
import PauseStarCard from './PauseStarCard.vue'
import PauseVoidCard from './PauseVoidCard.vue'
import SunLedger from './SunLedger.vue'
import PauseMetaPillar from './PauseMetaPillar.vue'
import { gameNow } from '@/utils/game/gameClock'

// Die Pause hat zwei Quellen — Fenster ohne Fokus und das Kürzel des Spielers.
// Beide laufen in useGamePause zusammen; dieses Overlay kennt nur noch das
// Ergebnis. Die Komponente bleibt immer montiert (v-if steckt im Teleport),
// deshalb ist sie auch der richtige Ort für den Kürzel-Handler.
const { isPaused, resumeGame, togglePause } = useGamePause()

const pauseCap = computed(() => KEYBINDINGS.find((b) => b.id === 'pause')?.cap ?? 'P')

const stageEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const { scale: panelScale } = useFitScale(stageEl, panelEl, {
  maxScale: PAUSE_PANEL_MAX_SCALE,
  padding: 0,
})
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const battleStore = useBattleStore()
const playerStore = usePlayerStore()
const planetBossStore = usePlanetBossStore()
const planetShopStore = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()

// Die Rollenwahl hält das Spiel bereits an und liegt über allem — eine zweite
// Pause darüber wäre nur ein Overlay über einem Overlay.
onKeybinding('pause', () => {
  if (galaxyStore.pendingRoleSelection) return
  togglePause()
})
const starGroupStore = useStarGroupStore()
const voidStore = useVoidStore()
const uiStore = useUiStore()

function computeSunDiameter(): number {
  return Math.round(
    Math.min(
      PAUSE_SUN_MAX_DIAMETER,
      Math.max(PAUSE_SUN_MIN_DIAMETER, window.innerHeight * PAUSE_SUN_VH_FACTOR),
    ),
  )
}

const sunDiameter = ref(computeSunDiameter())
function onResize() {
  sunDiameter.value = computeSunDiameter()
}

onMounted(() => window.addEventListener('resize', onResize))

const sunPhase = computed(() =>
  solarStore.isCometState
    ? COMET_PHASE_DATA
    : (STAR_PHASE_DATA[planetShopStore.currentSunStage] ?? STAR_PHASE_DATA[0]),
)
const sunPhaseLabelColor = computed(() => {
  const p = sunPhase.value
  return 'phasePrimary' in p ? p.phasePrimary : p.accent
})

// ── Standtafel neben der Scheibe: links der Ort, rechts der Bard ────────────
// Namen und Brüche stammen aus denselben Quellen wie die Header-Tooltips und die
// Journey-Ringe des Stats-Tabs — hier wird nichts zum zweiten Mal aufgelöst.
const universeName = computed(() => universes[gameStore.currentUniverse - 1]?.name ?? 'Uncharted')
const universePct = computed(
  () => (gameStore.currentUniverse / Math.max(1, gameStore.totalUniverses)) * 100,
)
const galaxyName = computed(
  () => GALAXY_THEMES[galaxyStore.currentThemeIndex % GALAXY_THEMES.length]?.name ?? 'Uncharted',
)
const galaxyPct = computed(
  () => (galaxyStore.starsRescued / Math.max(1, galaxyStore.starsRequired)) * 100,
)
const levelSub = computed(() => `${formatNumberCompact(gameStore.chimesToNextLevel)} to next`)

const pauseStartChimes = ref(0)
const pauseTick = ref(0)
/**
 * Der schnellere der beiden Takte (STAR_TIMER_TICK_MS). Er treibt bisher die
 * Callout-Karten und jetzt zusätzlich die Abklingzeiten im Kit-Band — deren
 * Zeitstempel liegen im Store und ändern sich nicht von selbst reaktiv.
 *
 * Ein rAF-Lauf dafür wäre in einem stehenden Spiel Verschwendung: vier Zahlen,
 * die höchstens fünfmal je Sekunde eine Stelle wechseln.
 */
const starTick = ref(0)
let pauseInterval: ReturnType<typeof setInterval> | null = null
let starInterval: ReturnType<typeof setInterval> | null = null

// ── Bilanz der laufenden Pause: Schaden und Regeneration ────────────────────
// Beides kommt aus den Lebenszeit-Zählern des playerStore (`totalDamageTaken`,
// `totalHpRegenerated`) als DIFFERENZ zum Stand beim Pausenbeginn — dasselbe
// Muster wie bei den Chimes darüber. Kein neuer Store-Zustand, kein Ticker:
// beide Zähler sind reaktiv, die Anzeige läuft dadurch von selbst live.
const pauseStartDamage = ref(0)
const pauseStartRegen = ref(0)

/**
 * Die Treffer, die gerade aufsteigen. Sie kommen bewusst NICHT aus
 * `playerStore.damageFloats`: diese Liste wird von `PlayerHPBar` gepruned, ihre
 * Lebensdauer hinge damit an einer fremden Komponente. Hier trägt das Delta des
 * Lebenszeit-Zählers den Betrag, und aufgeräumt wird im ohnehin laufenden
 * Sekundentakt — kein zweiter Timer.
 */
const damagePops = ref<{ id: number; value: number; bornAt: number }[]>([])
let nextPopId = 0

const pauseDamage = computed(() =>
  Math.max(0, Math.round(playerStore.totalDamageTaken - pauseStartDamage.value)),
)
// Die Regeneration fällt in Bruchteilen an (Forge- und Baum-Boni sind keine
// ganzen HP) — gerundet wird erst hier, nicht im Store.
const pauseRegen = computed(() =>
  Math.max(0, Math.round(playerStore.totalHpRegenerated - pauseStartRegen.value)),
)

/** Eine Nachkommastelle, wie in Orbit und Profilkopf. Der Ledger daneben zeigt
 *  die Summe dieser Pause, die Leiste die laufende Rate. */
const regen = computed(() => Math.round(playerStore.regenPerSec * 10) / 10)

/**
 * Jeder Anstieg des Lebenszeit-Zählers ist genau ein Treffer — der Betrag steht
 * bereits mitigiert darin. Der Wächter läuft NUR während der Pause: die
 * Komponente bleibt immer montiert (das `v-if` steckt im Teleport), er liefe
 * sonst durchs ganze Spiel mit.
 */
watch(
  () => playerStore.totalDamageTaken,
  (now, before) => {
    if (!isPaused.value) return
    const dealt = Math.round(now - before)
    if (dealt <= 0) return
    damagePops.value = [
      ...damagePops.value,
      // Wanduhr: die Zahl steigt per CSS-Animation auf und muss so lange stehen,
      // wie das Auge sie liest. Rein visuelle Standzeit, beide Enden des
      // Vergleichs entstehen in diesem Modul — `gameNow()` wäre hier falsch, die
      // CSS-Animation kennt keinen Zeitraffer.
      { id: nextPopId++, value: dealt, bornAt: Date.now() },
    ].slice(-PAUSE_LEDGER_MAX_POPS)
  },
)

/** Abgelaufene Treffer entfernen. Läuft im vorhandenen Sekundentakt mit; die
 *  Zuweisung erfolgt nur, wenn sich wirklich etwas ändert. */
function prunePops(): void {
  if (damagePops.value.length === 0) return
  // Wanduhr, siehe oben
  const now = Date.now()
  const next = damagePops.value.filter((p) => p.bornAt + DAMAGE_FLOAT_DURATION_MS > now)
  if (next.length !== damagePops.value.length) damagePops.value = next
}

/**
 * Escape beendet die Pause — dieselbe Taste, die im ganzen Spiel jedes Overlay
 * schließt, und deshalb bewusst KEIN Eintrag in der Kürzel-Registry: sie ist
 * kontextabhängig und gehört keinem einzelnen Befehl.
 *
 * Liegt das Controls-Panel darüber, schließt der erste Druck erst dieses —
 * Escape arbeitet sich von oben nach unten durch die Ebenen, statt zwei davon
 * gleichzeitig zu schließen.
 */
function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (uiStore.isControlsOpen) return
  resumeGame()
}

watch(
  isPaused,
  (paused) => {
    if (paused) {
      gameStore.setPauseState(true)
      pauseStartChimes.value = gameStore.chimes
      pauseStartDamage.value = playerStore.totalDamageTaken
      pauseStartRegen.value = playerStore.totalHpRegenerated
      damagePops.value = []
      pauseTick.value = 0
      pauseInterval = setInterval(() => {
        pauseTick.value++
        prunePops()
      }, 1000)
      // Sofort aufbauen, damit die Karten mit dem Overlay erscheinen und nicht
      // erst beim ersten Takt.
      lastResourceStarsKey = ''
      lastVoidThreatKey = ''
      lastChampionKey = ''
      refreshResourceStars()
      refreshVoidThreat()
      refreshChampionCallout()
      starTick.value = 0
      starInterval = setInterval(() => {
        starTick.value++
        refreshResourceStars()
        refreshVoidThreat()
        refreshChampionCallout()
      }, STAR_TIMER_TICK_MS)
      window.addEventListener('keydown', onEscape)
    } else {
      gameStore.setPauseState(false)
      if (pauseInterval !== null) {
        clearInterval(pauseInterval)
        pauseInterval = null
      }
      if (starInterval !== null) {
        clearInterval(starInterval)
        starInterval = null
      }
      window.removeEventListener('keydown', onEscape)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pauseInterval !== null) clearInterval(pauseInterval)
  if (starInterval !== null) clearInterval(starInterval)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onEscape)
})

const accumulatedChimes = computed(() => {
  void pauseTick.value
  return Math.max(0, gameStore.chimes - pauseStartChimes.value)
})

/**
 * Chimes bis zum nächsten anstehenden Meep. Der Getter im Store hängt an
 * `chimesForNextUniverse` und sinkt damit auch pausiert weiter — die Produktion
 * zahlt ein, ohne dass jemand klickt. Genau deshalb steht die Zahl hier und
 * nicht die Klickstrecke.
 */
const chimesToNextMeep = computed(() => {
  void pauseTick.value
  return gameStore.chimesToNextMeep
})

// Während der Pause laufen Resource-Stars weiter: sie werden per Passivschaden
// bekämpft und despawnen bei Timer-Ende. Hier live pro Stern: Restsekunden bis
// zum Verschwinden + Planeten (übrig/gesamt).
//
// Die Restzeit kommt aus `starRemainingMs` — derselben Rechnung, die auch die
// Star-Timer-Bars im Header anstellen. Vorher stand hier nur die eigene
// Despawn-Frist des Sterns (45 s); tatsächlich läuft ihr die Enrage-Uhr seiner
// Bosse (ab 30 s) davon, weshalb das Overlay noch zählte, als der Stern längst
// weg war.
interface PauseResourceStar {
  id: string
  secs: number
  remainingPlanets: number
  /**
   * ABSOLUTER Zeitpunkt des Despawns und die Gesamtlaufzeit derselben Uhr. Die
   * Karte lässt ihren Zeitbogen daraus als eine durchlaufende Animation
   * abbrennen — ein Restanteil je Sekunde ließe ihn im Takt stocken.
   */
  endsAt: number
  durationMs: number
  /** Spektralfarbe des Sterns als fertiger CSS-Wert (StarGroup.starColor). */
  color: string
  /** Die Slots in ihrer echten Gestalt samt Boss-HP (0..1) für ihre Balken. */
  planets: { id: string; type: PlanetType; cleared: boolean; hp: number }[]
}

/**
 * Die Kartenliste ist KEIN computed, sondern ein Schnappschuss im
 * Header-Bar-Takt (STAR_TIMER_TICK_MS). Zwei Gründe:
 *
 *  • Gleichlauf: die Bars tasten viermal je Sekunde ab. Ein 1-Sekunden-Takt im
 *    Overlay traf die Sekundenwechsel in beliebiger Phase — beide zeigten
 *    dieselbe Uhr, aber bis zu eine Sekunde versetzt.
 *  • Ruhe: ein computed über `planetBossStore.activeBosses` rechnete bei JEDEM
 *    Treffer des Passivschadens neu. Der Ticker liest ungetrackt (er läuft
 *    außerhalb jedes Effekts) und schreibt nur, wenn sich etwas ABLESBARES
 *    ändert — dieselbe Schlüssel-Logik wie beim Boss-Snapshot der Bars. Das
 *    Panel rendert damit höchstens einmal je Sekunde neu, ist aber auf
 *    250 ms genau.
 */
const activeResourceStars = shallowRef<PauseResourceStar[]>([])

function buildResourceStars(): PauseResourceStar[] {
  const now = gameNow()
  const bosses = planetBossStore.activeBosses
  const bossTimer = (planetId: string) => bosses.find((b) => b.planetId === planetId)

  return starGroupStore.activeStars
    .filter((s) => s.starType === 'resource')
    .map((s) => {
      const remainingPlanets = s.planetSlots.filter((p) => !p.cleared).length
      const remainingMs = starRemainingMs(s, now, bossTimer)
      const [r, g, b] = s.starColor
      return {
        id: s.id,
        secs: Math.ceil(remainingMs / 1000),
        remainingPlanets,
        endsAt: starDeadlineAt(s, bossTimer) ?? now,
        durationMs: starTotalMs(s, bossTimer),
        color: `rgb(${r}, ${g}, ${b})`,
        planets: s.planetSlots.map((p) => {
          const boss = bosses.find((b) => b.planetId === p.planetId)
          // Auf ganze Prozent gerundet: der Balken ist 29 px breit, feiner als
          // ein Prozentpunkt ist dort nichts mehr zu sehen — und der
          // Schlüssel unten würde bei jedem Abtasttakt anschlagen.
          const ratio =
            p.cleared || !boss || boss.maxHP <= 0
              ? 0
              : Math.min(1, Math.max(0, boss.currentHP / boss.maxHP))
          return {
            id: p.planetId,
            type: p.type,
            cleared: p.cleared,
            hp: Math.round(ratio * PAUSE_STAR_HP_STEPS) / PAUSE_STAR_HP_STEPS,
          }
        }),
      }
    })
    .filter((s) => s.remainingPlanets > 0 && s.secs > 0)
    .sort((a, b) => a.secs - b.secs)
}

/** Alles, was man der Kartenreihe ansieht — ändert es sich nicht, rendert nichts.
 *  Der Zeitbogen steht bewusst NICHT darin: er läuft in der Karte als eigene
 *  Animation weiter und hängt nur am Endzeitpunkt, nicht am Abtasttakt. */
function resourceStarsKey(list: PauseResourceStar[]): string {
  return list
    .map(
      (s) =>
        `${s.id}:${s.secs}:${s.endsAt}:${s.planets
          .map((p) => `${p.cleared ? 'x' : ''}${p.hp}`)
          .join(',')}`,
    )
    .join('|')
}

let lastResourceStarsKey = ''
function refreshResourceStars(): void {
  const next = buildResourceStars()
  const key = resourceStarsKey(next)
  if (key === lastResourceStarsKey) return
  lastResourceStarsKey = key
  activeResourceStars.value = next
}

// ── Der Void während der Pause ──────────────────────────────────────────────
// Er läuft weiter: Kader und Turrets feuern auch pausiert, und was passiv
// bekämpft wird, darf auch passiv verloren gehen — dieselbe Regel wie bei
// Sternen und Bossen. NEUE Wesen erscheinen nicht (`spawningBlocked`), sonst
// legte eines den halben Weg ungesehen zurück.
//
// Angezeigt wird nur das VORDERSTE plus die Zahl der übrigen: bei zwei Dutzend
// wäre eine Karte je Wesen eine Wand, und die einzige Frage, die hier zählt,
// ist ohnehin „was trifft die Sonne zuerst?".
//
// Wie bei den Sternen ein Schnappschuss im selben Takt und KEIN computed: ein
// computed über `voidStore.active` rechnete bei jedem Treffer des
// Orbit-Beschusses neu, und der fällt jede Sekunde.
interface PauseVoidThreat {
  secs: number
  endsAt: number
  durationMs: number
  name: string
  color: string
  /** Bild des Bewohners — fehlt bei den kleinen, gestaltlosen Wesen. */
  dweller?: string
  count: number
  worn: number
}

const voidThreat = shallowRef<PauseVoidThreat | null>(null)

function buildVoidThreat(): PauseVoidThreat | null {
  const lead = voidStore.leadMonster
  if (!lead) return null
  const def = getVoidRift(lead.defId)
  if (!def) return null
  const endsAt = lead.spawnedAt + lead.travelMs
  return {
    secs: Math.max(0, Math.ceil((endsAt - gameNow()) / 1000)),
    endsAt,
    durationMs: lead.travelMs,
    name: def.name,
    color: VOID_SEVERITY_COLOR[def.severity] ?? def.color,
    dweller: def.dweller,
    count: voidStore.active.length,
    // Auf ganze Prozent gerundet: der Balken ist wenige Pixel breit, und der
    // Schlüssel unten schlüge sonst bei jedem Abtasttakt an.
    worn:
      lead.maxHp > 0 ? Math.round((1 - lead.currentHp / lead.maxHp) * 100) / 100 : 0,
  }
}

/** Alles, was man der Karte ansieht. Der Zeitbogen steht bewusst NICHT darin —
 *  er läuft in der Karte als eigene Animation und hängt nur am Endzeitpunkt. */
function voidThreatKey(t: PauseVoidThreat | null): string {
  return t ? `${t.name}:${t.secs}:${t.endsAt}:${t.count}:${t.worn}` : ''
}

let lastVoidThreatKey = ''
function refreshVoidThreat(): void {
  const next = buildVoidThreat()
  const key = voidThreatKey(next)
  if (key === lastVoidThreatKey) return
  lastVoidThreatKey = key
  voidThreat.value = next
}

// ── Der Drifter ─────────────────────────────────────────────────────────────
// Der Drifter selbst kommt in der Pause nicht vor: neue erscheinen nicht (der
// Layer sperrt den Spawn, sobald er verdeckt ist), und anklicken lässt sich
// durch das Overlay ohnehin keiner. Was WEITERLÄUFT, ist sein Lohn — und der
// steht heute im Kit-Band, als Chip neben MVP- und Omen-Buff.
//
// Er hatte einmal eine eigene Karte in der Reihe unten (`PauseDrifterCard`).
// Sie zeigte nur den Buff mit der kürzesten Uhr, während MVP und Omen gar
// nicht vorkamen — drei Belohnungen derselben Art in zwei Formen, von denen
// eine unvollständig war. Mit der Karte fiel zugleich die sechste Spalte der
// Reihe weg, und die passt seitdem in EINE Zeile (siehe PAUSE_CALLOUT_ROWS).

// ── Der Champion ────────────────────────────────────────────────────────────
// EINE Karte für zwei Zustände, und sie steht immer an erster Stelle:
//
//   • `awaited`  — das Schiff ist angekommen, der Stern steht noch nicht am
//     Himmel. Welcher Champion es wird, entscheidet erst der Spawn; bekannt ist
//     hier die ROLLE, und die hat der Spieler selbst gewählt — sie trägt
//     deshalb Farbe und Wappen. Ruht der Idle-Layer, merkt `useStarSystem` den
//     Stern in `pendingChampionStar` vor und lässt ihn erst beim Zurückkehren
//     erscheinen; genau das sagt der Status an, statt einen Stern zu
//     versprechen, der noch gar nicht da ist.
//   • `active`   — der Stern läuft. Erst hier steht der Champion fest.
//
// Vorher endete die Anzeige beim Spawn: der Fund-Banner hing an
// `champion_available`, und `buildResourceStars()` filtert auf `'resource'` —
// die 60-Sekunden-Uhr des Champion-Sterns lief in der Pause also unsichtbar ab.
//
// Wie bei Sternen und Void ein Schnappschuss im selben Takt und KEIN computed:
// ein computed über `planetBossStore.activeBosses` rechnete bei jedem Treffer
// des Passivschadens neu.
const championCallout = shallowRef<PauseChampionCallout | null>(null)

function buildChampionCallout(): PauseChampionCallout | null {
  const star = starGroupStore.activeStars.find((s) => s.starType === 'champion')

  if (star) {
    const slot = star.planetSlots.find((p) => p.isChampionPlanet)
    const boss = slot
      ? planetBossStore.activeBosses.find((b) => b.planetId === slot.planetId)
      : undefined
    const name = boss?.homePlanetChampion ?? null
    const escorts = star.planetSlots.filter((p) => !p.isChampionPlanet)
    const [r, g, b] = star.starColor
    const deadline = championStarDeadlineAt(star)
    const durationMs = star.durationMs ?? 0
    // Auf ganze Prozent gerundet: der Balken ist wenige Pixel breit, und der
    // Schlüssel unten schlüge sonst bei jedem Abtasttakt an.
    const ratio =
      !slot || slot.cleared || !boss || boss.maxHP <= 0
        ? 0
        : Math.min(1, Math.max(0, boss.currentHP / boss.maxHP))
    return {
      state: 'active',
      color: `rgb(${r}, ${g}, ${b})`,
      title: name ?? 'Champion',
      status: null,
      // Dieselbe Quelle UND dieselbe Auflösungsstufe wie die Belohnungskarte am
      // Stern selbst (StarSystemComponent) — sonst lädt derselbe Champion in
      // derselben Szene ein zweites Mal, statt aus dem Cache zu kommen.
      art: name ? battleStore.getChampionImage(name, { size: 'md' }) : null,
      roleIcon: championRoleIcon(),
      secs: deadline === null ? 0 : Math.max(0, Math.ceil((deadline - gameNow()) / 1000)),
      endsAt: deadline ?? gameNow(),
      durationMs,
      bossHp: Math.round(ratio * PAUSE_STAR_HP_STEPS) / PAUSE_STAR_HP_STEPS,
      escortTotal: escorts.length,
      escortCleared: escorts.filter((p) => p.cleared).length,
    }
  }

  if (galaxyStore.championTravelState !== 'champion_available') return null

  const role = galaxyStore.nextStarRole ? ROLE_BY_KEY[galaxyStore.nextStarRole] : null
  return {
    state: 'awaited',
    color: role?.color ?? '#f0d060',
    title: role?.label ?? 'Unknown',
    // Kurz gehalten: die Pille hat die Körperbreite der Karte (112 px), und
    // „Arrives when you return" brach dort zu „Arrives when you…" ab.
    status: galaxyStore.pendingChampionStar ? 'Arrives on return' : 'Waiting in orbit',
    // Das Rollenbild wird hier mit ~60 px gezeigt — dafür ist die 256er-Stufe
    // die richtige Quelle; ROLES[].image zeigt bewusst aufs Original, weil
    // dieselbe Konstante anderswo gross gerendert wird.
    art: role ? role.image.replace(/\.png$/, ROLE_ART_MD_SUFFIX) : null,
    roleIcon: championRoleIcon(),
    secs: 0,
    endsAt: 0,
    durationMs: 0,
    bossHp: 0,
    escortTotal: 0,
    escortCleared: 0,
  }
}

/** Wappen der Rolle, für die dieser Stern angeflogen wurde. Es steht in beiden
 *  Zuständen für dieselbe Wahl, deshalb dieselbe Quelle. */
function championRoleIcon(): string {
  const role = galaxyStore.nextStarRole ? ROLE_BY_KEY[galaxyStore.nextStarRole] : null
  return role?.icon ?? PAUSE_CHAMPION_FALLBACK_ICON
}

/** Alles, was man der Karte ansieht. Der Zeitbogen steht bewusst NICHT darin —
 *  er läuft in der Karte als eigene Animation und hängt nur am Endzeitpunkt. */
function championCalloutKey(c: PauseChampionCallout | null): string {
  return c
    ? `${c.state}:${c.title}:${c.status}:${c.color}:${c.secs}:${c.endsAt}:${c.bossHp}:${c.escortCleared}/${c.escortTotal}`
    : ''
}

let lastChampionKey = ''
function refreshChampionCallout(): void {
  const next = buildChampionCallout()
  const key = championCalloutKey(next)
  if (key === lastChampionKey) return
  lastChampionKey = key
  championCallout.value = next
}

const timerChars = computed(() => {
  const { hours, minutes, seconds } = splitDuration(pauseTick.value)
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${hours > 0 ? hours + ':' : ''}${mm}:${ss}`.split('')
})

// Aufschlüsselung der Kills. Die fünf Chips stehen immer — Kategorien ohne
// Treffer dimmen ab, statt zu verschwinden: die Kachelhöhe ist fest, und ein
// Layoutsprung mitten in der Pause zöge den Fit-Scale des Overlays mit.
//
// Reihenfolge: Welt zuerst, Kampf zuletzt. Icons und Farben kommen aus dem
// Bestand — `VOID_CARD_ICON` ist dasselbe Zeichen, das die Void-HUD-Karte
// trägt, und `BATTLE_STAT_GAME_ICONS.kills` das Einzelschwert, das im ganzen
// Spiel für Kills steht (die gekreuzten Klingen gehören der Battle-Phase).
const killBreakdown = computed(() => {
  const s = gameStore.pauseStats
  return [
    {
      key: 'planets',
      label: 'Planets',
      count: s.planetsCleared,
      color: '#e0a850',
      title: 'Planets cleared during the pause',
    },
    {
      key: 'stars',
      label: 'Stars',
      count: s.starsRescued,
      color: '#7fd8d0',
      title: 'Stars fully freed — every planet cleared',
    },
    {
      key: 'bosses',
      label: 'Bosses',
      count: s.galaxyBossesFelled,
      color: '#cc6050',
      title: 'Galaxy bosses felled',
    },
    {
      key: 'void',
      label: 'Void',
      count: s.voidSlain,
      color: VOID_KIT_ACCENT,
      title: 'Void creatures slain while the orbit kept firing',
    },
    {
      key: 'champions',
      label: 'Champions',
      count: s.championKills,
      color: SCOREBOARD_STAT_COLORS.kills,
      title: 'Enemy champions your team took down in auto battle',
    },
  ]
})

// Die Summe wird aus der Aufschlüsselung gebildet und nicht zusätzlich im Store
// mitgeführt: ein zweiter Zähler daneben lief bereits auseinander — er ließ die
// befreiten Sterne aus.
const pauseKills = computed(() => killBreakdown.value.reduce((n, row) => n + row.count, 0))
const pauseBattleWins = computed(() => gameStore.pauseStats.battleWins)
const pauseBattleLosses = computed(() => gameStore.pauseStats.battleLosses)
const pauseBattleChimes = computed(() => gameStore.pauseStats.battleChimes)
const pauseBattleLp = computed(() => gameStore.pauseStats.battleLp)
const pauseBattleTotal = computed(() => pauseBattleWins.value + pauseBattleLosses.value)
// Ernte der laufenden Pause. Sortiert nach Seltenheit und dann nach Menge —
// das Wertvollste steht vorn, statt in der Reihenfolge, in der es zufällig
// gefallen ist. Icons kommen in der 256er-Stufe: die Karten zeigen sie mit
// 40–48 px, die 128er-Quelle wäre dort bereits hochskaliert.
const pauseMaterialEntries = computed(() => {
  const entries = Object.entries(gameStore.pauseStats.materialsEarned).map(([id, amount]) => {
    const mat = MATERIALS.find((m) => m.id === id)
    const rarity = mat?.rarity ?? 'common'
    const name = mat?.name ?? id
    return {
      id,
      amount,
      name,
      rarity,
      color: MATERIAL_RARITY_COLOR[rarity] ?? MATERIAL_RARITY_COLOR.common,
      image: mat?.image ? materialIconMd(mat.image) : null,
      monogram: name
        .split(/\s+/)
        .map((word) => word[0] ?? '')
        .join('')
        .slice(0, LOOT_MONOGRAM_MAX_CHARS)
        .toUpperCase(),
    }
  })
  return entries.sort((a, b) => {
    const ra = MATERIAL_RARITY_ORDER.indexOf(a.rarity)
    const rb = MATERIAL_RARITY_ORDER.indexOf(b.rarity)
    if (ra !== rb) return ra - rb
    if (a.amount !== b.amount) return b.amount - a.amount
    return a.name.localeCompare(b.name)
  })
})

const totalMaterials = computed(() =>
  pauseMaterialEntries.value.reduce((sum, m) => sum + m.amount, 0),
)

// Die Kachel fasst PAUSE_MATERIAL_COLUMNS × PAUSE_MATERIAL_ROWS Karten. Passt
// nicht alles hinein, gibt die letzte Zelle den Rest als „+N" aus — sonst
// müsste das Raster wachsen und die Panelhöhe mitten in der Pause springen.
const MATERIAL_SLOTS = PAUSE_MATERIAL_COLUMNS * PAUSE_MATERIAL_ROWS

const visibleMaterials = computed(() => {
  const all = pauseMaterialEntries.value
  return all.length <= MATERIAL_SLOTS ? all : all.slice(0, MATERIAL_SLOTS - 1)
})

const hiddenMaterialCount = computed(
  () => pauseMaterialEntries.value.length - visibleMaterials.value.length,
)

/**
 * Offene Level-Up-Wahlen. Sie stehen als Marke neben der Überschrift, nicht in
 * der Kartenreihe: dort läuft ausschließlich, was gerade abläuft.
 */
const pendingAugmentCount = computed(() => gameStore.pendingAugmentSelections.length)

function unpause() {
  resumeGame()
}

function particleStyle(i: number): Record<string, string> {
  return pauseDustStyle(i)
}
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────────────── */
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 110%, rgba(255, 200, 80, 0.08) 0%, transparent 55%),
    rgba(8, 4, 0, 0.85);
  backdrop-filter: blur(10px) saturate(0.85);
  -webkit-backdrop-filter: blur(10px) saturate(0.85);
  overflow: hidden;
}

/* Verfügbare Bühne: alles oberhalb der Bottom-Bar. useFitScale passt das Panel
   uniform hier ein — schrumpft auf Full HD, wächst (bis max scale) auf 2K/4K.

   Oben und unten stand hier einmal je `clamp(88px, 10vh, 112px)`: Platz für das
   MVP-Honor-Badge, das damals über dem Overlay lag. Das gibt es nicht mehr —
   das Badge ist längst ein Chip der Buff-Reihe, und was von `MvpBuffOverlay`
   blieb, ist Ambiente bei z-index 40. Über dem Overlay (9998) liegt nur noch
   die Bottom-Bar (10000); der Header steht bei 25.

   Der Puffer war damit reine Reservierung für nichts — rund 160 px Bühnenhöhe,
   die der Fit-Scale nicht nutzen konnte. Sie bezahlen heute das Kit-Band. Was
   bleibt, ist Luft: unten der tiefe Mittelstreifen der Bottom-Bar, oben und
   unten gleich viel, damit das Panel mittig zwischen seinen Kanten sitzt. */
.pause-stage {
  position: absolute;
  top: clamp(24px, 3vh, 40px);
  left: 12px;
  right: 12px;
  bottom: calc(var(--bottom-center-strip-h, 79px) + clamp(24px, 3vh, 40px));
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Particles ────────────────────────────────────────── */
.pause-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(240, 224, 180, 0.8) 0%, transparent 70%);
  animation: particle-drift 6s ease-in-out infinite alternate;
  opacity: 0.3;
}
@keyframes particle-drift {
  from {
    transform: translateY(0);
    opacity: 0.12;
  }
  to {
    transform: translateY(-22px);
    opacity: 0.4;
  }
}

/* ── Panel ────────────────────────────────────────────── */
/* Same frame as the BardProfileMenu modal (.rp-modal): flat dark body, the
   bottom-bar notch curvature and the gold accent line along the top edge.
   Feste Design-Breite (PAUSE_PANEL_DESIGN_WIDTH) — Größenanpassung übernimmt
   ausschließlich useFitScale per transform: scale().

   Die Breite ist bewusst großzügig: der Fit-Scale ist auf JEDER
   Desktop-Referenzauflösung höhenlimitiert (Full HD gemessen: 0,64 aus der
   Höhe gegen 3,4, die die Bühnenbreite zuließe). Zusätzliche Panelbreite
   kostet also nichts an Skalierung, während zusätzliche Panelhöhe alles
   gleichmäßig schrumpfen ließe — sie geht direkt in die Inhalte, allen voran
   in die Materialbilder. */
.pause-panel {
  position: relative;
  z-index: 1;
  overflow: hidden;
  /* Breite kommt inline aus PAUSE_PANEL_DESIGN_WIDTH — sie stand hier früher
     ein zweites Mal als feste Zahl, und die Rechnung der Kartenreihe hängt
     daran. Zwei Quellen für dasselbe Maß laufen beim ersten Nachjustieren
     auseinander, ohne dass es auffällt. */
  flex-shrink: 0;
  transform-origin: center center;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: clamp(14px, 2.4vh, 24px);
  padding: clamp(22px, 4vh, 40px) clamp(20px, 4vw, 44px) clamp(18px, 3vh, 30px);
  background: #111008;
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1));
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
}
.pause-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  box-shadow: 0 0 8px rgba(200, 150, 30, 0.5);
  pointer-events: none;
}

/* Cosmic starfield sits between the flat panel fill (#111008) and the panel
   content: z-index -1 keeps it above the panel background but below every
   in-flow child (header, sun hero, stats …). The panel's overflow:hidden clips
   the starfield's overscan; RpgFrame (z-index 30) still draws over the top. */
.pause-panel .pause-cosmic-bg {
  z-index: -1;
}

/* ── Kopfzeile ────────────────────────────────────────── */
/* Titel und Uhr auf EINER Grundlinie. Untereinander kosteten sie 133 px, und
   Höhe ist im Panel die teuerste Grösse: der Fit-Scale ist auf jeder
   Referenzauflösung höhenlimitiert. */
.pause-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
}

.pause-title {
  margin: 0;
  font-size: 3.5rem;
  font-weight: 400;
  line-height: 1;
  color: #f4e2a0;
  letter-spacing: 0.12em;
  text-shadow:
    0 0 26px rgba(240, 208, 96, 0.28),
    0 3px 8px rgba(0, 0, 0, 0.9);
}

.pause-timer {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.pause-timer__tag {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
}

.pause-timer__value {
  position: relative;
  display: flex;
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
}

/* Farbloser Zwilling hinter den Ziffern: `text-shadow` zeichnet auch bei
   transparenter Schrift, übrig bleibt reiner Schein. Er liegt exakt auf der
   Zahl und blendet im Takt auf — animiert wird NUR `opacity`. Der Takt auf der
   Zahl selbst rasterte sonst in jedem Frame neu. */
.pause-timer__glow {
  position: absolute;
  inset: 0;
  display: flex;
  color: transparent;
  text-shadow:
    0 0 14px rgba(240, 208, 96, 0.9),
    0 0 30px rgba(240, 208, 96, 0.5);
  pointer-events: none;
  animation: timer-breathe 5s ease-in-out infinite;
}

/* Feste Ziffernbreite: die Uhr darf beim Weiterlaufen nicht atmen. */
.timer-digit {
  display: inline-block;
  width: 0.74em;
  text-align: center;
}

.timer-sep {
  display: inline-block;
  width: 0.44em;
  text-align: center;
  transform: translateY(-0.04em);
}

@keyframes timer-breathe {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

.pause-head__rule {
  height: 1px;
  width: 100%;
  margin-top: -14px;
  background: linear-gradient(to right, rgba(200, 144, 64, 0.55), rgba(122, 78, 32, 0.08));
}

/* ── Zwei Spalten ─────────────────────────────────────── */
/* Links, was hereinkam; rechts, wie es steht. Die Zustandsspalte hat eine feste
   Breite (PAUSE_STATE_COL_WIDTH), die Bilanzspalte nimmt den Rest — 1052 − 460
   − 30 = 562, gerade genug für das 426 breite Material-Raster.

   Beide Spalten laufen von OBEN, mit festem Abstand zwischen den Abschnitten —
   nicht `space-between`: im frischen Spielstand ist die Bilanzspalte kurz (kein
   Material, keine Battles), und ein verteilter Überschuss riss die Abschnitte
   dann sichtbar auseinander. Die Restluft sammelt sich lieber am Fuss der
   kürzeren Spalte. */
.pause-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--state-col-w);
  gap: var(--body-gap);
  align-items: stretch;
  width: 100%;
}

.tally-col,
.state-col {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

/* Trennung durch eine Haarlinie, nicht durch zwei Kästen — dasselbe Mittel,
   das die Kill-Chips untereinander schon benutzen. */
.state-col {
  padding-left: var(--body-gap);
  border-left: 1px solid rgba(122, 78, 32, 0.35);
}

.col-head {
  margin: 0;
  padding-bottom: 9px;
  border-bottom: 1px solid rgba(122, 78, 32, 0.45);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
}

.tally-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* EIN Kopfformat für alle Abschnitte beider Spalten: Grösse und Laufweite sind
   überall gleich, unterschieden wird über die Farbe des Icons. Vorher trug fast
   jeder Abschnitt seine eigene Beschriftungsgrösse. */
/* Feste Höhe, weil die Summe rechts erst erscheint, sobald etwas gefallen ist:
   ohne sie wüchse der Kopf mitten in der Pause um 6 px und schöbe alles
   darunter nach — dasselbe Muster wie bei `.callout-head`. */
.sec-head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 24px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
  white-space: nowrap;
}

.sec-head__icon {
  flex-shrink: 0;
  color: #c89040;
}

.sec-head__n {
  margin-left: auto;
  font-size: 1.4em;
  letter-spacing: 0.02em;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
}

/* ── Sonnenscheibe mit Bilanz ─────────────────────────── */
/* Beide Ledger-Spalten sind gleich breit — Bedingung, nicht Geschmack: nur so
   steht die Scheibe mittig in IHRER Spalte. Gemessen `.sun-hero` gegen
   `.state-col`, Toleranz null.

   Der Block ist GENAU so hoch wie die Scheibe (`--sun-d`): ein Zuwachs hier
   änderte die Panelhöhe und zöge den Fit-Scale des ganzen Overlays mit. */
.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.sun-block {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  column-gap: 18px;
  width: 100%;
  min-height: var(--sun-d);
}

.sun-block > :nth-child(1) {
  justify-self: end;
}

.sun-block > :nth-child(3) {
  justify-self: start;
}

.sun-hero {
  position: relative;
  flex-shrink: 0;
  pointer-events: none;
}

.sun-hero__disc {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.sun-phase-label {
  font-size: 1.05rem;
  font-weight: 400;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  line-height: 1.15;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}

/* ── Vitalitäts-Leiste ────────────────────────────────── */
/* Der Streifen bleibt ein eigenes Element dieser Datei: seine HÖHE geht in die
   Panelhöhe und damit in den Fit-Scale des GANZEN Overlays ein. Die Leiste
   selbst bringt ihre Farbstufen, Ebenen und ihr Timing mit — hier stehen nur
   ihre Masse. */
.vital-strip {
  display: block;
  width: 100%;
  height: var(--vb-h);
  --vb-h: 44px;
  --vb-radius: 5px;
  --vb-label-size: calc(var(--vb-h) * 0.64);
  --vb-label-sub-size: calc(var(--vb-h) * 0.44);
  --vb-regen-size: calc(var(--vb-h) * 0.34);
  --vb-tick-inset: calc(var(--vb-h) * 0.2);
  --vb-cur-reserve: 0;
}

/* ── Die drei Achsen ──────────────────────────────────── */
.state-rows {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

/* ── Chime-Ablesung ───────────────────────────────────── */
/* Die grösste Zahl des Panels — sie ist der Grund, warum man überhaupt
   pausiert hat. Beschriftung darunter, klein: Zahlen dominieren.

   Zwei Ablesungen nebeneinander, nicht untereinander: Höhe ist im Panel die
   teure Achse, Breite hat die Bilanzspalte im Überfluss. Der Meep steht rechts
   an der Spaltenkante, damit zwischen beiden eine echte Lücke bleibt und sie
   nicht als ein Block gelesen werden. */
/* Zwei GLEICH BREITE Hälften, jede aus fester Orb-Spalte und Text daneben.

   Vorher waren beide inhaltsbreit und mit `space-between` an die Kanten
   gedrückt: die rechte wuchs damit nach LINKS, ihr Bild wanderte also, sobald
   die Zahl eine Stelle mehr bekam. Mit `1fr 1fr` steht jeder Orb an einer
   festen Position, und der Text wächst nur in seine eigene Hälfte hinein. */
.chime-readout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--readout-gap);
  width: 100%;
  min-width: 0;
}

.chime-readout__part {
  display: grid;
  grid-template-columns: var(--readout-orb) minmax(0, 1fr);
  align-items: center;
  gap: var(--readout-gap);
  min-width: 0;
}

.chime-orb {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.chime-img {
  position: relative;
  z-index: 1;
  width: 72px;
  height: 72px;
  object-fit: contain;
  /* Statischer Schatten am Bild, der Takt liegt auf der Ebene darunter. */
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.8));
}

/* Eigene Ebene für den Schein: animiert wird NUR ihre Opazität. Vorher atmete
   ein `drop-shadow`-Filter direkt am Bild — jeder Frame eine Neurasterung
   (siehe „Performance" Regel 2). */
.chime-orb__halo {
  position: absolute;
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 214, 96, 0.36) 0%,
    rgba(255, 214, 96, 0.12) 45%,
    transparent 70%
  );
  pointer-events: none;
  animation: chime-glow 3.4s ease-in-out infinite;
}

/* Meep-Orange statt Chime-Gold — dieselbe Sache trägt im ganzen Spiel dieselbe
   Farbe (Header, Materialleiste, Ring der Passiv-Kachel). */
.chime-orb__halo--meep {
  background: radial-gradient(
    circle,
    rgba(253, 186, 116, 0.3) 0%,
    rgba(253, 186, 116, 0.1) 45%,
    transparent 70%
  );
}

/* Doppelte Klasse, weil `.chime-value` weiter unten steht: bei gleicher
   Spezifität gewinnt die spätere Regel, und der Meep-Wert stünde sonst in
   4,5 rem mit der Reservierung des Chime-Werts — 286 px für eine Zahl, die
   höchstens fünf Zeichen hat, und der Bestand daneben fiele auf null.

   Ohne Vorzeichen ist eine Stelle weniger zu reservieren. */
.chime-value.chime-value--meep {
  min-width: 5ch;
  font-size: 3.2rem;
  color: #fdba74;
}

@keyframes chime-glow {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

.chime-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* Die Zahl und, beim Meep, ihr Zusatz — in EINER Zeile. */
.chime-value-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

/* Reservierte Breite: `formatNumberCompact` liefert höchstens fünf Zeichen,
   mit dem Vorzeichen sechs. Nur deshalb bleibt der Zusatz rechts daneben
   stehen, wenn die Zahl eine Stelle gewinnt — dasselbe Muster wie die
   reservierte Uhr-Breite der Buff-Chips. */
.chime-value {
  flex: 0 0 auto;
  min-width: 6ch;
  font-size: 4.5rem;
  font-weight: 800;
  line-height: 0.98;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow:
    0 0 24px rgba(240, 208, 96, 0.4),
    0 3px 8px rgba(0, 0, 0, 0.9);
}

/* Klein und wenig gesperrt: mit der Sperrung der Beschriftung (0.24em) wäre er
   wieder breiter als seine Spalte. Die Auslassung ist die Notbremse — ein
   Umbruch machte den Block höher und ließe den Fit-Scale springen. */
.chime-value-note {
  /* Nicht schrumpfbar: als schrumpfendes Flex-Item gab sie Breite ab, obwohl
     die Zeile Platz hatte, und wurde ellipsiert (gemessen 86 px für 108 px
     Inhalt). Sie ist kurz und darf ihre Breite behalten. */
  flex: 0 0 auto;
  min-width: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(253, 186, 116, 0.6);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sperrung 0,16em statt 0,24em: „CHIMES GATHERED" maß in MedievalSharp
   gemessen 347 px und lief damit aus seiner Spalte. */
.chime-cap {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Kill-Aufschlüsselung ─────────────────────────────── */
/* Ein Chip je Kategorie nebeneinander statt einer Liste untereinander:
   waagerecht bekommt dieselbe Zahl doppelt so viel Schrift. Zugeordnet wird
   über den Farbstrich an der Kante, nicht über fünf Kästchen. */
.kill-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.kill-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding-left: 10px;
  min-width: 0;
  border-left: 2px solid var(--kill-color);
}

.kill-chip__count {
  max-width: 100%;
  overflow: hidden;
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
}

.kill-chip__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.1;
  color: rgba(216, 200, 160, 0.5);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Kategorien ohne Treffer bleiben STEHEN und dimmen nur ab — verschwänden sie,
   spränge das Raster, sobald während der Pause die erste dazukommt. */
.kill-chip--zero {
  opacity: 0.3;
}

/* ── Materialien ──────────────────────────────────────── */
/* Fünf Karten je Reihe, zwei Reihen. Die Rasterhöhe ist FEST reserviert:
   klappte die zweite Reihe erst beim fünften Material auf, änderte sich die
   Panelhöhe mitten in der Pause — und mit ihr der Fit-Scale.

   Die Karten haben keine eigene Fassung: der Platz, den Rahmen und Füllung
   gekostet haben, gehört dem Bild. Übrig bleiben Bild und Menge. */
.mat-grid {
  display: grid;
  grid-template-columns: repeat(var(--mat-cols, 5), 1fr);
  grid-template-rows: repeat(var(--mat-rows, 2), var(--mat-row-h));
  gap: var(--mat-gap);
  width: var(--mat-grid-w);
  max-width: 100%;
}

.mat-empty {
  display: flex;
  align-items: center;
  height: calc(var(--mat-row-h, 78px) * 2 + var(--mat-gap, 6px));
  font-size: 0.95rem;
  font-style: italic;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.3);
}

.mat-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.mat-card--more {
  font-size: 1.1rem;
  font-weight: 800;
  color: rgba(216, 200, 160, 0.5);
  font-variant-numeric: tabular-nums;
}

.mat-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.75));
}

/* Vier der zehn Materialien haben in den Stammdaten kein Bild — für sie steht
   dasselbe Monogramm wie im Loot-Band des Star-Fight-Modals. */
.mat-card__mono {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--mat-color);
  opacity: 0.85;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
}

.mat-card__amount {
  position: absolute;
  right: 0;
  bottom: -1px;
  font-size: 1.24rem;
  font-weight: 800;
  line-height: 1;
  color: var(--mat-color);
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 4px rgba(0, 0, 0, 0.95),
    0 0 10px rgba(0, 0, 0, 0.8);
}

.mat-card__x {
  font-size: 0.7em;
  font-weight: 700;
  opacity: 0.6;
}

/* Neue Materialien federn ein, statt still zu erscheinen. */
.mat-pop-enter-active {
  transition:
    transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.24s ease;
}

.mat-pop-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.mat-pop-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
  position: absolute;
}

.mat-pop-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.mat-pop-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Auto-Battle ──────────────────────────────────────── */
/* Feste Höhe aus demselben Grund wie beim Abschnittskopf: der Leersatz ist
   kleiner als die Bilanz, die ihn ablöst, sobald das erste Match durch ist. */
.battle-strip {
  display: flex;
  align-items: baseline;
  gap: 16px;
  width: 100%;
  height: 36px;
}

.battle-strip__idle {
  font-size: 0.9rem;
  font-style: italic;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.32);
}

.battle-strip__record {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.battle-strip__wins {
  color: #74d448;
}

.battle-strip__losses {
  color: #cc6050;
}

.battle-strip__sep {
  color: rgba(216, 200, 160, 0.35);
}

.battle-strip__lp {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}

.lp--pos {
  color: #74d448;
}

.lp--neg {
  color: #cc6050;
}

.lp--zero {
  color: rgba(216, 200, 160, 0.45);
}

.battle-strip__chimes {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  font-size: 1.2rem;
  font-weight: 800;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
}

.battle-strip__chime-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

/* ── Das Kit-Band ─────────────────────────────────────────────────────────
   Rechts eine FESTE Breite, links der Rest. Die Chips tragen einen Namen neben
   ihrer Uhr und brauchen dafür eine verlässliche Spalte; die Fähigkeitszeilen
   daneben vertragen jede Breite, die übrig bleibt.

   Andersherum (`auto` links) misst das Raster nur die Mindestbreite des
   Inhalts — die Zeilen fielen dann auf gut die Hälfte zusammen, während die
   Chips Platz bekamen, den sie nicht brauchen.

   Die Trennlinie ist dieselbe Haarlinie wie zwischen Bilanz und Zustand: eine
   Linie, kein zweiter Kasten. */
.kit-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--pause-kit-effect-w);
  gap: var(--pause-kit-gap);
  width: 100%;
}

.kit-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.kit-col--effects {
  padding-left: var(--pause-kit-gap);
  border-left: 1px solid rgba(122, 78, 32, 0.35);
}

/* Fest reserviert, nicht mitwachsend: hier hängt der Fit-Scale des ganzen
   Overlays daran. Beide Spalten füllen ihre Höhe ganz aus — die Zeilenhöhe im
   Kit ist aus eben dieser Bandhöhe abgeleitet (PAUSE_KIT_ROW_H), damit sie
   bündig mit den Effekt-Chips gegenüber abschließen. */
.kit-dock {
  display: flex;
  align-items: stretch;
  height: var(--pause-kit-band-h);
}

/* ── Callouts ─────────────────────────────────────────── */
.callout-section {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
}
/* Überschrift und Level-Up-Marke auf einer Zeile mit fester Höhe: taucht die
   Marke mitten in der Pause auf, rückt darunter nichts nach.
   Linksbündig wie die Karten darunter — beide teilen sich damit EINE Kante,
   an der das Auge den Abschnitt findet. */
.callout-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  height: 22px;
}
.callout-heading {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.55);
}
/* Die einzige verbliebene Pille im Abschnitt — sie meldet keine laufende Frist,
   sondern eine offene Entscheidung, und steht deshalb bei der Überschrift. */
.level-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(116, 212, 72, 0.45);
  background: linear-gradient(135deg, rgba(116, 212, 72, 0.16), rgba(116, 212, 72, 0.05));
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #b6ec96;
  white-space: nowrap;
}
.level-chip__icon {
  flex-shrink: 0;
  color: #74d448;
  filter: drop-shadow(0 0 5px rgba(116, 212, 72, 0.8));
}
.level-chip__count {
  font-size: 1.05em;
  color: #74d448;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px rgba(116, 212, 72, 0.55);
}
/* Alle Karten sind gleich gross und stehen linksbündig nebeneinander: die
   Champion-Karte zuerst, dann der Void, dann die Flybys. Ab der fünften Karte
   bricht die Reihe um — vier passen in den Panelinnenraum
   (4 × 208 + 3 × 6 = 850 ≤ 872), fünf nicht mehr (1064).

   Feste Höhe für ZWEI Kartenzeilen: reservierter Platz, egal ob leer oder voll
   besetzt. Eine mitwachsende Höhe liesse den Fit-Scale des ganzen Overlays
   mitten in der Pause springen, sobald der fünfte Callout auftaucht.

   Die Lücke kommt inline aus PAUSE_STAR_CARD_GAP_PX — dieselbe Zahl steht in
   der Breitenrechnung und zwischen den beiden Zeilen. */
.callout-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  justify-content: flex-start;
  gap: var(--star-card-gap);
  /* Die Reservierung steht als Zahl in PAUSE_CALLOUT_ROWS, nicht als `2 *`
     hier — mit der Drifter-Karte ist die sechste Spalte weggefallen, und die
     fünf verbliebenen passen in eine Zeile. */
  height: calc(
    var(--star-card-rows) * var(--star-card-h) + (var(--star-card-rows) - 1) *
      var(--star-card-gap)
  );
  width: 100%;
  overflow: hidden;
}
/* Der Leersatz hat keine Karte, an der er sich ausrichten könnte — er steht
   deshalb als einziger mittig im reservierten Feld. */
.callout-row--empty {
  align-items: center;
  align-content: center;
  justify-content: center;
}

.callout-empty {
  font-size: clamp(0.68rem, 0.95vw, 0.78rem);
  font-style: italic;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.32);
}
/* Pop-in: neue Karten und Marken federn in die reservierte Zeile ein */
.callout-pop-enter-active {
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}
.callout-pop-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.callout-pop-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.callout-pop-leave-to {
  opacity: 0;
  transform: scale(0.7);
}
.callout-pop-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Continue button ──────────────────────────────────── */
/* Dreispalter: die leere erste Spalte spiegelt die Tastengruppe rechts, damit
   die Beschriftung in der Mitte steht — und nicht um deren Breite verschoben,
   wie es ein einfaches space-between täte. */
.continue-btn {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  padding: 16px 4px 2px;
  background: none;
  border: none;
  border-top: 1px solid rgba(122, 78, 32, 0.55);
  color: #f4e2a0;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color 0.18s ease,
    border-color 0.18s ease;
}
.continue-btn:hover {
  border-color: rgba(240, 208, 96, 0.6);
  color: #ffeeb4;
}
.continue-btn:active {
  color: #f0d060;
}
.continue-btn:focus-visible {
  outline: 2px solid #f0d060;
  outline-offset: 3px;
}
.continue-btn__main {
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: 9px;
}
/* Die Tasten treten hinter der Beschriftung zurück — sie sagen, WIE es auch
   geht, nicht was der Knopf tut. Beim Überfahren kommen sie mit nach vorn. */
.continue-btn__keys {
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 5px;
  opacity: 0.55;
  transition: opacity 0.18s ease;
}
.continue-btn:hover .continue-btn__keys {
  opacity: 1;
}

/* ── Transitions ──────────────────────────────────────── */
.pause-fade-enter-active {
  transition: opacity 0.3s ease;
}
/* Pop-in auf der Stage — das Panel selbst trägt den inline Fit-Scale-Transform */
.pause-fade-enter-active .pause-stage {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.pause-fade-leave-active {
  transition: opacity 0.18s ease;
}
.pause-fade-enter-from {
  opacity: 0;
}
.pause-fade-enter-from .pause-stage {
  transform: scale(0.94) translateY(14px);
}
.pause-fade-leave-to {
  opacity: 0;
}

/* ── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  /* Die beiden Scheine liegen jetzt auf eigenen Ebenen — angehalten wird
     deshalb dort, und zwar auf ihrem ruhigen Ende (opacity 0). */
  .particle,
  .chime-orb__halo,
  .pause-timer__glow {
    animation: none;
  }
  /* Die Vitalitätsleiste hält sich selbst an — sie ist ein eigenes Bauteil und
     bringt ihren `prefers-reduced-motion`-Block mit. */
  .callout-pop-enter-active,
  .callout-pop-leave-active,
  .callout-pop-move,
  .mat-pop-enter-active,
  .mat-pop-leave-active,
  .mat-pop-move {
    transition: opacity 0.15s;
  }
  .continue-btn,
  .pause-fade-enter-active,
  .pause-fade-leave-active,
  .pause-fade-enter-active .pause-stage {
    transition: opacity 0.15s;
  }
}
</style>
