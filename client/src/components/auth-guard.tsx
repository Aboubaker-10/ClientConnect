import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [, setLocation] = useLocation();

  const { data: authData, isLoading, error } = useQuery({
    queryKey: ["auth-check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check");
      return response.json();
    },
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isLoading && (error || !authData)) {
      setLocation("/");
    }
  }, [isLoading, error, authData, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto animate-optimized" style={{ animationDuration: '1s' }}></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (error || !authData) {
    return null;
  }

  return <>{children}</>;
}