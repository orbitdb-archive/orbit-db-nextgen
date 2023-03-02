import { deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Entry, Database, KeyStore, Identities } from '../../../src/index.js'
import { DocumentStore } from '../../../src/db/index.js'
import { config, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import testKeysPath from '../../fixtures/test-keys-path.js '
import connectPeers from '../../utils/connect-nodes.js'
import waitFor from '../../utils/wait-for.js'

const OpLog = { Log, Entry }
const keysPath = './testkeys'
const IPFS = 'js-ipfs'

describe('Documents Database Replication', function () {
  this.timeout(5000)

  let ipfsd1, ipfsd2
  let ipfs1, ipfs2
  let keystore
  let identities
  let testIdentity1, testIdentity2
  let db1, db2

  const databaseId = 'documentstore-AAA'

  const accessController = {
    canAppend: async (entry) => {
      const identity1 = await identities.getIdentity(entry.identity)
      const identity2 = await identities.getIdentity(entry.identity)
      return identity1.id === testIdentity1.id || identity2.id === testIdentity2.id
    }
  }

  before(async () => {
    ipfsd1 = await startIpfs(IPFS, config.daemon1)
    ipfsd2 = await startIpfs(IPFS, config.daemon2)
    ipfs1 = ipfsd1.api
    ipfs2 = ipfsd2.api

    await connectPeers(ipfs1, ipfs2)

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities = await Identities({ keystore })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
    testIdentity2 = await identities.createIdentity({ id: 'userB' })
  })

  after(async () => {
    if (ipfsd1) {
      await stopIpfs(ipfsd1)
    }

    if (ipfsd2) {
      await stopIpfs(ipfsd2)
    }

    if (keystore) {
      await keystore.close()
    }

    await rmrf(keysPath)
    await rmrf('./orbitdb1')
    await rmrf('./orbitdb2')
  })

  beforeEach(async () => {
    db1 = await DocumentStore({ OpLog, Database, ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    db2 = await DocumentStore({ OpLog, Database, ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })
  })

  afterEach(async () => {
    if (db1) {
      await db1.drop()
      await db1.close()
    }
    if (db2) {
      await db2.drop()
      await db2.close()
    }
  })

  it('gets all documents', async () => {
    let updateDB1Count = 0
    let updateDB2Count = 0

    const onDB1Update = (entry) => {
      ++updateDB1Count
    }

    const onDB2Update = (entry) => {
      ++updateDB2Count
    }

    db1.events.on('update', onDB1Update)
    db2.events.on('update', onDB2Update)

    await db1.put({ _id: 1, msg: 'record 1 on db 1' })
    await db2.put({ _id: 2, msg: 'record 2 on db 2' })
    await db1.put({ _id: 3, msg: 'record 3 on db 1' })
    await db2.put({ _id: 4, msg: 'record 4 on db 2' })

    await waitFor(() => updateDB1Count, () => 4)
    await waitFor(() => updateDB2Count, () => 4)

    const all1 = []
    for await (const item of db1.iterator()) {
      all1.unshift(item)
    }

    const all2 = []
    for await (const item of db2.iterator()) {
      all2.unshift(item)
    }

    deepStrictEqual(all1, all2)
  })
})
