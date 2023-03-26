import assert from 'assert'
import rmrf from 'rimraf'
import OrbitDB from '../../src/OrbitDB.js'
import * as IPFS from 'ipfs'
import Keystore from '../../src/key-store.js'
import Identities from '../../src/identities/identities.js'
import OrbitDBAccessController from '../../src/access-controllers/orbitdb.js'
import config from '../config.js'
import connectPeers from '../utils/connect-nodes.js'

const dbPath1 = './orbitdb/tests/orbitdb-access-controller/1'
const dbPath2 = './orbitdb/tests/orbitdb-access-controller/2'

describe('OrbitDBAccessController', function () {
  this.timeout(config.timeout)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2
  let identities1, identities2, testIdentity1, testIdentity2

  before(async () => {
    ipfs1 = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
    ipfs2 = await IPFS.create({ ...config.daemon2, repo: './ipfs2' })
    await connectPeers(ipfs1, ipfs2)

    const keystore1 = await Keystore({ path: dbPath1 + '/keys' })
    const keystore2 = await Keystore({ path: dbPath2 + '/keys' })

    identities1 = await Identities({ keystore: keystore1 })
    identities2 = await Identities({ keystore: keystore2 })

    testIdentity1 = await identities1.createIdentity({ id: 'userA' })
    testIdentity2 = await identities2.createIdentity({ id: 'userB' })

    orbitdb1 = await OrbitDB({ ipfs: ipfs1, identity: testIdentity1, directory: dbPath1 })
    orbitdb2 = await OrbitDB({ ipfs: ipfs2, identity: testIdentity2, directory: dbPath2 })
  })

  after(async () => {
    if (orbitdb1) {
      await orbitdb1.stop()
    }

    if (orbitdb2) {
      await orbitdb2.stop()
    }

    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    await rmrf('./orbitdb')
    await rmrf('./ipfs1')
    await rmrf('./ipfs2')
  })

  describe('Constructor', function () {
    let accessController

    before(async () => {
      accessController = await OrbitDBAccessController({ orbitdb: orbitdb1, identities: identities1 })
    })

    it('creates an access controller', () => {
      assert.notStrictEqual(accessController, null)
      assert.notStrictEqual(accessController, undefined)
    })

    it('sets the controller type', () => {
      assert.strictEqual(accessController.type, 'orbitdb')
    })
    //
    // it('has OrbitDB instance', async () => {
    //   assert.notStrictEqual(accessController.orbitdb, null)
    //   assert.strictEqual(accessController.orbitdb.id, orbitdb1.id)
    // })
    //
    // it('has IPFS instance', async () => {
    //   const peerId1 = await accessController._orbitdb._ipfs.id()
    //   const peerId2 = await ipfs1.id()
    //   assert.strictEqual(String(peerId1.id), String(peerId2.id))
    // })

    it('sets default capabilities', async () => {
      const expected = []
      expected.admin = new Set([testIdentity1.id])

      assert.deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('allows owner to append after creation', async () => {
      const mockEntry = {
        identity: testIdentity1.hash
        // ...
        // doesn't matter what we put here, only identity is used for the check
      }
      const canAppend = await accessController.canAppend(mockEntry)
      assert.strictEqual(canAppend, true)
    })
  })

  describe('grant', function () {
    let accessController

    before(async () => {
      accessController = await OrbitDBAccessController({ orbitdb: orbitdb1, identities: identities1, address: 'testdb/add' })
    })

    // it('loads the root access controller from IPFS', () => {
    //   assert.strictEqual(accessController._db.access.type, 'ipfs')
    //   assert.deepStrictEqual(accessController._db.access.write, [id1.id])
    // })

    it('adds a capability', async () => {
      try {
        await accessController.grant('write', testIdentity1.id)
      } catch (e) {
        assert(e, null)
      }

      const expected = []
      expected.admin = new Set([testIdentity1.id])
      expected.write = new Set([testIdentity1.id])
      assert.deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('adds more capabilities', async () => {
      try {
        await accessController.grant('read', 'ABCD')
        await accessController.grant('delete', 'ABCD')
      } catch (e) {
        assert.strictEqual(e, null)
      }

      const expected = []
      expected.admin = new Set([testIdentity1.id])
      expected.write = new Set([testIdentity1.id])
      expected.read = new Set(['ABCD'])
      expected.delete = new Set(['ABCD'])

      assert.deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('emit \'update\' event when a capability was added', async () => {
      let update = false
      const onUpdate = (entry) => {
        update = true
      }

      accessController.events.on('update', onUpdate)

      await accessController.grant('read', 'AXES')

      assert.strictEqual(update, true)
    })

    it('can append after acquiring capability', async () => {
      try {
        await accessController.grant('write', testIdentity1.id)
        await accessController.grant('write', testIdentity2.id)
      } catch (e) {
        assert(e, null)
      }

      const mockEntry1 = {
        identity: testIdentity1.hash
      }

      const mockEntry2 = {
        identity: testIdentity2.hash
      }

      const canAppend1 = await accessController.canAppend(mockEntry1)

      const accessController2 = await OrbitDBAccessController({ orbitdb: orbitdb2, identities: identities2, address: 'testdb/add' })
      const canAppend2 = await accessController2.canAppend(mockEntry2)

      assert.strictEqual(canAppend1, true)
      assert.strictEqual(canAppend2, true)
    })
  })

  describe('revoke', function () {
    let accessController

    before(async () => {
      accessController = await OrbitDBAccessController({ orbitdb: orbitdb1, identities: identities1, address: 'testdb/remove' })
    })

    it('removes a capability', async () => {
      try {
        await accessController.grant('write', testIdentity1.id)
        await accessController.grant('write', 'AABB')
        await accessController.revoke('write', 'AABB')
      } catch (e) {
        assert.strictEqual(e, null)
      }

      const expected = []
      expected.admin = new Set([testIdentity1.id])
      expected.write = new Set([testIdentity1.id])

      assert.deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('can remove the creator\'s write access', async () => {
      try {
        await accessController.revoke('write', testIdentity1.id)
      } catch (e) {
        assert.strictEqual(e, null)
      }

      const expected = []
      expected.admin = new Set([testIdentity1.id])

      assert.deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('can\'t remove the creator\'s admin access', async () => {
      try {
        await accessController.revoke('admin', testIdentity1.id)
      } catch (e) {
        assert.strictEqual(e, null)
      }

      const expected = []
      expected.admin = new Set([testIdentity1.id])

      assert.deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('removes more capabilities', async () => {
      try {
        await accessController.grant('read', 'ABCD')
        await accessController.grant('delete', 'ABCD')
        await accessController.grant('write', testIdentity1.id)
        await accessController.revoke('read', 'ABCDE')
        await accessController.revoke('delete', 'ABCDE')
      } catch (e) {
        assert.strictEqual(e, null)
      }

      const expected = []
      expected.admin = new Set([testIdentity1.id])
      expected.write = new Set([testIdentity1.id])
      expected.read = new Set(['ABCD'])
      expected.delete = new Set(['ABCD'])

      assert.deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('can\'t append after revoking capability', async () => {
      try {
        await accessController.grant('write', testIdentity2.id)
        await accessController.revoke('write', testIdentity2.id)
      } catch (e) {
        assert(e, null)
      }
      const mockEntry1 = {
        identity: testIdentity1.hash
      }
      const mockEntry2 = {
        identity: testIdentity2.hash
      }
      const canAppend = await accessController.canAppend(mockEntry1)
      const noAppend = await accessController.canAppend(mockEntry2)
      assert.strictEqual(canAppend, true)
      assert.strictEqual(noAppend, false)
    })

    it('emits \'update\' event when a capability was removed', async () => {
      await accessController.grant('admin', 'cats')
      await accessController.grant('admin', 'dogs')

      let update = false
      const onUpdate = (entry) => {
        update = true
      }

      accessController.events.on('update', onUpdate)

      await accessController.revoke('admin', 'cats')

      assert.strictEqual(update, true)
    })
  })

  // describe('save and load', function () {
  //   let accessController, dbName
  //
  //   before(async () => {
  //     dbName = 'testdb-load-' + new Date().getTime()
  //     accessController = new OrbitDBAccessController(orbitdb1)
  //     await accessController.load(dbName)
  //     await accessController.grant('write', 'A')
  //     await accessController.grant('write', 'B')
  //     await accessController.grant('write', 'C')
  //     await accessController.grant('write', 'C') // double entry
  //     await accessController.grant('another', 'AA')
  //     await accessController.grant('another', 'BB')
  //     await accessController.revoke('another', 'AA')
  //     await accessController.grant('admin', id1.id)
  //     return new Promise((resolve) => {
  //       // Test that the access controller emits 'updated' after it was loaded
  //       accessController.on('updated', () => resolve())
  //       accessController.load(accessController.address)
  //     })
  //   })
  //
  //   it('has the correct database address for the internal db', async () => {
  //     const addr = accessController._db.address.toString().split('/')
  //     assert.strictEqual(addr[addr.length - 1], '_access')
  //     assert.strictEqual(addr[addr.length - 2], dbName)
  //   })
  //
  //   it('has correct capabilities', async () => {
  //     assert.deepStrictEqual(accessController.get('admin'), new Set([id1.id]))
  //     assert.deepStrictEqual(accessController.get('write'), new Set(['A', 'B', 'C']))
  //     assert.deepStrictEqual(accessController.get('another'), new Set(['BB']))
  //   })
  // })
})
// TODO: use two separate peers for testing the AC
// TODO: add tests for revocation correctness with a database (integration tests)
