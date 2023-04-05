# Identities

An identity is a signed identifier or `id` and can be used for signing and verifying various data. Within OrbitDB, the identity object is used for signing log entries and verifying write access to a database.

Identities provides a way to manage one or more identities and includes functions for creating, retrieving, signing and verifying an identity as well as signing and verifying messages using an existing identity.

## Creating an identity

```
const id = 'userA'
const identities = await Identities()
const identity = identities.createIdentity({ id })
```

Once created, the identity can be passed to OrbitDB:

```
const orbitdb = await OrbitDB({ identity })
```

##  Specifying a keystore

```
const keystore = await KeyStore()
const id = 'userA'
const identities = await Identities({ keystore })
const identity = identities.createIdentity({ id })
```