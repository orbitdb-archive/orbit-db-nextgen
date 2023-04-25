'use strict'

const defaultFilter = () => true

const connectIpfsNodes = async (ipfs1, ipfs2, options = {
  filter: defaultFilter
}) => {
  await ipfs1.libp2p.peerStore.addressBook.set(ipfs2.libp2p.peerId, ipfs2.libp2p.getMultiaddrs().filter(options.filter))
  await ipfs1.libp2p.dial(ipfs2.libp2p.peerId)
}

export default connectIpfsNodes
