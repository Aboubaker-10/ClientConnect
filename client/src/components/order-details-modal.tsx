import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Order } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { translations, translateStatus } from "@/lib/translations";

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatCurrency = (amount: string | number) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(numericAmount);
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const STATUS_COLORS = {
  delivered: 'bg-green-100 text-green-800',
  'in transit': 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
} as const;

const getStatusColor = (status: string) => {
  return STATUS_COLORS[status.toLowerCase() as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
};

export function OrderDetailsModal({
  order,
  isOpen,
  onClose,
}: OrderDetailsModalProps) {
  const { language } = useLanguage();
  const t = translations[language].dashboard;
  
  if (!order) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 max-h-[90vh] flex flex-col portal-card border-portal">
        <DialogHeader className="p-6 flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold" style={{ color: 'var(--portal-text)' }}>
            {t.orderNumber}{order.orderNumber}
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--portal-accent)' }}>
            {t.detailsForYourSalesOrder}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 pb-6 space-y-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1">
              <p className="font-medium" style={{ color: 'var(--portal-accent)' }}>{t.orderDate}</p>
              <p style={{ color: 'var(--portal-text)' }}>{formatDate(order.orderDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium" style={{ color: 'var(--portal-accent)' }}>{t.deliveryDate}</p>
              <p style={{ color: 'var(--portal-text)' }}>
                {order.deliveryDate ? formatDate(order.deliveryDate) : t.notSpecified}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium" style={{ color: 'var(--portal-accent)' }}>{t.status}</p>
              <Badge className={getStatusColor(order.status)}>{translateStatus(order.status, language)}</Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--portal-text)' }}>{t.items}</h3>
            <div className="border rounded-lg" style={{ borderColor: 'var(--border)' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ color: 'var(--portal-accent)' }}>{t.item}</TableHead>
                    <TableHead className="text-right" style={{ color: 'var(--portal-accent)' }}>{t.quantity}</TableHead>
                    <TableHead className="text-right" style={{ color: 'var(--portal-accent)' }}>{t.price}</TableHead>
                    <TableHead className="text-right" style={{ color: 'var(--portal-accent)' }}>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.items || []).map((item) => (
                    <TableRow key={item.id} className="order-item-row">
                      <TableCell className="font-medium portal-text">{item.name}</TableCell>
                      <TableCell className="text-right portal-text">{item.quantity}</TableCell>
                      <TableCell className="text-right portal-text">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right font-medium portal-text">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <div className="flex justify-end items-center p-6 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
           <div className="text-right">
              <p className="text-sm" style={{ color: 'var(--portal-accent)' }}>{t.grandTotal}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--portal-primary)' }}>{formatCurrency(order.amount)}</p>
           </div>
        </div>
              </DialogContent>
    </Dialog>
  );
}
