<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>⚠️ Arkade Private Key</h3>
      <p class="warning-text">Keep this key safe! Anyone with access to it can access your funds.</p>
      <div class="mnemonic-box">
        {{ privateKey || 'No private key available' }}
      </div>
      <button @click="handleCopy" class="modal-btn secondary">
        📋 Copy Private Key
      </button>
      <button @click="$emit('close')" class="modal-btn primary">Close</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  privateKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'copy'])

const handleCopy = () => {
  emit('copy', props.privateKey)
}
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

.warning-text {
  color: #ffd900;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  opacity: 0.9;
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
</style>

