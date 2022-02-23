/**
 *          BlockchainController
 *
 * This class expose the endpoints that the client applications will use to interact with the
 * Blockchain dataset
 */
class BlockchainController {
  //The constructor receive the instance of the express.js app and the Blockchain class
  constructor(app, blockchainObj) {
    this.app = app;
    this.blockchain = blockchainObj;
    // All the endpoints methods needs to be called in the constructor to initialize the route.
    this.getBlockByHeight();
    this.requestOwnership();
    this.submitStar();
    this.getBlockByHash();
    this.getStarsByOwner();
    this.blockchainValidation();

    this.invalidateBlockTEST();
  }

  // Enpoint to Get a Block by Height (GET Endpoint)
  getBlockByHeight() {
    this.app.get('/block/height/:height', async (req, res) => {
      if (req.params.height) {
        const height = parseInt(req.params.height);
        try {
          let block = await this.blockchain.getBlockByHeight(height);
          if (block) {
            return res.status(200).json(block);
          } else {
            return res.status(404).send('Block Not Found!');
          }
        } catch (error) {
          return res.status(404).send('Block Not Found!');
        }
      } else {
        return res.status(404).send('Block Not Found! Review the Parameters!');
      }
    });
  }

  // Endpoint that allows user to request Ownership of a Wallet address (POST Endpoint)
  requestOwnership() {
    this.app.post('/requestValidation', async (req, res) => {
      if (req.body.address) {
        const address = req.body.address;
        const message = await this.blockchain.requestMessageOwnershipVerification(
          address
        );
        if (message) {
          return res.status(200).json(message);
        } else {
          return res.status(500).send('An error happened!');
        }
      } else {
        return res.status(500).send('Check the Body Parameter!');
      }
    });
  }

  // Endpoint that allow Submit a Star, yu need first to `requestOwnership` to have the message (POST endpoint)
  submitStar() {
    this.app.post('/submitstar', async (req, res) => {
      if (req.body.address && req.body.message && req.body.signature && req.body.star) {
        const address = req.body.address;
        const message = req.body.message;
        const signature = req.body.signature;
        const star = req.body.star;
        try {
          let block = await this.blockchain.submitStar(address, message, signature, star);
          if (block) {
            return res.status(200).json(block);
          } else {
            return res.status(500).send('An error happened!');
          }
        } catch (error) {
          return res.status(500).send(error);
        }
      } else {
        return res.status(500).send('Check the Body Parameter!');
      }
    });
  }

  // This endpoint allows you to retrieve the block by hash (GET endpoint)
  getBlockByHash() {
    this.app.get('/block/hash/:hash', async (req, res) => {
      if (req.params.hash) {
        const hash = req.params.hash;
        try {
          const block = await this.blockchain.getBlockByHash(hash);
          if (block) {
            return res.status(200).json(block);
          } else {
            return res.status(404).send('Block Not Found!');
          }
        } catch (e) {
          return res.status(404).send('Block Not Found!');
        }
      } else {
        return res.status(404).send('Block Not Found! Review the Parameters!');
      }
    });
  }

  // This endpoint allows you to request the list of Stars registered by an owner
  getStarsByOwner() {
    this.app.get('/blocks/:address', async (req, res) => {
      if (req.params.address) {
        const address = req.params.address;
        try {
          let stars = await this.blockchain.getStarsByWalletAddress(address);
          if (stars) {
            return res.status(200).json(stars);
          } else {
            return res.status(404).send('Block Not Found!');
          }
        } catch (error) {
          return res.status(500).send('An error happened!');
        }
      } else {
        return res.status(500).send('Block Not Found! Review the Parameters!');
      }
    });
  }

  // Endpoint to trigger the execution of validateChain()
  blockchainValidation() {
    this.app.get('/validateBlockchain', async (req, res) => {
      try {
        const errorList = await this.blockchain.validateChain();
        if (errorList.length > 0) {
          return res.status(200).json(errorList);
        } else {
          return res.status(200).send('Blockchain has been validated.');
        }
      } catch (error) {
        return res.status(500).send(error.message);
      }
    });
  }

  /* ========= TESTING ====================================
  | Endpoint to tamper with the blockchain for development. |
  | Play around with the block in the tamperTest() function |
  | in the blockchain class then use this endpoint.         |
  /* ========= TESTING =================================== */
  invalidateBlockTEST() {
    this.app.get('/tamperBlock/:block', async (req, res) => {
      if (req.params.block) {
        const block = req.params.block;
        try {
          const tamper = await this.blockchain.tamperTest(block);
          if (tamper) {
            return res.status(200).send(`Block: ${block} has been altered`);
          } else {
            return res.status(404).send(`Block: ${block} not found!`);
          }
        } catch (error) {
          return res.status(500).send(error.message);
        }
      } else {
        return res.status(500).send('Block Not Found! Review the Parameters!');
      }
    });
  }
}

module.exports = (app, blockchainObj) => {
  return new BlockchainController(app, blockchainObj);
};
