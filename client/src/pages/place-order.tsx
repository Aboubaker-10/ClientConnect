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
  Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      setLocation("/dashboard");
    }
  }, [error, setLocation]);

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.itemCode.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
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
      const existing = prev.find(item => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const getCartQuantity = (productId: string) => {
    return cart.find(item => item.id === productId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--portal-background)' }}>
      {/* Header */}
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
            </div>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--portal-text)' }}>
                Place Order
              </h1>
            </div>

            {/* Cart Summary */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" style={{ color: 'var(--portal-accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                  {cart.length} items
                </span>
                {cartTotal > 0 && (
                  <Badge variant="secondary">
                    {formatCurrency(cartTotal)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search */}
            <Card className="portal-card border-portal">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--portal-accent)' }} />
                  <Input
                    placeholder="Search products by name or item code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.length === 0 ? (
                <div className="lg:col-span-3 text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                  <p className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                    {searchQuery ? 'No products found' : 'No products available'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                    {searchQuery ? 'Try adjusting your search terms' : 'Products will appear here when available'}
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const cartQuantity = getCartQuantity(product.id);
                  return (
                    <Card key={product.id} className="portal-card border-portal">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
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
                              {product.stockQuantity !== undefined && (
                                <p className="text-xs" style={{ color: 'var(--portal-accent)' }}>
                                  Stock: {product.stockQuantity}
                                </p>
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
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <Card className="portal-card border-portal sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                    <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                      Your cart is empty
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-start space-x-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--portal-text)' }}>
                              {item.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--portal-accent)' }}>
                              {item.quantity} × {formatCurrency(item.price)}
                            </p>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}