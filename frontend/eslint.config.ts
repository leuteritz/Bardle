import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    // Die Spieluhr (`utils/game/gameClock.ts`) läuft im Zeitraffer schneller als
    // die Wanduhr. Wer in einem Store `Date.now()` gegen ein Store-Feld
    // vergleicht, vergleicht dann zwei Achsen — und das Ergebnis ist entweder
    // „feuert nie" oder „feuert sofort". Beides fällt in einem Balancing-Lauf
    // nicht als Fehler auf, sondern als falsche Zahl.
    //
    // Ausnahmen gibt es (Autosave, Chronikstempel, Entropie, Anzeige-Animationen);
    // sie tragen ein `eslint-disable-next-line … -- Wanduhr: <Grund>`.
    name: 'app/game-clock',
    files: ['src/stores/**/*.ts', 'src/utils/orbit/**/*.ts'],
    ignores: ['src/utils/game/gameClock.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            'Spielzeit statt Wanduhr: gameNow() aus @/utils/game/gameClock verwenden. ' +
            'Ist die Wanduhr wirklich gemeint, mit `eslint-disable-next-line no-restricted-syntax -- Wanduhr: <Grund>` begründen.',
        },
      ],
    },
  },
)
