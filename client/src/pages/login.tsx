import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Building } from "lucide-react";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      customerId: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: () => {
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid Customer ID. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--portal-background)' }}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--portal-primary)' }}>
            <Building className="text-white text-2xl" size={32} />
          </div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--portal-text)' }}>
            Customer Portal
          </h2>
          <p className="mt-2" style={{ color: 'var(--portal-accent)' }}>
            Enter your Customer ID to access your account
          </p>
        </div>
        
        <Card className="portal-card border-portal">
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customerId" className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                  Customer ID
                </Label>
                <Input
                  id="customerId"
                  type="text"
                  placeholder="Enter your Customer ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 transition duration-200"
                  style={{ 
                    '--tw-ring-color': 'var(--portal-primary)',
                    borderColor: 'var(--border)'
                  } as any}
                  {...form.register("customerId")}
                />
                {form.formState.errors.customerId && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.customerId.message}
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
                style={{ 
                  backgroundColor: 'var(--portal-primary)',
                  color: 'white'
                }}
                disabled={loginMutation.isPending}
              >
                <span>{loginMutation.isPending ? "Logging in..." : "Access Portal"}</span>
                {!loginMutation.isPending && (
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>
                Need help?{" "}
                <a 
                  href="#" 
                  className="font-medium transition duration-200"
                  style={{ color: 'var(--portal-primary)' }}
                >
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
