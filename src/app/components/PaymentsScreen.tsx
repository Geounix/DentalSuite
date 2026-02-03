import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { StatusBadge } from './StatusBadge';
import { Wallet, Search, Eye, DollarSign, TrendingDown, Receipt } from 'lucide-react';
import { getPayments, createPayment, getPatients } from '../lib/api';
import { getPaymentTransactions, createPaymentTransaction, updatePayment } from '../lib/api';

interface Payment {
  id: number;
  patient: string;
  procedure: string;
  date: string;
  originalAmount: number;
  insuranceCoverage: number;
  finalAmount: number;
  amountPaid: number;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  paymentMethod?: string;
  transactionId?: string;
}

export function PaymentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [installmentForm, setInstallmentForm] = useState({ amount: '', method: 'credit-card', transactionId: '', notes: '' });
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [paymentForm, setPaymentForm] = useState<any>({
    patientId: '',
    amount: '',
    insuranceCoverage: '',
    method: 'credit-card',
    transactionId: '',
    paymentType: 'full',
    notes: ''
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const filteredPayments = payments.filter(payment =>
    (payment.patient || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (payment.procedure || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = payments.reduce((sum, p) => sum + ((p.finalAmount ?? 0) - (p.amountPaid ?? 0)), 0);
  const totalInsuranceSavings = payments.reduce((sum, p) => sum + (p.insuranceCoverage ?? 0), 0);

  // load payments + patients
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoadingPayments(true);
        const [paysRes, patsRes] = await Promise.all([getPayments(), getPatients()]);
        if (!mounted) return;
        const pays = (paysRes.payments || []).map((p: any) => ({
          id: p.id,
          patient: p.patientName || `#${p.patientId}`,
          procedure: p.procedure || '',
          date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : (p.date || ''),
          originalAmount: p.originalAmount,
          insuranceCoverage: p.insuranceCoverage,
          finalAmount: p.finalAmount,
          amountPaid: p.amountPaid,
          status: p.status ?? (p.amountPaid >= p.finalAmount ? 'Paid' : (p.amountPaid > 0 ? 'Partial' : 'Pending')),
          paymentMethod: p.paymentMethod,
          transactionId: p.transactionId
        }));
        setPayments(pays);
        setPatientsList(patsRes.patients || []);
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
        const res = await getPaymentTransactions(selectedPayment.id);
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
    // validate transaction id for card payments except when marking as owes
    if ((paymentForm.method === 'credit-card' || paymentForm.method === 'debit-card') && paymentForm.paymentType !== 'owes' && !String(paymentForm.transactionId || '').trim()) {
      setPaymentError('Transaction ID is required for card payments.');
      return;
    }

    try {
      const patientId = Number(paymentForm.patientId);
      const originalAmount = Number(paymentForm.amount) || 0;
      const insuranceCoverage = Number(paymentForm.insuranceCoverage) || 0;
      const finalAmount = originalAmount - insuranceCoverage;

      let amountPaid = 0;
      let status = 'Pending';
      if (paymentForm.paymentType === 'full') {
        amountPaid = finalAmount;
        status = 'Paid';
      } else if (paymentForm.paymentType === 'partial') {
        amountPaid = Number(paymentForm.amount) || 0;
        status = amountPaid >= finalAmount ? 'Paid' : 'Partial';
      } else if (paymentForm.paymentType === 'owes') {
        amountPaid = 0;
        status = 'Pending';
      }

      const payload: any = {
        patientId,
        originalAmount,
        insuranceCoverage,
        amountPaid,
        paymentMethod: paymentForm.method,
        transactionId: paymentForm.transactionId || undefined,
        notes: paymentForm.notes,
        status
      };

      const res = await createPayment(payload);
      const created = res.payment || res;
      const newPayment: Payment = {
        id: created.id,
        patient: patientsList.find((p: any) => p.id === created.patientId)?.name || `#${created.patientId}`,
        procedure: created.procedure || '',
        date: created.createdAt ? new Date(created.createdAt).toISOString().split('T')[0] : '',
        originalAmount: created.originalAmount,
        insuranceCoverage: created.insuranceCoverage,
        finalAmount: created.finalAmount,
        amountPaid: created.amountPaid,
        status: created.status ?? (created.amountPaid >= created.finalAmount ? 'Paid' : (created.amountPaid > 0 ? 'Partial' : 'Pending')),
        paymentMethod: created.paymentMethod,
        transactionId: created.transactionId
      };
      setPayments(prev => [newPayment, ...prev]);
      setPaymentForm({ patientId: '', amount: '', insuranceCoverage: '', method: 'credit-card', transactionId: '', paymentType: 'full', notes: '' });
      setIsRecordPaymentOpen(false);
      setPaymentError(null);
    } catch (err) {
      console.error('Failed to create payment', err);
      setPaymentError('Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments & Billing</h1>
          <p className="text-gray-600 mt-1">Manage payments, invoices, and billing</p>
        </div>
        <Button onClick={() => setIsRecordPaymentOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Wallet className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
            <DollarSign className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">From {payments.filter(p => p.status !== 'Paid').length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Insurance Savings</CardTitle>
            <TrendingDown className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalInsuranceSavings.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue Payments</CardTitle>
            <Receipt className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{payments.filter(p => p.status === 'Overdue').length}</div>
            <p className="text-xs text-gray-500 mt-1">Requires follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search payments by patient or procedure..."
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
          <CardTitle>Payment Records ({filteredPayments.length})</CardTitle>
          <CardDescription>View and manage payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Final Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.patient}</TableCell>
                    <TableCell className="text-gray-600">{payment.procedure}</TableCell>
                    <TableCell className="text-gray-600">{payment.date}</TableCell>
                    <TableCell className="text-gray-600">${payment.originalAmount}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">-${payment.insuranceCoverage}</TableCell>
                    <TableCell className="font-medium">${payment.finalAmount}</TableCell>
                    <TableCell className="text-gray-600">${payment.amountPaid}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${payment.finalAmount - payment.amountPaid > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${payment.finalAmount - payment.amountPaid}
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
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Detail Modal (simplified to fix nesting) */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Payment Details - Invoice #{selectedPayment.id}</DialogTitle>
              <DialogDescription>
                {selectedPayment.patient} - {selectedPayment.procedure}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Patient Responsibility</div>
                    <div className="text-lg font-bold">${selectedPayment.finalAmount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Paid</div>
                    <div className="text-lg font-bold">${selectedPayment.amountPaid}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Installment History</h4>
                {loadingTransactions ? (
                  <div>Loading transactions...</div>
                ) : paymentTransactions.length === 0 ? (
                  <div className="text-sm text-gray-400">No transactions recorded</div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {paymentTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between border-b py-2">
                        <div>
                          <div className="text-sm font-medium">{tx.method}</div>
                          {tx.transactionId && <div className="text-xs text-gray-500">TXN: {tx.transactionId}</div>}
                        </div>
                        <div className="font-semibold text-emerald-600">+${tx.amount}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => setIsAddInstallmentOpen(true)}>Add Installment</Button>
                  <Button variant="outline" onClick={async () => {
                    if (!selectedPayment) return;
                    try {
                      const res = await updatePayment(selectedPayment.id, { amountPaid: selectedPayment.finalAmount, status: 'Paid' });
                      const updated = res.payment || res;
                      setPayments(prev => prev.map(p => p.id === updated.id ? ({ ...p, amountPaid: updated.amountPaid, status: updated.status }) : p));
                      setSelectedPayment(prev => prev ? ({ ...prev, amountPaid: updated.amountPaid, status: updated.status }) : prev);
                    } catch (err) {
                      console.error('Failed to complete payment', err);
                    }
                  }}>Complete Payment</Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>Close</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Record Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Record Payment Modal */}
      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>
              Enter payment details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient-select">Patient</Label>
              <Select value={paymentForm.patientId} onValueChange={(v) => setPaymentForm({ ...paymentForm, patientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientsList.length ? patientsList.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  )) : (
                    <SelectItem value="">No patients</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="insuranceCoverage">Insurance Coverage</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="insuranceCoverage"
                  type="number"
                  value={paymentForm.insuranceCoverage}
                  onChange={(e) => setPaymentForm({ ...paymentForm, insuranceCoverage: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="amount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select value={paymentForm.method} onValueChange={(value) => setPaymentForm({ ...paymentForm, method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                  <SelectItem value="debit-card">Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select value={paymentForm.paymentType} onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Paid (Pago completo)</SelectItem>
                  <SelectItem value="partial">Partial / Abono</SelectItem>
                  <SelectItem value="owes">Owes / Debe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction">Transaction ID {paymentForm.method === 'credit-card' || paymentForm.method === 'debit-card' ? '(Required for card payments)' : '(Optional)'}</Label>
              <Input
                id="transaction"
                value={paymentForm.transactionId}
                onChange={(e) => { setPaymentForm({ ...paymentForm, transactionId: e.target.value }); setPaymentError(null); }}
                placeholder="TXN-001234"
              />
              {paymentError && (
                <p className="text-sm text-red-600">{paymentError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleRecordPayment()} className="bg-emerald-600 hover:bg-emerald-700">
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Installment Modal (for selected payment) */}
      <Dialog open={isAddInstallmentOpen} onOpenChange={setIsAddInstallmentOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Installment</DialogTitle>
            <DialogDescription>
              Add an installment for invoice #{selectedPayment?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input type="number" value={installmentForm.amount} onChange={(e) => setInstallmentForm({ ...installmentForm, amount: e.target.value })} className="pl-7" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={installmentForm.method} onValueChange={(v) => setInstallmentForm({ ...installmentForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                  <SelectItem value="debit-card">Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transaction ID</Label>
              <Input value={installmentForm.transactionId} onChange={(e) => setInstallmentForm({ ...installmentForm, transactionId: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={installmentForm.notes} onChange={(e) => setInstallmentForm({ ...installmentForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddInstallmentOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!selectedPayment) return;
              // require transaction id for card methods
              if ((installmentForm.method === 'credit-card' || installmentForm.method === 'debit-card') && !String(installmentForm.transactionId || '').trim()) {
                alert('Transaction ID required for card payments');
                return;
              }
              try {
                const res = await createPaymentTransaction(selectedPayment.id, { amount: Number(installmentForm.amount) || 0, method: installmentForm.method, transactionId: installmentForm.transactionId || undefined, notes: installmentForm.notes });
                const tx = res.transaction || res;
                const updatedPayment = res.payment || res;
                setPaymentTransactions(prev => [...prev, tx]);
                setPayments(prev => prev.map(p => p.id === updatedPayment.id ? ({ ...p, amountPaid: updatedPayment.amountPaid, status: updatedPayment.status }) : p));
                setSelectedPayment(prev => prev ? ({ ...prev, amountPaid: updatedPayment.amountPaid, status: updatedPayment.status }) : prev);
                setInstallmentForm({ amount: '', method: 'credit-card', transactionId: '', notes: '' });
                setIsAddInstallmentOpen(false);
              } catch (err) {
                console.error('Failed adding installment', err);
                alert('Failed adding installment');
              }
            }} className="bg-emerald-600 hover:bg-emerald-700">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
