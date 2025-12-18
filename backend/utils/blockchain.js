import { ethers } from 'ethers';

const abi = [
  'function registerProof(bytes32 hash, uint256 timestamp, string uri) public returns (bool)',
  'event ProofRegistered(bytes32 indexed hash, uint256 timestamp, string uri, address indexed sender)'
];

export const sendToPolygon = async ({ hashHex, timestamp, uri }) => {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  const contractAddress = process.env.PROOF_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    return {
      txHash: 'demo-no-chain',
      note: 'Blockchain credentials missing. Stored locally only.'
    };
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const tx = await contract.registerProof(hashHex, timestamp, uri ?? '');
  const receipt = await tx.wait();
  return { txHash: receipt?.hash ?? tx.hash };
};
