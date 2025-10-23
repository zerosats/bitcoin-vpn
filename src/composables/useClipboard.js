import { useToast } from './useToast'

export function useClipboard() {
  const { showSuccess, showError } = useToast()
  
  const copyToClipboard = async (text, successMsg = 'Copied to clipboard!') => {
    if (!text) {
      showError('Nothing to copy')
      return false
    }
    
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(successMsg, 2000)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      showError('Failed to copy to clipboard')
      return false
    }
  }
  
  return {
    copyToClipboard
  }
}

