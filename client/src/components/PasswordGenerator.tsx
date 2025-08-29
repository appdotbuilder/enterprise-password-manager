import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Key, 
  Copy, 
  RefreshCw, 
  Shield, 
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import type { GeneratePasswordInput, GeneratedPassword } from '../../../server/src/schema';

export function PasswordGenerator() {
  const [settings, setSettings] = useState<GeneratePasswordInput>({
    length: 16,
    include_uppercase: true,
    include_lowercase: true,
    include_numbers: true,
    include_symbols: true,
    exclude_ambiguous: false
  });
  
  const [generatedPassword, setGeneratedPassword] = useState<GeneratedPassword | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setIsCopied(false);

    try {
      const result = await trpc.generatePassword.mutate(settings);
      setGeneratedPassword(result);
    } catch (err) {
      console.error('Failed to generate password:', err);
      setError('فشل في توليد كلمة المرور. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedPassword?.password) return;

    try {
      await navigator.clipboard.writeText(generatedPassword.password);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleSettingChange = (key: keyof GeneratePasswordInput, value: boolean | number) => {
    setSettings((prev: GeneratePasswordInput) => ({
      ...prev,
      [key]: value
    }));
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-orange-500';
      case 'good': return 'bg-yellow-500';
      case 'strong': return 'bg-blue-500';
      case 'very_strong': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak': return 'ضعيف';
      case 'fair': return 'مقبول';
      case 'good': return 'جيد';
      case 'strong': return 'قوي';
      case 'very_strong': return 'قوي جداً';
      default: return 'غير محدد';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              إعدادات التوليد
            </CardTitle>
            <CardDescription>
              خصص إعدادات كلمة المرور حسب احتياجاتك
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Password Length */}
            <div className="space-y-3">
              <Label>طول كلمة المرور: {settings.length}</Label>
              <Slider
                value={[settings.length]}
                onValueChange={(value) => handleSettingChange('length', value[0])}
                min={4}
                max={128}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>4</span>
                <span>128</span>
              </div>
            </div>

            {/* Character Options */}
            <div className="space-y-4">
              <Label>أنواع الأحرف المتضمنة:</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="uppercase"
                    checked={settings.include_uppercase}
                    onCheckedChange={(checked) => 
                      handleSettingChange('include_uppercase', checked as boolean)
                    }
                  />
                  <Label htmlFor="uppercase" className="text-sm">
                    أحرف كبيرة (A-Z)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lowercase"
                    checked={settings.include_lowercase}
                    onCheckedChange={(checked) => 
                      handleSettingChange('include_lowercase', checked as boolean)
                    }
                  />
                  <Label htmlFor="lowercase" className="text-sm">
                    أحرف صغيرة (a-z)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="numbers"
                    checked={settings.include_numbers}
                    onCheckedChange={(checked) => 
                      handleSettingChange('include_numbers', checked as boolean)
                    }
                  />
                  <Label htmlFor="numbers" className="text-sm">
                    أرقام (0-9)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="symbols"
                    checked={settings.include_symbols}
                    onCheckedChange={(checked) => 
                      handleSettingChange('include_symbols', checked as boolean)
                    }
                  />
                  <Label htmlFor="symbols" className="text-sm">
                    رموز خاصة (!@#$%^&*)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclude-ambiguous"
                    checked={settings.exclude_ambiguous}
                    onCheckedChange={(checked) => 
                      handleSettingChange('exclude_ambiguous', checked as boolean)
                    }
                  />
                  <Label htmlFor="exclude-ambiguous" className="text-sm">
                    استبعاد الأحرف المتشابهة (0, O, l, I)
                  </Label>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'جاري التوليد...' : 'توليد كلمة مرور'}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              كلمة المرور المُولدة
            </CardTitle>
            <CardDescription>
              كلمة مرور آمنة وقوية مُولدة عشوائياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {generatedPassword ? (
              <>
                {/* Password Display */}
                <div className="space-y-3">
                  <Label>كلمة المرور:</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedPassword.password}
                      readOnly
                      className="font-mono text-lg bg-gray-50"
                    />
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="icon"
                      disabled={isCopied}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {isCopied && (
                    <p className="text-sm text-green-600">
                      تم نسخ كلمة المرور إلى الحافظة!
                    </p>
                  )}
                </div>

                {/* Password Strength */}
                <div className="space-y-2">
                  <Label>قوة كلمة المرور:</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getStrengthColor(generatedPassword.strength)}`}
                        style={{
                          width: generatedPassword.strength === 'weak' ? '20%' :
                                 generatedPassword.strength === 'fair' ? '40%' :
                                 generatedPassword.strength === 'good' ? '60%' :
                                 generatedPassword.strength === 'strong' ? '80%' : '100%'
                        }}
                      />
                    </div>
                    <Badge 
                      variant="secondary"
                      className={`${getStrengthColor(generatedPassword.strength)} text-white`}
                    >
                      {getStrengthText(generatedPassword.strength)}
                    </Badge>
                  </div>
                </div>

                {/* Password Analysis */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    تحليل كلمة المرور
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">الطول: </span>
                      <span className="font-medium">{generatedPassword.password.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">الأحرف الفريدة: </span>
                      <span className="font-medium">
                        {new Set(generatedPassword.password.split('')).size}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Generate New Password */}
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  توليد كلمة مرور جديدة
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <Key className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  اضغط على "توليد كلمة مرور" لإنشاء كلمة مرور آمنة
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            نصائح لكلمات المرور الآمنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">أفضل الممارسات:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• استخدم كلمات مرور فريدة لكل حساب</li>
                <li>• اختر طول 16 حرف على الأقل</li>
                <li>• اجمع بين الأحرف والأرقام والرموز</li>
                <li>• غيّر كلمات المرور بانتظام</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">تجنب:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• المعلومات الشخصية</li>
                <li>• الكلمات الموجودة في القاموس</li>
                <li>• التكرار المفرط للأحرف</li>
                <li>• مشاركة كلمات المرور</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}