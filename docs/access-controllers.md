# Access Controllers

Access controllers define the write access a user has to a database. By default, write access is limited to the user who created the database. Access controllers provide a way in which write access can be expanded to users other than the database creator.

An access controller is passed when a database is opened for the first time. Once created, the database's write access will be limited to only those users who are listed. By default, only the user creating the database will have write access.

Different access controllers can be assigned to the database using the `AccessController` param and passing it to OrbitDB's `open` function.

```
const orbitdb = await OrbitDB()
const db = orbitdb.open('my-db', { AccessController: SomeAccessController() })
```

OrbitDB is bundled with two AccessControllers; IPFSAccessController, an immutable access controller which uses IPFS to store the access settings, and OrbitDBAccessController, a mutable access controller which uses OrbitDB's keyvalue database to store one or more permissions.

By default, the database `db` will use the IPFSAccessController and allow only the creator to write to the database.

```
const orbitdb = await OrbitDB()
const db = orbitdb.open('my-db')
```

To change write access, pass the IPFSAccessController with the `write ` parameter and an array of one or more user addresses:

```
const user1Address = '123'
const user2Address = '456'

const orbitdb = await OrbitDB()
const db = orbitdb.open('my-db', { AccessController: IPFSAccessController(write: [user1Address, user2Address]) })
```

To allow anyone to write to the database, specify the wildcard '*':

```
const orbitdb = await OrbitDB()
const db = orbitdb.open('my-db', { AccessController: IPFSAccessController(write: ['*']) })
```

## OrbitDB Access Controller

The OrbitDB access controller is provides configurable write access using grant and revoke.

```
const user1Address = '123'
const user2Address = '456'

const orbitdb = await OrbitDB()
const db = orbitdb.open('my-db', { AccessController: OrbitDBAccessController(write: [user1Address]) })

db.access.grant('write', user2Address)
db.access.revoke('write', user2Address)
```

Grant and revoke are not limited to 'write' access only. A custom access capability can be specified, for example, `db.access.grant('custom-access', user1Address)`.

## Custom Access Controller

Access can be customized by implementing a custom access controller. To implement a custom access controller, specify:

- A curried function with the function signature `async ({ orbitdb, identities, address })`,
- A `type` constant,
- A canAppend function with the param `entry`.

```
const type = 'custom'

const CustomAccessController = () => async ({ orbitdb, identities, address }) => {
  address = '/custom/access-controller'

  const canAppend = (entry) => {

  }
}

CustomAccessController.type = type
```

Additional configuration can be passed to the access controller by adding one or more parameters to the `CustomAccessController` function. For example, passing a configurable object parameter with the variable `write`:

```
const CustomAccessController = ({ write }) => async ({ orbitdb, identities, address }) => {
}
```

### Using a custom access controller with OrbitDB

Before passing the custom access controller to the `open` function, it must be added to OrbitDB's AccessControllers:

```
AccessControllers.add(CustomAccessController)
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db', { AccessController: CustomAccessController(params) })
```