import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { StatusBadge } from './StatusBadge';
import { Wallet, Search, Eye, DollarSign, TrendingDown, Receipt } from 'lucide-react';

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
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  const [payments] = useState<Payment[]>([
    { id: 1, patient: 'Sarah Johnson', procedure: 'Teeth Cleaning', date: '2026-01-05', originalAmount: 250, insuranceCoverage: 150, finalAmount: 100, amountPaid: 100, status: 'Paid', paymentMethod: 'Credit Card', transactionId: 'TXN-001234' },
    { id: 2, patient: 'Michael Chen', procedure: 'Root Canal', date: '2025-12-20', originalAmount: 1200, insuranceCoverage: 700, finalAmount: 500, amountPaid: 150, status: 'Partial', paymentMethod: 'Cash' },
    { id: 3, patient: 'Emma Wilson', procedure: 'Crown Placement', date: '2026-01-03', originalAmount: 1500, insuranceCoverage: 800, finalAmount: 700, amountPaid: 550, status: 'Partial', paymentMethod: 'Check' },
    { id: 4, patient: 'James Brown', procedure: 'Filling', date: '2025-11-28', originalAmount: 300, insuranceCoverage: 200, finalAmount: 100, amountPaid: 100, status: 'Paid', paymentMethod: 'Credit Card', transactionId: 'TXN-001189' },
    { id: 5, patient: 'Lisa Anderson', procedure: 'Dental Implant', date: '2026-01-07', originalAmount: 3000, insuranceCoverage: 1500, finalAmount: 1500, amountPaid: 1000, status: 'Partial', paymentMethod: 'Payment Plan' },
    { id: 6, patient: 'Robert Garcia', procedure: 'Consultation', date: '2025-10-15', originalAmount: 150, insuranceCoverage: 0, finalAmount: 150, amountPaid: 0, status: 'Overdue' },
  ]);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'credit-card',
    transactionId: '',
    notes: ''
  });

  const filteredPayments = payments.filter(payment =>
    payment.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.procedure.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = payments.reduce((sum, p) => sum + (p.finalAmount - p.amountPaid), 0);
  const totalInsuranceSavings = payments.reduce((sum, p) => sum + p.insuranceCoverage, 0);

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

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Payment Details - Invoice #{selectedPayment.id}</DialogTitle>
              <DialogDescription>
                {selectedPayment.patient} - {selectedPayment.procedure}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Cost Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Cost Breakdown</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Original Amount:</span>
                    <span className="font-medium">${selectedPayment.originalAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Insurance Coverage:</span>
                    <span className="font-medium text-emerald-600">-${selectedPayment.insuranceCoverage}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Patient Responsibility:</span>
                    <span className="font-bold text-lg">${selectedPayment.finalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Timeline */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Payment History</h3>
                <div className="space-y-3">
                  {selectedPayment.amountPaid > 0 && (
                    <div className="flex gap-4 pb-3 border-b">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <div className="w-px h-full bg-gray-200 mt-2" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">Payment Received</h4>
                            <p className="text-sm text-gray-600">{selectedPayment.paymentMethod}</p>
                            {selectedPayment.transactionId && (
                              <p className="text-xs text-gray-500 mt-1">Transaction ID: {selectedPayment.transactionId}</p>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-emerald-600">+${selectedPayment.amountPaid}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">Invoice Created</h4>
                          <p className="text-sm text-gray-600">{selectedPayment.date}</p>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">${selectedPayment.finalAmount}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remaining Balance */}
              {selectedPayment.finalAmount - selectedPayment.amountPaid > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-900">Remaining Balance</p>
                      <p className="text-xs text-amber-700 mt-1">Payment required</p>
                    </div>
                    <div className="text-2xl font-bold text-amber-900">
                      ${selectedPayment.finalAmount - selectedPayment.amountPaid}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                Close
              </Button>
              {selectedPayment.finalAmount - selectedPayment.amountPaid > 0 && (
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Wallet className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              )}
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
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sarah">Sarah Johnson</SelectItem>
                  <SelectItem value="michael">Michael Chen</SelectItem>
                  <SelectItem value="emma">Emma Wilson</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="transaction">Transaction ID (Optional)</Label>
              <Input
                id="transaction"
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                placeholder="TXN-001234"
              />
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
            <Button onClick={() => setIsRecordPaymentOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
