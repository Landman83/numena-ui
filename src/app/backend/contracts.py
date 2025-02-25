from web3 import Web3
from eth_typing import Address
from typing import Optional, Dict, Any
import json
import os
from dotenv import load_dotenv
import logging
import time

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
logger.info("Environment variables loaded")

# Contract ABIs
FACTORY_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "user", "type": "address"},
            {"internalType": "string", "name": "_salt", "type": "string"}
        ],
        "name": "createIdentityFor",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_wallet", "type": "address"}],
        "name": "getIdentity",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_salt", "type": "string"}],
        "name": "isSaltTaken",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
]

class ContractManager:
    def __init__(self):
        logger.info("Initializing ContractManager")
        
        # Load environment variables
        self.rpc_url = os.getenv('RPC_URL')
        self.factory_address = os.getenv('FACTORY_ADDRESS')
        self.deployer_private_key = os.getenv('DEPLOYER_PRIVATE_KEY')
        
        logger.info(f"RPC URL: {self.rpc_url}")
        logger.info(f"Factory Address: {self.factory_address}")
        
        # Initialize Web3 connection
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        connected = self.w3.is_connected()
        logger.info(f"Web3 connected: {connected}")
        
        # Set up deployer account
        self.deployer_account = self.w3.eth.account.from_key(self.deployer_private_key)
        self.deployer_address = self.deployer_account.address
        logger.info(f"Deployer address: {self.deployer_address}")
        
        if connected:
            chain_id = self.w3.eth.chain_id
            block_number = self.w3.eth.block_number
            deployer_balance = self.w3.eth.get_balance(self.deployer_address)
            logger.info(f"Chain ID: {chain_id}")
            logger.info(f"Current block number: {block_number}")
            logger.info(f"Deployer balance: {deployer_balance} wei")
        
        # Initialize contract instances
        self.factory_contract = self.w3.eth.contract(
            address=self.factory_address,
            abi=FACTORY_ABI
        )
        logger.info("Contract instance created")
    
    def check_connection(self) -> bool:
        """Check if Web3 is connected to the network"""
        connected = self.w3.is_connected()
        logger.info(f"Connection check: {connected}")
        return connected

    async def create_identity(
        self, 
        name: str,
        symbol: str,
        owner_address: str  # This is the new user's address
    ) -> Dict[str, Any]:
        """Create a new identity through the factory contract"""
        safe_name = name.replace("'s Identity", "").replace(" ", "_")
        salt = f"{safe_name}_{int(time.time())}"
        logger.info(f"Creating identity with salt: {salt}")
        
        try:
            # Check identity for the OWNER address, not the deployer
            logger.info(f"Checking if user has identity...")
            existing_identity = self.factory_contract.functions.getIdentity(owner_address).call()
            logger.info(f"Existing identity: {existing_identity}")
            
            # Estimate gas for createIdentityFor function
            logger.info("Estimating gas...")
            gas_estimate = self.factory_contract.functions.createIdentityFor(
                owner_address,  # The new user's address as the owner
                salt
            ).estimate_gas({'from': self.deployer_address})  # Deployer is just the sender

            # Build transaction
            transaction = self.factory_contract.functions.createIdentityFor(
                owner_address,  # The new user's address as the owner
                salt
            ).build_transaction({
                'from': self.deployer_address,
                'gas': gas_estimate,
                'nonce': self.w3.eth.get_transaction_count(self.deployer_address)
            })
            logger.info("Transaction built successfully")

            return {
                'transaction': transaction,
                'gas_estimate': gas_estimate
            }

        except Exception as e:
            logger.error(f"Failed to create identity: {str(e)}", exc_info=True)
            raise Exception(f"Failed to create identity: {str(e)}")

    async def get_identity_address(self, owner_address: str) -> Optional[str]:
        """
        Get the identity address for a given owner
        
        Args:
            owner_address: Address of the identity owner
            
        Returns:
            Identity contract address if it exists, None otherwise
        """
        logger.info(f"Getting identity address for {owner_address}")
        
        try:
            identity_address = self.factory_contract.functions.getIdentity(
                owner_address
            ).call()
            
            logger.info(f"Retrieved identity address: {identity_address}")
            
            if identity_address and identity_address != '0x' + '0' * 40:
                return identity_address
            return None
            
        except Exception as e:
            logger.error(f"Failed to get identity address: {str(e)}", exc_info=True)
            raise Exception(f"Failed to get identity address: {str(e)}")

    async def deploy_identity(
        self,
        name: str,
        symbol: str,
        owner_address: str,
        private_key: str
    ) -> Dict[str, Any]:
        """Deploy a new identity contract using the deployer account"""
        logger.info(f"Deploying identity for {owner_address}")
        logger.info(f"Name: {name}, Symbol: {symbol}")
        logger.info(f"Using deployer address: {self.deployer_address}")
        
        try:
            # Build the transaction
            logger.info("Building transaction...")
            tx_data = await self.create_identity(name, symbol, owner_address)
            
            # Sign the transaction with deployer's key
            logger.info("Signing transaction with deployer key...")
            signed_tx = self.w3.eth.account.sign_transaction(
                tx_data['transaction'],
                private_key=self.deployer_private_key
            )
            logger.info("Transaction signed successfully")
            
            # Send the transaction
            logger.info("Sending transaction...")
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            logger.info(f"Transaction hash: {tx_hash.hex()}")
            
            # Wait for transaction receipt
            logger.info("Waiting for transaction receipt...")
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            logger.info(f"Transaction receipt received. Status: {tx_receipt['status']}")
            
            # Get the new identity address
            logger.info("Retrieving new identity address...")
            identity_address = await self.get_identity_address(owner_address)
            logger.info(f"New identity address: {identity_address}")
            
            return {
                'transaction_hash': tx_hash.hex(),
                'identity_address': identity_address,
                'gas_used': tx_receipt['gasUsed']
            }
            
        except Exception as e:
            logger.error(f"Failed to deploy identity: {str(e)}", exc_info=True)
            raise Exception(f"Failed to deploy identity: {str(e)}")

# Create a singleton instance
logger.info("Creating ContractManager instance")
contract_manager = ContractManager()
logger.info("ContractManager instance created")
