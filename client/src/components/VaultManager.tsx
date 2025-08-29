import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Vault, 
  Lock, 
  Users, 
  Calendar,
  AlertTriangle,
  Check
} from 'lucide-react';
import type { User, Vault as VaultType, CreateVaultInput } from '../../../server/src/schema';

interface VaultManagerProps {
  currentUser: User;
  vaults: VaultType[];
  onVaultCreated: (vault: VaultType) => void;
  onVaultSelected: (vault: VaultType) => void;
  isLoading: boolean;
}

export function VaultManager({ 
  currentUser, 
  vaults, 
  onVaultCreated, 
  onVaultSelected,
  isLoading 
}: VaultManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateVaultInput>({
    name: '',
    description: null,
    owner_id: currentUser.id
  });

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setCreateError('اسم الخزنة مطلوب');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const newVault = await trpc.createVault.mutate({
        ...formData,
        description: formData.description || null
      });
      
      onVaultCreated(newVault);
      setIsCreateDialogOpen(false);
      
      // Reset form
      setFormData({
        name: '',
        description: null,
        owner_id: currentUser.id
      });
    } catch (err) {
      console.error('Failed to create vault:', err);
      setCreateError('فشل في إنشاء الخزنة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFormChange = (field: keyof CreateVaultInput, value: string) => {
    setFormData((prev: CreateVaultInput) => ({
      ...prev,
      [field]: field === 'description' ? (value || null) : value
    }));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Vault Button */}
      <div className="flex justify-between items-center">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إنشاء خزنة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Vault className="h-5 w-5 text-blue-600" />
                إنشاء خزنة جديدة
              </DialogTitle>
              <DialogDescription>
                أنشئ خزنة آمنة جديدة لتخزين كلمات المرور والبيانات الحساسة
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreateVault} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vault-name">اسم الخزنة *</Label>
                <Input
                  id="vault-name"
                  placeholder="مثال: خزنة الشركة الرئيسية"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleFormChange('name', e.target.value)
                  }
                  required
                  disabled={isCreating}
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vault-description">الوصف (اختياري)</Label>
                <Textarea
                  id="vault-description"
                  placeholder="وصف مختصر للخزنة وما تحتويه"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    handleFormChange('description', e.target.value)
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
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء الخزنة'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vaults Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : vaults.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">لا توجد خزائن</CardTitle>
            <CardDescription className="text-center">
              ابدأ بإنشاء خزنتك الأولى لتخزين كلمات المرور والبيانات الآمنة
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Vault className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              الخزائن توفر مساحة آمنة ومشفرة لحفظ معلوماتك الحساسة
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إنشاء أول خزنة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vaults.map((vault: VaultType) => (
            <Card 
              key={vault.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onVaultSelected(vault)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Vault className="h-5 w-5 text-blue-600" />
                    {vault.name}
                  </span>
                  <Lock className="h-4 w-4 text-green-600" />
                </CardTitle>
                {vault.description && (
                  <CardDescription>{vault.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>تم الإنشاء: {formatDate(vault.created_at)}</span>
                  </div>
                  
                  {vault.owner_id === currentUser.id ? (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">أنت المالك</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-600">مشاركة</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
                    <div>
                      <div className="font-semibold">-</div>
                      <div>كلمات مرور</div>
                    </div>
                    <div>
                      <div className="font-semibold">-</div>
                      <div>ملاحظات</div>
                    </div>
                    <div>
                      <div className="font-semibold">-</div>
                      <div>بطاقات</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}