import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Folder, FolderOpen, AlertTriangle, X } from 'lucide-react';
import type { Vault, Category } from '../../../server/src/schema';

interface CategoryManagerProps {
  selectedVault: Vault;
  categories: Category[];
  selectedCategory: Category | null;
  onCategorySelected: (category: Category | null) => void;
  onCategoryCreated: (category: Category) => void;
}

export function CategoryManager({
  selectedVault,
  categories,
  selectedCategory,
  onCategorySelected,
  onCategoryCreated
}: CategoryManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryName.trim()) {
      setError('اسم التصنيف مطلوب');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newCategory = await trpc.createCategory.mutate({
        name: categoryName.trim(),
        vault_id: selectedVault.id
      });

      onCategoryCreated(newCategory);
      setIsDialogOpen(false);
      setCategoryName('');
    } catch (err) {
      console.error('Failed to create category:', err);
      setError('فشل في إنشاء التصنيف. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => onCategorySelected(null)}
          className="flex items-center gap-2"
        >
          <Folder className="h-4 w-4" />
          جميع العناصر
          <Badge variant="secondary" className="ml-1">
            {/* This would show total count if we had access to all items */}
            الكل
          </Badge>
        </Button>

        {categories.map((category: Category) => (
          <Button
            key={category.id}
            variant={selectedCategory?.id === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => onCategorySelected(category)}
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            {category.name}
          </Button>
        ))}

        {/* Add Category Button */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="border-2 border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              إضافة تصنيف
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-blue-600" />
                إنشاء تصنيف جديد
              </DialogTitle>
              <DialogDescription>
                أنشئ تصنيفاً جديداً لتنظيم العناصر في هذه الخزنة
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">اسم التصنيف *</Label>
                <Input
                  id="category-name"
                  placeholder="مثال: مواقع التواصل الاجتماعي"
                  value={categoryName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setCategoryName(e.target.value)
                  }
                  required
                  disabled={isCreating}
                  className="text-right"
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
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء التصنيف'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Category Info */}
      {selectedCategory && (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">عرض العناصر في: {selectedCategory.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCategorySelected(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Categories Summary */}
      {categories.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-500">
          لا توجد تصنيفات في هذه الخزنة. أنشئ تصنيفاً لتنظيم عناصرك بشكل أفضل.
        </div>
      ) : (
        <div className="text-xs text-gray-500">
          {categories.length} تصنيف متاح في هذه الخزنة
        </div>
      )}
    </div>
  );
}