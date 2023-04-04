# DB

DB provides a variety of different data stores with a common interface.

OrbitDB provides four types of data stores:

- Events
- Documents
- Key/Value
- Persisted Key/Value

The type of database can be specified when calling OrbitDB's `open` function by using the `type` parameter:

```
const type = 'documents'
orbitdb.open('my-db', { type })
```

If no type is specified, Events will the default database type.

## Opening a new database

Opening a default event store:

```
const orbitdb = await OrbitDB()
await orbitdb.open('my-db')
```

Opening a documentstore database:

```
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { type: 'documents' })
```

Opening a keyvalue database:

```
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { type: 'keyvalue' })
```

Opening a database and adding meta

```
const meta = { description: 'A database with metadata.' }
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { meta })
```

## Loading an existing database

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db')
db.close()
const dbReopened = await orbitdb.open(db.address)
```

## Interacting with a database

### Adding/Putting items in a database

All databases expose a common `put` function which is used to add items to the database.

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db', { type: keyvalue })
const hash = await db.put('key', 'value')
```

For databases such as Events which is an append-only data store, a `null` key will need to be used:

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db')
const hash = await db.put(null, 'event')
```

Alternatively, append-only databases can implement the convenience function `add`:

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db')
const hash = await db.add('event')
```

### Removing/Deleting items from a database 

To delete an item from a databse, use the `del` function:

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db', { type: keyvalue })
const hash = await db.put('key', 'value')
await db.del(hash)
```

## Replicating a database across peers

```
import * as IPFS from 'ipfs-core'

const ipfs1 = await IPFS.create({ config1, repo: './ipfs1' })
const ipfs2 = await IPFS.create({ config2, repo: './ipfs2' })

orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })

const db1 = await orbitdb1.open('my-db')
const db2 = await orbitdb2.open(db1.address)
```