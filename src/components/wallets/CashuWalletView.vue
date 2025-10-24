<template>
  <div class="wallet-view encrypted">
    <!-- Desktop Layout: Balance on left, Actions on right -->
    <div class="desktop-layout">
      <div class="balance-section">
        <div class="balance-display encrypted-balance">
          <div class="balance-label">balance</div>
          <div class="balance-amount-large encrypted-gradient">
            {{ balance }} <span class="unit-btc encrypted-gradient">sats</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions-section">
        <!-- Privacy Information -->
        <div class="time-at-rest-new">
          <div class="time-progress-card" :class="{ 'dismissed': privacyMessageDismissed }">
            <button @click="dismissPrivacyMessage" class="close-button" aria-label="Dismiss message">
              ✕
            </button>
            <div class="privacy-info-content">
              <h3 class="privacy-header">{{ balance > 0 ? 'Funds are encrypted' : 'Encrypt funds' }}</h3>
              <p class="privacy-body">
                {{ balance > 0 
                  ? 'Spend your funds from this balance for improved privacy' 
                  : 'Encrypt funds from your public balance for spending' }}
              </p>
            </div>
          </div>
        </div>

        <div class="action-buttons-new">
          <button @click="$emit('send')" class="action-btn-gradient">
            SEND ↗
          </button>
          <button @click="$emit('receive')" class="action-btn-gradient">
            RECEIVE ↙
          </button>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  balance: {
    type: [String, Number],
    default: '0'
  }
})

defineEmits(['send', 'receive'])

// Privacy message dismissal (session-only, reappears on reload)
const privacyMessageDismissed = ref(false)

const dismissPrivacyMessage = () => {
  privacyMessageDismissed.value = true
}
</script>

<style scoped src="../../styles/components/cashu-wallet-view.css"></style>

