import QRCode from 'qrcode'

export function useQRCode() {
  /**
   * Generate QR code on a canvas element
   * @param {string} data - The data to encode in the QR code
   * @param {string} canvasId - The ID of the canvas element
   * @param {object} options - QRCode options
   * @returns {Promise<boolean>} - Success status
   */
  const generateQR = async (data, canvasId, options = {}) => {
    try {
      const canvas = document.getElementById(canvasId)
      if (!canvas) {
        console.error(`Canvas with id "${canvasId}" not found`)
        return false
      }
      
      const defaultOptions = {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }
      
      await QRCode.toCanvas(canvas, data, { ...defaultOptions, ...options })
      return true
    } catch (error) {
      console.error('Error generating QR code:', error)
      return false
    }
  }
  
  /**
   * Generate QR code as a data URL
   * @param {string} data - The data to encode in the QR code
   * @param {object} options - QRCode options
   * @returns {Promise<string|null>} - Data URL or null on error
   */
  const generateQRDataURL = async (data, options = {}) => {
    try {
      const defaultOptions = {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }
      
      return await QRCode.toDataURL(data, { ...defaultOptions, ...options })
    } catch (error) {
      console.error('Error generating QR data URL:', error)
      return null
    }
  }
  
  return {
    generateQR,
    generateQRDataURL
  }
}

