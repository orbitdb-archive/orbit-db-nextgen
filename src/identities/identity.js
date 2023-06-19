import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

const Identity = async ({ id, publicKey, signatures, type, sign, verify } = {}) => {
  /**
   * @namespace module:Identities~Identity
   * @description The Identity instance. Returned by
   * [Identities.createIdentity()]{@link module:Identities~Identities#createIdentity}.
   *
   * Available Identity instance properties and functions are:
   * - **id:** A unique identifer for the identity.
   * - **publicKey:** A public key.
   * - **signatures:** A signed identity id and public key.
   * - **type:** The type of identity provider.
   * - **sign:** A sign function.
   * - **verify:** A verify function.
   */
  if (id == null) throw new Error('Identity id is required')
  if (publicKey == null) throw new Error('Invalid public key')
  if (signatures == null) throw new Error('Signatures object is required')
  if (signatures.id == null) throw new Error('Signature of id is required')
  if (signatures.publicKey == null) throw new Error('Signature of publicKey+id is required')
  if (type == null) throw new Error('Identity type is required')

  signatures = Object.assign({}, signatures)

  const identity = {
    id,
    publicKey,
    signatures,
    type,
    sign,
    verify
  }

  const { hash, bytes } = await _encodeIdentity(identity)
  identity.hash = hash
  identity.bytes = bytes

  return identity
}

const _encodeIdentity = async (identity) => {
  const { id, publicKey, signatures, type } = identity
  const value = { id, publicKey, signatures, type }
  const { cid, bytes } = await Block.encode({ value, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  return { hash, bytes: Uint8Array.from(bytes) }
}

const decodeIdentity = async (bytes) => {
  const { value } = await Block.decode({ bytes, codec, hasher })
  return Identity({ ...value })
}

/**
 * Verifies whether an identity is valid.
 * @param {Identity} identity The identity to verify.
 * @return {boolean} True if the identity is valid, false otherwise.
 * @static
 */
const isIdentity = (identity) => {
  return identity.id != null &&
    identity.hash != null &&
    identity.bytes != null &&
    identity.publicKey != null &&
    identity.signatures != null &&
    identity.signatures.id != null &&
    identity.signatures.publicKey != null &&
    identity.type != null
}

/**
 * Evaluates whether two identities are equal.
 * @param {Identity} a First identity.
 * @param {Identity} b Second identity.
 * @return {boolean} True if identity a and b are equal, false otherwise.
 * @static
 */
const isEqual = (a, b) => {
  return a.id === b.id &&
    a.hash === b.hash &&
    a.type === b.type &&
    a.publicKey === b.publicKey &&
    a.signatures.id === b.signatures.id &&
    a.signatures.publicKey === b.signatures.publicKey
}

export { Identity as default, isEqual, isIdentity, decodeIdentity }
