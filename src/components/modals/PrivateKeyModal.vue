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

<style scoped src="../../styles/components/modals.css"></style>
