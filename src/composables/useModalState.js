import { ref, reactive } from 'vue'

export function useModalState() {
  const modals = reactive({
    send: false,
    receive: false,
    arkadeDeposit: false,
    arkadeSend: false,
    arkadePrivateKey: false,
    vtxos: false
  })
  
  const openModal = (modalName) => {
    if (modalName in modals) {
      modals[modalName] = true
    } else {
      console.warn(`Modal "${modalName}" does not exist`)
    }
  }
  
  const closeModal = (modalName) => {
    if (modalName in modals) {
      modals[modalName] = false
    } else {
      console.warn(`Modal "${modalName}" does not exist`)
    }
  }
  
  const toggleModal = (modalName) => {
    if (modalName in modals) {
      modals[modalName] = !modals[modalName]
    } else {
      console.warn(`Modal "${modalName}" does not exist`)
    }
  }
  
  const closeAll = () => {
    Object.keys(modals).forEach(key => {
      modals[key] = false
    })
  }
  
  const isOpen = (modalName) => {
    return modals[modalName] || false
  }
  
  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAll,
    isOpen
  }
}

