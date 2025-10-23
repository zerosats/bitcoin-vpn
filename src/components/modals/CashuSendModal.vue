<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>Send from Cashu Wallet</h3>
      
      <!-- Back Button (shown when token is displayed) -->
      <div v-if="token" class="back-button-container">
        <button @click="handleBack" class="back-btn">
          ← Back to options
        </button>
      </div>

      <!-- Send Mode Tabs -->
      <div v-if="!token" class="send-mode-tabs">
        <button 
          @click="mode = 'ecash'" 
          :class="{ active: mode === 'ecash' }"
          class="mode-tab-btn"
        >
          💰 Ecash Token
        </button>
        <button 
          @click="mode = 'lightning'" 
          :class="{ active: mode === 'lightning' }"
          class="mode-tab-btn"
        >
          ⚡ Lightning Invoice
        </button>
      </div>
      
      <!-- Ecash Send Mode -->
      <div v-if="mode === 'ecash'" class="send-mode-content">
        <div v-if="!token">
          <p class="modal-info">Create an ecash token to send</p>
          <input 
            v-model.number="amount" 
            type="number" 
            placeholder="Amount (sats)"
            class="modal-input"
          />
          <button 
            @click="handleSend" 
            class="modal-btn primary"
            :disabled="!amount || sending"
          >
            {{ sending ? 'Creating...' : 'Create Token' }}
          </button>
        </div>
        
        <div v-if="token" class="token-output">
          <p class="success">✅ Token created!</p>
          
          <!-- QR Code Display -->
          <div class="qr-code-container">
            <canvas id="ecash-token-qr" class="qr-code-canvas"></canvas>
          </div>
          
          <textarea 
            :value="token" 
            readonly 
            class="token-text"
            @click="$emit('copy', token)"
          ></textarea>
          <button @click="$emit('copy', token)" class="modal-btn secondary">
            Copy Token
          </button>
        </div>
      </div>
      
      <!-- Lightning Send Mode -->
      <div v-if="mode === 'lightning'" class="send-mode-content">
        <p class="modal-info">Paste or scan a Lightning invoice to pay</p>
        
        <!-- QR Scanner -->
        <div v-if="showScanner" class="scanner-container">
          <div id="lightning-qr-scanner" class="qr-scanner"></div>
          <p v-if="scannerError" class="scanner-error">{{ scannerError }}</p>
          <button @click="stopScanner" class="modal-btn secondary">
            Stop Scanner
          </button>
        </div>
        
        <!-- Input and buttons -->
        <div v-else>
          <textarea 
            v-model="lightningInvoice" 
            placeholder="Paste Lightning invoice (lnbc...)"
            class="modal-input textarea"
          ></textarea>
          <div class="button-group">
            <button 
              @click="startScanner" 
              class="modal-btn secondary"
              :disabled="sending"
            >
              📷 Scan QR Code
            </button>
            <button 
              @click="handlePayLightning" 
              class="modal-btn primary"
              :disabled="!lightningInvoice || sending"
            >
              {{ sending ? 'Paying...' : 'Pay Invoice' }}
            </button>
          </div>
          
          <div v-if="paymentSuccess" class="token-output">
            <p class="success">✅ Invoice paid successfully!</p>
            <div class="payment-details">
              <p><strong>Amount:</strong> {{ paymentAmount }} sats</p>
              <p><strong>Fee:</strong> {{ paymentFee }} sats</p>
            </div>
          </div>
        </div>
      </div>
      
      <button @click="$emit('close')" class="modal-btn secondary">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQRScanner } from '../../composables/useQRScanner'
import { useQRCode } from '../../composables/useQRCode'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  sending: {
    type: Boolean,
    default: false
  },
  token: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'send', 'payLightning', 'copy', 'back'])

const mode = ref('ecash')
const amount = ref(null)
const lightningInvoice = ref('')
const paymentSuccess = ref(false)
const paymentAmount = ref(0)
const paymentFee = ref(0)
const showScanner = ref(false)
const scannerError = ref(null)

// QR Scanner
const { isScanning, error: qrError, startScanning, stopScanning: stopQRScanning } = useQRScanner()

// QR Code generation
const { generateQR } = useQRCode()

// Generate QR code when token is created
watch(() => props.token, async (newToken) => {
  if (newToken) {
    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 100))
    await generateQR(newToken, 'ecash-token-qr', { width: 280 })
  }
})

const startScanner = async () => {
  showScanner.value = true
  scannerError.value = null
  
  // Wait for DOM to update
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const success = await startScanning(
    'lightning-qr-scanner',
    (decodedText) => {
      // Successfully scanned!
      let invoiceText = decodedText
      
      // Clean up lightning: prefix if present
      if (invoiceText.toLowerCase().startsWith('lightning:')) {
        invoiceText = invoiceText.substring(10) // Remove "lightning:" prefix
      }
      
      // Normalize to lowercase for invoice
      lightningInvoice.value = invoiceText.toLowerCase()
      showScanner.value = false
      
      // DON'T auto-pay - let user review and confirm manually
      console.log('Lightning invoice scanned, ready for user confirmation')
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
    amount.value = null
    lightningInvoice.value = ''
    paymentSuccess.value = false
    paymentAmount.value = 0
    paymentFee.value = 0
    mode.value = 'ecash'
    if (showScanner.value) {
      stopScanner()
    }
  }
})

const handleSend = () => {
  emit('send', amount.value)
}

const handlePayLightning = () => {
  emit('payLightning', lightningInvoice.value, (result) => {
    // Callback to show success
    paymentSuccess.value = true
    paymentAmount.value = result.amount
    paymentFee.value = result.fee
    lightningInvoice.value = ''
  })
}

const handleBack = () => {
  if (showScanner.value) {
    stopScanner()
  }
  emit('back')
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

.send-mode-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.mode-tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tab-btn.active {
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 75%, #FFD900 100%);
  color: #161920;
  border-color: transparent;
}

.mode-tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.send-mode-content {
  margin-bottom: 1rem;
}

.modal-info {
  opacity: 0.7;
  font-size: 0.9rem;
  margin-bottom: 1rem;
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

.modal-input.textarea {
  min-height: 100px;
  font-family: monospace;
  font-size: 0.85rem;
  resize: vertical;
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

.token-output {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.token-output .success {
  color: #a8ff78;
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 600;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.qr-code-canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.token-text {
  width: 100%;
  min-height: 80px;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-family: monospace;
  font-size: 0.85rem;
  resize: vertical;
  margin-bottom: 0.75rem;
  cursor: pointer;
}

.payment-details {
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
}

.payment-details p {
  margin: 0.5rem 0;
  color: white;
  font-size: 0.9rem;
}

.payment-details strong {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
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

