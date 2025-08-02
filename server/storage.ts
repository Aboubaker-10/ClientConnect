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
  private customers: Map<string, Customer>;
  private orders: Map<string, Order>;
  private invoices: Map<string, Invoice>;
  private sessions: Map<string, Session>;

  constructor() {
    this.customers = new Map();
    this.orders = new Map();
    this.invoices = new Map();
    this.sessions = new Map();
    
    // Add sample customer for testing
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample customer
    const sampleCustomer: Customer = {
      id: "Jamal",
      name: "Jamal Ahmed",
      company: "Jiex Trading Company",
      email: "jamal@jiextrading.com",
      phone: "+1-555-0123",
      balance: "2500.00",
      creditLimit: "10000.00",
      status: "Active",
      lastLogin: null,
    };
    this.customers.set(sampleCustomer.id, sampleCustomer);

    // Sample orders
    const sampleOrders: Order[] = [
      {
        id: "ORD-001",
        customerId: "Jamal",
        orderNumber: "SO-2024-001",
        amount: "1500.00",
        status: "Delivered",
        orderDate: new Date("2024-01-15"),
        deliveryDate: new Date("2024-01-22"),
        items: null,
      },
      {
        id: "ORD-002",
        customerId: "Jamal",
        orderNumber: "SO-2024-002",
        amount: "850.00",
        status: "In Transit",
        orderDate: new Date("2024-01-28"),
        deliveryDate: new Date("2024-02-05"),
        items: null,
      },
    ];
    sampleOrders.forEach(order => this.orders.set(order.id, order));

    // Sample invoices
    const sampleInvoices: Invoice[] = [
      {
        id: "INV-001",
        customerId: "Jamal",
        invoiceNumber: "INV-2024-001",
        amount: "1500.00",
        status: "Paid",
        invoiceDate: new Date("2024-01-15"),
        dueDate: new Date("2024-02-15"),
        paidDate: new Date("2024-01-20"),
      },
      {
        id: "INV-002",
        customerId: "Jamal",
        invoiceNumber: "INV-2024-002",
        amount: "850.00",
        status: "Pending",
        invoiceDate: new Date("2024-01-28"),
        dueDate: new Date("2024-02-28"),
        paidDate: null,
      },
    ];
    sampleInvoices.forEach(invoice => this.invoices.set(invoice.id, invoice));
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
    return Array.from(this.invoices.values())
      .filter(invoice => invoice.customerId === customerId)
      .sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime())
      .slice(0, limit);
  }

  async createInvoice(invoice: Invoice): Promise<Invoice> {
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const session: Session = {
      ...insertSession,
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    if (session) {
      this.sessions.delete(id);
    }
    return undefined;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
      }
    }
  }
}

export const storage = new MemStorage();
