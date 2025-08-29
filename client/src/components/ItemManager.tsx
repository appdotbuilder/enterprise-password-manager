import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordEntryForm } from '@/components/PasswordEntryForm';
import { SecureNoteForm } from '@/components/SecureNoteForm';
import { CreditCardForm } from '@/components/CreditCardForm';
import { ItemsList } from '@/components/ItemsList';
import { CategoryManager } from '@/components/CategoryManager';
import { 
  Lock, 
  FileText, 
  CreditCard, 
  Shield,
  AlertTriangle,
  Folder
} from 'lucide-react';
import type { 
  User, 
  Vault, 
  Category,
  PasswordEntry,
  SecureNote,
  CreditCard as CreditCardType
} from '../../../server/src/schema';

// Stub type for VaultItems since we can't import it directly
interface VaultItems {
  passwordEntries: PasswordEntry[];
  secureNotes: SecureNote[];
  creditCards: CreditCardType[];
}

interface ItemManagerProps {
  currentUser: User;
  selectedVault: Vault;
}

export function ItemManager({ currentUser, selectedVault }: ItemManagerProps) {
  const [vaultItems, setVaultItems] = useState<VaultItems>({
    passwordEntries: [],
    secureNotes: [],
    creditCards: []
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeItemTab, setActiveItemTab] = useState<string>('passwords');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load vault items and categories
  const loadVaultData = useCallback(async () => {
    if (!selectedVault) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load items and categories in parallel
      const [items, vaultCategories] = await Promise.all([
        trpc.getVaultItems.query({ 
          vaultId: selectedVault.id,
          categoryId: selectedCategory?.id 
        }),
        trpc.getVaultCategories.query({ vaultId: selectedVault.id })
      ]);
      
      setVaultItems(items);
      setCategories(vaultCategories);
    } catch (err) {
      console.error('Failed to load vault data:', err);
      setError('فشل في تحميل بيانات الخزنة');
    } finally {
      setIsLoading(false);
    }
  }, [selectedVault, selectedCategory?.id]);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  const handlePasswordEntryCreated = useCallback((entry: PasswordEntry) => {
    setVaultItems((prev: VaultItems) => ({
      ...prev,
      passwordEntries: [...prev.passwordEntries, entry]
    }));
  }, []);

  const handleSecureNoteCreated = useCallback((note: SecureNote) => {
    setVaultItems((prev: VaultItems) => ({
      ...prev,
      secureNotes: [...prev.secureNotes, note]
    }));
  }, []);

  const handleCreditCardCreated = useCallback((card: CreditCardType) => {
    setVaultItems((prev: VaultItems) => ({
      ...prev,
      creditCards: [...prev.creditCards, card]
    }));
  }, []);

  const handleCategoryCreated = useCallback((category: Category) => {
    setCategories((prev: Category[]) => [...prev, category]);
  }, []);

  const totalItems = vaultItems.passwordEntries.length + 
                    vaultItems.secureNotes.length + 
                    vaultItems.creditCards.length;

  return (
    <div className="space-y-6">
      {/* Vault Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العناصر</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              عنصر مشفر في هذه الخزنة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">كلمات المرور</CardTitle>
            <Lock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaultItems.passwordEntries.length}</div>
            <p className="text-xs text-muted-foreground">كلمة مرور محفوظة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الملاحظات</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaultItems.secureNotes.length}</div>
            <p className="text-xs text-muted-foreground">ملاحظة آمنة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">البطاقات</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaultItems.creditCards.length}</div>
            <p className="text-xs text-muted-foreground">بطاقة ائتمان</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            التصنيفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryManager
            selectedVault={selectedVault}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelected={setSelectedCategory}
            onCategoryCreated={handleCategoryCreated}
          />
        </CardContent>
      </Card>

      {/* Items Management Tabs */}
      <Tabs value={activeItemTab} onValueChange={setActiveItemTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="passwords" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            كلمات المرور
            <Badge variant="secondary" className="ml-1">
              {vaultItems.passwordEntries.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            الملاحظات
            <Badge variant="secondary" className="ml-1">
              {vaultItems.secureNotes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cards" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            البطاقات
            <Badge variant="secondary" className="ml-1">
              {vaultItems.creditCards.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            جميع العناصر
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="passwords" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">كلمات المرور</h3>
              <PasswordEntryForm
                currentUser={currentUser}
                selectedVault={selectedVault}
                categories={categories}
                onPasswordEntryCreated={handlePasswordEntryCreated}
              />
            </div>
            <ItemsList
              items={vaultItems.passwordEntries}
              type="password"
              isLoading={isLoading}
              categories={categories}
            />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">الملاحظات الآمنة</h3>
              <SecureNoteForm
                currentUser={currentUser}
                selectedVault={selectedVault}
                categories={categories}
                onSecureNoteCreated={handleSecureNoteCreated}
              />
            </div>
            <ItemsList
              items={vaultItems.secureNotes}
              type="note"
              isLoading={isLoading}
              categories={categories}
            />
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">بطاقات الائتمان</h3>
              <CreditCardForm
                currentUser={currentUser}
                selectedVault={selectedVault}
                categories={categories}
                onCreditCardCreated={handleCreditCardCreated}
              />
            </div>
            <ItemsList
              items={vaultItems.creditCards}
              type="card"
              isLoading={isLoading}
              categories={categories}
            />
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <h3 className="text-lg font-semibold">جميع العناصر المحفوظة</h3>
            
            {vaultItems.passwordEntries.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  كلمات المرور ({vaultItems.passwordEntries.length})
                </h4>
                <ItemsList
                  items={vaultItems.passwordEntries}
                  type="password"
                  isLoading={isLoading}
                  categories={categories}
                />
              </div>
            )}

            {vaultItems.secureNotes.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  الملاحظات الآمنة ({vaultItems.secureNotes.length})
                </h4>
                <ItemsList
                  items={vaultItems.secureNotes}
                  type="note"
                  isLoading={isLoading}
                  categories={categories}
                />
              </div>
            )}

            {vaultItems.creditCards.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  بطاقات الائتمان ({vaultItems.creditCards.length})
                </h4>
                <ItemsList
                  items={vaultItems.creditCards}
                  type="card"
                  isLoading={isLoading}
                  categories={categories}
                />
              </div>
            )}

            {totalItems === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">لا توجد عناصر محفوظة</CardTitle>
                  <CardDescription className="text-center">
                    ابدأ بإضافة كلمات المرور أو الملاحظات الآمنة أو بطاقات الائتمان
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    جميع العناصر المضافة ستكون مشفرة وآمنة تماماً
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}