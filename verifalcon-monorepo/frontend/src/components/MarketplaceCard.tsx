'use client';

import React from 'react';

export interface ProductData {
  id: string;
  name: string;
  brand: string;
  price: string; // kept for data compatibility but not displayed
  imageUrl: string;
  aiScore: number;
  oracleStatus: 'passed' | 'pending' | 'failed';
  serialNumber: string;
  verificationDate: Date;
  tokenId?: string;
  certificateUrl?: string;
}

// Mask serial number for public display to prevent counterfeiting
function maskSerialNumber(serial: string): string {
  if (serial.length <= 2) {
    return '••'; // Too short, hide entirely
  }
  if (serial.length <= 4) {
    // For 3-4 chars: show first and last, mask middle
    return serial[0] + '••' + serial[serial.length - 1];
  }
  // Show first 2 and last 2 only
  return serial.slice(0, 2) + '••••' + serial.slice(-2);
}

interface GalleryCardProps {
  product: ProductData;
}

export default function MarketplaceCard({ product }: GalleryCardProps) {
  return (
    <div className="card group overflow-hidden animate-fadeInScale">
      {/* Product Image */}
      <div className="relative overflow-hidden rounded-xl mb-4 aspect-square">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* VeriFalcon Protected Badge */}
        <div className="absolute top-3 left-3 badge badge-success backdrop-blur-md bg-white/90">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Verified Authentic
        </div>
        
        {/* Verification Date */}
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
          Verified {product.verificationDate.toLocaleDateString()}
        </div>
      </div>

      {/* Product Info */}
      <div className="space-y-3">
        {/* Brand & Name */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
            {product.brand}
          </p>
          <h3 className="text-lg font-bold text-gray-900 mt-1 line-clamp-2">
            {product.name}
          </h3>
        </div>

        {/* Verification Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {/* AI Score */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center gap-1 mb-1">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-gray-700">AI Score</span>
            </div>
            <div className="text-xl font-bold text-blue-600">{product.aiScore}/100</div>
          </div>

          {/* Oracle Status */}
          <div className={`p-3 rounded-lg border ${
            product.oracleStatus === 'passed'
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
              : product.oracleStatus === 'pending'
              ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-100'
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100'
          }`}>
            <div className="flex items-center gap-1 mb-1">
              <svg className={`w-4 h-4 ${
                product.oracleStatus === 'passed' ? 'text-green-600' : 
                product.oracleStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
              }`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-gray-700">Oracle</span>
            </div>
            <div className={`text-xs font-bold uppercase ${
              product.oracleStatus === 'passed' ? 'text-green-600' : 
              product.oracleStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {product.oracleStatus}
            </div>
          </div>
        </div>

        {/* Serial Number (Masked for Security) */}
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Serial Number</p>
          <code className="text-xs font-mono text-gray-800 break-all">
            {maskSerialNumber(product.serialNumber)}
          </code>
        </div>

        {/* Certificate Link */}
        {product.certificateUrl && (
          <a
            href={product.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium py-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            View Certificate on BscScan
          </a>
        )}

        {/* Authenticity Disclaimer */}
        <p className="text-xs text-gray-400 text-center">
          ⚠️ Verifies authenticity only, not ownership
        </p>
      </div>
    </div>
  );
}
