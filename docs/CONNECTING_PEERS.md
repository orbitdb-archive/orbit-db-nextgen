# Connecting Peers

OrbitDB peers connect to one another using js-libp2p. Connection settings will vary depending on what environment the peer is running in and what system the peers is attempting to connect to.

## Node daemon to node daemon

Node.js allows libp2p to open connections with other Node.js daemons.

```
ipfs1 = await IPFS.create({ repo: './ipfs1' })
ipfs2 = await IPFS.create({ repo: './ipfs2' })
await connectPeers(ipfs1, ipfs2)
```

## node daemon to browser

- webRTC direct

## Browser to browser

- requires an intermediary
- webRTCStar

## Further Reading

The js-libp2p library provides variety of [configuration options](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md) for finding peers and connecting them to one another.

The different methods of connecting various systems is outlined in [libp2p's connectivity](https://connectivity.libp2p.io) section.