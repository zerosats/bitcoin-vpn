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

<style scoped src="../../styles/components/modals.css"></style>
