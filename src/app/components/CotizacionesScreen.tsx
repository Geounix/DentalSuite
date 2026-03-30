import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import {
  Plus, Trash2, Download, FileText,
  CheckCircle, Clock, X, RefreshCw, Search, Eye, Info
} from 'lucide-react';
import { getCotizaciones, createCotizacion, deleteCotizacion, getPatients, getCatalogProcedures, getClinicSettings } from '../lib/api';
import html2pdf from 'html2pdf.js';

interface QuoteItem { name: string; description?: string; quantity: number; price: number }
interface Cotizacion {
  id: number;
  patientId: number;
  patientName: string;
  title: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: string;
  validUntil?: string;
  notes?: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', approved: 'Aprobada', partial: 'Pago parcial', paid: 'Pagada', cancelled: 'Cancelada'
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  partial: 'bg-purple-100 text-purple-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

export function CotizacionesScreen() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Cotizacion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New quote form
  const [form, setForm] = useState<{
    patientId: string; title: string; discount: string; tax: string; notes: string; validUntil: string;
  }>({ patientId: '', title: '', discount: '0', tax: '0', notes: '', validUntil: '' });
  const [items, setItems] = useState<QuoteItem[]>([{ name: '', description: '', quantity: 1, price: 0 }]);

  const load = async () => {
    try {
      setLoading(true);
      const [cotzRes, patsRes, catRes, settRes] = await Promise.all([
        getCotizaciones(),
        getPatients(),
        getCatalogProcedures({ limit: 2000 }).catch(() => ({ catalog: [] })),
        getClinicSettings().catch(() => null),
      ]);
      setCotizaciones(cotzRes.cotizaciones || []);
      setPatients(patsRes.patients || []);
      setCatalog(catRes.catalog || []);
      if (settRes?.settings) setClinicSettings(settRes.settings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
  const discount = Number(form.discount) || 0;
  const tax = Number(form.tax) || 0;
  const total = subtotal - discount + tax;

  const handleAddItem = () => setItems(prev => [...prev, { name: '', description: '', quantity: 1, price: 0 }]);
  const handleRemoveItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const handleItemChange = (idx: number, field: keyof QuoteItem, value: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: field === 'price' || field === 'quantity' ? Number(value) : value } : item));
  };
  const handleCatalogSelect = (idx: number, procName: string) => {
    const proc = catalog.find(c => c.name === procName);
    if (proc) {
      setItems(prev => prev.map((item, i) => i === idx ? { ...item, name: proc.name, price: proc.price } : item));
    }
  };

  const handleCreate = async () => {
    if (!form.patientId) { setError('Selecciona un paciente.'); return; }
    if (!form.title.trim()) { setError('El título es obligatorio.'); return; }
    if (items.some(i => !i.name.trim() || i.price <= 0)) { setError('Todos los ítems deben tener nombre y precio.'); return; }
    try {
      setSaving(true);
      setError(null);
      const res = await createCotizacion({
        patientId: Number(form.patientId),
        title: form.title,
        items,
        discount: Number(form.discount) || 0,
        tax: Number(form.tax) || 0,
        notes: form.notes || undefined,
        validUntil: form.validUntil || undefined,
      });
      setCotizaciones(prev => [{ ...res.cotizacion, patientName: patients.find(p => p.id === res.cotizacion.patientId)?.name || '' }, ...prev]);
      setIsNewOpen(false);
      setForm({ patientId: '', title: '', discount: '0', tax: '0', notes: '', validUntil: '' });
      setItems([{ name: '', description: '', quantity: 1, price: 0 }]);
    } catch (e) {
      setError('Error al crear la cotización.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    try {
      await deleteCotizacion(id);
      setCotizaciones(prev => prev.filter(c => c.id !== id));
      if (selected?.id === id) { setSelected(null); setIsDetailOpen(false); }
    } catch { alert('Error al eliminar.'); }
  };

  const handleDownloadPDF = async (c: Cotizacion) => {
    const clinicName = clinicSettings?.name || 'DentaCare';
    const dateStr = new Date(c.createdAt).toLocaleDateString('es-DO');
    const validStr = c.validUntil ? new Date(c.validUntil).toLocaleDateString('es-DO') : 'N/A';
    const rowsHtml = c.items.map((item: QuoteItem) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 12px;font-weight:500;color:#374151;">${item.name}</td>
        <td style="padding:10px 12px;color:#6b7280;font-size:12px;">${item.description || '—'}</td>
        <td style="padding:10px 12px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(item.price)}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;">${fmt(item.price * item.quantity)}</td>
      </tr>
    `).join('');
    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827;padding:32px;width:190mm;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #e5e7eb;padding-bottom:20px;margin-bottom:28px;">
          <div>
            <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;text-transform:uppercase;">${clinicName}</h1>
            <p style="margin:0;font-size:13px;color:#6b7280;">Cotización de Servicios Odontológicos</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0;font-weight:700;font-size:16px;color:#3b82f6;">COT-${String(c.id).padStart(4,'0')}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Fecha: ${dateStr}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Válida hasta: ${validStr}</p>
          </div>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:28px;">
          <p style="margin:0;font-size:15px;font-weight:700;">${c.title}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Paciente:</strong> ${c.patientName}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #d1d5db;">Servicio</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #d1d5db;">Descripción</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #d1d5db;">Cant.</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #d1d5db;">Precio</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #d1d5db;">Total</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
          <div style="min-width:240px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <span style="font-size:13px;color:#6b7280;">Subtotal</span>
              <span style="font-size:13px;font-weight:600;">${fmt(c.subtotal)}</span>
            </div>
            ${c.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <span style="font-size:13px;color:#6b7280;">Descuento</span>
              <span style="font-size:13px;font-weight:600;color:#ef4444;">-${fmt(c.discount)}</span>
            </div>` : ''}
            ${c.tax > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <span style="font-size:13px;color:#6b7280;">ITBIS</span>
              <span style="font-size:13px;font-weight:600;">${fmt(c.tax)}</span>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:12px 16px;background:#3b82f6;">
              <span style="font-size:15px;font-weight:700;color:#fff;">TOTAL</span>
              <span style="font-size:18px;font-weight:800;color:#fff;">${fmt(c.total)}</span>
            </div>
            ${c.amountPaid > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 16px;background:#ecfdf5;">
              <span style="font-size:13px;color:#059669;">Pagado</span>
              <span style="font-size:13px;font-weight:600;color:#059669;">${fmt(c.amountPaid)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#fef3c7;">
              <span style="font-size:13px;color:#92400e;">Saldo pendiente</span>
              <span style="font-size:13px;font-weight:700;color:#92400e;">${fmt(c.total - c.amountPaid)}</span>
            </div>` : ''}
          </div>
        </div>
        ${c.notes ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#374151;">NOTAS</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">${c.notes}</p>
        </div>` : ''}
        <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;font-style:italic;">Esta cotización es de carácter informativo. Válida por 30 días desde su emisión. Precios sujetos a cambios.</p>
        </div>
      </div>
    `;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.innerHTML = html;
    document.body.appendChild(container);
    try {
      await html2pdf().set({
        margin: [8, 8, 8, 8],
        filename: `Cotizacion_${String(c.id).padStart(4,'0')}_${(c.patientName || '').replace(/\s+/g,'_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(container.firstElementChild as HTMLElement).save();
    } finally {
      document.body.removeChild(container);
    }
  };

  const filtered = cotizaciones.filter(c =>
    (c.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalCotizado = cotizaciones.reduce((s, c) => s + c.total, 0);
  const totalCobrado = cotizaciones.reduce((s, c) => s + c.amountPaid, 0);
  const totalPendiente = totalCotizado - totalCobrado;
  const totalPagadas = cotizaciones.filter(c => c.status === 'paid').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-500 mt-1 text-sm">Genera y gestiona cotizaciones para tus pacientes</p>
        </div>
        <Button onClick={() => { setError(null); setIsNewOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nueva Cotización
        </Button>
      </div>

      {/* Payments info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>Para registrar pagos contra una cotización, ve a <strong>Contabilidad → Pagos</strong> y activa la opción <em>"Vincular a cotización"</em>.</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cotizado', value: fmt(totalCotizado), color: 'text-blue-600', bg: 'bg-blue-50', icon: FileText },
          { label: 'Total Cobrado', value: fmt(totalCobrado), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
          { label: 'Pendiente', value: fmt(totalPendiente), color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Pagadas', value: String(totalPagadas), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                  </div>
                  <div className={`w-10 h-10 ${kpi.bg} rounded-full flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de Cotizaciones</CardTitle>
              <CardDescription>{cotizaciones.length} cotizaciones registradas</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No hay cotizaciones {search ? 'con ese criterio' : 'aún'}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Nº</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Paciente</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Título</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Pagado</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Pendiente</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const pend = c.total - c.amountPaid;
                    return (
                      <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-gray-500">COT-{String(c.id).padStart(4,'0')}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{c.patientName}</td>
                        <td className="py-3 px-4 text-gray-700 max-w-48 truncate">{c.title}</td>
                        <td className="py-3 px-4 text-gray-500">{new Date(c.createdAt).toLocaleDateString('es-DO')}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">{fmt(c.total)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-medium">{fmt(c.amountPaid)}</td>
                        <td className={`py-3 px-4 text-right font-medium ${pend > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(pend)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[c.status] || 'bg-gray-100 text-gray-700'}`}>
                            {STATUS_LABEL[c.status] || c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Ver detalle"
                              onClick={() => { setSelected(c); setIsDetailOpen(true); }}>
                              <Eye className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Descargar PDF"
                              onClick={() => handleDownloadPDF(c)}>
                              <Download className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Eliminar"
                              onClick={() => handleDelete(c.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── NEW COTIZACION MODAL ── */}
      <Dialog open={isNewOpen} onOpenChange={v => { setIsNewOpen(v); if (!v) setError(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cotización</DialogTitle>
            <DialogDescription>Completa los datos para generar una cotización para el paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paciente *</Label>
                <select className="w-full border rounded-md h-10 px-3 text-sm mt-1" value={form.patientId}
                  onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}>
                  <option value="">Seleccionar paciente…</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Título *</Label>
                <Input className="mt-1" placeholder="ej. Plan de tratamiento completo" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Servicios / Procedimientos</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3 bg-gray-50">
                    <div className="col-span-4">
                      <Label className="text-xs">Servicio *</Label>
                      <select className="w-full border rounded-md h-9 px-2 text-xs mt-0.5 bg-white"
                        value={item.name}
                        onChange={e => handleCatalogSelect(idx, e.target.value)}>
                        <option value="">Del catálogo…</option>
                        {catalog.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      <Input className="mt-1 h-8 text-xs" placeholder="O escribe aquí" value={item.name}
                        onChange={e => handleItemChange(idx, 'name', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Descripción</Label>
                      <Input className="h-8 text-xs mt-0.5" value={item.description || ''}
                        onChange={e => handleItemChange(idx, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Cant.</Label>
                      <Input type="number" min={1} className="h-8 text-xs mt-0.5" value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Precio ($)</Label>
                      <Input type="number" min={0} className="h-8 text-xs mt-0.5" value={item.price}
                        onChange={e => handleItemChange(idx, 'price', e.target.value)} />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400"
                        onClick={() => handleRemoveItem(idx)} disabled={items.length === 1}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="col-span-12 text-right text-xs text-gray-500">
                      Subtotal: <span className="font-semibold text-gray-800">{fmt(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount / Tax / Total */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Descuento ($)</Label>
                <Input type="number" min={0} className="mt-1" value={form.discount}
                  onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
              </div>
              <div>
                <Label>ITBIS ($)</Label>
                <Input type="number" min={0} className="mt-1" value={form.tax}
                  onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} />
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex flex-col justify-center">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-blue-600">{fmt(total)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Válida hasta</Label>
                <Input type="date" className="mt-1" value={form.validUntil}
                  onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea className="mt-1 resize-none" rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales…" />
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Guardando…' : 'Crear Cotización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL MODAL ── */}
      <Dialog open={isDetailOpen} onOpenChange={v => { setIsDetailOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  COT-{String(selected.id).padStart(4,'0')}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </DialogTitle>
                <DialogDescription>{selected.title} · {selected.patientName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3">Servicio</th>
                      <th className="text-center py-2 px-3">Cant.</th>
                      <th className="text-right py-2 px-3">Precio</th>
                      <th className="text-right py-2 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.items || []).map((item: QuoteItem, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-3"><p className="font-medium">{item.name}</p>{item.description && <p className="text-xs text-gray-500">{item.description}</p>}</td>
                        <td className="py-2 px-3 text-center">{item.quantity}</td>
                        <td className="py-2 px-3 text-right">{fmt(item.price)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmt(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end">
                  <div className="w-60 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(selected.subtotal)}</span></div>
                    {selected.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Descuento</span><span className="text-red-500">-{fmt(selected.discount)}</span></div>}
                    {selected.tax > 0 && <div className="flex justify-between"><span className="text-gray-500">ITBIS</span><span>{fmt(selected.tax)}</span></div>}
                    <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span className="text-blue-600">{fmt(selected.total)}</span></div>
                    <div className="flex justify-between text-emerald-600"><span>Pagado</span><span>{fmt(selected.amountPaid)}</span></div>
                    <div className="flex justify-between font-semibold text-amber-600"><span>Pendiente</span><span>{fmt(selected.total - selected.amountPaid)}</span></div>
                  </div>
                </div>
                {selected.notes && <p className="text-sm text-gray-500 italic">📝 {selected.notes}</p>}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => handleDownloadPDF(selected)}>
                  <Download className="w-4 h-4 mr-2" /> Descargar PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
