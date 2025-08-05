import { type Customer, type InsertCustomer, type Order, type Invoice, type Session, type InsertSession } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerLastLogin(id: string): Promise<void>;

  // Order methods
  getCustomerOrders(customerId: string, limit?: number): Promise<Order[]>;
  createOrder(order: Order): Promise<Order>;

  // Invoice methods
  getCustomerInvoices(customerId: string, limit?: number): Promise<Invoice[]>;
  createInvoice(invoice: Invoice): Promise<Invoice>;

  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
}

export class MemStorage implements IStorage {
  private readonly customers: Map<string, Customer>;
  private readonly orders: Map<string, Order>;
  private readonly invoices: Map<string, Invoice>;
  private readonly sessions: Map<string, Session>;

  constructor() {
    this.customers = new Map();
    this.orders = new Map();
    this.invoices = new Map();
    this.sessions = new Map();
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const customer: Customer = { 
      ...insertCustomer, 
      lastLogin: null
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async updateCustomerLastLogin(id: string): Promise<void> {
    const customer = this.customers.get(id);
    if (customer) {
      customer.lastLogin = new Date();
      this.customers.set(id, customer);
    }
  }

  async getCustomerOrders(customerId: string, limit: number = 10): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.customerId === customerId)
      .sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())
      .slice(0, limit);
  }

  async createOrder(order: Order): Promise<Order> {
    this.orders.set(order.id, order);
    return order;
  }

  async getCustomerInvoices(customerId: string, limit: number = 10): Promise<Invoice[]> {
    const customerInvoices: Invoice[] = [];
    for (const invoice of this.invoices.values()) {
      if (invoice.customerId === customerId) {
        customerInvoices.push(invoice);
      }
    }
    return customerInvoices
      .sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime())
      .slice(0, limit);
  }

  async createInvoice(invoice: Invoice): Promise<Invoice> {
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    try {
      const session: Session = {
        ...insertSession,
        createdAt: new Date(),
      };
      this.sessions.set(session.id, session);
      return session;
    } catch (error) {
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  async getSession(id: string): Promise<Session | undefined> {
    if (typeof id !== 'string' || id.length === 0) {
      return undefined;
    }
    
    const session = this.sessions.get(id);
    if (!session) {
      return undefined;
    }
    
    if (session.expiresAt <= new Date()) {
      this.sessions.delete(id);
      return undefined;
    }
    
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    if (typeof id !== 'string' || id.length === 0) {
      return;
    }
    this.sessions.delete(id);
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
      }
    }
  }

  // Keep old method for backward compatibility
  async deleteExpiredSessions(): Promise<void> {
    return this.cleanupExpiredSessions();
  }
}

export const storage = new MemStorage();
