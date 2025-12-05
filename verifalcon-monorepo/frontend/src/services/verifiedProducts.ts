'use client';

/**
 * Verified Products Storage Service
 * Uses localStorage to persist verified products across sessions
 */

export interface VerifiedProduct {
  id: string;
  name: string;
  brand: string;
  model?: string;
  imageUrl: string;
  aiScore: number;
  serialNumber: string;
  tokenId: string;
  owner: string;
  certificateUrl: string;
  verificationDate: Date;
  oracleStatus: 'passed';
  price: string;
}

const STORAGE_KEY = 'verifalcon_verified_products';

/**
 * Save a verified product to localStorage
 */
export function saveVerifiedProduct(product: Omit<VerifiedProduct, 'verificationDate'> & { verificationDate?: Date }): void {
  try {
    const products = getVerifiedProducts();
    
    // Check if product already exists (by tokenId)
    const existingIndex = products.findIndex(p => p.tokenId === product.tokenId);
    
    const newProduct: VerifiedProduct = {
      ...product,
      verificationDate: product.verificationDate || new Date(),
      oracleStatus: 'passed',
    };
    
    if (existingIndex > -1) {
      // Update existing product
      products[existingIndex] = newProduct;
    } else {
      // Add new product
      products.push(newProduct);
    }
    
    // Store with date as ISO string for serialization
    const serialized = products.map(p => ({
      ...p,
      verificationDate: p.verificationDate instanceof Date 
        ? p.verificationDate.toISOString() 
        : p.verificationDate
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    console.log('[VerifiedProducts] Saved product:', product.name);
  } catch (error) {
    console.error('[VerifiedProducts] Failed to save product:', error);
  }
}

/**
 * Get all verified products from localStorage
 */
export function getVerifiedProducts(): VerifiedProduct[] {
  try {
    if (typeof window === 'undefined') {
      return [];
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    
    // Convert date strings back to Date objects
    return parsed.map((p: any) => ({
      ...p,
      verificationDate: new Date(p.verificationDate)
    }));
  } catch (error) {
    console.error('[VerifiedProducts] Failed to get products:', error);
    return [];
  }
}

/**
 * Delete a specific verified product by tokenId
 */
export function deleteVerifiedProduct(tokenId: string): boolean {
  try {
    const products = getVerifiedProducts();
    const filteredProducts = products.filter(p => p.tokenId !== tokenId);
    
    if (filteredProducts.length === products.length) {
      console.log('[VerifiedProducts] Product not found:', tokenId);
      return false;
    }
    
    const serialized = filteredProducts.map(p => ({
      ...p,
      verificationDate: p.verificationDate instanceof Date 
        ? p.verificationDate.toISOString() 
        : p.verificationDate
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    console.log('[VerifiedProducts] Deleted product:', tokenId);
    return true;
  } catch (error) {
    console.error('[VerifiedProducts] Failed to delete product:', error);
    return false;
  }
}

/**
 * Clear all verified products (for testing)
 */
export function clearVerifiedProducts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[VerifiedProducts] Cleared all products');
  } catch (error) {
    console.error('[VerifiedProducts] Failed to clear products:', error);
  }
}

/**
 * Generate a product name from brand and category
 */
export function generateProductName(brand: string, category?: string): string {
  if (!brand || brand === 'Unknown' || brand.includes('needs API')) {
    return 'Luxury Item';
  }
  
  // Common luxury item categories
  const categories = ['Bag', 'Watch', 'Wallet', 'Belt', 'Accessory'];
  const detectedCategory = category || categories[Math.floor(Math.random() * categories.length)];
  
  return `${brand} ${detectedCategory}`;
}
