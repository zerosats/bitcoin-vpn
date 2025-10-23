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
      </div>

      <!-- Action Buttons -->
      <div class="actions-section">
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

    <p class="info-text-encrypted">
      {{ balance > 0 
        ? 'Encrypted bitcoin is currently in the shielded pool. It is gaining a stronger anonymity set as time passes.' 
        : 'No encrypted balance. Switch to ARKADE to encrypt some funds.' }}
    </p>
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

<style scoped>
/* Wallet Views */
.wallet-view {
  max-width: 800px;
  color: white;
}

/* Balance Display */
.balance-display {
  text-align: left;
  margin-bottom: 2.5rem;
  padding: 0;
}

.balance-label {
  font-size: 0.9rem;
  letter-spacing: 2px;
  opacity: 0.7;
  margin-bottom: 1rem;
  color: #00F2E1;
  text-transform: uppercase;
}

.encrypted-balance {
  margin-bottom: 2rem;
}

.encrypted-balance .balance-label {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.4;
  text-transform: uppercase;
  color: #00F2E1 !important;
  opacity: 1 !important;
  margin-bottom: 0.5rem;
}

.balance-amount-large {
  font-size: 4.5rem;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 1.25px;
  text-transform: uppercase;
  background: linear-gradient(180deg, #ff4b2b 0%, #00f2e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.unit-btc {
  font-size: 1.25rem;
  letter-spacing: 0.3px;
  margin-left: -0.5rem;
  background: linear-gradient(180deg, #ff4b2b 0%, #00f2e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Encrypted gradient override */
.encrypted-balance .balance-amount-large.encrypted-gradient {
  background: linear-gradient(180deg, #FFD900 0%, #00F2E1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.encrypted-balance .unit-btc.encrypted-gradient {
  background: linear-gradient(180deg, #FFD900 0%, #00F2E1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* New Time at Rest */
.time-at-rest-new {
  margin-bottom: 2rem;
}

.time-progress-card {
  background: rgba(45, 49, 60, 0.4);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
  padding: 1rem 1.25rem;
  position: relative;
  opacity: 1;
  visibility: visible;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.time-progress-card.dismissed {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.2s ease;
  z-index: 1;
}

.close-button:hover {
  color: rgba(255, 255, 255, 0.9);
}

.privacy-info-content {
  text-align: left;
  padding-right: 2rem;
}

.privacy-header {
  color: rgba(255, 255, 255, 0.95);
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.privacy-body {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
  font-weight: 400;
  margin: 0;
  line-height: 1.5;
}

/* Desktop Layout */
.desktop-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  align-items: start;
}

.balance-section {
  display: flex;
  flex-direction: column;
}

.actions-section {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

/* New Action Buttons */
.action-buttons-new {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
}

.action-btn-gradient {
  height: 120px;
  border: none;
  border-radius: 14px;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.6592px;
  line-height: 0.9;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 100%);
  color: #161920;
  box-shadow: inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.action-btn-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 217, 0, 0.4), inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.info-text-encrypted {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #586b79;
  text-align: center;
  opacity: 0.8;
  margin-bottom: 2rem;
}

/* Responsive */
@media (max-width: 768px) {
  .desktop-layout {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .actions-section {
    padding-top: 0;
  }

  .action-buttons-new {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .action-btn-gradient {
    height: 100px;
    font-size: 1.1rem;
  }
}

@media (max-width: 600px) {
  .wallet-view {
    max-width: 100%;
  }

  .balance-amount-large {
    font-size: 3.5rem;
  }

  .unit-btc {
    font-size: 1rem;
  }

  .encrypted-balance .balance-label {
    font-size: 1.2rem;
  }

  .action-buttons-new {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .action-btn-gradient {
    height: 100px;
    font-size: 1.1rem;
  }

  .days-text {
    font-size: 1.1rem;
  }

  .desktop-layout {
    gap: 1.5rem;
  }
}
</style>

