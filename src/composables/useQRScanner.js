import { ref, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

export function useQRScanner() {
  const scanner = ref(null)
  const isScanning = ref(false)
  const error = ref(null)
  const lastScannedCode = ref(null)
  const isProcessing = ref(false)

  /**
   * Start QR code scanning
   * @param {string} elementId - The ID of the element to render the scanner
   * @param {Function} onScanSuccess - Callback when QR code is successfully scanned
   * @param {Function} onScanError - Optional callback for scan errors
   * @returns {Promise<boolean>} - Success status
   */
  const startScanning = async (elementId, onScanSuccess, onScanError = null) => {
    try {
      if (isScanning.value) {
        console.warn('Scanner is already running')
        return false
      }

      error.value = null
      lastScannedCode.value = null
      isProcessing.value = false
      
      // Create scanner instance
      scanner.value = new Html5Qrcode(elementId)
      
      const config = {
        fps: 10, // Frames per second for scanning
        qrbox: { width: 250, height: 250 }, // Scanning box size
        aspectRatio: 1.0
      }
      
      // Success callback
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // Prevent duplicate processing - check immediately
        if (isProcessing.value || decodedText === lastScannedCode.value) {
          console.log('Duplicate scan detected, ignoring...')
          return
        }
        
        // Mark as processing immediately to prevent race conditions
        isProcessing.value = true
        lastScannedCode.value = decodedText
        isScanning.value = false
        
        console.log('QR Code scanned:', decodedText)
        
        // STOP THE SCANNER IMMEDIATELY - Don't wait for anything!
        // This is critical to prevent the forever scan loop from continuing
        if (scanner.value) {
          scanner.value.stop().then(() => {
            console.log('Scanner stopped successfully')
            // Call the success callback AFTER stopping
            if (onScanSuccess) {
              onScanSuccess(decodedText, decodedResult)
            }
          }).catch(err => {
            console.error('Error stopping scanner:', err)
            // Still call the callback even if stop failed
            if (onScanSuccess) {
              onScanSuccess(decodedText, decodedResult)
            }
          })
        } else {
          // No scanner, just call the callback
          if (onScanSuccess) {
            onScanSuccess(decodedText, decodedResult)
          }
        }
      }
      
      // Error callback (called frequently when no QR is detected, so we keep it quiet)
      const qrCodeErrorCallback = (errorMessage) => {
        // Only log actual errors, not "No QR code found" messages
        if (onScanError && !errorMessage.includes('NotFoundException')) {
          onScanError(errorMessage)
        }
      }
      
      // Start scanning
      await scanner.value.start(
        { facingMode: 'environment' }, // Use back camera on mobile
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      )
      
      isScanning.value = true
      console.log('QR Scanner started successfully')
      return true
      
    } catch (err) {
      console.error('Failed to start QR scanner:', err)
      error.value = err.message || 'Failed to start camera'
      isScanning.value = false
      
      // Handle specific errors
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        error.value = 'Camera permission denied. Please allow camera access.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        error.value = 'No camera found on this device.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        error.value = 'Camera is already in use by another application.'
      }
      
      return false
    }
  }

  /**
   * Stop QR code scanning
   */
  const stopScanning = async () => {
    try {
      if (scanner.value) {
        // Try to stop the scanner
        if (isScanning.value) {
          await scanner.value.stop()
          console.log('QR Scanner stopped')
        }
        
        // Clear the scanner instance
        try {
          scanner.value.clear()
        } catch (e) {
          // Ignore clear errors
        }
        
        scanner.value = null
      }
      
      // Reset all flags
      isScanning.value = false
      isProcessing.value = false
      lastScannedCode.value = null
    } catch (err) {
      console.error('Error stopping scanner:', err)
      // Still reset flags even if stop fails
      isScanning.value = false
      isProcessing.value = false
      lastScannedCode.value = null
    }
  }

  /**
   * Request camera permissions
   */
  const requestPermissions = async () => {
    try {
      const devices = await Html5Qrcode.getCameras()
      return devices.length > 0
    } catch (err) {
      console.error('Error checking camera permissions:', err)
      return false
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopScanning()
  })

  return {
    isScanning,
    error,
    startScanning,
    stopScanning,
    requestPermissions
  }
}

