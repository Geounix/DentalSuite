import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  TrendingDown, Plus, Search, Edit2, Trash2, DollarSign,
  Receipt, ReceiptText, ChevronDown, ChevronUp, Calculator
} from 'lucide-react';
import { getGastos, createGasto, updateGasto, deleteGasto, getClinicSettings } from '../lib/api';
import { useTranslation } from 'react-i18next';

const CATEGORIAS = [
  'Materiales dentales',
  'Servicios públicos',
  'Nómina',
  'Laboratorios',
  'Equipos y mantenimiento',
  'Alquiler',
  'Seguros',
  'Impuestos/ITBIS',
  'Marketing',
  'Otros',
];

interface Gasto {
  id: number;
  rnc?: string;
  proveedor: string;
  cliente?: string;
  nfc?: string;
  factura?: string;
  fecha: string;
  categoria?: string;
  cantidad: number;
  descuento: number;
  itbis: number;
  total: number;
  notas?: string;
}

const emptyForm = {
  rnc: '', proveedor: '', cliente: '', nfc: '', factura: '',
  fecha: new Date().toISOString().split('T')[0],
  categoria: '', cantidad: '', descuento: '', itbis: '', notas: '',
};

function calcTotal(cantidad: number, descuento: number, itbis: number) {
  return Math.max(0, cantidad - descuento + itbis);
}

export function GastosScreen() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [taxRate, setTaxRate] = useState(18);
  const { t } = useTranslation();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [res, settingsRes] = await Promise.all([
        getGastos({
          from: filterFrom || undefined,
          to: filterTo || undefined,
          categoria: filterCat || undefined,
        }),
        getClinicSettings().catch(() => null)
      ]);
      setGastos(res.gastos || []);
      if (settingsRes?.settings?.taxRate !== undefined) {
        setTaxRate(settingsRes.settings.taxRate);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo, filterCat]);

  useEffect(() => { load(); }, [load]);

  // Computed amounts from form fields
  const fCantidad = parseFloat(form.cantidad) || 0;
  const fDescuento = parseFloat(form.descuento) || 0;
  const fItbis = parseFloat(form.itbis) || 0;
  const fTotal = calcTotal(fCantidad, fDescuento, fItbis);

  // Auto-calculate ITBIS when cantidad or descuento changes
  const handleCantidadChange = (v: string) => {
    const cant = parseFloat(v) || 0;
    const desc = parseFloat(form.descuento) || 0;
    const base = Math.max(0, cant - desc);
    const itbis = parseFloat((base * (taxRate / 100)).toFixed(2));
    setForm(f => ({ ...f, cantidad: v, itbis: String(itbis) }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (g: Gasto) => {
    setEditingId(g.id);
    setForm({
      rnc: g.rnc || '', proveedor: g.proveedor, cliente: g.cliente || '',
      nfc: g.nfc || '', factura: g.factura || '',
      fecha: g.fecha.split('T')[0],
      categoria: g.categoria || '', cantidad: String(g.cantidad),
      descuento: String(g.descuento), itbis: String(g.itbis), notas: g.notas || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.proveedor.trim()) { setFormError('El proveedor es requerido.'); return; }
    if (!form.cantidad || fCantidad <= 0) { setFormError('La cantidad debe ser mayor a 0.'); return; }
    try {
      const payload = {
        rnc: form.rnc || undefined,
        proveedor: form.proveedor,
        cliente: form.cliente || undefined,
        nfc: form.nfc || undefined,
        factura: form.factura || undefined,
        fecha: form.fecha,
        categoria: form.categoria || undefined,
        cantidad: fCantidad,
        descuento: fDescuento,
        itbis: fItbis,
        total: fTotal,
        notas: form.notas || undefined,
      };
      if (editingId) {
        await updateGasto(editingId, payload);
      } else {
        await createGasto(payload);
      }
      setIsModalOpen(false);
      await load();
    } catch (err) {
      console.error(err);
      setFormError('Error al guardar. Intenta nuevamente.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteGasto(id);
      setDeleteConfirm(null);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter by search text (client-side)
  const filtered = gastos.filter(g =>
    !search ||
    g.proveedor.toLowerCase().includes(search.toLowerCase()) ||
    (g.cliente || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.factura || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.rnc || '').toLowerCase().includes(search.toLowerCase())
  );

  // KPIs
  const totalGastos = filtered.reduce((s, g) => s + g.total, 0);
  const totalItbis = filtered.reduce((s, g) => s + g.itbis, 0);
  const totalDescuento = filtered.reduce((s, g) => s + g.descuento, 0);
  const totalCantidad = filtered.reduce((s, g) => s + g.cantidad, 0);

  const fmt = (n: number) => `$${n.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  const footerRow = {
    cantidad: filtered.reduce((s, g) => s + g.cantidad, 0),
    descuento: filtered.reduce((s, g) => s + g.descuento, 0),
    itbis: filtered.reduce((s, g) => s + g.itbis, 0),
    total: filtered.reduce((s, g) => s + g.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-red-500" />
            {t('gastos.title')}
          </h1>
          <p className="text-gray-600 mt-1">{t('gastos.subtitle')}</p>
        </div>
        <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          {t('gastos.recordExpense')}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Gastos</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{fmt(totalGastos)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} registros</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Subtotal (Bruto)</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{fmt(totalCantidad)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Antes de descuentos</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Descuentos</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(totalDescuento)}</p>
                <p className="text-xs text-gray-400 mt-0.5">DESC. aplicados</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total ITBIS</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{fmt(totalItbis)}</p>
                <p className="text-xs text-gray-400 mt-0.5">18% incluido</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                <ReceiptText className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por proveedor, cliente, factura, RNC..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(f => !f)}
              className="gap-1"
            >
              Filtros {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-3 border-t pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="date" className="h-8 text-sm w-36" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" className="h-8 text-sm w-36" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoría</Label>
                <Select value={filterCat} onValueChange={setFilterCat}>
                  <SelectTrigger className="h-8 text-sm w-48"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" className="self-end text-gray-500"
                onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterCat(''); }}>
                Limpiar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-700">{t('gastos.accountsPayable')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-bold text-gray-700 uppercase">RNC</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase">Proveedor</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase">Cliente</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase">NFC</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase">Factura</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase">Fecha</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase">Categoría</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase text-right">Cantidad</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase text-right">DESC.</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase text-right">ITBIS</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase text-right">Total</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 uppercase text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-gray-400">Cargando gastos…</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-16">
                      <TrendingDown className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 font-medium">Sin gastos registrados</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-1" /> Registrar primer gasto
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(g => (
                    <TableRow key={g.id} className="hover:bg-gray-50 text-sm">
                      <TableCell className="font-mono text-xs text-gray-500">{g.rnc || '—'}</TableCell>
                      <TableCell className="font-semibold text-gray-900 max-w-[140px] truncate">{g.proveedor}</TableCell>
                      <TableCell className="text-gray-600 max-w-[120px] truncate">{g.cliente || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{g.nfc || '—'}</TableCell>
                      <TableCell className="text-gray-600">{g.factura || '—'}</TableCell>
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {new Date(g.fecha).toLocaleDateString('es-DO')}
                      </TableCell>
                      <TableCell>
                        {g.categoria ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                            {g.categoria}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-800">{fmt(g.cantidad)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{g.descuento > 0 ? fmt(g.descuento) : '—'}</TableCell>
                      <TableCell className="text-right text-amber-600">{g.itbis > 0 ? fmt(g.itbis) : '—'}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{fmt(g.total)}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-500 hover:bg-blue-50" onClick={() => openEdit(g)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-50" onClick={() => setDeleteConfirm(g.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer totals */}
          {filtered.length > 0 && (
            <div className="border-t bg-gray-50 grid grid-cols-12 gap-0 text-sm font-bold text-gray-700 px-4 py-3">
              <div className="col-span-7 uppercase text-xs text-gray-500 flex items-center">
                Totales ({filtered.length} registros)
              </div>
              <div className="text-right">{fmt(footerRow.cantidad)}</div>
              <div className="text-right text-emerald-600">{fmt(footerRow.descuento)}</div>
              <div className="text-right text-amber-600">{fmt(footerRow.itbis)}</div>
              <div className="text-right text-red-600 col-span-2 pr-16">{fmt(footerRow.total)}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              {editingId ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
            </DialogTitle>
            <DialogDescription>
              Completa los datos del gasto o compra realizada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            {/* RNC */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">RNC</Label>
              <Input placeholder="Ej. 131620388" value={form.rnc} onChange={e => setForm(f => ({ ...f, rnc: e.target.value }))} />
            </div>
            {/* Proveedor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Proveedor <span className="text-red-500">*</span></Label>
              <Input placeholder="Ej. Willy Dental" value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} />
            </div>
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Cliente</Label>
              <Input placeholder="Ej. Dental Suite" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} />
            </div>
            {/* NFC */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">NFC</Label>
              <Input placeholder="Ej. B0100012749" value={form.nfc} onChange={e => setForm(f => ({ ...f, nfc: e.target.value }))} />
            </div>
            {/* Factura */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Nº Factura</Label>
              <Input placeholder="Ej. 13424" value={form.factura} onChange={e => setForm(f => ({ ...f, factura: e.target.value }))} />
            </div>
            {/* Fecha */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Fecha <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            {/* Categoría */}
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Categoría</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Separator */}
            <div className="col-span-2 border-t pt-2 flex items-center gap-2 text-gray-500">
              <Calculator className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Montos</span>
            </div>

            {/* Cantidad */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Cantidad (Subtotal) <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input type="number" className="pl-6" placeholder="0.00" value={form.cantidad}
                  onChange={e => handleCantidadChange(e.target.value)} />
              </div>
            </div>
            {/* Descuento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Descuento (DESC.30%)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input type="number" className="pl-6" placeholder="0.00" value={form.descuento}
                  onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))} />
              </div>
            </div>
            {/* ITBIS (auto-calc) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">ITBIS ({taxRate}% auto)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input type="number" className="pl-6 bg-amber-50" placeholder="0.00" value={form.itbis}
                  onChange={e => setForm(f => ({ ...f, itbis: e.target.value }))} />
              </div>
            </div>
            {/* Total (calculated) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Total Calculado</Label>
              <div className="h-10 flex items-center border rounded-md bg-red-50 px-3 font-bold text-red-600 text-base">
                {fmt(fTotal)}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold text-gray-600 uppercase">Notas</Label>
              <Input placeholder="Observaciones adicionales..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{formError}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
              {editingId ? 'Guardar Cambios' : 'Registrar Gasto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Eliminar Gasto</DialogTitle>
            <DialogDescription>¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
