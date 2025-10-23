<template>
  <div class="wallet-view unprotected">
    <div class="balance-display unprotected-balance">
      <div class="balance-label">balance</div>
      <div class="balance-amount-large">
        {{ balance }} <span class="unit-btc">sats</span>
      </div>
    </div>

    <div class="desktop-content">
      <!-- Encrypt Section -->
      <div class="encrypt-section-new">
      <!-- From Section -->
      <div class="card-section">
        <div class="card-header-external">
          <span class="card-label-external">Encrypt</span>
          <span class="card-balance-external">Balance {{ balance }}</span>
        </div>
        <div class="input-card">
          <div class="card-input-row">
            <div class="currency-selector">
              <span class="currency-text">SATS</span>
            </div>
            <div class="input-group">
              <input 
                :value="encryptAmount" 
                @input="$emit('update:encryptAmount', $event.target.value ? Number($event.target.value) : null)"
                type="number" 
                placeholder="0"
                class="amount-input"
                :disabled="!balance || balance === '0'"
              />
              <button 
                @click="$emit('update:encryptAmount', parseInt(balance))" 
                class="max-btn"
                :disabled="!balance || balance === '0'"
              >
                MAX
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Swap Icon -->
      <div class="swap-icon-container">
        <div class="swap-icon-background"></div>
        <div class="swap-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5L12 19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M18 13L12 19L6 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <!-- To Section -->
      <div class="card-section">
        <div class="card-header-external">
          <span class="card-label-external">You receive</span>
        </div>
        <div class="input-card">
          <div class="card-input-row">
            <div class="currency-selector">
              <span class="currency-text">eSATS</span>
              <span class="info-icon">ⓘ</span>
            </div>
            <span class="output-amount">{{ encryptAmount || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Route Section -->
    <div class="route-section-new">
      <div class="route-label">Route (and fees)</div>
      <div class="route-selector">
        <div class="route-name-new">
          <span>{{ mintUrlShort }}</span>
        </div>
        <span class="route-fee">{{ estimatedFee }} sats</span>
      </div>
    </div>

    <!-- Encrypt Button -->
    <button 
      @click="$emit('encryptOrDeposit')" 
      class="encrypt-btn-new" 
      :disabled="encryptionInProgress || (parseInt(balance) > 0 && !canEncrypt)"
    >
      <span v-if="!encryptionInProgress && (!balance || balance === '0')">DEPOSIT FUNDS</span>
      <span v-else-if="!encryptionInProgress">ENCRYPT</span>
      <span v-else-if="encryptionStep === 'creating_invoice'">Creating invoice...</span>
      <span v-else-if="encryptionStep === 'paying_invoice'">Paying invoice...</span>
      <span v-else-if="encryptionStep === 'waiting_confirmation'">Confirming payment...</span>
      <span v-else-if="encryptionStep === 'minting'">Minting tokens...</span>
      <span v-else-if="encryptionStep === 'complete'">Complete!</span>
      <span v-else>Processing...</span>
    </button>

      <p class="warning-text-new">
        Your Arkade VTXOs are on Bitcoin L2. Encrypt them for enhanced privacy with Cashu ecash.
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  balance: {
    type: [String, Number],
    default: '0'
  },
  encryptAmount: {
    type: Number,
    default: null
  },
  mintUrlShort: {
    type: String,
    default: 'Cashu Mint'
  },
  estimatedFee: {
    type: String,
    default: '~3'
  },
  encryptionInProgress: {
    type: Boolean,
    default: false
  },
  encryptionStep: {
    type: String,
    default: ''
  },
  canEncrypt: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:encryptAmount', 'encryptOrDeposit'])
</script>

<style scoped>
/* Wallet Views */
.wallet-view {
  max-width: 550px;
  color: white;
}

/* Balance Display */
.balance-display {
  text-align: left;
  margin-bottom: 2.5rem;
  padding: 0;
}

.unprotected .balance-display {
  margin-bottom: 0.5rem;
}

.balance-label {
  font-size: 0.9rem;
  letter-spacing: 2px;
  opacity: 0.7;
  margin-bottom: 1rem;
  color: #00F2E1;
  text-transform: uppercase;
}

.unprotected-balance .balance-label {
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

.desktop-content {
  max-width: 100%;
}

.encrypt-section-new {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2.625rem;
}

.card-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-header-external {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.card-label-external {
  font-family: 'Satoshi', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  color: #FFFFFF;
  opacity: 0.8;
}

.card-balance-external {
  font-family: 'Satoshi', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: #616877;
  opacity: 0.8;
}

.input-card {
  background: rgba(45, 49, 60, 0.4);
  border-radius: 14px;
  padding: 1.5rem 1.75rem;
  box-shadow: inset 0px 2px 0px rgba(255, 255, 255, 0.06);
}

.card-input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.currency-selector {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.currency-text {
  color: white;
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.6;
}

.info-icon {
  font-size: 1rem;
  margin-left: 0.75rem;
  opacity: 0.6;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.amount-input {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: 0.44px;
  line-height: 1.6;
  text-align: right;
  width: 120px;
  outline: none;
}

.amount-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.amount-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Remove number input arrows */
.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.amount-input[type=number] {
  -moz-appearance: textfield;
}

.max-btn {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.max-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.max-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.output-amount {
  color: white;
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: 0.44px;
  line-height: 1.6;
}

.swap-icon-container {
  position: absolute;
  left: 50%;
  top: 57%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swap-icon-background {
  position: absolute;
  width: 7rem;
  height: 7rem;
  background: #171A21;
  border-radius: 50%;
  z-index: 1;
}

.swap-icon {
  position: relative;
  width: 5rem;
  height: 5rem;
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1b1e26;
  box-shadow: 0 4px 12px rgba(255, 217, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 2;
}

.swap-icon:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(255, 217, 0, 0.5);
}

.route-section-new {
  margin-bottom: 2.625rem;
}

.route-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.route-selector {
  background: rgba(45, 49, 60, 0.4);
  border-radius: 14px;
  padding: 1.6875rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.route-name-new {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: white;
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.6;
}

.route-fee {
  color: white;
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: 0.44px;
  line-height: 1.6;
}

.encrypt-btn-new {
  width: 100%;
  padding: 1.375rem 2.5rem;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 100%);
  color: #161920;
  font-size: 1.1875rem;
  font-weight: 700;
  letter-spacing: 1.9px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
}

.encrypt-btn-new:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 217, 0, 0.4);
}

.encrypt-btn-new:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.warning-text-new {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #586b79;
  text-align: center;
  opacity: 0.8;
  margin-bottom: 2rem;
}

/* Responsive */
@media (max-width: 900px) {
  .desktop-content {
    max-width: 100%;
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

  .unprotected-balance .balance-label {
    font-size: 1.2rem;
  }

  .swap-icon-background {
    width: 6rem;
    height: 6rem;
  }

  .swap-icon {
    width: 2.5rem;
    height: 2.5rem;
  }

  .amount-input {
    font-size: 1.1rem;
    width: 80px;
  }

  .max-btn {
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
  }

  .desktop-content {
    max-width: 100%;
  }
}
</style>

