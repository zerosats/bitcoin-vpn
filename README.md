# Arkade Wallet Desktop

A unified Bitcoin desktop wallet built with Tauri, supporting three different protocols: **Cashu** (ecash), **Spark** (Lightning L2 - currently disabled), and **Arkade** (Ark/VTXOs).

⚠️ **Note:** 
- This is the **desktop version** built with Tauri for better security and native performance
- Spark wallet is currently disabled due to interference with Arkade Lightning payments
- Using CASHU + ARKADE with Lightning support (via Boltz swaps at api.ark.boltz.exchange)

## Downloads

Download the latest release for your platform:
- **macOS**: `.dmg` installer
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` or `.deb` package

Visit the [Releases](https://github.com/zerosats/arkade-wallet-desktop/releases) page to download.

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

## Desktop Development

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Rust** (latest stable)
   ```bash
   # Install Rust from https://rustup.rs/
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. **Platform-specific dependencies**:
   - **macOS**: Xcode Command Line Tools
   - **Linux**: 
     ```bash
     sudo apt update
     sudo apt install libwebkit2gtk-4.0-dev \
       build-essential \
       curl \
       wget \
       file \
       libssl-dev \
       libgtk-3-dev \
       libayatana-appindicator3-dev \
       librsvg2-dev
     ```
   - **Windows**: Microsoft C++ Build Tools

### Installation

```bash
npm install
```

### Run Desktop App in Development

```bash
npm run tauri:dev
```

This will start the Vite dev server and launch the Tauri desktop app with hot-reload enabled.

### Build Desktop App for Production

```bash
npm run tauri:build
```

The built application will be in `src-tauri/target/release/bundle/`

### Web Version (Alternative)

You can still run the web version:

```bash
# Development
npm run dev

# Build
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

### Desktop App
The desktop version uses Tauri's secure file system storage:
- **Location**: Platform-specific app data directory
  - macOS: `~/Library/Application Support/com.zerosats.arkade-wallet/`
  - Linux: `~/.config/arkade-wallet/`
  - Windows: `%APPDATA%\com.zerosats.arkade-wallet\`
- **Wallets**: 
  - **Cashu**: `cashu_seed`, `cashu_proofs`
  - **Spark**: `spark_mnemonic`
  - **Arkade**: `arkade_private_key`

### Web Version
Uses browser localStorage (same keys as above).

⚠️ **Warning**: Always backup your recovery keys! Desktop app data persists between launches, but uninstalling the app may clear data.

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

## Desktop Version Features

This desktop version adds:
- **Native Desktop App**: Built with Tauri for macOS, Windows, and Linux
- **Better Security**: Isolated runtime environment with controlled permissions
- **Persistent Storage**: Platform-native secure storage (not browser localStorage)
- **Smaller Bundle**: ~10-20MB (vs typical Electron apps at 150MB+)
- **Better Performance**: Native performance with Rust backend
- **System Integration**: Native notifications, system tray support
- **Auto-updates**: Built-in update mechanism (coming soon)

## Differences from Original Web Version

- **Platform**: Desktop app (Tauri) instead of web-only
- **Protocols**: Adds **Arkade (Ark protocol)** as a third wallet option
- **Architecture**: 
  - Original supported Cashu + Spark
  - Now supports Cashu + Spark + Arkade
  - Unified interface with 3 tabs
  - Desktop-native features

## Publishing Releases

The project includes GitHub Actions for automated multi-platform builds.

### Creating a Release

1. **Tag a new version**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions will automatically**:
   - Build for macOS, Windows, and Linux
   - Create installers for each platform
   - Create a draft release with all binaries
   - Upload artifacts to GitHub Releases

3. **Review and publish**:
   - Go to GitHub Releases
   - Edit the draft release
   - Add release notes
   - Publish the release

### Manual Build

To build locally for your platform:
```bash
npm run tauri:build
```

Binaries will be in `src-tauri/target/release/bundle/`

## Development Roadmap

### Desktop Features
- [ ] Auto-update mechanism
- [ ] System tray with quick actions
- [ ] Native notifications for transactions
- [ ] Hardware wallet integration
- [ ] Enhanced security with OS keychain

### Wallet Features
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

