/* Die EINE Skala der Galaxie-Achse.

   Jede Formel, die MIT der Galaxienummer wächst, rechnet gegen `galaxyDepth(g)`
   statt gegen `galaxy - 1`. Nicht der Eleganz wegen, sondern wegen der achten
   Fundstelle: sieben Formeln einzeln nachzuziehen heisst, beim nächsten Mal eine
   zu vergessen.

   Zwei Sorten gehen NICHT hier durch:
   - SCHWELLEN nennen eine Galaxie, keine Rate — `computeRequired`, `tierOf`,
     `starLevelForGalaxy`, `CHAMPION_TIER_REQUIRED_GALAXY`. Eine gebrochene Tiefe
     ergäbe dort 3,5 Sterne.
   - SPANNEN normalisieren bereits selbst (`(g-1) / SPAN` in `depthOf` und
     `backfillFailCount`). Sie zu skalieren ist dasselbe wie ihre Spanne zu
     ändern — und beide wohnen in `config/`, das nirgends aus `utils/` importiert. */

import { GALAXY_DEPTH_PER_GALAXY } from '@/config/constants'

export function galaxyDepth(galaxy: number): number {
  return Math.max(0, galaxy - 1) * GALAXY_DEPTH_PER_GALAXY
}
