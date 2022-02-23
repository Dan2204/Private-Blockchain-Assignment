/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialized the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = [];
    this.height = -1;
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      let block = new BlockClass.Block({ data: 'Genesis Block' });
      try {
        await this._addBlock(block);
      } catch (error) {
        console.log('Initialization Error!');
      }
    }
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return new Promise((resolve, reject) => {
      resolve(this.height);
    });
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't for get
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  _addBlock(block) {
    let self = this;
    return new Promise(async (resolve, reject) => {
      /* CHECKS TO ENSURE chain.height IS 1 LES THAN THE chain.length (ZERO INDEXING) */
      if (self.chain.length - self.height !== 1) reject('Block height discrepancy!');
      /* ASSIGN BLOCK HEIGHT AND INCREMENT */
      block.height = ++self.height;
      /* IF NOT GENESIS BLOCK, ASSIGN PREVIOUS HASH */
      if (self.height > 0) {
        block.previousBlockHash = self.chain[self.height - 1].hash;
      }
      block.time = new Date().getTime().toString().slice(0, -3);
      block.hash = SHA256(JSON.stringify(block)).toString();
      /* ADD BLOCK TO CHAIN */
      self.chain.push(block);
      /* VALIDATE THE BLOCKCHAIN */
      try {
        const areErrors = await self.validateChain();
        /* RESOLVE THE NEW BLOCK IF VALID ELSE REJECT THE ERRORS */
        areErrors.length > 0 ? reject(areErrors) : resolve(block);
      } catch (ValidationError) {
        reject(ValidationError);
      }
    });
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {*} address
   */
  requestMessageOwnershipVerification(address) {
    return new Promise((resolve) => {
      resolve(`${address}:${new Date().getTime().toString().slice(0, -3)}:starRegistry`);
    });
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */
  submitStar(address, message, signature, star) {
    let self = this;
    return new Promise(async (resolve, reject) => {
      const messageTime = parseInt(message.split(':')[1]);
      const timeNow = parseInt(new Date().getTime().toString().slice(0, -3));
      /* CHECK 5 MINUTE TIMELOCK */
      if (
        timeNow - messageTime < 300 &&
        bitcoinMessage.verify(message, address, signature)
      ) {
        /* CREATE NEW BLOCK */
        const newBlock = new BlockClass.Block({ owner: address, star: star });
        /* RETURNS THE BLOCK IF IT'S ADDED TO THE CHAIN, IF NOT, RETURNS ERROR MESSAGE */
        try {
          const addBlock = await self._addBlock(newBlock);
          resolve(addBlock);
        } catch (errorLog) {
          reject(errorLog);
        }
      }
      reject('Error: Timed out or not verified.');
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  getBlockByHash(hash) {
    let self = this;
    return new Promise((resolve, reject) => {
      const block = self.chain.filter((b) => b.hash === hash)[0];
      block ? resolve(block) : reject(false);
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    let self = this;
    return new Promise((resolve, reject) => {
      const getBlock = self.chain.filter((block) => block.height === height)[0];
      getBlock ? resolve(getBlock) : reject(false);
    });
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  getStarsByWalletAddress(address) {
    let self = this;
    let stars = [];
    return new Promise((resolve, reject) => {
      self.chain.forEach(async (star) => {
        const body = await star.getBData();
        if (body && body.owner === address) stars.push(body);
      });
      resolve(stars);
    });
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  validateChain() {
    let self = this;
    let errorLog = [];
    return new Promise(async (resolve) => {
      try {
        /* LOOP THROUGH BLOCKCHAIN */
        for (const [index, block] of self.chain.entries()) {
          /* CHECK BLOCK HEIGHTS ARE SUCCESSIVE */
          if (block.height > 0 && block.height !== self.chain[index - 1].height + 1) {
            errorLog.push({
              blockHeight: block.height,
              critical: `Invalid block heights. Previous block height: ${
                self.chain[index - 1].height + 1
              }`,
            });
          }
          /* CHECK PREVIOUS BLOCK HASH */
          if (
            block.height > 0 &&
            block.previousBlockHash !== self.chain[index - 1].hash
          ) {
            errorLog.push({
              blockHeight: block.height,
              previousHash: 'Previous Hash Discrepancy',
            });
          }
          /* CHECK CURRENT BLOCK HASH */
          try {
            await block.validate();
          } catch (failedPromise) {
            errorLog.push({
              blockHeight: block.height,
              currentHash: 'Current Hash Discrepancy',
            });
          }
        }
        resolve(errorLog);
      } catch (error) {
        reject('There was a problem validating the blockchain');
      }
    });
  }

  /* ========= TESTING =================================================
  | Function to test validation, change block details here and call the |
  | invalidateBlockTEST() endpoint with a height number to invoke       |
  | the blockchainValidation() endpoint to test.                        |
  /* ========= TESTING =============================================== */
  tamperTest(height) {
    let self = this;
    return new Promise((resolve, reject) => {
      const getBlock = self.chain.filter((block) => block.height === +height)[0];
      if (!getBlock) reject(false);
      // getBlock.hash = 'DFdlf90448thgVDDfd9375r32h2hfn';
      // getBlock.height = 7;
      // getBlock.body = {};
      resolve(true);
    });
  }
}

module.exports.Blockchain = Blockchain;
