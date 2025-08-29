import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { VaultDashboard } from '@/components/VaultDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Users, Key, Search } from 'lucide-react';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for existing session on mount (stub implementation)
  useEffect(() => {
    // In a real implementation, this would check for stored auth token
    // and validate it with the server
    const checkAuthStatus = async () => {
      try {
        // Stub: Check if user data exists in localStorage
        const storedUser = localStorage.getItem('password-manager-user');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogin = useCallback(async (email: string, password: string, twoFactorToken?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await trpc.authenticateUser.mutate({
        email,
        password,
        two_factor_token: twoFactorToken
      });

      if (user) {
        setCurrentUser(user);
        // Store user session (stub implementation)
        localStorage.setItem('password-manager-user', JSON.stringify(user));
      } else {
        setError('بيانات الدخول غير صحيحة');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError('فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('password-manager-user');
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-6">
                <Shield className="h-16 w-16 text-blue-600 mr-4" />
                <h1 className="text-4xl font-bold text-gray-900">نظام إدارة كلمات المرور</h1>
              </div>
              <p className="text-xl text-gray-600">
                حلول أمان متقدمة للمؤسسات المتوسطة
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Login Form */}
              <div>
                <LoginForm 
                  onLogin={handleLogin} 
                  isLoading={isLoading}
                  error={error}
                />
              </div>

              {/* Features Overview */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">ميزات النظام</h2>
                
                <div className="grid gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Lock className="h-5 w-5 text-blue-600 mr-2" />
                        تشفير متقدم
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        تشفير AES-256 لحماية جميع البيانات الحساسة
                      </CardDescription>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Users className="h-5 w-5 text-green-600 mr-2" />
                        مشاركة الفرق
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        مشاركة آمنة للخزائن مع التحكم في الأذونات
                      </CardDescription>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Key className="h-5 w-5 text-purple-600 mr-2" />
                        مولد كلمات المرور
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        إنشاء كلمات مرور قوية وآمنة تلقائياً
                      </CardDescription>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Search className="h-5 w-5 text-orange-600 mr-2" />
                        البحث المتقدم
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        بحث سريع وشامل عبر جميع العناصر المحفوظة
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">مدير كلمات المرور</h1>
                <p className="text-sm text-gray-600">أهلاً بك، {currentUser.first_name}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-4 py-8">
        <VaultDashboard currentUser={currentUser} />
      </main>
    </div>
  );
}

export default App;