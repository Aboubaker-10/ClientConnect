# ERP Customer Portal

## Overview

This is a customer portal application built for ERPNext integration, providing customers with self-service access to their orders, invoices, and account information. The application features a React frontend with a Node.js/Express backend, using PostgreSQL for data persistence and optional ERPNext API integration for real-time data synchronization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, using Vite as the build tool. The application follows a component-based architecture with:

- **UI Framework**: shadcn/ui components built on Radix UI primitives for accessibility and consistency
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Authentication**: Session-based authentication with HTTP-only cookies

### Backend Architecture
The backend uses Node.js with Express and follows a RESTful API design:

- **Framework**: Express.js with TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Session-based authentication with configurable storage (memory or PostgreSQL)
- **API Integration**: Modular ERPNext service for external data synchronization
- **Error Handling**: Centralized error handling with structured error responses

### Database Design
The application uses a PostgreSQL database with the following core entities:

- **Customers**: Store customer information including balance, credit limits, and login tracking
- **Orders**: Track customer orders with status, amounts, and delivery information
- **Invoices**: Manage invoice data with payment tracking and due dates
- **Sessions**: Handle user authentication sessions with expiration management

### Authentication Strategy
The system implements session-based authentication with:

- Customer ID-based login (no passwords for simplified access)
- HTTP-only session cookies for security
- Automatic session cleanup for expired sessions
- Fallback authentication through local storage when ERPNext is unavailable

### External Service Integration
The application supports dual-mode operation:

- **ERPNext Integration**: Primary data source through REST API with configurable credentials
- **Fallback Mode**: Local database storage when ERPNext is unavailable or not configured
- **Data Synchronization**: Automatic customer data sync from ERPNext to local storage
- **Graceful Degradation**: System continues to function with local data when external services fail

## External Dependencies

### Core Technologies
- **Node.js & Express**: Backend runtime and web framework
- **React 18**: Frontend library with TypeScript support
- **PostgreSQL**: Primary database with Neon Database integration
- **Drizzle ORM**: Type-safe database operations and migrations

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library

### Data Management
- **TanStack Query**: Server state management and caching
- **Axios**: HTTP client for external API calls
- **Zod**: Schema validation and type inference

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the stack
- **ESBuild**: Production bundling for backend

### Third-Party Services
- **ERPNext API**: Optional integration for customer, order, and invoice data
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development and deployment platform integration