import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { 
  Building, 
  Wallet, 
  ShoppingCart, 
  FileText, 
  CreditCard,
  Download,
  History,
  Headphones,
  UserCog,
  LogOut,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import type { Customer, Order, Invoice } from "@shared/schema";

interface DashboardData {
  customer: Customer;
  recentOrders: Order[];
  recentInvoices: Invoice[];
  metrics: {
    totalOrders: number;
    pendingInvoices: number;
    pendingAmount: string;
    accountBalance: string;
    creditLimit: string;
  };
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/customer/dashboard"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Logout Error",
        description: "Failed to logout properly",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error) {
      setLocation("/");
    }
  }, [error, setLocation]);

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--portal-background)' }}>
        <header className="portal-card border-b sticky top-0 z-40" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--portal-primary)' }}>
                  <Building className="text-white text-lg" />
                </div>
                <h1 className="text-xl font-semibold" style={{ color: 'var(--portal-text)' }}>
                  Customer Portal
                </h1>
              </div>
            </div>
          </div>
        </header>
        <DashboardSkeleton />
      </div>
    );
  }

  const { customer, recentOrders, recentInvoices, metrics } = dashboardData;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'paid':
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
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--portal-primary)' }}>
                <Building className="text-white text-lg" />
              </div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--portal-text)' }}>
                Customer Portal
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                  {customer.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--portal-accent)' }}>
                  {customer.id}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="transition duration-200"
                style={{ color: 'var(--portal-accent)' }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--portal-text)' }}>
            Welcome back, {customer.name}
          </h2>
          <p style={{ color: 'var(--portal-accent)' }}>
            Here's an overview of your account and recent activity.
          </p>
        </div>

        {/* Account Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Account Balance */}
          <Card className="portal-card border-portal">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Wallet className="text-blue-600 text-lg" />
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--portal-accent)' }}>
                Account Balance
              </h3>
              <p className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
                {formatCurrency(metrics.accountBalance)}
              </p>
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className="portal-card border-portal">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart style={{ color: 'var(--portal-primary)' }} className="text-lg" />
                </div>
              </div>
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--portal-accent)' }}>
                Total Orders
              </h3>
              <p className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
                {metrics.totalOrders}
              </p>
            </CardContent>
          </Card>

          {/* Pending Invoices */}
          <Card className="portal-card border-portal">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-yellow-600 text-lg" />
                </div>
                {metrics.pendingInvoices > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-600">
                    {metrics.pendingInvoices} Pending
                  </Badge>
                )}
              </div>
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--portal-accent)' }}>
                Pending Invoices
              </h3>
              <p className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
                {formatCurrency(metrics.pendingAmount)}
              </p>
            </CardContent>
          </Card>

          {/* Credit Limit */}
          <Card className="portal-card border-portal">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard style={{ color: 'var(--portal-secondary)' }} className="text-lg" />
                </div>
              </div>
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--portal-accent)' }}>
                Credit Limit
              </h3>
              <p className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
                {formatCurrency(metrics.creditLimit)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card className="portal-card border-portal">
              <CardHeader className="border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <CardTitle style={{ color: 'var(--portal-text)' }}>Recent Orders</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-sm font-medium transition duration-200"
                    style={{ color: 'var(--portal-primary)' }}
                    onClick={() => setLocation("/orders")}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--portal-accent)' }} />
                    <p style={{ color: 'var(--portal-accent)' }}>No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--portal-primary)' }}>
                            <Package className="text-white text-sm" />
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--portal-text)' }}>
                              {order.orderNumber}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                              {formatDate(order.orderDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold" style={{ color: 'var(--portal-text)' }}>
                            {formatCurrency(order.amount)}
                          </p>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Details */}
            <Card className="portal-card border-portal">
              <CardHeader>
                <CardTitle style={{ color: 'var(--portal-text)' }}>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>Customer ID</p>
                  <p style={{ color: 'var(--portal-text)' }}>{customer.id}</p>
                </div>
                {customer.company && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>Company</p>
                    <p style={{ color: 'var(--portal-text)' }}>{customer.company}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>Contact Person</p>
                  <p style={{ color: 'var(--portal-text)' }}>{customer.name}</p>
                </div>
                {customer.email && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>Email</p>
                    <p style={{ color: 'var(--portal-text)' }}>{customer.email}</p>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>Phone</p>
                    <p style={{ color: 'var(--portal-text)' }}>{customer.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card className="portal-card border-portal">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle style={{ color: 'var(--portal-text)' }}>Recent Invoices</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-sm font-medium transition duration-200"
                    style={{ color: 'var(--portal-primary)' }}
                    onClick={() => setLocation("/invoices")}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentInvoices.length === 0 ? (
                  <div className="text-center py-4">
                    <FileText className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--portal-accent)' }} />
                    <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>No invoices found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--portal-text)' }}>
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--portal-accent)' }}>
                            {formatDate(invoice.invoiceDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>
                            {formatCurrency(invoice.amount)}
                          </p>
                          <Badge className={`text-xs ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8 portal-card border-portal">
          <CardHeader>
            <CardTitle style={{ color: 'var(--portal-text)' }}>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="flex items-center justify-center space-x-2 p-4 h-auto">
                <Download style={{ color: 'var(--portal-primary)' }} className="h-4 w-4" />
                <span className="text-sm font-medium">Download Statement</span>
              </Button>
              
              <Button variant="outline" className="flex items-center justify-center space-x-2 p-4 h-auto">
                <History style={{ color: 'var(--portal-primary)' }} className="h-4 w-4" />
                <span className="text-sm font-medium">Payment History</span>
              </Button>
              
              <Button variant="outline" className="flex items-center justify-center space-x-2 p-4 h-auto">
                <Headphones style={{ color: 'var(--portal-primary)' }} className="h-4 w-4" />
                <span className="text-sm font-medium">Contact Support</span>
              </Button>
              
              <Button variant="outline" className="flex items-center justify-center space-x-2 p-4 h-auto">
                <UserCog style={{ color: 'var(--portal-primary)' }} className="h-4 w-4" />
                <span className="text-sm font-medium">Update Profile</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
