import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { erpNextService } from "./services/erpnext";
import { loginSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import csrf from "csrf";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // CSRF protection
  const tokens = new csrf();
  const secret = tokens.secretSync();
  
  const csrfProtection = (req: any, res: any, next: any) => {
    if (req.method === 'GET') {
      return next();
    }
    
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    if (!token || !tokens.verify(secret, token)) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    next();
  };
  
  // CSRF token endpoint
  app.get('/api/csrf-token', (req, res) => {
    const token = tokens.create(secret);
    res.json({ csrfToken: token });
  });
  
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
          id: sanitizeOutput(String(customer.id)),
          name: sanitizeOutput(String(customer.name)),
          company: sanitizeOutput(String(customer.company || '')),
          email: sanitizeOutput(String(customer.email || ''))
        }
      });
    } catch (error) {
      console.error('Login error:', sanitizeLogInput(String(error)));
      res.status(400).json({ 
        message: "Login failed. Please try again." 
      });
    }
  });

  // Auth check endpoint
  app.get("/api/auth/check", async (req, res) => {
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

      const customer = await storage.getCustomer(session.customerId);
      if (!customer) {
        return res.status(401).json({ message: "Customer not found" });
      }

      res.json({ 
        authenticated: true, 
        customer: {
          id: customer.id,
          name: customer.name,
          company: customer.company,
          email: customer.email
        }
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ message: "Authentication check failed" });
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
      console.log('Auth check - sessionId:', sessionId ? 'Present' : 'Missing');
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


  // Get single customer order
  app.get("/api/customer/orders/:orderId", requireAuth, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const order = await erpNextService.getCustomerOrder(orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error('Order fetch error:', error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

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
      console.log('=== DASHBOARD REQUEST START ===');
      console.log('Dashboard request for customer:', req.customerId);
      const customer = await storage.getCustomer(req.customerId);
      console.log('Customer found:', customer ? 'Yes' : 'No');
      
      let finalCustomer = customer;
      if (!finalCustomer) {
        console.log('Customer not found in storage, trying to fetch from ERPNext...');
        finalCustomer = await erpNextService.getCustomer(req.customerId);
        if (!finalCustomer) {
          console.log('Customer not found in ERPNext either');
          return res.status(404).json({ message: "Customer not found" });
        }
        console.log('Customer fetched from ERPNext:', finalCustomer.name);
      }

      console.log('Fetching orders and invoices from ERPNext...');
      // Get ALL orders and invoices first
      const allOrders = await erpNextService.getCustomerOrders(req.customerId, 0);
      const allInvoices = await erpNextService.getCustomerInvoices(req.customerId, 0);
      console.log(`Found ${allOrders.length} orders and ${allInvoices.length} invoices`);

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

      const dashboardData = {
        customer: finalCustomer,
        recentOrders: recentOrders,
        recentInvoices: recentInvoices,
        metrics: {
          totalOrders,
          pendingInvoices: pendingInvoices.length,
          pendingAmount: pendingAmount.toFixed(2),
          accountBalance: finalCustomer.balance || "0.00",
          totalPaid: paidAmount.toFixed(2),
          totalUnpaid: pendingAmount.toFixed(2),
        }
      };
      
      console.log('=== SENDING DASHBOARD DATA ===');
      console.log('Customer:', finalCustomer.name);
      console.log('Orders:', recentOrders.length);
      console.log('Invoices:', recentInvoices.length);
      res.json(dashboardData);
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
        console.log('Attempting to fetch ERPNext data for customer:', sanitizeLogInput(String(req.customerId)));
        const erpnextCustomer = await erpNextService.getCustomer(req.customerId);
        console.log('ERPNext customer data:', erpnextCustomer ? 'Found' : 'Not found');
        if (erpnextCustomer) {
          // Merge ERPNext data with stored customer data
          const enrichedCustomer = {
            ...customer,
            primary_address: erpnextCustomer.primary_address || null,
            primaryAddress: erpnextCustomer.primary_address || null,
            customerType: erpnextCustomer.customer_type || null,
            defaultCurrency: erpnextCustomer.default_currency || 'MAD',
            language: erpnextCustomer.language || null,
          };
          
          console.log('Returning enriched customer data with ERPNext fields');
          res.json({ customer: enrichedCustomer });
          return;
        }
      } catch (erpError: any) {
        console.log('ERPNext error for profile:', sanitizeLogInput(String(erpError?.message || 'Unknown error')));
      }

      // Fallback to stored data with default values
      const fallbackCustomer = {
        ...customer,
        primary_address: null,
        primaryAddress: null,
        customerType: null,
        defaultCurrency: 'MAD',
        language: null,
      };
      
      console.log('Returning fallback customer data');
      res.json({ customer: fallbackCustomer });
    } catch (error: any) {
      console.error('Profile error:', sanitizeLogInput(String(error?.message || 'Unknown error')));
      res.status(500).json({ message: "Failed to load profile" });
    }
  });

  // Products endpoint for place order page
  app.get('/api/products', requireAuth, async (req, res) => {
    try {
      console.log('Fetching products from ERPNext...');
      const items = await erpNextService.getItems();
      
      // Transform ERPNext items to our Product format
      const products = items.map((item: any) => {
        // Construct full image URL if image path exists
        let imageUrl = null;
        if (item.image) {
          // If image starts with http, use as-is, otherwise prepend ERPNext base URL
          if (item.image.startsWith('http')) {
            imageUrl = item.image;
          } else {
            // Remove leading slash if present and construct full URL
            const imagePath = item.image.startsWith('/') ? item.image.slice(1) : item.image;
            imageUrl = `${process.env.ERPNEXT_URL}/${imagePath}`;
          }
        }
        
        return {
          id: item.name,
          name: item.item_name || item.name,
          itemCode: item.item_code,
          description: item.description || 'No description available',
          price: item.standard_rate?.toString() || '0',
          currency: 'MAD',
          stockQuantity: 999, // Default stock since stock_qty field not accessible
          category: item.item_group || 'General',
          brand: item.brand,
          image: imageUrl
        };
      });
      
      // Filter out products with price 0
      const validProducts = products.filter(product => parseFloat(product.price) > 0);
      
      console.log(`Returning ${validProducts.length} products from ERPNext (filtered from ${products.length} total)`);
      res.json(validProducts);
    } catch (error) {
      console.error('Products fetch error:', error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Create order endpoint
  app.get('/api/brands', requireAuth, async (req, res) => {
    try {
      const brands = await erpNextService.getBrands();
      res.json(brands);
    } catch (error) {
      console.error('Brands fetch error:', error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.post('/api/orders/create', requireAuth, csrfProtection, async (req, res) => {
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
      console.error('Order creation error:', sanitizeLogInput(String(error)));
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  function sanitizeOutput(input: string): string {
    return input.replace(/[<>"'&]/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match] || match;
    });
  }

  function sanitizeLogInput(input: string): string {
    return input.replace(/[\r\n\t]/g, ' ').replace(/[\x00-\x1f\x7f-\x9f]/g, '');
  }

  const httpServer = createServer(app);
  return httpServer;
}
