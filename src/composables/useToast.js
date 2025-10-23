import { ref } from 'vue'

// Shared toast state (singleton pattern)
const message = ref('')
const messageType = ref('info')
let timeoutId = null

export function useToast() {
  const showMessage = (msg, type = 'info', duration = 3000) => {
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    message.value = msg
    messageType.value = type
    
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        message.value = ''
        timeoutId = null
      }, duration)
    }
  }
  
  const showSuccess = (msg, duration = 3000) => {
    showMessage(msg, 'success', duration)
  }
  
  const showError = (msg, duration = 3000) => {
    showMessage(msg, 'error', duration)
  }
  
  const showInfo = (msg, duration = 3000) => {
    showMessage(msg, 'info', duration)
  }
  
  const showWarning = (msg, duration = 3000) => {
    showMessage(msg, 'warning', duration)
  }
  
  const clearMessage = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    message.value = ''
  }
  
  return {
    message,
    messageType,
    showMessage,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    clearMessage
  }
}

