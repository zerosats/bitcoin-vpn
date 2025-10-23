# Spark-Ark-Cashu Wallet

A unified Bitcoin wallet supporting three different protocols: **Cashu** (ecash), **Spark** (Lightning L2 - currently disabled), and **Arkade** (Ark/VTXOs).

⚠️ **Note:** 
- Spark wallet is currently disabled due to interference with Arkade Lightning payments
- Using CASHU + ARKADE with Lightning support (via Boltz swaps at api.ark.boltz.exchange)

## Features

### 🔐 Cashu Wallet (Encrypted)
- Privacy-focused ecash tokens
- Mint and burn tokens
- Send and receive Cashu tokens
- Time-at-rest anonymity tracking
- Balance verification
- Recovery from seed phrase

### ⚡ Spark Wallet
- Lightning Network integration
- Spark address transfers
- Bitcoin deposits and withdrawals
- Lightning invoice creation and payment
- Static deposit addresses
- Mnemonic-based recovery

### 🏛️ Arkade Wallet (NEW!)
- Ark protocol with VTXOs (Virtual UTXOs)
- Bitcoin Layer 2 scaling
- Lightning payments via Ark
- Cooperative exits
- VTXO management
- Private key-based recovery

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Usage

### Getting Started

1. **Choose Your Protocol**: Switch between Cashu, Spark, and Arkade tabs
2. **Initialize Wallet**: Each protocol maintains its own wallet
3. **Backup Your Keys**: 
   - Cashu: Seed phrase
   - Spark: Mnemonic phrase (12-24 words)
   - Arkade: Private key (hex)

### Cashu (Encrypted) Wallet

- **Receive**: Create and share Cashu tokens
- **Send**: Redeem received tokens
- **Encrypt**: Convert Spark sats to Cashu tokens for privacy
- **Decrypt**: Convert Cashu tokens back to Spark

### Spark Wallet

- **Deposit**: Get Bitcoin or Lightning deposit address
- **Send**: Pay to Spark addresses or Lightning invoices
- **Receive**: Share your Spark address or create Lightning invoice
- **Withdraw**: Exit to Bitcoin mainnet

### Arkade Wallet

- **Receive**: Get your Ark address or offchain address
- **Send**: Pay to other Ark addresses
- **Lightning**: Create and pay Lightning invoices via Ark
- **VTXOs**: View and manage your Virtual UTXOs
- **Exit**: Cooperative withdrawal to Bitcoin

## Advanced Features

### Cashu Advanced
- **Verify Balance**: Confirm tokens with the mint
- **Clear Spent Proofs**: Clean up used tokens
- **Recover Tokens**: Find lost tokens
- **Restore from Seed**: Recover wallet from backup

### Spark Advanced
- **Recover Stuck Transfers**: Fix pending transfers
- **Reset Wallet**: Clear and reinitialize
- **View Recovery Phrase**: Access your mnemonic

### Arkade Advanced
- **View Private Key**: Access your recovery key
- **Reset Wallet**: Clear and reinitialize
- **View VTXOs**: Inspect your Virtual UTXOs

## Architecture

### Dependencies

- **@cashu/cashu-ts**: Cashu ecash protocol
- **@buildonspark/spark-sdk**: Spark Lightning L2
- **@arkade-os/sdk**: Arkade Ark protocol
- **Vue 3**: Frontend framework
- **Vite**: Build tool

### Composables

- `useCashuWallet.js`: Cashu wallet logic
- `useSparkWallet.js`: Spark wallet logic
- `useArkadeWallet.js`: Arkade wallet logic (NEW!)
- `useWalletBridge.js`: Cross-wallet operations

### Components

- `UnifiedWallet.vue`: Main unified interface with 3 tabs
- `CashuWallet.vue`: Standalone Cashu interface
- `SparkWallet.vue`: Standalone Spark interface
- `ArkadeWallet.vue`: Standalone Arkade interface (NEW!)

## Storage

All wallets use browser localStorage:
- **Cashu**: `cashu_seed`, `cashu_proofs`
- **Spark**: `spark_mnemonic`
- **Arkade**: `arkade_private_key`

⚠️ **Warning**: Clear browser data will delete your wallets. Always backup your recovery keys!

## Networks

- **Cashu**: Configurable mint URL (default: Garden Finance)
- **Spark**: MAINNET
- **Arkade**: MAINNET (https://arkade.computer)

## Security Notes

1. This is experimental software
2. Always backup your recovery keys
3. Never share your private keys or seed phrases
4. Start with small amounts
5. Arkade is currently on testnet

## Differences from Original

This fork adds **Arkade (Ark protocol)** as a third wallet option:
- Original supported Cashu + Spark
- Now supports Cashu + Spark + Arkade
- Unified interface with 3 tabs
- Same UI pattern for Spark and Arkade

## Development Roadmap

- [ ] Arkade to Cashu encryption flow
- [ ] Cashu to Arkade decryption flow
- [ ] Arkade mainnet support
- [ ] Enhanced VTXO management
- [ ] Cross-protocol atomic swaps

## License

MIT

## Credits

- Original Spark-Cashu wallet
- [Arkade SDK](https://github.com/arkade-os/ts-sdk)
- Cashu protocol
- Spark protocol

## Links

- [Cashu Protocol](https://cashu.space/)
- [Spark Documentation](https://docs.spark.garden/)
- [Arkade SDK](https://github.com/arkade-os/ts-sdk)
- [Ark Protocol](https://ark-protocol.org/)

