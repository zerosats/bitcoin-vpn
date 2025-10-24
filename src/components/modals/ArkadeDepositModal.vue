<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>🏛️ Deposit to Arkade Wallet</h3>
      <p class="modal-info">Choose your deposit method</p>
      
      <div v-if="!isInitialized" class="warning-box">
        <p>⚠️ Arkade wallet is not initialized.</p>
        <p v-if="initializationError" class="error-detail">
          {{ initializationError }}
        </p>
      </div>

      <!-- Back Button (shown when deposit address is displayed) -->
      <div v-else-if="depositAddress" class="back-button-container">
        <button @click="handleBack" class="back-btn">
          ← Back to options
        </button>
      </div>

      <!-- Deposit Options (shown when no address is displayed) -->
      <div v-else-if="!depositAddress && !showLightning" class="deposit-options">
        <button @click="$emit('getArkAddress')" class="modal-btn primary" :disabled="loading">
          {{ loading ? 'Getting...' : 'Get Ark Address' }}
        </button>
        <button @click="$emit('getArkOffchainAddress')" class="modal-btn primary" :disabled="loading">
          {{ loading ? 'Getting...' : 'Get Bitcoin Deposit Address' }}
        </button>
        <button @click="$emit('onboardBitcoin')" class="modal-btn secondary" :disabled="loading">
          {{ loading ? 'Onboarding...' : '🚀 Onboard Confirmed Bitcoin' }}
        </button>
        <button @click="showLightning = true" class="modal-btn primary">
          Create Lightning Invoice
        </button>
      </div>

      <!-- Lightning Deposit Section -->
      <div v-if="showLightning && !depositAddress" class="lightning-deposit">
        <h4>Lightning Deposit via Ark (Boltz Swaps)</h4>
        <input 
          v-model.number="lightningAmount" 
          type="number" 
          placeholder="Amount (sats)"
          class="modal-input"
        />
        <input 
          v-model="lightningMemo" 
          type="text" 
          placeholder="Description (optional)"
          class="modal-input"
        />
        <button 
          @click="handleCreateLightningInvoice" 
          class="modal-btn primary"
          :disabled="!lightningAmount || loading"
        >
          {{ loading ? 'Creating...' : 'Create Invoice' }}
        </button>
      </div>

      <div v-if="depositAddress" class="address-display">
        <p class="label">{{ depositAddressType }}:</p>
        
        <!-- QR Code for Lightning Invoice -->
        <div v-if="qrCodeData && depositAddressType.includes('Lightning')" class="qr-code-container">
          <img :src="qrCodeData" alt="Lightning Invoice QR Code" class="qr-code-image">
          <p class="qr-hint">📱 Scan to pay with Lightning</p>
        </div>
        
        <div class="address-box" @click="$emit('copy', depositAddress)">
          {{ depositAddress }}
        </div>
        <button @click="$emit('copy', depositAddress)" class="modal-btn secondary">
          📋 Copy
        </button>
      </div>
      
      <button @click="handleClose" class="modal-btn secondary">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  isInitialized: {
    type: Boolean,
    default: false
  },
  initializationError: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  depositAddress: {
    type: String,
    default: ''
  },
  depositAddressType: {
    type: String,
    default: ''
  },
  qrCodeData: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'getArkAddress', 'getArkOffchainAddress', 'createLightningInvoice', 'copy', 'back'])

const showLightning = ref(false)
const lightningAmount = ref(null)
const lightningMemo = ref('')

// Reset state when modal is closed
watch(() => props.show, (newVal) => {
  if (!newVal) {
    showLightning.value = false
    lightningAmount.value = null
    lightningMemo.value = ''
  }
})

const handleCreateLightningInvoice = () => {
  emit('createLightningInvoice', {
    amount: lightningAmount.value,
    memo: lightningMemo.value
  })
}

const handleBack = () => {
  // Emit event to clear the deposit address in parent
  emit('back')
}

const handleClose = () => {
  emit('close')
}
</script>

<style scoped src="../../styles/components/modals.css"></style>
