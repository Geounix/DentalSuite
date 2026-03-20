import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, Save, CheckCircle2 } from 'lucide-react';
import { getClinicSettings, updateClinicSettings, uploadLogo } from '../lib/api';

export function SettingsScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const apiHost = (import.meta as any).env.PROD ? '' : ((import.meta as any).env.VITE_API_URL || 'http://localhost:4000');
  const prefix = apiHost ? apiHost.replace(/\/$/, '') : '';

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res: any = await getClinicSettings();
        if (mounted && res?.settings) {
          setName(res.settings.name || '');
          setLogoUrl(res.settings.logoUrl || null);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
        setErrorMsg('Error loading settings.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res: any = await uploadLogo(file);
      if (res?.settings) {
        setLogoUrl(res.settings.logoUrl);
        setSuccessMsg(t('settings.logo.success'));
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      setErrorMsg(t('settings.errors.upload'));
    }
  };

  const handleSaveName = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res: any = await updateClinicSettings({ name });
      if (res?.settings) {
        setName(res.settings.name);
        setSuccessMsg(t('settings.general.success'));
      }
    } catch (err) {
      console.error('Failed to update name', err);
      setErrorMsg(t('settings.errors.save'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">{t('loading.user')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle>{t('settings.general.title')}</CardTitle>
            <CardDescription>{t('settings.general.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName" className="font-semibold">{t('settings.general.nameLabel')}</Label>
              <Input
                id="clinicName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.general.namePlaceholder')}
                className="h-11 border-gray-200"
              />
            </div>

            <Button onClick={handleSaveName} disabled={isSaving} className="h-11 bg-primary hover:opacity-90 transition-all font-semibold px-6">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? t('settings.general.saving') : t('settings.general.saveButton')}
            </Button>

            {successMsg && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <p>{successMsg}</p>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                <p>{errorMsg}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle>{t('settings.logo.title')}</CardTitle>
            <CardDescription>{t('settings.logo.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center p-8 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-xl relative overflow-hidden group">
              {logoUrl ? (
                <img 
                  src={`${prefix}/uploads/${logoUrl.replace(/\\/g, '/')}`} 
                  alt="Clinic Logo" 
                  className="max-h-32 object-contain transition-transform group-hover:scale-105" 
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Upload className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">{t('settings.logo.noLogo')}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUpload" className="font-semibold">{t('settings.logo.uploadLabel')}</Label>
              <Input
                id="logoUpload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="cursor-pointer file:bg-gray-100 file:border-0 file:rounded-md file:mr-4 file:px-3 file:py-1 border-gray-200"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
