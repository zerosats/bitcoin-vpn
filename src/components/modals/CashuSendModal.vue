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

<style scoped src="../../styles/components/modals.css"></style>
