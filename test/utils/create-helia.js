import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'

export default async () => {
  const libp2p = await createLibp2p({
    transports: [webSockets({ filter: all })],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    pubsub: gossipsub({ allowPublishToZeroPeers: true }),
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0/ws']
    }
  })

  return await createHelia({ libp2p })
}
