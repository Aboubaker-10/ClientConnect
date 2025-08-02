import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from "wouter";
import { useEffect } from "react";
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Package, 
  Search,
  Banknote,
  X,
  ImageIcon,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Product {
  id: string;
  name: string;
  itemCode: string;
  description?: string;
  price: string;
  currency: string;
  stockQuantity?: number;
  category?: string;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

// Component to handle product images with fallback
function ProductImage({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [src]);

  if (!src || imageError) {
    return (
      <div 
        className={`${className} border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50`}
        style={{ color: 'var(--portal-accent)' }}
      >
        <ImageIcon className="h-8 w-8 opacity-50" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className={`${className} border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 absolute inset-0`}>
          <div className="animate-pulse h-8 w-8 bg-gray-300 rounded"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        style={isLoading ? { opacity: 0 } : { opacity: 1 }}
      />
    </div>
  );
}

// Enhanced search utilities
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Levenshtein distance for fuzzy matching
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - matrix[s2.length][s1.length] / maxLength;
}

// Extract potential OEM codes from text (numbers with optional letters)
function extractOEMCodes(text: string): string[] {
  // Match patterns like "190689", "OEM 190689", "190689A", etc.
  // Also match item codes and part numbers
  const patterns = [
    /\b(?:OEM\s+)?([A-Z0-9]{4,})\b/gi,  // Standard OEM codes
    /\b([0-9]{5,}[A-Z]*)\b/gi,          // Numeric codes with optional letters
    /\b([A-Z]{2,}[0-9]{3,})\b/gi,       // Letter prefix codes
    /\b([0-9]{3,}[A-Z][0-9]*)\b/gi      // Mixed alphanumeric
  ];
  
  const codes = new Set<string>();
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^OEM\s+/i, '').toUpperCase();
        if (cleaned.length >= 4) {
          codes.add(cleaned);
        }
      });
    }
  });
  
  return Array.from(codes);
}

// Enhanced similarity check for OEM codes
function isOEMSimilar(code1: string, code2: string): number {
  if (code1 === code2) return 1.0;
  
  // Check if one code contains the other
  if (code1.includes(code2) || code2.includes(code1)) return 0.9;
  
  // Check for common patterns (like manufacturer prefixes)
  const prefixMatch = code1.substring(0, 3) === code2.substring(0, 3);
  const suffixMatch = code1.slice(-3) === code2.slice(-3);
  
  if (prefixMatch && suffixMatch) return 0.8;
  if (prefixMatch || suffixMatch) return 0.6;
  
  // Character-based similarity
  const similarity = calculateSimilarity(code1, code2);
  return similarity > 0.7 ? similarity : 0;
}

// Check if two products might be the same based on specifications
function areProductsSimilar(product1: Product, product2: Product): boolean {
  const extractSpecs = (product: Product) => {
    const text = `${product.name} ${product.itemCode} ${product.description || ''}`.toLowerCase();
    
    // Extract common specs like viscosity (10W40, 5W30), volume (5L, 1L), etc.
    const viscosity = text.match(/\b(\d+w\d+)\b/i)?.[1];
    const volume = text.match(/\b(\d+(?:\.\d+)?l)\b/i)?.[1];
    const brand = product.name.split(' ')[0]?.toLowerCase();
    const category = product.category?.toLowerCase();
    
    // Extract additional specs
    const grade = text.match(/\b(sae|api|acea)\s*([a-z0-9-]+)\b/i)?.[2];
    const application = text.match(/\b(gasoline|diesel|engine|gear|transmission)\b/i)?.[1];
    
    return { viscosity, volume, brand, category, grade, application };
  };
  
  const specs1 = extractSpecs(product1);
  const specs2 = extractSpecs(product2);
  
  // Products are similar if they have matching specs but different brands
  const sameViscosity = specs1.viscosity && specs2.viscosity && specs1.viscosity === specs2.viscosity;
  const sameVolume = specs1.volume && specs2.volume && specs1.volume === specs2.volume;
  const sameApplication = specs1.application && specs2.application && specs1.application === specs2.application;
  const differentBrand = specs1.brand !== specs2.brand;
  
  return sameViscosity && (sameVolume || sameApplication) && differentBrand;
}

function smartProductSearch(products: Product[], query: string) {
  if (!query.trim()) return { matches: products, suggestions: [] };
  
  const queryLower = query.toLowerCase().trim();
  const searchTerms = queryLower.split(' ').filter(term => term.length > 1);
  const queryOEMCodes = extractOEMCodes(query);
  
  console.log('Search query:', query);
  console.log('Extracted OEM codes:', queryOEMCodes);
  
  const scored = products.map(product => {
    let maxScore = 0;
    let matchType = '';
    
    // Build searchable text
    const searchableText = [
      product.name,
      product.itemCode,
      product.description || '',
      product.category || ''
    ].join(' ').toLowerCase();
    
    // Extract OEM codes from product
    const productOEMCodes = extractOEMCodes(`${product.itemCode} ${product.name} ${product.description || ''}`);
    
    // 1. Check for OEM code matches (highest priority)
    if (queryOEMCodes.length > 0) {
      for (const queryOEM of queryOEMCodes) {
        // Check item code first (most likely to contain OEM)
        if (product.itemCode.toUpperCase().includes(queryOEM)) {
          console.log(`OEM exact match in item code: ${queryOEM} in ${product.itemCode}`);
          maxScore = Math.max(maxScore, 1.0);
          matchType = 'OEM_EXACT';
        }
        
        // Check against extracted product OEM codes
        for (const productOEM of productOEMCodes) {
          const similarity = isOEMSimilar(queryOEM, productOEM);
          if (similarity >= 0.8) {
            console.log(`OEM match found: ${queryOEM} ≈ ${productOEM} (${similarity.toFixed(2)}) in ${product.name}`);
            maxScore = Math.max(maxScore, similarity);
            matchType = similarity === 1.0 ? 'OEM_EXACT' : 'OEM_SIMILAR';
          }
        }
        
        // Partial OEM match in any field
        if (maxScore < 0.8 && searchableText.includes(queryOEM.toLowerCase())) {
          maxScore = Math.max(maxScore, 0.7);
          matchType = 'OEM_PARTIAL';
        }
      }
    }
    
    // 2. Check for exact term matches
    if (maxScore < 0.9) {
      for (const term of searchTerms) {
        if (term.length >= 2) {
          // Exact match in product name (high priority)
          if (product.name.toLowerCase().includes(term)) {
            maxScore = Math.max(maxScore, 0.85);
            matchType = matchType || 'NAME_EXACT';
          }
          // Exact match in item code
          else if (product.itemCode.toLowerCase().includes(term)) {
            maxScore = Math.max(maxScore, 0.8);
            matchType = matchType || 'CODE_EXACT';
          }
          // Match in description or category
          else if (searchableText.includes(term)) {
            maxScore = Math.max(maxScore, 0.7);
            matchType = matchType || 'DESC_EXACT';
          }
        }
      }
    }
    
    // 3. Fuzzy matching for product names and codes
    if (maxScore < 0.7) {
      for (const term of searchTerms) {
        if (term.length >= 3) {
          const nameScore = calculateSimilarity(term, product.name.toLowerCase());
          const codeScore = calculateSimilarity(term, product.itemCode.toLowerCase());
          const descScore = product.description ? calculateSimilarity(term, product.description.toLowerCase()) : 0;
          
          const bestFuzzyScore = Math.max(nameScore * 0.8, codeScore * 0.9, descScore * 0.6);
          if (bestFuzzyScore > maxScore) {
            maxScore = bestFuzzyScore;
            matchType = matchType || 'FUZZY';
          }
        }
      }
    }
    
    // 4. Specification matches (viscosity, volume, etc.)
    if (maxScore < 0.6) {
      const viscosityMatch = queryLower.match(/\b(\d+w\d+)\b/);
      const volumeMatch = queryLower.match(/\b(\d+(?:\.\d+)?l)\b/);
      const gradeMatch = queryLower.match(/\b(sae|api|acea)\s*([a-z0-9-]+)\b/i);
      
      if (viscosityMatch && searchableText.includes(viscosityMatch[1])) {
        maxScore = Math.max(maxScore, 0.6);
        matchType = matchType || 'SPEC_VISCOSITY';
      }
      if (volumeMatch && searchableText.includes(volumeMatch[1])) {
        maxScore = Math.max(maxScore, 0.5);
        matchType = matchType || 'SPEC_VOLUME';
      }
      if (gradeMatch && searchableText.includes(gradeMatch[2])) {
        maxScore = Math.max(maxScore, 0.55);
        matchType = matchType || 'SPEC_GRADE';
      }
    }
    
    return { product, score: maxScore, matchType };
  });
  
  // Sort by score, then by match type priority
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    
    const typeOrder = ['OEM_EXACT', 'OEM_SIMILAR', 'NAME_EXACT', 'CODE_EXACT', 'OEM_PARTIAL', 'DESC_EXACT', 'SPEC_VISCOSITY', 'FUZZY'];
    return typeOrder.indexOf(a.matchType) - typeOrder.indexOf(b.matchType);
  });
  
  // Split into matches and suggestions
  const goodMatches = scored.filter(item => item.score >= 0.4);
  const potentialMatches = scored.filter(item => item.score >= 0.15 && item.score < 0.4);
  
  // Enhanced suggestions logic
  const suggestions: Product[] = [];
  const suggestionSet = new Set<string>();
  
  if (goodMatches.length === 0) {
    // No good matches - show best potential matches as suggestions
    potentialMatches.slice(0, 5).forEach(item => {
      if (!suggestionSet.has(item.product.id)) {
        suggestions.push(item.product);
        suggestionSet.add(item.product.id);
      }
    });
  } else {
    // Found matches - suggest similar products
    const topMatches = goodMatches.slice(0, 3);
    
    // Find similar products based on specifications
    for (const matchedItem of topMatches) {
      for (const item of scored) {
        if (item.score < 0.4 && suggestions.length < 5 && !suggestionSet.has(item.product.id)) {
          if (areProductsSimilar(matchedItem.product, item.product)) {
            suggestions.push(item.product);
            suggestionSet.add(item.product.id);
          }
        }
      }
    }
    
    // If not enough similar products, add some potential matches
    if (suggestions.length < 3) {
      potentialMatches.slice(0, 3 - suggestions.length).forEach(item => {
        if (!suggestionSet.has(item.product.id)) {
          suggestions.push(item.product);
          suggestionSet.add(item.product.id);
        }
      });
    }
  }
  
  console.log('Search results:', {
    matches: goodMatches.length,
    suggestions: suggestions.length,
    topScore: scored[0]?.score || 0,
    topMatchType: scored[0]?.matchType || 'NONE'
  });
  
  return {
    matches: goodMatches.map(item => item.product),
    suggestions: suggestions
  };
}

export default function PlaceOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    retry: false,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: { items: CartItem[]; total: number }) => {
      const response = await apiRequest("POST", "/api/orders/create", orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Placed Successfully",
        description: "Your order has been submitted and is being processed.",
      });
      setCart([]);
      setShowCartModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/customer/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders"] });
      setLocation("/orders");
    },
    onError: () => {
      toast({
        title: "Order Failed",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error) {
      console.error('Products fetch error:', error);
      toast({
        title: "Connection Error",
        description: "Unable to load products. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [error]);

  const searchResults = products ? smartProductSearch(
    products.filter(product => parseFloat(product.price) > 0),
    searchQuery
  ) : { matches: [], suggestions: [] };

  const { matches: filteredProducts, suggestions } = searchResults;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item.id === productId 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const cartTotal = cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${numAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive",
      });
      return;
    }

    placeOrderMutation.mutate({
      items: cart,
      total: cartTotal
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--portal-background)' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--portal-background)' }}>
        <header className="portal-card border-b sticky top-0 z-40" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
                <h1 className="text-xl font-semibold" style={{ color: 'var(--portal-text)' }}>
                  Products
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={() => setShowCartModal(true)}
                >
                  <div className="relative">
                    <ShoppingCart className="h-5 w-5" style={{ color: 'var(--portal-accent)' }} />
                    {cart.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {cart.length}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                    Cart
                  </span>
                  {cartTotal > 0 && (
                    <Badge variant="secondary">
                      {formatCurrency(cartTotal)}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Card className="portal-card border-portal">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--portal-accent)' }} />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Suggestions for similar products */}
              {searchQuery && suggestions.length > 0 && filteredProducts.length === 0 && (
                <Card className="portal-card border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-yellow-600 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-2">
                          We couldn't find "{searchQuery}", but here are some similar products:
                        </p>
                        <div className="space-y-2">
                          {suggestions.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.itemCode}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSearchQuery(product.name);
                                }}
                                className="text-xs"
                              >
                                Search this
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Suggestions when there are some matches but also similar products */}
              {searchQuery && suggestions.length > 0 && filteredProducts.length > 0 && (
                <Card className="portal-card border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">
                        You might also be interested in:
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.slice(0, 2).map((product) => (
                        <Button
                          key={product.id}
                          size="sm"
                          variant="outline"
                          onClick={() => setSearchQuery(product.name)}
                          className="text-xs text-blue-700 border-blue-300 hover:bg-blue-100"
                        >
                          {product.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {error ? (
                  <div className="col-span-full">
                    <Card className="portal-card border-red-200">
                      <CardContent className="pt-6 text-center">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                        <p className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                          Unable to load products
                        </p>
                        <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                          Please check your connection and try again
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : filteredProducts.length === 0 && !searchQuery ? (
                  <div className="col-span-full">
                    <Card className="portal-card border-portal">
                      <CardContent className="pt-6 text-center">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                        <p className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                          No products available
                        </p>
                        <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                          No products available at the moment
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : filteredProducts.length === 0 && searchQuery && suggestions.length === 0 ? (
                  <div className="col-span-full">
                    <Card className="portal-card border-portal">
                      <CardContent className="pt-6 text-center">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                        <p className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                          No products found for "{searchQuery}"
                        </p>
                        <p className="text-sm mb-4" style={{ color: 'var(--portal-accent)' }}>
                          Try using different keywords or check the spelling
                        </p>
                        <Button
                          onClick={() => setSearchQuery('')}
                          variant="outline"
                          size="sm"
                        >
                          Clear search
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                filteredProducts.map((product) => {
                    const cartQuantity = cart.find(item => item.id === product.id)?.quantity || 0;
                    
                    return (
                      <Card key={product.id} className="portal-card border-portal hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex space-x-4">
                            {/* Product Information */}
                            <div className="flex-1 space-y-4">
                              <div>
                                <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--portal-text)' }}>
                                  {product.name}
                                </h3>
                                <p className="text-sm font-mono" style={{ color: 'var(--portal-accent)' }}>
                                  {product.itemCode}
                                </p>
                                {product.description && (
                                  <p className="text-sm mt-2" style={{ color: 'var(--portal-accent)' }}>
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xl font-bold" style={{ color: 'var(--portal-text)' }}>
                                    {formatCurrency(product.price)}
                                  </p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {product.category}
                                  </Badge>
                                </div>

                                {cartQuantity === 0 ? (
                                  <Button
                                    onClick={() => addToCart(product)}
                                    size="sm"
                                    style={{ backgroundColor: 'var(--portal-primary)' }}
                                    className="text-white hover:opacity-90"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      onClick={() => removeFromCart(product.id)}
                                      size="sm"
                                      variant="outline"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                                      {cartQuantity}
                                    </span>
                                    <Button
                                      onClick={() => addToCart(product)}
                                      size="sm"
                                      variant="outline"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Product Image */}
                            <div className="w-24 h-24 flex-shrink-0">
                              <ProductImage 
                                src={product.image} 
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg border"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showCartModal} onOpenChange={setShowCartModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order Summary
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                  Your cart is empty
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-start space-x-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--portal-text)' }}>
                          {item.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--portal-accent)' }}>
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToCart(item)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                        {formatCurrency(parseFloat(item.price) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-semibold" style={{ color: 'var(--portal-text)' }}>
                    Total
                  </span>
                  <span className="font-bold text-lg" style={{ color: 'var(--portal-text)' }}>
                    {formatCurrency(cartTotal)}
                  </span>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={placeOrderMutation.isPending}
                  className="w-full"
                  style={{ backgroundColor: 'var(--portal-primary)' }}
                >
                  {placeOrderMutation.isPending ? (
                    'Placing Order...'
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}