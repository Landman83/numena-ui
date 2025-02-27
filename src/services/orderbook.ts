import { ethers } from 'ethers';

export interface OrderPayload {
  book_id: string;
  price: number;        // Positive for bids, negative for asks
  quantity: number;     // Base units
  trader: string;       // Ethereum address with 0x prefix
  nonce: number;        // Unix timestamp
  expiry: number;       // Unix timestamp in seconds
  signature: string;    // Hex-encoded signature with 0x prefix
}

export interface OrderResponse {
  success: boolean;
  message: string;
  order_id?: string;
  error?: string;
}

const ORDERBOOK_DOMAIN = {
  name: 'Numena Orderbook',
  version: '1',
  chainId: 31337,  // Anvil's default chainId
  verifyingContract: '0x0000000000000000000000000000000000000000' // Since orderbook is off-chain
};

const ORDER_TYPE = {
  Order: [
    { name: 'book_id', type: 'string' },
    { name: 'price', type: 'int256' },
    { name: 'quantity', type: 'uint256' },
    { name: 'trader', type: 'address' },
    { name: 'nonce', type: 'uint64' },
    { name: 'expiry', type: 'uint64' }
  ]
};

class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

interface Level {
  price: number;    // Price level
  size: number;     // Total quantity at this price level
}

export interface OrderbookResponse {
  bids: Level[];    // Buy orders (positive prices)
  asks: Level[];    // Sell orders (negative prices)
}

export class OrderbookService {
  protected baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 'http://localhost:8080/api';
  }

  private validateOrder(order: OrderPayload) {
    // Check required fields
    if (!order.book_id || !order.quantity || !order.trader) {
      throw new OrderValidationError('Missing required order fields');
    }

    // Validate book_id format
    if (!/^[A-Z]+-[A-Z]+$/.test(order.book_id)) {
      throw new OrderValidationError('Invalid book_id format. Expected FORMAT: XXX-XXX');
    }

    // Validate quantity is positive integer
    if (!Number.isInteger(order.quantity) || order.quantity <= 0) {
      throw new OrderValidationError('Quantity must be a positive integer');
    }

    // Validate price format (can be negative for asks, but must be non-zero)
    if (order.price === 0) {
      throw new OrderValidationError('Price cannot be zero');
    }

    // Validate trader address
    if (!ethers.isAddress(order.trader)) {
      throw new OrderValidationError('Invalid trader address');
    }

    // Validate timestamps
    const now = Math.floor(Date.now() / 1000);
    
    // Nonce should be current timestamp
    if (order.nonce < now - 60 || order.nonce > now + 60) {
      throw new OrderValidationError('Invalid nonce - must be within 60 seconds of current time');
    }

    // Expiry must be in the future
    if (order.expiry <= now) {
      throw new OrderValidationError('Order expiry must be in the future');
    }

    // Expiry shouldn't be too far in the future (e.g., max 24 hours)
    if (order.expiry > now + 86400) {
      throw new OrderValidationError('Order expiry too far in future (max 24 hours)');
    }
  }

  protected async signOrder(order: any, privateKey: string): Promise<OrderPayload> {
    // Ensure all required fields are present and properly formatted
    const now = Math.floor(Date.now() / 1000);
    
    // Create a properly formatted order with all required fields
    const formattedOrder = {
      book_id: order.book_id || 'NMA-USD',
      // Convert price to a proper number format
      price: order.type === 'buy' ? Math.abs(order.price || 0) : -Math.abs(order.price || 0),
      quantity: Math.floor(order.quantity || 0),
      trader: order.trader,
      nonce: order.nonce || now,
      expiry: order.expiry || (now + 3600) // Default 1 hour expiry
    };
    
    console.log('Signing order with data:', formattedOrder);
    
    try {
      const wallet = new ethers.Wallet(privateKey);
      
      const signature = await wallet.signTypedData(
        ORDERBOOK_DOMAIN,
        { Order: ORDER_TYPE.Order },
        {
          book_id: formattedOrder.book_id,
          price: formattedOrder.price,
          quantity: formattedOrder.quantity,
          trader: formattedOrder.trader,
          nonce: formattedOrder.nonce,
          expiry: formattedOrder.expiry
        }
      );
      
      // Return the complete order payload with signature
      return {
        ...formattedOrder,
        signature
      };
    } catch (error) {
      console.error('Error signing order:', error);
      throw error;
    }
  }

  async submitOrder(orderData: any, privateKey: string): Promise<any> {
    try {
      // Use the provided private key for signing
      if (!privateKey) {
        throw new Error('Private key is required for signing orders');
      }
      
      // Prepare the order data based on order type
      let orderToSign;
      
      if (orderData.order_type === 'market') {
        // Market order
        orderToSign = {
          book_id: orderData.book_id,
          type: orderData.type,
          trader: orderData.trader,
          quantity: parseFloat(orderData.quantity),
          // For market orders, we don't specify price
          price: 0
        };
      } else {
        // Limit order
        orderToSign = {
          book_id: orderData.book_id,
          type: orderData.type,
          trader: orderData.trader,
          quantity: parseFloat(orderData.quantity),
          price: parseFloat(orderData.price)
        };
      }
      
      console.log('Preparing to sign order:', orderToSign);
      
      // Sign the order with the private key
      const signedOrder = await this.signOrder(orderToSign, privateKey);
      
      console.log('Order signed successfully:', signedOrder);
      
      // Submit the signed order
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signedOrder),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting order:', error);
      throw error;
    }
  }

  async getOrderbook(bookId: string): Promise<OrderbookResponse> {
    const response = await fetch(`${this.baseUrl}/books/${bookId}/orderbook`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  connectOrderbookWebSocket(bookId: string, onUpdate: (data: any) => void): WebSocket {
    const ws = new WebSocket(`ws://localhost:8080/api/ws/orderbook/${bookId}`);
    
    ws.onopen = () => {
      console.log(`WebSocket connection established for ${bookId}`);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = (event) => {
      console.log(`WebSocket connection closed for ${bookId}:`, event.code, event.reason);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return ws;
  }
} 