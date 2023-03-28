import { strictEqual, deepStrictEqual } from 'assert'
import path from 'path'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs-core'
import Manifest from '../src/manifest.js'
import IPFSBlockStorage from '../src/storage/ipfs-block.js'
import config from './config.js'

describe('Manifest', () => {
  const repo = './ipfs'
  let ipfs
  let storage

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo })
    storage = await IPFSBlockStorage({ ipfs })
  })

  after(async () => {
    await storage.close()
    await ipfs.stop()
    await rmrf(repo)
  })

  it('creates a manifest', async () => {
    const name = 'manifest'
    const accessController = 'test/default-access-controller'
    const expectedHash = 'zdpuAmS2rAbTFfKBukPEUXnem5nkQSmEH5e1zsSZTG8pdkV7j'
    const expectedManifest = {
      name,
      accessController
    }

    const { hash, manifest } = await Manifest({ storage, name, accessController })

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest, expectedManifest)
  })

  it('creates a manifest with metadata', async () => {
    const name = 'manifest'
    const accessController = 'test/default-access-controller'
    const expectedHash = 'zdpuAvctUdeVL2zZWHegzQA7ADMJCPzYyhcKfhHqYcHuEXEwR'
    const meta = { name, description: 'more information about the database' }

    const { hash, manifest } = await Manifest({ storage, name, accessController, meta })

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest.meta, meta)
  })

  it('throws an error if storage is not specified', async () => {
    let err

    try {
      await Manifest({})
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: storage is required')
  })

  it('throws an error if name is not specified', async () => {
    let err

    try {
      await Manifest({ storage })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: name is required')
  })

  it('throws an error if address is not specified', async () => {
    let err

    try {
      await Manifest({ storage, name: 'manifest' })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: accessController is required')
  })
})
