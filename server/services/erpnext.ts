import axios, { AxiosInstance } from 'axios';
import { Customer, Order, Invoice } from '@shared/schema';

export class ERPNextService {
  private api: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    let baseUrl = process.env.ERPNEXT_URL || process.env.ERPNEXT_BASE_URL || '';
    this.apiKey = process.env.ERPNEXT_API_KEY || process.env.API_KEY || '';
    this.apiSecret = process.env.ERPNEXT_API_SECRET || process.env.API_SECRET || '';

    // Ensure URL has protocol
    if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    this.baseUrl = baseUrl;

    if (!this.baseUrl || !this.apiKey || !this.apiSecret) {
      console.warn('ERPNext credentials not configured. Using fallback mode.');
    }

    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    try {
      if (!this.baseUrl) {
        throw new Error('ERPNext URL not configured');
      }

      const response = await this.api.get(`/api/resource/Customer/${customerId}`);
      const customerData = response.data.data;
      


      // Get primary address using ERPNext standard method
      let primaryAddress = null;
      
      try {
        // Get customer with address fields
        const customerWithAddress = await this.api.get(`/api/resource/Customer/${customerId}`, {
          params: {
            fields: '["name","customer_name","customer_group","email_id","mobile_no","outstanding_amount","credit_limit","disabled","customer_primary_address","primary_address"]'
          }
        });
        
        const customerAddr = customerWithAddress.data.data;
        
        // Check if primary_address field exists (formatted address string)
        if (customerAddr.primary_address) {
          primaryAddress = customerAddr.primary_address;
        }
        // Fallback: get address using customer_primary_address
        else if (customerAddr.customer_primary_address) {
          const addressResponse = await this.api.get(`/api/resource/Address/${customerAddr.customer_primary_address}`);
          const addr = addressResponse.data.data;
          
          // Format address as string like ERPNext does
          const addressParts = [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean);
          let formattedAddress = addressParts.join(', ');
          
          if (addr.phone) formattedAddress += `, Phone: ${addr.phone}`;
          if (addr.email_id) formattedAddress += ` Email: ${addr.email_id}`;
          
          primaryAddress = formattedAddress;
        }
      } catch (addressError) {
        console.error('Could not fetch address:', this.sanitizeLogInput(String(addressError?.message || 'Unknown error')));
      }

      console.log('Final primary address:', primaryAddress);

      return {
        id: customerData.name,
        name: customerData.customer_name,
        company: customerData.customer_group,
        email: customerData.email_id || primaryAddress?.email_id,
        phone: customerData.mobile_no || primaryAddress?.phone,
        balance: customerData.outstanding_amount || '0.00',
        creditLimit: customerData.credit_limit || '0.00',
        status: customerData.disabled ? 'Inactive' : 'Active',
        lastLogin: null,
        primary_address: primaryAddress,
      };
    } catch (error) {
      console.error('Error fetching customer from ERPNext:', error);
      return null;
    }
  }

  async getCustomerOrder(orderId: string): Promise<Order | null> {
    try {
      if (!this.baseUrl) {
        throw new Error('ERPNext URL not configured');
      }

      const response = await this.api.get(`/api/resource/Sales Order/${orderId}`);
      const orderData = response.data.data;

      if (!orderData) {
        return null;
      }

      return {
        id: orderData.name,
        customerId: orderData.customer,
        orderNumber: orderData.name,
        amount: orderData.grand_total ? orderData.grand_total.toString() : '0.00',
        status: this.mapOrderStatus(orderData.status),
        orderDate: new Date(orderData.transaction_date),
        deliveryDate: orderData.delivery_date ? new Date(orderData.delivery_date) : null,
        items: orderData.items.map((item: any) => ({
          id: item.item_code,
          name: item.item_name,
          quantity: item.qty,
          price: item.rate,
          amount: item.amount,
        })),
      };
    } catch (error) {
      console.error('Error fetching order from ERPNext:', error);
      return null;
    }
  }

  async getCustomerOrders(customerId: string, limit: number = 0): Promise<Order[]> {
    try {
      if (!this.baseUrl) {
        throw new Error('ERPNext URL not configured');
      }

      const params: any = {
        filters: `[["customer","=","${customerId}"]]`,
        fields: `["name","grand_total","status","transaction_date","delivery_date","customer"]`,
        order_by: 'creation desc',
      };

      params.limit_page_length = limit;

      const response = await this.api.get('/api/resource/Sales Order', { params });

      if (!response.data.data || !Array.isArray(response.data.data)) {
        return [];
      }

      return response.data.data.map((order: any) => ({
        id: order.name,
        customerId,
        orderNumber: order.name,
        amount: order.grand_total ? order.grand_total.toString() : '0.00',
        status: this.mapOrderStatus(order.status),
        orderDate: new Date(order.transaction_date),
        deliveryDate: order.delivery_date ? new Date(order.delivery_date) : null,
        items: null,
      }));
    } catch (error) {
      console.error('Error fetching orders from ERPNext:', this.sanitizeLogInput(String(error?.message || 'Unknown error')));
      console.error('Error details:', error?.response ? this.sanitizeLogInput(JSON.stringify(error.response.data)) : this.sanitizeLogInput(String(error?.message || 'Unknown error')));
      return [];
    }
  }

  async getCustomerInvoices(customerId: string, limit: number = 0): Promise<Invoice[]> {
    try {
      if (!this.baseUrl) {
        throw new Error('ERPNext URL not configured');
      }

      const params: any = {
        filters: `[["customer","=","${customerId}"]]`,
        fields: `["name","grand_total","status","posting_date","due_date","customer"]`,
        order_by: 'creation desc',
      };

      params.limit_page_length = limit;

      const response = await this.api.get('/api/resource/Sales Invoice', { params });

      if (!response.data.data || !Array.isArray(response.data.data)) {
        return [];
      }

      return response.data.data.map((invoice: any) => ({
        id: invoice.name,
        customerId,
        invoiceNumber: invoice.name,
        amount: invoice.grand_total ? invoice.grand_total.toString() : '0.00',
        status: this.mapInvoiceStatus(invoice.status),
        invoiceDate: new Date(invoice.posting_date),
        dueDate: invoice.due_date ? new Date(invoice.due_date) : null,
        paidDate: invoice.status === 'Paid' ? new Date(invoice.posting_date) : null,
      }));
    } catch (error) {
      console.error('Error fetching invoices from ERPNext:', this.sanitizeLogInput(String(error?.message || 'Unknown error')));
      console.error('Error details:', error?.response ? this.sanitizeLogInput(JSON.stringify(error.response.data)) : this.sanitizeLogInput(String(error?.message || 'Unknown error')));
      return [];
    }
  }

  async getBrands(): Promise<string[]> {
    try {
      if (!this.baseUrl) {
        throw new Error('ERPNext URL not configured');
      }

      const response = await this.api.get('/api/resource/Brand', {
        params: {
          fields: '["name"]',
          limit_page_length: 0
        }
      });

      return response.data?.data.map((brand: any) => brand.name) || [];
    } catch (error) {
      console.error('Error fetching brands from ERPNext:', this.sanitizeLogInput(String(error?.message || 'Unknown error')));
      return [];
    }
  }

  async getItems(): Promise<any[]> {
    try {
      if (!this.baseUrl) {
        throw new Error('ERPNext URL not configured');
      }

      const response = await this.api.get('/api/resource/Item', {
        params: {
          fields: '["name","item_code","item_name","description","standard_rate","item_group","image","brand"]',
          filters: '[["disabled","=",0],["is_sales_item","=",1]]',
          limit_page_length: 0  // 0 means no limit - get all items
        }
      });

      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching items from ERPNext:', this.sanitizeLogInput(String(error?.message || 'Unknown error')));
      console.error('Error details:', error?.response ? this.sanitizeLogInput(JSON.stringify(error.response.data)) : this.sanitizeLogInput(String(error?.message || 'Unknown error')));
      return [];
    }
  }

  private mapOrderStatus(erpStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'Draft': 'Draft',
      'To Deliver and Bill': 'Processing',
      'To Bill': 'Processing',
      'To Deliver': 'In Transit',
      'Completed': 'Delivered',
      'Cancelled': 'Cancelled',
    };
    return statusMap[erpStatus] || erpStatus;
  }

  private mapInvoiceStatus(erpStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'Draft': 'Draft',
      'Submitted': 'Pending',
      'Paid': 'Paid',
      'Unpaid': 'Pending',
      'Overdue': 'Overdue',
      'Cancelled': 'Cancelled',
    };
    return statusMap[erpStatus] || erpStatus;
  }

  private sanitizeLogInput(input: string): string {
    return input.replace(/[\r\n\t]/g, ' ').replace(/[\x00-\x1f\x7f-\x9f]/g, '');
  }
}

export const erpNextService = new ERPNextService();
