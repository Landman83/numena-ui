from web3 import Web3
from eth_typing import Address
from typing import Optional, Dict, Any
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Contract ABIs
FACTORY_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "symbol", "type": "string"}
        ],
        "name": "createIdentity",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "identities",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

class ContractManager:
    def __init__(self):
        # Initialize Web3 connection
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))
        
        # Contract addresses from environment variables
        self.factory_address = os.getenv('FACTORY_ADDRESS')
        
        # Initialize contract instances
        self.factory_contract = self.w3.eth.contract(
            address=self.factory_address,
            abi=FACTORY_ABI
        )
    
    def check_connection(self) -> bool:
        """Check if Web3 is connected to the network"""
        return self.w3.is_connected()

    async def create_identity(
        self, 
        name: str, 
        symbol: str, 
        sender_address: str
    ) -> Dict[str, Any]:
        """
        Create a new identity through the factory contract
        
        Args:
            name: Name of the identity
            symbol: Symbol for the identity
            sender_address: Address of the transaction sender
            
        Returns:
            Dictionary containing transaction details and new identity address
        """
        try:
            # Estimate gas for the transaction
            gas_estimate = self.factory_contract.functions.createIdentity(
                name,
                symbol
            ).estimate_gas({'from': sender_address})

            # Build the transaction
            transaction = self.factory_contract.functions.createIdentity(
                name,
                symbol
            ).build_transaction({
                'from': sender_address,
                'gas': gas_estimate,
                'nonce': self.w3.eth.get_transaction_count(sender_address)
            })

            return {
                'transaction': transaction,
                'gas_estimate': gas_estimate
            }

        except Exception as e:
            raise Exception(f"Failed to create identity: {str(e)}")

    async def get_identity_address(self, owner_address: str) -> Optional[str]:
        """
        Get the identity address for a given owner
        
        Args:
            owner_address: Address of the identity owner
            
        Returns:
            Identity contract address if it exists, None otherwise
        """
        try:
            identity_address = self.factory_contract.functions.identities(
                owner_address
            ).call()
            
            if identity_address and identity_address != '0x' + '0' * 40:
                return identity_address
            return None
            
        except Exception as e:
            raise Exception(f"Failed to get identity address: {str(e)}")

# Create a singleton instance
contract_manager = ContractManager()
