import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { translations } from "@/lib/translations";
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
  Check,
  SlidersHorizontal,
  Grid3X3,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { aiSearch, initializeAISearch } from "@/lib/ai-search";

interface Product {
  id: string;
  name: string;
  itemCode: string;
  description?: string;
  price: string;
  currency: string;
  stockQuantity?: number;
  category?: string;
  brand?: string;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function PlaceOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [filters, setFilters] = useState({ categories: [], brands: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { language } = useLanguage();
  const t = translations[language].dashboard;

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products");
      return response.json();
    },
    retry: false,
  });

  const { data: brandsData } = useQuery<string[]>({
    queryKey: ["brands"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/brands");
      return response.json();
    },
    retry: false,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: { items: CartItem[]; total: number }) => {
      const response = await apiRequest("POST", "/api/orders/create", orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.orderPlacedSuccessfully,
        description: t.orderSubmittedAndProcessing,
      });
      setCart([]);
      setShowCartModal(false);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setLocation("/orders");
    },
    onError: (error: Error) => {
      toast({
        title: t.orderFailed,
        description: error.message || t.failedToPlaceOrder,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error) {
      console.error('Products fetch error:', error);
      toast({
        title: t.connectionError,
        description: t.unableToLoadProductsCheckConnection,
        variant: "destructive",
      });
    }
  }, [error]);

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [noResultsMessage, setNoResultsMessage] = useState(undefined);
  const [aiSearchStatus, setAiSearchStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'

  // Initialize Ollama AI search
  useEffect(() => {
    console.log('🤖 Initializing Ollama AI Search...');
    console.log('🔑 Mode: 100% Free Local AI');
    initializeAISearch();
  }, []);

  // Handle search and filtering with debouncing
  useEffect(() => {
    const performSearch = async () => {
      if (!products) {
        setFilteredProducts([]);
        setCategories([]);
        setBrands([]);
        setSearchResults([]);
        setSuggestions([]);
        setNoResultsMessage(undefined);
        setAiSearchStatus('idle');
        return;
      }
      
      if (searchQuery.trim()) {
        setAiSearchStatus('loading');
      }

      const productCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
      const productBrands = brandsData || [];

      // Apply filters first
      const filteredByFilters = products.filter(product => {
        const categoryMatch = filters.categories.length === 0 || filters.categories.includes(product.category);
        const brandMatch = filters.brands.length === 0 || filters.brands.includes(product.brand);
        return parseFloat(product.price) > 0 && categoryMatch && brandMatch;
      });

      // Apply AI search
      try {
        console.log('🔍 AI Search Query:', searchQuery);
        const searchResult = await aiSearch(searchQuery, filteredByFilters, t);
        console.log('🤖 AI Search Results:', {
          totalResults: searchResult.results.length,
          suggestions: searchResult.suggestions.length,
          hasMessage: !!searchResult.noResultsMessage,
          sampleResults: searchResult.results.slice(0, 3).map(r => ({
            name: r.product.name,
            score: r.score,
            matchType: r.matchType,
            reason: r.reason
          }))
        });
        
        setFilteredProducts(searchResult.results.map(r => r.product));
        setCategories(productCategories);
        setBrands(productBrands);
        setSearchResults(searchResult.results);
        setSuggestions(searchResult.suggestions);
        setNoResultsMessage(searchResult.noResultsMessage);
        setAiSearchStatus(searchQuery.trim() ? 'success' : 'idle');
      } catch (error) {
        console.error('Search error:', error);
        setAiSearchStatus('error');
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(performSearch, searchQuery.trim() ? 500 : 0);
    return () => clearTimeout(timeoutId);
  }, [products, searchQuery, filters, brandsData, t]);

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

  // Clean product text for better display without removing content
  const cleanProductText = (text: string, itemCode: string) => {
    if (!text) return text;
    
    let cleaned = text;
    
    // Remove itemCode if it appears at the beginning and is immediately followed by text
    const itemCodePattern = new RegExp(`^${itemCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[A-Za-z])`, 'i');
    cleaned = cleaned.replace(itemCodePattern, '');
    
    // Add space between itemCode and following text if they're stuck together
    const itemCodeStuckPattern = new RegExp(`(${itemCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([A-Za-z])`, 'gi');
    cleaned = cleaned.replace(itemCodeStuckPattern, '$1 $2');
    
    // Add spaces around long numbers (6+ digits) that are stuck to letters
    cleaned = cleaned.replace(/([a-zA-Z])(\d{6,})/g, '$1 $2');
    cleaned = cleaned.replace(/(\d{6,})([a-zA-Z])/g, '$1 $2');
    
    // Clean up multiple spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast({
        title: t.cartEmpty,
        description: t.pleaseAddItemsToCart,
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
        {/* Header */}
        <header className="portal-card border-b sticky top-0 z-50" style={{ borderColor: 'var(--border)' }}>
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
                  <span>{t.backToDashboard}</span>
                </Button>
                <h1 className="text-xl font-semibold" style={{ color: 'var(--portal-text)' }}>
                  {t.products}
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
                    {t.cart}
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

        {/* Search and Filters Bar */}
        <div className="sticky top-16 z-40 bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              {/* Filters Toggle Button */}
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 flex-shrink-0"
                style={showFilters ? { backgroundColor: 'var(--portal-primary)' } : {}}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t.filters}
                {(filters.categories.length > 0 || filters.brands.length > 0) && (
                  <Badge variant={showFilters ? "secondary" : "default"} className="ml-1">
                    {filters.categories.length + filters.brands.length}
                  </Badge>
                )}
              </Button>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--portal-accent)' }} />
                <Input
                  placeholder={`${t.searchProducts} ${aiSearchStatus === 'success' ? '🤖' : aiSearchStatus === 'loading' ? '⏳' : aiSearchStatus === 'error' ? '⚠️' : ''}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {aiSearchStatus === 'loading' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex items-center gap-2"
                  style={viewMode === 'grid' ? { backgroundColor: 'var(--portal-primary)' } : {}}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex items-center gap-2"
                  style={viewMode === 'list' ? { backgroundColor: 'var(--portal-primary)' } : {}}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Active Filters */}
              {(filters.categories.length > 0 || filters.brands.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {filters.categories.map(category => (
                    <Badge key={category} variant="secondary" className="flex items-center gap-1">
                      {category}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent ml-1"
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            categories: prev.categories.filter(c => c !== category)
                          }));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {filters.brands.map(brand => (
                    <Badge key={brand} variant="secondary" className="flex items-center gap-1">
                      {brand}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent ml-1"
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            brands: prev.brands.filter(b => b !== brand)
                          }));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ categories: [], brands: [] })}
                    className="text-xs px-2 py-1 h-auto text-red-600 hover:text-red-700"
                  >
                    {t.clearAll}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Clean Minimal Filters Sidebar */}
            <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out will-change-auto ${
              showFilters ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
            }`}>
              <div className="sticky top-32 h-[calc(100vh-8rem)]">
                <Card className="portal-card border-portal shadow-lg h-full flex flex-col">
                  <CardHeader className="pb-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                        {t.filters}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="hover:bg-gray-100 rounded-full w-8 h-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1 overflow-y-auto">
                    {/* Categories */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>{t.categories}</h3>
                        {filters.categories.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {filters.categories.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(showAllCategories ? categories : categories.slice(0, 5)).map(category => {
                          const isSelected = filters.categories.includes(category);
                          return (
                            <div 
                              key={category} 
                              className="flex items-center group cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                const newCategories = isSelected
                                  ? filters.categories.filter(c => c !== category)
                                  : [...filters.categories, category];
                                setFilters(prev => ({ ...prev, categories: newCategories }));
                              }}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-gray-300 group-hover:border-blue-400'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span 
                                className={`ml-3 text-sm transition-colors ${
                                  isSelected ? 'text-blue-600 font-medium' : 'text-gray-700 group-hover:text-blue-600'
                                }`}
                              >
                                {category}
                              </span>
                            </div>
                          )
                        })}
                        {categories.length > 5 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllCategories(!showAllCategories)}
                            className="w-full text-xs mt-2 text-blue-600 hover:text-blue-700"
                          >
                            {showAllCategories ? t.showLess : `${t.showMore} ${categories.length - 5}+ ${t.categories}`}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Brands */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>{t.brands}</h3>
                        {filters.brands.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {filters.brands.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(showAllBrands ? brands : brands.slice(0, 5)).map(brand => {
                          const isSelected = filters.brands.includes(brand);
                          return (
                            <div 
                              key={brand} 
                              className="flex items-center group cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                const newBrands = isSelected
                                  ? filters.brands.filter(b => b !== brand)
                                  : [...filters.brands, brand];
                                setFilters(prev => ({ ...prev, brands: newBrands }));
                              }}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-gray-300 group-hover:border-blue-400'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span 
                                className={`ml-3 text-sm transition-colors ${
                                  isSelected ? 'text-blue-600 font-medium' : 'text-gray-700 group-hover:text-blue-600'
                                }`}
                              >
                                {brand}
                              </span>
                            </div>
                          )
                        })}
                        {brands.length > 5 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllBrands(!showAllBrands)}
                            className="w-full text-xs mt-2 text-blue-600 hover:text-blue-700"
                          >
                            {showAllBrands ? t.showLess : `${t.showMore} ${brands.length - 5}+ ${t.brands}`}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Clear All Button */}
                    {(filters.categories.length > 0 || filters.brands.length > 0) && (
                      <div className="pt-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFilters({ categories: [], brands: [] })}
                          className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                        >
                          <X className="h-4 w-4 mr-2" />
                          {t.clearAllFilters}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              <div className="space-y-6">
                {/* Search Results Message */}
                {noResultsMessage && (
                  <Card className="portal-card border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-yellow-800">{noResultsMessage}</p>
                    </CardContent>
                  </Card>
                )}
                
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <Card className="portal-card border-blue-200 bg-blue-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-blue-800">{t.didYouMean}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div>
                            <p className="text-sm font-medium text-blue-900">{suggestion.product.name}</p>
                            <p className="text-xs text-blue-600">{suggestion.reason}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToCart(suggestion.product)}
                            className="text-blue-600 border-blue-300 hover:bg-blue-100"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t.add}
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Products Grid/List */}
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                  : "space-y-4"
                }>
                  {error ? (
                    <div className="col-span-full">
                      <Card className="portal-card border-red-200">
                        <CardContent className="pt-6 text-center">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                          <p className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                            {t.unableToLoadProducts}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                            {t.checkYourConnection}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full">
                      <Card className="portal-card border-portal">
                        <CardContent className="pt-6 text-center">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                          <p className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                            {t.noProductsFound}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                            {searchQuery ? t.tryDifferentSearchTermsOrAdjustFilters : t.noProductsAvailable}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    filteredProducts.map((product) => {
                      const cartQuantity = cart.find(item => item.id === product.id)?.quantity || 0;
                      const searchResult = searchResults.find(r => r.product.id === product.id);
                      const isAlternative = searchResult?.matchType === 'alternative';
                      
                      if (viewMode === 'grid') {
                        return (
                          <Card key={product.id} className={`portal-card hover:shadow-lg transition-all duration-200 ${
                            isAlternative ? 'border-blue-300 bg-blue-50' : 'border-portal'
                          }`}>
                            <CardContent className="p-0">
                              {/* Product Image */}
                              <div className="aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-gray-50">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-contain p-3"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className={`w-full h-full flex items-center justify-center ${product.image ? 'hidden' : 'flex'}`}
                                  style={{ color: 'var(--portal-accent)' }}
                                >
                                  <ImageIcon className="h-12 w-12 opacity-30" />
                                </div>
                              </div>

                              {/* Product Info */}
                              <div className="p-3 space-y-2">
                                <div>
                                  <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--portal-text)' }}>
                                    {cleanProductText(product.name, product.itemCode)}
                                  </h3>
                                  <p className="text-xs font-mono text-gray-500">
                                    {product.itemCode}
                                  </p>
                                  {product.description && (
                                    <p className="text-xs mt-1 text-gray-600">
                                      {cleanProductText(product.description, product.itemCode)}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-base font-bold" style={{ color: 'var(--portal-text)' }}>
                                      {formatCurrency(product.price)}
                                    </p>
                                    {product.category && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {product.category}
                                      </Badge>
                                    )}
                                  </div>

                                  {cartQuantity === 0 ? (
                                    <Button
                                      onClick={() => addToCart(product)}
                                      size="sm"
                                      style={{ backgroundColor: 'var(--portal-primary)' }}
                                      className="text-white hover:opacity-90"
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      {t.add}
                                    </Button>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        onClick={() => removeFromCart(product.id)}
                                        size="sm"
                                        variant="outline"
                                        className="w-8 h-8 p-0"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[2rem] text-center">
                                        {cartQuantity}
                                      </span>
                                      <Button
                                        onClick={() => addToCart(product)}
                                        size="sm"
                                        variant="outline"
                                        className="w-8 h-8 p-0"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      } else {
                        // List View
                        return (
                          <Card key={product.id} className={`portal-card hover:shadow-lg transition-all duration-200 ${
                            isAlternative ? 'border-blue-300 bg-blue-50' : 'border-portal'
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-4">
                                {/* Product Image */}
                                <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                                  {product.image ? (
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-full h-full object-contain p-2"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div 
                                    className={`w-full h-full flex items-center justify-center ${product.image ? 'hidden' : 'flex'}`}
                                    style={{ color: 'var(--portal-accent)' }}
                                  >
                                    <ImageIcon className="h-8 w-8 opacity-30" />
                                  </div>
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--portal-text)' }}>
                                    {cleanProductText(product.name, product.itemCode)}
                                  </h3>
                                  <p className="text-xs font-mono text-gray-500 mb-1">
                                    {product.itemCode}
                                  </p>
                                  {product.description && (
                                    <p className="text-sm text-gray-600">
                                      {cleanProductText(product.description, product.itemCode)}
                                    </p>
                                  )}
                                  {product.category && (
                                    <Badge variant="outline" className="text-xs mt-2">
                                      {product.category}
                                    </Badge>
                                  )}
                                </div>

                                {/* Price and Actions */}
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="text-lg font-bold" style={{ color: 'var(--portal-text)' }}>
                                      {formatCurrency(product.price)}
                                    </p>
                                  </div>

                                  {cartQuantity === 0 ? (
                                    <Button
                                      onClick={() => addToCart(product)}
                                      size="sm"
                                      style={{ backgroundColor: 'var(--portal-primary)' }}
                                      className="text-white hover:opacity-90"
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      {t.add}
                                    </Button>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        onClick={() => removeFromCart(product.id)}
                                        size="sm"
                                        variant="outline"
                                        className="w-8 h-8 p-0"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[2rem] text-center">
                                        {cartQuantity}
                                      </span>
                                      <Button
                                        onClick={() => addToCart(product)}
                                        size="sm"
                                        variant="outline"
                                        className="w-8 h-8 p-0"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }
                    })
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Cart Modal */}
      <Dialog open={showCartModal} onOpenChange={setShowCartModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t.orderSummary}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                  {t.yourCartIsEmpty}
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
                    {t.total}
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
                    t.placingOrder
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 mr-2" />
                      {t.placeOrder}
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