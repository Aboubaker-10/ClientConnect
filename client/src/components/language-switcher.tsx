import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function LanguageSwitcher() {
  const { setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="transition duration-200 text-gray-500 hover:text-gray-700"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('fr')}>Français</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('es')}>Español</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('ar')}>العربية</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
