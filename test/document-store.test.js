import { deepStrictEqual, strictEqual } from 'assert'
import KeyStore from '../src/key-store.js'
import rimraf from 'rimraf'
import { Log, Entry } from '../src/oplog/index.js'
import { DocumentStore, Database } from '../src/db/index.js'
import { IPFSBlockStorage, LevelStorage } from '../src/storage/index.js'
import { getIpfsPeerId, waitForPeers, config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import connectPeers from './utils/connect-nodes.js'
import { createTestIdentities, cleanUpTestIdentities } from './fixtures/orbit-db-identity-keys.js'
import waitFor from './utils/wait-for.js'

const { sync: rmrf } = rimraf

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }

Object.keys(testAPIs).forEach((IPFS) => {
  describe('DocumentStore Database (' + IPFS + ')', function () {
    this.timeout(config.timeout * 2)

    let ipfsd1, ipfsd2
    let ipfs1, ipfs2
    let keystore, signingKeyStore
    let peerId1, peerId2
    let accessController
    let identities1, identities2
    let testIdentity1, testIdentity2
    let db1, db2

    const databaseId = 'documentstore-AAA'

    before(async () => {
      // Start two IPFS instances
      ipfsd1 = await startIpfs(IPFS, config.daemon1)
      ipfsd2 = await startIpfs(IPFS, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api

      await connectPeers(ipfs1, ipfs2)

      // Get the peer IDs
      peerId1 = await getIpfsPeerId(ipfs1)
      peerId2 = await getIpfsPeerId(ipfs2)

      const [identities, testIdentities] = await createTestIdentities(ipfs1, ipfs2)
      identities1 = identities[0]
      identities2 = identities[1]
      testIdentity1 = testIdentities[0]
      testIdentity2 = testIdentities[1]

      rmrf(testIdentity1.id)
      rmrf(testIdentity2.id)
    })

    beforeEach(async () => {
      accessController = {
        canAppend: async (entry) => {
          const identity = await identities1.getIdentity(entry.identity)
          return identity.id === testIdentity1.id || identity.id === testIdentity2.id
        }
      }
      
      db1 = await DocumentStore({ OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })

      db2 = await DocumentStore({ OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })
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

    after(async () => {
      await cleanUpTestIdentities([identities1, identities1])

      if (ipfsd1) {
        await stopIpfs(ipfsd1)
      }
      if (ipfsd2) {
        await stopIpfs(ipfsd2)
      }
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
      if (testIdentity1) {
        rmrf(testIdentity1.id)
      }
      if (testIdentity2) {
        rmrf(testIdentity2.id)
      }
    })

    describe('using database', () => {
      describe('Default index \'_id\'', () => {
        it('creates a document store', async () => {
          strictEqual(db1.databaseId, databaseId)
          strictEqual(db1.type, 'documentstore')
          strictEqual(db1.indexBy, '_id')
        })

        it('gets a document', async () => {
          const key = 'hello world 1'

          const expected = { _id: key, msg: 'writing 1 to db1' }

          await db1.put(expected)

          const doc = await db1.get(key)
          deepStrictEqual(doc, expected)
        })

        it('throws an error when putting a document with the wrong key', async () => {
          let err
          const key = 'hello world 1'

          const expected = { wrong_key: key, msg: 'writing 1 to db1' }

          try {
            await db1.put(expected)
          } catch (e) {
            err = e
          }
          strictEqual(err.message, 'The provided document doesn\'t contain field \'_id\'')
        })

        it('throws an error when getting a document with the wrong key', async () => {
          let err
          const key = 'hello world 1'

          const expected = { wrong_key: key, msg: 'writing 1 to db1' }

          try {
            await db1.put(expected)
          } catch (e) {
            err = e
          }
          strictEqual(err.message, 'The provided document doesn\'t contain field \'_id\'')
        })

        it('deletes a document', async () => {
          const key = 'hello world 1'

          await db1.put({ _id: key, msg: 'writing 1 to db1' })
          await db1.del(key)

          const doc = await db1.get(key)
          strictEqual(doc, undefined)
        })

        it('throws an error when deleting a non-existent document', async () => {
          const key = 'i do not exist'
          let err

          try {
            await db1.del(key)
          } catch (e) {
            err = e
          }

          strictEqual(err.message, `No document with key '${key}' in the database`)
        })

        it('queries for a document', async () => {
          const expected = { _id: 'hello world 1', msg: 'writing new 1 to db1', views: 10 }

          await db1.put({ _id: 'hello world 1', msg: 'writing 1 to db1', views: 10 })
          await db1.put({ _id: 'hello world 2', msg: 'writing 2 to db1', views: 5 })
          await db1.put({ _id: 'hello world 3', msg: 'writing 3 to db1', views: 12 })
          await db1.del('hello world 3')
          await db1.put(expected)

          const findFn = (doc) => doc.views > 5

          deepStrictEqual(await db1.query(findFn), [expected])
        })

        it('queries for a non-existent document', async () => {
          await db1.put({ _id: 'hello world 1', msg: 'writing 1 to db1', views: 10 })
          await db1.del('hello world 1')

          const findFn = (doc) => doc.views > 5

          deepStrictEqual(await db1.query(findFn), [])
        })
      })

      describe('Custom index \'doc\'', () => {
        beforeEach(async () => {
          db1 = await DocumentStore({ OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController, indexBy: 'doc' })
        })

        it('creates a document store', async () => {
          strictEqual(db1.databaseId, databaseId)
          strictEqual(db1.type, 'documentstore')
          strictEqual(db1.indexBy, 'doc')
        })

        it('gets a document', async () => {
          const key = 'hello world 1'

          const expected = { doc: key, msg: 'writing 1 to db1' }

          await db1.put(expected)

          const doc = await db1.get(key)
          deepStrictEqual(doc, expected)
        })

        it('deletes a document', async () => {
          const key = 'hello world 1'

          await db1.put({ doc: key, msg: 'writing 1 to db1' })
          await db1.del(key)

          const doc = await db1.get(key)
          strictEqual(doc, undefined)
        })
        it('throws an error when putting a document with the wrong key', async () => {
          let err
          const key = 'hello world 1'

          const expected = { _id: key, msg: 'writing 1 to db1' }

          try {
            await db1.put(expected)
          } catch (e) {
            err = e
          }
          strictEqual(err.message, 'The provided document doesn\'t contain field \'doc\'')
        })

        it('throws an error when getting a document with the wrong key', async () => {
          let err
          const key = 'hello world 1'

          const expected = { _id: key, msg: 'writing 1 to db1' }

          try {
            await db1.put(expected)
          } catch (e) {
            err = e
          }
          strictEqual(err.message, 'The provided document doesn\'t contain field \'doc\'')
        })

        it('throws an error when deleting a non-existent document', async () => {
          const key = 'i do not exist'
          let err

          try {
            await db1.del(key)
          } catch (e) {
            err = e
          }

          strictEqual(err.message, `No document with key '${key}' in the database`)
        })

        it('queries for a document', async () => {
          const expected = { doc: 'hello world 1', msg: 'writing new 1 to db1', views: 10 }

          await db1.put({ doc: 'hello world 1', msg: 'writing 1 to db1', views: 10 })
          await db1.put({ doc: 'hello world 2', msg: 'writing 2 to db1', views: 5 })
          await db1.put({ doc: 'hello world 3', msg: 'writing 3 to db1', views: 12 })
          await db1.del('hello world 3')
          await db1.put(expected)

          const findFn = (doc) => doc.views > 5

          deepStrictEqual(await db1.query(findFn), [expected])
        })

        it('queries for a non-existent document', async () => {
          await db1.put({ doc: 'hello world 1', msg: 'writing 1 to db1', views: 10 })
          await db1.del('hello world 1')

          const findFn = (doc) => doc.views > 5

          deepStrictEqual(await db1.query(findFn), [])
        })
      })
    })
    
    describe('replicating database', () => {
      it.only('gets all documents', async () => {
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
          
        await waitForPeers(ipfs1, [peerId2], databaseId)
        await waitForPeers(ipfs2, [peerId1], databaseId)
        
        const puts = []
        puts.push(await db1.put({ _id: 1, msg: 'record 1 on db 1' }))
        puts.push(await db2.put({ _id: 2, msg: 'record 2 on db 2' }))
        // puts.push(await db1.put({ _id: 3, msg: 'record 3 on db 1' }))
        // puts.push(await db2.put({ _id: 4, msg: 'record 4 on db 2' }))

        await waitFor(() => updateDB1Count, () => puts.length)
        await waitFor(() => updateDB2Count, () => puts.length)

        const all1 = []
        for await (const doc of db1.iterator()) {
          all1.unshift(doc)
        }

        const all2 = []
        for await (const doc of db2.iterator()) {
          all2.unshift(doc)
        }
        
        console.log(all1, all2)
        
        deepStrictEqual(all1, all2)
      })
    })
  })
})
