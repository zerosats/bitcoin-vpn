import { ref, computed, watch } from 'vue'
import { useCashuWallet } from './useCashuWallet'
import { useArkadeWallet } from './useArkadeWallet'

// Shared state for all wallets
const cashu = useCashuWallet()
const arkade = useArkadeWallet()

// Encryption flow state
const encryptionInProgress = ref(false)
const encryptionStep = ref('') // 'creating_invoice', 'paying_invoice', 'minting', 'complete'
const activeQuote = ref(null)
const activeInvoice = ref(null)

// Time at rest tracking
const firstMintTimestamp = ref(null)

export function useWalletBridge() {
  // Initialize time tracker from localStorage
  const loadTimeTracker = () => {
    const saved = localStorage.getItem('cashu_first_mint_timestamp')
    if (saved) {
      firstMintTimestamp.value = parseInt(saved, 10)
    }
  }

  const saveTimeTracker = () => {
    if (firstMintTimestamp.value) {
      localStorage.setItem('cashu_first_mint_timestamp', firstMintTimestamp.value.toString())
    }
  }

  // Calculate time at rest (in MINUTES for testing - change back to days for production)
  const daysAtRest = computed(() => {
    if (!firstMintTimestamp.value) return 0
    const now = Date.now()
    const diffMs = now - firstMintTimestamp.value
    const diffMinutes = Math.floor(diffMs / (1000 * 60)) // Using minutes for testing
    return diffMinutes
  })

  // Watch Cashu balance and set timestamp on first funds
  watch(() => cashu.balance.value, (newBalance, oldBalance) => {
    // If balance goes from 0 to something > 0 and we don't have a timestamp yet
    if (!firstMintTimestamp.value && newBalance > 0 && (!oldBalance || oldBalance === 0)) {
      firstMintTimestamp.value = Date.now()
      saveTimeTracker()
      console.log('🕐 First funds received - time at rest started:', new Date(firstMintTimestamp.value))
    }
    
    // If balance goes back to 0, reset the timestamp (all funds spent)
    if (newBalance === 0 && oldBalance > 0) {
      firstMintTimestamp.value = null
      localStorage.removeItem('cashu_first_mint_timestamp')
      console.log('🕐 All funds spent - time at rest reset')
    }
  })

  // Format balances for display
  const cashuBalanceFormatted = computed(() => {
    return cashu.balance.value.toString()
  })

  const arkadeBalanceFormatted = computed(() => {
    if (!arkade.balance.value) return '0'
    return arkade.balance.value.toString()
  })

  // Initialize both wallets
  const initializeBothWallets = async () => {
    try {
      console.log('Initializing Cashu and Arkade wallets...')
      
      // Initialize Cashu first (always needed)
      let cashuInitialized = false
      try {
        await cashu.initialize()
        console.log('✅ Cashu wallet initialized')
        loadTimeTracker()
        cashuInitialized = true
      } catch (error) {
        console.error('❌ Cashu wallet failed to initialize:', error)
        throw new Error('Cashu wallet initialization failed. This is required.')
      }

      // Try to initialize Arkade (optional for now)
      let arkadeInitialized = false
      try {
        await arkade.initialize()
        console.log('✅ Arkade wallet initialized')
        arkadeInitialized = true
      } catch (error) {
        console.warn('⚠️ Arkade wallet initialization failed (will continue without it):', error.message)
        // Don't throw - allow app to work with just Cashu
      }

      return {
        cashuInitialized,
        arkadeInitialized
      }
    } catch (error) {
      console.error('Failed to initialize wallets:', error)
      throw error
    }
  }

  // Arkade encrypt flow: Move funds from Arkade to Cashu
  const encryptArkadeFunds = async (amount) => {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount')
      }

      if (!cashu.isInitialized.value) {
        throw new Error('Cashu wallet not initialized')
      }

      if (!arkade.isInitialized.value) {
        throw new Error('Arkade wallet not initialized')
      }

      encryptionInProgress.value = true
      console.log(`🔒 Starting encryption of ${amount} sats from Arkade → Cashu`)

      // Step 1: Cashu creates a mint quote (includes Lightning invoice)
      encryptionStep.value = 'creating_invoice'
      console.log('Step 1: Creating Cashu mint quote...')
      const quote = await cashu.requestMint(amount)
      activeQuote.value = quote
      activeInvoice.value = quote.request // The Lightning invoice string
      
      console.log('✅ Mint quote created:', quote.quote)
      console.log('📝 Invoice:', activeInvoice.value)

      // Check Arkade balance AFTER getting the invoice (invoice may have routing fees)
      const arkadeBalance = BigInt(arkade.balance.value)
      // Add a buffer for Lightning routing fees (typically 1-2% but can vary)
      const estimatedTotal = amount + Math.max(10, Math.ceil(amount * 0.05)) // amount + max fee buffer
      if (arkadeBalance < BigInt(estimatedTotal)) {
        console.error(`Insufficient balance: have ${arkadeBalance}, need ~${estimatedTotal} (${amount} + fees)`)
        throw new Error(`Insufficient balance in Arkade wallet. Need ~${estimatedTotal} sats (${amount} + routing fees), have ${arkadeBalance} sats`)
      }
      console.log(`✅ Balance check passed: ${arkadeBalance} >= ${estimatedTotal}`)

      // Step 2: Arkade pays the Lightning invoice
      encryptionStep.value = 'paying_invoice'
      console.log('Step 2: Arkade paying Lightning invoice...')
      
      const paymentResult = await arkade.payBolt11Invoice(
        activeInvoice.value,
        Math.max(10, Math.ceil(amount * 0.05)) // 5% max fee, minimum 10 sats
      )
      
      console.log('✅ Invoice paid by Arkade:', paymentResult)
      
      // Give the payment some time to settle
      console.log('Waiting for payment to settle...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 2.5: Wait for mint to confirm payment (poll quote status)
      encryptionStep.value = 'waiting_confirmation'
      console.log('Step 2.5: Waiting for mint to confirm payment...')
      
      let isPaid = false
      let attempts = 0
      const maxAttempts = 20 // 20 attempts * 1 second = 20 seconds max
      
      while (!isPaid && attempts < maxAttempts) {
        attempts++
        console.log(`Checking quote status (attempt ${attempts}/${maxAttempts})...`)
        
        try {
          const quoteStatus = await cashu.checkPendingQuote(quote.quote)
          console.log('Quote status:', quoteStatus)
          
          if (quoteStatus.state === 'PAID' || quoteStatus.paid === true) {
            isPaid = true
            console.log('✅ Payment confirmed by mint!')
          } else {
            // Wait 1 second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error) {
          console.warn('Error checking quote status:', error.message)
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      if (!isPaid) {
        throw new Error('Payment confirmation timeout. The invoice was paid but the mint has not confirmed it yet. Please try minting manually later.')
      }

      // Step 3: Cashu mints the tokens
      encryptionStep.value = 'minting'
      console.log('Step 3: Minting Cashu tokens...')
      const newProofs = await cashu.mintTokens(amount, quote.quote)
      
      console.log('✅ Tokens minted:', newProofs.length, 'proofs')

      // Track time for first mint
      if (!firstMintTimestamp.value) {
        firstMintTimestamp.value = Date.now()
        saveTimeTracker()
        console.log('🕐 First mint timestamp set:', new Date(firstMintTimestamp.value))
      }

      // Complete
      encryptionStep.value = 'complete'
      console.log('🎉 Encryption complete! Funds moved from Arkade → Cashu')

      // Update balances
      await arkade.updateBalance()

      return {
        success: true,
        amount,
        proofs: newProofs.length
      }
    } catch (error) {
      console.error('❌ Encryption failed:', error)
      encryptionStep.value = 'error'
      throw error
    } finally {
      // Reset state after a delay
      setTimeout(() => {
        encryptionInProgress.value = false
        encryptionStep.value = ''
        activeQuote.value = null
        activeInvoice.value = null
      }, 2000)
    }
  }

  // Arkade decrypt flow: Move funds from Cashu to Arkade
  const decryptArkadeFunds = async (amount) => {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount')
      }

      if (!cashu.isInitialized.value) {
        throw new Error('Cashu wallet not initialized')
      }

      if (!arkade.isInitialized.value) {
        throw new Error('Arkade wallet not initialized')
      }

      // Check Cashu balance
      if (cashu.balance.value < amount) {
        throw new Error('Insufficient balance in Cashu wallet')
      }

      console.log(`🔓 Starting decryption of ${amount} sats from Cashu → Arkade`)

      // Step 1: Arkade creates a Lightning invoice
      console.log('Step 1: Creating Arkade Lightning invoice...')
      const invoiceString = await arkade.receiveBolt11(amount, 'Cashu to Arkade')
      
      console.log('✅ Invoice created:', invoiceString)

      // Step 2: Cashu pays the Lightning invoice
      console.log('Step 2: Cashu paying Lightning invoice...')
      const paymentResult = await cashu.payLightningInvoice(invoiceString)
      
      console.log('✅ Invoice paid by Cashu:', paymentResult)

      // Step 3: Wait for Arkade to receive and update balance
      console.log('Step 3: Waiting for Arkade to receive funds...')
      // Wait a bit for the reverse swap to complete
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      await arkade.updateBalance()

      console.log('🎉 Decryption complete! Funds moved from Cashu → Arkade')

      return {
        success: true,
        amount
      }
    } catch (error) {
      console.error('❌ Decryption failed:', error)
      throw error
    }
  }

  return {
    // Wallet instances
    cashu,
    arkade,
    
    // Formatted balances
    cashuBalance: cashuBalanceFormatted,
    arkadeBalance: arkadeBalanceFormatted,
    
    // Initialization
    initializeBothWallets,
    
    // Arkade <-> Cashu encryption flow
    encryptArkadeFunds,
    decryptArkadeFunds,
    
    // Encryption state
    encryptionInProgress,
    encryptionStep,
    activeInvoice,
    
    // Time tracking
    daysAtRest,
    firstMintTimestamp,
    
    // Wallet states
    cashuInitialized: cashu.isInitialized,
    arkadeInitialized: arkade.isInitialized,
    cashuMintUrl: cashu.mintUrl
  }
}

