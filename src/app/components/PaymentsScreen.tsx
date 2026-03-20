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
import { Wallet, Search, Eye, DollarSign, TrendingDown, Receipt, Printer, Plus, CheckCircle } from 'lucide-react';
import { getPayments, createPayment, getPatients, getClinicSettings } from '../lib/api';
import { getPaymentTransactions, createPaymentTransaction, updatePayment } from '../lib/api';
import { PaginationControl } from './PaginationControl';
import html2pdf from 'html2pdf.js';

interface Payment {
  id: number;
  patient: string;
  patientId?: number;
  procedure: string;
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
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

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
        const [paysRes, patsRes, settingsRes] = await Promise.all([
          getPayments(),
          getPatients(),
          getClinicSettings().catch(() => null)
        ]);
        if (!mounted) return;
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
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) { setPaymentError('Ingresa el monto del tratamiento.'); return; }

    if ((paymentForm.method === 'credit-card' || paymentForm.method === 'debit-card') && paymentForm.paymentType !== 'owes' && !String(paymentForm.transactionId || '').trim()) {
      setPaymentError('El ID de transacción es requerido para pagos con tarjeta.');
      return;
    }

    try {
      const patientId = Number(paymentForm.patientId);
      const originalAmount = Number(paymentForm.amount) || 0;
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

      const payload: any = {
        patientId,
        procedure: paymentForm.procedure || '',
        originalAmount,
        insuranceCoverage,
        amountPaid,
        paymentType: paymentForm.paymentType,
        paymentMethod: paymentForm.method,
        transactionId: paymentForm.transactionId || undefined,
        notes: paymentForm.notes,
        status
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
      setPaymentForm({ patientId: '', procedure: '', amount: '', insuranceCoverage: '', method: 'cash', transactionId: '', paymentType: 'full', paymentAmount: '', notes: '' });
      setIsRecordPaymentOpen(false);
      setPaymentError(null);
    } catch (err) {
      console.error('Failed to create payment', err);
      setPaymentError('Error al registrar el pago. Intenta nuevamente.');
    }
  };

  // ── Invoice PDF Generation ────────────────────────────────────────────
  const handlePrintInvoice = async (payment: Payment, transactions: any[]) => {
    setGeneratingInvoice(true);
    const dateStr = new Date(payment.date || new Date()).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
    const clinicName = clinicSettings?.name || 'DentaCare';
    const balance = Math.max(0, payment.finalAmount - payment.amountPaid);
    const statusLabel: Record<string, string> = { paid: 'PAGADO', pending: 'PENDIENTE', unpaid: 'SIN PAGAR', partial: 'PARCIAL' };
    const statusColor: Record<string, string> = { paid: '#059669', pending: '#d97706', unpaid: '#dc2626', partial: '#d97706' };
    const st = String(payment.status).toLowerCase();

    const txRows = transactions.length > 0 ? transactions.map(tx => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:8px 12px;font-size:12px;color:#374151;">${new Date(tx.createdAt).toLocaleDateString('es-DO')}</td>
        <td style="padding:8px 12px;font-size:12px;color:#374151;">${METHOD_LABELS[tx.method] || tx.method || '-'}</td>
        <td style="padding:8px 12px;font-size:12px;color:#374151;">${tx.transactionId || '-'}</td>
        <td style="padding:8px 12px;font-size:12px;color:#374151;">${tx.notes || '-'}</td>
        <td style="padding:8px 12px;font-size:12px;color:#059669;text-align:right;font-weight:700;">+$${Number(tx.amount).toFixed(2)}</td>
      </tr>
    `).join('') : `<tr><td colspan="5" style="padding:16px;text-align:center;color:#9ca3af;font-size:12px;">Sin transacciones registradas</td></tr>`;

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;color:#111827;padding:40px;width:190mm;box-sizing:border-box;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #030213;">
          <div>
            <h1 style="margin:0 0 4px 0;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#030213;">${clinicName}</h1>
            <p style="margin:0;font-size:12px;color:#6b7280;">Sistema de Gestión Odontológica</p>
          </div>
          <div style="text-align:right;">
            <div style="background:#030213;color:#fff;padding:8px 16px;border-radius:6px;font-size:18px;font-weight:800;letter-spacing:1px;">FACTURA</div>
            <div style="margin-top:8px;font-size:12px;color:#6b7280;"># ${String(payment.id).padStart(6, '0')}</div>
            <div style="font-size:12px;color:#6b7280;">${dateStr}</div>
          </div>
        </div>

        <!-- Patient + Status -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;gap:16px;">
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;flex:1;">
            <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Facturado a</div>
            <div style="font-size:16px;font-weight:700;color:#111827;">${payment.patient}</div>
            ${payment.procedure ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">Procedimiento: ${payment.procedure}</div>` : ''}
          </div>
          <div style="text-align:center;padding:16px 24px;border-radius:8px;border:2px solid ${statusColor[st] || '#6b7280'};">
            <div style="font-size:11px;font-weight:700;color:#9ca3af;margin-bottom:4px;">ESTADO</div>
            <div style="font-size:18px;font-weight:900;color:${statusColor[st] || '#6b7280'};">${statusLabel[st] || st.toUpperCase()}</div>
          </div>
        </div>

        <!-- Financial Summary Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
          <thead>
            <tr style="background:#030213;color:#fff;">
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Descripción</th>
              <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:12px 14px;font-size:13px;color:#374151;">Monto Original del Tratamiento</td>
              <td style="padding:12px 14px;font-size:13px;color:#374151;text-align:right;">$${payment.originalAmount.toFixed(2)}</td>
            </tr>
            ${payment.insuranceCoverage > 0 ? `
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:12px 14px;font-size:13px;color:#059669;">Cobertura de Seguro</td>
              <td style="padding:12px 14px;font-size:13px;color:#059669;text-align:right;">-$${payment.insuranceCoverage.toFixed(2)}</td>
            </tr>` : ''}
            <tr style="background:#f9fafb;border-bottom:2px solid #030213;">
              <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#111827;">Total a Pagar (Responsabilidad del Paciente)</td>
              <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#111827;text-align:right;">$${payment.finalAmount.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:12px 14px;font-size:13px;color:#374151;">Total Pagado</td>
              <td style="padding:12px 14px;font-size:13px;color:#059669;text-align:right;font-weight:600;">$${payment.amountPaid.toFixed(2)}</td>
            </tr>
            <tr style="background:${balance > 0 ? '#fef2f2' : '#f0fdf4'};">
              <td style="padding:14px;font-size:15px;font-weight:800;color:${balance > 0 ? '#dc2626' : '#059669'};">SALDO PENDIENTE</td>
              <td style="padding:14px;font-size:18px;font-weight:900;color:${balance > 0 ? '#dc2626' : '#059669'};text-align:right;">$${balance.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Method / Tx ID -->
        ${payment.paymentMethod ? `
        <div style="margin-bottom:20px;padding:12px 14px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;font-size:12px;color:#374151;">
          <strong>Método de pago:</strong> ${METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
          ${payment.transactionId ? ` &nbsp;|&nbsp; <strong>ID Transacción:</strong> ${payment.transactionId}` : ''}
        </div>` : ''}

        <!-- Notes -->
        ${payment.notes ? `
        <div style="margin-bottom:20px;padding:12px 14px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;font-size:12px;color:#92400e;">
          <strong>Notas:</strong> ${payment.notes}
        </div>` : ''}

        <!-- Payment History -->
        ${transactions.length > 0 ? `
        <div style="margin-bottom:28px;">
          <h3 style="margin:0 0 12px 0;font-size:13px;font-weight:700;text-transform:uppercase;color:#374151;letter-spacing:1px;">Historial de Pagos</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Fecha</th>
                <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Método</th>
                <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">ID Transacción</th>
                <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Notas</th>
                <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Monto</th>
              </tr>
            </thead>
            <tbody>${txRows}</tbody>
          </table>
        </div>` : ''}

        <!-- Footer -->
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;font-style:italic;">Documento generado automáticamente por ${clinicName}. Fecha de emisión: ${new Date().toLocaleDateString('es-DO')}.</p>
          <p style="margin:0;font-size:11px;color:#9ca3af;">Factura #${String(payment.id).padStart(6, '0')}</p>
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
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: `Factura_${payment.patient.replace(/\s+/g, '_')}_${payment.id}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
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
      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('payments.recordTitle')}</DialogTitle>
            <DialogDescription>{t('payments.recordDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Patient */}
            <div className="space-y-2">
              <Label>{t('payments.form.patient')}</Label>
              <Select value={paymentForm.patientId} onValueChange={(v) => setPaymentForm({ ...paymentForm, patientId: v })}>
                <SelectTrigger><SelectValue placeholder={t('payments.form.selectPatient')} /></SelectTrigger>
                <SelectContent>
                  {patientsList.length ? patientsList.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  )) : <SelectItem value="">{t('payments.noPatients')}</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Procedure */}
            <div className="space-y-2">
              <Label>Procedimiento / Tratamiento</Label>
              <Input
                value={paymentForm.procedure}
                onChange={(e) => setPaymentForm({ ...paymentForm, procedure: e.target.value })}
                placeholder="Ej. Limpieza dental, Extracción…"
              />
            </div>

            {/* Original Amount */}
            <div className="space-y-2">
              <Label>{t('payments.form.amount')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="pl-7" placeholder="0.00" />
              </div>
            </div>

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
