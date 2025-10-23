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

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: #171A21;
  padding: 2rem;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-bottom: 1rem;
  color: white;
}

.modal-content h4 {
  margin-bottom: 1rem;
  color: white;
}

.modal-info {
  opacity: 0.7;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  color: white;
}

.warning-box {
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  color: #ffc107;
  font-size: 0.9rem;
}

.warning-box p {
  margin-bottom: 0.5rem;
}

.warning-box .error-detail {
  font-size: 0.85rem;
  opacity: 0.9;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  border-radius: 4px;
  margin: 0.5rem 0;
}

.back-button-container {
  margin-bottom: 1.5rem;
}

.back-btn {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(-2px);
}

.deposit-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.lightning-deposit {
  background: rgba(79, 195, 247, 0.1);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.address-display {
  background: rgba(79, 195, 247, 0.1);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.address-display .label {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-bottom: 0.5rem;
  color: white;
}

.qr-code-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
}

.qr-code-image {
  width: 100px;
  height: 100px;
  margin-bottom: 0.5rem;
}

.qr-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
}

.address-box {
  font-family: monospace;
  font-size: 0.85rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  word-break: break-all;
  cursor: pointer;
  margin-bottom: 0.75rem;
  color: white;
}

.modal-input {
  width: 100%;
  padding: 1rem;
  margin-bottom: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 1rem;
}

.modal-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.modal-btn {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 0.75rem;
  box-shadow: inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.modal-btn.primary {
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 75%, #FFD900 100%);
  color: #161920;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 217, 0, 0.4), inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.modal-btn.secondary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

