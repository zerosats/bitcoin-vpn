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

<style scoped src="../../styles/components/modals.css"></style>
