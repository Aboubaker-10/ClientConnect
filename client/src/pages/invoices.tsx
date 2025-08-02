import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowLeft, FileText, Calendar, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import type { Invoice } from "@shared/schema";

export default function Invoices() {
  const [, setLocation] = useLocation();

  const { data: invoices, isLoading, error } = useQuery<Invoice[]>({
    queryKey: ["/api/customer/invoices"],
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

  if (!invoices) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate: string | Date | null, status: string) => {
    if (!dueDate || status.toLowerCase() === 'paid') return false;
    return new Date(dueDate) < new Date();
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
              All Invoices
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
              Invoice History ({invoices.length} invoices)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 mb-4" style={{ color: 'var(--portal-accent)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--portal-text)' }}>
                  No invoices found
                </h3>
                <p style={{ color: 'var(--portal-accent)' }}>
                  You don't have any invoices yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--portal-primary)' }}>
                          <FileText className="text-white text-lg" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg" style={{ color: 'var(--portal-text)' }}>
                            {invoice.invoiceNumber}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" style={{ color: 'var(--portal-accent)' }} />
                              <span className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                                Issued: {formatDate(invoice.invoiceDate)}
                              </span>
                            </div>
                            {invoice.dueDate && (
                              <div className="flex items-center space-x-1">
                                <Clock className={`h-4 w-4 ${isOverdue(invoice.dueDate, invoice.status) ? 'text-red-500' : ''}`} 
                                      style={{ color: isOverdue(invoice.dueDate, invoice.status) ? 'red' : 'var(--portal-accent)' }} />
                                <span className={`text-sm ${isOverdue(invoice.dueDate, invoice.status) ? 'text-red-500' : ''}`}
                                      style={{ color: isOverdue(invoice.dueDate, invoice.status) ? 'red' : 'var(--portal-accent)' }}>
                                  Due: {formatDate(invoice.dueDate)}
                                </span>
                              </div>
                            )}
                            {invoice.paidDate && (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm text-green-600">
                                  Paid: {formatDate(invoice.paidDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="h-4 w-4" style={{ color: 'var(--portal-secondary)' }} />
                          <span className="text-xl font-bold" style={{ color: 'var(--portal-text)' }}>
                            {formatCurrency(invoice.amount)}
                          </span>
                        </div>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
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