import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { User, MapPin, Phone, Mail, Building2, Globe, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

interface Customer {
  id: string;
  name: string;
  balance: string;
  status: string;
  lastLogin: string;
  primaryAddress?: string;
  customerType?: string;
  defaultCurrency?: string;
  language?: string;
}

interface ProfileData {
  customer: Customer;
}

// Helper function to parse address information
function parseAddress(primaryAddress: any) {
  if (!primaryAddress) return null;

  // If it's an object from ERPNext Address API
  if (typeof primaryAddress === 'object') {
    const addressParts = [
      primaryAddress.address_line1,
      primaryAddress.address_line2,
      primaryAddress.city,
      primaryAddress.state,
      primaryAddress.country,
      primaryAddress.pincode
    ].filter(Boolean);

    return {
      address: addressParts.length > 0 ? addressParts.join(', ') : null,
      phone: primaryAddress.phone || null,
      email: primaryAddress.email_id || null
    };
  }

  // Fallback for string format
  if (typeof primaryAddress === 'string') {
    const phoneMatch = primaryAddress.match(/Phone:\s*([+\d\s-]+)/);
    const emailMatch = primaryAddress.match(/Email:\s*([^\s,]+)/);
    
    let cleanAddress = primaryAddress
      .replace(/,\s*Phone:[^,]+/g, '')
      .replace(/,\s*Email:[^,]+/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/, '')
      .trim();
    
    return {
      address: cleanAddress,
      phone: phoneMatch ? phoneMatch[1].trim() : null,
      email: emailMatch ? emailMatch[1].trim() : null
    };
  }

  return null;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery<ProfileData>({
    queryKey: ['/api/customer/profile'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Unable to load profile information</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer } = data!;
  const addressInfo = parseAddress(customer?.primary_address || customer?.primaryAddress);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User style={{ color: 'var(--portal-primary)' }} className="text-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
                Customer Profile
              </h1>
              <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                Account information and contact details
              </p>
            </div>
          </div>
          
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card className="portal-card border-portal">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                <Building2 className="h-5 w-5" style={{ color: 'var(--portal-primary)' }} />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
                  Customer ID
                </label>
                <p className="text-base" style={{ color: 'var(--portal-text)' }}>
                  {customer.id}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
                  Company Name
                </label>
                <p className="text-base" style={{ color: 'var(--portal-text)' }}>
                  {customer.name}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
                  Account Status
                </label>
                <div className="mt-1">
                  <Badge 
                    variant={customer.status === 'Active' ? 'default' : 'secondary'}
                    className={customer.status === 'Active' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {customer.status}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
                  Default Currency
                </label>
                <p className="text-base" style={{ color: 'var(--portal-text)' }}>
                  {customer.defaultCurrency || 'MAD'} - Moroccan Dirham
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="portal-card border-portal">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                <MapPin className="h-5 w-5" style={{ color: 'var(--portal-primary)' }} />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {addressInfo?.address && (
                <>
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
                      Primary Address
                    </label>
                    <p className="text-base leading-relaxed" style={{ color: 'var(--portal-text)' }}>
                      {addressInfo.address}
                    </p>
                  </div>
                  
                  <Separator />
                </>
              )}
              
              {addressInfo?.phone && (
                <>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--portal-accent)' }}>
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </label>
                    <p className="text-base" style={{ color: 'var(--portal-text)' }}>
                      {addressInfo.phone}
                    </p>
                  </div>
                  
                  <Separator />
                </>
              )}
              
              {addressInfo?.email && (
                <div>
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--portal-accent)' }}>
                    <Mail className="h-4 w-4" />
                    Email Address
                  </label>
                  <p className="text-base" style={{ color: 'var(--portal-text)' }}>
                    {addressInfo.email}
                  </p>
                </div>
              )}
              
              {!addressInfo && (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" style={{ color: 'var(--portal-accent)' }} />
                  <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                    No contact information available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Activity */}
        <Card className="portal-card border-portal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
              <Globe className="h-5 w-5" style={{ color: 'var(--portal-primary)' }} />
              Account Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
                  Last Login
                </label>
                <p className="text-base" style={{ color: 'var(--portal-text)' }}>
                  {new Date(customer.lastLogin).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
                  Language Preference
                </label>
                <p className="text-base" style={{ color: 'var(--portal-text)' }}>
                  {customer.language === 'ar' ? 'العربية (Arabic)' : customer.language || 'Not specified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}