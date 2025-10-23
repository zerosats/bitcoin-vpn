<template>
  <Transition name="fade">
    <div v-if="message" class="toast" :class="type">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'info', // 'info', 'success', 'error', 'warning'
    validator: (value) => ['info', 'success', 'error', 'warning'].includes(value)
  }
})
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  max-width: 500px;
  text-align: center;
  backdrop-filter: blur(10px);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.toast.info {
  background: rgba(79, 195, 247, 0.9);
  color: #0a1628;
  border: 1px solid rgba(79, 195, 247, 1);
}

.toast.success {
  background: rgba(168, 255, 120, 0.9);
  color: #0a1628;
  border: 1px solid rgba(168, 255, 120, 1);
}

.toast.error {
  background: rgba(255, 107, 107, 0.9);
  color: white;
  border: 1px solid rgba(255, 107, 107, 1);
}

.toast.warning {
  background: rgba(255, 217, 0, 0.9);
  color: #0a1628;
  border: 1px solid rgba(255, 217, 0, 1);
}

/* Transition effects */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* Responsive */
@media (max-width: 600px) {
  .toast {
    max-width: 90%;
    padding: 0.875rem 1.5rem;
    font-size: 0.85rem;
  }
}
</style>

