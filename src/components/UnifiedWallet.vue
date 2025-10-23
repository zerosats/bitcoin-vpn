<template>
  <div class="unified-wallet" :class="{ 'encrypted-mode': activeTab === 'encrypted' }">
    <!-- Tab Toggle -->
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
              {{ loading ? '📦 Loading...' : '📦 View VTXOs' }}
            </button>
          </template>
        </DropdownMenu>
      </template>
    </WalletTabs>

    <!-- Encrypted View (Cashu) -->
    <CashuWalletView 
      v-if="activeTab === 'encrypted'"
      :balance="cashuBalance"
      @send="openModal('send')"
      @receive="openModal('receive')"
    />

    <!-- Arkade View -->
    <ArkadeWalletView 
      v-if="activeTab === 'arkade'"
      :balance="arkadeBalance"
      v-model:encryptAmount="encryptAmountArkade"
      :mintUrlShort="mintUrlShort"
      :estimatedFee="estimatedFee"
      :encryptionInProgress="encryptionInProgress"
      :encryptionStep="encryptionStep"
      :canEncrypt="canEncryptFromArkade"
      @encryptOrDeposit="handleEncryptOrDepositArkade"
    />

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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
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
const encryptAmountArkade = ref(null)
const sendToken = ref('')
const showMenu = ref(false)
const arkadeDepositAddress = ref('')
const arkadeDepositAddressType = ref('')
const arkadeInvoiceQRCode = ref('')
const vtxos = ref([])
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
  if (!confirm('Decrypt all funds back to Arkade wallet?')) return
  
  decrypting.value = true
  try {
    const amount = parseInt(cashuBalance.value)
    const result = await decryptArkadeFunds(amount)
    if (result.success) {
      showSuccess(`✅ Successfully decrypted ${result.amount} sats to Arkade!`)
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
  } catch (error) {
    showError(`❌ Failed to get boarding address: ${error.message}`)
  } finally {
    loading.value = false
  }
}

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
    const vtxoList = await arkade.getVTXOs()
    vtxos.value = vtxoList
    openModal('vtxos')
    showMenu.value = false
    showSuccess(`✅ Loaded ${vtxoList.length} VTXOs`)
  } catch (error) {
    showError(`❌ Failed to load VTXOs: ${error.message}`)
  } finally {
    loading.value = false
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

<style scoped>
.unified-wallet {
  min-height: 100vh;
  padding: 2.5rem;
  transition: background 0.5s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0;
  max-width: 600px;
  margin: 0 auto;
  background: #171A21;
}

/* Wallet Views */
.wallet-view {
  max-width: 500px;
  margin: 0 auto;
  color: white;
}

/* Balance Display */
.balance-display {
  text-align: left;
  margin-bottom: 2.5rem;
  padding: 0;
}

.unprotected .balance-display {
  margin-bottom: 0.5rem;
}

.balance-label {
  font-size: 0.9rem;
  letter-spacing: 2px;
  opacity: 0.7;
  margin-bottom: 1rem;
  color: #00F2E1;
  text-transform: uppercase;
}

.balance-amount {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #4fc3f7 0%, #66ffc1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.encrypted-mode .unprotected .balance-amount {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.unit {
  font-size: 1.5rem;
  opacity: 0.6;
  margin-left: 0.5rem;
  color: white;
  -webkit-text-fill-color: rgba(255, 255, 255, 0.6);
}

/* Time at Rest */
.time-at-rest {
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.time-label {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-bottom: 1rem;
}

.days-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.days-badge {
  background: linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%);
  color: #0a1628;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  font-weight: 800;
  font-size: 1.1rem;
}

.target-text {
  font-size: 0.85rem;
  opacity: 0.6;
}

.progress-bar-container {
  background: rgba(255, 255, 255, 0.1);
  height: 8px;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar {
  background: linear-gradient(90deg, #a8ff78 0%, #78ffd6 100%);
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
}

/* New Time at Rest */
.time-at-rest-new {
  margin-bottom: 2rem;
}

.time-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.6;
}

.time-label-new {
  color: rgba(255, 255, 255, 0.8);
}

.time-target {
  color: #616877;
  font-size: 0.875rem;
}

.time-progress-card {
  background: rgba(45, 49, 60, 0.4);
  border-radius: 14px;
  height: 72px;
  overflow: hidden;
  box-shadow: inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.time-progress-fill {
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 100%);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.5s ease;
  min-width: 144px;
  border-radius: 14px 0 0 14px;
}

.days-text {
  color: #161920;
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: 0.44px;
  line-height: 1.6;
}

/* Action Buttons */
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.action-btn {
  padding: 1.25rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%);
  color: #0a1628;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(168, 255, 120, 0.4);
}

/* New Action Buttons */
.action-buttons-new {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
  margin-bottom: 2rem;
}

.action-btn-gradient {
  height: 161px;
  border: none;
  border-radius: 14px;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.6592px;
  line-height: 0.9;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 100%);
  color: #161920;
  box-shadow: inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.action-btn-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 217, 0, 0.4), inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.info-text-encrypted {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #586b79;
  text-align: center;
  opacity: 0.8;
  margin-bottom: 2rem;
}

/* Encrypt Section */
.encrypt-section {
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.encrypt-section h3 {
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
}

.encrypt-subtitle {
  opacity: 0.7;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.input-with-btn {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.encrypt-input {
  flex: 1;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 1rem;
}

.encrypt-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.percentage-btn {
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.percentage-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.conversion-display {
  text-align: center;
  margin: 1.5rem 0;
}

.conversion-arrow {
  font-size: 2rem;
  opacity: 0.5;
  margin-bottom: 0.5rem;
}

.you-receive {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(79, 195, 247, 0.2);
  border-radius: 8px;
}

.you-receive .label {
  opacity: 0.7;
  font-size: 0.9rem;
}

.you-receive .amount {
  font-weight: 700;
  font-size: 1.2rem;
}

.unit-small {
  font-size: 0.9rem;
  opacity: 0.6;
}

.route-info {
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.route-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.route-header .label {
  font-size: 0.85rem;
  opacity: 0.7;
}

.route-header .fee {
  background: rgba(168, 255, 120, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #a8ff78;
}

.route-name {
  font-family: monospace;
  font-size: 0.85rem;
  opacity: 0.8;
  word-break: break-all;
}

.encrypt-btn {
  width: 100%;
  padding: 1.25rem;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%);
  color: #0a1628;
  margin-bottom: 1rem;
}

.encrypt-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(168, 255, 120, 0.4);
}

.encrypt-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.warning-text {
  font-size: 0.85rem;
  opacity: 0.8;
  line-height: 1.5;
  color: #ff8e53;
}

.info-text {
  font-size: 0.9rem;
  opacity: 0.8;
  line-height: 1.6;
  text-align: center;
  padding: 1rem;
  background: rgba(79, 195, 247, 0.1);
  border-radius: 8px;
  margin-bottom: 2rem;
}

/* New Figma-style components */
.encrypted-balance {
  margin-bottom: 17.5rem;
}

.encrypted-balance .balance-label {
  font-size: 1.875rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.4;
  text-transform: uppercase;
  color: #00F2E1 !important;
  opacity: 1 !important;
  margin-bottom: 0.5rem;
}

.unprotected-balance .balance-label {
  font-size: 1.875rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.4;
  text-transform: uppercase;
  color: #00F2E1 !important;
  opacity: 1 !important;
  margin-bottom: 0.5rem;
}

.balance-amount-large {
  font-size: 9rem;
  font-weight: 900;
  line-height: 1.4;
  letter-spacing: 1.25px;
  text-transform: uppercase;
  background: linear-gradient(180deg, #ff4b2b 0%, #00f2e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.unit-btc {
  font-size: 1.875rem;
  letter-spacing: 0.3px;
  margin-left: -0.5rem;
  background: linear-gradient(180deg, #ff4b2b 0%, #00f2e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Encrypted gradient override */
.encrypted-balance .balance-amount-large.encrypted-gradient {
  background: linear-gradient(180deg, #FFD900 0%, #00F2E1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.encrypted-balance .unit-btc.encrypted-gradient {
  background: linear-gradient(180deg, #FFD900 0%, #00F2E1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.encrypt-section-new {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2.625rem;
}

.card-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-header-external {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.card-label-external {
  font-family: 'Satoshi', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  color: #FFFFFF;
  opacity: 0.8;
}

.card-balance-external {
  font-family: 'Satoshi', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: #616877;
  opacity: 0.8;
}

.input-card {
  background: rgba(45, 49, 60, 0.4);
  border-radius: 14px;
  padding: 1.5rem 1.75rem;
  box-shadow: inset 0px 2px 0px rgba(255, 255, 255, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.6;
}

.card-label {
  color: rgba(255, 255, 255, 0.8);
}

.card-balance {
  color: #616877;
  font-size: 0.875rem;
}

.card-input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.currency-selector {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.currency-text {
  color: white;
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.6;
}

.dropdown-icon {
  color: white;
  font-size: 0.75rem;
  opacity: 0.6;
}

.info-icon {
  font-size: 1rem;
  margin-left: 0.75rem;
  opacity: 0.6;
}

.percentage-btn-new {
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: none;
  color: white;
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: 0.44px;
  cursor: pointer;
  line-height: 1.6;
  transition: all 0.2s;
}

.percentage-btn-new:hover:not(:disabled) {
  opacity: 0.8;
}

.percentage-btn-new:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.amount-input {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: 0.44px;
  line-height: 1.6;
  text-align: right;
  width: 120px;
  outline: none;
}

.amount-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.amount-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Remove number input arrows */
.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.amount-input[type=number] {
  -moz-appearance: textfield;
}

.max-btn {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.max-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.max-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.output-amount {
  color: white;
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: 0.44px;
  line-height: 1.6;
}

.swap-icon-container {
  position: absolute;
  left: 50%;
  top: 57%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swap-icon-background {
  position: absolute;
  width: 7rem;
  height: 7rem;
  background: #171A21;
  border-radius: 50%;
  z-index: 1;
}

.swap-icon {
  position: relative;
  width: 5rem;
  height: 5rem;
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1b1e26;
  box-shadow: 0 4px 12px rgba(255, 217, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 2;
}

.swap-icon:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(255, 217, 0, 0.5);
}

.route-section-new {
  margin-bottom: 2.625rem;
}

.route-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.route-selector {
  background: rgba(45, 49, 60, 0.4);
  border-radius: 14px;
  padding: 1.6875rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: inset 0px 2px 0px 0px rgba(255, 255, 255, 0.06);
}

.route-name-new {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: white;
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.6;
}

.route-fee {
  color: white;
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: 0.44px;
  line-height: 1.6;
}

.encrypt-btn-new {
  width: 100%;
  padding: 1.375rem 2.5rem;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #00F2E1 0%, #FFD900 100%);
  color: #161920;
  font-size: 1.1875rem;
  font-weight: 700;
  letter-spacing: 1.9px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
}

.encrypt-btn-new:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 217, 0, 0.4);
}

.encrypt-btn-new:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.warning-text-new {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #586b79;
  text-align: center;
  opacity: 0.8;
  margin-bottom: 2rem;
}

.secondary-btn {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondary-btn.danger {
  background: rgba(255, 69, 58, 0.2);
  border-color: rgba(255, 69, 58, 0.4);
}

.secondary-btn.danger:hover:not(:disabled) {
  background: rgba(255, 69, 58, 0.3);
  border-color: rgba(255, 69, 58, 0.6);
}


/* Modals */
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
  background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
  padding: 2rem;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid rgba(79, 195, 247, 0.3);
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

.balance-info {
  background: rgba(79, 195, 247, 0.1);
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
  color: #4fc3f7;
  font-size: 0.9rem;
  font-weight: 600;
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

.modal-btn {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.75rem;
}

.modal-btn.primary {
  background: linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%);
  color: #0a1628;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.receive-mode-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.5rem;
}

.mode-tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px 8px 0 0;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 2px solid transparent;
}

.mode-tab-btn.active {
  background: rgba(255, 255, 255, 0.2);
  border-bottom: 2px solid #4fc3f7;
  color: #4fc3f7;
}

.mode-tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.15);
}

.receive-mode-content {
  margin-top: 1rem;
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

.invoice-text {
  cursor: pointer;
  font-size: 0.85rem;
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

.deposit-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.deposit-options .info-note {
  font-size: 0.85rem;
  opacity: 0.8;
  color: #4fc3f7;
  text-align: center;
  margin-top: 0.5rem;
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

.warning-box .info-note {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-top: 0.5rem;
}

.warning-box .reset-btn {
  margin-top: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.warning-box .reset-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.lightning-deposit {
  background: rgba(79, 195, 247, 0.1);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.lightning-deposit h4 {
  margin-bottom: 1rem;
  color: white;
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

.mnemonic-box {
  font-family: monospace;
  font-size: 0.9rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  word-break: break-all;
  color: white;
  margin: 1rem 0;
  line-height: 1.6;
}

.warning-text {
  color: #ffd900;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  opacity: 0.9;
}

.token-output {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.token-output .success {
  color: #a8ff78;
  margin-bottom: 0.5rem;
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

/* VTXOs */
.vtxos-list {
  margin-top: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.vtxo-item {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.vtxo-detail {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  color: white;
}

.vtxo-detail .label {
  font-weight: 600;
  color: #a8ff78;
}

.vtxo-detail .value {
  color: white;
  font-family: monospace;
}

.vtxo-detail .value.small {
  font-size: 0.85rem;
  opacity: 0.8;
}

.info-text {
  color: #4fc3f7;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

/* Responsive */
@media (max-width: 600px) {
  .unified-wallet {
    padding: 1.5rem;
    border-radius: 0;
  }

  .balance-amount {
    font-size: 2.5rem;
  }

  .balance-amount-large {
    font-size: 4rem;
  }

  .unit-btc {
    font-size: 1.2rem;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }

  .action-buttons-new {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .action-btn-gradient {
    height: 120px;
    font-size: 1.2rem;
  }

  .swap-icon-background {
    width: 7rem;
    height: 7rem;
  }

  .swap-icon {
    width: 2.5rem;
    height: 2.5rem;
  }

  .status-indicator {
    width: 2rem;
    height: 2rem;
  }

  .time-progress-fill {
    min-width: 100px;
  }

  .days-text {
    font-size: 1.1rem;
  }

  .amount-input {
    font-size: 1.1rem;
    width: 80px;
  }

  .max-btn {
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
  }
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
</style>

