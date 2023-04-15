# Connecting Peers

## Node

- can discover peers
- can connect directly

```
const defaultFilter = () => true

const connectPeers = async (ipfs1, ipfs2, options = {
  filter: defaultFilter
}) => {
  const id1 = await ipfs1.id()
  const id2 = await ipfs2.id()

  const addresses1 = id1.addresses.filter(options.filter)
  const addresses2 = id2.addresses.filter(options.filter)

  for (const a2 of addresses2) {
    await ipfs1.swarm.connect(a2)
  }
  for (const a1 of addresses1) {
    await ipfs2.swarm.connect(a1)
  }
}

ipfsConfig1 = {

}

ipfsConfig2 = {

}

ipfs1 = await IPFS.create({ ...ipfsConfig1, repo: './ipfs1' })
ipfs2 = await IPFS.create({ ...ipfsConfig2, repo: './ipfs2' })
await connectPeers(ipfs1, ipfs2)
```

## Browser

- requires an intermediary
- webRTCStar

## Replicating database between two OrbitDB peers

```
const waitFor = async (valueA, toBeValueB, pollInterval = 100) => {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      if (await valueA() === await toBeValueB()) {
        clearInterval(interval)
        resolve()
      }
    }, pollInterval)
  })
}

let connected1 = false
let connected2 = false

const onConnected1 = async (peerId, heads) => {
  connected1 = true
}

const onConnected2 = async (peerId, heads) => {
  connected2 = true
}

db1.events.on('join', onConnected1)
db2.events.on('join', onConnected2)

await db1.put({ _id: 1, msg: 'record 1 on db 1' })
await db2.put({ _id: 2, msg: 'record 2 on db 2' })
await db1.put({ _id: 3, msg: 'record 3 on db 1' })
await db2.put({ _id: 4, msg: 'record 4 on db 2' })

await waitFor(() => connected1, () => true)
await waitFor(() => connected2, () => true)
```