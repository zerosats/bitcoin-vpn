<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>📤 Send to Ark Address</h3>
      <p class="modal-info">Send funds to another Ark address</p>
      
      <input 
        v-model="address" 
        type="text" 
        placeholder="Ark address (ark1...)"
        class="modal-input"
      />
      <input 
        v-model.number="amount" 
        type="number" 
        placeholder="Amount (sats)"
        class="modal-input"
      />
      
      <div class="balance-info">
        Available: {{ balance }} sats
      </div>
      
      <button 
        @click="handleSend" 
        class="modal-btn primary"
        :disabled="!address || !amount || sending"
      >
        {{ sending ? 'Sending...' : 'Send' }}
      </button>
      <button @click="handleClose" class="modal-btn secondary">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  sending: {
    type: Boolean,
    default: false
  },
  balance: {
    type: [String, Number],
    default: '0'
  }
})

const emit = defineEmits(['close', 'send'])

const address = ref('')
const amount = ref(null)

// Reset state when modal is closed
watch(() => props.show, (newVal) => {
  if (!newVal) {
    address.value = ''
    amount.value = null
  }
})

const handleSend = () => {
  emit('send', { address: address.value, amount: amount.value })
}

const handleClose = () => {
  emit('close')
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

.modal-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
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

