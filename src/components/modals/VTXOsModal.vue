<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>📦 Your VTXOs</h3>
      <div v-if="vtxos && vtxos.length > 0" class="vtxos-list">
        <div v-for="(vtxo, index) in vtxos" :key="index" class="vtxo-item">
          <div class="vtxo-detail">
            <span class="label">Amount:</span>
            <span class="value">{{ vtxo.value?.toString() || 'N/A' }} sats</span>
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
      <button @click="$emit('close')" class="modal-btn primary">Close</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true
  },
  vtxos: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close'])
</script>

<style scoped>
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

.modal-btn {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

.modal-btn.primary {
  background: linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%);
  color: #0a1628;
}

.modal-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
</style>

