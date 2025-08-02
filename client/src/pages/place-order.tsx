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
  ImageIcon
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

  const filteredProducts = products?.filter(product =>
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.itemCode.toLowerCase().includes(searchQuery.toLowerCase())) &&
    parseFloat(product.price) > 0
  ) || [];

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
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full">
                  <Card className="portal-card border-portal">
                    <CardContent className="pt-6 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                      <p className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                        No products found
                      </p>
                      <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                        {searchQuery ? 'Try a different search term' : 'No products available at the moment'}
                      </p>
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
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg border"
                                onError={(e) => {
                                  // Fallback to placeholder if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center ${product.image ? 'hidden' : 'flex'}`}
                              style={{ color: 'var(--portal-accent)' }}
                            >
                              <ImageIcon className="h-8 w-8 opacity-50" />
                            </div>
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