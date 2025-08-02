import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowLeft, Package, Calendar, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import type { Order } from "@shared/schema";

export default function Orders() {
  const [, setLocation] = useLocation();

  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ["/api/customer/orders"],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      setLocation("/");
    }
  }, [error, setLocation]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!orders) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in transit':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(parseFloat(amount));
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
            <h1 className="text-xl font-semibold" style={{ color: 'var(--portal-text)' }}>
              All Orders
            </h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="portal-card border-portal">
          <CardHeader>
            <CardTitle style={{ color: 'var(--portal-text)' }}>
              Order History ({orders.length} orders)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-16 w-16 mb-4" style={{ color: 'var(--portal-accent)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                  No orders found
                </h3>
                <p style={{ color: 'var(--portal-accent)' }}>
                  You haven't placed any orders yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--portal-primary)' }}>
                          <Package className="text-white text-lg" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg" style={{ color: 'var(--portal-text)' }}>
                            {order.orderNumber}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" style={{ color: 'var(--portal-accent)' }} />
                              <span className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                                {formatDate(order.orderDate)}
                              </span>
                            </div>
                            {order.deliveryDate && (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                                  Delivery: {formatDate(order.deliveryDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          <Banknote className="h-4 w-4" style={{ color: 'var(--portal-secondary)' }} />
                          <span className="text-xl font-bold" style={{ color: 'var(--portal-text)' }}>
                            {formatCurrency(order.amount)}
                          </span>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}