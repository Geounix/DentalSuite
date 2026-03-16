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

  const apiHost = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
  const prefix = apiHost.replace(/\/$/, '');

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
        setSuccessMsg('Logo updated successfully! The page will need to be reloaded to show everywhere.');
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      setErrorMsg('Failed to upload logo.');
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
        setSuccessMsg('Settings updated successfully! Please reload the page to see changes in the sidebar.');
      }
    } catch (err) {
      console.error('Failed to update name', err);
      setErrorMsg('Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Cargando ajustes...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ajustes de la Clínica</h1>
        <p className="text-gray-600 mt-1">Configura el nombre y el logo principal del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
            <CardDescription>Cambia el nombre que aparece en la barra lateral superior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nombre de la Aplicación</Label>
              <Input
                id="clinicName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. DentaCare"
              />
            </div>

            <Button onClick={handleSaveName} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>

            {successMsg && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm mt-2 p-2 bg-emerald-50 rounded">
                <CheckCircle2 className="w-4 h-4" />
                <p>{successMsg}</p>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-2 p-2 bg-red-50 rounded">
                <p>{errorMsg}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo de la Clínica</CardTitle>
            <CardDescription>Sube un archivo de imagen (JPG, PNG) de máximo 5MB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
              {logoUrl ? (
                <img 
                  src={`${prefix}/uploads/${logoUrl.replace(/\\/g, '/')}`} 
                  alt="Clinic Logo" 
                  className="max-h-32 object-contain" 
                />
              ) : (
                <div className="text-center text-gray-500">
                  <p>Sin logo configurado</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUpload">Subir nuevo logo</Label>
              <Input
                id="logoUpload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
