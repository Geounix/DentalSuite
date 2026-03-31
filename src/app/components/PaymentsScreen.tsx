import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { StatusBadge } from './StatusBadge';
import { Wallet, Search, Eye, DollarSign, TrendingDown, Receipt, Printer, Plus, CheckCircle, X } from 'lucide-react';
import { getPayments, createPayment, getPatients, getClinicSettings, getCatalogProcedures, getCotizaciones, addCotizacionPayment } from '../lib/api';
import { getPaymentTransactions, createPaymentTransaction, updatePayment } from '../lib/api';
import { PaginationControl } from './PaginationControl';
import { SearchableSelect } from './SearchableSelect';
import html2pdf from 'html2pdf.js';

export interface PaymentItem {
  id?: number;
  name: string;
  price: number;
  quantity: number;
}

interface Payment {
  id: number;
  patient: string;
  patientId?: number;
  procedure: string;
  items?: PaymentItem[];
  date: string;
  originalAmount: number;
  insuranceCoverage: number;
  finalAmount: number;
  amountPaid: number;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'paid' | 'pending' | 'unpaid' | string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}

const METHOD_LABELS: Record<string, string> = {
  'credit-card': 'Tarjeta de Crédito',
  'debit-card': 'Tarjeta de Débito',
  'cash': 'Efectivo',
  'check': 'Cheque',
  'bank-transfer': 'Transferencia Bancaria',
};

export function PaymentsScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [installmentForm, setInstallmentForm] = useState({ amount: '', method: 'cash', transactionId: '', notes: '' });
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [catalogProcedures, setCatalogProcedures] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const calculatedTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const [paymentForm, setPaymentForm] = useState<any>({
    patientId: '',
    procedure: '',
    amount: '',
    insuranceCoverage: '',
    method: 'cash',
    transactionId: '',
    paymentType: 'full',
    paymentAmount: '',
    notes: ''
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  // Cotizaciones integration
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [fromQuote, setFromQuote] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  const filteredPayments = payments.filter(payment =>
    (payment.patient || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (payment.procedure || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const totalOutstanding = payments.reduce((sum, p) => sum + Math.max(0, (p.finalAmount ?? 0) - (p.amountPaid ?? 0)), 0);
  const totalInsuranceSavings = payments.reduce((sum, p) => sum + (p.insuranceCoverage ?? 0), 0);

  // load payments + patients + clinic settings
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoadingPayments(true);
        const [paysRes, patsRes, settingsRes, catRes, cotzRes] = await Promise.all([
          getPayments(),
          getPatients(),
          getClinicSettings().catch(() => null),
          getCatalogProcedures().catch(() => null),
          getCotizaciones().catch(() => ({ cotizaciones: [] })),
        ]);
        if (!mounted) return;
        setCotizaciones((cotzRes.cotizaciones || []).filter((c: any) => c.status !== 'paid' && c.status !== 'cancelled'));
        const pays = (paysRes.payments || []).map((p: any) => ({
          id: p.id,
          patient: p.patientName || `#${p.patientId}`,
          patientId: p.patientId,
          procedure: p.procedure || '',
          date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : (p.date || ''),
          originalAmount: Number(p.originalAmount) || 0,
          insuranceCoverage: Number(p.insuranceCoverage) || 0,
          finalAmount: Number(p.finalAmount) || 0,
          amountPaid: Number(p.amountPaid) || 0,
          status: String(p.status || 'unpaid').toLowerCase(),
          paymentMethod: p.paymentMethod,
          transactionId: p.transactionId,
          notes: p.notes || '',
        }));
        setPayments(pays);
        setPatientsList(patsRes.patients || []);
        setCatalogProcedures(catRes?.catalog || []);
        if (settingsRes?.settings) setClinicSettings(settingsRes.settings);
      } catch (err) {
        console.error('Failed loading payments', err);
      } finally {
        if (mounted) setLoadingPayments(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // listen for dashboard quick action to open record payment modal
  useEffect(() => {
    const onOpen = () => setIsRecordPaymentOpen(true);
    window.addEventListener('open:record-payment', onOpen as EventListener);
    return () => { window.removeEventListener('open:record-payment', onOpen as EventListener); };
  }, []);

  // load transactions for selected payment
  useEffect(() => {
    if (!selectedPayment) return;
    let mounted = true;
    async function loadTx() {
      try {
        setLoadingTransactions(true);
        const res = await getPaymentTransactions(selectedPayment!.id);
        if (!mounted) return;
        setPaymentTransactions(res.transactions || []);
      } catch (err) {
        console.error('Failed loading transactions', err);
      } finally {
        if (mounted) setLoadingTransactions(false);
      }
    }
    loadTx();
    return () => { mounted = false; };
  }, [selectedPayment]);

  const handleRecordPayment = async () => {
    setPaymentError(null);
    if (!paymentForm.patientId) { setPaymentError('Selecciona un paciente.'); return; }
    // If no catalog items are selected, require a manual amount
    if (selectedItems.length === 0 && (!paymentForm.amount || Number(paymentForm.amount) <= 0)) {
      setPaymentError('Ingresa el monto del tratamiento o selecciona procedimientos del catálogo.');
      return;
    }

    if ((paymentForm.method === 'credit-card' || paymentForm.method === 'debit-card') && paymentForm.paymentType !== 'owes' && !String(paymentForm.transactionId || '').trim()) {
      setPaymentError('El ID de transacción es requerido para pagos con tarjeta.');
      return;
    }

    try {
      const patientId = Number(paymentForm.patientId);
      const manualAmount = Number(paymentForm.amount) || 0;
      const originalAmount = selectedItems.length > 0 ? calculatedTotal : manualAmount;
      const insuranceCoverage = Number(paymentForm.insuranceCoverage) || 0;
      const finalAmount = originalAmount - insuranceCoverage;

      if (paymentForm.paymentType === 'partial') {
        const pa = Number(paymentForm.paymentAmount) || 0;
        if (!pa || pa <= 0) { setPaymentError('Ingresa el monto a pagar para pagos parciales.'); return; }
      }

      let amountPaid = 0;
      let status = 'unpaid';
      if (paymentForm.paymentType === 'full') {
        amountPaid = finalAmount;
        status = 'paid';
      } else if (paymentForm.paymentType === 'partial') {
        amountPaid = Number(paymentForm.paymentAmount) || 0;
        status = amountPaid >= finalAmount ? 'paid' : 'pending';
      } else if (paymentForm.paymentType === 'owes') {
        amountPaid = 0;
        status = 'unpaid';
      }

      const procedureNames = selectedItems.length > 0
        ? selectedItems.map(i => `${i.quantity}x ${i.name}`).join(', ')
        : (paymentForm.procedure || '');

      const payload: any = {
        patientId,
        procedure: procedureNames,
        items: selectedItems.length > 0 ? selectedItems : undefined,
        originalAmount,
        insuranceCoverage,
        amountPaid,
        paymentType: paymentForm.paymentType,
        paymentMethod: paymentForm.method,
        transactionId: paymentForm.transactionId || undefined,
        notes: paymentForm.notes,
        status,
        cotizacionId: selectedQuoteId ? Number(selectedQuoteId) : undefined
      };

      const res = await createPayment(payload);
      const created = res.payment || res;
      const newPayment: Payment = {
        id: created.id,
        patient: created.patientName || patientsList.find((p: any) => String(p.id) === String(created.patientId))?.name || `#${created.patientId}`,
        patientId: created.patientId,
        procedure: created.procedure || '',
        date: created.createdAt ? new Date(created.createdAt).toISOString().split('T')[0] : '',
        originalAmount: Number(created.originalAmount) || 0,
        insuranceCoverage: Number(created.insuranceCoverage) || 0,
        finalAmount: Number(created.finalAmount) || 0,
        amountPaid: Number(created.amountPaid) || 0,
        status: String(created.status || 'unpaid').toLowerCase() as any,
        paymentMethod: created.paymentMethod,
        transactionId: created.transactionId,
        notes: created.notes || '',
      };
      setPayments(prev => [newPayment, ...prev]);

      // ── If linked to a quote, update the quote's amountPaid/status ──────────
      if (selectedQuoteId && amountPaid > 0) {
        try {
          await addCotizacionPayment(Number(selectedQuoteId), amountPaid, paymentForm.notes || undefined);
          // Refresh cotizaciones list so the Cotizaciones screen reflects the change
          const freshCotz = await getCotizaciones().catch(() => ({ cotizaciones: [] }));
          setCotizaciones((freshCotz.cotizaciones || []).filter((c: any) => c.status !== 'paid' && c.status !== 'cancelled'));
        } catch (e) {
          console.error('Failed to update cotización after payment', e);
          // Non-blocking: payment was already recorded
        }
      }

      setPaymentForm({
        patientId: '', procedure: '', amount: '', insuranceCoverage: '',
        method: 'cash', transactionId: '', paymentType: 'full', paymentAmount: '', notes: ''
      });
      setSelectedItems([]);
      setSelectedQuoteId('');
      setFromQuote(false);
      setIsRecordPaymentOpen(false);
      setPaymentError(null);
    } catch (err) {
      console.error('Failed to create payment', err);
      setPaymentError('Error al registrar el pago. Intenta nuevamente.');
    }
  };

  // ── Invoice PDF Generation (Ticket / Receipt Style) ──────────────────
  const handlePrintInvoice = async (payment: Payment, transactions: any[]) => {
    setGeneratingInvoice(true);
    const dateStr = new Date(payment.date || new Date()).toLocaleDateString('es-DO', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const timeStr = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
    const clinicName = clinicSettings?.name || 'Clínica Dental';
    const balance = Math.max(0, payment.finalAmount - payment.amountPaid);
    const statusLabel: Record<string, string> = { paid: 'PAGADO', pending: 'PENDIENTE', unpaid: 'SIN PAGAR', partial: 'PARCIAL' };
    const st = String(payment.status).toLowerCase();

    // Elements
    const dotLine = `<div style="border-top:2px dotted #111;margin:8px 0;"></div>`;
    const dashLine = `<div style="border-top:1px dashed #111;margin:8px 0;"></div>`;

    let itemsHtml = '';
    if (payment.items && payment.items.length > 0) {
      itemsHtml = payment.items.map(item => `
        <div style="display:flex;justify-content:space-between;padding:3px 0;align-items:flex-end;">
          <span style="flex-grow:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.quantity > 1 ? item.quantity + 'x ' : ''}${item.name}</span>
          <span style="flex-shrink:0;padding-left:4px;border-bottom:1px dotted #ccc;margin-bottom:4px;flex-grow:1;"></span>
          <span style="flex-shrink:0;padding-left:8px;">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `).join('');
    } else {
      itemsHtml = `
        <div style="display:flex;justify-content:space-between;padding:3px 0;align-items:flex-end;">
          <span style="flex-grow:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${payment.procedure || 'Tratamiento'}</span>
          <span style="flex-shrink:0;padding-left:4px;border-bottom:1px dotted #ccc;margin-bottom:4px;flex-grow:1;"></span>
          <span style="flex-shrink:0;padding-left:8px;">$${payment.originalAmount.toFixed(2)}</span>
        </div>
      `;
    }

    const htmlContent = `
      <div style="font-family:'Segoe UI', Arial, sans-serif; color:#111; width:190mm; margin:0 auto; padding:20mm 15mm; box-sizing:border-box;">

        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:12px; margin-bottom:16px;">
          <div>
            <div style="font-size:22px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">${clinicName}</div>
            <div style="font-size:11px; color:#555; margin-top:2px;">Servicios Odontológicos</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px; font-weight:700;">FACTURA</div>
            <div style="font-size:12px; color:#555;">N° ${String(payment.id).padStart(8, '0')}</div>
            <div style="font-size:11px; color:#555; margin-top:4px;">Fecha: ${dateStr}</div>
            <div style="font-size:11px; color:#555;">Hora: ${timeStr}</div>
          </div>
        </div>

        <!-- Patient Info -->
        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:12px 16px; margin-bottom:16px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#555; margin-bottom:6px;">DATOS DEL PACIENTE</div>
          <div style="font-size:13px; font-weight:600;">${payment.patient}</div>
          ${payment.paymentMethod ? `<div style="font-size:11px; color:#555; margin-top:2px;">Método de pago: ${METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}</div>` : ''}
          ${payment.transactionId ? `<div style="font-size:11px; color:#555;">ID Transacción: ${payment.transactionId}</div>` : ''}
        </div>

        <!-- Items Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:12px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="text-align:left; padding:8px 10px; font-weight:700; text-transform:uppercase; font-size:10px; border-bottom:2px solid #d1d5db;">Descripción</th>
              <th style="text-align:center; padding:8px 10px; font-weight:700; text-transform:uppercase; font-size:10px; border-bottom:2px solid #d1d5db; width:60px;">Cant.</th>
              <th style="text-align:right; padding:8px 10px; font-weight:700; text-transform:uppercase; font-size:10px; border-bottom:2px solid #d1d5db; width:90px;">Precio</th>
              <th style="text-align:right; padding:8px 10px; font-weight:700; text-transform:uppercase; font-size:10px; border-bottom:2px solid #d1d5db; width:90px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${payment.items && payment.items.length > 0
              ? payment.items.map(item => `
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:8px 10px; word-break:break-word;">${item.name}</td>
                  <td style="padding:8px 10px; text-align:center;">${item.quantity}</td>
                  <td style="padding:8px 10px; text-align:right;">$${item.price.toFixed(2)}</td>
                  <td style="padding:8px 10px; text-align:right; font-weight:600;">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')
              : `<tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:8px 10px; word-break:break-word;">${payment.procedure || 'Tratamiento'}</td>
                  <td style="padding:8px 10px; text-align:center;">1</td>
                  <td style="padding:8px 10px; text-align:right;">$${payment.originalAmount.toFixed(2)}</td>
                  <td style="padding:8px 10px; text-align:right; font-weight:600;">$${payment.originalAmount.toFixed(2)}</td>
                </tr>`
            }
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display:flex; justify-content:flex-end; margin-bottom:20px;">
          <div style="min-width:220px;">
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e5e7eb; font-size:12px;">
              <span style="color:#555;">Subtotal</span>
              <span style="font-weight:600;">$${payment.originalAmount.toFixed(2)}</span>
            </div>
            ${payment.insuranceCoverage > 0 ? `
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e5e7eb; font-size:12px;">
              <span style="color:#555;">Cobertura de seguro</span>
              <span style="font-weight:600; color:#059669;">-$${payment.insuranceCoverage.toFixed(2)}</span>
            </div>` : ''}
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:2px solid #111; font-size:14px;">
              <span style="font-weight:700;">TOTAL</span>
              <span style="font-weight:800;">$${payment.finalAmount.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:12px;">
              <span style="color:#059669; font-weight:600;">Pagado</span>
              <span style="color:#059669; font-weight:600;">$${payment.amountPaid.toFixed(2)}</span>
            </div>
            ${balance > 0 ? `
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:12px;">
              <span style="color:#dc2626; font-weight:600;">Saldo pendiente</span>
              <span style="color:#dc2626; font-weight:700;">$${balance.toFixed(2)}</span>
            </div>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#111; border-radius:6px; margin-top:8px;">
              <span style="color:#fff; font-weight:700; font-size:13px;">ESTADO</span>
              <span style="color:#fff; font-weight:800; font-size:14px; text-transform:uppercase;">${statusLabel[st] || st}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid #e5e7eb; padding-top:14px; text-align:center; font-size:10px; color:#9ca3af;">
          Gracias por visitar ${clinicName}. Este documento es válido como comprobante de pago.
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const opt = {
      margin: [0, 0, 0, 0] as [number, number, number, number],
      filename: `Factura_${payment.id}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4' as any, orientation: 'portrait' as const },
    };

    try {
      await html2pdf().set(opt).from(container.firstElementChild as HTMLElement).save();
    } catch (err) {
      console.error('Invoice generation failed:', err);
      alert('No se pudo generar la factura.');
    } finally {
      document.body.removeChild(container);
      setGeneratingInvoice(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('payments.title')}</h1>
          <p className="text-gray-600 mt-1">{t('payments.subtitle')}</p>
        </div>
        <Button onClick={() => setIsRecordPaymentOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Wallet className="w-4 h-4 mr-2" />
          {t('payments.recordPayment')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('payments.kpi.totalOutstanding')}</CardTitle>
            <DollarSign className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalOutstanding.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-gray-500 mt-1">{t('payments.kpi.fromInvoices', { count: payments.filter(p => String(p.status).toLowerCase() !== 'paid').length })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('payments.kpi.insuranceSavings')}</CardTitle>
            <TrendingDown className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalInsuranceSavings.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-gray-500 mt-1">{t('payments.kpi.thisMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('payments.kpi.overduePayments')}</CardTitle>
            <Receipt className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{payments.filter(p => String(p.status).toLowerCase() === 'overdue').length}</div>
            <p className="text-xs text-gray-500 mt-1">{t('payments.kpi.requiresFollowUp')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('payments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('payments.records.title', { count: filteredPayments.length })}</CardTitle>
          <CardDescription>{t('payments.records.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('payments.table.patient')}</TableHead>
                    <TableHead>Procedimiento</TableHead>
                    <TableHead>{t('payments.table.date')}</TableHead>
                    <TableHead>{t('payments.table.original')}</TableHead>
                    <TableHead>{t('payments.table.insurance')}</TableHead>
                    <TableHead>{t('payments.table.finalAmount')}</TableHead>
                    <TableHead>{t('payments.table.paid')}</TableHead>
                    <TableHead>{t('payments.table.balance')}</TableHead>
                    <TableHead>{t('payments.table.status')}</TableHead>
                    <TableHead className="w-[100px]">{t('payments.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-400 py-8">No hay pagos registrados</TableCell>
                    </TableRow>
                  ) : paginatedPayments.map((payment) => {
                    const balance = payment.finalAmount - payment.amountPaid;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.patient}</TableCell>
                        <TableCell className="text-gray-600">{payment.procedure || '-'}</TableCell>
                        <TableCell className="text-gray-600">{payment.date}</TableCell>
                        <TableCell className="text-gray-600">${payment.originalAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-emerald-600 font-medium">-${payment.insuranceCoverage.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${payment.finalAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-gray-600">${payment.amountPaid.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            ${balance.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationControl currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      {/* ── Payment Detail Modal ───────────────────────────────────────────────── */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Detalle de Pago #{selectedPayment.id}
              </DialogTitle>
              <DialogDescription>
                {selectedPayment.patient}{selectedPayment.procedure ? ` · ${selectedPayment.procedure}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg border text-center">
                  <div className="text-xs text-gray-500 mb-1">Total a pagar</div>
                  <div className="text-lg font-bold text-gray-900">${selectedPayment.finalAmount.toFixed(2)}</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-xs text-gray-500 mb-1">Pagado</div>
                  <div className="text-lg font-bold text-emerald-700">${selectedPayment.amountPaid.toFixed(2)}</div>
                </div>
                <div className={`p-3 rounded-lg border text-center ${Math.max(0, selectedPayment.finalAmount - selectedPayment.amountPaid) > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="text-xs text-gray-500 mb-1">Saldo pendiente</div>
                  <div className={`text-lg font-bold ${Math.max(0, selectedPayment.finalAmount - selectedPayment.amountPaid) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ${Math.max(0, selectedPayment.finalAmount - selectedPayment.amountPaid).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Method + TxID */}
              {(selectedPayment.paymentMethod || selectedPayment.transactionId) && (
                <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-600 flex gap-4 flex-wrap">
                  {selectedPayment.paymentMethod && <span><strong>Método:</strong> {METHOD_LABELS[selectedPayment.paymentMethod] || selectedPayment.paymentMethod}</span>}
                  {selectedPayment.transactionId && <span><strong>ID Transacción:</strong> {selectedPayment.transactionId}</span>}
                </div>
              )}

              {/* Notes */}
              {selectedPayment.notes && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-amber-800">
                  <strong>Notas:</strong> {selectedPayment.notes}
                </div>
              )}

              {/* Transactions */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Historial de pagos</h4>
                {loadingTransactions ? (
                  <div className="text-sm text-gray-400 py-2">Cargando…</div>
                ) : paymentTransactions.length === 0 ? (
                  <div className="text-sm text-gray-400 py-2">Sin pagos registrados aún.</div>
                ) : (
                  <div className="space-y-2">
                    {paymentTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-start justify-between border rounded-lg p-3 bg-gray-50">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{METHOD_LABELS[tx.method] || tx.method || 'Sin método'}</div>
                          <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString('es-DO')}</div>
                          {tx.transactionId && <div className="text-xs text-gray-400">TXN: {tx.transactionId}</div>}
                          {tx.notes && <div className="text-xs text-amber-700 mt-1 italic">📝 {tx.notes}</div>}
                        </div>
                        <div className="font-semibold text-emerald-600 text-sm">+${Number(tx.amount).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => setIsAddInstallmentOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Pago
                </Button>
                {String(selectedPayment.status).toLowerCase() !== 'paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                    onClick={async () => {
                      if (!selectedPayment) return;
                      try {
                        const res = await updatePayment(selectedPayment.id, { amountPaid: selectedPayment.finalAmount, status: 'paid' });
                        const updated = res.payment || res;
                        setPayments(prev => prev.map(p => p.id === updated.id ? ({ ...p, amountPaid: updated.amountPaid, status: String(updated.status).toLowerCase() }) : p));
                        setSelectedPayment(prev => prev ? ({ ...prev, amountPaid: updated.amountPaid, status: String(updated.status).toLowerCase() as any }) : prev);
                      } catch (err) { console.error('Failed to complete payment', err); }
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Marcar como Pagado
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>Cerrar</Button>
              <Button
                className="bg-gray-800 hover:bg-gray-900"
                disabled={generatingInvoice}
                onClick={() => handlePrintInvoice(selectedPayment, paymentTransactions)}
              >
                <Printer className="w-4 h-4 mr-2" />
                {generatingInvoice ? 'Generando…' : 'Imprimir Factura'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Record Payment Modal ───────────────────────────────────────────────── */}
      <Dialog open={isRecordPaymentOpen} onOpenChange={v => { setIsRecordPaymentOpen(v); if (!v) { setFromQuote(false); setSelectedQuoteId(''); } }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('payments.recordTitle')}</DialogTitle>
            <DialogDescription>{t('payments.recordDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Patient */}
            <div className="space-y-2">
              <Label>{t('payments.form.patient')}</Label>
              <SearchableSelect
                options={patientsList.map((p: any) => ({ value: String(p.id), label: p.name }))}
                value={paymentForm.patientId}
                onChange={(v) => {
                  setPaymentForm({ ...paymentForm, patientId: v });
                  setSelectedQuoteId('');
                  setSelectedItems([]);
                }}
                placeholder={t('payments.form.selectPatient')}
              />
            </div>

            {/* From Quote Toggle */}
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <input
                type="checkbox"
                id="fromQuoteCheck"
                checked={fromQuote}
                onChange={e => {
                  setFromQuote(e.target.checked);
                  if (!e.target.checked) { setSelectedQuoteId(''); }
                }}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="fromQuoteCheck" className="text-sm font-medium text-blue-800 cursor-pointer">
                Vincular a una cotización existente del paciente
              </label>
            </div>

            {/* Quote Selector */}
            {fromQuote && paymentForm.patientId && (() => {
              const patientQuotes = cotizaciones.filter(c => String(c.patientId) === paymentForm.patientId);
              if (patientQuotes.length === 0) return (
                <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg">
                  Este paciente no tiene cotizaciones pendientes.
                </div>
              );
              return (
                <div className="space-y-2">
                  <Label>Cotización</Label>
                  <select
                    className="w-full border rounded-md h-10 px-3 text-sm"
                    value={selectedQuoteId}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedQuoteId(id);
                      const q = patientQuotes.find(c => String(c.id) === id);
                      if (q) {
                        const items: PaymentItem[] = (q.items || []).map((i: any) => ({ id: undefined, name: i.name, price: i.price, quantity: i.quantity }));
                        setSelectedItems(items);
                        setPaymentForm((f: any) => ({ ...f, procedure: q.title }));
                      }
                    }}
                  >
                    <option value="">Seleccionar cotización…</option>
                    {patientQuotes.map((q: any) => (
                      <option key={q.id} value={String(q.id)}>
                        COT-{String(q.id).padStart(4,'0')} — {q.title} (Pendiente: ${(q.total - q.amountPaid).toFixed(2)})
                      </option>
                    ))}
                  </select>
                  {selectedQuoteId && (() => {
                    const q = patientQuotes.find(c => String(c.id) === selectedQuoteId);
                    if (!q) return null;
                    return (
                      <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between"><span>Total cotizado:</span><span className="font-semibold">${q.total.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Ya pagado:</span><span className="font-semibold text-emerald-600">${q.amountPaid.toFixed(2)}</span></div>
                        <div className="flex justify-between font-semibold"><span>Saldo pendiente:</span><span className="text-red-600">${(q.total - q.amountPaid).toFixed(2)}</span></div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Procedure Selection */}
            <div className="space-y-3">
              <Label>Procedimientos / Tratamientos</Label>
              <div className="flex gap-2">
                <Select onValueChange={(val) => {
                  const proc = catalogProcedures.find(p => String(p.id) === val);
                  if (proc) {
                    const existing = selectedItems.find(i => i.id === proc.id);
                    if (existing) {
                      setSelectedItems(selectedItems.map(i => i.id === proc.id ? { ...i, quantity: i.quantity + 1 } : i));
                    } else {
                      setSelectedItems([...selectedItems, { id: proc.id, name: proc.name, price: proc.price, quantity: 1 }]);
                    }
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Añadir tratamiento del catálogo..." /></SelectTrigger>
                  <SelectContent>
                    {catalogProcedures.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} - ${p.price}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItems.length > 0 && (
                <div className="border rounded-md bg-gray-50/50 flex flex-col gap-2 p-2 max-h-48 overflow-y-auto">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                      <div className="flex-1 truncate pr-2 font-medium">{item.name}</div>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="1" className="w-16 h-8 text-center" value={item.quantity} onChange={(e) => {
                          const q = parseInt(e.target.value, 10) || 1;
                          setSelectedItems(selectedItems.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, q) } : i));
                        }} />
                        <span className="w-16 text-right text-gray-600">${(item.price * item.quantity).toFixed(2)}</span>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                          setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                        }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-right flex items-center justify-end font-medium py-1 border-t mt-1 text-[15px] pr-2">
                    <span className="text-gray-500 mr-2">Monto Base Total:</span> ${calculatedTotal.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Procedure (Manual Fallback) & Original Amount */}
            {selectedItems.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-l-2 border-blue-400 pl-3">
                <div className="space-y-2">
                  <Label className="text-gray-500">O ingresar manualmente</Label>
                  <Input
                    value={paymentForm.procedure}
                    onChange={(e) => setPaymentForm({ ...paymentForm, procedure: e.target.value })}
                    placeholder="Ej. Limpieza (Manual)"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Monto Base</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="pl-7" placeholder="0.00" />
                  </div>
                </div>
              </div>
            )}

            {/* Insurance Coverage */}
            <div className="space-y-2">
              <Label>{t('payments.form.insuranceCoverage')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input type="number" value={paymentForm.insuranceCoverage} onChange={(e) => setPaymentForm({ ...paymentForm, insuranceCoverage: e.target.value })} className="pl-7" placeholder="0.00" />
              </div>
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label>{t('payments.form.paymentType')}</Label>
              <Select value={paymentForm.paymentType} onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentType: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">{t('payments.types.full')}</SelectItem>
                  <SelectItem value="partial">{t('payments.types.partial')}</SelectItem>
                  <SelectItem value="owes">{t('payments.types.owes')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentForm.paymentType === 'partial' && (
              <div className="space-y-2">
                <Label>Monto a Pagar Ahora</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input type="number" value={paymentForm.paymentAmount} onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })} className="pl-7" placeholder="0.00" />
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>{t('payments.form.paymentMethod')}</Label>
              <Select value={paymentForm.method} onValueChange={(value) => setPaymentForm({ ...paymentForm, method: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('payments.methods.cash')}</SelectItem>
                  <SelectItem value="credit-card">{t('payments.methods.creditCard')}</SelectItem>
                  <SelectItem value="debit-card">{t('payments.methods.debitCard')}</SelectItem>
                  <SelectItem value="check">{t('payments.methods.check')}</SelectItem>
                  <SelectItem value="bank-transfer">{t('payments.methods.bankTransfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction ID */}
            {(paymentForm.method === 'credit-card' || paymentForm.method === 'debit-card') && paymentForm.paymentType !== 'owes' && (
              <div className="space-y-2">
                <Label>{t('payments.form.transactionLabel')} <span className="text-red-500">*</span></Label>
                <Input
                  value={paymentForm.transactionId}
                  onChange={(e) => { setPaymentForm({ ...paymentForm, transactionId: e.target.value }); setPaymentError(null); }}
                  placeholder="TXN-001234"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('payments.form.notes')}</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder={t('payments.form.notesPlaceholder')}
                rows={3}
              />
            </div>

            {paymentError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{paymentError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRecordPaymentOpen(false); setPaymentError(null); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRecordPayment} className="bg-emerald-600 hover:bg-emerald-700">
              <Wallet className="w-4 h-4 mr-2" />
              {t('payments.recordPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Installment Modal ──────────────────────────────────────────────── */}
      <Dialog open={isAddInstallmentOpen} onOpenChange={setIsAddInstallmentOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Agregar Pago</DialogTitle>
            <DialogDescription>Registrar un pago parcial para la factura #{selectedPayment?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input type="number" value={installmentForm.amount} onChange={(e) => setInstallmentForm({ ...installmentForm, amount: e.target.value })} className="pl-7" placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={installmentForm.method} onValueChange={(v) => setInstallmentForm({ ...installmentForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="credit-card">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="debit-card">Tarjeta de Débito</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="bank-transfer">Transferencia Bancaria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ID de Transacción {(installmentForm.method === 'credit-card' || installmentForm.method === 'debit-card') && <span className="text-red-500">*</span>}</Label>
              <Input value={installmentForm.transactionId} onChange={(e) => setInstallmentForm({ ...installmentForm, transactionId: e.target.value })} placeholder="TXN-001234" />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={installmentForm.notes} onChange={(e) => setInstallmentForm({ ...installmentForm, notes: e.target.value })} rows={2} placeholder="Observaciones del pago…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddInstallmentOpen(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (!selectedPayment) return;
                if ((installmentForm.method === 'credit-card' || installmentForm.method === 'debit-card') && !String(installmentForm.transactionId || '').trim()) {
                  alert('El ID de transacción es requerido para pagos con tarjeta.');
                  return;
                }
                const amt = Number(installmentForm.amount) || 0;
                if (amt <= 0) { alert('Ingresa un monto válido.'); return; }
                try {
                  const res = await createPaymentTransaction(selectedPayment.id, {
                    amount: amt,
                    method: installmentForm.method,
                    transactionId: installmentForm.transactionId || undefined,
                    notes: installmentForm.notes || undefined,
                  });
                  const tx = res.transaction || res;
                  const updatedPayment = res.payment || res;
                  const normalizedStatus = String(updatedPayment.status || '').toLowerCase();
                  setPaymentTransactions(prev => [...prev, tx]);
                  setPayments(prev => prev.map(p => p.id === updatedPayment.id ? ({ ...p, amountPaid: Number(updatedPayment.amountPaid), status: normalizedStatus as any }) : p));
                  setSelectedPayment(prev => prev ? ({ ...prev, amountPaid: Number(updatedPayment.amountPaid), status: normalizedStatus as any }) : prev);
                  setInstallmentForm({ amount: '', method: 'cash', transactionId: '', notes: '' });
                  setIsAddInstallmentOpen(false);
                } catch (err) {
                  console.error('Failed adding installment', err);
                  alert('Error al agregar el pago. Intenta nuevamente.');
                }
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
