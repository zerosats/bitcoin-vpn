<template>
  <div v-if="show" class="dropdown-menu">
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: #1f232b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  min-width: 260px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-menu :deep(.menu-item) {
  width: 100%;
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-menu :deep(.menu-item:last-child) {
  border-bottom: none;
}

.dropdown-menu :deep(.menu-item:hover:not(:disabled)) {
  background: rgba(255, 255, 255, 0.05);
}

.dropdown-menu :deep(.menu-item:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

