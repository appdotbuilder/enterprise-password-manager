import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, FileText, AlertTriangle } from 'lucide-react';
import type { 
  User, 
  Vault, 
  Category, 
  CreateSecureNoteInput,
  SecureNote 
} from '../../../server/src/schema';

interface SecureNoteFormProps {
  currentUser: User;
  selectedVault: Vault;
  categories: Category[];
  onSecureNoteCreated: (note: SecureNote) => void;
}

export function SecureNoteForm({ 
  currentUser, 
  selectedVault, 
  categories, 
  onSecureNoteCreated 
}: SecureNoteFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateSecureNoteInput>({
    title: '',
    content: '',
    vault_id: selectedVault.id,
    category_id: null,
    created_by: currentUser.id
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('العنوان والمحتوى مطلوبان');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newNote = await trpc.createSecureNote.mutate(formData);
      onSecureNoteCreated(newNote);
      setIsDialogOpen(false);
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        vault_id: selectedVault.id,
        category_id: null,
        created_by: currentUser.id
      });
    } catch (err) {
      console.error('Failed to create secure note:', err);
      setError('فشل في إنشاء الملاحظة الآمنة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: keyof CreateSecureNoteInput, value: string | number | null) => {
    setFormData((prev: CreateSecureNoteInput) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          إضافة ملاحظة آمنة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            إضافة ملاحظة آمنة جديدة
          </DialogTitle>
          <DialogDescription>
            احفظ ملاحظة نصية مشفرة وآمنة في الخزنة
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
            <Label htmlFor="note-title">العنوان *</Label>
            <Input
              id="note-title"
              placeholder="مثال: كلمات مرور الراوتر المنزلي"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('title', e.target.value)
              }
              required
              disabled={isCreating}
              className="text-right"
            />
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="note-category">التصنيف</Label>
              <Select 
                value={formData.category_id?.toString() || 'none'} 
                onValueChange={(value) => 
                  handleInputChange('category_id', value === 'none' ? null : parseInt(value))
                }
              >
                <SelectTrigger id="note-category">
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
            <Label htmlFor="note-content">المحتوى *</Label>
            <Textarea
              id="note-content"
              placeholder="اكتب محتوى الملاحظة الآمنة هنا..."
              value={formData.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                handleInputChange('content', e.target.value)
              }
              required
              disabled={isCreating}
              className="text-right min-h-[120px]"
              rows={6}
            />
            <p className="text-xs text-gray-500">
              سيتم تشفير هذا المحتوى تلقائياً قبل حفظه
            </p>
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
              {isCreating ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}