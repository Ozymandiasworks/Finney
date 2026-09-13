const assert = require('assert')
const { createI18n } = require('vue-i18n')

const i18n = createI18n({
  locale: 'en-us',
  fallbackLocale: 'en-us',
  globalInjection: true,
  messages: {
    'en-us': { setup: { welcome: 'Welcome' } },
  },
})

assert.strictEqual(i18n.global.t('setup.welcome'), 'Welcome')
console.log('PASS: Vue I18n legacy global translation works')
