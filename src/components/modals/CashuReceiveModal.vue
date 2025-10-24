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

<style scoped src="../../styles/components/modals.css"></style>
