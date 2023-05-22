export {
  default as Identities,
  addIdentityProvider,
  removeIdentityProvider,
  isProviderSupported
} from './identities.js'

export {
  default as Identity,
  isIdentity,
  isEqual
} from './identity.js'

export { PublicKeyIdentityProvider } from './providers/index.js'
