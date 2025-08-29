import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Plus, Lock, AlertTriangle } from 'lucide-react';
import type { 
  User, 
  Vault, 
  Category, 
  CreatePasswordEntryInput,
  PasswordEntry 
} from '../../../server/src/schema';

interface PasswordEntryFormProps {
  currentUser: User;
  selectedVault: Vault;
  categories: Category[];
  onPasswordEntryCreated: (entry: PasswordEntry) => void;
}

export function PasswordEntryForm({ 
  currentUser, 
  selectedVault, 
  categories, 
  onPasswordEntryCreated 
}: PasswordEntryFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<CreatePasswordEntryInput>({
    title: '',
    username: null,
    password: '',
    url: null,
    notes: null,
    vault_id: selectedVault.id,
    category_id: null,
    created_by: currentUser.id
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.password.trim()) {
      setError('العنوان وكلمة المرور مطلوبان');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newEntry = await trpc.createPasswordEntry.mutate(formData);
      onPasswordEntryCreated(newEntry);
      setIsDialogOpen(false);
      
      // Reset form
      setFormData({
        title: '',
        username: null,
        password: '',
        url: null,
        notes: null,
        vault_id: selectedVault.id,
        category_id: null,
        created_by: currentUser.id
      });
    } catch (err) {
      console.error('Failed to create password entry:', err);
      setError('فشل في إنشاء كلمة المرور. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: keyof CreatePasswordEntryInput, value: string | number | null) => {
    setFormData((prev: CreatePasswordEntryInput) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          إضافة كلمة مرور
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            إضافة كلمة مرور جديدة
          </DialogTitle>
          <DialogDescription>
            احفظ كلمة مرور جديدة في الخزنة بشكل آمن ومشفر
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
            <Label htmlFor="entry-title">العنوان *</Label>
            <Input
              id="entry-title"
              placeholder="مثال: حساب Gmail الشخصي"
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
            <Label htmlFor="entry-username">اسم المستخدم أو البريد الإلكتروني</Label>
            <Input
              id="entry-username"
              placeholder="user@example.com"
              value={formData.username || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('username', e.target.value || null)
              }
              disabled={isCreating}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-password">كلمة المرور *</Label>
            <div className="relative">
              <Input
                id="entry-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="أدخل كلمة المرور"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('password', e.target.value)
                }
                required
                disabled={isCreating}
                className="text-right pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isCreating}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-url">الموقع أو الرابط</Label>
            <Input
              id="entry-url"
              type="url"
              placeholder="https://example.com"
              value={formData.url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('url', e.target.value || null)
              }
              disabled={isCreating}
              className="text-right"
            />
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="entry-category">التصنيف</Label>
              <Select 
                value={formData.category_id?.toString() || 'none'} 
                onValueChange={(value) => 
                  handleInputChange('category_id', value === 'none' ? null : parseInt(value))
                }
              >
                <SelectTrigger id="entry-category">
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

          <div className="space-y-2">
            <Label htmlFor="entry-notes">ملاحظات</Label>
            <Textarea
              id="entry-notes"
              placeholder="ملاحظات إضافية حول هذا الحساب..."
              value={formData.notes || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                handleInputChange('notes', e.target.value || null)
              }
              disabled={isCreating}
              className="text-right"
              rows={3}
            />
          </div>

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
              {isCreating ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}