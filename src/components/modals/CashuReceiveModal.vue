<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>Receive to Cashu Wallet</h3>
      
      <!-- Back Button (shown when invoice is displayed) -->
      <div v-if="invoice" class="back-button-container">
        <button @click="handleBack" class="back-btn">
          ← Back to options
        </button>
      </div>

      <!-- Receive Mode Tabs -->
      <div v-if="!invoice" class="receive-mode-tabs">
        <button 
          @click="mode = 'ecash'" 
          :class="{ active: mode === 'ecash' }"
          class="mode-tab-btn"
        >
          Ecash Token
        </button>
        <button 
          @click="mode = 'lightning'" 
          :class="{ active: mode === 'lightning' }"
          class="mode-tab-btn"
        >
          Lightning
        </button>
      </div>
      
      <!-- Ecash Receive Mode -->
      <div v-if="mode === 'ecash'" class="receive-mode-content">
        <p class="modal-info">Paste or scan a Cashu token to receive</p>
        
        <!-- QR Scanner -->
        <div v-if="showScanner" class="scanner-container">
          <div id="cashu-qr-scanner" class="qr-scanner"></div>
          <p v-if="scannerError" class="scanner-error">{{ scannerError }}</p>
          <button @click="stopScanner" class="modal-btn secondary">
            Stop Scanner
          </button>
        </div>
        
        <!-- Input and buttons -->
        <div v-else>
          <textarea 
            v-model="ecashToken" 
            placeholder="Paste Cashu token here (starts with cashuA...)"
            class="modal-input textarea"
          ></textarea>
          <div class="button-group">
            <button 
              @click="startScanner" 
              class="modal-btn secondary"
              :disabled="receiving"
            >
              📷 Scan QR Code
            </button>
            <button 
              @click="handleReceiveEcash" 
              class="modal-btn primary"
              :disabled="!ecashToken || receiving"
            >
              {{ receiving ? 'Receiving...' : 'Receive Token' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Lightning Receive Mode -->
      <div v-if="mode === 'lightning'" class="receive-mode-content">
        <div v-if="!invoice">
          <p class="modal-info">Create an invoice to receive Lightning payment</p>
          <input 
            v-model.number="lightningAmount" 
            type="number" 
            placeholder="Amount (sats)"
            class="modal-input"
          />
          <button 
            @click="handleCreateInvoice" 
            class="modal-btn primary"
            :disabled="!lightningAmount || creatingInvoice"
          >
            {{ creatingInvoice ? 'Creating Invoice...' : 'Create Invoice' }}
          </button>
        </div>
        
        <div v-if="invoice" class="invoice-display">
          <p class="success-text">Invoice created! Share to receive payment</p>
          <div class="qr-container-modal">
            <canvas :id="qrCanvasId"></canvas>
          </div>
          <textarea 
            :value="invoice" 
            readonly 
            class="modal-input textarea invoice-text"
            @click="$emit('copy', invoice)"
          ></textarea>
          <button @click="$emit('copy', invoice)" class="modal-btn secondary">
            Copy Invoice
          </button>
          <p class="info-text">Monitoring for payment of {{ lightningAmount }} sats...</p>
        </div>
      </div>
      
      <button @click="handleClose" class="modal-btn secondary">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQRScanner } from '../../composables/useQRScanner'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  receiving: {
    type: Boolean,
    default: false
  },
  creatingInvoice: {
    type: Boolean,
    default: false
  },
  invoice: {
    type: String,
    default: ''
  },
  qrCanvasId: {
    type: String,
    default: 'cashu-receive-invoice-qr'
  }
})

const emit = defineEmits(['close', 'receiveEcash', 'createInvoice', 'copy', 'back'])

const mode = ref('ecash')
const ecashToken = ref('')
const lightningAmount = ref(null)
const showScanner = ref(false)
const scannerError = ref(null)

// QR Scanner
const { isScanning, error: qrError, startScanning, stopScanning: stopQRScanning } = useQRScanner()

const startScanner = async () => {
  showScanner.value = true
  scannerError.value = null
  
  // Wait for DOM to update
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const success = await startScanning(
    'cashu-qr-scanner',
    (decodedText) => {
      // Successfully scanned!
      console.log('QR Code scanned:', decodedText.substring(0, 50) + '...')
      
      // ✅ Validate it's a Cashu token
      let tokenText = decodedText.trim()
      
      // Handle cashu: URI prefix
      if (tokenText.toLowerCase().startsWith('cashu:')) {
        tokenText = tokenText.substring(6) // Remove "cashu:" prefix
      }
      
      // Check if it's a valid Cashu token format
      if (!tokenText.startsWith('cashuA') && !tokenText.startsWith('cashuB')) {
        scannerError.value = '❌ Invalid Cashu token format. Token should start with "cashuA" or "cashuB".'
        console.error('Invalid token format:', tokenText.substring(0, 50))
        // Don't close scanner, let them try again
        return
      }
      
      // Valid token!
      ecashToken.value = tokenText
      showScanner.value = false
      
      // DON'T auto-submit - let user review and confirm manually
      // This prevents accidental double-redemptions and lets user verify the token
      console.log('✅ Valid Cashu token scanned, ready for user confirmation')
    }
  )
  
  if (!success && qrError.value) {
    scannerError.value = qrError.value
  }
}

const stopScanner = async () => {
  await stopQRScanning()
  showScanner.value = false
  scannerError.value = null
}

// Reset state when modal is closed
watch(() => props.show, (newVal) => {
  if (!newVal) {
    mode.value = 'ecash'
    ecashToken.value = ''
    lightningAmount.value = null
    if (showScanner.value) {
      stopScanner()
    }
  }
})

const handleReceiveEcash = () => {
  emit('receiveEcash', ecashToken.value)
}

const handleCreateInvoice = () => {
  emit('createInvoice', lightningAmount.value)
}

const handleBack = () => {
  if (showScanner.value) {
    stopScanner()
  }
  emit('back')
}

const handleClose = () => {
  if (showScanner.value) {
    stopScanner()
  }
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

.modal-info {
  opacity: 0.7;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  color: white;
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

.receive-mode-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.mode-tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-tab-btn.active {
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 75%, #FFD900 100%);
  color: #161920;
}

.mode-tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.15);
}

.receive-mode-content {
  margin-top: 1rem;
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

.modal-input.textarea {
  min-height: 100px;
  font-family: monospace;
  resize: vertical;
}

.modal-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.invoice-text {
  cursor: pointer;
  font-size: 0.85rem;
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

.invoice-display {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.qr-container-modal {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  margin: 1rem 0;
}

.qr-container-modal canvas {
  display: block;
  border-radius: 8px;
}

.success-text {
  color: #66bb6a;
  margin-bottom: 1rem;
  font-weight: 600;
}

.info-text {
  color: #4fc3f7;
  margin-top: 1rem;
  font-size: 0.9rem;
  opacity: 0.9;
}

.button-group {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.button-group .modal-btn {
  margin-bottom: 0;
}

.scanner-container {
  margin-bottom: 1rem;
}

.qr-scanner {
  width: 100%;
  max-width: 400px;
  margin: 0 auto 1rem;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.scanner-error {
  color: #ff6b6b;
  font-size: 0.85rem;
  text-align: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
}
</style>

