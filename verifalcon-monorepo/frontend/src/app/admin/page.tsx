'use client';

import React, { useState, useEffect } from 'react';
import { getVerifiedProducts, deleteVerifiedProduct, clearVerifiedProducts, VerifiedProduct } from '@/services/verifiedProducts';

export default function AdminPage() {
  const [products, setProducts] = useState<VerifiedProduct[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    const verifiedProducts = getVerifiedProducts();
    setProducts(verifiedProducts);
  };

  const handleDeleteProduct = (tokenId: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" (Token ID: ${tokenId})?`)) {
      deleteVerifiedProduct(tokenId);
      loadProducts();
    }
  };

  const handleClearAll = () => {
    if (confirmClearAll) {
      clearVerifiedProducts();
      loadProducts();
      setConfirmClearAll(false);
    } else {
      setConfirmClearAll(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmClearAll(false), 3000);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <a 
              href="/"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Back to App
            </a>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Admin Panel
          </h1>
          <p className="text-gray-600">
            Manage marketplace products and certificates (Demo Mode)
          </p>
        </div>

        {/* Actions Panel */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleClearAll}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                confirmClearAll
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {confirmClearAll ? '⚠️ Click again to confirm' : '🗑️ Clear All Products'}
            </button>
            <button
              onClick={loadProducts}
              className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-all"
            >
              🔄 Refresh List
            </button>
          </div>
          {products.length > 0 && (
            <p className="text-sm text-gray-500 mt-3">
              Total products: <span className="font-semibold">{products.length}</span>
            </p>
          )}
        </div>

        {/* Products List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Verified Products</h2>
          </div>
          
          {products.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
              <p className="text-gray-500">Verify some items to see them here</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.tokenId} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Delete Button Overlay */}
                    <button
                      onClick={() => handleDeleteProduct(product.tokenId, product.name)}
                      className="absolute top-3 right-3 px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-lg"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                        {product.brand}
                      </p>
                      <h3 className="font-bold text-gray-900 truncate">
                        {product.name}
                      </h3>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-600">
                        AI: {product.aiScore}/100
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ {product.oracleStatus}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <p>Token: <code className="bg-gray-200 px-1 rounded">{product.tokenId.slice(0, 12)}...</code></p>
                      <p className="mt-1">Serial: {product.serialNumber}</p>
                    </div>
                    
                    {/* Certificate Link */}
                    {product.certificateUrl && (
                      <a
                        href={product.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        🔗 View on BscScan
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800">Demo Mode Notice</h3>
              <p className="text-sm text-yellow-700">
                Deleting products here only removes them from the local marketplace display. 
                The blockchain records (NFT certificates) remain permanently on BNB Chain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
