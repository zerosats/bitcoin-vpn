<template>
  <div class="unified-wallet" :class="{ 'encrypted-mode': activeTab === 'encrypted' }">
    <!-- Tab Toggle -->
    <div class="tabs-wrapper">
      <WalletTabs v-model:activeTab="activeTab" @toggleMenu="showMenu = !showMenu">
        <template #menu>
          <DropdownMenu :show="showMenu">
            <!-- Cashu Advanced Options -->
            <template v-if="activeTab === 'encrypted'">
              <button @click="() => { handleVerifyBalance(); showMenu = false }" class="menu-item" :disabled="verifying">
                {{ verifying ? '🔍 Verifying...' : '🔍 Verify Balance' }}
              </button>
              <button @click="() => { handleGetLastToken(); showMenu = false }" class="menu-item">
                📋 Get Last Token
              </button>
              <button @click="() => { handleRestoreCashu(); showMenu = false }" class="menu-item" :disabled="restoring">
                {{ restoring ? '🔄 Restoring...' : '🔄 Restore from Seed' }}
              </button>
              <button @click="() => { handleDecryptToArkade(); showMenu = false }" class="menu-item" :disabled="!cashuBalance || decrypting">
                {{ decrypting ? '🔓 Decrypting...' : '🔓 Decrypt to Arkade' }}
              </button>
            </template>
            <!-- Arkade Advanced Options -->
            <template v-else-if="activeTab === 'arkade'">
              <button @click="openModal('arkadeSend'); showMenu = false" class="menu-item">
                📤 Send to Ark Address
              </button>
              <button @click="openModal('arkadeDeposit'); showMenu = false" class="menu-item">
                💰 Deposit Funds
              </button>
              <button @click="openModal('arkadePrivateKey'); showMenu = false" class="menu-item">
                🔑 Show Private Key
              </button>
              <button @click="handleResetArkadeWallet; showMenu = false" class="menu-item">
                🔄 Reset Arkade Wallet
              </button>
              <button @click="handleLoadVTXOs" class="menu-item" :disabled="loading">
                {{ loading ? 'Loading...' : 'View VTXOs' }}
              </button>
            </template>
          </DropdownMenu>
        </template>
      </WalletTabs>
    </div>

    <!-- Encrypted View (Cashu) -->
    <div v-if="activeTab === 'encrypted'" class="cashu-layout">
      <CashuWalletView 
        :balance="cashuBalance"
        @send="openModal('send')"
        @receive="openModal('receive')"
      />
      
      <!-- Right Side Panel -->
      <div class="right-panel">
        <div class="panel-header">
          <button 
            @click="cashuRightPanelView = 'decrypt'" 
            :class="['panel-tab', { active: cashuRightPanelView === 'decrypt' }]"
          >
            Decrypt
          </button>
          <button 
            @click="cashuRightPanelView = 'withdraw'" 
            :class="['panel-tab', { active: cashuRightPanelView === 'withdraw' }]"
          >
            Withdraw
          </button>
        </div>

        <!-- Decrypt View -->
        <div v-if="cashuRightPanelView === 'decrypt'" class="panel-content">
          <div class="panel-section">
            <h3 class="panel-title">Decrypt to VTXOs</h3>
            <p class="panel-description">Convert Cashu back to fresh Arkade VTXOs</p>
            
            <div class="decrypt-form">
              <div class="amount-input-panel">
                <label class="input-label">Amount (sats)</label>
                <input 
                  v-model.number="decryptAmount"
                  type="number" 
                  class="amount-field-panel"
                  placeholder="Enter amount"
                  :max="cashuBalance"
                >
                <button 
                  @click="decryptAmount = Number(cashuBalance)" 
                  class="max-button-panel"
                  :disabled="!cashuBalance || cashuBalance === '0'"
                >
                  MAX
                </button>
              </div>

              <button 
                @click="handleDecryptToArkade" 
                class="panel-action-btn primary"
                :disabled="!decryptAmount || decryptAmount <= 0 || decryptAmount > Number(cashuBalance) || decrypting"
              >
                {{ decrypting ? '🔓 Decrypting...' : '🔓 Decrypt to VTXOs' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Withdraw View -->
        <div v-if="cashuRightPanelView === 'withdraw'" class="panel-content">
          <div class="panel-section">
            <h3 class="panel-title">Withdraw to Bitcoin</h3>
            <p class="panel-description">Exit VTXOs to Bitcoin L1 address</p>

            <!-- Load VTXOs Button -->
            <div class="vtxo-actions" style="margin-bottom: 1.5rem;">
              <button 
                @click="handleLoadVTXOs" 
                class="panel-action-btn secondary"
                :disabled="loading"
              >
                {{ loading ? 'Loading...' : 'Load VTXOs' }}
              </button>
            </div>

            <!-- VTXOs List -->
            <div v-if="vtxos.length > 0" class="vtxos-list-panel" style="margin-bottom: 1.5rem;">
              <div 
                v-for="(vtxo, index) in vtxos" 
                :key="index" 
                class="vtxo-item-panel"
                :class="{ 'selected': selectedWithdrawVtxo === vtxo }"
                @click="selectWithdrawVtxo(vtxo)"
                title="Click to select for withdrawal"
              >
                <div class="vtxo-header-panel">
                  <span class="vtxo-status-badge" :class="getVtxoStatusClass(vtxo)">
                    {{ getVtxoStatusLabel(vtxo) }}
                  </span>
                  <span class="vtxo-amount-badge">{{ vtxo.value || vtxo.amount || 0 }} sats</span>
                </div>
                <div class="vtxo-detail-panel">
                  <span class="vtxo-label">TXID:</span>
                  <span class="vtxo-value small">{{ vtxo.txid?.substring(0, 20) }}...</span>
                </div>
                <div v-if="vtxo.vout !== undefined" class="vtxo-detail-panel">
                  <span class="vtxo-label">Output:</span>
                  <span class="vtxo-value">{{ vtxo.vout }}</span>
                </div>
                
                <!-- Selection indicator -->
                <div v-if="selectedWithdrawVtxo === vtxo" class="vtxo-selected-indicator">
                  ✓ Selected for withdrawal
                </div>
              </div>
            </div>
            <div v-else-if="!loading" class="empty-state" style="margin-bottom: 1.5rem;">
              <p>No VTXOs loaded. Click "Load VTXOs" to view available VTXOs.</p>
            </div>

            <!-- Withdraw Form -->
            <div class="withdraw-form">
              <div class="address-input-panel">
                <label class="input-label">Bitcoin Address</label>
                <input 
                  v-model="withdrawAddress"
                  type="text" 
                  class="address-field-panel"
                  placeholder="bc1..."
                >
              </div>

              <button 
                @click="handleWithdrawBitcoin" 
                class="panel-action-btn primary"
                :disabled="!selectedWithdrawVtxo || !withdrawAddress || withdrawing"
              >
                {{ withdrawing ? '⏳ Withdrawing...' : '💰 Withdraw Selected VTXO' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Arkade View with Right Panel -->
    <div v-if="activeTab === 'arkade'" class="arkade-layout">
      <ArkadeWalletView 
        :balance="arkadeBalance"
        v-model:encryptAmount="encryptAmountArkade"
        :mintUrlShort="mintUrlShort"
        :estimatedFee="estimatedFee"
        :encryptionInProgress="encryptionInProgress"
        :encryptionStep="encryptionStep"
        :canEncrypt="canEncryptFromArkade"
        @encryptOrDeposit="handleEncryptOrDepositArkade"
      />
      
      <!-- Right Side Panel -->
      <div class="right-panel">
        <div class="panel-header">
          <button 
            @click="rightPanelView = 'vtxos'" 
            :class="['panel-tab', { active: rightPanelView === 'vtxos' }]"
          >
            VTXOs
          </button>
          <button 
            @click="rightPanelView = 'deposit'" 
            :class="['panel-tab', { active: rightPanelView === 'deposit' }]"
          >
            Deposit Address
          </button>
        </div>

        <!-- VTXOs View -->
        <div v-if="rightPanelView === 'vtxos'" class="panel-content">
          <div class="panel-section">
            <h3 class="panel-title">Your vUTXOs</h3>
            <p class="panel-description">Virtual UTXOs on Arkade</p>
            
            <!-- Boarding Balance Display -->
            <div v-if="boardingBalance > 0" class="boarding-balance-card">
              <div class="boarding-header">
                <span class="boarding-icon">🚢</span>
                <span class="boarding-label">Ready to Board</span>
              </div>
              <div class="boarding-amount">{{ boardingBalance }} <span class="boarding-unit">sats</span></div>
              <p class="boarding-description">Confirmed Bitcoin waiting to be onboarded</p>
            </div>
            
            <div class="vtxo-actions">
              <button 
                @click="handleLoadVTXOs" 
                class="panel-action-btn secondary"
                :disabled="loading"
              >
                {{ loading ? 'Loading...' : 'Load confirmed vUTXOs' }}
              </button>
              
              <button 
                @click="handleOnboardBitcoin" 
                class="panel-action-btn primary"
                :disabled="loading || boardingBalance === 0"
              >
                {{ loading ? 'Onboarding...' : 'Onboard to vUTXOs' }}
              </button>
            </div>

            <div v-if="vtxos.length > 0" class="vtxos-list-panel">
              <div 
                v-for="(vtxo, index) in vtxos" 
                :key="index" 
                class="vtxo-item-panel"
                :class="{ 'selected': selectedVtxo === vtxo }"
                @click="selectVtxo(vtxo)"
                title="Click to select for encryption"
              >
                <div class="vtxo-header-panel">
                  <span class="vtxo-status-badge" :class="getVtxoStatusClass(vtxo)">
                    {{ getVtxoStatusLabel(vtxo) }}
                  </span>
                  <span class="vtxo-amount-badge">{{ vtxo.value || vtxo.amount || 0 }} sats</span>
                </div>
                <div class="vtxo-detail-panel">
                  <span class="vtxo-label">TXID:</span>
                  <span class="vtxo-value small">{{ vtxo.txid?.substring(0, 20) }}...</span>
                </div>
                <div v-if="vtxo.vout !== undefined" class="vtxo-detail-panel">
                  <span class="vtxo-label">Output:</span>
                  <span class="vtxo-value">{{ vtxo.vout }}</span>
                </div>
                
                <!-- Selection indicator -->
                <div v-if="selectedVtxo === vtxo" class="vtxo-selected-indicator">
                  ✓ Selected for encryption
                </div>
              </div>
            </div>
            <div v-else-if="!loading" class="empty-state">
              <p>No spendable VTXOs found. Deposit Bitcoin and onboard to create VTXOs.</p>
            </div>
          </div>
        </div>

        <!-- Deposit Address View -->
        <div v-if="rightPanelView === 'deposit'" class="panel-content">
          <div class="panel-section">
            <h3 class="panel-title">Bitcoin Deposit</h3>
            <p class="panel-description">Boarding address to deposit Bitcoin</p>

            <div v-if="loading" class="loading-state">
              <p>⏳ Generating address...</p>
            </div>
            
            <div v-else-if="arkadeDepositAddress" class="address-display-panel">
              <div 
                class="address-box-panel" 
                @click="copyToClipboard(arkadeDepositAddress, 'Address copied!')"
                title="Click to copy"
              >
                {{ arkadeDepositAddress }}
              </div>
              
              <!-- QR Code -->
              <div class="qr-code-panel">
                <canvas :id="'deposit-address-qr'"></canvas>
              </div>
              
              <button 
                @click="copyToClipboard(arkadeDepositAddress, 'Address copied!')" 
                class="copy-btn-panel"
              >
                Copy Address
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Send Modal (Cashu) -->
    <CashuSendModal 
      :show="modals.send"
      :sending="sending"
      :token="sendToken"
      @close="closeModal('send'); sendToken = ''"
      @send="handleSendCashu"
      @payLightning="handlePayCashuLightning"
      @copy="copyToClipboard"
      @back="handleBackToCashuSendOptions"
    />

    <!-- Receive Modal (Cashu) -->
    <CashuReceiveModal 
      :show="modals.receive"
      :receiving="receiving"
      :creatingInvoice="receivingLightning"
      :invoice="receiveLightningInvoice"
      qrCanvasId="cashu-receive-invoice-qr"
      @close="closeReceiveModal"
      @receiveEcash="handleReceiveCashu"
      @createInvoice="handleReceiveCashuLightning"
      @copy="copyToClipboard"
      @back="handleBackToCashuReceiveOptions"
    />

    <!-- Deposit Modal (Arkade) -->
    <ArkadeDepositModal 
      :show="modals.arkadeDeposit"
      :isInitialized="arkade.isInitialized.value"
      :initializationError="arkade.initializationError.value"
      :loading="loading"
      :depositAddress="arkadeDepositAddress"
      :depositAddressType="arkadeDepositAddressType"
      :qrCodeData="arkadeInvoiceQRCode"
      @close="closeArkadeDepositModal"
      @getArkAddress="handleGetArkAddress"
      @getArkOffchainAddress="handleGetArkOffchainAddress"
      @onboardBitcoin="handleOnboardBitcoin"
      @createLightningInvoice="handleCreateArkadeLightningInvoice"
      @copy="copyToClipboard"
      @back="handleBackToDepositOptions"
    />

    <!-- Arkade Private Key Modal -->
    <PrivateKeyModal 
      :show="modals.arkadePrivateKey"
      :privateKey="arkade.privateKey"
      @close="closeModal('arkadePrivateKey')"
      @copy="copyToClipboard"
    />

    <!-- VTXO Display Modal -->
    <VTXOsModal 
      :show="modals.vtxos"
      :vtxos="vtxos"
      @close="closeModal('vtxos')"
    />

    <!-- Arkade Send Modal -->
    <ArkadeSendModal 
      :show="modals.arkadeSend"
      :sending="sending"
      :balance="arkadeBalance"
      @close="closeArkadeSendModal"
      @send="handleSendArkade"
    />

    <!-- Messages -->
    <Toast :message="message" :type="messageType" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useWalletBridge } from '../composables/useWalletBridge'
import { useArkadeWallet } from '../composables/useArkadeWallet'
import { useToast } from '../composables/useToast'
import { useClipboard } from '../composables/useClipboard'
import { useQRCode } from '../composables/useQRCode'
import { useModalState } from '../composables/useModalState'
import CashuSendModal from './modals/CashuSendModal.vue'
import CashuReceiveModal from './modals/CashuReceiveModal.vue'
import ArkadeDepositModal from './modals/ArkadeDepositModal.vue'
import ArkadeSendModal from './modals/ArkadeSendModal.vue'
import VTXOsModal from './modals/VTXOsModal.vue'
import PrivateKeyModal from './modals/PrivateKeyModal.vue'
import CashuWalletView from './wallets/CashuWalletView.vue'
import ArkadeWalletView from './wallets/ArkadeWalletView.vue'
import WalletTabs from './ui/WalletTabs.vue'
import DropdownMenu from './ui/DropdownMenu.vue'
import Toast from './ui/Toast.vue'

const {
  cashuBalance,
  arkadeBalance: arkadeBridgeBalance,
  encryptArkadeFunds,
  decryptArkadeFunds,
  encryptionInProgress,
  encryptionStep,
  daysAtRest,
  initializeBothWallets,
  cashu,
  arkade: arkadeBridge,
  cashuMintUrl
} = useWalletBridge()

const arkade = useArkadeWallet()

// Composables
const { message, messageType, showSuccess, showError, showInfo } = useToast()
const { copyToClipboard } = useClipboard()
const { generateQR, generateQRDataURL } = useQRCode()
const { modals, openModal, closeModal } = useModalState()

const arkadeBalance = computed(() => {
  console.log('=== UNIFIED WALLET BALANCE DEBUG ===')
  console.log('arkade.balance.value:', arkade.balance.value)
  console.log('typeof arkade.balance.value:', typeof arkade.balance.value)
  
  // Convert BigInt to string for display
  let result = '0'
  if (arkade.balance.value) {
    if (typeof arkade.balance.value === 'bigint') {
      result = arkade.balance.value.toString()
    } else if (typeof arkade.balance.value === 'number') {
      result = arkade.balance.value.toString()
    } else if (typeof arkade.balance.value === 'string') {
      result = arkade.balance.value
    } else {
      result = '0'
    }
  }
  
  console.log('arkadeBalance result:', result)
  console.log('===================================')
  return result
})

// State
const activeTab = ref('arkade')
const rightPanelView = ref('vtxos') // 'vtxos' or 'deposit' (Arkade panel)
const cashuRightPanelView = ref('decrypt') // 'decrypt' or 'withdraw' (Cashu panel)
const encryptAmountArkade = ref(null)
const decryptAmount = ref(null)
const withdrawAmount = ref(null)
const withdrawAddress = ref('')
const withdrawing = ref(false)
const sendToken = ref('')
const showMenu = ref(false)
const arkadeDepositAddress = ref('')
const arkadeDepositAddressType = ref('')
const arkadeInvoiceQRCode = ref('')
const vtxos = ref([])
const selectedVtxo = ref(null) // For Arkade encryption
const selectedWithdrawVtxo = ref(null) // For Cashu withdrawal
const boardingBalance = ref(0)
const sending = ref(false)
const receiving = ref(false)
const loading = ref(false)
const refreshing = ref(false)
const restoring = ref(false)
const decrypting = ref(false)
const verifying = ref(false)
const receiveLightningInvoice = ref('')
const receiveLightningQuote = ref(null)
const receiveLightningAmount = ref(null)
const receivingLightning = ref(false)
const isMintingFromLightning = ref(false) // Lock to prevent concurrent minting
let cashuReceivePollingInterval = null

// Computed
const canEncryptFromArkade = computed(() => {
  return encryptAmountArkade.value && 
         encryptAmountArkade.value > 0 && 
         parseInt(arkadeBalance.value) >= encryptAmountArkade.value &&
         !encryptionInProgress.value
})

const mintUrlShort = computed(() => {
  if (!cashuMintUrl.value) return 'Cashu Mint'
  try {
    const url = new URL(cashuMintUrl.value)
    const hostname = url.hostname
    // Format the hostname to be more readable (capitalize first letter, etc.)
    if (hostname.includes('garden')) return 'Garden Finance'
    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1)
  } catch {
    return cashuMintUrl.value.substring(0, 30) + '...'
  }
})

const estimatedFee = computed(() => {
  // Fixed 3 sat fee (matches useWalletBridge hardcoded value)
  return '~3'
})

// Methods
const handleDecryptToArkade = async () => {
  const amount = decryptAmount.value || parseInt(cashuBalance.value)
  if (!confirm(`Decrypt ${amount} sats back to Arkade wallet?`)) return
  
  decrypting.value = true
  try {
    const result = await decryptArkadeFunds(amount)
    if (result.success) {
      showSuccess(`✅ Successfully decrypted ${result.amount} sats to Arkade!`)
      decryptAmount.value = null // Clear input
      setTimeout(() => {
        activeTab.value = 'arkade'
      }, 2000)
    }
  } catch (error) {
    console.error('Decrypt to Arkade error:', error)
    showError(`❌ Decryption failed: ${error.message}`)
  } finally {
    decrypting.value = false
  }
}

const handleWithdrawBitcoin = async () => {
  const vtxo = selectedWithdrawVtxo.value
  const address = withdrawAddress.value
  
  if (!vtxo || !address) {
    showError('Please select a VTXO and enter Bitcoin address')
    return
  }
  
  const amount = vtxo.value || 0
  
  if (!confirm(`Withdraw ${amount} sats to ${address}?\n\nThis will exit the selected VTXO from Ark to Bitcoin L1.`)) return
  
  withdrawing.value = true
  try {
    await arkade.cooperativeExit(address, amount)
    showSuccess(`✅ Successfully initiated withdrawal of ${amount} sats!`)
    
    // Clear selection and input
    selectedWithdrawVtxo.value = null
    withdrawAmount.value = null
    withdrawAddress.value = ''
    
    // Refresh VTXOs and balances
    await handleLoadVTXOs()
    await arkade.updateBalance()
  } catch (error) {
    console.error('Withdraw error:', error)
    showError(`❌ Withdrawal failed: ${error.message}`)
  } finally {
    withdrawing.value = false
  }
}

const handleSendCashu = async (amount) => {
  // Prevent double-clicks
  if (sending.value) {
    console.warn('Already creating token, please wait...')
    return
  }
  
  sending.value = true
  try {
    console.log('Creating send token for amount:', amount)
    const token = await cashu.send(amount)
    sendToken.value = token
    showSuccess('✅ Token created! Copy it before closing.')
  } catch (error) {
    console.error('Failed to create send token:', error)
    showError(`❌ Failed to send: ${error.message}`)
  } finally {
    sending.value = false
  }
}

const handlePayCashuLightning = async (invoice, callback) => {
  // Prevent double-clicks
  if (sending.value) {
    console.warn('Already paying invoice, please wait...')
    return
  }
  
  sending.value = true
  try {
    console.log('Paying Lightning invoice from Cashu wallet...')
    const result = await cashu.payLightningInvoice(invoice)
    showSuccess(`✅ Lightning invoice paid! Amount: ${result.amount} sats, Fee: ${result.fee} sats`)
    
    // Call the callback to update the UI
    if (callback) {
      callback(result)
    }
  } catch (error) {
    console.error('Failed to pay Lightning invoice:', error)
    showError(`❌ Failed to pay invoice: ${error.message}`)
  } finally {
    sending.value = false
  }
}

const handleReceiveCashu = async (token) => {
  receiving.value = true
  try {
    await cashu.receive(token)
    showSuccess('✅ Tokens received!')
    sendToken.value = ''
    closeModal('receive')
  } catch (error) {
    showError(`❌ Failed to receive: ${error.message}`)
  } finally {
    receiving.value = false
  }
}

const handleReceiveCashuLightning = async (amount) => {
  receivingLightning.value = true
  try {
    // Store the amount so we can use it later when minting
    receiveLightningAmount.value = amount
    
    // Create a mint quote to get an invoice for receiving Lightning payment
    const quote = await cashu.requestMint(amount)
    console.log('Cashu receive Lightning quote created:', quote)
    receiveLightningQuote.value = quote
    receiveLightningInvoice.value = quote.request || quote.payment_request || quote.pr
    showSuccess('Invoice created! Share it to receive payment')
    
    // Generate QR code for the invoice
    await nextTick()
    const invoiceString = receiveLightningInvoice.value
    
    if (invoiceString) {
      await generateQR(invoiceString.toUpperCase(), 'cashu-receive-invoice-qr', {
        color: {
          dark: '#667eea',
          light: '#ffffff'
        }
      })
    }
    
    // Start automatic polling to check if invoice is paid
    startCashuReceivePolling()
  } catch (error) {
    console.error('Full error:', error)
    showError(`❌ Failed to create invoice: ${error.message}`)
  } finally {
    receivingLightning.value = false
  }
}

const startCashuReceivePolling = () => {
  if (cashuReceivePollingInterval) {
    clearInterval(cashuReceivePollingInterval)
  }
  
  cashuReceivePollingInterval = setInterval(async () => {
    await checkCashuReceiveLightningQuote()
  }, 2000)
}

const stopCashuReceivePolling = () => {
  if (cashuReceivePollingInterval) {
    clearInterval(cashuReceivePollingInterval)
    cashuReceivePollingInterval = null
  }
}

const checkCashuReceiveLightningQuote = async () => {
  try {
    if (!receiveLightningQuote.value) return
    
    // Prevent concurrent minting attempts
    if (isMintingFromLightning.value) {
      console.log('⏳ Minting already in progress, skipping...')
      return
    }
    
    const status = await cashu.checkPendingQuote(receiveLightningQuote.value.quote)
    console.log('Cashu receive quote status:', status)
    
    if (status.state === 'PAID' || status.paid) {
      // Stop polling IMMEDIATELY to prevent duplicate attempts
      stopCashuReceivePolling()
      
      // Set lock to prevent concurrent minting
      isMintingFromLightning.value = true
      console.log('🔒 Invoice paid! Minting tokens (lock acquired)...')
      
      try {
        await cashu.mintTokens(receiveLightningAmount.value, receiveLightningQuote.value.quote)
        showSuccess(`✅ Received ${receiveLightningAmount.value} sats via Lightning!`)
        receiveLightningQuote.value = null
        receiveLightningAmount.value = null
        receiveLightningInvoice.value = ''
        closeReceiveModal()
      } catch (mintError) {
        console.error('Mint error during receive:', mintError)
        
        // If tokens were minted but there was an error (like recovery failure),
        // still show success but inform user to check balance
        if (mintError.message.includes('already been signed') || 
            mintError.message.includes('recovery failed') ||
            mintError.message.includes('already spent')) {
          showInfo(`⚠️ Payment received! Tokens may already be in your wallet. Check your balance or use "Restore from Seed".`)
          receiveLightningQuote.value = null
          receiveLightningAmount.value = null
          receiveLightningInvoice.value = ''
          closeReceiveModal()
        } else {
          throw mintError
        }
      } finally {
        // Always release the lock
        isMintingFromLightning.value = false
        console.log('🔓 Minting lock released')
      }
    }
  } catch (error) {
    console.error('Error checking Cashu receive quote:', error)
    if (cashuReceivePollingInterval) {
      console.warn('Cashu receive polling check failed, will retry...')
    } else {
      showError(`❌ Failed to check quote: ${error.message}`)
    }
  }
}

const closeReceiveModal = () => {
  closeModal('receive')
  stopCashuReceivePolling()
  receiveLightningInvoice.value = ''
  receiveLightningQuote.value = null
  receiveLightningAmount.value = null
  isMintingFromLightning.value = false // Release lock on modal close
}

const handleBackToCashuReceiveOptions = () => {
  stopCashuReceivePolling()
  receiveLightningInvoice.value = ''
  receiveLightningQuote.value = null
  receiveLightningAmount.value = null
  isMintingFromLightning.value = false
}

const handleBackToCashuSendOptions = () => {
  sendToken.value = ''
}

const handleVerifyBalance = async () => {
  verifying.value = true
  try {
    showInfo('🔍 Verifying balance with mint...')
    const verifiedBalance = await cashu.verifyAndCalculateBalance()
    showSuccess(`✅ Balance verified: ${verifiedBalance} sats`)
  } catch (error) {
    console.error('Failed to verify balance:', error)
    showError(`❌ Verification failed: ${error.message}`)
  } finally {
    verifying.value = false
  }
}


const handleGetLastToken = () => {
  try {
    const lastToken = cashu.getLastCreatedToken()
    if (lastToken) {
      // Show the token in the send modal
      sendToken.value = lastToken.token
      openModal('send')
      
      const timeText = lastToken.minutesAgo === 0 
        ? 'just now' 
        : `${lastToken.minutesAgo} minute${lastToken.minutesAgo > 1 ? 's' : ''} ago`
      showSuccess(`✅ Retrieved token created ${timeText}`)
    } else {
      showInfo('No recent token found. Create a send token first.')
    }
  } catch (error) {
    showError(`❌ Failed to retrieve token: ${error.message}`)
  }
}


const handleRestoreCashu = async () => {
  console.log('🔧 handleRestoreCashu called!')
  restoring.value = true
  try {
    showInfo('🔄 Restoring from seed (scanning 0-100)...')
    console.log('Calling cashu.restoreFromSeed()...')
    const result = await cashu.restoreFromSeed({ start: 0, count: 100 })
    console.log('Restore result:', result)
    if (result.added > 0) {
      let msg = `✅ Restored ${result.added} token(s)!`
      if (result.skipped && result.skipped > 0) {
        msg += ` (Skipped ${result.skipped} spent proof(s))`
      }
      msg += ` Found ${result.found} total.`
      showMessage(msg, 'success')
    } else if (result.skipped && result.skipped > 0) {
      showInfo(`⚠️ Found ${result.found} proof(s) but all were spent. No tokens restored.`)
    } else {
      showInfo(`ℹ️ No new tokens found. Scanned ${result.found} tokens.`)
    }
  } catch (error) {
    console.error('Restore error:', error)
    showError(`❌ Restore failed: ${error.message}`)
  } finally {
    restoring.value = false
  }
}


// copyToClipboard now provided by useClipboard composable

// Arkade handlers
const handleEncryptOrDepositArkade = () => {
  if (!arkadeBalance.value || arkadeBalance.value === '0') {
    // Open deposit modal if balance is 0
    openModal('arkadeDeposit')
  } else {
    // Otherwise, encrypt
    handleEncryptFromArkade()
  }
}

const handleEncryptFromArkade = async () => {
  if (!arkadeBalance.value || arkadeBalance.value === '0') {
    showInfo('⚠️ Please deposit funds to Arkade first')
    return
  }
  
  if (!encryptAmountArkade.value || encryptAmountArkade.value <= 0) {
    showInfo('⚠️ Please enter an amount to encrypt')
    return
  }
  
  try {
    showInfo('🔒 Encrypting from Arkade to Cashu...')
    const result = await encryptArkadeFunds(encryptAmountArkade.value)
    
    if (result.success) {
      showSuccess(`✅ Successfully encrypted ${result.amount} sats from Arkade to Cashu!`)
      encryptAmountArkade.value = null
      selectedVtxo.value = null // Clear VTXO selection
      // Auto-switch to encrypted view to show the new balance
      setTimeout(() => {
        activeTab.value = 'encrypted'
      }, 2000)
    }
  } catch (error) {
    console.error('Encrypt from Arkade error:', error)
    showError(`❌ Encryption failed: ${error.message}`)
  }
}

const handleGetArkAddress = async () => {
  loading.value = true
  try {
    const address = await arkade.updateAddress()
    arkadeDepositAddress.value = address
    arkadeDepositAddressType.value = 'Ark Onchain Address'
    showSuccess('✅ Ark address retrieved!')
  } catch (error) {
    showError(`❌ Failed to get address: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const handleGetArkOffchainAddress = async () => {
  loading.value = true
  try {
    const address = await arkade.getBitcoinDepositAddress()
    arkadeDepositAddress.value = address
    arkadeDepositAddressType.value = 'Bitcoin Boarding Address'
    showSuccess('✅ Bitcoin boarding address retrieved!')
    
    // Generate QR code after address is set
    await nextTick()
    // Small delay to ensure canvas is rendered
    setTimeout(async () => {
      if (address) {
        const success = await generateQR(address, 'deposit-address-qr', {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 200,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        if (!success) {
          console.error('QR code generation failed')
        }
      }
    }, 100)
  } catch (error) {
    showError(`❌ Failed to get boarding address: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// Watch for rightPanelView changes to deposit and automatically load address
watch(rightPanelView, async (newView) => {
  if (newView === 'deposit') {
    if (!arkadeDepositAddress.value) {
      await handleGetArkOffchainAddress()
    } else {
      // If address already exists, just regenerate the QR code
      await nextTick()
      try {
        await generateQR(arkadeDepositAddress.value, 'deposit-address-qr', {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 200,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
      } catch (error) {
        console.error('Failed to generate QR code:', error)
      }
    }
  } else if (newView === 'vtxos') {
    // Auto-load VTXOs and boarding balance when switching to VTXOs tab
    await handleLoadVTXOs()
  }
}, { immediate: true })

const handleOnboardBitcoin = async () => {
  loading.value = true
  try {
    showInfo('🚀 Onboarding Bitcoin to Ark...')
    showInfo('⏱️ Please wait 1-3 minutes for ASP round to process...')
    
    const txid = await arkade.onboardBoardingUtxos()
    
    showSuccess(`✅ Bitcoin onboarded! TXID: ${txid.substring(0, 8)}...`)
    showSuccess('🎉 Your Bitcoin is now Ark VTXOs!')
    
    // Close the deposit modal after successful onboarding
    setTimeout(() => closeArkadeDepositModal(), 2000)
  } catch (error) {
    console.error('Onboard error:', error)
    
    // Provide user-friendly error messages
    if (error.message && error.message.includes('timeout')) {
      showError('❌ Onboarding timed out. The ASP may be busy. Please try again in 1-2 minutes.')
    } else if (error.message && error.message.includes('SIGNING_SESSION')) {
      showError('❌ MuSig2 signing failed. The ASP may be processing another round. Retry in 1-2 minutes.')
    } else {
      showError(`❌ Onboard failed: ${error.message}`)
    }
  } finally {
    loading.value = false
  }
}

const handleCreateArkadeLightningInvoice = async ({ amount, memo }) => {
  loading.value = true
  try {
    // Parse amount as integer
    const parsedAmount = parseInt(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount')
    }
    
    const invoice = await arkade.receiveBolt11(
      parsedAmount,
      memo || 'Deposit to Arkade Wallet'
    )
    
    arkadeDepositAddress.value = invoice
    arkadeDepositAddressType.value = 'Lightning Invoice (via Boltz Swap)'
    showSuccess('✅ Lightning invoice created! Monitoring for payment...')
    
    // Generate QR code for the invoice
    try {
      arkadeInvoiceQRCode.value = await generateQRDataURL(invoice, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300
      })
      console.log('QR code generated successfully')
    } catch (qrError) {
      console.error('Failed to generate QR code:', qrError)
    }
    
    // Monitor balance for changes (payment received)
    const initialBalance = arkadeBalance.value
    const checkInterval = setInterval(async () => {
      try {
        await arkade.updateBalance()
        if (arkadeBalance.value !== initialBalance) {
          clearInterval(checkInterval)
          showSuccess('✅ Lightning payment received!')
          closeArkadeDepositModal()
        }
      } catch (e) {
        console.error('Error checking balance:', e)
      }
    }, 3000) // Check every 3 seconds
    
    // Stop checking after 10 minutes
    setTimeout(() => clearInterval(checkInterval), 600000)
  } catch (error) {
    showError(`❌ Failed to create invoice: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const closeArkadeDepositModal = () => {
  closeModal('arkadeDeposit')
  arkadeDepositAddress.value = ''
  arkadeDepositAddressType.value = ''
  arkadeInvoiceQRCode.value = ''
}

const handleBackToDepositOptions = () => {
  arkadeDepositAddress.value = ''
  arkadeDepositAddressType.value = ''
  arkadeInvoiceQRCode.value = ''
}

const handleResetArkadeWallet = async () => {
  if (!confirm('This will reset your Arkade wallet and create a new one. Make sure you have backed up your private key! Continue?')) {
    return
  }
  
  try {
    arkade.resetWallet()
    showInfo('Arkade wallet reset. Reinitializing...')
    
    // Wait a moment then try to initialize again
    setTimeout(async () => {
      try {
        await arkade.initialize(null, true) // forceNew = true
        showSuccess('✅ Arkade wallet reinitialized successfully!')
      } catch (error) {
        showError(`Failed to reinitialize: ${error.message}`)
      }
    }, 1000)
  } catch (error) {
    showError(`Reset failed: ${error.message}`)
  }
}

const handleLoadVTXOs = async () => {
  loading.value = true
  try {
    // Get balance to check boarding amount
    const balanceData = await arkade.updateBalance()
    console.log('Balance data:', balanceData)
    
    // Extract boarding confirmed balance
    if (balanceData && balanceData.boarding) {
      if (typeof balanceData.boarding === 'object') {
        boardingBalance.value = Number(balanceData.boarding.confirmed || 0)
      } else {
        boardingBalance.value = Number(balanceData.boarding || 0)
      }
    } else {
      boardingBalance.value = 0
    }
    
    console.log('Boarding balance:', boardingBalance.value)
    
    const allVtxos = await arkade.getVTXOs()
    console.log('All VTXOs from SDK:', allVtxos)
    console.log('Available balance:', arkadeBalance.value)
    
    // Filter to only show: settled, pre-confirmed, or confirmed VTXOs
    // AND only show unspent VTXOs (part of current balance)
    const filteredVtxos = allVtxos.filter(vtxo => {
      console.log('=== VTXO FILTER DEBUG ===')
      console.log('Full VTXO object:', JSON.parse(JSON.stringify(vtxo)))
      console.log('VTXO value:', vtxo.value)
      console.log('VTXO isSpent:', vtxo.isSpent)
      console.log('VTXO isUnrolled:', vtxo.isUnrolled)
      console.log('VTXO spentBy:', vtxo.spentBy)
      console.log('VTXO settledBy:', vtxo.settledBy)
      console.log('VTXO isSpendable:', vtxo.isSpendable)
      console.log('VTXO redeemedAt:', vtxo.redeemedAt)
      console.log('VTXO virtualStatus:', vtxo.virtualStatus)
      console.log('VTXO physicalStatus:', vtxo.physicalStatus)
      console.log('VTXO isPending:', vtxo.isPending)
      console.log('VTXO pendingOutbound:', vtxo.pendingOutbound)
      
      // First check: Only show unspent VTXOs (current balance)
      // More strict: must NOT be spent, redeemed, or unrolled
      const isUnspent = !vtxo.isSpent && !vtxo.spentBy && !vtxo.redeemedAt && !vtxo.isUnrolled
      console.log('Is unspent:', isUnspent)
      
      if (!isUnspent) {
        console.log('Filtered out: VTXO is spent/redeemed/unrolled')
        console.log('========================')
        return false
      }
      
      // Check if explicitly marked as not spendable
      if (vtxo.isSpendable === false) {
        console.log('Filtered out: VTXO is not spendable')
        console.log('========================')
        return false
      }
      
      // Check if VTXO is pending outbound (sent to someone else)
      if (vtxo.isPending || vtxo.pendingOutbound) {
        console.log('Filtered out: VTXO is pending outbound')
        console.log('========================')
        return false
      }
      
      // Check physical status - filter out anything that's not "settled" on-chain
      if (vtxo.physicalStatus && vtxo.physicalStatus.state) {
        const physicalState = String(vtxo.physicalStatus.state).toLowerCase()
        console.log('Physical status state:', physicalState)
        
        // Only allow VTXOs with settled physical status (on-chain confirmed)
        if (physicalState !== 'settled') {
          console.log('Filtered out: Physical status is not settled:', physicalState)
          console.log('========================')
          return false
        }
      }
      
      // The actual status is in virtualStatus.state, not status
      let statusStr = ''
      
      // First check virtualStatus.state (this is the correct location)
      if (vtxo.virtualStatus && vtxo.virtualStatus.state) {
        statusStr = String(vtxo.virtualStatus.state).toLowerCase()
        console.log('Found status in virtualStatus.state:', statusStr)
      }
      // Fallback to other locations
      else if (typeof vtxo.status === 'string') {
        statusStr = vtxo.status.toLowerCase()
      } else if (typeof vtxo.status === 'number') {
        // Status might be an enum - map numbers to strings
        const statusMap = {
          0: 'settled',
          1: 'confirmed',
          2: 'preconfirmed',
          3: 'pending',
          4: 'recoverable'
        }
        statusStr = (statusMap[vtxo.status] || '').toLowerCase()
      } else if (vtxo.status && typeof vtxo.status === 'object') {
        // Try multiple possible property names
        const possibleStatus = vtxo.status.value || 
                              vtxo.status.type || 
                              vtxo.status.state || 
                              vtxo.status.name ||
                              vtxo.status.status
        statusStr = String(possibleStatus || '').toLowerCase()
      }
      
      // Also check if the VTXO object itself has a direct status indicator
      if (!statusStr && vtxo.state) {
        statusStr = String(vtxo.state).toLowerCase()
      }
      
      // Show settled, pre-confirmed, and confirmed VTXOs
      const isMatch = statusStr === 'settled' || 
                      statusStr === 'pre-confirmed' || 
                      statusStr === 'preconfirmed' ||
                      statusStr === 'confirmed'
      
      console.log('Status string:', statusStr, 'Match:', isMatch)
      console.log('========================')
      return isMatch
    })
    
    console.log('Filtered VTXOs (before balance check):', filteredVtxos)
    console.log('Total VTXO value:', filteredVtxos.reduce((sum, v) => sum + (v.value || 0), 0))
    
    // Final filter: Only show VTXOs that match the available balance
    // Sort by creation date (newest first) and take VTXOs until we match the balance
    const sortedVtxos = [...filteredVtxos].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA // Newest first
    })
    
    const targetBalance = arkadeBalance.value
    console.log('Target balance:', targetBalance)
    console.log('All filtered VTXOs:', sortedVtxos.map(v => ({ value: v.value, createdAt: v.createdAt })))
    
    // Strategy: Take VTXOs greedily but stop if adding the next one would exceed the balance
    let runningTotal = 0
    const finalVtxos = []
    
    for (const vtxo of sortedVtxos) {
      const vtxoValue = vtxo.value || 0
      const newTotal = runningTotal + vtxoValue
      
      console.log(`Considering VTXO: ${vtxoValue} sats. Current total: ${runningTotal}, new total would be: ${newTotal}`)
      
      // Only add if it doesn't exceed the target balance
      if (newTotal <= targetBalance) {
        finalVtxos.push(vtxo)
        runningTotal = newTotal
        console.log(`✓ Added VTXO: ${vtxoValue} sats, running total: ${runningTotal}`)
      } else {
        console.log(`✗ Skipped VTXO: ${vtxoValue} sats (would exceed balance: ${newTotal} > ${targetBalance})`)
      }
      
      // If we've exactly matched the balance, stop
      if (runningTotal === targetBalance) {
        console.log(`✓ Exact match reached: ${runningTotal} === ${targetBalance}`)
        break
      }
    }
    
    console.log('Final VTXOs:', finalVtxos)
    console.log('Final total:', runningTotal)
    
    vtxos.value = finalVtxos
    showMenu.value = false
    showSuccess(`✅ Loaded ${filteredVtxos.length} VTXOs${boardingBalance.value > 0 ? ` • ${boardingBalance.value} sats ready to board` : ''}`)
  } catch (error) {
    console.error('Load VTXOs error:', error)
    showError(`❌ Failed to load VTXOs: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const selectVtxo = (vtxo) => {
  // Toggle selection
  if (selectedVtxo.value === vtxo) {
    selectedVtxo.value = null
    encryptAmountArkade.value = null
    showInfo('VTXO deselected')
  } else {
    selectedVtxo.value = vtxo
    // Auto-fill the encrypt amount with the VTXO value MINUS fee
    // Fee calculation matches useWalletBridge: 5% with 10 sat minimum
    const vtxoAmount = vtxo.value || 0
    const fee = Math.max(10, Math.ceil(vtxoAmount * 0.05))
    const receiveAmount = vtxoAmount - fee
    encryptAmountArkade.value = receiveAmount
    showSuccess(`✅ Selected ${vtxoAmount} sats VTXO → You'll receive ${receiveAmount} sats (~${fee} sat routing fee)`)
  }
}

const selectWithdrawVtxo = (vtxo) => {
  // Toggle selection
  if (selectedWithdrawVtxo.value === vtxo) {
    selectedWithdrawVtxo.value = null
    withdrawAmount.value = null
    showInfo('VTXO deselected')
  } else {
    selectedWithdrawVtxo.value = vtxo
    // Auto-fill the withdraw amount with the VTXO value
    const vtxoAmount = vtxo.value || 0
    withdrawAmount.value = vtxoAmount
    showSuccess(`✅ Selected ${vtxoAmount} sats VTXO for withdrawal`)
  }
}

const handleSendArkade = async ({ address, amount }) => {
  sending.value = true
  try {
    if (!address || !amount) {
      showError('⚠️ Please enter address and amount')
      return
    }
    
    if (parseInt(arkadeBalance.value) < amount) {
      showError('⚠️ Insufficient balance')
      return
    }
    
    showInfo('📤 Sending to Ark address...')
    
    const result = await arkade.sendPayment(address, amount)
    
    showSuccess(`✅ Sent ${amount} sats! TxID: ${result?.substring(0, 12)}...`)
    closeArkadeSendModal()
    
  } catch (error) {
    console.error('Failed to send:', error)
    showError(`❌ Send failed: ${error.message}`)
  } finally {
    sending.value = false
  }
}

const closeArkadeSendModal = () => {
  closeModal('arkadeSend')
}

// Helper functions for VTXO status
const getVtxoStatusLabel = (vtxo) => {
  // The actual status is in virtualStatus.state
  let statusStr = ''
  
  if (vtxo.virtualStatus && vtxo.virtualStatus.state) {
    statusStr = String(vtxo.virtualStatus.state).toLowerCase()
  } else if (typeof vtxo.status === 'string') {
    statusStr = vtxo.status.toLowerCase()
  } else if (typeof vtxo.status === 'number') {
    const statusMap = {
      0: 'settled',
      1: 'confirmed',
      2: 'preconfirmed',
      3: 'pending',
      4: 'recoverable'
    }
    statusStr = (statusMap[vtxo.status] || 'unknown').toLowerCase()
  } else if (vtxo.status && typeof vtxo.status === 'object') {
    statusStr = String(vtxo.status.value || vtxo.status.type || 'unknown').toLowerCase()
  } else {
    statusStr = 'unknown'
  }
  
  if (statusStr === 'settled') return '✓ Settled'
  if (statusStr === 'pre-confirmed' || statusStr === 'preconfirmed') return '⏳ Pre-Confirmed'
  if (statusStr === 'confirmed') return '🔗 Confirmed'
  
  return statusStr.charAt(0).toUpperCase() + statusStr.slice(1)
}

const getVtxoStatusClass = (vtxo) => {
  // The actual status is in virtualStatus.state
  let statusStr = ''
  
  if (vtxo.virtualStatus && vtxo.virtualStatus.state) {
    statusStr = String(vtxo.virtualStatus.state).toLowerCase()
  } else if (typeof vtxo.status === 'string') {
    statusStr = vtxo.status.toLowerCase()
  } else if (typeof vtxo.status === 'number') {
    const statusMap = {
      0: 'settled',
      1: 'confirmed',
      2: 'preconfirmed',
      3: 'pending',
      4: 'recoverable'
    }
    statusStr = (statusMap[vtxo.status] || '').toLowerCase()
  } else if (vtxo.status && typeof vtxo.status === 'object') {
    statusStr = String(vtxo.status.value || vtxo.status.type || '').toLowerCase()
  }
  
  if (statusStr === 'settled') return 'status-settled'
  if (statusStr === 'pre-confirmed' || statusStr === 'preconfirmed') return 'status-preconfirmed'
  if (statusStr === 'confirmed') return 'status-confirmed'
  
  return 'status-default'
}

// Initialize on mount
onMounted(async () => {
  try {
    // Initialize Cashu wallet
    await cashu.initialize()
    console.log('Cashu wallet initialized')
    
    // Initialize Arkade wallet
    try {
      await arkade.initialize()
      console.log('Arkade wallet initialized')
    } catch (error) {
      console.error('Failed to initialize Arkade wallet:', error)
      // Don't fail the entire mount, just log it
    }
  } catch (error) {
    console.error('Failed to initialize:', error)
    showError('Failed to initialize wallets. Please refresh.')
  }
})

onUnmounted(() => {
  // Cleanup polling intervals when component is unmounted
  stopCashuReceivePolling()
})
</script>

<style scoped src="../styles/components/unified-wallet.css"></style>
