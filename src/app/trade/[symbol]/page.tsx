'use client'
import Image from "next/image";
import { useState, useEffect } from 'react'
import { FiChevronDown, FiEdit2, FiX, FiUser } from 'react-icons/fi'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrderbookService } from '@/services/orderbook';

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
  const [userWallet, setUserWallet] = useState<string | null>(null);

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
    router.push('/sign-up-or-in/signin')
  }

  // Fetch user profile including wallet address
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/me', {
          credentials: 'include'  // Include cookies for auth
        });
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await response.json();
        setUserWallet(data.wallet_address);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        router.push('/sign-up-or-in/signin');
      }
    };

    fetchUserProfile();
  }, []);

  const handleOrderSubmit = async () => {
    if (!userWallet) {
      console.error('No wallet address available');
      return;
    }

    try {
      const orderData = {
        book_id: 'NMA-USD',
        type: tradeType,
        order_type: orderType,
        trader: userWallet,  // Add wallet address
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

      const response = await orderbookService.submitOrder(orderData);
      console.log('Order submitted successfully:', response);
      
      // TODO: Add success notification
      // TODO: Clear form or update UI as needed
      
    } catch (error) {
      console.error('Failed to submit order:', error);
      // TODO: Add error notification
    }
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
        {/* Chart Section */}
        <div className="flex-grow bg-[#050d17] rounded-lg shadow-md p-4 min-h-[600px] border border-gray-900">
          <div className="text-gray-500 flex items-center justify-center h-full border border-gray-900 rounded-lg">
            TradingView Chart Placeholder
          </div>
        </div>

        {/* Right Side Panel */}
        <div style={{ width: '651px' }}>
          <div className="flex gap-3">
          {/* Orderbook */}
            <div className="flex-1 bg-[#050d17] rounded-lg shadow-md p-4 border border-gray-900" style={{ width: '351px' }}>
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
                  <div className="grid grid-cols-3 gap-1 text-sm relative z-10">
                    <div className="text-red-400">$183.88</div>
                    <div className="text-center text-gray-300">20,000</div>
                    <div className="text-right text-gray-300">$3,677,600.00</div>

                    <div className="text-red-400">$183.85</div>
                    <div className="text-center text-gray-300">17,500</div>
                    <div className="text-right text-gray-300">$3,217,375.00</div>

                    <div className="text-red-400">$183.82</div>
                    <div className="text-center text-gray-300">15,000</div>
                    <div className="text-right text-gray-300">$2,757,300.00</div>

                    <div className="text-red-400">$183.78</div>
                    <div className="text-center text-gray-300">12,500</div>
                    <div className="text-right text-gray-300">$2,297,250.00</div>

                    <div className="text-red-400">$183.75</div>
                    <div className="text-center text-gray-300">10,000</div>
                    <div className="text-right text-gray-300">$1,837,500.00</div>

                    <div className="text-red-400">$183.72</div>
                    <div className="text-center text-gray-300">7,500</div>
                    <div className="text-right text-gray-300">$1,377,900.00</div>

                    <div className="text-red-400">$183.68</div>
                    <div className="text-center text-gray-300">5,000</div>
                    <div className="text-right text-gray-300">$918,400.00</div>

                    <div className="text-red-400">$183.65</div>
                    <div className="text-center text-gray-300">3,750</div>
                    <div className="text-right text-gray-300">$688,687.50</div>

                    <div className="text-red-400">$183.63</div>
                    <div className="text-center text-gray-300">2,500</div>
                    <div className="text-right text-gray-300">$459,075.00</div>

                    <div className="text-red-400">$183.61</div>
                    <div className="text-center text-gray-300">1,250</div>
                    <div className="text-right text-gray-300">$229,512.50</div>
                  </div>
                </div>

                {/* Price Indicator */}
                <div className="w-full h-8 bg-gray-800/50 flex items-center justify-between">
                  {/* Price Group - Left */}
                  <div className="flex items-center gap-4 pl-2">
                    {/* Midpoint Price */}
                    <div className="relative group">
                      <span className="text-gray-200 text-base font-medium">$183.60</span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#0d1825] text-xs text-gray-300 rounded border border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Midpoint Price
                      </div>
                    </div>

                    {/* Last Price */}
                    <div className="relative group">
                      <span className="text-gray-400 text-sm">$183.65</span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#0d1825] text-xs text-gray-300 rounded border border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Last Price
                      </div>
                    </div>
                  </div>

                  {/* Spread Group - Right */}
                  <div className="flex items-center mr-2">
                    {/* Combined Spread */}
                    <div className="relative group">
                      <span className="text-gray-400 text-sm">$0.02 / 0.0109%</span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#0d1825] text-xs text-gray-300 rounded border border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Spread
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buy Orders Container */}
                <div className="flex-1 px-2 relative">
                  {/* Bid Orders */}
                  <div className="grid grid-cols-3 gap-1 text-sm relative z-10">
                    <div className="text-green-400">$183.59</div>
                    <div className="text-center text-gray-300">1,250</div>
                    <div className="text-right text-gray-300">$229,487.50</div>

                    <div className="text-green-400">$183.57</div>
                    <div className="text-center text-gray-300">2,500</div>
                    <div className="text-right text-gray-300">$458,925.00</div>

                    <div className="text-green-400">$183.55</div>
                    <div className="text-center text-gray-300">3,750</div>
                    <div className="text-right text-gray-300">$688,312.50</div>

                    <div className="text-green-400">$183.52</div>
                    <div className="text-center text-gray-300">5,000</div>
                    <div className="text-right text-gray-300">$917,600.00</div>

                    <div className="text-green-400">$183.48</div>
                    <div className="text-center text-gray-300">7,500</div>
                    <div className="text-right text-gray-300">$1,376,100.00</div>

                    <div className="text-green-400">$183.45</div>
                    <div className="text-center text-gray-300">10,000</div>
                    <div className="text-right text-gray-300">$1,834,500.00</div>

                    <div className="text-green-400">$183.42</div>
                    <div className="text-center text-gray-300">12,500</div>
                    <div className="text-right text-gray-300">$2,292,750.00</div>

                    <div className="text-green-400">$183.38</div>
                    <div className="text-center text-gray-300">15,000</div>
                    <div className="text-right text-gray-300">$2,750,700.00</div>

                    <div className="text-green-400">$183.35</div>
                    <div className="text-center text-gray-300">17,500</div>
                    <div className="text-right text-gray-300">$3,208,625.00</div>

                    <div className="text-green-400">$183.32</div>
                    <div className="text-center text-gray-300">20,000</div>
                    <div className="text-right text-gray-300">$3,666,400.00</div>
                  </div>
                </div>
            </div>
          </div>

          {/* Buy/Sell Widget */}
            <div style={{ width: '300px' }}>
              <div className={`bg-[#050d17] rounded-lg shadow-md p-4 border border-gray-900 h-[600px] ${
                tradeType === 'buy' 
                  ? 'bg-gradient-to-b from-green-950/10 to-[#050d17]' 
                  : tradeType === 'sell'
                    ? 'bg-gradient-to-b from-red-950/10 to-[#050d17]'
                    : ''
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
                      {tradeType === 'buy' ? 'Buy NMA' : 'Sell NMA'}
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
          {positionsTab === 'orders' ? (
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
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                  <div>NMA</div>
                  <div><span className="text-green-400">Buy</span></div>
                  <div>Limit</div>
                  <div>$183.65</div>
                  <div>$183.75</div>
                  <div>5,000</div>
                  <div>$918,750.00</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <span>45%</span>
                  </div>
                  <div>03/14/24 20:24:33</div>
                  <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-blue-400 transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-400 transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                  <div>NMA</div>
                  <div><span className="text-red-400">Sell</span></div>
                  <div>Limit</div>
                  <div>$183.65</div>
                  <div>$183.55</div>
                  <div>2,500</div>
                  <div>$458,875.00</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                    <span>78%</span>
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

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                  <div>NMA</div>
                  <div><span className="text-green-400">Buy</span></div>
                  <div>Limit</div>
                  <div>$183.65</div>
                  <div>$183.70</div>
                  <div>3,750</div>
                  <div>$688,875.00</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '32%' }}></div>
                    </div>
                    <span>32%</span>
                  </div>
                  <div>03/14/24 20:22:48</div>
                  <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-blue-400 transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-400 transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                  <div>NMA</div>
                  <div><span className="text-red-400">Sell</span></div>
                  <div>Limit</div>
                  <div>$183.65</div>
                  <div>$183.58</div>
                  <div>4,200</div>
                  <div>$771,036.00</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    <span>65%</span>
                  </div>
                  <div>03/14/24 20:22:12</div>
                  <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-blue-400 transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-400 transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                  <div>NMA</div>
                  <div><span className="text-green-400">Buy</span></div>
                  <div>Limit</div>
                  <div>$183.65</div>
                  <div>$183.72</div>
                  <div>1,800</div>
                  <div>$330,696.00</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    <span>25%</span>
                  </div>
                  <div>03/14/24 20:21:55</div>
                  <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-blue-400 transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-400 transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                  <div>NMA</div>
                  <div><span className="text-red-400">Sell</span></div>
                  <div>Limit</div>
                  <div>$183.65</div>
                  <div>$183.52</div>
                  <div>3,300</div>
                  <div>$605,616.00</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                    <span>92%</span>
                  </div>
                  <div>03/14/24 20:21:33</div>
                  <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-blue-400 transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-400 transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.5fr_1fr_1.5fr_2fr_1.5fr_auto] gap-4 text-sm border-b border-gray-800/50 py-2">
                  <div>NMA</div>
                  <div><span className="text-green-400">Buy</span></div>
                  <div>Limit</div>
                  <div>$183.65</div>
                  <div>$183.68</div>
                  <div>2,900</div>
                  <div>$532,672.00</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                    <span>15%</span>
                  </div>
                  <div>03/14/24 20:21:09</div>
                  <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-blue-400 transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-400 transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Placeholder for other tabs
            <div className="text-gray-500 flex items-center justify-center h-[400px] border border-gray-900 rounded-lg">
              {`${positionsTab.charAt(0).toUpperCase() + positionsTab.slice(1)} Placeholder`}
            </div>
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
    </main>
  );
}
