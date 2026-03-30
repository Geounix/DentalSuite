import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, DollarSign, TrendingDown, Activity, Users,
  RefreshCw, Stethoscope, Shield, Calendar, AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getPayments, getGastosSummary, getPatients, getAppointments, getUsers, getInsurances, getCotizaciones } from '../lib/api';

interface MonthlyPoint { mes: string; ingresos: number; gastos: number; margen: number; }

const MONTH_NAMES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

function fmt(n: number) {
  return `$${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
}
function num(n: number) {
  return Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });
}

// Helper KPI card
function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  const bg = `bg-${color}-50`;
  const ic = `text-${color}-500`;
  const val = `text-${color}-600`;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${val}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${ic}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [gastosSummary, setGastosSummary] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    try {
      setLoading(true);
      const [paymentsRes, gastoRes, patsRes, apptsRes, usersRes, insRes, cotzRes] = await Promise.all([
        getPayments(),
        getGastosSummary().catch(() => ({})),
        getPatients(),
        getAppointments(),
        getUsers(),
        getInsurances().catch(() => ({ insurances: [] })),
        getCotizaciones().catch(() => ({ cotizaciones: [] })),
      ]);
      setPayments(paymentsRes.payments || []);
      setGastosSummary(gastoRes || {});
      setPatients(patsRes.patients || []);
      setAppointments(apptsRes.appointments || []);
      setUsers(usersRes.users || []);
      setInsurances(insRes.insurances || []);
      setCotizaciones(cotzRes.cotizaciones || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doctors = users.filter((u: any) => String(u.role).toLowerCase() === 'doctor');

  // ── Financial KPIs ───────────────────────────────────────────────────────
  const totalIngresos = payments.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
  const totalOriginal = payments.reduce((s, p) => s + (Number(p.originalAmount) || 0), 0);
  const totalInsuranceCoverage = payments.reduce((s, p) => s + (Number(p.insuranceCoverage) || 0), 0);
  const totalOutstanding = payments.reduce((s, p) => {
    return s + Math.max(0, (Number(p.finalAmount) || 0) - (Number(p.amountPaid) || 0));
  }, 0);
  const totalGastos = gastosSummary?.totalGastos || 0;
  const margenNeto = totalIngresos - totalGastos;

  // ── Appointment KPIs ─────────────────────────────────────────────────────
  const completedAppts = appointments.filter(a => String(a.status).toLowerCase() === 'completed');
  const scheduledAppts = appointments.filter(a => String(a.status).toLowerCase() === 'scheduled');
  const cancelledAppts = appointments.filter(a => String(a.status).toLowerCase() === 'cancelled');

  // ── Monthly Revenue vs Gastos ────────────────────────────────────────────
  const revenueByMonth: Record<string, number> = {};
  for (const p of payments) {
    const d = new Date(p.createdAt || '');
    if (!isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + (Number(p.amountPaid) || 0);
    }
  }
  const gastosByMonth: Record<string, number> = gastosSummary?.byMonth || {};
  const allMonths = Array.from(new Set([...Object.keys(revenueByMonth), ...Object.keys(gastosByMonth)])).sort().slice(-10);
  const monthlyData: MonthlyPoint[] = allMonths.map(key => {
    const [, mm] = key.split('-');
    const ing = revenueByMonth[key] || 0;
    const gas = gastosByMonth[key] || 0;
    return { mes: MONTH_NAMES[mm] || mm, ingresos: ing, gastos: gas, margen: ing - gas };
  });

  // ── Procedures frequency ─────────────────────────────────────────────────
  const procedureCount: Record<string, { count: number; revenue: number }> = {};
  for (const appt of appointments) {
    const proc = appt.procedure || 'Sin especificar';
    if (!procedureCount[proc]) procedureCount[proc] = { count: 0, revenue: 0 };
    procedureCount[proc].count += 1;
  }
  // Also count from payments
  for (const p of payments) {
    const proc = p.procedure || '';
    if (!proc) continue;
    // strip "2x " prefix if from multi-item
    const names = proc.split(',').map((s: string) => s.trim().replace(/^\d+x\s/, ''));
    for (const name of names) {
      if (!procedureCount[name]) procedureCount[name] = { count: 0, revenue: 0 };
      procedureCount[name].revenue += Number(p.originalAmount) / names.length;
    }
  }
  const procedureData = Object.entries(procedureCount)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── Procedures per Doctor ────────────────────────────────────────────────
  const doctorStats: Record<number, { name: string; completed: number; scheduled: number; cancelled: number; }> = {};
  for (const doc of doctors) {
    doctorStats[doc.id] = { name: doc.name, completed: 0, scheduled: 0, cancelled: 0 };
  }
  for (const appt of appointments) {
    if (appt.doctorId && doctorStats[appt.doctorId]) {
      const st = String(appt.status).toLowerCase();
      if (st === 'completed') doctorStats[appt.doctorId].completed += 1;
      else if (st === 'scheduled') doctorStats[appt.doctorId].scheduled += 1;
      else if (st === 'cancelled') doctorStats[appt.doctorId].cancelled += 1;
    }
  }
  const doctorStatsData = Object.values(doctorStats);

  // ── Insurance coverage data ──────────────────────────────────────────────
  // From payments by insurance name
  const insurancePaymentCoverage: Record<string, number> = {};
  for (const p of payments) {
    if (p.insuranceCoverage && Number(p.insuranceCoverage) > 0 && p.notes) {
      // fallback: group by a generic label
    }
  }

  // From insurance plans structure
  const insuranceSummary = insurances.map((ins: any) => {
    const planCount = (ins.plans || []).length;
    const planProcedures = (ins.plans || []).reduce((s: number, pl: any) => s + (pl.procedures || []).length, 0);
    const totalCoverage = (ins.plans || []).reduce((s: number, pl: any) => {
      return s + (pl.procedures || []).reduce((ss: number, pr: any) => ss + (Number(pr.coverageAmount) || 0), 0);
    }, 0);
    return { name: ins.name, planCount, planProcedures, totalCoverage };
  });

  // ── Outstanding by patient ───────────────────────────────────────────────
  const outstandingByPatient: Record<string, number> = {};
  for (const p of payments) {
    const balance = Math.max(0, (Number(p.finalAmount) || 0) - (Number(p.amountPaid) || 0));
    if (balance > 0) {
      const name = p.patientName || `#${p.patientId}`;
      outstandingByPatient[name] = (outstandingByPatient[name] || 0) + balance;
    }
  }
  const outstandingPatients = Object.entries(outstandingByPatient)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // ── Payment method distribution ──────────────────────────────────────────
  const paymentMethods: Record<string, number> = {};
  for (const p of payments) {
    const m = p.paymentMethod || 'Sin especificar';
    const label = m === 'cash' ? 'Efectivo' : m === 'credit-card' ? 'Tarjeta crédito' : m === 'debit-card' ? 'Tarjeta débito' : m === 'bank-transfer' ? 'Transferencia' : m === 'check' ? 'Cheque' : m;
    paymentMethods[label] = (paymentMethods[label] || 0) + (Number(p.amountPaid) || 0);
  }
  const paymentMethodData = Object.entries(paymentMethods)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Appointment status distribution ─────────────────────────────────────
  const apptStatusData = [
    { name: 'Completadas', value: completedAppts.length },
    { name: 'Agendadas', value: scheduledAppts.length },
    { name: 'Canceladas', value: cancelledAppts.length },
  ].filter(d => d.value > 0);

  // ── Payments status ──────────────────────────────────────────────────────
  const paymentStatusData = [
    { name: 'Pagado', value: payments.filter(p => String(p.status).toLowerCase() === 'paid').length },
    { name: 'Pendiente', value: payments.filter(p => ['pending', 'unpaid'].includes(String(p.status).toLowerCase())).length },
    { name: 'Parcial', value: payments.filter(p => String(p.status).toLowerCase() === 'partial').length },
  ].filter(d => d.value > 0);

  // ── Gastos by category ───────────────────────────────────────────────────
  const byCategoria = gastosSummary?.byCategoria || {};
  const categoriaData = Object.entries(byCategoria)
    .map(([name, value]: any) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Cotizaciones KPIs ────────────────────────────────────────────────────
  const totalCotizado = cotizaciones.reduce((s, c) => s + (Number(c.total) || 0), 0);
  const totalCobradoCot = cotizaciones.reduce((s, c) => s + (Number(c.amountPaid) || 0), 0);
  const totalPendienteCot = totalCotizado - totalCobradoCot;
  const cotizacionesPagadas = cotizaciones.filter(c => c.status === 'paid').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes Generales</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Datos al: {lastRefresh.toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
        <Button onClick={load} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </Button>
      </div>

      {/* ── FINANCIAL KPIs ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-500" /> Finanzas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Cobrado" value={fmt(totalIngresos)} sub={`${payments.length} pagos`} icon={DollarSign} color="blue" />
          <KpiCard label="Total Gastos" value={fmt(totalGastos)} sub={`ITBIS: ${fmt(gastosSummary?.totalItbis || 0)}`} icon={TrendingDown} color="red" />
          <KpiCard label="Margen Neto" value={fmt(margenNeto)} sub={`${totalIngresos > 0 ? ((margenNeto / totalIngresos) * 100).toFixed(1) : 0}% rentabilidad`} icon={TrendingUp} color={margenNeto >= 0 ? "emerald" : "red"} />
          <KpiCard label="Saldo Pendiente" value={fmt(totalOutstanding)} sub={`Cobertura seguros: ${fmt(totalInsuranceCoverage)}`} icon={AlertCircle} color="amber" />
        </div>
      </section>

      {/* ── COTIZACIONES KPIs ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" /> Cotizaciones
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Cotizado" value={fmt(totalCotizado)} sub={`${cotizaciones.length} cotizaciones`} icon={TrendingUp} color="blue" />
          <KpiCard label="Total Cobrado" value={fmt(totalCobradoCot)} sub="De cotizaciones" icon={DollarSign} color="emerald" />
          <KpiCard label="Pendiente" value={fmt(totalPendienteCot)} sub="Por cobrar" icon={AlertCircle} color="amber" />
          <KpiCard label="Cotiz. Pagadas" value={String(cotizacionesPagadas)} sub={`${cotizaciones.length ? `de ${cotizaciones.length}` : 'Sin datos'}`} icon={Activity} color="purple" />
        </div>
      </section>

      {/* ── APPOINTMENT KPIs ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" /> Citas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Citas" value={String(appointments.length)} sub="Todas" icon={Calendar} color="blue" />
          <KpiCard label="Completadas" value={String(completedAppts.length)} sub={`${appointments.length ? ((completedAppts.length / appointments.length) * 100).toFixed(0) : 0}%`} icon={Activity} color="emerald" />
          <KpiCard label="Agendadas" value={String(scheduledAppts.length)} sub="Pendientes" icon={Calendar} color="amber" />
          <KpiCard label="Canceladas" value={String(cancelledAppts.length)} sub={`${appointments.length ? ((cancelledAppts.length / appointments.length) * 100).toFixed(0) : 0}% tasa`} icon={AlertCircle} color="red" />
        </div>
      </section>

      {/* ── PATIENT KPIs ── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Pacientes" value={String(patients.length)} sub="Registrados" icon={Users} color="purple" />
          <KpiCard label="Doctores" value={String(doctors.length)} sub="Activos" icon={Stethoscope} color="blue" />
          <KpiCard label="Aseguradoras" value={String(insurances.length)} sub="Registradas" icon={Shield} color="indigo" />
          <KpiCard label="Total Bruto" value={fmt(totalOriginal)} sub="Antes de seguro" icon={DollarSign} color="gray" />
        </div>
      </section>

      {/* ── INGRESOS VS GASTOS CHART ── */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs Gastos por Mes</CardTitle>
          <CardDescription>Comparativa de flujo financiero mensual con margen neto</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">No hay suficientes datos aún.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} formatter={(v: any) => fmt(v)} />
                <Legend />
                <Bar dataKey="ingresos" fill="#3b82f6" name="Ingresos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="margen" stroke="#10b981" strokeWidth={2} dot={false} name="Margen" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── PROCEDURES CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most frequent procedures */}
        <Card>
          <CardHeader>
            <CardTitle>Procedimientos más Realizados</CardTitle>
            <CardDescription>Top 10 por frecuencia</CardDescription>
          </CardHeader>
          <CardContent>
            {procedureData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400">Sin datos de procedimientos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={procedureData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#3b82f6" name="Cantidad" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Appointment status pie */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Citas</CardTitle>
            <CardDescription>Distribución general de todas las citas</CardDescription>
          </CardHeader>
          <CardContent>
            {apptStatusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400">Sin citas registradas.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={apptStatusData} cx="50%" cy="50%" outerRadius={110} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {apptStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── PROCEDURES PER DOCTOR ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-500" />
            Procedimientos por Doctor
          </CardTitle>
          <CardDescription>Citas completadas, agendadas y canceladas por cada médico</CardDescription>
        </CardHeader>
        <CardContent>
          {doctorStatsData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Sin doctores registrados o sin citas asignadas.</p>
          ) : (
            <>
              {/* Bar chart */}
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={doctorStatsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="completed" name="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scheduled" name="Agendadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Summary table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Doctor</th>
                      <th className="text-right py-2 px-3 font-semibold text-emerald-600">Completadas</th>
                      <th className="text-right py-2 px-3 font-semibold text-blue-600">Agendadas</th>
                      <th className="text-right py-2 px-3 font-semibold text-red-500">Canceladas</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorStatsData.map(d => (
                      <tr key={d.name} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-900">Dr. {d.name}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-medium">{d.completed}</td>
                        <td className="py-2 px-3 text-right text-blue-600">{d.scheduled}</td>
                        <td className="py-2 px-3 text-right text-red-500">{d.cancelled}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-800">{d.completed + d.scheduled + d.cancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── INSURANCE COVERAGE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Cobertura de Seguros
            </CardTitle>
            <CardDescription>Aseguradoras registradas y cobertura total por plan</CardDescription>
          </CardHeader>
          <CardContent>
            {insuranceSummary.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin aseguradoras registradas.</p>
            ) : (
              <div className="space-y-3">
                {insuranceSummary.map((ins, i) => (
                  <div key={ins.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{ins.name}</p>
                      <p className="text-xs text-gray-500">{ins.planCount} planes · {ins.planProcedures} procedimientos cubiertos</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-blue-600">{fmt(ins.totalCoverage)}</p>
                      <p className="text-xs text-gray-400">cobertura total</p>
                    </div>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold text-gray-700">
                  <span>Total cobertura de seguros cobrada (pagos)</span>
                  <span className="text-blue-600">{fmt(totalInsuranceCoverage)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>Distribución por método y monto recaudado</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMethodData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin pagos registrados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px' }} formatter={(v: any) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── PAYMENT STATUS & OUTSTANDING ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Cobros</CardTitle>
            <CardDescription>Distribucion del estado de todas las facturas</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentStatusData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin pagos registrados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentStatusData.map((_, i) => <Cell key={i} fill={[COLORS[1], COLORS[4], COLORS[2]][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Outstanding patients */}
        <Card>
          <CardHeader>
            <CardTitle>Pacientes con Saldo Pendiente</CardTitle>
            <CardDescription>Top 8 pacientes con mayor deuda pendiente</CardDescription>
          </CardHeader>
          <CardContent>
            {outstandingPatients.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin saldos pendientes. ¡Excelente!</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={outstandingPatients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#9ca3af" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} formatter={(v: any) => fmt(v)} />
                  <Bar dataKey="amount" fill="#f59e0b" name="Pendiente" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── GASTOS BY CATEGORY ── */}
      {categoriaData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
              <CardDescription>Distribución de egresos por tipo de gasto</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoriaData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                    {categoriaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle de Gastos por Categoría</CardTitle>
              <CardDescription>Resumen de egresos agrupados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Categoría</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Monto</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriaData.map((cat, i) => (
                      <tr key={cat.name} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          {cat.name}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-red-600">{fmt(cat.value)}</td>
                        <td className="py-2 px-3 text-right text-gray-500">
                          {totalGastos > 0 ? ((cat.value / totalGastos) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-2 px-3 text-gray-800">TOTAL</td>
                      <td className="py-2 px-3 text-right text-red-700">{fmt(totalGastos)}</td>
                      <td className="py-2 px-3 text-right text-gray-600">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PROCEDURE DETAIL TABLE ── */}
      {procedureData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Procedimientos</CardTitle>
            <CardDescription>Frecuencia y facturación por tipo de tratamiento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Procedimiento</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Cantidad</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Facturado</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Promedio</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  {procedureData.map((proc, i) => {
                    const totalCount = procedureData.reduce((s, p) => s + p.count, 0);
                    const totalRev = procedureData.reduce((s, p) => s + p.revenue, 0);
                    return (
                      <tr key={proc.name} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          {proc.name}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">{proc.count}</td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-600">{fmt(proc.revenue)}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{proc.count > 0 ? fmt(proc.revenue / proc.count) : '–'}</td>
                        <td className="py-3 px-4 text-right text-gray-500">
                          {totalCount > 0 ? ((proc.count / totalCount) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
