'use client'
import Image from "next/image";
import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'orderbook' | 'latestTrades'>('orderbook')
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<string>('market')
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false)
  const [positionsTab, setPositionsTab] = useState<'positions' | 'orders' | 'trades' | 'account'>('positions')
  const [showTokenMenu, setShowTokenMenu] = useState(false)

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

  return (
    <main className="flex min-h-screen flex-col w-full">
      {/* Symbol Banner */}
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

      {/* Ticker Widget */}
      <div className="w-full px-5 pt-3">
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

            {/* Market Cap */}
            <div className="flex flex-col items-start">
              <span className="text-gray-400 text-xs">Market Cap</span>
              <span className="text-gray-300 text-sm">$202.02M</span>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-800 mx-4"></div>

            {/* 24hr Volume */}
            <div className="flex flex-col items-start">
              <span className="text-gray-400 text-xs">24hr Volume</span>
              <span className="text-gray-300 text-sm">$2.77M</span>
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
        <div className="flex gap-3" style={{ width: '600px' }}>
          {/* Orderbook */}
          <div className="flex-1 bg-[#050d17] rounded-lg shadow-md p-4 border border-gray-900">
            <div className="flex space-x-4 mb-4">
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
            <div className="text-gray-500 flex items-center justify-center h-[500px] border border-gray-900 rounded-lg">
              {activeTab === 'orderbook' ? 'Orderbook Placeholder' : 'Latest Trades Placeholder'}
            </div>
          </div>

          {/* Buy/Sell Widget */}
          <div className="flex-1 bg-[#050d17] rounded-lg shadow-md p-4 border border-gray-900">
            {/* Buy/Sell Toggle */}
            <div className="flex space-x-4 mb-4">
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

            {/* Order Type Selector */}
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => {
                  setOrderType('market')
                  setShowAdvancedMenu(false)
                }}
                className={`w-12 text-left px-0 py-1 ${
                  orderType === 'market'
                    ? 'bg-[#0d1825] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => {
                  setOrderType('limit')
                  setShowAdvancedMenu(false)
                }}
                className={`px-3 py-1 rounded ${
                  orderType === 'limit'
                    ? 'bg-[#0d1825] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Limit
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
                  className={`px-3 py-1 rounded flex items-center space-x-1 ${
                    advancedOrders.includes(orderType)
                      ? 'bg-[#0d1825] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{advancedOrders.includes(orderType) ? orderType : 'Advanced'}</span>
                  <FiChevronDown className={`transform transition-transform ${showAdvancedMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Advanced Orders Dropdown */}
                {showAdvancedMenu && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-[#0d1825] border border-gray-800 rounded-lg shadow-lg z-10">
                    {advancedOrders.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setOrderType(type)
                          setShowAdvancedMenu(false)
                        }}
                        className="w-full pl-4 pr-2 py-2 text-left text-gray-400 hover:text-white hover:bg-[#161f2c] first:rounded-t-lg last:rounded-b-lg text-xs"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-gray-500 flex items-center justify-center h-[500px] border border-gray-900 rounded-lg">
              {`${tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} ${orderType} Widget`}
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
          <div className="text-gray-500 flex items-center justify-center h-[200px] border border-gray-900 rounded-lg">
            {`${positionsTab.charAt(0).toUpperCase() + positionsTab.slice(1)} Placeholder`}
          </div>
        </div>
      </div>
    </main>
  );
}
