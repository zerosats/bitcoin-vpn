import { ref, computed } from 'vue'
import { Wallet, SingleKey, RestArkProvider, RestIndexerProvider, Ramps } from '@arkade-os/sdk'
import { LocalStorageAdapter } from '@arkade-os/sdk/adapters/localStorage'
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap'

const wallet = ref(null)
const arkadeLightning = ref(null)
const identity = ref(null)
const privateKey = ref(null)
const balance = ref(0n)
const address = ref('')
const isInitialized = ref(false)
const initializationError = ref(null)

// Helper function for debugging swap data
const debugSwapData = (label, swapData) => {
  console.log(`=== ${label} ===`)
  console.log('Full swap data:', JSON.stringify(swapData, null, 2))
  if (swapData?.response) {
    console.log('Response keys:', Object.keys(swapData.response))
  }
}

export function useArkadeWallet() {
  const initialize = async (privateKeyHex = null, forceNew = false) => {
    try {
      // Load saved private key if available
      let savedPrivateKey = privateKeyHex || localStorage.getItem('arkade_private_key')
      
      // If forceNew, clear saved state and generate new wallet
      if (forceNew) {
        console.log('Force new wallet requested, clearing saved state...')
        localStorage.removeItem('arkade_private_key')
        savedPrivateKey = null
      }
      
      console.log('Initializing Arkade wallet...')
      
      // Create or restore identity
      if (savedPrivateKey) {
        identity.value = SingleKey.fromHex(savedPrivateKey)
        privateKey.value = savedPrivateKey
        console.log('Restored identity from saved key')
      } else {
        identity.value = SingleKey.fromRandomBytes()
        privateKey.value = identity.value.toHex()
        console.log('Created new identity from random bytes')
      }
      
      // Save private key to localStorage
      localStorage.setItem('arkade_private_key', privateKey.value)
      console.log('Private key saved to localStorage')
      
      // Create storage adapter
      const storage = new LocalStorageAdapter()
      
      const arkServerUrl = 'https://arkade.computer' // Mainnet
      const esploraUrl = 'https://blockstream.info/api' // Bitcoin mainnet
      
      // Create wallet instance
      wallet.value = await Wallet.create({
        identity: identity.value,
        arkServerUrl,
        esploraUrl,
        storage
      })
      
      // Initialize Lightning support via Boltz swaps
      const swapProvider = new BoltzSwapProvider({
        apiUrl: 'https://api.ark.boltz.exchange', // Mainnet endpoint
        network: 'bitcoin' // Mainnet
      })
      
      // Monkey-patch to add description field and better logging
      const originalRequest = swapProvider.request.bind(swapProvider)
      swapProvider.request = async function(path, method, body) {
        // Add description to reverse swap requests
        if (path === '/v2/swap/reverse' && method === 'POST' && body) {
          body = {
            ...body,
            description: 'Lightning Invoice'
          }
        }
        
        console.log('🔍 Boltz API Request:', {
          url: 'https://api.ark.boltz.exchange' + path,
          path,
          method,
          body: body ? JSON.stringify(body, null, 2) : 'none',
          bodyKeys: body ? Object.keys(body) : []
        })
        
        try {
          const result = await originalRequest(path, method, body)
          console.log('✅ Boltz API Response:', result)
          return result
        } catch (error) {
          console.error('❌ Boltz API Error:', error)
          console.error('Request details:', { path, method, bodyKeys: body ? Object.keys(body) : [] })
          
          // Enhanced error for debugging
          if (error.message && error.message.includes('400')) {
            console.error('🚨 Boltz returned 400 Bad Request')
            console.error('This usually means:')
            console.error('  - Invalid request parameters')
            console.error('  - Insufficient balance for the swap')
            console.error('  - Invoice amount/format issue')
            console.error('  - Ark-specific balance requirements not met')
          }
          
          throw error
        }
      }
      
      // Boltz SDK expects synchronous xOnlyPublicKey(), but SDK v0.3.3 has it async
      // Pre-fetch the public key and create a sync wrapper for compatibility
      const xOnlyPubKey = await identity.value.xOnlyPublicKey()
      
      // Create identity wrapper with synchronous xOnlyPublicKey
      const identityWrapper = {
        ...identity.value,
        xOnlyPublicKey: () => xOnlyPubKey, // Make it synchronous
        // Preserve other async methods as-is
        compressedPublicKey: () => identity.value.compressedPublicKey(),
        signMessage: (msg, type) => identity.value.signMessage(msg, type),
        sign: (tx, indexes) => identity.value.sign(tx, indexes),
        signerSession: () => identity.value.signerSession()
      }
      
      // Create wallet wrapper that properly exposes all methods
      // Can't just spread wallet.value as it loses methods on the prototype
      const walletWrapper = new Proxy(wallet.value, {
        get(target, prop) {
          // Override identity to return our sync wrapper
          if (prop === 'identity') {
            return identityWrapper
          }
          // For all other properties/methods, delegate to the original wallet
          const value = target[prop]
          // Bind methods to the original wallet context
          if (typeof value === 'function') {
            return value.bind(target)
          }
          return value
        }
      })
      
      // In v0.2.1, storage is handled automatically by ArkadeLightning
      arkadeLightning.value = new ArkadeLightning({
        wallet: walletWrapper,
        arkProvider: new RestArkProvider(arkServerUrl),
        indexerProvider: new RestIndexerProvider(arkServerUrl),
        swapProvider,
        timeoutConfig: {
          invoiceExpirySeconds: 30  // Set invoice expiry to 30 seconds instead of default 1 hour
        }
      })
      
      console.log('Arkade Lightning initialized via Boltz (api.ark.boltz.exchange)')
      
      // Get initial balance and address with timeout
      try {
        await Promise.race([
          updateBalance(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Balance fetch timeout')), 10000))
        ])
      } catch (balanceError) {
        console.warn('Initial balance fetch failed, will retry later:', balanceError.message)
        balance.value = 0n
      }
      
      try {
        await Promise.race([
          updateAddress(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Address fetch timeout')), 10000))
        ])
      } catch (addressError) {
        console.warn('Initial address fetch failed, will retry later:', addressError.message)
        address.value = ''
      }
      
      isInitialized.value = true
      initializationError.value = null
      console.log('Arkade wallet initialized successfully')
      console.log('Address:', address.value)
      
      // Log balance properly
      if (balance.value && typeof balance.value === 'object') {
        // Balance value is set
      } else {
        // Balance value is set
      }
      
      return privateKey.value
    } catch (error) {
      console.error('Failed to initialize Arkade wallet:', error)
      isInitialized.value = false
      initializationError.value = error.message
      throw error
    }
  }
  
  const resetWallet = () => {
    console.log('Resetting Arkade wallet...')
    localStorage.removeItem('arkade_private_key')
    wallet.value = null
    arkadeLightning.value = null
    identity.value = null
    privateKey.value = null
    balance.value = 0n
    address.value = ''
    isInitialized.value = false
    initializationError.value = null
    console.log('Arkade wallet reset complete')
  }

  const updateBalance = async () => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      const balanceData = await wallet.value.getBalance()
      
      // Use the SDK's pre-calculated total to avoid double-counting
      let totalBalance = 0n
      if (balanceData && typeof balanceData === 'object') {
        const toBigInt = (val) => {
          if (typeof val === 'bigint') return val
          if (typeof val === 'number') return BigInt(val)
          if (typeof val === 'string') return BigInt(val)
          if (typeof val === 'object' && val?.total !== undefined) return toBigInt(val.total)
          return 0n
        }
        
        // Don't use SDK's total - it double-counts boarding + settled
        // After onboarding, boarding.confirmed moves to settled/available
        // So we should NOT sum them both
        
        // Check if we have both boarding AND settled/available (indicates double-counting)
        const hasBoardingConfirmed = balanceData.boarding?.confirmed > 0 || balanceData.boarding?.total > 0
        const hasSettledOrAvailable = (balanceData.settled > 0 || balanceData.available > 0)
        
        if (hasBoardingConfirmed && hasSettledOrAvailable) {
          // Double-counting scenario detected!
          // Use only settled/available + recoverable (ignore boarding as it's already counted)
          console.warn('⚠️ Detected potential double-counting (boarding + settled both > 0)')
          totalBalance = 
            toBigInt(balanceData.available || 0) +
            toBigInt(balanceData.recoverable || 0)
        } else if (balanceData.total !== undefined) {
          // Safe to use SDK total if no double-counting detected
          totalBalance = toBigInt(balanceData.total)
        } else {
          // Fallback: use only available + recoverable (most reliable states)
          totalBalance = 
            toBigInt(balanceData.available || 0) +
            toBigInt(balanceData.recoverable || 0)
        }
        
        console.log('Balance breakdown:', {
          boarding: typeof balanceData.boarding === 'object' 
            ? `confirmed: ${balanceData.boarding.confirmed}, unconfirmed: ${balanceData.boarding.unconfirmed}, total: ${balanceData.boarding.total}`
            : balanceData.boarding?.toString(),
          settled: balanceData.settled?.toString(),
          preconfirmed: balanceData.preconfirmed?.toString(),
          available: balanceData.available?.toString(),
          recoverable: balanceData.recoverable?.toString(),
          sdkTotal: balanceData.total?.toString(),
          calculatedTotal: totalBalance.toString()
        })
      }
      
      // Store the TOTAL balance as BigInt, not the object
      balance.value = totalBalance
      
      return balanceData
    } catch (error) {
      console.error('Failed to get balance:', error)
      throw error
    }
  }

  const updateAddress = async () => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      const arkAddress = await wallet.value.getAddress()
      address.value = arkAddress
      console.log('Address updated:', arkAddress)
      return arkAddress
    } catch (error) {
      console.error('Failed to get address:', error)
      throw error
    }
  }

  const getBitcoinDepositAddress = async () => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      const boardingAddress = await wallet.value.getBoardingAddress()
      console.log('Boarding Address:', boardingAddress)
      return boardingAddress
    } catch (error) {
      console.error('Failed to get boarding address:', error)
      throw error
    }
  }

  const sendPayment = async (recipient, amount) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      const currentBalance = await wallet.value.getBalance()
      if (currentBalance.total < BigInt(amount)) throw new Error('Insufficient balance')
      
      // Send to Ark address using sendBitcoin (SDK method)
      const txid = await wallet.value.sendBitcoin({
        address: recipient,
        amount: amount  // SDK expects regular number, not BigInt
      })
      
      await updateBalance()
      return txid
    } catch (error) {
      console.error('Failed to send payment:', error)
      throw error
    }
  }

  const receivePayment = async () => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      // Sync wallet to claim any pending payments
      await updateBalance()
      
      return true
    } catch (error) {
      console.error('Failed to receive payment:', error)
      throw error
    }
  }

  const getVTXOs = async () => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      const addr = await wallet.value.getAddress()
      const vtxos = await wallet.value.walletRepository.getVtxos(addr)
      console.log('VTXOs:', vtxos)
      return vtxos
    } catch (error) {
      console.error('Failed to get VTXOs:', error)
      throw error
    }
  }


  const payBolt11Invoice = async (invoice, maxFeeSats = 1000) => {
    try {
      if (!arkadeLightning.value) throw new Error('Lightning not initialized')
      
      console.log('=== PAY LIGHTNING INVOICE DEBUG ===')
      console.log('Invoice:', invoice)
      console.log('Max fee (sats):', maxFeeSats)
      
      // Check current balance first
      const currentBalance = await wallet.value.getBalance()
      console.log('Current Arkade balance:', currentBalance)
      
      // Parse invoice to get amount
      let invoiceAmount = 0
      try {
        // Try to decode invoice to get amount (basic parsing)
        // This is a rough estimate - proper decoding would use a library
        console.log('Attempting to parse invoice amount...')
      } catch (e) {
        console.warn('Could not parse invoice amount:', e)
      }
      
      console.log('Calling arkadeLightning.sendLightningPayment...')
      
      // Send Lightning payment via submarine swap
      const paymentResult = await arkadeLightning.value.sendLightningPayment({
        invoice,
        // Some Boltz implementations might need these
        pairId: 'BTC/BTC',
        refundPublicKey: await identity.value.xOnlyPublicKey()
      })
      
      console.log('✅ Lightning payment successful:', paymentResult)
      console.log('=====================================')
      await updateBalance()
      
      return {
        amount: paymentResult.amount,
        preimage: paymentResult.preimage,
        txid: paymentResult.txid
      }
    } catch (error) {
      console.error('❌ Failed to pay Lightning invoice:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // Provide more helpful error messages
      if (error.message && error.message.includes('400')) {
        throw new Error('Boltz API rejected the swap request. This might be due to insufficient balance, invalid invoice, or API configuration issues. Please check your Arkade balance and try again.')
      } else if (error.message && error.message.includes('NetworkError')) {
        throw new Error('Network error connecting to Boltz API. Please check your internet connection and try again.')
      }
      
      throw error
    }
  }

  const receiveBolt11 = async (amountSats, description = '') => {
    try {
      if (!arkadeLightning.value) {
        throw new Error('Lightning not initialized')
      }
      
      // Convert to plain number (Boltz SDK expects a regular number)
      const amount = typeof amountSats === 'number' ? amountSats : parseInt(amountSats)
      
      console.log('Creating Lightning invoice via Boltz swap...')
      console.log('Amount:', amount, 'sats')
      
      // Debug: Check wallet and identity
      console.log('Wallet address:', await wallet.value.getAddress())
      const claimPubKey = await identity.value.xOnlyPublicKey()
      console.log('Claim public key (x-only, Uint8Array):', claimPubKey)
      console.log('Claim public key length:', claimPubKey?.length || 'undefined')
      console.log('Claim public key type:', typeof claimPubKey, Array.isArray(claimPubKey))
      
      // Convert to hex to see what we're actually sending
      const hex = await import('@scure/base')
      const claimPubKeyHex = hex.hex.encode(claimPubKey)
      console.log('Claim public key (hex):', claimPubKeyHex)
      console.log('Claim public key hex length:', claimPubKeyHex.length)
      
      // Create Lightning invoice via reverse submarine swap
      const result = await arkadeLightning.value.createLightningInvoice({
        amount: amount,
        description: description || 'Arkade Lightning payment'
      })
      
      console.log('Lightning invoice created:', result)
      
      // Debug the swap data
      debugSwapData('INITIAL SWAP DATA FROM BOLTZ', result.pendingSwap)
      
      // Return the invoice and start monitoring in background
      // The wallet will automatically claim when paid
      setTimeout(async () => {
        try {
          console.log('Waiting for Lightning payment...')
          
          // Pass swap data as-is - let's see what error we get
          console.log('Calling waitAndClaim with original swap data...')
          console.log('Timeout values:', result.pendingSwap.response.timeoutBlockHeights)
          const receivalResult = await arkadeLightning.value.waitAndClaim(result.pendingSwap)
          console.log('Lightning payment received!', receivalResult)
          await updateBalance()
        } catch (error) {
          console.error('Failed to claim Lightning payment:', error)
          debugSwapData('SWAP DATA WHEN CLAIM FAILED', result.pendingSwap)
          console.error('Pending swap data:', result.pendingSwap)
          console.error('Timeout values:', result.pendingSwap?.response?.timeoutBlockHeights)
        }
      }, 0)
      
      return result.invoice
    } catch (error) {
      console.error('Failed to create Lightning invoice:', error)
      throw error
    }
  }

  const onboard = async (bitcoinAddress, amount) => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      // Create onboard address for receiving Bitcoin
      const result = await wallet.value.onboard({
        address: bitcoinAddress,
        amount: BigInt(amount)
      })
      
      console.log('Onboard address created:', result)
      return result
    } catch (error) {
      console.error('Failed to create onboard address:', error)
      throw error
    }
  }

  const onboardBoardingUtxos = async () => {
    try {
      if (!wallet.value) throw new Error('Wallet not initialized')
      
      console.log('Starting onboarding process using Ramps...')
      
      // Use the Ramps class to onboard boarding UTXOs into VTXOs
      const onboardTxId = await new Ramps(wallet.value).onboard()
      
      console.log('Onboarding successful, TXID:', onboardTxId)
      
      // Update balance after onboarding
      await updateBalance()
      
      return onboardTxId
    } catch (error) {
      console.error('Failed to onboard boarding UTXOs:', error)
      throw error
    }
  }

  const cooperativeExit = async (address) => {
    // Placeholder for future exit implementation
    console.log('Cooperative exit to:', address)
    throw new Error('Cooperative exit not yet implemented')
  }


  return {
    wallet,
    privateKey: computed(() => privateKey.value),
    balance: computed(() => {
      if (balance.value === null || balance.value === undefined) {
        return '0'
      }
      
      // Handle Arkade balance object with multiple properties
      if (typeof balance.value === 'object') {
        const toBigInt = (val) => {
          if (typeof val === 'bigint') return val
          if (typeof val === 'number') return BigInt(val)
          if (typeof val === 'string') return BigInt(val)
          if (typeof val === 'object' && val !== null) {
            // Handle nested objects - try to extract a value
            if (val.value !== undefined) return toBigInt(val.value)
            if (val.amount !== undefined) return toBigInt(val.amount)
          }
          return 0n
        }
        
        try {
          // Log the balance breakdown for debugging
          console.log('Balance breakdown:', {
            boarding: balance.value.boarding,
            settled: balance.value.settled,
            preconfirmed: balance.value.preconfirmed,
            available: balance.value.available,
            recoverable: balance.value.recoverable,
            total: balance.value.total
          })
          
          // Use the SDK's total field if available, otherwise sum components
          // Note: Don't sum all fields as some may overlap (e.g., settled + available)
          if (balance.value.total !== undefined) {
            return toBigInt(balance.value.total).toString()
          }
          
          // Fallback: sum all balance components (may double-count)
          const total = 
            toBigInt(balance.value.boarding || 0) +
            toBigInt(balance.value.settled || 0) +
            toBigInt(balance.value.preconfirmed || 0) +
            toBigInt(balance.value.available || 0) +
            toBigInt(balance.value.recoverable || 0)
          
          return total.toString()
        } catch (e) {
          console.error('Error extracting balance from object:', e)
          return '0'
        }
      }
      
      // Handle simple numeric types
      if (typeof balance.value === 'bigint') {
        return balance.value.toString()
      }
      if (typeof balance.value === 'number') {
        return balance.value.toString()
      }
      
      return '0'
    }),
    address: computed(() => address.value),
    isInitialized: computed(() => isInitialized.value),
    initializationError: computed(() => initializationError.value),
    initialize,
    resetWallet,
    updateBalance,
    updateAddress,
    getBitcoinDepositAddress,
    sendPayment,
    receivePayment,
    getVTXOs,
    payBolt11Invoice,
    receiveBolt11,
    onboard,
    onboardBoardingUtxos,
    cooperativeExit
  }
}

