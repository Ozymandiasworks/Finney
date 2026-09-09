<template>
  <q-btn
    v-show="false"
    @click="promptNotificationPermission"
    ref="buttonNotification"
  />
  <q-dialog v-model="contactBookOpen">
    <contact-book-dialog :contact-click="contactClicked" />
  </q-dialog>

  <router-view @setupCompleted="setupConnections" />
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { QBtn } from 'quasar'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { defaultContacts, registrys, networkName } from 'src/utils/constants'
import { RegistryHandler } from 'src/cashweb/registry'
import { errorNotify } from 'src/utils/notifications'
import { useRelayClientStore } from 'src/stores/relay-client'
import { useAppearanceStore } from 'src/stores/appearance'
import { useProfileStore } from 'src/stores/my-profile'
import { useContactStore } from 'src/stores/contacts'
import { useChatStore } from 'src/stores/chats'
import { openChat } from 'src/utils/routes'

import ContactBookDialog from 'src/components/dialogs/ContactBookDialog.vue'
import { useWallet } from './utils/clients'

export default defineComponent({
  components: {
    ContactBookDialog,
  },
  setup() {
    // Setup chats, contacts, etc.
    const chatStore = useChatStore()
    const relayClient = useRelayClientStore()
    const contacts = useContactStore()
    const appearanceStore = useAppearanceStore()
    const { darkMode } = storeToRefs(appearanceStore)
    const myProfile = useProfileStore()

    const {
      getLastReceived: lastReceived,
      totalUnread,
      activeChatAddr,
    } = storeToRefs(chatStore)

    const router = useRouter()

    watch(activeChatAddr, newAddress => {
      // Only route to chat if address defined
      // e.g. do *not* route when navigating to Forum
      if (!newAddress) {
        return
      }
      openChat(router, newAddress)
    })

    const contactClicked = (newAddress: string) => {
      openChat(router, newAddress)
    }
    const contactBookOpen = ref(false)

    return {
      addDefaultContact: contacts.addDefaultContact,
      refreshContacts: contacts.refreshContacts,
      // FIXME: Some kind of race condition here where if this is computed,
      // it won't be set yet by the time the setupConnections function is called
      // after signing up or logging in.
      relayToken: () => relayClient.token,
      contactClicked,
      darkMode,
      lastReceived,
      totalUnread,
      getRelayData: myProfile,
      buttonNotification: ref<QBtn | null>(null),
      shortcutKeyListener(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          contactBookOpen.value = !contactBookOpen.value
        }
      },
      contactBookOpen,
    }
  },
  data() {
    return {
      connectionsStarted: false,
      notificationPermission:
        typeof Notification !== 'undefined' ? Notification.permission : null,
    }
  },
  methods: {
    promptNotificationPermission() {
      if (typeof Notification === 'undefined') {
        return
      }
      try {
        Notification.requestPermission().then(
          () => (this.notificationPermission = Notification.permission),
        )
      } catch (error) {
        // Safari doesn't return a promise for requestPermissions and it
        // throws a TypeError. It takes a callback as the first argument
        // instead.
        if (error instanceof TypeError) {
          Notification.requestPermission(() => {
            this.notificationPermission = Notification.permission
          })
        } else {
          throw error
        }
      }
    },
    setupConnections() {
      // A relay token is not sufficient to consider Finney configured. The
      // localhost development relay can provide a token before a new wallet
      // identity exists, so never start messaging until the identity address
      // has actually been generated/restored.
      const wallet = useWallet()
      const myAddress = wallet.myAddress
      if (!myAddress || !wallet.identityPrivKey) {
        this.$status.setup = false
        this.$status.loaded = false
        this.$q.loading.hide()
        return
      }

      if (!this.relayToken()) {
        return
      }
      if (this.connectionsStarted) {
        return
      }
      this.connectionsStarted = true
      this.$status.setup = true

      console.log('Loading')
      // Setup everything at once. These are independent processes.
      try {
        this.$relayClient.setUpWebsocket(myAddress)
      } catch (err) {
        console.error(err)
      }

      // Add default contacts
      for (const defaultContact of defaultContacts) {
        this.addDefaultContact(defaultContact)
      }
      this.$nextTick(() =>
        this.refreshContacts().catch(err => console.error(err)),
      )

      // Message history is a relay operation. Do not gate the whole GUI on
      // Chronik's WebSocket connection: Tor can delay that socket even while
      // the local relay and Chronik HTTP API are otherwise usable.
      const t0 = performance.now()
      let messageLoadAttempts = 0
      const refreshMessages = () => {
        messageLoadAttempts += 1
        const loadingMessage =
          messageLoadAttempts === 1
            ? 'Loading messages'
            : 'Connecting to local relay…'
        this.$q.loading.show({ message: loadingMessage })
        this.$relayClient
          .refresh()
          .then(() => {
            const t1 = performance.now()
            console.log(`Loading messages took ${t1 - t0}ms`)
            this.$status.loaded = true
            this.$q.loading.hide()
          })
          .catch(err => {
            console.error('Unable to load messages from relay', err)
            if (messageLoadAttempts < 10) {
              setTimeout(refreshMessages, 500)
              return
            }
            this.$q.loading.hide()
            errorNotify(
              new Error(
                'Unable to load messages from the local Finney relay. Check the local-services window.',
              ),
            )
          })
      }
      refreshMessages()

      const handler = new RegistryHandler({
        wallet: wallet,
        registrys: registrys,
        networkName,
      })
      // Update registry data if it doesn't exist.
      handler.getRelayUrl(myAddress.toCashAddress()).catch(() => {
        if (!wallet.identityPrivKey) {
          return
        }
        handler.updateKeyMetadata(this.$relayClient.url, wallet.identityPrivKey)
      })

      // Update profile if it doesn't exist.
      this.$relayClient.getRelayData(myAddress).catch(() => {
        if (!wallet.identityPrivKey) {
          return
        }
        const relayData = this.getRelayData

        this.$relayClient
          .updateProfile(
            wallet.identityPrivKey,
            relayData.profile,
            relayData.inbox.acceptancePrice,
          )
          .catch(err => {
            console.error(err)
            // TODO: Move specialization down error displayer
            if (err.response.status === 413) {
              errorNotify(new Error(this.$t('profileDialog.avatarTooLarge')))
              this.$q.loading.hide()
              throw err
            }
            errorNotify(new Error(this.$t('profileDialog.unableContactRelay')))
            throw err
          })
      })
    },
  },
  created() {
    this.$q.dark.set(this.darkMode)
    this.setupConnections()
  },
  updated() {
    // Ask browser for notification permissions after any DOM update
    switch (this.notificationPermission) {
      case 'denied':
      case 'granted':
        break
      default:
        this.buttonNotification?.click()
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.shortcutKeyListener)
  },
  mounted() {
    document.addEventListener('keydown', this.shortcutKeyListener)
  },
})
</script>
