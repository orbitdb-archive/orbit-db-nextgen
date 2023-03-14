import { pipe } from 'it-pipe'
import PQueue from 'p-queue'
import Path from 'path'
import { EventEmitter } from 'events'

/**
 * @description
 * Syncs an append-only, conflict-free replicated data type (CRDT) log between multiple peers.
 *
 * Sync is responsible for synchronizing heads between multiple peers.
 * - When Sync is started, heads are sent by peers sharing the same log id.
 * - Heads are received by each peer from another peer with the same log id.
 * - There is no guarantee that heads will be received in the order they were generated on the sending peer.
 * - There is no guarantee that all heads will be received.
 * - There is no guarantee that heads will reflect the latest heads on the remote peer.
 * - Calling Sync.add is neither synchronous nor deterministic. Calling Sync.add with async/await only guarantees that the message is published. It does not guarantee when the message will be received or even that the message is recieved at all.
 * - Determining whether a peer has received a message can be handled by registering a callback using onSynced. However, there is no guarantee that every log entry will be received and onSynced can not be used to determine whether every head is received.
 * - The only guarantee that Sync provides is that heads will eventually reach consistency between all peers.
 */

/**
 * Creates a Sync instance for sychronizing logs between multiple peers.
 * @param {Object} options One or more options for configurating Sync.
 * @param {IPFS} options.ipfs An IPFS instance
 * @param {Log} options.log A Log instance.
 * @param {Object} options.events An event emitter. Defaults to an instance of EventEmitter.
 * @param {Function} options.onSynced A callback function for determining whether an entry has been receieved.
 * @param {Boolean} options.start True if synchronization should happen automatically, false otherwise. Defaults to true.
 * @return {Sync} The Sync instance.
 */
const Sync = async ({ ipfs, log, events, onSynced, start }) => {
  const address = log.id
  const headsSyncAddress = Path.join('/orbitdb/heads/', address)

  const queue = new PQueue({ concurrency: 1 })
  const peers = new Set()

  events = events || new EventEmitter()

  const onPeerJoined = async (peerId) => {
    const heads = await log.heads()
    events.emit('join', peerId, heads)
  }

  const sendHeads = async (source) => {
    return (async function * () {
      const heads = await log.heads()
      for await (const { bytes } of heads) {
        yield bytes
      }
    })()
  }

  const receiveHeads = (peerId) => async (source) => {
    for await (const value of source) {
      const headBytes = value.subarray()
      if (headBytes && onSynced) {
        await onSynced(headBytes)
      }
    }
    await onPeerJoined(peerId)
  }

  const handleReceiveHeads = async ({ connection, stream }) => {
    const peerId = String(connection.remotePeer)
    try {
      peers.add(peerId)
      await pipe(stream, receiveHeads(peerId), sendHeads, stream)
    } catch (e) {
      console.error(e)
      peers.delete(peerId)
      events.emit('error', e)
    }
  }

  const handlePeerSubscribed = async (event) => {
    const task = async () => {
      const { peerId: remotePeer, subscriptions } = event.detail
      const peerId = String(remotePeer)
      const subscription = subscriptions.find(e => e.topic === address)
      if (!subscription) {
        return
      }
      if (subscription.subscribe) {
        if (peers.has(peerId)) {
          return
        }
        try {
          peers.add(peerId)
          const stream = await ipfs.libp2p.dialProtocol(remotePeer, headsSyncAddress)
          await pipe(sendHeads, stream, receiveHeads(peerId))
        } catch (e) {
          if (e.code === 'ERR_UNSUPPORTED_PROTOCOL') {
            // Skip peer, they don't have this database currently
          } else {
            console.error(e)
            peers.delete(peerId)
            events.emit('error', e)
          }
        }
      } else {
        peers.delete(peerId)
        events.emit('leave', peerId)
      }
    }
    queue.add(task)
  }

  const handleUpdateMessage = async (message) => {
    const task = async () => {
      const { id: peerId } = await ipfs.id()
      const messageIsNotFromMe = (message) => String(peerId) !== String(message.from)
      const messageHasData = (message) => message.data !== undefined
      try {
        if (messageIsNotFromMe(message) && messageHasData(message) && onSynced) {
          await onSynced(message.data)
        }
      } catch (e) {
        console.error(e)
        events.emit('error', e)
      }
    }
    queue.add(task)
  }

  const add = async (entry) => {
    await ipfs.pubsub.publish(address, entry.bytes)
  }

  const stopSync = async () => {
    await queue.onIdle()
    ipfs.libp2p.pubsub.removeEventListener('subscription-change', handlePeerSubscribed)
    await ipfs.libp2p.unhandle(headsSyncAddress)
    await ipfs.pubsub.unsubscribe(address, handleUpdateMessage)
    peers.clear()
  }

  const startSync = async () => {
    // Exchange head entries with peers when connected
    await ipfs.libp2p.handle(headsSyncAddress, handleReceiveHeads)
    ipfs.libp2p.pubsub.addEventListener('subscription-change', handlePeerSubscribed)
    // Subscribe to the pubsub channel for this database through which updates are sent
    await ipfs.pubsub.subscribe(address, handleUpdateMessage)
  }

  // Start Sync automatically
  if (start !== false) {
    await startSync()
  }

  return {
    add,
    stop: stopSync,
    start: startSync,
    events,
    peers
  }
}

export { Sync as default }
