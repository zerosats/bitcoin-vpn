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

<style scoped src="../../styles/components/arkade-wallet-view.css"></style>

