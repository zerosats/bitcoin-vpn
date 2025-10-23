<template>
  <div class="arkade-wallet">
    <div class="wallet-container">
      <div class="wallet-header">
        <h1>🏛️ Ark Wallet</h1>
        <p class="subtitle">Bitcoin VTXOs & Lightning</p>
      </div>

      <!-- Not Initialized -->
      <div v-if="!wallet" class="init-section">
        <div class="card">
          <h2>Initialize Wallet</h2>
          
          <button @click="createNewWallet" class="btn primary" :disabled="loading">
            {{ loading ? 'Initializing...' : 'Create New Wallet' }}
          </button>
          
          <div class="divider">OR</div>
          
          <textarea 
            v-model="importPrivateKey" 
            placeholder="Paste private key (hex) to restore"
            class="input textarea"
          ></textarea>
          <button 
            @click="restoreWallet" 
            class="btn secondary"
            :disabled="!importPrivateKey || loading"
          >
            Restore from Private Key
          </button>
          
          <div v-if="errorMessage" class="error-box">
            {{ errorMessage }}
          </div>
        </div>
      </div>

      <!-- Initialized -->
      <div v-else class="wallet-main">
        <!-- Balance Card -->
        <div class="balance-card">
          <div class="balance-header">
            <div class="balance-label">Balance</div>
            <button 
              @click="checkBalance" 
              class="refresh-btn"
              :disabled="loading"
            >
              {{ loading ? '⏳' : '🔄' }}
            </button>
          </div>
          <div v-if="balanceData !== null" class="balance-amount">{{ formatBalance(balanceData) }} sats</div>
          <div v-else class="balance-amount">-- sats</div>
        </div>

        <!-- Actions Grid -->
        <div class="actions-grid">
          <!-- Receive -->
          <div class="card action-card">
            <h3>📥 Receive</h3>
            
            <!-- Receive Mode Tabs -->
            <div class="action-tabs">
              <button 
                @click="receiveMode = 'ark'" 
                :class="{ active: receiveMode === 'ark' }"
                class="tab-btn"
              >
                🏛️ Ark
              </button>
              <button 
                @click="receiveMode = 'lightning'" 
                :class="{ active: receiveMode === 'lightning' }"
                class="tab-btn"
              >
                ⚡ Lightning
              </button>
            </div>
            
            <!-- Ark Receive Mode -->
            <div v-if="receiveMode === 'ark'" class="action-mode">
              <p class="info-text">Get your Ark address to receive VTXOs</p>
              <button 
                @click="getArkAddress" 
                class="btn primary"
                :disabled="loading"
              >
                {{ loading ? 'Getting Address...' : 'Get Ark Address' }}
              </button>

              <div v-if="arkAddress" class="address-display-box">
                <p class="success-text">✅ Your Ark Address:</p>
                <div class="address-box" @click="copyArkAddress">
                  {{ arkAddress }}
                </div>
                <button @click="copyArkAddress" class="btn secondary">
                  📋 Copy Address
                </button>
              </div>

              <!-- Offchain Address -->
              <div class="offchain-section">
                <p class="info-text">Or get an offchain address:</p>
                <button 
                  @click="getOffchainAddr" 
                  class="btn secondary"
                  :disabled="loading"
                >
                  {{ loading ? 'Getting Address...' : 'Get Offchain Address' }}
                </button>

                <div v-if="offchainAddress" class="address-display-box">
                  <p class="success-text">✅ Your Offchain Address:</p>
                  <div class="address-box" @click="copyOffchainAddress">
                    {{ offchainAddress }}
                  </div>
                  <button @click="copyOffchainAddress" class="btn secondary">
                    📋 Copy Offchain Address
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Lightning Receive Mode -->
            <div v-if="receiveMode === 'lightning'" class="action-mode">
              <p class="info-text">Create a Lightning invoice (via Ark)</p>
              <input 
                v-model.number="lightningAmount" 
                type="number" 
                placeholder="Amount (sats)"
                class="input"
              />
              <input 
                v-model="lightningMemo" 
                type="text" 
                placeholder="Description (optional)"
                class="input"
              />
              <button 
                @click="createLightningInvoice" 
                class="btn primary"
                :disabled="!lightningAmount || loading"
              >
                {{ loading ? 'Creating...' : 'Create Lightning Invoice' }}
              </button>

              <div v-if="lightningInvoice" class="invoice-display">
                <p class="success-text">✅ Lightning Invoice Created!</p>
                <div class="invoice-box" @click="copyLightningInvoice">
                  {{ lightningInvoice.substring(0, 60) }}...
                </div>
                <button @click="copyLightningInvoice" class="btn secondary">
                  📋 Copy Invoice
                </button>
              </div>
            </div>
          </div>

          <!-- Pay -->
          <div class="card action-card">
            <h3>📤 Pay</h3>
            
            <!-- Pay Mode Tabs -->
            <div class="action-tabs">
              <button 
                @click="payMode = 'ark'" 
                :class="{ active: payMode === 'ark' }"
                class="tab-btn"
              >
                🏛️ Ark
              </button>
              <button 
                @click="payMode = 'lightning'" 
                :class="{ active: payMode === 'lightning' }"
                class="tab-btn"
              >
                ⚡ Lightning
              </button>
            </div>
            
            <!-- Ark Pay Mode -->
            <div v-if="payMode === 'ark'" class="action-mode">
              <p class="info-text">Send to another Ark wallet</p>
              <input 
                v-model="receiverAddress" 
                type="text" 
                placeholder="Receiver Ark Address"
                class="input"
              />
              <input 
                v-model.number="transferAmount" 
                type="number" 
                placeholder="Amount (sats)"
                class="input"
              />
              <button 
                @click="sendArkTransfer" 
                class="btn primary"
                :disabled="!receiverAddress || !transferAmount || loading"
              >
                {{ loading ? 'Sending...' : 'Send Transfer' }}
              </button>

              <div v-if="transferSuccess" class="success-box">
                🎉 Transfer sent successfully!
              </div>
            </div>
            
            <!-- Lightning Pay Mode -->
            <div v-if="payMode === 'lightning'" class="action-mode">
              <p class="info-text">Pay a Lightning invoice (BOLT11)</p>
              <textarea 
                v-model="payInvoice" 
                placeholder="Paste Lightning invoice (lnbc...)"
                class="input textarea"
              ></textarea>
              <input 
                v-model.number="maxFeeSats" 
                type="number" 
                placeholder="Max fee (sats) - default: 1000"
                class="input"
              />
              <button 
                @click="payLightningInvoice" 
                class="btn primary"
                :disabled="!payInvoice || loading"
              >
                {{ loading ? 'Paying...' : 'Pay Invoice' }}
              </button>

              <div v-if="paymentSuccess" class="success-box">
                🎉 Lightning payment sent successfully!
              </div>
            </div>
          </div>

          <!-- Exit/Withdrawal -->
          <div class="card action-card">
            <h3>🚪 Exit to Bitcoin</h3>
            <p class="info-text">Withdraw your funds to a Bitcoin address</p>
            
            <input 
              v-model="withdrawalAddress" 
              type="text" 
              placeholder="Bitcoin Address"
              class="input"
            />
            <input 
              v-model.number="withdrawalAmount" 
              type="number" 
              placeholder="Amount (sats)"
              class="input"
            />
            <button 
              @click="performExit" 
              class="btn primary"
              :disabled="!withdrawalAddress || !withdrawalAmount || loading"
            >
              {{ loading ? 'Processing...' : 'Cooperative Exit' }}
            </button>

            <div v-if="exitSuccess" class="success-box">
              🎉 Exit initiated successfully!
            </div>

            <p class="info-text">
              ℹ️ Cooperative exit allows you to withdraw funds back to the Bitcoin network
            </p>
          </div>
        </div>

        <!-- VTXOs Info -->
        <div class="card vtxos-card">
          <h3>📦 VTXOs (Virtual UTXOs)</h3>
          <p class="info-text">View your Ark VTXOs</p>
          
          <button 
            @click="loadVTXOs" 
            class="btn secondary"
            :disabled="loading"
          >
            {{ loading ? 'Loading...' : 'Load VTXOs' }}
          </button>

          <div v-if="vtxos && vtxos.length > 0" class="vtxos-list">
            <div v-for="(vtxo, index) in vtxos" :key="index" class="vtxo-item">
              <div class="vtxo-detail">
                <span class="label">Amount:</span>
                <span class="value">{{ vtxo.amount?.toString() || 'N/A' }} sats</span>
              </div>
              <div class="vtxo-detail">
                <span class="label">TxID:</span>
                <span class="value small">{{ vtxo.txid?.substring(0, 20) || 'N/A' }}...</span>
              </div>
            </div>
          </div>
          <div v-else-if="vtxos && vtxos.length === 0" class="info-text">
            No VTXOs found
          </div>
        </div>

        <!-- Wallet Backup & Settings -->
        <div class="card backup-card">
          <h3>⚙️ Wallet Backup & Recovery</h3>
          <p class="warning-text">⚠️ Important: Save your private key! This is the ONLY way to recover your wallet.</p>
          
          <div class="private-key-box">
            {{ privateKey }}
          </div>
          <button @click="copyPrivateKey" class="btn secondary">
            📋 Copy Private Key
          </button>
        </div>

        <!-- Messages -->
        <div v-if="errorMessage" class="message error">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Wallet, SingleKey } from '@arkade-os/sdk'
import { LocalStorageAdapter } from '@arkade-os/sdk/adapters/localStorage'

const wallet = ref(null)
const privateKey = ref('')
const importPrivateKey = ref('')
const balanceData = ref(null)
const arkAddress = ref('')
const offchainAddress = ref('')
const receiverAddress = ref('')
const transferAmount = ref(null)
const transferSuccess = ref(false)
const lightningAmount = ref(null)
const lightningMemo = ref('')
const lightningInvoice = ref('')
const payInvoice = ref('')
const maxFeeSats = ref(1000)
const paymentSuccess = ref(false)
const withdrawalAddress = ref('')
const withdrawalAmount = ref(null)
const exitSuccess = ref(false)
const vtxos = ref([])
const loading = ref(false)
const errorMessage = ref('')
const receiveMode = ref('ark')
const payMode = ref('ark')

const createNewWallet = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('Initializing new Arkade wallet...')
    
    // Generate new identity
    const identity = SingleKey.fromRandomBytes()
    privateKey.value = identity.toHex()
    
    // Save to localStorage
    localStorage.setItem('arkade_private_key', privateKey.value)
    
    // Create storage adapter
    const storage = new LocalStorageAdapter()
    
    // Create wallet
    wallet.value = await Wallet.create({
      identity: identity,
      arkServerUrl: 'https://arkade.computer',
      esploraUrl: 'https://blockstream.info/api',
      storage: storage
    })
    
    console.log('Wallet initialized successfully')
    
  } catch (error) {
    console.error('Failed to initialize wallet:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const restoreWallet = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('Restoring wallet from private key...')
    
    const identity = SingleKey.fromHex(importPrivateKey.value.trim())
    privateKey.value = importPrivateKey.value.trim()
    
    // Save to localStorage
    localStorage.setItem('arkade_private_key', privateKey.value)
    
    // Create storage adapter
    const storage = new LocalStorageAdapter()
    
    // Create wallet
    wallet.value = await Wallet.create({
      identity: identity,
      arkServerUrl: 'https://arkade.computer',
      esploraUrl: 'https://blockstream.info/api',
      storage: storage
    })
    
    console.log('Wallet restored successfully')
    importPrivateKey.value = ''
    
  } catch (error) {
    console.error('Failed to restore wallet:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const formatBalance = (balance) => {
  if (balance === null || balance === undefined) return '0'
  
  console.log('=== FORMAT BALANCE ===')
  console.log('Input:', balance)
  console.log('Type:', typeof balance)
  
  try {
    // Handle Arkade balance object
    if (typeof balance === 'object' && !Array.isArray(balance)) {
      console.log('Detected object, checking for balance properties...')
      
      const toBigInt = (val) => {
        if (typeof val === 'bigint') return val
        if (typeof val === 'number') return BigInt(val)
        if (typeof val === 'string') return BigInt(val)
        if (typeof val === 'object' && val !== null) {
          // Handle nested objects
          if (val.value !== undefined) return toBigInt(val.value)
          if (val.amount !== undefined) return toBigInt(val.amount)
        }
        return 0n
      }
      
      // Sum all balance types
      const total = 
        toBigInt(balance.boarding || 0) +
        toBigInt(balance.settled || 0) +
        toBigInt(balance.preconfirmed || 0) +
        toBigInt(balance.available || 0) +
        toBigInt(balance.recoverable || 0)
      
      console.log('Total from object:', total.toString())
      return total.toString()
    }
    
    if (typeof balance === 'bigint') {
      return balance.toString()
    }
    if (typeof balance === 'number') {
      return balance.toString()
    }
    if (typeof balance === 'string') {
      return balance
    }
  } catch (e) {
    console.error('Error in formatBalance:', e)
  }
  
  return '0'
}

const copyPrivateKey = () => {
  navigator.clipboard.writeText(privateKey.value)
  alert('Private key copied to clipboard!')
}

const checkBalance = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('Checking balance...')
    
    const balance = await wallet.value.getBalance()
    
    // DEBUG
    console.log('=== ARKADE WALLET COMPONENT BALANCE DEBUG ===')
    console.log('Raw balance:', balance)
    console.log('Type:', typeof balance)
    console.log('Constructor:', balance?.constructor?.name)
    
    balanceData.value = balance
    
    let balanceStr
    try {
      if (typeof balance === 'bigint') {
        balanceStr = balance.toString()
      } else if (balance && typeof balance.toString === 'function') {
        balanceStr = balance.toString()
      } else {
        balanceStr = JSON.stringify(balance)
      }
    } catch (e) {
      balanceStr = String(balance)
    }
    
    console.log('Balance string:', balanceStr)
    console.log('============================================')
    
  } catch (error) {
    console.error('Failed to get balance:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const getArkAddress = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('Getting Ark address...')
    
    const addr = await wallet.value.getAddress()
    arkAddress.value = addr
    console.log('Ark Address:', addr)
    
  } catch (error) {
    console.error('Failed to get Ark address:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const getOffchainAddr = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('Getting offchain address...')
    
    const addr = await wallet.value.getOffchainAddress()
    offchainAddress.value = addr
    console.log('Offchain Address:', addr)
    
  } catch (error) {
    console.error('Failed to get offchain address:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const copyArkAddress = () => {
  navigator.clipboard.writeText(arkAddress.value)
  alert('Ark address copied to clipboard!')
}

const copyOffchainAddress = () => {
  navigator.clipboard.writeText(offchainAddress.value)
  alert('Offchain address copied to clipboard!')
}

const sendArkTransfer = async () => {
  loading.value = true
  errorMessage.value = ''
  transferSuccess.value = false
  
  try {
    console.log('Sending Ark transfer...')
    
    const transfer = await wallet.value.send({
      address: receiverAddress.value,
      amount: BigInt(transferAmount.value)
    })
    
    console.log('Transfer:', transfer)
    transferSuccess.value = true
    
    // Reset form
    receiverAddress.value = ''
    transferAmount.value = null
    
    // Update balance
    await checkBalance()
    
  } catch (error) {
    console.error('Failed to send transfer:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const createLightningInvoice = async () => {
  loading.value = true
  errorMessage.value = ''
  lightningInvoice.value = ''
  
  try {
    console.log('Creating Lightning invoice via Ark...')
    
    const result = await wallet.value.receiveBolt11({
      amount: BigInt(lightningAmount.value),
      description: lightningMemo.value || ''
    })
    
    lightningInvoice.value = result.invoice || result
    console.log('Invoice created:', result)
    
  } catch (error) {
    console.error('Failed to create Lightning invoice:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const copyLightningInvoice = () => {
  navigator.clipboard.writeText(lightningInvoice.value)
  alert('Lightning invoice copied to clipboard!')
}

const payLightningInvoice = async () => {
  loading.value = true
  errorMessage.value = ''
  paymentSuccess.value = false
  
  try {
    console.log('Paying Lightning invoice via Ark...')
    
    const result = await wallet.value.payBolt11({
      invoice: payInvoice.value,
      maxFeeSats: BigInt(maxFeeSats.value)
    })
    
    console.log('Payment result:', result)
    paymentSuccess.value = true
    
    // Reset form
    payInvoice.value = ''
    
    // Update balance
    await checkBalance()
    
  } catch (error) {
    console.error('Failed to pay Lightning invoice:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const performExit = async () => {
  loading.value = true
  errorMessage.value = ''
  exitSuccess.value = false
  
  try {
    console.log('Performing cooperative exit...')
    
    const result = await wallet.value.exit({
      address: withdrawalAddress.value,
      amount: BigInt(withdrawalAmount.value)
    })
    
    console.log('Exit result:', result)
    exitSuccess.value = true
    
    // Reset form
    withdrawalAddress.value = ''
    withdrawalAmount.value = null
    
    // Update balance
    await checkBalance()
    
  } catch (error) {
    console.error('Failed to perform exit:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const loadVTXOs = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('Loading VTXOs...')
    
    const addr = await wallet.value.getAddress()
    const vtxoList = await wallet.value.walletRepository.getVtxos(addr)
    vtxos.value = vtxoList
    console.log('VTXOs:', vtxoList)
    
  } catch (error) {
    console.error('Failed to load VTXOs:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

// Auto-restore wallet on mount
onMounted(async () => {
  const savedPrivateKey = localStorage.getItem('arkade_private_key')
  if (savedPrivateKey) {
    try {
      console.log('Auto-restoring wallet from saved private key...')
      
      const identity = SingleKey.fromHex(savedPrivateKey)
      privateKey.value = savedPrivateKey
      
      const storage = new LocalStorageAdapter()
      
      wallet.value = await Wallet.create({
        identity: identity,
        arkServerUrl: 'https://arkade.computer',
        esploraUrl: 'https://blockstream.info/api',
        storage: storage
      })
      
      // Auto-fetch balance after restoration
      await checkBalance()
      
      console.log('Wallet auto-restored successfully')
    } catch (error) {
      console.error('Failed to auto-restore wallet:', error)
      // If restore fails, clear the bad private key
      localStorage.removeItem('arkade_private_key')
    }
  }
})

// Cleanup on unmount
onUnmounted(() => {
  console.log('ArkadeWallet component unmounted')
})
</script>

<style scoped>
.arkade-wallet {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  color: #2d3748;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1.1rem;
  color: #4a5568;
}

.init-section {
  display: flex;
  justify-content: center;
  min-height: 50vh;
  align-items: center;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.card h2, .card h3 {
  margin-bottom: 1.5rem;
  color: #2d3748;
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
  box-shadow: 0 5px 20px rgba(118, 75, 162, 0.4);
}

.btn.secondary {
  background: #e2e8f0;
  color: #2d3748;
  margin-top: 0.5rem;
}

.btn.secondary:hover:not(:disabled) {
  background: #cbd5e0;
}

.divider {
  text-align: center;
  margin: 1.5rem 0;
  color: #a0aec0;
  font-weight: 600;
}

.input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: #f7fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  color: #2d3748;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.input:focus {
  outline: none;
  border-color: #764ba2;
}

.textarea {
  min-height: 100px;
  resize: vertical;
  font-family: monospace;
}

.error-box {
  margin-top: 1rem;
  padding: 1rem;
  background: #fed7d7;
  color: #742a2a;
  border: 2px solid #f56565;
  border-radius: 8px;
}

.success-box {
  padding: 1rem;
  background: #c6f6d5;
  color: #22543d;
  border: 2px solid #48bb78;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  text-align: center;
  font-weight: 600;
}

.private-key-box {
  font-family: monospace;
  padding: 1.5rem;
  background: #f7fafc;
  border: 2px solid #764ba2;
  border-radius: 8px;
  margin-bottom: 1rem;
  line-height: 1.8;
  word-break: break-word;
}

.wallet-main {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  box-shadow: 0 10px 40px rgba(118, 75, 162, 0.4);
  color: white;
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.balance-label {
  font-size: 1rem;
  opacity: 0.9;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.balance-amount {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.action-card {
  height: 100%;
}

.action-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.action-tabs .tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px 8px 0 0;
  background: #f7fafc;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 2px solid transparent;
}

.action-tabs .tab-btn.active {
  background: #f3f0ff;
  border-bottom: 2px solid #764ba2;
  color: #764ba2;
}

.action-tabs .tab-btn:hover:not(.active) {
  background: #edf2f7;
}

.action-mode {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.backup-card {
  margin-bottom: 2rem;
}

.warning-text {
  color: #764ba2;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  margin-top: 1rem;
}

.message.error {
  background: rgba(239, 83, 80, 0.2);
  border: 1px solid #ef5350;
  color: #c62828;
}

.address-box {
  font-family: monospace;
  font-size: 0.85rem;
  padding: 1rem;
  background: white;
  border: 2px solid #48bb78;
  border-radius: 8px;
  word-break: break-all;
  cursor: pointer;
  transition: all 0.2s;
  margin: 1rem 0;
}

.address-box:hover {
  background: #edf2f7;
  transform: translateY(-1px);
}

.info-text {
  color: #4299e1;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.success-text {
  color: #22543d;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.address-display-box {
  margin-top: 1.5rem;
}

.invoice-display {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.invoice-box {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #4CAF50;
  margin: 1rem 0;
  word-break: break-all;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.3s ease;
}

.invoice-box:hover {
  background: #f0f0f0;
  transform: scale(1.02);
}

.offchain-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.vtxos-card {
  margin-bottom: 2rem;
}

.vtxos-list {
  margin-top: 1.5rem;
}

.vtxo-item {
  background: #f7fafc;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.vtxo-detail {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.vtxo-detail .label {
  font-weight: 600;
  color: #4a5568;
}

.vtxo-detail .value {
  color: #2d3748;
  font-family: monospace;
}

.vtxo-detail .value.small {
  font-size: 0.85rem;
}
</style>

