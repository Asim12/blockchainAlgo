var express = require('express');
var router = express.Router();
const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const myKey = ec.keyFromPrivate('573e0e8a1ee7265c4a9f4a1f6f7a2d8ab3842aec75dbf42101c602419a6313a3');
const myWalletAddess = myKey.getPublic('hex');
router.post('/keyGenarate', async function(req, res, next){

  const key = ec.genKeyPair();
  const publicKey = key.getPublic('hex');
  const privateKey = key.getPrivate('hex');

  console.log('private key:', privateKey);
  console.log('public key:', publicKey);
})//end

router.post('/testing', async function(req, res, next) {
  class Trasection {
    constructor(fromAddress, toAddress, amount) {
      this.fromAddress = fromAddress;
      this.toAddress = toAddress;
      this.amount = amount;
    }

    calculateHash(){
      return SHA256(this.fromAddress + this.toAddress + this.amount).toString();
    }
    signTransaction(signingKey){
      
      if(signingKey.getPublic('hex') !== this.fromAddress ){
        throw new Error('you cannot sign trasections for another wallets!')
      }
      const hashTx = this.calculateHash();
      const sig = signingKey.sign(hashTx, 'base64');
      this.signature = sig.toDER('hex'); 
    }
    isValid(){

      if(this.fromAddress === null) return true;
      if(!this.signature || this.signature.length === 0 ){
        throw new Error('No signature in this trasection');
      }

      const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
      return publicKey.verify(this.calculateHash(), this.signature);

    }
  }//end class
  class Block{
    //index = optional where the block set to change
    //timestamp = when the block was created  
    //trasections =  any typer of trasections which is associated with block  trasection details will be stored in this trasections how much mony was transferd who was the sender and recivier
    //previousHash = mean address of the previousHash of the block who was the cresated last 
    constructor(timestamp, trasections, previousHash=''){

      this.timestamp    =   timestamp;
      this.trasections  =   trasections;
      this.previousHash =   previousHash; 
      this.hash = this.calculateHash();
      this.nonce = 0 ;
    }
    calculateHash(){
      return SHA256(this.previousHash + this.timestamp + JSON.stringify(this.trasections) + this.nonce).toString();
    }
    //create prove of work mean implemt the security, no one can tempoure your block 
    mineBlock(difficulty) {
      while(this.hash.substring(0, difficulty) !== Array(difficulty + 1) . join('0')){
        this.nonce++ ;
        this.hash = this.calculateHash();
      }//end loop
      console.log("blocked mined :" , this.hash)
    }

    hasValidTrasections() {

      for(const tx of this.trasections){
        if(!tx.isValid()){
          return false;
        }
      }
      return true;
    }
  }//end class
 
  class BlockChain{
    constructor(){
      this.chain = [this.createGenesisBlock()];
      this.difficulty = 2;
      this.pendingTrasection = [];
      this.miningReward = 100;
    }
    createGenesisBlock(){
      return new Block("01/01/2021", "Genesis block", "0");
    }
    getLatestBlock(){
      return this.chain[this.chain.length - 1];
    }
    minePendingTrasections(miningRewadAddress){
      let block = new Block(new Date(), this.pendingTrasection);
      block.mineBlock(this.difficulty);
      console.log('Block Successfully mined!');
      this.chain.push(block);
      this.pendingTrasection = [
        new Trasection(null, miningRewadAddress, this.miningReward)
      ];
    }

    addTrasection(trasection){

      if(!trasection.fromAddress || !trasection.toAddress){
        throw new Error('Trasection must include from and to address')
      }

      if(!trasection.isValid()){
        throw new Error('Cannot add invalid tarsection to chain')

      }

      this.pendingTrasection.push(trasection);
    }
    getBalanceOfAddress(address){

      let balance  = 0;
      for (const block of this.chain) {
        for(const trans of block.trasections){
          if(trans.fromAddress == address){
            balance -= trans.amount;
          }
          if(trans.toAddress == address){
            balance += trans.amount;
          }
        }
      }
      return balance;
    }

    isChainValid(){
      for(var i = 1; i < this.chain.length ; i++){
        const currentBlock = this.chain[i];
        const previousBlock = this.chain[i - 1];

        if(!currentBlock.hasValidTrasections()){
          return false;
        }

        if(currentBlock.hash !== currentBlock.calculateHash()){
          return false;
        }
        if(currentBlock.previousHash !== previousBlock.hash){
          return false;
        }
      }//end loop
      return true;
    }
  }//end class

  let savejeeCoin =  new BlockChain();

  const tx1 = new Trasection(myWalletAddess, 'public key here', 10);
  tx1.signTransaction(myKey);
  savejeeCoin.addTrasection(tx1);

  console.log('Starting the miner...........');
  savejeeCoin.minePendingTrasections(myWalletAddess);
  console.log('Balance of xavier is ', savejeeCoin.getBalanceOfAddress(myWalletAddess));

  var responseArray = {
    'status' : 'blockchain mining working start',
  };
  res.status(200).send(responseArray);
  // private key: 573e0e8a1ee7265c4a9f4a1f6f7a2d8ab3842aec75dbf42101c602419a6313a3
  // public key: 04b5db0dcd5fe02bc0026e5daa6027a5c9af9046ab7072118fac752b130a6789ee3477d626f37ffa51783ba7c5ac621088154dab154e4e6c2ea8b0cdd4d8a5203e
})

module.exports = router;
