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

  protected async signOrder(order: OrderPayload, privateKey: string): Promise<string> {
    this.validateOrder(order);
    const wallet = new ethers.Wallet(privateKey);
    
    const signature = await wallet.signTypedData(
      ORDERBOOK_DOMAIN,
      { Order: ORDER_TYPE.Order },
      {
        book_id: order.book_id,
        price: order.price,
        quantity: order.quantity,
        trader: order.trader,
        nonce: order.nonce,
        expiry: order.expiry
      }
    );

    return signature;
  }

  async submitOrder(order: {
    book_id: string;
    type: 'buy' | 'sell';
    order_type: 'market' | 'limit';
    quantity: number;
    price?: number;
    total: number;
    trader: string;
  }): Promise<OrderResponse> {
    try {
      const price = order.price || 0;
      const signedPrice = order.type === 'sell' ? -Math.abs(price) : Math.abs(price);
      const now = Math.floor(Date.now() / 1000);

      const payload: OrderPayload = {
        book_id: order.book_id,
        price: signedPrice,
        quantity: order.quantity,
        trader: order.trader,
        nonce: now,
        expiry: now + 3600, // 1 hour expiry
        signature: '' // Will be set after signing
      };

      // Get private key from backend
      const keyResponse = await fetch('/api/user/private-key', {
        credentials: 'include'
      });
      if (!keyResponse.ok) {
        throw new Error('Failed to get private key');
      }
      const { private_key } = await keyResponse.json();

      // Sign the order (includes validation)
      const signature = await this.signOrder(payload, private_key);
      payload.signature = signature;

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: OrderResponse = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
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
} 