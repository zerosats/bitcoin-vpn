import { ref, computed } from 'vue'
import { CashuMint, CashuWallet, getEncodedToken, deriveKeysetId, generateNewMnemonic } from '@cashu/cashu-ts'

const wallet = ref(null)
const mint = ref(null)
const balance = ref(0)
const proofs = ref([])
const isInitialized = ref(false)
const mintUrl = ref('https://mint.minibits.cash/Bitcoin') // Default test mint
const unit = ref('sat') // Default unit
const mnemonic = ref(null)
const pubkey = ref(null)
let mintCounter = 0 // Counter for deterministic secret derivation

export function useCashuWallet() {
  const resetWalletState = async () => {
    // Clear all Cashu wallet state (keeps mnemonic)
    console.log('🧹 Resetting Cashu wallet state...')
    const savedMnemonic = localStorage.getItem('cashu_mnemonic')
    
    // Clear everything else
    localStorage.removeItem('cashu_proofs')
    localStorage.removeItem('cashu_used_quotes')
    localStorage.removeItem('cashu_last_created_token')
    localStorage.removeItem('cashu_last_created_token_time')
    
    // Reset in-memory state
    proofs.value = []
    balance.value = 0
    
    // DON'T reset counter to 0 - scan for the next available counter
    if (wallet.value && savedMnemonic) {
      console.log('🔍 Scanning to find next available counter...')
      try {
        // Quick scan to find where we should start
        // This prevents "already signed" errors from reusing old counters
        const scanResult = await wallet.value.restore(0, 50, {})
        if (scanResult.proofs && scanResult.proofs.length > 0) {
          // Start from counter 50 to be safe (past any we found)
          mintCounter = 50
          console.log('⚠️ Found used counters, starting from counter:', mintCounter)
        } else {
          mintCounter = 0
          console.log('✅ No used counters found, starting from 0')
        }
      } catch (e) {
        // If scan fails, default to counter 50 to be safe
        mintCounter = 50
        console.warn('⚠️ Could not scan for used counters, defaulting to:', mintCounter)
      }
    } else {
      mintCounter = 0
    }
    
    localStorage.setItem('cashu_mint_counter', mintCounter.toString())
    console.log('✅ Wallet state reset. Mnemonic preserved:', savedMnemonic ? 'Yes' : 'No')
    
    return { mnemonicPreserved: !!savedMnemonic, startingCounter: mintCounter }
  }
  
  const initialize = async (customMintUrl = null, importedMnemonic = null) => {
    try {
      const url = customMintUrl || mintUrl.value
      mintUrl.value = url
      
      mint.value = new CashuMint(url)
      
      // Get mint info to determine available units
      // Note: Some mints may show deprecation warnings about 'contact' field
      // This is a mint-side issue and doesn't affect functionality
      const info = await mint.value.getInfo()
      console.log('Mint info:', info)
      
      // Load or generate mnemonic
      let walletMnemonic = importedMnemonic
      if (!walletMnemonic) {
        walletMnemonic = localStorage.getItem('cashu_mnemonic')
        if (!walletMnemonic) {
          // Generate new mnemonic
          walletMnemonic = generateNewMnemonic()
          localStorage.setItem('cashu_mnemonic', walletMnemonic)
          console.log('Generated new mnemonic')
        } else {
          console.log('Loaded existing mnemonic')
        }
      } else {
        // Save imported mnemonic
        localStorage.setItem('cashu_mnemonic', walletMnemonic)
      }
      
      mnemonic.value = walletMnemonic
      
      // Create wallet with the mint, unit, and mnemonic for deterministic secrets
      wallet.value = new CashuWallet(mint.value, { 
        unit: unit.value,
        mnemonicOrSeed: walletMnemonic
      })
      
      console.log('Wallet initialized with deterministic secrets')
      
      // Load mint counter from localStorage
      const savedCounter = localStorage.getItem('cashu_mint_counter')
      if (savedCounter) {
        mintCounter = parseInt(savedCounter, 10)
        console.log('Loaded mint counter:', mintCounter)
      } else {
        mintCounter = 0
      }
      
      // Load proofs from localStorage if available
      const savedProofs = localStorage.getItem('cashu_proofs')
      if (savedProofs && savedProofs !== 'undefined' && savedProofs !== 'null') {
        try {
          const parsed = JSON.parse(savedProofs)
          if (Array.isArray(parsed)) {
            proofs.value = parsed
            calculateBalance()
            
            // Auto-verify proofs on initialization if we have any
            if (proofs.value.length > 0) {
              console.log('🔍 Auto-verifying proofs on initialization...')
              // Run verification in background after a short delay
              setTimeout(async () => {
                try {
                  await verifyAndCalculateBalance()
                  console.log('✅ Initial balance verification complete:', balance.value, 'sats')
                } catch (e) {
                  console.warn('Initial verification failed:', e)
                }
              }, 1000)
            }
          } else {
            console.warn('Saved proofs is not an array, clearing...')
            localStorage.removeItem('cashu_proofs')
            proofs.value = []
          }
        } catch (e) {
          console.error('Failed to parse saved proofs, clearing...', e)
          localStorage.removeItem('cashu_proofs')
          proofs.value = []
        }
      } else {
        proofs.value = []
      }
      
      isInitialized.value = true
      console.log('Cashu wallet initialized with mint:', url)
      return { mnemonic: mnemonic.value, mintCounter: mintCounter }
    } catch (error) {
      console.error('Failed to initialize Cashu wallet:', error)
      return false
    }
  }

  const calculateBalance = () => {
    balance.value = proofs.value.reduce((sum, proof) => sum + proof.amount, 0)
  }
  
  // Verify proofs with mint and return actual spendable balance
  const verifyAndCalculateBalance = async () => {
    try {
      if (!wallet.value || !proofs.value || proofs.value.length === 0) {
        balance.value = 0
        return 0
      }
      
      console.log('🔍 Verifying proofs with mint...')
      const result = await clearSpentProofs()
      console.log('✅ Balance verified:', balance.value, 'sats')
      return balance.value
    } catch (error) {
      console.error('Failed to verify balance:', error)
      // Fall back to local calculation if verification fails
      calculateBalance()
      return balance.value
    }
  }

  const saveProofs = () => {
    localStorage.setItem('cashu_proofs', JSON.stringify(proofs.value))
    calculateBalance()
  }

  const requestMint = async (amount) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      // Request a mint quote using the correct API
      const quote = await wallet.value.createMintQuote(amount)
      console.log('Mint quote created:', quote)
      return quote
    } catch (error) {
      console.error('Failed to request mint:', error)
      throw error
    }
  }


  const getLastCreatedToken = () => {
    const token = localStorage.getItem('cashu_last_created_token')
    const time = localStorage.getItem('cashu_last_created_token_time')
    
    if (token && time) {
      const timeAgo = Date.now() - parseInt(time)
      const minutesAgo = Math.floor(timeAgo / 60000)
      return {
        token,
        createdAt: parseInt(time),
        minutesAgo
      }
    }
    return null
  }


  const mintTokens = async (amount, quoteId) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      console.log('🪙 === MINT TOKENS START ===')
      console.log('Amount:', amount)
      console.log('Quote ID:', quoteId)
      console.log('Current counter:', mintCounter)
      console.log('Current balance:', balance.value)
      
      // Check if this quote was already used
      let usedQuotes = JSON.parse(localStorage.getItem('cashu_used_quotes') || '[]')
      console.log('Used quotes:', usedQuotes.length, 'total')
      
      // Clean up old quotes (keep only last 100 to prevent localStorage bloat)
      if (usedQuotes.length > 100) {
        usedQuotes = usedQuotes.slice(-100)
        localStorage.setItem('cashu_used_quotes', JSON.stringify(usedQuotes))
      }
      
      if (usedQuotes.includes(quoteId)) {
        console.warn('⚠️ This quote was already used for minting. Trying to recover tokens...')
        
        // Try to recover the tokens that should have been minted
        const recovered = await recoverLostTokens()
        if (recovered.length > 0) {
          console.log('✅ Successfully recovered tokens from previous mint!')
          return recovered
        }
        
        throw new Error('Quote already used. Tried to recover but no new tokens found. Check your balance.')
      }
      
      console.log('✅ Quote not yet used, proceeding with minting...')
      
      // Mint tokens after payment using the correct API
      // After the quote is paid, we mint the tokens with the quote ID
      // Use counter for deterministic secret derivation so we can recover these tokens
      console.log('Calling wallet.mintTokens() with counter:', mintCounter)
      const mintResult = await wallet.value.mintTokens(amount, quoteId, {
        counter: mintCounter
      })
      console.log('✅ Mint API call succeeded!')
      console.log('Mint result type:', typeof mintResult)
      console.log('Mint result keys:', Object.keys(mintResult || {}))
      
      const newProofs = mintResult.proofs || mintResult
      console.log('Extracted proofs:', newProofs?.length, 'proofs')
      
      // Increment counter for next mint
      mintCounter++
      localStorage.setItem('cashu_mint_counter', mintCounter.toString())
      
      // Mark this quote as used
      usedQuotes.push(quoteId)
      localStorage.setItem('cashu_used_quotes', JSON.stringify(usedQuotes))
      
      proofs.value.push(...newProofs)
      saveProofs()
      
      console.log('Successfully minted tokens with counter:', mintCounter - 1, newProofs)
      
      // Verify balance after minting
      setTimeout(() => verifyAndCalculateBalance(), 500)
      
      return newProofs
    } catch (error) {
      // Check if it's the "already signed" error
      if (error.message && error.message.includes('already been signed')) {
        console.warn('⚠️ Outputs already signed - counter', mintCounter, 'was already used')
        console.log('This means counter', mintCounter, 'collides with old spent tokens')
        
        // Mark quote as used to prevent infinite retries
        const usedQuotes = JSON.parse(localStorage.getItem('cashu_used_quotes') || '[]')
        const isQuoteAlreadyMarked = usedQuotes.includes(quoteId)
        
        if (!isQuoteAlreadyMarked) {
          // First time hitting this error for this quote
          // This is a counter collision - jump ahead significantly
          console.log('🔄 Counter collision detected, jumping ahead to skip all used counters...')
          
          // Jump by 20 to skip past likely collision zone
          // This handles cases where multiple counters (1,2,3...) are all used
          const jumpAmount = 20
          mintCounter = mintCounter + jumpAmount
          localStorage.setItem('cashu_mint_counter', mintCounter.toString())
          console.log('✅ Counter jumped from', mintCounter - jumpAmount, 'to', mintCounter, '(+' + jumpAmount + ')')
          
          // Retry the mint with new counter
          console.log('🔄 Retrying mint with counter:', mintCounter)
          try {
            const retryResult = await wallet.value.mintTokens(amount, quoteId, {
              counter: mintCounter
            })
            console.log('✅ Retry succeeded with new counter!')
            
            const retryProofs = retryResult.proofs || retryResult
            
            if (!Array.isArray(retryProofs) || retryProofs.length === 0) {
              throw new Error('Retry returned no proofs')
            }
            
            // Success! Save everything
            mintCounter++
            localStorage.setItem('cashu_mint_counter', mintCounter.toString())
            usedQuotes.push(quoteId)
            localStorage.setItem('cashu_used_quotes', JSON.stringify(usedQuotes))
            
            proofs.value.push(...retryProofs)
            saveProofs()
            
            console.log('✅ Successfully minted with counter:', mintCounter - 1, 'Got', retryProofs.length, 'proofs')
            setTimeout(() => verifyAndCalculateBalance(), 500)
            
            return retryProofs
          } catch (retryError) {
            console.error('❌ Retry also failed:', retryError.message)
            // Mark as used so we don't retry infinitely
            usedQuotes.push(quoteId)
            localStorage.setItem('cashu_used_quotes', JSON.stringify(usedQuotes))
            
            // Fall through to recovery logic below
          }
        } else {
          console.log('⚠️ Quote already marked as used, skipping retry')
        }
        
        // If retry failed or quote already marked, try recovery
        if (!usedQuotes.includes(quoteId)) {
          usedQuotes.push(quoteId)
          localStorage.setItem('cashu_used_quotes', JSON.stringify(usedQuotes))
        }
        
        // DON'T increment counter yet - try to recover with current counter first
        console.log('Attempting targeted recovery for counter:', mintCounter)
        
        // Try to recover tokens that were minted with this specific counter
        try {
          // Load keys first
          let keysetId = null
          try {
            const keys = await wallet.value.getKeys()
            keysetId = keys?.id
          } catch (e) {
            const mintKeys = await mint.value.getKeys()
            if (mintKeys?.keysets?.[0]) {
              keysetId = mintKeys.keysets[0].id
              await wallet.value.getKeys(keysetId)
            }
          }
          
          if (!keysetId) {
            throw new Error('Cannot load mint keys for recovery')
          }
          
          // Try to restore just the tokens from this counter (not a wide range)
          console.log('Restoring tokens from counter', mintCounter, 'to', mintCounter + 1)
          const { proofs: recoveredProofs } = await wallet.value.restore(
            mintCounter,
            mintCounter + 1,
            { keysetId }
          )
          
          console.log('Targeted restore found', recoveredProofs?.length || 0, 'proofs')
          
          if (recoveredProofs && recoveredProofs.length > 0) {
            // Check if they're spent
            const spentProofs = await wallet.value.checkProofsSpent(recoveredProofs)
            
            if (spentProofs.length === 0) {
              // All proofs are unspent - success!
              const existingSecrets = new Set(proofs.value.map(p => p.secret))
              const newProofs = recoveredProofs.filter(p => !existingSecrets.has(p.secret))
              
              if (newProofs.length > 0) {
                proofs.value.push(...newProofs)
                saveProofs()
                
                // NOW increment counter since recovery succeeded
                mintCounter++
                localStorage.setItem('cashu_mint_counter', mintCounter.toString())
                
                console.log('✅ Successfully recovered', newProofs.length, 'unspent proofs!')
                return newProofs
              }
            } else {
              console.warn('⚠️ Recovered proofs are spent:', spentProofs.length, 'of', recoveredProofs.length)
            }
          }
        } catch (recoveryError) {
          console.error('Targeted recovery failed:', recoveryError)
        }
        
        // If targeted recovery failed, increment counter and try wide scan
        console.log('Targeted recovery failed, trying wide scan...')
        mintCounter++
        localStorage.setItem('cashu_mint_counter', mintCounter.toString())
        
        try {
          const recovered = await recoverLostTokens()
          if (recovered.length > 0) {
            console.log('✅ Wide scan recovered tokens!')
            return recovered
          }
        } catch (wideRecoveryError) {
          console.error('Wide recovery also failed:', wideRecoveryError)
        }
        
        throw new Error('Tokens were minted but recovery failed. The tokens may already be in your wallet. Try refreshing your balance or use "Restore from Seed" to scan for all tokens.')
      }
      
      console.error('Failed to mint tokens:', error)
      console.error('Error details:', error.message, error.stack)
      throw error
    }
  }

  const send = async (amount) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      if (balance.value < amount) throw new Error('Insufficient balance')
      
      console.log('=== SEND START ===')
      console.log('Sending:', amount, 'sats')
      console.log('Current balance:', balance.value)
      console.log('Current proofs count:', proofs.value.length)
      
      // Create a snapshot of current proofs for rollback
      const proofsSnapshot = [...proofs.value]
      const proofsSecrets = proofsSnapshot.map(p => p.secret.substring(0, 10) + '...')
      console.log('Proof secrets:', proofsSecrets)
      
      // Ensure wallet has mint keys loaded
      try {
        await wallet.value.getMintInfo()
      } catch (e) {
        console.warn('Could not refresh mint info, proceeding with cached keys')
      }
      
      // Validate proofs format
      if (!Array.isArray(proofs.value) || proofs.value.length === 0) {
        throw new Error('No proofs available to send')
      }
      
      // ✅ VERIFY PROOFS ARE UNSPENT FIRST
      console.log('Verifying proofs are unspent before attempting send...')
      try {
        // checkProofsSpent returns an array of SPENT proofs directly
        const spentProofs = await wallet.value.checkProofsSpent(proofs.value)
        if (spentProofs.length > 0) {
          throw new Error(`Cannot send: ${spentProofs.length} proof(s) are already spent. Run "Clear Spent Proofs" first.`)
        }
        console.log('✅ All proofs verified as unspent')
      } catch (verifyError) {
        console.error('Proof verification failed:', verifyError)
        throw new Error('Failed to verify proofs before send: ' + verifyError.message)
      }
      
      // Send tokens (swap proofs on the mint)
      console.log('Calling wallet.send() with proofs...')
      const sendResult = await wallet.value.send(amount, proofs.value)
      console.log('Send result received:', sendResult)
      
      // Handle multiple possible response formats
      // Format 1: { send: [...], keep: [...] }
      // Format 2: { send: [...], returnChange: [...] }
      // Format 3: { proofs: [...], keep: [...] }
      const sendProofs = sendResult.send || sendResult.proofs || []
      const keepProofs = sendResult.keep || sendResult.returnChange || []
      
      console.log('Response format:', {
        hasSend: !!sendResult.send,
        hasProofs: !!sendResult.proofs,
        hasKeep: !!sendResult.keep,
        hasReturnChange: !!sendResult.returnChange
      })
      
      if (!Array.isArray(sendProofs) || sendProofs.length === 0) {
        throw new Error('Failed to create send proofs. Wallet may not have enough proofs or keys.')
      }
      
      const sendTotal = sendProofs.reduce((s, p) => s + p.amount, 0)
      const keepTotal = keepProofs.reduce((s, p) => s + p.amount, 0)
      
      console.log('Swap result:')
      console.log('  Send proofs:', sendProofs.length, '- Total:', sendTotal, 'sats')
      console.log('  Keep proofs:', keepProofs.length, '- Total:', keepTotal, 'sats')
      
      // ✅ CRITICAL: Validate change proofs BEFORE updating wallet
      const expectedChange = balance.value - amount
      
      // If we expect change but got none - ABORT!
      if (expectedChange > 0 && keepTotal === 0) {
        console.error('❌ CRITICAL ERROR: Mint did not return change proofs!')
        console.error('Expected change:', expectedChange, 'sats')
        console.error('Received change:', 0, 'sats')
        console.error('ABORTING - Your original proofs are NOT touched')
        
        throw new Error(`Mint failed to return ${expectedChange} sats in change. Send aborted to protect your funds. The ${amount} sat token may have been created but your wallet was not updated.`)
      }
      
      // Validate change amount is correct (allow 1 sat tolerance for rounding)
      if (expectedChange > 0 && Math.abs(keepTotal - expectedChange) > 1) {
        console.error('❌ ERROR: Change amount mismatch!')
        console.error('Expected change:', expectedChange, 'sats')
        console.error('Received change:', keepTotal, 'sats')
        console.error('Difference:', Math.abs(keepTotal - expectedChange), 'sats')
        
        throw new Error(`Change mismatch: expected ${expectedChange} sats, got ${keepTotal} sats. Send aborted.`)
      }
      
      // ✅ Only update wallet if validations pass
      console.log('✅ Swap successful and validated!')
      console.log('Updating wallet with', keepProofs.length, 'new proofs...')
      
      // IMPORTANT: Update wallet proofs ONLY after validation
      proofs.value = keepProofs
      saveProofs()
      
      console.log('✅ Wallet updated. New balance:', balance.value)
      console.log('New proofs count:', proofs.value.length)
      
      // Verify the wallet state after sending
      setTimeout(() => verifyAndCalculateBalance(), 500)
      
      // Create encoded token for sending
      const token = getEncodedToken({
        token: [{ mint: mintUrl.value, proofs: sendProofs }]
      })
      
      // Save to localStorage as backup (in case user closes modal)
      localStorage.setItem('cashu_last_created_token', token)
      localStorage.setItem('cashu_last_created_token_time', Date.now().toString())
      
      console.log('✅ Token created and backed up')
      console.log('Token:', token.substring(0, 50) + '...')
      console.log('=== SEND COMPLETE ===')
      
      return token
    } catch (error) {
      console.error('❌ SEND FAILED:', error)
      console.error('Error details:', error.message, error.stack)
      
      // ✅ Provide recovery instructions
      if (error.message.includes('already spent')) {
        console.error('💡 Recovery: Click menu → "Clear Spent Proofs" to clean up')
      } else if (error.message.includes('change')) {
        console.error('💡 Recovery: Your proofs were NOT updated. You still have your original balance.')
        console.error('💡 If a token was created, it may be unsafe to use.')
      }
      
      throw error
    }
  }

  const payLightningInvoice = async (invoice) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      console.log('=== PAY LIGHTNING INVOICE ===')
      console.log('Creating melt quote for invoice...')
      
      // First, create a melt quote to see how much we need
      const meltQuote = await wallet.value.createMeltQuote(invoice)
      console.log('Melt quote:', meltQuote)
      
      const amountNeeded = meltQuote.amount + meltQuote.fee_reserve
      console.log('Amount needed:', amountNeeded, 'sats (amount:', meltQuote.amount, '+ fee reserve:', meltQuote.fee_reserve, ')')
      
      if (balance.value < amountNeeded) {
        throw new Error(`Insufficient balance. Need ${amountNeeded} sats (amount: ${meltQuote.amount} + fees: ${meltQuote.fee_reserve})`)
      }
      
      // Calculate total proofs available
      const totalAvailable = proofs.value.reduce((sum, p) => sum + p.amount, 0)
      console.log('Current balance:', totalAvailable, 'sats')
      
      // ✅ NEW APPROACH: Swap proofs first to get exact amount, then melt
      // meltTokens() doesn't create change - it burns whatever you give it!
      console.log('Step 1: Swapping proofs to get exact amount needed:', amountNeeded, 'sats')
      
      // Note: wallet.send() manages its own counter internally, don't pass it
      const swapResult = await wallet.value.send(amountNeeded, proofs.value)
      
      const proofsToMelt = swapResult.send || swapResult.proofs || []
      const keepProofs = swapResult.keep || swapResult.returnChange || []
      
      const meltTotal = proofsToMelt.reduce((s, p) => s + p.amount, 0)
      const keepTotal = keepProofs.reduce((s, p) => s + p.amount, 0)
      
      console.log('Swap complete:')
      console.log('  Proofs to melt:', proofsToMelt.length, '- Total:', meltTotal, 'sats')
      console.log('  Keep (change):', keepProofs.length, '- Total:', keepTotal, 'sats')
      
      if (meltTotal !== amountNeeded) {
        throw new Error(`Swap failed: got ${meltTotal} sats but needed ${amountNeeded} sats`)
      }
      
      // Update wallet with change from swap
      proofs.value = keepProofs
      saveProofs()
      
      // Step 2: Melt the exact amount
      console.log('Step 2: Melting', meltTotal, 'sats to pay Lightning invoice...')
      const result = await wallet.value.meltTokens(meltQuote, proofsToMelt)
      console.log('✅ Melt result:', result)
      
      // Handle any change from melt (fee refund)
      console.log('Updating wallet...')
      
      // Add change proofs from melt result (this is the fee refund)
      if (result.change && result.change.length > 0) {
        const changeAmount = result.change.reduce((sum, p) => sum + p.amount, 0)
        proofs.value.push(...result.change)
        console.log('✅ Added', result.change.length, 'fee refund proofs (', changeAmount, 'sats )')
      } else {
        console.log('ℹ️ No fee refund from melt (expected if fee_reserve was 0)')
      }
      
      saveProofs()
      
      const newBalance = proofs.value.reduce((sum, p) => sum + p.amount, 0)
      const feeRefund = result.change ? result.change.reduce((sum, p) => sum + p.amount, 0) : 0
      const actualFee = meltQuote.fee_reserve - feeRefund
      
      console.log('✅ Payment complete!')
      console.log('- Invoice amount:', meltQuote.amount, 'sats')
      console.log('- Fee reserve:', meltQuote.fee_reserve, 'sats')
      console.log('- Fee refund:', feeRefund, 'sats')
      console.log('- Actual routing fee:', actualFee, 'sats')
      console.log('- Total cost:', meltQuote.amount + actualFee, 'sats')
      console.log('- New balance:', newBalance, 'sats')
      console.log('=== PAY LIGHTNING COMPLETE ===')
      
      // Verify balance after melting
      setTimeout(() => verifyAndCalculateBalance(), 500)
      
      return {
        success: true,
        amount: meltQuote.amount,
        fee: actualFee,
        payment_preimage: result.payment_preimage
      }
    } catch (error) {
      console.error('❌ Failed to pay Lightning invoice:', error)
      throw error
    }
  }

  const receive = async (encodedToken) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      console.log('Attempting to receive token:', encodedToken.substring(0, 50) + '...')
      
      // Receive and redeem token
      const receivedProofs = await wallet.value.receive(encodedToken)
      
      console.log('Successfully received proofs:', receivedProofs)
      
      // Add only new proofs (avoid duplicates)
      const existingSecrets = new Set(proofs.value.map(p => p.secret))
      const newProofs = receivedProofs.filter(p => !existingSecrets.has(p.secret))
      
      if (newProofs.length > 0) {
        proofs.value.push(...newProofs)
        saveProofs()
        console.log(`Added ${newProofs.length} new proofs (${receivedProofs.length - newProofs.length} were duplicates)`)
      } else {
        console.log('All received proofs were already in wallet')
      }
      
      // Verify balance after receiving
      setTimeout(() => verifyAndCalculateBalance(), 500)
      
      return receivedProofs
    } catch (error) {
      console.error('Failed to receive tokens:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error details:', error)
      
      // Provide more helpful error messages
      if (error.message.includes('already spent') || error.message.includes('0050')) {
        throw new Error('Token already spent or invalid. It may have been redeemed already.')
      } else if (error.message.includes('mint')) {
        throw new Error('Token is from a different mint. Please use a token from: ' + mintUrl.value)
      } else if (error.message.includes('decode') || error.message.includes('parse')) {
        throw new Error('Invalid token format. Please check the token and try again.')
      }
      
      throw error
    }
  }

  const checkPendingQuote = async (quoteId) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      const status = await wallet.value.checkMintQuote(quoteId)
      console.log('Quote status:', status)
      return status
    } catch (error) {
      console.error('Failed to check quote:', error)
      throw error
    }
  }

  const restoreFromSeed = async (options = {}) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      if (!mnemonic.value) throw new Error('No mnemonic available for restore')
      
      console.log('Starting wallet restore...')
      console.log('Mint URL:', mintUrl.value)
      
      const start = options.start || 0
      const count = options.count || 100 // Scan 100 secrets by default
      
      // Load keys before restore
      console.log('Loading mint keys...')
      let keysetId = null
      try {
        const keys = await wallet.value.getKeys()
        if (keys && keys.id) {
          keysetId = keys.id
          console.log('✅ Keys loaded:', keysetId)
        }
      } catch (e) {
        console.warn('getKeys() failed, trying mint.getKeys():', e.message)
        try {
          const mintKeys = await mint.value.getKeys()
          if (mintKeys && mintKeys.keysets && mintKeys.keysets.length > 0) {
            keysetId = mintKeys.keysets[0].id
            console.log('✅ Keys loaded from mint:', keysetId)
            await wallet.value.getKeys(keysetId)
          }
        } catch (e2) {
          console.error('Failed to load keys:', e2.message)
        }
      }
      
      // Use the restore function to scan for proofs
      const restoreOptions = keysetId ? { keysetId } : {}
      console.log('Restoring with options:', restoreOptions, 'from', start, 'count', count)
      const { proofs: restoredProofs } = await wallet.value.restore(start, count, restoreOptions)
      
      console.log('Restored proofs:', restoredProofs?.length || 0, 'found')
      
      if (restoredProofs && restoredProofs.length > 0) {
        // Add to existing proofs (avoid duplicates)
        const existingSecrets = new Set(proofs.value.map(p => p.secret))
        const newProofs = restoredProofs.filter(p => !existingSecrets.has(p.secret))
        
        if (newProofs.length > 0) {
          console.log(`Found ${newProofs.length} new proof(s) from restore, verifying with NUT-07...`)
          
          // ✅ NUT-07: Check if the new proofs are spent before adding them
          try {
            // checkProofsSpent returns an array of SPENT proofs directly
            const spentProofs = await wallet.value.checkProofsSpent(newProofs)
            
            if (spentProofs.length > 0) {
              console.warn(`⚠️ ${spentProofs.length} of ${newProofs.length} restored proofs are already spent, filtering them out`)
              
              // Only add unspent proofs
              const spentSecrets = new Set(spentProofs.map(p => p.secret))
              const unspentNewProofs = newProofs.filter(p => !spentSecrets.has(p.secret))
              
              if (unspentNewProofs.length > 0) {
                proofs.value.push(...unspentNewProofs)
                saveProofs()
                calculateBalance()
                console.log(`✅ Added ${unspentNewProofs.length} unspent proof(s), skipped ${spentProofs.length} spent`)
                
                return {
                  found: restoredProofs.length,
                  added: unspentNewProofs.length,
                  skipped: spentProofs.length
                }
              } else {
                console.log('ℹ️ All restored proofs were already spent, nothing to add')
                return {
                  found: restoredProofs.length,
                  added: 0,
                  skipped: spentProofs.length
                }
              }
            } else {
              // All new proofs are unspent, safe to add
              proofs.value.push(...newProofs)
              saveProofs()
              calculateBalance()
              console.log(`✅ Added ${newProofs.length} unspent proof(s) - all verified as unspent`)
              
              return {
                found: restoredProofs.length,
                added: newProofs.length,
                skipped: 0
              }
            }
          } catch (checkError) {
            console.error('Failed to verify restored proofs with NUT-07:', checkError)
            // Don't add proofs if we can't verify them - this prevents adding spent proofs
            throw new Error('Cannot verify restored proofs with mint. Please try again. Error: ' + checkError.message)
          }
        } else {
          console.log('ℹ️ No new proofs to add (all were duplicates)')
          return {
            found: restoredProofs.length,
            added: 0,
            skipped: 0
          }
        }
      }
      
      return { found: 0, added: 0 }
    } catch (error) {
      console.error('Failed to restore wallet:', error)
      throw error
    }
  }

  return {
    wallet,
    mint,
    balance: computed(() => balance.value),
    proofs: computed(() => proofs.value),
    isInitialized: computed(() => isInitialized.value),
    mintUrl: computed(() => mintUrl.value),
    mnemonic: computed(() => mnemonic.value),
    pubkey: computed(() => pubkey.value),
    mintCounter: computed(() => mintCounter),
    initialize,
    resetWalletState,
    requestMint,
    mintTokens,
    send,
    payLightningInvoice,
    receive,
    checkPendingQuote,
    restoreFromSeed,
    calculateBalance,
    verifyAndCalculateBalance,
    getLastCreatedToken
  }
}


