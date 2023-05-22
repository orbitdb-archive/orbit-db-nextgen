/**
 * @namespace module:IdentityProviders.IdentityProviders-PublicKey
 * @description PublicKey Identity Provider
 */
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { signMessage, verifyMessage } from '../../key-store.js'

const type = 'publickey'

const verifyIdentity = identity => {
  const { id, publicKey, signatures } = identity
  // Verify that identity was signed by the ID
  return verifyMessage(signatures.publicKey, id, publicKey + signatures.id)
}

const PublicKeyIdentityProvider = ({ keystore }) => {
  if (!keystore) {
    throw new Error('PublicKeyIdentityProvider requires a keystore parameter')
  }

  const getId = async ({ id } = {}) => {
    if (!id) {
      throw new Error('id is required')
    }

    const key = await keystore.getKey(id) || await keystore.createKey(id)
    return uint8ArrayToString(key.public.marshal(), 'base16')
  }

  const signIdentity = async (data, { id } = {}) => {
    if (!id) {
      throw new Error('id is required')
    }

    const key = await keystore.getKey(id)
    if (!key) {
      throw new Error(`Signing key for '${id}' not found`)
    }

    return signMessage(key, data)
  }

  return {
    getId,
    signIdentity
  }
}

export { PublicKeyIdentityProvider as default, verifyIdentity, type }
