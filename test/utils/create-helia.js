import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { webRTCStar } from '@libp2p/webrtc-star'
import { all } from '@libp2p/websockets/filters'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'

const isBrowser = () => typeof window !== 'undefined'

export default async () => {
  const wrtcStar = webRTCStar()
  const libp2p = await createLibp2p({
    transports: [webSockets({ filter: all }), wrtcStar.transport],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    pubsub: gossipsub({ allowPublishToZeroPeers: true }),
    addresses: {
      listen: [isBrowser() ? '/ip4/0.0.0.0/tcp/12345/ws/p2p-webrtc-star' : '/ip4/0.0.0.0/tcp/0/ws']
    }
  })

  return await createHelia({ libp2p })
}
