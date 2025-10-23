<template>
  <div class="cashu-wallet">
    <div class="wallet-container">
      <!-- Header -->
      <div class="wallet-header">
        <h1>🔒 Cashu Wallet</h1>
        <p class="subtitle">Privacy-First Ecash</p>
      </div>

      <!-- Initialization -->
      <div v-if="!isInitialized" class="init-section">
        <div class="card">
          <h2>Initialize Wallet</h2>
          <input 
            v-model="customMintUrl" 
            type="text" 
            placeholder="Mint URL (optional)"
            class="input"
          />
          <button @click="handleInitialize" class="btn primary" :disabled="initializing">
            {{ initializing ? 'Initializing...' : 'Initialize Wallet' }}
          </button>
        </div>
      </div>

      <!-- Main Wallet -->
      <div v-else class="wallet-main">
        <!-- Balance Card -->
        <div class="balance-card">
          <div class="balance-label">Balance</div>
          <div class="balance-amount">{{ balance }} sats</div>
          <div class="mint-info">{{ mintUrl }}</div>
        </div>

        <!-- Actions -->
        <div class="actions-grid">
          <!-- Mint -->
          <div class="card action-card">
            <h3>💰 Mint Tokens</h3>
            <input 
              v-model.number="mintAmount" 
              type="number" 
              placeholder="Amount (sats)"
              class="input"
            />
            <button 
              @click="handleMint" 
              class="btn primary"
              :disabled="!mintAmount || minting"
            >
              {{ minting ? 'Processing...' : 'Request Mint' }}
            </button>
            <div v-if="pendingQuote" class="pending-mint">
              <p class="info-text">⏳ Scan QR or pay invoice to mint tokens</p>
              <div class="qr-container">
                <canvas id="invoice-qr"></canvas>
              </div>
              <textarea 
                :value="pendingQuote.request || pendingQuote.payment_request || pendingQuote.pr" 
                readonly 
                class="invoice-text"
                @click="copyToClipboard(pendingQuote.request || pendingQuote.payment_request || pendingQuote.pr)"
              ></textarea>
              <button @click="copyToClipboard(pendingQuote.request || pendingQuote.payment_request || pendingQuote.pr)" class="btn secondary">
                📋 Copy Invoice
              </button>
              <button @click="checkQuote" class="btn secondary">
                🔄 Check Status
              </button>
            </div>
          </div>

          <!-- Send -->
          <div class="card action-card">
            <h3>📤 Send</h3>
            
            <!-- Send Mode Tabs -->
            <div class="send-tabs">
              <button 
                @click="sendMode = 'ecash'" 
                :class="{ active: sendMode === 'ecash' }"
                class="tab-btn"
              >
                💰 Ecash Token
              </button>
              <button 
                @click="sendMode = 'lightning'" 
                :class="{ active: sendMode === 'lightning' }"
                class="tab-btn"
              >
                ⚡ Lightning Invoice
              </button>
            </div>
            
            <!-- Ecash Send Mode -->
            <div v-if="sendMode === 'ecash'" class="send-mode">
              <p class="info-text">Send a Cashu token to someone</p>
              <input 
                v-model.number="sendAmount" 
                type="number" 
                placeholder="Amount (sats)"
                class="input"
              />
              <button 
                @click="handleSend" 
                class="btn primary"
                :disabled="!sendAmount || sendAmount > balance || sending"
              >
                {{ sending ? 'Creating Token...' : 'Create Token' }}
              </button>
              <div v-if="sendToken" class="token-output">
                <p class="success-text">✅ Token created! Scan or share</p>
                <div class="qr-container">
                  <canvas id="token-qr"></canvas>
                </div>
                <textarea 
                  :value="sendToken" 
                  readonly 
                  class="token-text"
                  @click="copyToClipboard(sendToken)"
                ></textarea>
                <button @click="copyToClipboard(sendToken)" class="btn secondary">
                  Copy Token
                </button>
              </div>
            </div>
            
            <!-- Lightning Send Mode -->
            <div v-if="sendMode === 'lightning'" class="send-mode">
              <p class="info-text">Pay a Lightning invoice with your tokens</p>
              <textarea 
                v-model="lightningInvoice" 
                placeholder="Paste Lightning invoice (starts with lnbc...)"
                class="input textarea"
              ></textarea>
              <button 
                @click="handlePayInvoice" 
                class="btn primary"
                :disabled="!lightningInvoice || sending"
              >
                {{ sending ? 'Processing...' : 'Pay Invoice' }}
              </button>
              <div v-if="invoiceInfo" class="invoice-info">
                <p class="info-text">Invoice Amount: {{ invoiceInfo.amount }} sats</p>
              </div>
            </div>
          </div>

          <!-- Receive -->
          <div class="card action-card">
            <h3>📥 Receive</h3>
            
            <!-- Receive Mode Tabs -->
            <div class="receive-tabs">
              <button 
                @click="receiveMode = 'ecash'" 
                :class="{ active: receiveMode === 'ecash' }"
                class="tab-btn"
              >
                💰 Ecash Token
              </button>
              <button 
                @click="receiveMode = 'lightning'" 
                :class="{ active: receiveMode === 'lightning' }"
                class="tab-btn"
              >
                ⚡ Lightning Payment
              </button>
            </div>
            
            <!-- Ecash Receive Mode -->
            <div v-if="receiveMode === 'ecash'" class="receive-mode">
              <p class="info-text">Receive a Cashu token from someone</p>
              <textarea 
                v-model="receiveToken" 
                placeholder="Paste Cashu token here (starts with cashuA...)"
                class="input textarea"
              ></textarea>
              <button 
                @click="handleReceive" 
                class="btn primary"
                :disabled="!receiveToken || receiving"
              >
                {{ receiving ? 'Receiving...' : 'Receive Token' }}
              </button>
              <div v-if="receiveToken" class="token-info">
                <p class="info-text">Token preview: {{ receiveToken.substring(0, 20) }}...</p>
              </div>
            </div>
            
            <!-- Lightning Receive Mode -->
            <div v-if="receiveMode === 'lightning'" class="receive-mode">
              <p class="info-text">Create an invoice to receive Lightning payment</p>
              <input 
                v-model.number="receiveAmount" 
                type="number" 
                placeholder="Amount (sats)"
                class="input"
              />
              <button 
                @click="handleReceiveLightning" 
                class="btn primary"
                :disabled="!receiveAmount || receivingLightning"
              >
                {{ receivingLightning ? 'Creating Invoice...' : 'Create Invoice' }}
              </button>
              <div v-if="receiveLightningQuote" class="pending-receive">
                <p class="success-text">✅ Invoice created! Share with payer</p>
                <div class="qr-container">
                  <canvas id="receive-invoice-qr"></canvas>
                </div>
                <textarea 
                  :value="receiveLightningQuote.request || receiveLightningQuote.payment_request || receiveLightningQuote.pr" 
                  readonly 
                  class="invoice-text"
                  @click="copyToClipboard(receiveLightningQuote.request || receiveLightningQuote.payment_request || receiveLightningQuote.pr)"
                ></textarea>
                <button @click="copyToClipboard(receiveLightningQuote.request || receiveLightningQuote.payment_request || receiveLightningQuote.pr)" class="btn secondary">
                  📋 Copy Invoice
                </button>
                <button @click="checkReceiveLightningQuote" class="btn secondary">
                  🔄 Check Payment Status
                </button>
                <p class="info-text">Waiting for {{ receiveAmount }} sats payment...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Backup Section -->
        <div class="card backup-card">
          <h3>⚙️ Wallet Backup & Recovery</h3>
          <p class="warning-text">⚠️ Important: Save your seed phrase! This is the ONLY way to recover your wallet.</p>
          
          <!-- Mint Switcher -->
          <div class="mint-switcher">
            <h4>🏦 Current Mint</h4>
            <p class="mint-url">{{ mintUrl }}</p>
            <input 
              v-model="newMintUrl" 
              type="text" 
              placeholder="Enter new mint URL"
              class="input"
            />
            <button @click="handleSwitchMint" class="btn secondary" :disabled="!newMintUrl || newMintUrl === mintUrl">
              🔄 Switch Mint
            </button>
          </div>
          
          <!-- Restore Button -->
          <div class="restore-section">
            <button @click="handleRestore" class="btn primary" :disabled="restoring">
              {{ restoring ? '🔄 Restoring...' : '🔄 Restore Wallet from Seed' }}
            </button>
            <p class="info-text">Click to scan for tokens created with your seed phrase</p>
          </div>
          
          <div v-if="mnemonic && !showMnemonic" class="seed-hidden">
            <p class="info-text">Your seed phrase is hidden for security</p>
            <button @click="showMnemonic = true" class="btn secondary">
              👁️ Show Seed Phrase
            </button>
          </div>
          
          <div v-if="mnemonic && showMnemonic" class="seed-display">
            <div class="seed-words">
              <div v-for="(word, index) in mnemonic.split(' ')" :key="index" class="seed-word">
                <span class="word-number">{{ index + 1 }}</span>
                <span class="word-text">{{ word }}</span>
              </div>
            </div>
            <div class="backup-actions">
              <button @click="copySeedPhrase" class="btn secondary">
                📋 Copy Seed Phrase
              </button>
              <button @click="showMnemonic = false" class="btn secondary">
                🙈 Hide
              </button>
            </div>
          </div>
          
          <div class="import-toggle">
            <button @click="showImport = !showImport" class="btn secondary">
              {{ showImport ? '✕ Cancel Import' : '📥 Restore from Seed' }}
            </button>
          </div>
          
          <div v-if="showImport" class="import-section">
            <p class="info-text">Enter your 12-word seed phrase (space-separated)</p>
            <textarea 
              v-model="importData" 
              placeholder="word1 word2 word3 ... word12"
              class="input textarea seed-input"
            ></textarea>
            <button @click="importFromSeed" class="btn primary" :disabled="!importData">
              Restore Wallet
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="message" class="message" :class="messageType">
          {{ message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useCashuWallet } from '../composables/useCashuWallet'
import QRCode from 'qrcode'

const {
  balance,
  isInitialized,
  mintUrl,
  mnemonic,
  initialize,
  requestMint,
  mintTokens,
  send,
  payLightningInvoice,
  receive,
  checkPendingQuote,
  restoreFromSeed
} = useCashuWallet()

const customMintUrl = ref('')
const initializing = ref(false)
const mintAmount = ref(null)
const sendAmount = ref(null)
const receiveToken = ref('')
const sendToken = ref('')
const pendingQuote = ref(null)
const minting = ref(false)
const sending = ref(false)
const receiving = ref(false)
const message = ref('')
const messageType = ref('info')
const showImport = ref(false)
const showMnemonic = ref(false)
const importData = ref('')
const restoring = ref(false)
const newMintUrl = ref('')
const sendMode = ref('ecash') // 'ecash' or 'lightning'
const receiveMode = ref('ecash') // 'ecash' or 'lightning'
const lightningInvoice = ref('')
const invoiceInfo = ref(null)
const receiveAmount = ref(null)
const receiveLightningQuote = ref(null)
const receivingLightning = ref(false)
let pollingInterval = null
let receivePollingInterval = null

const showMessage = (msg, type = 'info') => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 5000)
}

const startPolling = () => {
  // Poll every 2 seconds to check if invoice is paid
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
  
  pollingInterval = setInterval(async () => {
    await checkQuote()
  }, 2000)
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

const startReceivePolling = () => {
  // Poll every 2 seconds to check if invoice is paid
  if (receivePollingInterval) {
    clearInterval(receivePollingInterval)
  }
  
  receivePollingInterval = setInterval(async () => {
    await checkReceiveLightningQuote()
  }, 2000)
}

const stopReceivePolling = () => {
  if (receivePollingInterval) {
    clearInterval(receivePollingInterval)
    receivePollingInterval = null
  }
}

const handleInitialize = async () => {
  initializing.value = true
  try {
    const result = await initialize(customMintUrl.value || null)
    if (result) {
      // Check if this is a new wallet (mnemonic was just generated)
      const isNewWallet = !localStorage.getItem('cashu_proofs') || localStorage.getItem('cashu_proofs') === '[]'
      if (isNewWallet && typeof result === 'string') {
        showMessage('✅ New wallet created! IMPORTANT: Save your seed phrase now!', 'success')
        // Auto-show the seed phrase for new wallets
        showMnemonic.value = true
      } else {
        showMessage('Wallet initialized successfully!', 'success')
      }
    }
  } catch (error) {
    showMessage(`Failed to initialize: ${error.message}`, 'error')
  } finally {
    initializing.value = false
  }
}

const handleMint = async () => {
  minting.value = true
  try {
    const quote = await requestMint(mintAmount.value)
    console.log('Full quote response:', quote)
    console.log('Invoice/request:', quote.request)
    pendingQuote.value = quote
    showMessage('Pay the invoice to complete minting', 'info')
    
    // Generate QR code for the invoice
    await nextTick()
    const canvas = document.getElementById('invoice-qr')
    const invoiceString = quote.request || quote.payment_request || quote.pr
    console.log('Using invoice string:', invoiceString)
    
    if (canvas && invoiceString) {
      await QRCode.toCanvas(canvas, invoiceString.toUpperCase(), {
        width: 256,
        margin: 2,
        color: {
          dark: '#667eea',
          light: '#ffffff'
        }
      })
    } else {
      console.error('No invoice found in quote:', quote)
    }
    
    // Start automatic polling to check if invoice is paid
    startPolling()
  } catch (error) {
    console.error('Full error:', error)
    showMessage(`Failed to request mint: ${error.message}`, 'error')
  } finally {
    minting.value = false
  }
}

const checkQuote = async () => {
  try {
    if (!pendingQuote.value) return
    
    const status = await checkPendingQuote(pendingQuote.value.quote)
    console.log('Quote status:', status)
    
    if (status.state === 'PAID' || status.paid) {
      stopPolling()
      console.log('Invoice paid! Minting tokens...')
      await mintTokens(mintAmount.value, pendingQuote.value.quote)
      showMessage('Tokens minted successfully! Balance updated.', 'success')
      pendingQuote.value = null
      mintAmount.value = null
    }
  } catch (error) {
    console.error('Error checking quote:', error)
    if (pollingInterval) {
      // If there's an error during polling, show it but don't stop polling
      // In case it's a temporary network issue
      console.warn('Polling check failed, will retry...')
    } else {
      // If user manually checked, show the error
      showMessage(`Failed to check quote: ${error.message}`, 'error')
    }
  }
}

const handleSend = async () => {
  sending.value = true
  try {
    const token = await send(sendAmount.value)
    sendToken.value = token
    showMessage('Token created! Share it to send payment.', 'success')
    sendAmount.value = null
    
    // Generate QR code for the token
    await nextTick()
    const canvas = document.getElementById('token-qr')
    if (canvas && token) {
      await QRCode.toCanvas(canvas, token, {
        width: 256,
        margin: 2,
        color: {
          dark: '#667eea',
          light: '#ffffff'
        }
      })
    }
  } catch (error) {
    showMessage(`Failed to send: ${error.message}`, 'error')
  } finally {
    sending.value = false
  }
}

const handlePayInvoice = async () => {
  sending.value = true
  try {
    const info = await payLightningInvoice(lightningInvoice.value)
    invoiceInfo.value = info
    showMessage('Invoice paid! Token received.', 'success')
    lightningInvoice.value = ''
  } catch (error) {
    showMessage(`Failed to pay invoice: ${error.message}`, 'error')
  } finally {
    sending.value = false
  }
}

const handleReceive = async () => {
  receiving.value = true
  try {
    await receive(receiveToken.value)
    showMessage('Tokens received successfully!', 'success')
    receiveToken.value = ''
    sendToken.value = ''
  } catch (error) {
    showMessage(`Failed to receive: ${error.message}`, 'error')
  } finally {
    receiving.value = false
  }
}

const handleReceiveLightning = async () => {
  receivingLightning.value = true
  try {
    // Create a mint quote to get an invoice for receiving Lightning payment
    const quote = await requestMint(receiveAmount.value)
    console.log('Receive Lightning quote created:', quote)
    receiveLightningQuote.value = quote
    showMessage('Invoice created! Share it to receive payment', 'success')
    
    // Generate QR code for the invoice
    await nextTick()
    const canvas = document.getElementById('receive-invoice-qr')
    const invoiceString = quote.request || quote.payment_request || quote.pr
    console.log('Using receive invoice string:', invoiceString)
    
    if (canvas && invoiceString) {
      await QRCode.toCanvas(canvas, invoiceString.toUpperCase(), {
        width: 256,
        margin: 2,
        color: {
          dark: '#667eea',
          light: '#ffffff'
        }
      })
    } else {
      console.error('No invoice found in quote:', quote)
    }
    
    // Start automatic polling to check if invoice is paid
    startReceivePolling()
  } catch (error) {
    console.error('Full error:', error)
    showMessage(`Failed to create invoice: ${error.message}`, 'error')
  } finally {
    receivingLightning.value = false
  }
}

const checkReceiveLightningQuote = async () => {
  try {
    if (!receiveLightningQuote.value) return
    
    const status = await checkPendingQuote(receiveLightningQuote.value.quote)
    console.log('Receive quote status:', status)
    
    if (status.state === 'PAID' || status.paid) {
      stopReceivePolling()
      console.log('Invoice paid! Minting tokens...')
      
      try {
        await mintTokens(receiveAmount.value, receiveLightningQuote.value.quote)
        showMessage(`✅ Received ${receiveAmount.value} sats via Lightning!`, 'success')
        receiveLightningQuote.value = null
        receiveAmount.value = null
      } catch (mintError) {
        console.error('Mint error during receive:', mintError)
        
        // If tokens were minted but there was an error (like recovery failure),
        // still show success but inform user to check balance
        if (mintError.message.includes('already been signed') || 
            mintError.message.includes('recovery failed') ||
            mintError.message.includes('already spent')) {
          showMessage(`⚠️ Payment received! Tokens may already be in your wallet. Check your balance or use "Restore from Seed".`, 'warning')
          receiveLightningQuote.value = null
          receiveAmount.value = null
        } else {
          throw mintError
        }
      }
    }
  } catch (error) {
    console.error('Error checking receive quote:', error)
    if (receivePollingInterval) {
      // If there's an error during polling, don't stop polling
      // In case it's a temporary network issue
      console.warn('Receive polling check failed, will retry...')
    } else {
      // If user manually checked, show the error
      showMessage(`Failed to check quote: ${error.message}`, 'error')
    }
  }
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
  showMessage('Copied to clipboard!', 'success')
}

const copySeedPhrase = () => {
  if (mnemonic.value) {
    navigator.clipboard.writeText(mnemonic.value)
    showMessage('✅ Seed phrase copied to clipboard! Keep it safe!', 'success')
  }
}

const importFromSeed = async () => {
  try {
    const seedPhrase = importData.value.trim()
    
    // Basic validation - check if it's approximately 12 words
    const words = seedPhrase.split(/\s+/)
    if (words.length !== 12) {
      throw new Error('Seed phrase must be 12 words')
    }
    
    // Clear existing wallet data
    localStorage.removeItem('cashu_proofs')
    localStorage.removeItem('cashu_mnemonic')
    
    // Reinitialize wallet with imported mnemonic
    initializing.value = true
    await initialize(customMintUrl.value || null, seedPhrase)
    
    showImport.value = false
    importData.value = ''
    showMessage('✅ Wallet restored from seed phrase!', 'success')
  } catch (error) {
    showMessage(`Failed to restore wallet: ${error.message}`, 'error')
  } finally {
    initializing.value = false
  }
}

const handleRestore = async () => {
  restoring.value = true
  try {
    showMessage('🔍 Scanning for tokens created with your seed...', 'info')
    
    // Restore from seed with default parameters
    const result = await restoreFromSeed({ start: 0, count: 100 })
    
    if (result.added > 0) {
      showMessage(`✅ Success! Restored ${result.added} token(s). Balance updated!`, 'success')
    } else if (result.found > 0) {
      showMessage(`Found ${result.found} token(s) but they were already in your wallet.`, 'info')
    } else {
      showMessage('No tokens found. Your seed may not have been used yet, or tokens may have been spent.', 'info')
    }
  } catch (error) {
    console.error('Restore error:', error)
    showMessage(`Failed to restore: ${error.message}`, 'error')
  } finally {
    restoring.value = false
  }
}

const handleSwitchMint = async () => {
  if (!newMintUrl.value) {
    showMessage('Please enter a new mint URL.', 'error')
    return
  }
  try {
    showMessage('Switching mint...', 'info')
    await initialize(newMintUrl.value)
    showMessage('Mint switched successfully!', 'success')
    customMintUrl.value = newMintUrl.value
    newMintUrl.value = ''
  } catch (error) {
    showMessage(`Failed to switch mint: ${error.message}`, 'error')
  }
}

onMounted(() => {
  // Auto-initialize if we have saved proofs
  if (localStorage.getItem('cashu_proofs')) {
    handleInitialize()
  }
})

onUnmounted(() => {
  // Cleanup polling when component is unmounted
  stopPolling()
  stopReceivePolling()
})
</script>

<style scoped>
.cashu-wallet {
  min-height: calc(100vh - 80px);
  padding: 2rem;
  color: white;
}

.wallet-container {
  max-width: 1200px;
  margin: 0 auto;
}

.wallet-header {
  text-align: center;
  margin-bottom: 2rem;
}

.wallet-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 10px rgba(102, 126, 234, 0.5);
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.8;
}

.init-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-card {
  height: 100%;
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
}

.backup-card {
  margin-bottom: 2rem;
}

.backup-card h3 {
  margin-bottom: 0.5rem;
}

.warning-text {
  color: #ffa726;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.mint-switcher {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.mint-switcher h4 {
  margin-bottom: 0.5rem;
  font-size: 1rem;
  opacity: 0.9;
}

.mint-url {
  font-size: 0.9rem;
  opacity: 0.7;
  word-break: break-all;
  margin-bottom: 0.5rem;
}

.restore-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.restore-section .btn {
  width: 100%;
  margin-bottom: 0.5rem;
}

.restore-section .info-text {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.seed-hidden,
.seed-display {
  margin: 1rem 0;
}

.seed-words {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 2px solid #667eea;
}

.seed-word {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-family: monospace;
}

.word-number {
  color: #667eea;
  font-weight: bold;
  font-size: 0.85rem;
  min-width: 24px;
}

.word-text {
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
}

.backup-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.backup-actions .btn {
  flex: 1;
}

.import-toggle {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.import-section {
  margin-top: 1rem;
  padding-top: 1rem;
}

.seed-input {
  font-family: monospace;
  font-size: 0.9rem;
}

.balance-label {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.balance-amount {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.mint-info {
  font-size: 0.9rem;
  opacity: 0.7;
  word-break: break-all;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card h2, .card h3 {
  margin-bottom: 1rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 1rem;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.textarea {
  min-height: 100px;
  resize: vertical;
  font-family: monospace;
}

.btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  margin-top: 0.5rem;
}

.pending-mint, .token-output {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  margin: 1rem 0;
}

.qr-container canvas {
  display: block;
  border-radius: 8px;
}

.invoice-text, .token-text {
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-family: monospace;
  font-size: 0.85rem;
  resize: none;
  margin: 0.5rem 0;
  cursor: pointer;
}

.info-text {
  color: #4fc3f7;
  margin-bottom: 0.5rem;
}

.success-text {
  color: #66bb6a;
  margin-bottom: 0.5rem;
}

.token-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(79, 195, 247, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(79, 195, 247, 0.3);
}

.message {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  margin-top: 1rem;
}

.message.info {
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid #4fc3f7;
}

.message.success {
  background: rgba(102, 187, 106, 0.2);
  border: 1px solid #66bb6a;
}

.message.error {
  background: rgba(239, 83, 80, 0.2);
  border: 1px solid #ef5350;
}

.send-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.5rem;
}

.send-tabs .tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px 8px 0 0;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 2px solid transparent;
}

.send-tabs .tab-btn.active {
  background: rgba(255, 255, 255, 0.2);
  border-bottom: 2px solid #667eea;
  color: #667eea;
}

.send-tabs .tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.15);
}

.send-mode {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.send-mode .info-text {
  margin-bottom: 1rem;
}

.send-mode .input {
  margin-bottom: 1rem;
}

.send-mode .btn {
  margin-bottom: 1rem;
}

.send-mode .token-output {
  margin-top: 1rem;
}

.send-mode .invoice-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.receive-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.5rem;
}

.receive-tabs .tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px 8px 0 0;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 2px solid transparent;
}

.receive-tabs .tab-btn.active {
  background: rgba(255, 255, 255, 0.2);
  border-bottom: 2px solid #667eea;
  color: #667eea;
}

.receive-tabs .tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.15);
}

.receive-mode {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.receive-mode .info-text {
  margin-bottom: 1rem;
}

.receive-mode .input {
  margin-bottom: 1rem;
}

.receive-mode .btn {
  margin-bottom: 1rem;
}

.pending-receive {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}
</style>

