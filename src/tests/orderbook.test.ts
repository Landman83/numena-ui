import { OrderbookService, OrderPayload, OrderResponse, OrderbookResponse } from '../services/orderbook';
import { ethers } from 'ethers';
import { describe, test, expect, afterEach, beforeAll, beforeEach } from '@jest/globals';

class TestOrderbookService extends OrderbookService {
  constructor() {
    super('http://127.0.0.1:8080/api');
  }

  async submitOrder(order: {
    book_id: string;
    type: 'buy' | 'sell';
    order_type: 'market' | 'limit';
    quantity: number;
    price?: number;
    total: number;
    trader: string;
    privateKey: string;
  }): Promise<OrderResponse> {
    try {
      const { privateKey, ...orderData } = order;
      const price = orderData.price || 0;
      const signedPrice = orderData.type === 'sell' ? -Math.abs(price) : Math.abs(price);
      const now = Math.floor(Date.now() / 1000);

      const payload: OrderPayload = {
        book_id: orderData.book_id,
        price: signedPrice,
        quantity: orderData.quantity,
        trader: orderData.trader,
        nonce: now,
        expiry: now + 3600,
        signature: ''
      };

      const signature = await this.signOrder(payload, privateKey);
      payload.signature = signature;

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      console.log('Order submission response:', {
        status: response.status,
        data,
        payload
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${data.message || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error('Order submission failed:', error);
      throw error;
    }
  }

  async getOrderbook(bookId: string): Promise<OrderbookResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/books/${bookId}/orderbook`);
      
      console.log('Orderbook response:', {
        status: response.status,
        url: `${this.baseUrl}/books/${bookId}/orderbook`
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Orderbook data:', data);
      
      return data;
    } catch (error) {
      console.error('Orderbook fetch failed:', error);
      throw error;
    }
  }
}

describe('Orderbook Integration Tests', () => {
  let orderbookService: TestOrderbookService;
  const TEST_BOOK_ID = 'NMA-USD';
  const dummyAccounts = [
    ethers.Wallet.createRandom(),
    ethers.Wallet.createRandom(),
    ethers.Wallet.createRandom()
  ];
  const submittedOrders: { order_id: string }[] = [];

  beforeAll(async () => {
    // Verify book exists by checking orderbook endpoint directly
    const response = await fetch(`http://127.0.0.1:8080/api/books/${TEST_BOOK_ID}/orderbook`);
    if (!response.ok) {
      // Only try to create if book doesn't exist
      const createResponse = await fetch('http://127.0.0.1:8080/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book_id: TEST_BOOK_ID
        })
      });
      if (!createResponse.ok) {
        throw new Error(`Failed to create book ${TEST_BOOK_ID}`);
      }
    }
    console.log(`Test book ${TEST_BOOK_ID} verified`);
  });

  beforeEach(() => {
    orderbookService = new TestOrderbookService();
  });

  afterEach(async () => {
    // Cancel any orders that were submitted
    for (const order of submittedOrders) {
      try {
        await fetch(`${orderbookService['baseUrl']}/orders/${order.order_id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error(`Failed to cancel order ${order.order_id}:`, error);
      }
    }
    submittedOrders.length = 0; // Clear the array
  });

  async function createDummyOrder(wallet: ethers.HDNodeWallet, isBuy: boolean) {
    return {
      book_id: 'NMA-USD',
      type: (isBuy ? 'buy' : 'sell') as 'buy' | 'sell',
      order_type: 'limit' as const,
      quantity: 1000,
      price: 100,
      total: 100000,
      trader: wallet.address,
      privateKey: wallet.privateKey  // Pass private key directly
    };
  }

  test('Submit and verify orders', async () => {
    // First check existing orderbook state
    const initialOrderbook = await orderbookService.getOrderbook(TEST_BOOK_ID);
    console.log('Initial orderbook state:', initialOrderbook);

    const wallet = dummyAccounts[0];
    const order = await createDummyOrder(wallet, true);
    
    const result = await orderbookService.submitOrder(order);
    expect(result.success).toBe(true);
    if (result.order_id) {
      submittedOrders.push({ order_id: result.order_id });
    }

    // Verify updated orderbook
    const updatedOrderbook = await orderbookService.getOrderbook(TEST_BOOK_ID);
    expect(updatedOrderbook).toBeDefined();
    expect(updatedOrderbook.bids).toBeDefined();
    expect(updatedOrderbook.asks).toBeDefined();
    
    console.log('Updated orderbook state:', updatedOrderbook);
  });

  test('Orderbook structure', async () => {
    const orderbook = await orderbookService.getOrderbook('NMA-USD');

    // Verify orderbook structure
    expect(orderbook).toHaveProperty('bids');
    expect(orderbook).toHaveProperty('asks');
    expect(Array.isArray(orderbook.bids)).toBe(true);
    expect(Array.isArray(orderbook.asks)).toBe(true);

    // Verify price levels are properly signed
    orderbook.bids.forEach(level => {
      expect(level.price).toBeGreaterThan(0);
      expect(typeof level.size).toBe('number');
    });

    orderbook.asks.forEach(level => {
      expect(level.price).toBeLessThan(0);
      expect(typeof level.size).toBe('number');
    });
  });
});