import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  FileText, 
  CreditCard, 
  Eye, 
  EyeOff, 
  Copy, 
  Globe,
  User,
  Calendar,
  Folder,
  Check,
  AlertTriangle
} from 'lucide-react';
import type { 
  PasswordEntry, 
  SecureNote, 
  CreditCard as CreditCardType,
  Category 
} from '../../../server/src/schema';

type ItemType = PasswordEntry | SecureNote | CreditCardType;

interface ItemsListProps {
  items: ItemType[];
  type: 'password' | 'note' | 'card';
  isLoading: boolean;
  categories: Category[];
}

export function ItemsList({ items, type, isLoading, categories }: ItemsListProps) {
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const togglePasswordVisibility = (itemId: number) => {
    setVisiblePasswords((prev: Set<number>) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleCopy = async (text: string, itemId: number, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const copyKey = `${itemId}-${field}`;
      setCopiedItems((prev: Set<string>) => new Set([...prev, copyKey]));
      setTimeout(() => {
        setCopiedItems((prev: Set<string>) => {
          const newSet = new Set(prev);
          newSet.delete(copyKey);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return null;
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.name || null;
  };

  const getIcon = () => {
    switch (type) {
      case 'password': return <Lock className="h-5 w-5 text-green-600" />;
      case 'note': return <FileText className="h-5 w-5 text-purple-600" />;
      case 'card': return <CreditCard className="h-5 w-5 text-orange-600" />;
      default: return <Lock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEmptyMessage = () => {
    switch (type) {
      case 'password': return 'لا توجد كلمات مرور محفوظة في هذه الخزنة';
      case 'note': return 'لا توجد ملاحظات آمنة محفوظة في هذه الخزنة';
      case 'card': return 'لا توجد بطاقات ائتمان محفوظة في هذه الخزنة';
      default: return 'لا توجد عناصر محفوظة';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
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
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          {getIcon()}
          <p className="text-gray-600 mt-4 mb-2">{getEmptyMessage()}</p>
          <p className="text-sm text-gray-500">
            استخدم زر "إضافة" أعلاه لبدء حفظ {type === 'password' ? 'كلمات المرور' : type === 'note' ? 'الملاحظات' : 'البطاقات'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item: ItemType) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getIcon()}
                <div>
                  <h3 className="font-medium text-lg">{item.title}</h3>
                  {getCategoryName(item.category_id) && (
                    <Badge variant="secondary" className="mt-1">
                      <Folder className="h-3 w-3 mr-1" />
                      {getCategoryName(item.category_id)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {item.created_at.toLocaleDateString('ar-SA')}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {type === 'password' && 'encrypted_password' in item && (
              <div className="space-y-3">
                {item.username && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{item.username}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(item.username!, item.id, 'username')}
                      className="h-6 w-6"
                    >
                      {copiedItems.has(`${item.id}-username`) ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-mono">
                      {visiblePasswords.has(item.id) 
                        ? '••••••••••••' // Stub - in real app this would decrypt
                        : '••••••••••••'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePasswordVisibility(item.id)}
                      className="h-6 w-6"
                    >
                      {visiblePasswords.has(item.id) ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy('••••••••••••', item.id, 'password')}
                      className="h-6 w-6"
                    >
                      {copiedItems.has(`${item.id}-password`) ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {item.url && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {item.url}
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(item.url!, item.id, 'url')}
                      className="h-6 w-6"
                    >
                      {copiedItems.has(`${item.id}-url`) ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}

                {item.notes && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">{item.notes}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'note' && 'encrypted_content' in item && (
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    [محتوى مشفر - سيتم فك التشفير عند التطبيق الكامل]
                  </p>
                </div>
              </div>
            )}

            {type === 'card' && 'encrypted_card_number' in item && (
              <div className="space-y-3">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">صاحب البطاقة:</span>
                      <div className="font-medium">{item.cardholder_name}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">انتهاء الصلاحية:</span>
                      <div className="font-medium">{item.expiry_month}/{item.expiry_year}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">رقم البطاقة:</span>
                      <div className="font-mono">**** **** **** ****</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stub implementation note */}
            <Alert className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ملاحظة: البيانات المعروضة هي بيانات تجريبية. في التطبيق النهائي، سيتم فك تشفير البيانات الفعلية.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}