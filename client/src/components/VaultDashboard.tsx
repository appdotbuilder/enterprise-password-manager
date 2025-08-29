import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VaultManager } from '@/components/VaultManager';
import { ItemManager } from '@/components/ItemManager';
import { PasswordGenerator } from '@/components/PasswordGenerator';
import { SearchItems } from '@/components/SearchItems';
import { 
  Vault, 
  Lock, 
  Key, 
  Search, 
  Shield, 
  Users,
  FileText,
  CreditCard,
  Info
} from 'lucide-react';
import type { User, Vault as VaultType } from '../../../server/src/schema';

interface VaultDashboardProps {
  currentUser: User;
}

export function VaultDashboard({ currentUser }: VaultDashboardProps) {
  const [vaults, setVaults] = useState<VaultType[]>([]);
  const [selectedVault, setSelectedVault] = useState<VaultType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('vaults');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's vaults
  const loadVaults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userVaults = await trpc.getUserVaults.query({ userId: currentUser.id });
      setVaults(userVaults);
      
      // Select first vault if available
      if (userVaults.length > 0 && !selectedVault) {
        setSelectedVault(userVaults[0]);
      }
    } catch (err) {
      console.error('Failed to load vaults:', err);
      setError('فشل في تحميل الخزائن');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, selectedVault]);

  useEffect(() => {
    loadVaults();
  }, [loadVaults]);

  const handleVaultCreated = useCallback((newVault: VaultType) => {
    setVaults((prev: VaultType[]) => [...prev, newVault]);
    setSelectedVault(newVault);
  }, []);

  const handleVaultSelected = useCallback((vault: VaultType) => {
    setSelectedVault(vault);
    setActiveTab('items');
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Dashboard Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الخزائن</CardTitle>
            <Vault className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaults.length}</div>
            <p className="text-xs text-muted-foreground">
              خزائن تحت إدارتك
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">كلمات المرور</CardTitle>
            <Lock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              كلمات مرور محفوظة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الملاحظات الآمنة</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              ملاحظات مشفرة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بطاقات الائتمان</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              بطاقات محفوظة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="vaults" className="flex items-center gap-2">
            <Vault className="h-4 w-4" />
            الخزائن
          </TabsTrigger>
          <TabsTrigger value="items" disabled={!selectedVault}>
            <Lock className="h-4 w-4" />
            العناصر
          </TabsTrigger>
          <TabsTrigger value="generator">
            <Key className="h-4 w-4" />
            مولد كلمات المرور
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4" />
            البحث
          </TabsTrigger>
          <TabsTrigger value="sharing">
            <Users className="h-4 w-4" />
            المشاركة
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="vaults" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">إدارة الخزائن</h2>
              <Badge variant="secondary">{vaults.length} خزائن</Badge>
            </div>
            <VaultManager 
              currentUser={currentUser}
              vaults={vaults}
              onVaultCreated={handleVaultCreated}
              onVaultSelected={handleVaultSelected}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            {selectedVault ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">إدارة العناصر</h2>
                    <p className="text-gray-600">الخزنة: {selectedVault.name}</p>
                  </div>
                  <Badge variant="outline">
                    <Shield className="h-3 w-3 mr-1" />
                    مشفر
                  </Badge>
                </div>
                <ItemManager 
                  currentUser={currentUser}
                  selectedVault={selectedVault}
                />
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>لا توجد خزنة محددة</CardTitle>
                  <CardDescription>
                    يرجى تحديد خزنة من تبويب "الخزائن" لعرض وإدارة العناصر
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setActiveTab('vaults')}>
                    انتقل إلى الخزائن
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">مولد كلمات المرور</h2>
              <Badge variant="secondary">آمن وقوي</Badge>
            </div>
            <PasswordGenerator />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">البحث المتقدم</h2>
              <Badge variant="secondary">البحث في جميع الخزائن</Badge>
            </div>
            <SearchItems vaults={vaults} />
          </TabsContent>

          <TabsContent value="sharing" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">مشاركة الخزائن</h2>
              <Badge variant="secondary">إدارة الفرق</Badge>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>مشاركة الخزائن مع الفريق</CardTitle>
                <CardDescription>
                  قم بمشاركة الخزائن مع أعضاء الفريق وإدارة الأذونات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  هذه الميزة قيد التطوير. ستتمكن قريباً من مشاركة الخزائن مع زملائك
                  والتحكم في أذونات الوصول (قراءة، كتابة، إدارة).
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}