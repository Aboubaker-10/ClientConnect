import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { erpNextService } from "./services/erpnext";
import { loginSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Clean up expired sessions periodically
  setInterval(() => {
    storage.deleteExpiredSessions();
  }, 1000 * 60 * 60); // Every hour

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { customerId } = loginSchema.parse(req.body);

      // Only get customer from ERPNext - no fallback to demo data
      const customer = await erpNextService.getCustomer(customerId);

      if (!customer) {
        return res.status(401).json({ 
          message: "Invalid Customer ID. Please check your Customer ID and try again." 
        });
      }

      // Create or update customer in local storage
      await storage.createCustomer(customer);
      await storage.updateCustomerLastLogin(customerId);

      // Create session
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.createSession({
        id: sessionId,
        customerId,
        expiresAt,
      });

      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      });

      res.json({ 
        success: true, 
        customer: {
          id: customer.id,
          name: customer.name,
          company: customer.company,
          email: customer.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ 
        message: "Login failed. Please try again." 
      });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      if (sessionId) {
        await storage.deleteSession(sessionId);
      }
      res.clearCookie('sessionId');
      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Middleware to check authentication
  async function requireAuth(req: any, res: any, next: any) {
    try {
      const sessionId = req.cookies.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const session = await storage.getSession(sessionId);
      if (!session) {
        res.clearCookie('sessionId');
        return res.status(401).json({ message: "Session expired" });
      }

      req.customerId = session.customerId;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: "Authentication error" });
    }
  }

  // Get customer profile


  // Get customer orders
  app.get("/api/customer/orders", requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get ALL orders from ERPNext (no limit for "View All" pages)
      const erpOrders = await erpNextService.getCustomerOrders(req.customerId, 0);
      
      // Store orders locally for caching
      for (const order of erpOrders) {
        await storage.createOrder(order);
      }

      // Only use ERPNext data
      const orders = erpOrders;

      res.json(orders);
    } catch (error) {
      console.error('Orders fetch error:', error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get customer invoices
  app.get("/api/customer/invoices", requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get ALL invoices from ERPNext (no limit for "View All" pages)
      const erpInvoices = await erpNextService.getCustomerInvoices(req.customerId, 0);
      
      // Store invoices locally for caching
      for (const invoice of erpInvoices) {
        await storage.createInvoice(invoice);
      }

      // Only use ERPNext data
      const invoices = erpInvoices;

      res.json(invoices);
    } catch (error) {
      console.error('Invoices fetch error:', error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get dashboard summary
  app.get("/api/customer/dashboard", requireAuth, async (req: any, res) => {
    try {
      const customer = await storage.getCustomer(req.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Get ALL orders and invoices first
      const allOrders = await erpNextService.getCustomerOrders(req.customerId, 0);
      const allInvoices = await erpNextService.getCustomerInvoices(req.customerId, 0);

      // Get recent data for dashboard display (first 5 from all data)
      const recentOrders = allOrders.slice(0, 5);
      const recentInvoices = allInvoices.slice(0, 5);

      // Store recent data locally for caching
      for (const order of recentOrders) {
        await storage.createOrder(order);
      }
      for (const invoice of recentInvoices) {
        await storage.createInvoice(invoice);
      }

      // Calculate metrics using ALL data for accurate totals
      const totalOrders = allOrders.length;
      const pendingInvoices = allInvoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue' || inv.status === 'Draft');
      const paidInvoices = allInvoices.filter(inv => inv.status === 'Paid');
      const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const paidAmount = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

      res.json({
        customer,
        recentOrders: recentOrders,
        recentInvoices: recentInvoices,
        metrics: {
          totalOrders,
          pendingInvoices: pendingInvoices.length,
          pendingAmount: pendingAmount.toFixed(2),
          accountBalance: customer.balance || "0.00",
          totalPaid: paidAmount.toFixed(2),
          totalUnpaid: pendingAmount.toFixed(2),
        }
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Customer profile endpoint
  app.get('/api/customer/profile', requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Try to get fresh data from ERPNext
      try {
        console.log('Attempting to fetch ERPNext data for customer:', req.customerId);
        const erpnextCustomer = await erpNextService.getCustomer(req.customerId);
        console.log('ERPNext customer data:', erpnextCustomer ? 'Found' : 'Not found');
        if (erpnextCustomer) {
          // Merge ERPNext data with stored customer data
          const enrichedCustomer = {
            ...customer,
            primaryAddress: erpnextCustomer.primary_address || null,
            customerType: erpnextCustomer.customer_type || null,
            defaultCurrency: erpnextCustomer.default_currency || 'MAD',
            language: erpnextCustomer.language || null,
          };
          
          console.log('Returning enriched customer data with ERPNext fields');
          res.json({ customer: enrichedCustomer });
          return;
        }
      } catch (erpError) {
        console.log('ERPNext error for profile:', erpError.message);
      }

      // Fallback to stored data with default values
      const fallbackCustomer = {
        ...customer,
        primaryAddress: null,
        customerType: null,
        defaultCurrency: 'MAD',
        language: null,
      };
      
      console.log('Returning fallback customer data');
      res.json({ customer: fallbackCustomer });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ message: "Failed to load profile" });
    }
  });

  // Products endpoint for place order page
  app.get('/api/products', requireAuth, async (req, res) => {
    try {
      console.log('Fetching products from ERPNext...');
      const items = await erpNextService.getItems();
      
      // Transform ERPNext items to our Product format
      const products = items.map((item: any) => ({
        id: item.name,
        name: item.item_name || item.name,
        itemCode: item.item_code,
        description: item.description || 'No description available',
        price: item.standard_rate?.toString() || '0',
        currency: item.currency || 'MAD',
        stockQuantity: item.stock_qty || 0,
        category: item.item_group || 'General',
        image: item.image || null
      }));
      
      console.log(`Returning ${products.length} products from ERPNext`);
      res.json(products);
    } catch (error) {
      console.error('Products fetch error:', error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Create order endpoint
  app.post('/api/orders/create', requireAuth, async (req, res) => {
    try {
      const { items, total } = req.body;
      
      // For now, simulate order creation
      // In a real implementation, this would create a Sales Order in ERPNext
      const orderId = `ORD-${Date.now()}`;
      
      res.json({
        success: true,
        orderId,
        message: "Order created successfully"
      });
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
