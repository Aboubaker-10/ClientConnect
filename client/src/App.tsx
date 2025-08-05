import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthGuard } from "@/components/auth-guard";
import { lazy, Suspense } from "react";

const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Orders = lazy(() => import("@/pages/orders"));
const Invoices = lazy(() => import("@/pages/invoices"));
const Profile = lazy(() => import("@/pages/profile"));
const PlaceOrder = lazy(() => import("@/pages/place-order"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/dashboard">
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        </Route>
        <Route path="/orders">
          <AuthGuard>
            <Orders />
          </AuthGuard>
        </Route>
        <Route path="/invoices">
          <AuthGuard>
            <Invoices />
          </AuthGuard>
        </Route>
        <Route path="/profile">
          <AuthGuard>
            <Profile />
          </AuthGuard>
        </Route>
        <Route path="/products">
          <AuthGuard>
            <PlaceOrder />
          </AuthGuard>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
