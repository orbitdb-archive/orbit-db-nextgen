'use strict'

const getIpfsPeerId = (ipfs) => {
  return ipfs.libp2p.peerId
}

export default getIpfsPeerId
