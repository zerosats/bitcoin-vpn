// Shadow Arkade Wallet for Cashu Operations
// This is a COMPLETELY SEPARATE instance of Arkade wallet used exclusively for:
// - Receiving funds from Cashu decrypt operations
// - Withdrawing fresh VTXOs to Bitcoin L1
// It's never shown in the main Arkade tab UI

import { ref, computed } from 'vue'
import { Wallet, SingleKey, RestArkProvider, RestIndexerProvider, Ramps } from '@arkade-os/sdk'
import { LocalStorageAdapter } from '@arkade-os/sdk/adapters/localStorage'
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap'

// Shadow wallet state (completely separate from main wallet)
const shadowWallet = ref(null)
const shadowArkadeLightning = ref(null)
const shadowIdentity = ref(null)
const shadowPrivateKey = ref(null)
const shadowBalance = ref(0n)
const shadowAddress = ref('')
const shadowIsInitialized = ref(false)

export function useArkadeShadowWallet() {
  const updateBalance = async () => {
    try {
      if (!shadowWallet.value) throw new Error('Shadow wallet not initialized')
      
      const balanceData = await shadowWallet.value.getBalance()
      
      let totalBalance = 0n
      if (balanceData && typeof balanceData === 'object') {
        const toBigInt = (val) => {
          if (typeof val === 'bigint') return val
          if (typeof val === 'number') return BigInt(val)
          if (typeof val === 'string') return BigInt(val)
          if (typeof val === 'object' && val?.total !== undefined) return toBigInt(val.total)
          return 0n
        }
        
        const hasBoardingConfirmed = balanceData.boarding?.confirmed > 0 || balanceData.boarding?.total > 0
        const hasSettledOrAvailable = (balanceData.settled > 0 || balanceData.available > 0)
        
        if (hasBoardingConfirmed && hasSettledOrAvailable) {
          totalBalance = 
            toBigInt(balanceData.available || 0) +
            toBigInt(balanceData.recoverable || 0)
        } else if (balanceData.total !== undefined) {
          totalBalance = toBigInt(balanceData.total)
        } else {
          totalBalance = 
            toBigInt(balanceData.available || 0) +
            toBigInt(balanceData.recoverable || 0)
        }
      }
      
      shadowBalance.value = totalBalance
      return balanceData
    } catch (error) {
      console.error('Failed to get shadow wallet balance:', error)
      throw error
    }
  }

  const updateAddress = async () => {
    try {
      if (!shadowWallet.value) throw new Error('Shadow wallet not initialized')
      const arkAddress = await shadowWallet.value.getAddress()
      shadowAddress.value = arkAddress
      return arkAddress
    } catch (error) {
      console.error('Failed to get shadow wallet address:', error)
      throw error
    }
  }

  const getVTXOs = async () => {
    try {
      if (!shadowWallet.value) throw new Error('Shadow wallet not initialized')
      const vtxos = await shadowWallet.value.getVtxos({ withRecoverable: true })
      console.log('Shadow wallet VTXOs:', vtxos)
      return vtxos
    } catch (error) {
      console.error('Failed to get shadow wallet VTXOs:', error)
      throw error
    }
  }

  const receiveBolt11 = async (amountSats, description = '') => {
    try {
      if (!shadowArkadeLightning.value) {
        throw new Error('Shadow Lightning not initialized')
      }
      
      const amount = typeof amountSats === 'number' ? amountSats : parseInt(amountSats)
      console.log('Creating Lightning invoice via shadow wallet...')
      
      const result = await shadowArkadeLightning.value.createLightningInvoice({
        amount: amount,
        description: description || 'Shadow Arkade Lightning payment'
      })
      
      console.log('Shadow wallet Lightning invoice created:', result)
      
      // Monitor for payment in background
      setTimeout(async () => {
        try {
          console.log('Waiting for Lightning payment to shadow wallet...')
          const receivalResult = await shadowArkadeLightning.value.waitAndClaim(result.pendingSwap)
          console.log('Lightning payment received by shadow wallet!', receivalResult)
          await updateBalance()
        } catch (error) {
          console.error('Failed to claim Lightning payment to shadow wallet:', error)
        }
      }, 0)
      
      return result.invoice
    } catch (error) {
      console.error('Failed to create Lightning invoice for shadow wallet:', error)
      throw error
    }
  }

  const cooperativeExit = async (address, amount, vtxo = null) => {
    try {
      if (!shadowWallet.value) throw new Error('Shadow wallet not initialized')
      
      console.log('Starting cooperative exit from shadow wallet...')
      console.log('Exit to address:', address)
      console.log('Amount:', amount, 'sats')
      
      if (!address || address.length < 26) {
        throw new Error('Invalid Bitcoin address')
      }
      
      let vtxosToSettle = []
      
      if (vtxo) {
        vtxosToSettle = [vtxo]
      } else {
        const allVtxos = await shadowWallet.value.getVtxos({ withRecoverable: true })
        let accumulated = 0
        for (const v of allVtxos) {
          if (accumulated >= amount) break
          vtxosToSettle.push(v)
          accumulated += v.value || 0
        }
        
        if (accumulated < amount) {
          throw new Error(`Insufficient VTXOs. Need ${amount} sats, found ${accumulated} sats`)
        }
      }
      
      console.log(`Settling ${vtxosToSettle.length} VTXO(s) from shadow wallet...`)
      
      const txid = await shadowWallet.value.settle(
        {
          inputs: vtxosToSettle,
          outputs: [{ address: address, amount: BigInt(amount) }]
        },
        (event) => console.log('Shadow wallet settlement event:', event)
      )
      
      console.log('✅ Settlement from shadow wallet successful! TXID:', txid)
      await updateBalance()
      
      return txid
    } catch (error) {
      console.error('Failed to exit from shadow wallet:', error)
      throw error
    }
  }

  return {
    wallet: shadowWallet,
    privateKey: computed(() => shadowPrivateKey.value),
    balance: computed(() => shadowBalance.value),
    address: computed(() => shadowAddress.value),
    isInitialized: computed(() => shadowIsInitialized.value),
    updateBalance,
    updateAddress,
    getVTXOs,
    receiveBolt11,
    cooperativeExit
  }
}

// Initialize the shadow wallet with its own storage key
export async function initializeShadowWallet() {
  const SHADOW_KEY = 'arkade_shadow_private_key'
  
  try {
    let savedShadowKey = localStorage.getItem(SHADOW_KEY)
    
    console.log('🌑 Initializing shadow Arkade wallet...')
    
    // Create or restore shadow identity
    if (savedShadowKey) {
      shadowIdentity.value = SingleKey.fromHex(savedShadowKey)
      shadowPrivateKey.value = savedShadowKey
      console.log('Restored shadow identity from saved key')
    } else {
      shadowIdentity.value = SingleKey.fromRandomBytes()
      shadowPrivateKey.value = shadowIdentity.value.toHex()
      localStorage.setItem(SHADOW_KEY, shadowPrivateKey.value)
      console.log('Created new shadow identity')
    }
    
    // Create ISOLATED storage adapter for shadow wallet
    // This prevents conflicts with main wallet storage
    const storage = new LocalStorageAdapter()
    
    // Wrap the storage adapter to use a different namespace
    const shadowStorage = {
      async getItem(key) {
        return await storage.getItem(`shadow_${key}`)
      },
      async setItem(key, value) {
        return await storage.setItem(`shadow_${key}`, value)
      },
      async removeItem(key) {
        return await storage.removeItem(`shadow_${key}`)
      },
      async clear() {
        // Only clear shadow keys
        const allKeys = Object.keys(localStorage)
        for (const key of allKeys) {
          if (key.startsWith('shadow_')) {
            localStorage.removeItem(key)
          }
        }
      },
      async keys() {
        const allKeys = await storage.keys()
        return allKeys.filter(k => k.startsWith('shadow_')).map(k => k.replace('shadow_', ''))
      }
    }
    
    const arkServerUrl = 'https://arkade.computer'
    const esploraUrl = 'https://blockstream.info/api'
    
    // Create shadow wallet instance with isolated storage
    shadowWallet.value = await Wallet.create({
      identity: shadowIdentity.value,
      arkServerUrl,
      esploraUrl,
      storage: shadowStorage
    })
    
    // Initialize Lightning for shadow wallet
    const swapProvider = new BoltzSwapProvider({
      apiUrl: 'https://api.ark.boltz.exchange',
      network: 'bitcoin'
    })
    
    const xOnlyPubKey = await shadowIdentity.value.xOnlyPublicKey()
    const identityWrapper = {
      ...shadowIdentity.value,
      xOnlyPublicKey: () => xOnlyPubKey,
      compressedPublicKey: () => shadowIdentity.value.compressedPublicKey(),
      signMessage: (msg, type) => shadowIdentity.value.signMessage(msg, type),
      sign: (tx, indexes) => shadowIdentity.value.sign(tx, indexes),
      signerSession: () => shadowIdentity.value.signerSession()
    }
    
    const walletWrapper = new Proxy(shadowWallet.value, {
      get(target, prop) {
        if (prop === 'identity') return identityWrapper
        const value = target[prop]
        if (typeof value === 'function') return value.bind(target)
        return value
      }
    })
    
    shadowArkadeLightning.value = new ArkadeLightning({
      wallet: walletWrapper,
      arkProvider: new RestArkProvider(arkServerUrl),
      indexerProvider: new RestIndexerProvider(arkServerUrl),
      swapProvider,
      timeoutConfig: { invoiceExpirySeconds: 30 }
    })
    
    // Get initial balance and address
    try {
      const shadow = useArkadeShadowWallet()
      await shadow.updateBalance()
      await shadow.updateAddress()
    } catch (e) {
      console.warn('Could not get initial shadow wallet data:', e.message)
    }
    
    shadowIsInitialized.value = true
    console.log('✅ Shadow Arkade wallet initialized')
    console.log('Shadow wallet address:', shadowAddress.value)
    
    return useArkadeShadowWallet()
  } catch (error) {
    console.error('Failed to initialize shadow Arkade wallet:', error)
    shadowIsInitialized.value = false
    throw error
  }
}

