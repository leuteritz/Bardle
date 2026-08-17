<script setup lang="ts">
import { watch, computed, ref, reactive, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/core/uiStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGamePause } from '@/composables/system/useGamePause'
import { onKeybinding } from '@/composables/system/useKeybindings'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import type { BardTabId } from '@/stores/core/uiStore'
import type { KeybindId } from '@/types'
import { formatBadgeCount } from '@/utils/ui/format'
import { useBadgeFlare } from '@/composables/ui/useBadgeFlare'
import { HEADER_GEM_ICONS } from '@/config/constants'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import RpgBadgeTooltipBody from '@/components/ui/RpgBadgeTooltipBody.vue'
import ShopReadyBadge from '@/components/ui/ShopReadyBadge.vue'
import ShopComponent from '@/components/bardProfil/shop/ShopComponent.vue'
import SkillTreeComponent from '@/components/bardProfil/skill/SkillTreeComponent.vue'
import AdminDashboard from '@/components/bardProfil/admin/AdminDashboard.vue'
import BattleResultComponent from '@/components/bardProfil/battle/BattleResultComponent.vue'
import TeamTabComponent from '@/components/bardProfil/team/TeamTabComponent.vue'
import PlanetSelectTabComponent from '@/components/bardProfil/planets/PlanetSelectTabComponent.vue'
import BardStatsTab from '@/components/bardProfil/stats/BardStatsTab.vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import ProfileVitalsCluster from '@/components/bardProfil/hud/ProfileVitalsCluster.vue'
import ProfileReadinessCluster from '@/components/bardProfil/hud/ProfileReadinessCluster.vue'

const uiStore = useUiStore()
const galaxyStore = useGalaxyStore()
const { isPaused } = useGamePause()
const expeditionStore = useExpeditionStore()
const battleStore = useBattleStore()
const solarStore = useSolarUpgradeStore()
const meepTreeStore = useMeepTreeStore()
const planetShopStore = usePlanetShopStore()
const achievementStore = useAchievementStore()
const forgeStore = useStarForgeStore()
const { newlyUnlockedChampions } = storeToRefs(battleStore)

const expeditionBadgeCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
)
// Team tab: champions unlocked in battle that the player has not picked up yet
// (same number the middle-header badge shows, same name it uses there).
const championBadgeCount = computed(() => newlyUnlockedChampions.value.length)
const forgeBadgeReady = computed(() => solarStore.canUpgradeStar)
const skillBadgeCount = computed(() => meepTreeStore.unseenBuyableCount)
// Chronicle: Bahnen mit einer Stufe, die der Spieler noch nicht gesehen hat.
// Das Banner ist längst verklungen, wenn er das Profil öffnet — das Abzeichen
// ist der Hinweis, dass dort etwas Neues steht. Es hängt am Bard-Tab, weil das
// Chronicle dort unter der Sonne wohnt.
const chronicleBadgeCount = computed(() => achievementStore.unseen.length)
// Planet tab: TOTAL affordable level-ups across all six orbit slots right now
// (matches the middle-header planet badge).
const planetBadgeCount = computed(() => planetShopStore.affordableLevelCount)
// Compact label — the total can climb high, so cap the glyph.
const planetBadgeLabel = computed(() => formatBadgeCount(planetBadgeCount.value))

/**
 * Shop: was in der Star Forge kaufbar ist UND der Spieler noch nicht angesehen
 * hat — Strahlen, Knoten, Relikte, Konstellationen und der laufende Handel
 * zusammen, Chimes UND Material geprüft.
 *
 * NICHT `shopReadyTotal`: kaufbar ist ab dem mittleren Spiel dauernd etwas, und
 * eine Marke, die nie ausgeht, meldet nichts mehr. Fährt der Spieler im Shop
 * über einen frisch markierten Eintrag, fällt dessen Rahmen — und diese Zahl
 * mit ihm. Herleitung an `shopFreshBySection` im Store.
 *
 * Das Maximum ist 59, also greift `formatBadgeCount` hier nie und die rohe Zahl
 * genügt. Sie trägt BEIDE Abzeichen: das an der Ecktaste oben im Template und
 * das am Shop-Tab in der Leiste.
 */
const shopFreshCount = computed(() => forgeStore.shopFreshTotal)

/**
 * Das Shop-Abzeichen steht ruhig und blitzt nur EINMAL auf, wenn die Zahl
 * steigt — Mechanik samt Begründung in `useBadgeFlare()`. Beide Abzeichen,
 * Ecktaste und Tab-Reiter, hängen an DIESEM einen Merker: sie zeigen dieselbe
 * Zahl und dürfen nicht versetzt blitzen.
 */
const shopFlare = useBadgeFlare(shopFreshCount)

/**
 * Ein Glyph je Tab statt eines Artworks.
 *
 * BEWUSSTE AUSNAHME von der Set-Regel in CLAUDE.md („Spielinhalt =
 * game-icons"): Die Leiste ist die oberste Navigationsebene und wird als EINE
 * Reihe gelesen — dort wiegt gleiche Strichstärke schwerer als die Herkunft
 * aus einem Set. Die verschnörkelten game-icons liefen bei 48 px in der Reihe
 * auseinander (`family-tree` fein und spinnenartig neben dem massiven `shop`),
 * und der lucide-Zahnrad-Regler daneben fiel vollends heraus. Gewählt sind
 * deshalb durchweg gefüllte Glyphen gleicher Masse, überwiegend aus Phosphor
 * Fill; zwei Plätze gehen an ein anderes Set, weil dessen Motiv schlicht besser
 * trifft. Innerhalb der Tabs bleibt es bei game-icons.
 *
 *   ph:compass-rose-fill          — der Wandering Caretaker: Journey-Stats,
 *                                   Solar Evolution, Galaxy-Archiv, Chronicle
 *   ph:storefront-fill            — der Marktstand
 *   material-symbols:account-tree — verzweigte Knoten, der Meep Skill Tree
 *                                   (Phosphors `tree-structure` ist zu fein)
 *   ph:users-three-fill           — der Kader (Sigil-Board, Allies, Expeditionen)
 *   ri:sword-fill                 — gekreuzte Klingen, Auto-Battle
 *                                   (Phosphor hat nur die einzelne Klinge)
 *   ph:planet-fill                — die Planeten-Slots im Orbit
 *   ph:gear-six-fill              — Admin
 *
 * Jedes Motiv steht genau einmal in der Leiste, damit die sieben Tabs
 * nebeneinander unterscheidbar bleiben.
 *
 * Shop und Tree haben je eine zweite Anlaufstelle — die beiden Ecktasten im
 * App-Header. Ihre Glyphen kommen deshalb aus `HEADER_GEM_ICONS`, damit dort
 * dasselbe Zeichen steht wie hier.
 *
 * `boost` ist die optische Angleichung über Set-Grenzen hinweg: Material und
 * Remix zeichnen auf einem 24er-Raster mit mehr Rand als Phosphors 256er,
 * ihre Glyphen sitzen im gleich großen Kasten also kleiner und wirken in der
 * Reihe zurückgesetzt. Ein statisches `scale` gleicht das aus — es steht fest
 * am Element und läuft in keiner Animation mit.
 */
/**
 * `name` ist der Kurzname, den der Reiter beim Überfahren zeigt — und
 * gleichzeitig sein `aria-label`. Ein Glyph allein hatte bis hierher KEINEN
 * zugänglichen Namen; wer die Ikonografie nicht auswendig kennt, musste raten.
 *
 * Die Wörter kommen aus Bards Kosmos, nicht aus der Ordnerstruktur: `Journey`
 * für die Chronik des Wandering Caretaker, `Rift` für den Auto-Kampf. `Shop`
 * und `Skills` stehen wortgleich in `KEYBINDINGS` — dieselbe Sache trägt nicht
 * zwei Namen, je nachdem wo man sie liest.
 */
const menuItems: {
  id: BardTabId
  name: string
  icon: string
  boost?: boolean
}[] = [
  { id: 'bard', name: 'Journey', icon: 'ph:compass-rose-fill' },
  { id: 'shop', name: 'Shop', icon: HEADER_GEM_ICONS.shop },
  { id: 'tree', name: 'Skills', icon: HEADER_GEM_ICONS.tree, boost: true },
  { id: 'team', name: 'Team', icon: 'ph:users-three-fill' },
  { id: 'battle', name: 'Rift', icon: 'ri:sword-fill', boost: true },
  { id: 'planets', name: 'Planets', icon: 'ph:planet-fill' },
  { id: 'admin', name: 'Admin', icon: 'ph:gear-six-fill' },
]

/**
 * Was einmal stand, bleibt stehen — Modalrahmen wie Tab-Inhalte.
 *
 * Vorher hing der ganze Rahmen an einem `v-if`: jedes Öffnen baute ihn samt
 * gewähltem Tab neu auf, jedes Schließen riss ihn ab. Gemessen mit vollem Team
 * (verlorene Frame-Zeit je 800ms-Fenster, Median aus 10 Durchläufen, Grundlast
 * 98 ms): Team-Tab öffnen 294 ms, schließen 253 ms — nicht EIN langer Frame,
 * sondern über zehn schlechte hintereinander. Genau das liest sich als Freeze.
 *
 * Der Tree-Tab hatte dieses Muster als Einzelfall schon (Vue-Flow-Remount); es
 * gilt für jeden Tab, nur dass die anderen ihre Kosten in DOM-Masse statt in
 * einer Bibliothek tragen — der Team-Tab allein bringt 1438 Knoten, 363
 * SVG-Elemente und 106 laufende Animationen mit.
 *
 * Preis dafür: der Inhalt lebt weiter, während niemand hinsieht. Zwei Regeln
 * halten das im Zaum, beide in den Tabs selbst:
 *   • laufende Arbeit (rAF-Schleifen, Intervalle, Fenster-Listener) hängt an
 *     der SICHTBARKEIT des Tabs, nicht mehr an seiner Lebensdauer
 *   • Zustand wird beim VERLASSEN zurückgesetzt, nicht beim Betreten — sonst
 *     käme der Reset einer Öffnungs-Anfrage (`requestOpenRolesTab`) im selben
 *     Flush in die Quere und löschte die Rolle, die gerade geöffnet werden soll
 */
const modalMounted = ref(false)
const mountedTabs = reactive(new Set<BardTabId>())

watch(
  () => uiStore.bardActiveTab,
  (val) => {
    if (val !== null) {
      modalMounted.value = true
      mountedTabs.add(val)
      return
    }
    // Modal geschlossen: ein noch offener Battle-Return-Kontext ist obsolet
    // (der Return-Button hat beim Klick bereits selbst gecleart — hier greift
    // nur das manuelle Schließen)
    uiStore.clearBattleReturn()
  },
)

// ── Tastenkürzel ────────────────────────────────────────────────────────────
// Diese Komponente ist immer montiert (der v-if steckt im Teleport), sie kann
// den Handler also halten, auch wenn gerade kein Tab offen ist.
/**
 * Ein Kürzel, das einen Tab ansteuert: hin — oder zu, wenn er schon offen ist.
 * Aus einem ANDEREN Tab heraus wird gewechselt statt geschlossen; so führt die
 * Taste immer an ihr Ziel, statt je nach Zustand irgendwohin.
 */
function bindTabShortcut(id: KeybindId, tab: BardTabId) {
  onKeybinding(id, () => {
    // Rollenwahl und Pause liegen über allem — ein Tab, der sich dahinter
    // öffnet, wäre unsichtbar und stünde beim Zurückkehren im Weg.
    if (galaxyStore.pendingRoleSelection || isPaused.value) return
    if (uiStore.bardActiveTab === tab) uiStore.closeBardModal()
    else uiStore.setBardTab(tab)
  })
}

bindTabShortcut('shop', 'shop')
bindTabShortcut('tree', 'tree')

/**
 * Escape schließt das Profil — aber erst, wenn niemand INNERHALB des Modals die
 * Taste für sich beansprucht hat. Der Team-Tab wickelt damit seine eigenen
 * Ebenen ab (Detailkarte, Picker, Rollenspalte), der Champion-Shop sein
 * Filterfeld; alle melden das mit `preventDefault`.
 *
 * Die Entscheidung fällt deshalb erst NACH dem Ereignisdurchlauf, wenn
 * `defaultPrevented` endgültig feststeht — unabhängig davon, in welcher
 * Reihenfolge sich die Listener registriert haben; bei ineinander liegenden
 * Komponenten wäre die kaum vorhersagbar.
 *
 * Ein Microtask reicht dafür NICHT: zwischen zwei Listenern desselben
 * Ereignisses leert sich der JS-Stack, und genau dort läuft die Microtask-
 * Warteschlange bereits leer. Gemessen: der Team-Tab kam danach dran, das Modal
 * schloss sich also samt seiner inneren Ebene. Ein Timeout liegt hinter dem
 * gesamten Durchlauf.
 */
let escapeTimer: ReturnType<typeof setTimeout> | null = null

function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  // Controls-Panel und Pause-Overlay liegen darüber und antworten zuerst.
  if (uiStore.isControlsOpen || isPaused.value) return
  if (escapeTimer !== null) clearTimeout(escapeTimer)
  escapeTimer = setTimeout(() => {
    escapeTimer = null
    if (!event.defaultPrevented) uiStore.closeBardModal()
  }, 0)
}

watch(
  () => uiStore.bardActiveTab !== null,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onEscape)
    } else {
      window.removeEventListener('keydown', onEscape)
      // Ein noch schwebender Escape-Timer gehört zu einem Modal, das inzwischen
      // ohnehin zu ist — er dürfte das nächste nicht gleich wieder schließen.
      if (escapeTimer !== null) {
        clearTimeout(escapeTimer)
        escapeTimer = null
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
  if (escapeTimer !== null) clearTimeout(escapeTimer)
})
</script>

<template>
  <!-- Dasselbe Glyph wie der Shop-Tab in der Leiste unten (HEADER_GEM_ICONS) —
       Ecktaste und Tab führen an denselben Ort. -->
  <button class="btn-gem btn-gem--corner-left" title="Open Shop" @click="uiStore.setBardTab('shop')">
    <Icon :icon="HEADER_GEM_ICONS.shop" width="48" height="48" class="btn-gem-icon" aria-hidden="true" />
    <span class="btn-gem-label">Shop</span>
    <!-- Ein `span`, kein zweiter Button: verschachtelte Buttons sind ungültiges
         HTML, und ein eigener Klickweg wäre hier auch überflüssig — die Ecktaste
         darunter führt bereits in den Shop.
         `clear-ancestor` räumt die Unterkante der ganzen PLATTE statt der des
         Abzeichens; ohne das läge das Tooltip-Feld mitten auf der Taste. -->
    <RpgBadgeTooltip clear-ancestor=".btn-gem">
      <ShopReadyBadge
        :count="shopFreshCount"
        :flare="shopFlare"
        :label="`${shopFreshCount} new Star Forge purchases within reach`"
      />
      <template #tip>
        <RpgBadgeTooltipBody kind="shop" />
      </template>
    </RpgBadgeTooltip>
  </button>

  <!-- ══ Backdrop + Modal ══ -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div
        v-if="uiStore.bardActiveTab !== null"
        class="fixed inset-0 z-[115] bg-black/80"
        @click="uiStore.closeBardModal()"
      />
    </Transition>

    <!-- `v-if` erst beim ersten Öffnen, danach nur noch `v-show`: der Rahmen
         wird einmal gebaut und bleibt. Ein `<template v-if>` erzeugt dabei kein
         eigenes Element, der Wrapper bleibt also das direkte Transition-Kind. -->
    <template v-if="modalMounted">
      <Transition name="modal-pop">
        <div v-show="uiStore.bardActiveTab !== null" class="rp-wrapper">
          <div class="flex flex-col rp-modal">
            <RpgFrame />
            <div class="rp-accent-bar" />

            <!-- Drei Spalten, nicht ein zentriertes Flex-Kind: die Reiter
                 bleiben dadurch MATHEMATISCH mittig, egal wie breit die beiden
                 Live-Cluster gerade ausfallen. Als Geschwister eines `flex-1`
                 hätten sie die Mitte je nach HP-Zahl verschoben. -->
            <div class="flex-shrink-0 rp-modal-header">
              <!-- Der Zustand der Sonne. Er steht hier, weil das Profil das
                   Spiel nicht anhält, die HP-Leiste des Orbits aber verdeckt. -->
              <div class="rp-header-side rp-header-side--left">
                <ProfileVitalsCluster />
              </div>

              <div class="flex items-center justify-center gap-1.5 px-2 py-2 rp-tab-strip">
                <!-- Der Slot trägt den Namenschip, nicht der Reiter selbst:
                     der Knopf steht auf `overflow: hidden`, damit der Schein
                     der Badges an seiner Kante endet. Ein Chip darin wäre
                     mit abgeschnitten. -->
                <div v-for="item in menuItems" :key="item.id" class="rp-tab-slot">
                  <button
                    @click="uiStore.setBardTab(item.id)"
                    class="rp-tab relative flex items-center justify-center gap-1.5 overflow-hidden"
                    :class="uiStore.bardActiveTab === item.id ? 'rp-tab--active' : ''"
                    :aria-label="item.name"
                    :aria-current="uiStore.bardActiveTab === item.id ? 'page' : undefined"
                  >
                    <!-- Ein Glyph steht ALLEIN für seinen Reiter und trägt
                         deshalb die volle Fläche — alle sieben stehen damit auf
                         einer Höhe. Der Name kommt beim Überfahren, nicht als
                         Text daneben: er würde die Leiste je Reiter verschieden
                         breit machen. -->
                    <Icon
                      :icon="item.icon"
                      class="relative z-10 rp-tab-icon"
                      :class="item.boost ? 'rp-tab-icon--boost' : ''"
                    />
                    <span
                      v-if="uiStore.bardActiveTab === item.id"
                      class="absolute bottom-0 rp-tab-indicator left-2 right-2"
                    />
                    <div v-if="item.id === 'team'" class="team-badge-row">
                      <span v-if="expeditionBadgeCount > 0" class="mini-badge mini-badge--expedition">{{ expeditionBadgeCount }}</span>
                      <span v-if="championBadgeCount > 0" class="mini-badge mini-badge--champion">{{ championBadgeCount }}</span>
                    </div>
                    <div v-if="item.id === 'tree' && skillBadgeCount > 0" class="team-badge-row">
                      <span class="mini-badge mini-badge--skill">{{ skillBadgeCount }}</span>
                    </div>
                    <!-- Bard tab carries both of its own signals: the ready
                         evolution (the sun dial lives here now, so the ✦ moved
                         off the Forge tab with it) and unseen Codex stages. -->
                    <div
                      v-if="item.id === 'bard' && (forgeBadgeReady || chronicleBadgeCount > 0)"
                      class="team-badge-row"
                    >
                      <span
                        v-if="forgeBadgeReady"
                        class="mini-badge mini-badge--forge"
                        title="The sun is ready to evolve — the console sits under the dial"
                      >✦</span>
                      <span
                        v-if="chronicleBadgeCount > 0"
                        class="mini-badge mini-badge--chronicle"
                        :title="`${chronicleBadgeCount} Astral Codex ${chronicleBadgeCount === 1 ? 'track has' : 'tracks have'} a new stage`"
                      >{{ chronicleBadgeCount }}</span>
                    </div>
                    <!-- Shop: was in der Star Forge neu erreichbar ist und noch
                         nicht angesehen wurde. Dieselbe Marke wie an der Ecktaste
                         und in der Schiene des Tabs — ruhig, mit einmaligem
                         Aufblitzen, wenn die Zahl steigt. -->
                    <div v-if="item.id === 'shop' && shopFreshCount > 0" class="team-badge-row">
                      <ShopReadyBadge
                        place="inline"
                        :count="shopFreshCount"
                        :flare="shopFlare"
                        :title="`${shopFreshCount} new Star Forge ${shopFreshCount === 1 ? 'purchase is' : 'purchases are'} within reach`"
                        :label="`${shopFreshCount} new Star Forge purchases within reach`"
                      />
                    </div>
                    <div v-if="item.id === 'planets' && planetBadgeCount > 0" class="team-badge-row">
                      <span
                        class="mini-badge mini-badge--planet"
                        :title="`${planetBadgeCount} planet ${planetBadgeCount === 1 ? 'level-up' : 'level-ups'} affordable — level up your orbit slots`"
                      >{{ planetBadgeLabel }}</span>
                    </div>
                  </button>
                  <!-- `aria-hidden`: der Name steht schon als `aria-label` am
                       Knopf, ein Screenreader würde ihn sonst zweimal lesen. -->
                  <span class="rp-tab-tip" aria-hidden="true">{{ item.name }}</span>
                </div>
              </div>

              <!-- Die Handlungsfähigkeit: Resonanz und Q W E R. Die Leiste im
                   Orbit hängt an `bardActiveTab === null` und ist hier weg —
                   ihre Abklingzeiten laufen trotzdem weiter. -->
              <div class="rp-header-side rp-header-side--right">
                <ProfileReadinessCluster />
              </div>
            </div>

            <!-- Jeder Tab ein eigener Layer: einmal gemountet (`v-if`), danach
                 nur noch ein- und ausgeblendet (`v-show`). Kein `Transition
                 mode="out-in"` mehr — der erzwang bei jedem Wechsel zwei
                 Transition-Phasen samt `forceReflow`, und ein Kreuzblende
                 zwischen zwei bereits stehenden Layern bringt nichts, was den
                 Preis wert wäre. -->
            <div class="relative flex-1 min-h-0 overflow-hidden rp-modal-content">
              <!-- Battle-Tab: von Anfang an gemountet, Watch + Simulation laufen -->
              <div v-show="uiStore.bardActiveTab === 'battle'" class="tab-layer tab-layer--scroll">
                <BattleResultComponent />
              </div>

              <div v-show="uiStore.bardActiveTab === 'tree'" class="tab-layer">
                <SkillTreeComponent v-if="mountedTabs.has('tree')" />
              </div>

              <div
                v-if="mountedTabs.has('bard')"
                v-show="uiStore.bardActiveTab === 'bard'"
                class="tab-layer"
              >
                <BardStatsTab />
              </div>

              <div
                v-if="mountedTabs.has('shop')"
                v-show="uiStore.bardActiveTab === 'shop'"
                class="tab-layer tab-layer--scroll rp-scrollbar"
              >
                <ShopComponent />
              </div>

              <div
                v-if="mountedTabs.has('team')"
                v-show="uiStore.bardActiveTab === 'team'"
                class="tab-layer"
              >
                <TeamTabComponent />
              </div>

              <div
                v-if="mountedTabs.has('planets')"
                v-show="uiStore.bardActiveTab === 'planets'"
                class="tab-layer"
              >
                <PlanetSelectTabComponent />
              </div>

              <div
                v-if="mountedTabs.has('admin')"
                v-show="uiStore.bardActiveTab === 'admin'"
                class="tab-layer"
              >
                <AdminDashboard />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </Teleport>
</template>


<style scoped>
.team-badge-row {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  /* the row itself stays click-through; the badges re-enable hover so their
     tooltips work — clicks on a badge still bubble to the tab button */
  pointer-events: none;
  z-index: 20;
}

.mini-badge {
  /* Anker für die Schein-Ebene unten — ohne das hinge ihr `inset: 0` am
     Tab-Button und legte sich über dessen ganze Fläche. */
  position: relative;
  pointer-events: auto;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  /* Der Ruhe-Schein steht STATISCH; die Keyframe fährt nur noch `transform`. */
  box-shadow: 0 0 4px var(--tb-glow-a);
  animation: team-badge-beat 1.8s ease-in-out infinite;
}

/* Der helle Schein als eigene Ebene, statisch gerastert — animiert wird nur
   seine `opacity` (Compositor, kein Repaint). Vorher lag der Verlauf des
   Scheins in der Keyframe selbst: eine `box-shadow`-Animation rastert jede
   Frame die Box samt Schatten neu, und in der Leiste stehen bis zu fünf davon
   nebeneinander. Dieselbe Mechanik wie `.header-notif-badge::after`, dort steht
   die Herleitung. */
.mini-badge::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    0 0 10px var(--tb-glow-b),
    0 0 18px var(--tb-glow-c);
  opacity: 0;
  animation: team-badge-glow 1.8s ease-in-out infinite;
}

.mini-badge--expedition {
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  border: 1.5px solid #c9a0ff;
  --tb-glow-a: rgba(168, 85, 247, 0.5);
  --tb-glow-b: rgba(168, 85, 247, 0.9);
  --tb-glow-c: rgba(124, 58, 237, 0.4);
}

.mini-badge--forge {
  background: linear-gradient(135deg, #f0d060, #c89040);
  border: 1.5px solid #ffe080;
  color: #2a1608;
  text-shadow: 0 1px 0 rgba(255, 240, 180, 0.5);
  --tb-glow-a: rgba(232, 192, 64, 0.55);
  --tb-glow-b: rgba(240, 208, 96, 0.95);
  --tb-glow-c: rgba(200, 144, 64, 0.45);
}

.mini-badge--skill {
  background: linear-gradient(135deg, #ec4899, #be185d);
  border: 1.5px solid #f9a8d4;
  --tb-glow-a: rgba(236, 72, 153, 0.5);
  --tb-glow-b: rgba(236, 72, 153, 0.9);
  --tb-glow-c: rgba(190, 24, 93, 0.4);
}

.mini-badge--champion {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  border: 1.5px solid #38bdf8;
  --tb-glow-a: rgba(6, 182, 212, 0.5);
  --tb-glow-b: rgba(6, 182, 212, 0.9);
  --tb-glow-c: rgba(8, 145, 178, 0.4);
}

/* Azur fehlt in dieser Reihe: die Shop-Marke ist keine `.mini-badge` mehr,
   sondern `components/ui/ShopReadyBadge.vue` — dieselbe Komponente, die auch
   an der Ecktaste und in der Schiene des Shop-Tabs hängt. Sie liegt als
   `place="inline"` in derselben `.team-badge-row` wie die Marken hier. */
.mini-badge--planet {
  background: linear-gradient(135deg, #34d399, #059669);
  border: 1.5px solid #6ee7b7;
  --tb-glow-a: rgba(52, 211, 153, 0.5);
  --tb-glow-b: rgba(52, 211, 153, 0.9);
  --tb-glow-c: rgba(5, 150, 105, 0.45);
}

/* Kupfer, nicht Gold: der Forge-Stern daneben ist golden, und zwei goldene
   Marken in derselben Reihe wären beim Hinsehen dasselbe Abzeichen. */
.mini-badge--chronicle {
  background: linear-gradient(135deg, #f97316, #c2410c);
  border: 1.5px solid #fdba74;
  --tb-glow-a: rgba(249, 115, 22, 0.5);
  --tb-glow-b: rgba(249, 115, 22, 0.9);
  --tb-glow-c: rgba(194, 65, 12, 0.45);
}

@keyframes team-badge-beat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

@keyframes team-badge-glow {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* ═══════════════════════════════════════════
   MODAL RAHMEN
   ═══════════════════════════════════════════ */
.rp-wrapper {
  position: fixed;
  z-index: 125;
  /* one uniform gap to the bottom-bar neighbours: left → MiniMap edge,
     right → CommandPanel edge, bottom → scoreboard strip. Both side panels
     are exactly --hud-panel-size wide (BOTTOM_BAR_SIDE_W × --hud-scale). */
  --bp-gap: 10px;
  left: calc(var(--hud-panel-size, 330px) + var(--bp-gap));
  right: calc(var(--hud-panel-size, 330px) + var(--bp-gap));
  top: calc(var(--level-badge-bottom, calc(var(--header-total-height) + 60px)) + 8px);
  bottom: calc(var(--bottom-center-strip-h, 79px) + var(--bp-gap));
}

.rp-modal {
  position: relative;
  overflow: hidden;
  background: #111008;
  /* same curve as the bottom-bar notches directly beside the modal, where the
     minimap/command panels meet the scoreboard strip (BOTTOM_BAR_NOTCH_R ×
     --hud-scale) — corner and notch share one curvature at every resolution */
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1));
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
  height: 100%;
}

.rp-accent-bar {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  box-shadow: 0 0 8px rgba(200, 150, 30, 0.5);
}

/* ═══════════════════════════════════════════
   MODAL HEADER
   ═══════════════════════════════════════════ */
/* Drei Spalten: Zustand · Reiter · Bereitschaft.
   `minmax(0, 1fr)` an beiden Rändern — die Spalten sind damit GLEICH breit,
   die Reiterleiste in der Mitte steht also exakt in der Mitte des Kopfes und
   wandert nicht, wenn links aus „12.4K" ein „9.8K" wird. Die `0` als Minimum
   ist Pflicht: ohne sie hätte jede Spalte `min-content` als Untergrenze und
   die Reiter würden auf schmalen Fenstern aus der Mitte gedrückt. */
.rp-modal-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
  /* Der Stapelplatz ist Pflicht, keine Kosmetik: Kopf und Inhalt sind
     Flex-Geschwister ohne z-index, der Inhalt steht SPÄTER im DOM, und
     `.tab-layer` darin trägt `z-index: 1`. Ohne diese zwei Zeilen läge der
     Namenschip, der unter die Kopfkante fällt, hinter dem Tab-Inhalt — also
     unsichtbar. Nebenwirkung mit Absicht: der Schlagschatten des Kopfes ist
     seitdem sichtbar und setzt die Kante vom Inhalt ab. */
  position: relative;
  z-index: 2;
}

/* Die beiden Live-Cluster. `overflow: hidden` ist die letzte Reissleine: läuft
   ein Cluster auf einem sehr schmalen Fenster über, beschneidet er sich selbst,
   statt die Reiter zu schieben. */
.rp-header-side {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.rp-header-side--left {
  justify-content: flex-start;
}

.rp-header-side--right {
  justify-content: flex-end;
}

/* ── Trennklingen zwischen Live-Clustern und Reiterleiste ─────────────────
   Der Kopf trägt drei Blöcke mit verschiedenen Rollen — Zustand · Navigation ·
   Bereitschaft —, und bis hierher trennte sie nur Weissraum, der je nach
   Auflösung zwischen 11 und 131px schwankt.

   Das Rezept ist WORTGLEICH `.header-divider` aus `AppHeaderComponent.vue`:
   derselbe #1e1006-Untergrund, dieselbe Aufgabe, ein Kopfstreifen höher. Zwei
   Kopfzeilen übereinander mit verschiedenen Klingen wären ein sichtbarer Bruch.

   Sie hängen am REITER-STREIFEN, nicht an den Seitenspalten — und das ist der
   Punkt, an dem der erste Versuch scheiterte: die Spalten stehen auf
   `overflow: hidden`, weil die Zahlenzeile des HP-Clusters auf schmalen
   Fenstern breiter wird als ihre Spalte. Eine Klinge an der Spaltenkante wäre
   dort mit abgeschnitten worden. Der Streifen hat diese Grenze nicht, und seine
   Kanten SIND die Spaltengrenzen.

   ABSOLUT positioniert, und das ist keine Stilfrage: bei 1366 CSS-Pixeln liegen
   zwischen Cluster und Reitern nur 11px. Ein Element im Flex-Fluss (2px plus
   Ränder ≈ 10px) hätte die Cluster schrumpfen lassen — also genau das
   zurückgenommen, wofür ihre Grössenstaffel gebaut wurde. So verdrängt die
   Klinge nichts und darf auf JEDER Breite stehenbleiben. */
.rp-tab-strip {
  position: relative;
}

.rp-tab-strip::before,
.rp-tab-strip::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: clamp(28px, 2.6vw, 55px);
  border-radius: 1px;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(124, 79, 26, 0.12) 8%,
    rgba(160, 110, 15, 0.38) 20%,
    rgba(180, 125, 35, 0.52) 50%,
    rgba(160, 110, 15, 0.38) 80%,
    rgba(124, 79, 26, 0.12) 92%,
    transparent 100%
  );
  box-shadow:
    inset 0 0 0 1px rgba(255, 200, 80, 0.08),
    0 0 8px rgba(160, 110, 15, 0.06);
}

/* Vier Pixel INNERHALB des Streifens: die Spaltengrenze ist nicht die optische
   Kante — der Streifen bringt `px-2` mit, der erste Reiter nochmal
   `clamp(10px, 1.2vw, 16px)`. So steht die Klinge ungefähr mittig zwischen
   Cluster und erstem Glyph, statt an einem von beiden zu kleben. */
.rp-tab-strip::before {
  left: 4px;
}

.rp-tab-strip::after {
  right: 4px;
}

/* ═══════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════ */
/* height-aware tab art: smaller header leaves more room for tab content.
   Jedes Glyph steht allein für seinen Reiter und bekommt deshalb die volle
   Kantenlänge — alle sieben stehen damit auf einer Höhe. */
.rp-tab-icon {
  width: clamp(34px, 5vh, 48px);
  height: clamp(34px, 5vh, 48px);
  color: #7d7768;
  transition: color 0.12s;
}

/* Optische Angleichung fremder Raster — siehe `boost` bei den menuItems. */
.rp-tab-icon--boost {
  transform: scale(1.14);
}

/* Ein Slot je Reiter: er ist der Bezugspunkt des Namenschips und sonst nichts.
   `display: flex` hält den Knopf darin auf seiner eigenen Größe, der Slot
   verhält sich in der Leiste also genau wie der Knopf vorher. */
.rp-tab-slot {
  position: relative;
  display: flex;
}

.rp-tab {
  padding: clamp(5px, 0.9vh, 9px) clamp(10px, 1.2vw, 16px);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #555;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--bp-radius);
  cursor: pointer;
  transition: all 0.12s;
}

.rp-tab:hover:not(.rp-tab--active) {
  color: #999;
  background: rgba(255, 255, 255, 0.04);
  border-color: #333;
}

.rp-tab:hover:not(.rp-tab--active) .rp-tab-icon {
  color: #b6ae99;
}

.rp-tab--active {
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border-color: #4a8a28;
  color: #fff;
  box-shadow:
    0 0 10px rgba(74, 138, 40, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* Statischer Zustand, keine laufende Animation — der Schein wird genau einmal
   beim Tabwechsel gerastert. */
.rp-tab--active .rp-tab-icon {
  color: #9fe062;
  filter: drop-shadow(0 0 6px rgba(100, 210, 50, 0.5));
}

/* ── Namenschip ──────────────────────────────────────────────────────────
   Sieben Glyphen ohne Text: wer die Ikonografie nicht kennt, klickt sich
   durch. Der Name kommt deshalb beim Überfahren — als Chip, der UNTER die
   Kopfkante fällt statt in die Leiste hinein.

   Warum nicht in den Reiter: der Kopf ist auf jeder Zielauflösung 84px hoch,
   davon nimmt das Glyph 48px und das Polster 18px — für eine Textzeile bliebe
   nichts, ohne das Glyph zu verkleinern oder den Kopf wachsen zu lassen. Und
   warum nicht als Text NEBEN dem Glyph: das machte jeden Reiter verschieden
   breit und verschöbe die Leiste beim Überfahren, die mit `minmax(0, 1fr)`
   gerade mathematisch mittig gehalten wird.

   Der Chip hängt am SLOT, nicht am Reiter — der steht auf `overflow: hidden`,
   damit der 18px-Schein der Badges an seiner Kante endet.

   Bewegt werden nur `opacity` und `transform`; der Schatten steht fest und
   wechselt nie. Ruhend kostet der Chip nichts: `visibility: hidden` malt
   nicht. */
.rp-tab-tip {
  position: absolute;
  /* 8px Polster des Streifens + 3px Kopfkante, dann sitzt der Chip frei auf
     dem Inhalt statt auf der Kante zu kleben. */
  top: calc(100% + clamp(13px, 0.72vw, 18px));
  left: 50%;
  z-index: 3;
  /* Mitskalieren wie die Reiter selbst, und mit demselben Deckel: deren Glyph
     steht ab ~1000px Viewporthöhe auf 48px still. Ein fester 10px-Chip wäre
     auf 2K und 4K neben einem 48px-Glyph verloren. */
  padding: clamp(3px, 0.2vw, 5px) clamp(9px, 0.58vw, 14px);
  font-size: clamp(10px, 0.6vw, 14px);
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #d9c79a;
  background: #16140e;
  border: 1px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, -4px);
  transition:
    opacity 0.14s ease,
    transform 0.14s ease,
    visibility 0.14s ease;
}

/* Die Spitze zeigt auf den Reiter darüber. Zwei Dreiecke übereinander: das
   untere trägt die Randfarbe, das obere schließt die Fläche. */
.rp-tab-tip::before,
.rp-tab-tip::after {
  content: '';
  position: absolute;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  transform: translateX(-50%);
}

.rp-tab-tip::before {
  top: -5px;
  border-bottom: 5px solid #5c3310;
}

.rp-tab-tip::after {
  top: -4px;
  border-bottom: 5px solid #16140e;
}

/* Tastatur zählt wie Maus — der Chip ist der einzige Ort, an dem der Reiter
   seinen Namen zeigt. */
.rp-tab-slot:hover .rp-tab-tip,
.rp-tab:focus-visible ~ .rp-tab-tip {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}

/* Der offene Reiter trägt sein Grün bis in den Namen. */
.rp-tab-slot:has(.rp-tab--active) .rp-tab-tip {
  color: #9fe062;
  border-color: #4a8a28;
}

.rp-tab-slot:has(.rp-tab--active) .rp-tab-tip::before {
  border-bottom-color: #4a8a28;
}

.rp-tab-indicator {
  height: 2px;
  background: #52b830;
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(82, 184, 48, 0.7);
}

/* ═══════════════════════════════════════════
   MODAL CONTENT
   ═══════════════════════════════════════════ */
.rp-modal-content {
  background: #1a1008;
}

/* Alle Tabs liegen als gleichrangige Layer übereinander; sichtbar ist immer
   genau einer. Ein versteckter Layer steht auf `display: none` (v-show) und
   kostet damit weder Layout noch Paint noch Compositor-Zeit. */
.tab-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.tab-layer--scroll {
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* ═══════════════════════════════════════════
   SCROLLBAR
   ═══════════════════════════════════════════ */
.rp-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.rp-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.rp-scrollbar::-webkit-scrollbar-track {
  background: #111;
}
.rp-scrollbar::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}

/* ═══════════════════════════════════════════
   TRANSITIONS
   ═══════════════════════════════════════════ */
.modal-pop-enter-active,
.modal-pop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.3s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

</style>
