import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';

interface LoginFormProps {
  onLogin: (email: string, password: string, twoFactorToken?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function LoginForm({ onLogin, isLoading, error }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorToken: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [show2FAField, setShow2FAField] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await onLogin(
        formData.email, 
        formData.password, 
        formData.twoFactorToken || undefined
      );
    } catch (err) {
      // Error is handled by parent component
      console.error('Login error:', err);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, password: e.target.value }));
  };

  const handle2FATokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, twoFactorToken: e.target.value }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        <CardDescription>
          ادخل بياناتك للوصول إلى حسابك الآمن
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              placeholder="أدخل بريدك الإلكتروني"
              value={formData.email}
              onChange={handleEmailChange}
              required
              disabled={isLoading}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="أدخل كلمة المرور"
                value={formData.password}
                onChange={handlePasswordChange}
                required
                disabled={isLoading}
                className="text-right pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {show2FAField && (
            <div className="space-y-2">
              <Label htmlFor="twoFactorToken">رمز التحقق الثنائي</Label>
              <Input
                id="twoFactorToken"
                type="text"
                placeholder="أدخل الرمز المكون من 6 أرقام"
                value={formData.twoFactorToken}
                onChange={handle2FATokenChange}
                maxLength={6}
                disabled={isLoading}
                className="text-center text-lg tracking-widest"
              />
            </div>
          )}

          <div className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
            
            {!show2FAField && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setShow2FAField(true)}
                disabled={isLoading}
              >
                لديّ رمز التحقق الثنائي
              </Button>
            )}
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>لا تملك حساب؟</p>
          <p className="text-blue-600 cursor-pointer hover:underline mt-1">
            تواصل مع مدير النظام لإنشاء حساب
          </p>
        </div>
      </CardContent>
    </Card>
  );
}