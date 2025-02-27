'use client'
import Image from "next/image";
import { useState, useEffect } from 'react'
import { FiChevronDown, FiEdit2, FiX, FiUser } from 'react-icons/fi'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrderbookService } from '@/services/orderbook';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'orderbook' | 'latestTrades'>('orderbook')
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false)
  const [positionsTab, setPositionsTab] = useState<'positions' | 'orders' | 'trades' | 'account'>('positions')
  const [showTokenMenu, setShowTokenMenu] = useState(false)
  const [sizeNMA, setSizeNMA] = useState<string>('')
  const [sizeUSD, setSizeUSD] = useState<string>('')
  const [tpslMode, setTpslMode] = useState<'none' | 'simple' | 'advanced'>('none')
  const [showTpslMenu, setShowTpslMenu] = useState(false)
  const [tpslEnabled, setTpslEnabled] = useState(false)
  const price = 183.65 // We'll use this as our reference price
  const [limitPrice, setLimitPrice] = useState<string>('')
  const [limitQuantity, setLimitQuantity] = useState<string>('')
  const [limitTotal, setLimitTotal] = useState<string>('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const orderbookService = new OrderbookService();
  const { isAuthenticated, userWallet, checkAuthStatus, getPrivateKey } = useAuth();

  // Add new state for orderbook data
  const [orderbook, setOrderbook] = useState<{
    bids: Array<{price: number, quantity: number, total: number}>;
    asks: Array<{price: number, quantity: number, total: number}>;
  }>({
    bids: [],
    asks: []
  });
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [midpointPrice, setMidpointPrice] = useState<number | null>(null);
  const [spread, setSpread] = useState<{absolute: number, percentage: number} | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Add this state to control client-side rendering
  const [isClient, setIsClient] = useState(false);

  // Add this state to properly handle client-side rendering
  const [mounted, setMounted] = useState(false);

  const advancedOrders = [
    'Stop Loss',
    'Stop Limit',
    'Take Profit',
    'Take Profit Limit',
    'Pegged',
    'TWAP',
    'VWAP',
    'Bracket'
  ]

  // Update the order types array to match the state values
  const orderTypes = ['market', 'limit', 'pegged', 'wap', 'bracket']

  // Add number formatting helper
  const formatNumber = (value: string, isUSD: boolean) => {
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    
    if (isUSD) {
      // Format USD with 2 decimal places and commas
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    } else {
      // Format NMA with 4 decimal places and commas
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      })
    }
  }

  // Update conversion functions
  const handleNMAChange = (value: string) => {
    setSizeNMA(value)
    if (value && !isNaN(parseFloat(value))) {
      const usdValue = (parseFloat(value) * price).toFixed(2)
      setSizeUSD(formatNumber(usdValue, true))
    } else {
      setSizeUSD('')
    }
  }

  const handleUSDChange = (value: string) => {
    setSizeUSD(value)
    if (value && !isNaN(parseFloat(value))) {
      const nmaValue = (parseFloat(value) / price).toFixed(4)
      setSizeNMA(formatNumber(nmaValue, false))
    } else {
      setSizeNMA('')
    }
  }

  // Update the calculation functions
  const calculateFees = (usdAmount: string): number => {
    const value = parseFloat(usdAmount || '0')
    return value * 0.001 // 0.1% fee
  }

  const calculateOrderValue = (usdAmount: string): number => {
    const baseValue = parseFloat(usdAmount || '0')
    const fees = calculateFees(usdAmount)
    return baseValue + fees
  }

  // Add new conversion functions for limit orders
  const handleLimitPriceChange = (value: string) => {
    setLimitPrice(value)
    // Update total if quantity exists
    if (limitQuantity && !isNaN(parseFloat(limitQuantity))) {
      const total = (parseFloat(limitQuantity) * parseFloat(value)).toFixed(2)
      setLimitTotal(formatNumber(total, true))
    }
  }

  const handleLimitQuantityChange = (value: string) => {
    setLimitQuantity(value)
    if (value && limitPrice && !isNaN(parseFloat(value))) {
      const total = (parseFloat(value) * parseFloat(limitPrice)).toFixed(2)
      setLimitTotal(formatNumber(total, true))
    } else {
      setLimitTotal('')
    }
  }

  const handleLimitTotalChange = (value: string) => {
    setLimitTotal(value)
    if (value && limitPrice && !isNaN(parseFloat(value))) {
      const quantity = (parseFloat(value) / parseFloat(limitPrice)).toFixed(4)
      setLimitQuantity(formatNumber(quantity, false))
    } else {
      setLimitQuantity('')
    }
  }

  const handleLogout = () => {
    // Add logout logic here
    router.push('/signin')
  }

  // Move the authentication check to a separate useEffect that runs after mounting
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Update the authentication useEffect to be more robust
  useEffect(() => {
    if (mounted) {
      checkAuthStatus();
    }
  }, [mounted, checkAuthStatus]);

  // Set client-side rendering flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update WebSocket connection
  useEffect(() => {
    if (!isClient) return; // Only run on client
    
    const symbol = window.location.pathname.split('/').pop() || 'nma';
    const bookId = symbol.toUpperCase() + '-USD';
    
    // Always fetch initial data via REST
    fetchOrderbookREST(bookId);
    
    // Set up polling as fallback
    const intervalId = setInterval(() => {
      fetchOrderbookREST(bookId);
    }, 1000);
    
    // Try WebSocket connection with proper URL
    let ws: WebSocket | null = null;
    try {
      // Use the direct WebSocket URL (not through Next.js rewrites)
      console.log('Attempting WebSocket connection...');
      ws = new WebSocket(`ws://127.0.0.1:8080/api/books/${bookId}/ws`);
      
      // Add event listeners with better error handling
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        clearInterval(intervalId); // Stop polling if WebSocket works
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          processOrderbookData(data);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        // Don't stop polling on error
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed with code:', event.code, 'reason:', event.reason);
        setWsConnected(false);
        // Restart polling if WebSocket closes
        if (intervalId === null) {
          const newIntervalId = setInterval(() => {
            fetchOrderbookREST(bookId);
          }, 1000);
          return () => clearInterval(newIntervalId);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
    
    return () => {
      if (ws) ws.close();
      clearInterval(intervalId);
    };
  }, [isClient]);
  
  // Update the REST API fetch function
  const fetchOrderbookREST = async (bookId: string) => {
    try {
      // Use the direct URL with proper CORS headers
      const response = await fetch(`http://127.0.0.1:8080/api/books/${bookId}/orderbook`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Include credentials if your API requires authentication
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      processOrderbookData(data);
    } catch (error) {
      console.error('Error fetching orderbook via REST:', error);
    }
  };
  
  // Process orderbook data
  const processOrderbookData = (data: any) => {
    // Process bids (positive prices)
    const processedBids = processOrders(data.bids, true);
    
    // Process asks (negative prices in the API, convert to positive for display)
    const processedAsks = processOrders(data.asks.map((ask: any) => ({
      price: Math.abs(ask.price),
      quantity: ask.size || ask.quantity
    })), false);
    
    setOrderbook({
      bids: processedBids,
      asks: processedAsks
    });
    
    // Calculate midpoint price
    if (processedBids.length > 0 && processedAsks.length > 0) {
      const highestBid = processedBids[0].price;
      const lowestAsk = processedAsks[0].price;
      const midpoint = (highestBid + lowestAsk) / 2;
      setMidpointPrice(midpoint);
      
      // Calculate spread
      const absoluteSpread = lowestAsk - highestBid;
      const percentageSpread = (absoluteSpread / midpoint) * 100;
      setSpread({
        absolute: absoluteSpread,
        percentage: percentageSpread
      });
      
      // Use highest bid as last price if not available
      if (!lastPrice) {
        setLastPrice(highestBid);
      }
    }
  };
  
  // Helper function to process orders and calculate totals
  const processOrders = (orders: Array<{price: number, quantity: number}>, isBid: boolean) => {
    let runningTotal = 0;
    return orders
      .sort((a, b) => isBid ? b.price - a.price : a.price - b.price) // Sort bids descending, asks ascending
      .map(order => {
        runningTotal += order.quantity * order.price;
        return {
          price: order.price,
          quantity: order.quantity,
          total: runningTotal
        };
      });
  };

  const handleOrderSubmit = async () => {
    if (!isAuthenticated) {
      console.log('Please sign in to trade');
      alert('Please sign in to trade');
      return;
    }

    if (!userWallet) {
      console.error('No wallet address available');
      alert('No wallet address available. Please sign in again.');
      return;
    }

    try {
      // Get the private key
      const privateKey = await getPrivateKey();
      if (!privateKey) {
        throw new Error('Failed to get private key');
      }
      
      const orderData = {
        book_id: 'NMA-USD',
        type: tradeType,
        order_type: orderType,
        trader: userWallet,
        ...(orderType === 'market' 
          ? {
              quantity: parseFloat(sizeNMA),
              total: parseFloat(sizeUSD),
            }
          : {
              price: parseFloat(limitPrice),
              quantity: parseFloat(limitQuantity),
              total: parseFloat(limitTotal),
            }
        ),
      };

      // Pass the private key to the submitOrder method
      const response = await orderbookService.submitOrder(orderData, privateKey);
      console.log('Order submitted successfully:', response);
      alert('Order submitted successfully!');
      
    } catch (error) {
      console.error('Failed to submit order:', error);
      alert('Failed to submit order. Please try again.');
    }
  }

  // Add null checks for toLocaleString
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleString();
  };

  // Add this debugging code to see the authentication state
  useEffect(() => {
    console.log('Authentication state changed:', isAuthenticated);
    console.log('User wallet:', userWallet);
  }, [isAuthenticated, userWallet]);

  // Wrap your JSX with a conditional to prevent rendering until mounted
  if (!mounted) {
    return <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>;
  }

  return (
    <main className="flex min-h-screen flex-col w-full">
      {/* Symbol Banner - full width */}
      <div className="w-full px-5">
        <div className="bg-[#050d17] rounded-lg shadow-md border border-gray-900 p-2">
          <div className="flex space-x-6">
            <div className="flex-shrink-0 px-2 hover:bg-[#0d1825] rounded cursor-pointer text-gray-400 hover:text-white transition-colors text-sm">
              BTC/USD
            </div>
            <div className="flex-shrink-0 px-2 hover:bg-[#0d1825] rounded cursor-pointer text-gray-400 hover:text-white transition-colors text-sm">
              ETH/USD
            </div>
            <div className="flex-shrink-0 px-2 hover:bg-[#0d1825] rounded cursor-pointer text-gray-400 hover:text-white transition-colors text-sm">
              SOL/USD
            </div>
          </div>
        </div>
      </div>

      {/* Ticker and Balances Row */}
      <div className="w-full px-5 pt-3">
        <div className="flex gap-3">
          {/* Ticker Widget */}
          <div className="flex-grow">
            <div className="bg-[#050d17] rounded-lg shadow-md border border-gray-900 p-2 h-[51px]">
              <div className="flex items-center h-full">
                {/* Token Selector */}
                <button
                  onClick={() => setShowTokenMenu(!showTokenMenu)}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white px-3 text-lg relative"
                >
                  <span>Numena Technologies (NMA)</span>
                  <FiChevronDown className={`transform transition-transform ${showTokenMenu ? 'rotate-180' : ''}`} />
                  
                  {showTokenMenu && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-[#0d1825] border border-gray-800 rounded-lg shadow-lg z-10">
                      {/* Dropdown content can go here */}
                    </div>
                  )}
                </button>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-800 mx-4"></div>

                {/* Price */}
                <div className="text-white text-xl font-semibold">
                  $183.65
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-800 mx-4"></div>

                {/* 24hr Change */}
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs">24hr Change</span>
                  <span className="text-green-500 text-sm">+2.45%</span>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-800 mx-4"></div>

                {/* 24hr Volume */}
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs">24hr Volume</span>
                  <span className="text-gray-300 text-sm">$2.77M</span>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-800 mx-4"></div>

                {/* Market Cap */}
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs">Market Cap</span>
                  <span className="text-gray-300 text-sm">$202.02M</span>
                </div>
              </div>
            </div>
          </div>

          {/* Balances Widget */}
          <div style={{ width: '300px' }}>
            <div className="bg-[#050d17] rounded-lg shadow-md p-2 border border-gray-900 h-[51px]">
              <div className="flex items-center h-full">
                {/* USD Balance */}
                <div className="flex flex-col items-center flex-1">
                  <span className="text-gray-400 text-xs">USD Balance</span>
                  <span className="text-gray-300 text-sm">$12,450.00</span>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-800 mx-4"></div>

                {/* NMA Balance */}
                <div className="flex flex-col items-center flex-1">
                  <span className="text-gray-400 text-xs">NMA Balance</span>
                  <span className="text-gray-300 text-sm">2,500.00 NMA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Trading Area */}
      <div className="flex flex-1 px-5 pt-3 gap-3">
        {/* Chart Section - make it wider */}
        <div className="flex-grow bg-[#050d17] rounded-lg shadow-md p-4 min-h-[600px] border border-gray-900">
          <div className="text-gray-500 flex items-center justify-center h-full border border-gray-900 rounded-lg">
            TradingView Chart Placeholder
          </div>
        </div>
        
        {/* Right Side Panel - keep the same structure but adjust widths */}
        <div style={{ width: '750px' }}>  {/* Increased from 500px */}
          <div className="flex gap-3">
            {/* Orderbook - increase width by 50% */}
            <div className="flex-1 bg-[#050d17] rounded-lg shadow-md p-4 border border-gray-900" style={{ width: '375px' }}>  {/* Increased from 250px */}
              {/* Header Row */}
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex space-x-4">
                  <button 
                    onClick={() => setActiveTab('orderbook')}
                    className={`text-gray-300 ${
                      activeTab === 'orderbook' 
                        ? 'font-semibold' 
                        : 'font-normal'
                    }`}
                  >
                    <span className={`inline-block pb-1 border-b-2 ${
                      activeTab === 'orderbook' ? 'border-white' : 'border-transparent'
                    }`}>
                      Orderbook
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('latestTrades')}
                    className={`text-gray-300 ${
                      activeTab === 'latestTrades' 
                        ? 'font-semibold' 
                        : 'font-normal'
                    }`}
                  >
                    <span className={`inline-block pb-1 border-b-2 ${
                      activeTab === 'latestTrades' ? 'border-white' : 'border-transparent'
                    }`}>
                      Latest Trades
                    </span>
                  </button>
                </div>
              </div>

              {/* Horizontal Divider */}
              <div className="w-full h-px bg-gray-800 mb-4"></div>

              {/* Column Headers */}
              <div className="grid grid-cols-3 px-2 mb-3">
                <div className="text-gray-400 text-sm text-left pl-0">Price</div>
                <div className="text-gray-400 text-sm text-center">Shares</div>
                {activeTab === 'orderbook' ? (
                  <div className="text-gray-400 text-sm text-right pr-0">Total</div>
                ) : (
                  <div className="text-gray-400 text-sm text-right pr-0">Time</div>
                )}
              </div>

              {/* Orderbook Content */}
              <div className="relative h-[500px] flex flex-col -mx-4">
                {/* Sell Orders */}
                <div className="flex-1 flex flex-col justify-end px-2">
                  {/* Ask Orders */}
                  {isClient ? (
                    <div className="grid grid-cols-3 gap-1 text-sm relative z-10">
                      {orderbook.asks.slice().reverse().map((ask, index) => (
                        <React.Fragment key={`ask-${index}`}>
                          <div className="text-red-400">${ask.price.toFixed(2)}</div>
                          <div className="text-center text-gray-300">
                            {ask.quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-right text-gray-300">
                            ${ask.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-40">
                      <p>Loading orderbook...</p>
                    </div>
                  )}
                </div>

                {/* Price Indicator */}
                <div className="w-full h-8 bg-gray-800/50 flex items-center justify-between">
                  {/* Price Group - Left */}
                  <div className="flex items-center gap-4 pl-2">
                    {/* Midpoint Price */}
                    <div className="relative group">
                      <span className="text-gray-200 text-base font-medium">
                        ${midpointPrice ? midpointPrice.toFixed(2) : '-.--'}
                      </span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#0d1825] text-xs text-gray-300 rounded border border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Midpoint Price
                      </div>
                    </div>

                    {/* Last Price */}
                    <div className="relative group">
                      <span className="text-gray-400 text-sm">
                        ${lastPrice ? lastPrice.toFixed(2) : '-.--'}
                      </span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#0d1825] text-xs text-gray-300 rounded border border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Last Price
                      </div>
                    </div>
                  </div>

                  {/* Spread Group - Right */}
                  <div className="flex items-center mr-2">
                    {/* Combined Spread */}
                    <div className="relative group">
                      <span className="text-gray-400 text-sm">
                        {spread 
                          ? `$${spread.absolute.toFixed(2)} / ${spread.percentage.toFixed(4)}%` 
                          : '$-.-- / -.---%'}
                      </span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#0d1825] text-xs text-gray-300 rounded border border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Spread
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buy Orders Container */}
                <div className="flex-1 px-2">
                  {/* Bid Orders */}
                  {isClient ? (
                    <div className="grid grid-cols-3 gap-1 text-sm relative z-10">
                      {orderbook.bids.map((bid, index) => (
                        <React.Fragment key={`bid-${index}`}>
                          <div className="text-green-400">${bid.price.toFixed(2)}</div>
                          <div className="text-center text-gray-300">
                            {bid?.quantity ? bid.quantity.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                          </div>
                          <div className="text-right text-gray-300">
                            ${bid?.total ? bid.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-40">
                      <p>Loading orderbook...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Buy/Sell Widget - increase width by 50% */}
            <div style={{ width: '375px' }}>  {/* Increased from 250px */}
              <div className={`bg-[#050d17] rounded-lg shadow-md p-4 border border-gray-900 h-full ${
                tradeType === 'buy' 
                  ? 'bg-gradient-to-b from-green-950/10 to-[#050d17]' 
                  : 'bg-gradient-to-b from-red-950/10 to-[#050d17]'
              }`}>
                {/* Header Row */}
                <div className="flex justify-between items-center mb-4 px-2">
                  {/* Buy/Sell Toggle */}
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => setTradeType('buy')}
                      className={`text-gray-300 w-12 text-left ${
                        tradeType === 'buy' 
                          ? 'font-semibold' 
                          : 'font-normal'
                      }`}
                    >
                      <span className={`inline-block pb-1 border-b-2 ${
                        tradeType === 'buy' ? 'border-white' : 'border-transparent'
                      }`}>
                        Buy
                      </span>
                    </button>
                    <button 
                      onClick={() => setTradeType('sell')}
                      className={`text-gray-300 ${
                        tradeType === 'sell' 
                          ? 'font-semibold' 
                          : 'font-normal'
                      }`}
                    >
                      <span className={`inline-block pb-1 border-b-2 ${
                        tradeType === 'sell' ? 'border-white' : 'border-transparent'
                      }`}>
                        Sell
                      </span>
                    </button>
                  </div>

                  {/* Order Type Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
                      className="flex items-center space-x-2 px-3 py-1 text-gray-400 hover:text-white"
                    >
                      <span className="uppercase">{orderType}</span>
                      <FiChevronDown className={`transform transition-transform ${showAdvancedMenu ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showAdvancedMenu && (
                      <div className="absolute top-full right-0 mt-1 w-32 bg-[#0d1825] border border-gray-800 rounded-lg shadow-lg z-10">
                        {orderTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              if (type === 'market' || type === 'limit') {
                                setOrderType(type)
                              }
                              setShowAdvancedMenu(false)
                            }}
                            className="w-full px-3 py-2 text-left text-gray-400 hover:text-white hover:bg-[#161f2c] first:rounded-t-lg last:rounded-b-lg text-sm"
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Horizontal Divider */}
                <div className="w-full h-px bg-gray-800 mb-4"></div>

                <div className="flex flex-col h-[500px]">
                  {/* Size/Limit Input Section */}
                  <div className="mb-4 px-2">
                    {orderType === 'market' ? (
                      <>
                        <div className="text-gray-400 text-sm mb-2">Size</div>
                        <div className="flex flex-col gap-2 mb-4">
                          {/* NMA Input */}
                          <div className="relative">
                            <input
                              type="text"
                              value={sizeNMA}
                              onChange={(e) => handleNMAChange(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                                       bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                              placeholder="0.0000"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                              NMA
                            </span>
                          </div>

                          {/* USD Input */}
                          <div className="relative">
                            <input
                              type="text"
                              value={sizeUSD}
                              onChange={(e) => handleUSDChange(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                                       bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                              placeholder="0.00"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                              USD
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Limit Price Input */}
                        <div className="mb-4">
                          <div className="text-gray-400 text-sm mb-2">Limit Price</div>
                          <div className="relative">
                            <input
                              type="text"
                              value={limitPrice}
                              onChange={(e) => handleLimitPriceChange(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                                       bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                              placeholder="0.00"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                              USD
                            </span>
                          </div>
                        </div>

                        {/* Quantity and Total Inputs */}
                        <div className="flex gap-2 mb-4">
                          {/* Quantity Input */}
                          <div className="flex-1">
                            <div className="text-gray-400 text-sm mb-2">Quantity</div>
                            <div className="relative">
                              <input
                                type="text"
                                value={limitQuantity}
                                onChange={(e) => handleLimitQuantityChange(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                                         bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                                placeholder="0.0000"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                NMA
                              </span>
                            </div>
                          </div>

                          {/* Total Input */}
                          <div className="flex-1">
                            <div className="text-gray-400 text-sm mb-2">Total</div>
                            <div className="relative">
                              <input
                                type="text"
                                value={limitTotal}
                                onChange={(e) => handleLimitTotalChange(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                                         bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                                placeholder="0.00"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                USD
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* TP/SL Toggle */}
                    <div className="flex items-center">
                      <span className="text-gray-400 text-sm mr-2">TP/SL</span>
                      <button
                        onClick={() => setTpslEnabled(!tpslEnabled)}
                        className={`w-4 h-4 rounded-full border transition-colors ${
                          tpslEnabled
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        {tpslEnabled && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto px-2">
                    {/* Buy/Sell Button */}
                    <button 
                      onClick={handleOrderSubmit}
                      className={`w-full py-3 rounded-lg font-semibold text-white ${
                        orderType === 'market' ? 'mb-4' : 'mb-3'
                      } ${
                        tradeType === 'buy' 
                          ? 'bg-[#16a34a]/90 hover:bg-[#15803d]/90 border border-[#16a34a]' 
                          : 'bg-red-600 hover:bg-red-700'
                      } transition-colors`}
                    >
                      {`${tradeType === 'buy' ? 'Buy' : 'Sell'} NMA`}
                    </button>

                    {/* Order Details */}
                    <div className="border border-gray-800 rounded-lg p-3 text-sm space-y-2">
                      {/* Order Value */}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order Value</span>
                        <span className="text-gray-300">
                          ${formatNumber((parseFloat(orderType === 'market' ? sizeUSD : limitTotal || '0') + 
                            calculateFees(orderType === 'market' ? sizeUSD : limitTotal)).toString(), true)}
                        </span>
                      </div>

                      {/* Fees */}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fees</span>
                        <span className="text-gray-300">
                          ${formatNumber(calculateFees(orderType === 'market' ? sizeUSD : limitTotal).toString(), true)}
                        </span>
                      </div>

                      {/* Fee Rates */}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fee Rates</span>
                        <span className="text-gray-300">0.05% / 0.10%</span>
                      </div>

                      {/* Slippage - Only show for market orders */}
                      {orderType === 'market' && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Slippage</span>
                          <span className="text-blue-400">Est: 0.0036% / Max: 8.00%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Widget */}
      <div className="px-5 pt-3 pb-5">
        <div className="bg-[#050d17] rounded-lg shadow-md p-4 border border-gray-900">
          <div className="flex space-x-6 mb-4">
            <button 
              onClick={() => setPositionsTab('positions')}
              className={`text-gray-300 pb-1 border-b-2 ${
                positionsTab === 'positions' 
                  ? 'font-semibold border-white' 
                  : 'font-normal border-transparent'
              }`}
            >
              Positions
            </button>
            <button 
              onClick={() => setPositionsTab('orders')}
              className={`text-gray-300 pb-1 border-b-2 ${
                positionsTab === 'orders' 
                  ? 'font-semibold border-white' 
                  : 'font-normal border-transparent'
              }`}
            >
              Orders
            </button>
            <button 
              onClick={() => setPositionsTab('trades')}
              className={`text-gray-300 pb-1 border-b-2 ${
                positionsTab === 'trades' 
                  ? 'font-semibold border-white' 
                  : 'font-normal border-transparent'
              }`}
            >
              Trades
            </button>
            <button 
              onClick={() => setPositionsTab('account')}
              className={`text-gray-300 pb-1 border-b-2 ${
                positionsTab === 'account' 
                  ? 'font-semibold border-white' 
                  : 'font-normal border-transparent'
              }`}
            >
              Account
            </button>
          </div>
          {/* Positions Widget Content */}
          {isClient ? (
            positionsTab === 'orders' ? (
              // Orders Table
              <div className="text-sm mt-4">
                {/* Table Header */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-gray-400 border-b border-gray-800 pb-3">
                  <div className="pl-[12px]">Market</div>
                  <div className="pl-0">Side</div>
                  <div className="pl-0">Type</div>
                  <div className="pl-[12px]">Current Price</div>
                  <div className="pl-[12px]">Limit Price</div>
                  <div className="pl-0">Quantity</div>
                  <div className="pl-[12px]">Total</div>
                  <div className="pl-[52px]">Status</div>
                  <div className="pl-[12px]">Time</div>
                  <div className="pl-0"></div>
                </div>

                {/* Table Content */}
                <div className="text-gray-300 pt-3 h-[400px]">
                  {orderbook.asks.map((ask, index) => (
                    <div key={index} className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                      <div>NMA</div>
                      <div><span className="text-red-400">Sell</span></div>
                      <div>Limit</div>
                      <div>{ask?.price ? formatNumber(ask.price.toFixed(4), true) : '0.0000'}</div>
                      <div>{ask?.price ? formatNumber(ask.price.toFixed(4), true) : '0.0000'}</div>
                      <div>{ask?.quantity ? ask.quantity.toFixed(4) : '0.0000'}</div>
                      <div>{ask?.total ? ask.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ask?.quantity ? (ask.quantity / 10000) * 100 : 0}%` }}></div>
                        </div>
                        <span>{ask?.quantity ? ((ask.quantity / 10000) * 100).toFixed(2) : '0.00'}%</span>
                      </div>
                      <div>-</div>
                      <div className="flex gap-2">
                        <button className="text-gray-400 hover:text-blue-400 transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-400 transition-colors">
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {orderbook.bids.map((bid, index) => (
                    <div key={index} className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                      <div>NMA</div>
                      <div><span className="text-green-400">Buy</span></div>
                      <div>Limit</div>
                      <div>{formatNumber(bid.price.toFixed(4), true)}</div>
                      <div>{formatNumber(bid.price.toFixed(4), true)}</div>
                      <div>{bid?.quantity ? bid.quantity.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}</div>
                      <div>{bid?.total ? bid.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(bid?.quantity / 10000) * 100}%` }}></div>
                        </div>
                        <span>{((bid?.quantity / 10000) * 100).toFixed(2)}%</span>
                      </div>
                      <div>03/14/24 20:23:15</div>
                      <div className="flex gap-2">
                        <button className="text-gray-400 hover:text-blue-400 transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-400 transition-colors">
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Placeholder for other tabs
              <div className="text-gray-500 flex items-center justify-center h-[400px] border border-gray-900 rounded-lg">
                {`${positionsTab.charAt(0).toUpperCase() + positionsTab.slice(1)} Placeholder`}
              </div>
            )
          ) : (
            <div className="loading-placeholder">Loading...</div>
          )}
        </div>
      </div>

      {/* Profile Icon */}
      <div 
        className="relative"
        onMouseEnter={() => setShowProfileMenu(true)}
        onMouseLeave={() => setShowProfileMenu(false)}
      >
        <button className="text-gray-400 hover:text-white transition-colors">
          <FiUser className="w-5 h-5" />
        </button>

        {showProfileMenu && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-[#0d1825] border border-gray-800 rounded-lg shadow-lg z-50">
            <div className="py-1">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#161f2c]"
              >
                Profile
              </Link>
              <Link
                href="/watchlist"
                className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#161f2c]"
              >
                Watchlist
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#161f2c]"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Also add a debug display in the component to verify the state */}
      <div className="text-xs text-gray-500 mt-1 mb-2">
        Debug: {isAuthenticated ? 'Authenticated' : 'Not authenticated'} | 
        Wallet: {userWallet || 'None'}
      </div>
    </main>
  );
}
