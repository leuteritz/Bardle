import { reactive } from 'vue'

/** Non-persistent reactive map: champion name → isBehind. Updated per-frame by ChampionOrbit. */
export const activeChampionBehindState = reactive<Record<string, boolean>>({})
