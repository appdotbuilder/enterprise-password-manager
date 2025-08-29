import { useState, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Lock, 
  FileText, 
  CreditCard,
  Calendar,
  Globe,
  User,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import type { 
  Vault, 
  SearchInput,
  PasswordEntry,
  SecureNote,
  CreditCard as CreditCardType
} from '../../../server/src/schema';

interface SearchItemsProps {
  vaults: Vault[];
}

// Stub type for search results since we can't import directly
type SearchResult = PasswordEntry | SecureNote | CreditCardType;

export function SearchItems({ vaults }: SearchItemsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchInput>({
    query: '',
    vault_id: undefined,
    category_id: undefined,
    type: undefined
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!searchQuery.trim()) {
      setError('يرجى إدخال كلمة للبحث');
      return;
    }

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await trpc.searchItems.query({
        ...searchFilters,
        query: searchQuery
      });
      
      // Since the API might return different types, we'll handle it as an array
      setSearchResults((results as unknown) as SearchResult[]);
    } catch (err) {
      console.error('Search failed:', err);
      setError('فشل في البحث. يرجى المحاولة مرة أخرى.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchFilters]);

  const handleFilterChange = (key: keyof SearchInput, value: string | number | undefined) => {
    setSearchFilters((prev: SearchInput) => {
      const newValue = value === 'all' ? undefined : value;
      return {
        ...prev,
        [key]: key === 'vault_id' && typeof newValue === 'string' ? parseInt(newValue) : newValue
      };
    });
  };

  const getItemIcon = (item: SearchResult) => {
    if ('encrypted_password' in item) return <Lock className="h-4 w-4 text-green-600" />;
    if ('encrypted_content' in item) return <FileText className="h-4 w-4 text-purple-600" />;
    if ('encrypted_card_number' in item) return <CreditCard className="h-4 w-4 text-orange-600" />;
    return <Search className="h-4 w-4 text-gray-600" />;
  };

  const getItemType = (item: SearchResult) => {
    if ('encrypted_password' in item) return 'كلمة مرور';
    if ('encrypted_content' in item) return 'ملاحظة آمنة';
    if ('encrypted_card_number' in item) return 'بطاقة ائتمان';
    return 'غير محدد';
  };

  const getItemDescription = (item: SearchResult) => {
    if ('encrypted_password' in item) {
      const passwordEntry = item as PasswordEntry;
      return passwordEntry.url || passwordEntry.username || 'كلمة مرور محفوظة';
    }
    if ('encrypted_content' in item) {
      return 'ملاحظة نصية مشفرة';
    }
    if ('encrypted_card_number' in item) {
      const creditCard = item as CreditCardType;
      return `بطاقة ${creditCard.cardholder_name}`;
    }
    return 'عنصر محفوظ';
  };

  const getVaultName = (vaultId: number) => {
    const vault = vaults.find((v: Vault) => v.id === vaultId);
    return vault?.name || 'خزنة غير معروفة';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            البحث في جميع العناصر المحفوظة
          </CardTitle>
          <CardDescription>
            ابحث عبر كلمات المرور والملاحظات وبطاقات الائتمان في جميع الخزائن
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search-query">البحث</Label>
                <Input
                  id="search-query"
                  placeholder="ابحث عن العنوان، المستخدم، الموقع، أو أي نص..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setSearchQuery(e.target.value)
                  }
                  className="text-right"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  بحث
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vault-filter">الخزنة</Label>
                <Select 
                  value={searchFilters.vault_id?.toString() || 'all'} 
                  onValueChange={(value) => 
                    handleFilterChange('vault_id', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger id="vault-filter">
                    <SelectValue placeholder="جميع الخزائن" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الخزائن</SelectItem>
                    {vaults.map((vault: Vault) => (
                      <SelectItem key={vault.id} value={vault.id.toString()}>
                        {vault.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type-filter">نوع العنصر</Label>
                <Select 
                  value={searchFilters.type || 'all'} 
                  onValueChange={(value) => 
                    handleFilterChange('type', value as 'password' | 'note' | 'credit_card' | undefined)
                  }
                >
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="جميع الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="password">كلمات المرور</SelectItem>
                    <SelectItem value="note">الملاحظات الآمنة</SelectItem>
                    <SelectItem value="credit_card">بطاقات الائتمان</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setSearchFilters({
                      query: '',
                      vault_id: undefined,
                      category_id: undefined,
                      type: undefined
                    });
                  }}
                  className="w-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  إعادة تعيين المرشحات
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              نتائج البحث
              {searchResults.length > 0 && (
                <Badge variant="secondary">
                  {searchResults.length} نتيجة
                </Badge>
              )}
            </CardTitle>
            {hasSearched && (
              <Badge variant="outline">
                البحث: "{searchQuery}"
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">جاري البحث...</p>
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                ابدأ البحث للعثور على العناصر المحفوظة
              </p>
              <p className="text-sm text-gray-500">
                يمكنك البحث في جميع الخزائن التي لديك حق الوصول إليها
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                لم يتم العثور على نتائج
              </p>
              <p className="text-sm text-gray-500">
                جرّب كلمات مختلفة أو قم بتعديل المرشحات
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((item: SearchResult) => (
                <Card key={`${item.id}-${'encrypted_password' in item ? 'password' : 'encrypted_content' in item ? 'note' : 'card'}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getItemIcon(item)}
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{item.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {getItemDescription(item)}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {item.created_at.toLocaleDateString('ar-SA')}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              {getVaultName(item.vault_id)}
                            </div>

                            {('url' in item && item.url) && (
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {item.url}
                              </div>
                            )}

                            {('username' in item && item.username) && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.username}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline">
                          {getItemType(item)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}