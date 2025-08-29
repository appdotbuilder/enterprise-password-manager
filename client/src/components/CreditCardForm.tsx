import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, CreditCard, AlertTriangle } from 'lucide-react';
import type { 
  User, 
  Vault, 
  Category, 
  CreateCreditCardInput,
  CreditCard as CreditCardType 
} from '../../../server/src/schema';

interface CreditCardFormProps {
  currentUser: User;
  selectedVault: Vault;
  categories: Category[];
  onCreditCardCreated: (card: CreditCardType) => void;
}

export function CreditCardForm({ 
  currentUser, 
  selectedVault, 
  categories, 
  onCreditCardCreated 
}: CreditCardFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCreditCardInput>({
    title: '',
    cardholder_name: '',
    card_number: '',
    cvv: '',
    expiry_month: 1,
    expiry_year: new Date().getFullYear(),
    vault_id: selectedVault.id,
    category_id: null,
    created_by: currentUser.id
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.cardholder_name.trim() || 
        !formData.card_number.trim() || !formData.cvv.trim()) {
      setError('جميع الحقول الأساسية مطلوبة');
      return;
    }

    if (formData.card_number.replace(/\s/g, '').length < 13) {
      setError('رقم البطاقة يجب أن يكون 13 رقم على الأقل');
      return;
    }

    if (formData.cvv.length < 3) {
      setError('رمز CVV يجب أن يكون 3 أرقام على الأقل');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newCard = await trpc.createCreditCard.mutate({
        ...formData,
        card_number: formData.card_number.replace(/\s/g, '') // Remove spaces
      });
      onCreditCardCreated(newCard);
      setIsDialogOpen(false);
      
      // Reset form
      setFormData({
        title: '',
        cardholder_name: '',
        card_number: '',
        cvv: '',
        expiry_month: 1,
        expiry_year: new Date().getFullYear(),
        vault_id: selectedVault.id,
        category_id: null,
        created_by: currentUser.id
      });
    } catch (err) {
      console.error('Failed to create credit card:', err);
      setError('فشل في حفظ بطاقة الائتمان. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: keyof CreateCreditCardInput, value: string | number | null) => {
    setFormData((prev: CreateCreditCardInput) => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add space every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCardNumber(e.target.value);
    if (formattedValue.replace(/\s/g, '').length <= 19) { // Max 19 digits
      handleInputChange('card_number', formattedValue);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length <= 4) { // Max 4 digits for CVV
      handleInputChange('cvv', digits);
    }
  };

  // Generate years for selection (current year + next 20 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear + i);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          إضافة بطاقة ائتمان
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-600" />
            إضافة بطاقة ائتمان جديدة
          </DialogTitle>
          <DialogDescription>
            احفظ معلومات بطاقة الائتمان بشكل آمن ومشفر
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-title">عنوان البطاقة *</Label>
            <Input
              id="card-title"
              placeholder="مثال: بطاقة الراجحي الرئيسية"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('title', e.target.value)
              }
              required
              disabled={isCreating}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardholder-name">اسم حامل البطاقة *</Label>
            <Input
              id="cardholder-name"
              placeholder="الاسم كما يظهر على البطاقة"
              value={formData.cardholder_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('cardholder_name', e.target.value)
              }
              required
              disabled={isCreating}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-number">رقم البطاقة *</Label>
            <Input
              id="card-number"
              placeholder="1234 5678 9012 3456"
              value={formData.card_number}
              onChange={handleCardNumberChange}
              required
              disabled={isCreating}
              className="text-left font-mono"
              maxLength={23} // 19 digits + 4 spaces
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry-month">الشهر *</Label>
              <Select 
                value={formData.expiry_month.toString()} 
                onValueChange={(value) => 
                  handleInputChange('expiry_month', parseInt(value))
                }
              >
                <SelectTrigger id="expiry-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry-year">السنة *</Label>
              <Select 
                value={formData.expiry_year.toString()} 
                onValueChange={(value) => 
                  handleInputChange('expiry_year', parseInt(value))
                }
              >
                <SelectTrigger id="expiry-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cvv">CVV *</Label>
              <Input
                id="cvv"
                placeholder="123"
                value={formData.cvv}
                onChange={handleCvvChange}
                required
                disabled={isCreating}
                className="text-center font-mono"
                maxLength={4}
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="card-category">التصنيف</Label>
              <Select 
                value={formData.category_id?.toString() || 'none'} 
                onValueChange={(value) => 
                  handleInputChange('category_id', value === 'none' ? null : parseInt(value))
                }
              >
                <SelectTrigger id="card-category">
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تصنيف</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              سيتم تشفير جميع معلومات البطاقة قبل حفظها. لا تشارك هذه المعلومات مع أي شخص.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreating}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'جاري الحفظ...' : 'حفظ البطاقة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}