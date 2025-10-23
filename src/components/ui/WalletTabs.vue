<template>
  <div class="wallet-tabs">
    <div class="tabs-container">
      <button 
        @click="$emit('update:activeTab', 'encrypted')" 
        :class="{ active: activeTab === 'encrypted' }"
        class="tab"
      >
        CASHU
      </button>
      <button 
        @click="$emit('update:activeTab', 'arkade')" 
        :class="{ active: activeTab === 'arkade' }"
        class="tab"
      >
        ARKADE
      </button>
    </div>
    <div class="menu-container">
      <button class="menu-button" :class="{ 'encrypted-mode': activeTab === 'encrypted' }" @click="$emit('toggleMenu')">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </button>
      <slot name="menu"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeTab: {
    type: String,
    required: true
  }
})

defineEmits(['update:activeTab', 'toggleMenu'])
</script>

<style scoped>
/* Tab Toggle */
.wallet-tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  margin-bottom: 3rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.tabs-container {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.tab {
  padding: 1.25rem 3rem;
  background: #1f232b;
  border: none;
  color: #616877;
  font-weight: 700;
  font-size: 0.875rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 14px;
  transition: all 0.3s ease;
  position: relative;
  min-width: 160px;
}

.tab.active {
  color: white;
  background: #252933;
  box-shadow: 0 4px 12px rgba(0, 242, 225, 0.15);
}

/* Three-dot Menu */
.menu-container {
  position: relative;
}

.menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 2.875rem;
  height: 2.875rem;
  border-radius: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.menu-button:hover {
  background: rgba(255, 75, 43, 0.1);
}

.menu-button.encrypted-mode:hover {
  background: rgba(255, 217, 0, 0.1);
}

/* Default dots (arkade mode - orange/red) */
.menu-button .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff4b2b;
  display: block;
  transition: background 0.3s ease;
  flex-shrink: 0;
}

/* Encrypted mode dots (yellow) */
.menu-button.encrypted-mode .dot {
  background: #FFD900;
}

/* Responsive */
@media (max-width: 600px) {
  .tab {
    padding: 0.875rem 1.25rem;
    font-size: 0.65rem;
  }
}
</style>

