import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { translations } from "@/lib/translations";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const t = translations[language].dashboard;

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: 'var(--portal-background)' }}>
      <Card className="w-full max-w-md mx-4 portal-card border-portal">
        <CardContent className="pt-8 pb-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--portal-text)' }}>404</h1>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--portal-text)' }}>{t.pageNotFound}</h2>
          <p className="mb-6" style={{ color: 'var(--portal-accent)' }}>
            {t.pageDoesntExist}
          </p>
          <Button 
            onClick={() => setLocation("/dashboard")}
            className="items-center gap-2"
            style={{ backgroundColor: 'var(--portal-primary)' }}
          >
            <Home className="h-4 w-4" />
            {t.goToDashboard}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
