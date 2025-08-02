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

      return {
        id: customerData.name,
        name: customerData.customer_name,
        company: customerData.customer_group,
        email: customerData.email_id,
        phone: customerData.mobile_no,
        balance: customerData.outstanding_amount || '0.00',
        creditLimit: customerData.credit_limit || '0.00',
        status: customerData.disabled ? 'Inactive' : 'Active',
        lastLogin: null,
      };
    } catch (error) {
      console.error('Error fetching customer from ERPNext:', error);
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

      // Only add limit if it's greater than 0 (for recent orders)
      if (limit > 0) {
        params.limit_page_length = limit;
      }

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
      console.error('Error fetching orders from ERPNext:', error);
      console.error('Error details:', error.response ? error.response.data : error.message);
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

      // Only add limit if it's greater than 0 (for recent invoices)
      if (limit > 0) {
        params.limit_page_length = limit;
      }

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
      console.error('Error fetching invoices from ERPNext:', error);
      console.error('Error details:', error.response ? error.response.data : error.message);
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
}

export const erpNextService = new ERPNextService();
