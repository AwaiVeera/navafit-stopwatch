import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()

// Sensible defaults for every v2 function in this codebase; individual
// functions can override region/memory/timeout as needed.
setGlobalOptions({
  region: 'asia-southeast1',
  maxInstances: 10,
})

export { ayChat } from './ay/ayChat'
export { deleteMyAccount } from './account/deleteMyAccount'
export { onUserBootstrap } from './account/onUserCreate'
