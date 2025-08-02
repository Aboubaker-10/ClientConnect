import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).default("0.00"),
  status: text("status").default("Active"),
  lastLogin: timestamp("last_login"),
  primary_address: jsonb("primary_address"),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(),
  customerId: varchar("customer_id").notNull(),
  orderNumber: text("order_number").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
  orderDate: timestamp("order_date").notNull(),
  deliveryDate: timestamp("delivery_date"),
  items: jsonb("items"),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey(),
  customerId: varchar("customer_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  customerId: varchar("customer_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  lastLogin: true,
});

export const insertOrderSchema = createInsertSchema(orders);

export const insertInvoiceSchema = createInsertSchema(invoices);

export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
});

export const loginSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
