/**
 * @module AccessControllers
 * @description
 * Provides a system for managing access controllers. Supported access
 * controllers can be added and removed from the access controller list, and
 * can load the associated module if they are supported.
 */
import IPFSAccessController from './ipfs.js'
import OrbitDBAccessController from './orbitdb.js'

const accessControllers = {
  ipfs: IPFSAccessController,
  orbitdb: OrbitDBAccessController
}

/**
 * Gets an access controller module specified by type.
 * @param {string} type A valid access controller type.
 * @return {AccessController} The access controller module.
 * @private
 */
const getAccessController = (type) => {
  if (!accessControllers[type]) {
    throw new Error(`AccessController type '${type}' is not supported`)
  }
  return accessControllers[type]
}

/**
 * Adds an access controller module to the list of supported access controller.
 * @param {AccessController} accessController A compatible access controller
 * module.
 * @throws Access controller `type` already added if the access controller is
 * already supported.
 * @throws Given AccessController class needs to implement: type if the access
 * controller module does not implement a type property.
 * @static
 */
const addAccessController = (accessController) => {
  if (!accessController.type) {
    throw new Error('Access controller does not contain required field \'type\'')
  }

  if (accessControllers[accessController.type]) {
    throw new Error(`Access controller '${accessController.type}' already added.`)
  }

  accessControllers[accessController.type] = accessController
}

/**
 * Removes an access controller from the list.
 * @param {string} type A valid access controller type.
 * @static
 */
const removeAccessController = type => {
  delete accessControllers[type]
}

export {
  addAccessController,
  getAccessController,
  removeAccessController,
  IPFSAccessController,
  OrbitDBAccessController
}
