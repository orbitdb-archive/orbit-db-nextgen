# Connecting Peers

OrbitDB peers connect to one another using js-libp2p. Connection settings will vary depending on what environment the peer is running in and what system the peers is attempting to connect to.

## Node daemon to node daemon

Node.js allows libp2p to open connections with other Node.js daemons.

```
ipfs1 = await IPFS.create({ repo: './ipfs1' })
ipfs2 = await IPFS.create({ repo: './ipfs2' })

const cid = await ipfs1.block.put('here is some data')
const block = await ipfs2.block.get(cid)
```

On localhost or a local network, both ipfs nodes should discover each other quickly enough that ipfs2 will retrieve the block added to ipfs1.

In remote networks, retrieval of content across peers may take significantly longer. To speed up communication between the two peers, connect one peer to another directly using the swarm API and a peer's publicly accessible address. For example, assuming ipfs1 is listening on the address /ip4/1.2.3.4/tcp/12345/p2p/ipfs1-peer-hash:

```
ipfs1 = await IPFS.create({ repo: './ipfs1' })
ipfs2 = await IPFS.create({ repo: './ipfs2' })

await ipfs2.swarm.connect('/ip4/1.2.3.4/tcp/12345/p2p/ipfs1-peer-hash')

const cid = await ipfs1.block.put('here is some data')
const block = await ipfs2.block.get(cid)
```

## Node Daemon to Browser

For various security reasons, a browser cannot dial another peer over a raw TCP or QUIC connection from within a web page.  One option is to use a websocket exposed on the server and dial in via the browser.

On the server, listen for incoming websocket connections:

```javascript
import { WebSockets } from '@libp2p/websockets'
import { create } from 'ipfs-core'

ipfs1 = await IPFS.create({ 
  libp2p: { 
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0/ws'
      ]
    },
    transports: [new WebSockets()] 
  },
  repo: './ipfs1'
})
```

Within the browser, dial into the server using the server's exposed web socket:

```javascript
// import the following libraries if using a build environment such as vite.
import { WebSockets } from '@libp2p/websockets'
import { create } from 'ipfs-core'
import { all } from '@libp2p/websockets/filters'

// uncomment { filter: all } if no tls certificate is deployed. Only do this in development environments.
const ws = new webSockets(/* { filter: all } */)

ipfs1 = await IPFS.create({ 
    transports: [new webSockets()] 
  },
  repo: './ipfs1'
})
```

## Browser to browser

- requires an intermediary
- webRTCStar

## Further Reading

The js-libp2p library provides variety of [configuration options](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md) for finding peers and connecting them to one another.

The different methods of connecting various systems is outlined in [libp2p's connectivity](https://connectivity.libp2p.io) section.