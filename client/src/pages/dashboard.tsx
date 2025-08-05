import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/language-context";
import { translations, translateStatus } from "@/lib/translations";
import { debounce, animationClasses } from "@/lib/performance";
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
  User,
  LogOut,
  Package
} from "lucide-react";
import { OrderDetailsModal } from "@/components/order-details-modal";
import { LanguageSwitcher } from "@/components/language-switcher";
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
    totalPaid: string;
    totalUnpaid: string;
  };
}

// Extracted components for better maintainability
interface AccountOverviewCardsProps {
  metrics: {
    totalOrders: number;
    pendingInvoices: number;
    pendingAmount: string;
    accountBalance: string;
    totalPaid: string;
    totalUnpaid: string;
  };
  formatCurrency: (amount: string) => string;
  t: any;
}

const AccountOverviewCards = ({ metrics, formatCurrency, t }: AccountOverviewCardsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <Card className="portal-card border-portal">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Wallet className="text-blue-600 text-lg" />
          </div>
          <Badge className="bg-green-100 text-green-800">{t.active}</Badge>
        </div>
        <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--portal-accent)' }}>
          {t.accountBalance}
        </h3>
        <p className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
          {formatCurrency(metrics.accountBalance)}
        </p>
      </CardContent>
    </Card>
    <Card className="portal-card border-portal">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <ShoppingCart style={{ color: 'var(--portal-primary)' }} className="text-lg" />
          </div>
        </div>
        <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--portal-accent)' }}>
          {t.totalOrders}
        </h3>
        <p className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
          {metrics.totalOrders}
        </p>
      </CardContent>
    </Card>
    <Card className="portal-card border-portal">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <FileText className="text-yellow-600 text-lg" />
          </div>
          {metrics.pendingInvoices > 0 && (
            <Badge className="bg-yellow-100 text-yellow-600">
              {metrics.pendingInvoices} {t.pending}
            </Badge>
          )}
        </div>
        <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--portal-accent)' }}>
          {t.totalUnpaid}
        </h3>
        <p className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
          {formatCurrency(metrics.totalUnpaid)}
        </p>
      </CardContent>
    </Card>
    <Card className="portal-card border-portal">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
            <CreditCard style={{ color: 'var(--portal-secondary)' }} className="text-lg" />
          </div>
        </div>
        <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--portal-accent)' }}>
          {t.totalPaid}
        </h3>
        <p className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
          {formatCurrency(metrics.totalPaid)}
        </p>
      </CardContent>
    </Card>
  </div>
);

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { language } = useLanguage();
  const t = translations[language].dashboard;

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customer/dashboard");
      return response.json();
    },
    retry: false,
  });

  // Memoized functions - must be called before any conditional returns
  const getStatusColor = useMemo(() => {
    const statusColors = {
      delivered: 'bg-green-100 text-green-800',
      paid: 'bg-green-100 text-green-800',
      'in transit': 'bg-blue-100 text-blue-800',
      processing: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (status: string) => statusColors[status.toLowerCase() as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  }, []);

  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    });
    return (amount: string) => formatter.format(parseFloat(amount));
  }, []);

  const formatDate = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return (date: string | Date) => formatter.format(new Date(date));
  }, []);

  const handleOrderClick = useCallback(async (order: Order) => {
    const response = await apiRequest("GET", `/api/customer/orders/${order.orderNumber}`);
    const data = await response.json();
    setSelectedOrder(data);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  }, []);

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
        title: t.logoutError,
        description: t.failedToLogoutProperly,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error) {
      console.error('Dashboard error:', error);
      toast({
        title: t.error,
        description: t.failedToLoadDashboardData,
        variant: "destructive",
      });
    }
  }, [error, toast]);

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
                  {t.customerPortal}
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
                {t.customerPortal}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                  {customer?.name || t.loadingEllipsis}
                </p>
                <p className="text-xs" style={{ color: 'var(--portal-accent)' }}>
                  {customer?.id || ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/profile")}
                className="transition-colors duration-150 ease-out"
                style={{ color: 'var(--portal-accent)' }}
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="transition-colors duration-150 ease-out"
                style={{ color: 'var(--portal-accent)' }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--portal-text)' }}>
            {t.welcome}, {customer?.name || 'Guest'}
          </h2>
          <p style={{ color: 'var(--portal-accent)' }}>
            {t.description}
          </p>
        </div>

        {/* Account Overview Cards */}
        {metrics && <AccountOverviewCards metrics={metrics} formatCurrency={formatCurrency} t={t} />}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card className="portal-card border-portal">
              <CardHeader className="border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <CardTitle style={{ color: 'var(--portal-text)' }}>{t.recentOrders}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-sm font-medium transition-colors duration-150 ease-out"
                    style={{ color: 'var(--portal-primary)' }}
                    onClick={() => setLocation("/orders")}
                  >
                    {t.viewAll}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {!recentOrders || recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--portal-accent)' }} />
                    <p style={{ color: 'var(--portal-accent)' }}>{t.noOrdersFound}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders?.map((order) => (
                      <div key={order.id} className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:shadow-md transition-optimized ${animationClasses.fadeIn}`} onClick={() => handleOrderClick(order)} style={{ animationDelay: `${order.id * 50}ms` }}>
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
                            {translateStatus(order.status, language)}
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
                <CardTitle style={{ color: 'var(--portal-text)' }}>{t.accountDetails}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>{t.customerId}</p>
                  <p style={{ color: 'var(--portal-text)' }}>{customer?.id || ''}</p>
                </div>
                {customer?.company && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>{t.company}</p>
                    <p style={{ color: 'var(--portal-text)' }}>{customer.company}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>{t.contactPerson}</p>
                  <p style={{ color: 'var(--portal-text)' }}>{customer?.name || ''}</p>
                </div>
                {customer?.email && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>{t.email}</p>
                    <p style={{ color: 'var(--portal-text)' }}>{customer.email}</p>
                  </div>
                )}
                {customer?.phone && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>{t.phone}</p>
                    <p style={{ color: 'var(--portal-text)' }}>{customer.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card className="portal-card border-portal">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle style={{ color: 'var(--portal-text)' }}>{t.recentInvoices}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-sm font-medium transition-colors duration-150 ease-out"
                    style={{ color: 'var(--portal-primary)' }}
                    onClick={() => setLocation("/invoices")}
                  >
                    {t.viewAll}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!recentInvoices || recentInvoices.length === 0 ? (
                  <div className="text-center py-4">
                    <FileText className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--portal-accent)' }} />
                    <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>{t.noInvoicesFound}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentInvoices?.map((invoice) => (
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
                            {translateStatus(invoice.status, language)}
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
            <CardTitle style={{ color: 'var(--portal-text)' }}>{t.quickActions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="flex items-center justify-center space-x-2 p-4 h-auto">
                <Download style={{ color: 'var(--portal-primary)' }} className="h-4 w-4" />
                <span className="text-sm font-medium">{t.downloadStatement}</span>
              </Button>
              
              <Button variant="outline" className="flex items-center justify-center space-x-2 p-4 h-auto">
                <History style={{ color: 'var(--portal-primary)' }} className="h-4 w-4" />
                <span className="text-sm font-medium">{t.paymentHistory}</span>
              </Button>
              
              <Button variant="outline" className="flex items-center justify-center space-x-2 p-4 h-auto">
                <Headphones style={{ color: 'var(--portal-primary)' }} className="h-4 w-4" />
                <span className="text-sm font-medium">{t.contactSupport}</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center space-x-2 p-4 h-auto"
                onClick={() => setLocation("/products")}
              >
                <Package style={{ color: 'var(--portal-primary)' }} className="h-4 w-4" />
                <span className="text-sm font-medium">{t.browseProducts}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}