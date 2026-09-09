<template>
  <q-dialog v-model="showBanner">
    <q-card>
      <q-card-section>
        <div class="text-h6">Welcome to Finney</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <p>
          Finney is an experimental eCash cryptomessenger derived from Stamp.
          This alpha preserves recipient-spendable message stamps while the XEC
          and privacy transport migration is validated.
        </p>
        <p>
          Do not use this alpha with funds or messages you cannot afford to
          lose. The relay and compatibility layers are still under active
          migration and review.
        </p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn dense label="Dismiss" v-close-popup color="secondary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia'
import { useAppearanceStore } from 'src/stores/appearance'
import { computed, defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const appearanceStore = useAppearanceStore()
    const { lastDismissed } = storeToRefs(appearanceStore)
    const showBanner = computed({
      get() {
        // Show every ten days during alpha development.
        return lastDismissed.value <= Date.now() - 1000 * 60 * 60 * 24 * 10
      },
      set() {
        lastDismissed.value = Date.now()
      },
    })
    return { showBanner }
  },
})
</script>
