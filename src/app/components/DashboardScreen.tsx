import { KPICard } from './KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Calendar, DollarSign, CreditCard, TrendingUp, UserPlus, CalendarPlus, Wallet, Clock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getAppointments, getPayments, getPatients } from '../lib/api';

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ todaysAppointments: 0, monthlyRevenue: 0, outstandingPayments: 0, insuranceSavings: 0 });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [apptsRes, paysRes, patsRes] = await Promise.all([getAppointments(), getPayments(), getPatients()]);
        if (!mounted) return;
        const appts = apptsRes.appointments || apptsRes || [];
        const pays = paysRes.payments || paysRes || [];
        const pats = patsRes.patients || patsRes || [];

        // Today's appointments
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1);
        const todaysAppts = appts.filter((a: any) => {
          const dt = new Date(a.scheduledAt || a.date || a.createdAt);
          return dt >= startOfDay && dt < endOfDay;
        });

        // Upcoming (next few) appointments for Today sorted
        const upcoming = todaysAppts
          .map((a: any) => ({ id: a.id, time: new Date(a.scheduledAt || a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), patient: pats.find((p: any) => p.id === a.patientId)?.name || `#${a.patientId}`, procedure: a.procedure || '', doctor: a.doctorName || '', status: a.status || 'Scheduled' }))
          .sort((x: any, y: any) => x.time.localeCompare(y.time))
          .slice(0, 6);

        // Monthly revenue: sum payments created this month
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyRevenue = pays.filter((p: any) => new Date(p.createdAt) >= monthStart).reduce((s: number, p: any) => s + (p.amountPaid || p.finalAmount || 0), 0);

        // Outstanding payments
        const outstanding = pays.reduce((s: number, p: any) => s + ( (p.finalAmount || 0) - (p.amountPaid || 0) ), 0);

        // Insurance savings (sum of insuranceCoverage this month)
        const insuranceSavings = pays.filter((p: any) => new Date(p.createdAt) >= monthStart).reduce((s: number, p: any) => s + (p.insuranceCoverage || 0), 0);

        // Recent activities: combine last 8 from appointments/payments/patients
        const recentFromAppts = appts.slice().sort((a: any,b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0,5).map((a: any) => ({ id: `a-${a.id}`, type: 'appointment', patient: pats.find((p: any) => p.id === a.patientId)?.name || `#${a.patientId}`, action: a.status ? `Appointment ${a.status}` : 'Appointment updated', time: new Date(a.updatedAt || a.createdAt).toLocaleString(), doctor: a.doctorName || '' }));
        const recentFromPays = pays.slice().sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,5).map((p: any) => ({ id: `p-${p.id}`, type: 'payment', patient: pats.find((pt: any) => pt.id === p.patientId)?.name || `#${p.patientId}`, action: 'Payment recorded', time: new Date(p.createdAt).toLocaleString(), amount: `$${p.amountPaid || p.finalAmount || 0}` }));
        const recentFromPats = pats.slice().sort((a: any,b: any) => b.id - a.id).slice(0,3).map((p: any) => ({ id: `u-${p.id}`, type: 'patient', patient: p.name, action: 'New patient registered', time: p.createdAt ? new Date(p.createdAt).toLocaleString() : '' }));

        const recent = [...recentFromAppts, ...recentFromPays, ...recentFromPats].slice(0,8);

        setKpis({ todaysAppointments: todaysAppts.length, monthlyRevenue, outstandingPayments: outstanding, insuranceSavings });
        setUpcomingAppointments(upcoming);
        setRecentActivities(recent);
      } catch (err) {
        console.error('Failed loading dashboard data', err);
      }
    }

    load();
    return () => { mounted = false; };
  }, [onNavigate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={t('kpi.todaysAppointments')}
          value={kpis.todaysAppointments}
          icon={Calendar}
          trend={{ value: '', isPositive: true }}
        />
        <KPICard
          title={t('kpi.monthlyRevenue')}
          value={`$${kpis.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: '', isPositive: true }}
        />
        <KPICard
          title={t('kpi.outstandingPayments')}
          value={`$${kpis.outstandingPayments.toLocaleString()}`}
          icon={CreditCard}
          description={t('kpi.pendingBalances')}
        />
        <KPICard
          title={t('kpi.insuranceSavings')}
          value={`$${kpis.insuranceSavings.toLocaleString()}`}
          icon={TrendingUp}
          trend={{ value: '', isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('quickActions.title')}</CardTitle>
          <CardDescription>{t('quickActions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              className="h-auto py-4 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (typeof onNavigate === 'function') onNavigate('patients');
                else navigate('/patients');
                // dispatch event to open create modal once the Patients screen mounts
                setTimeout(() => window.dispatchEvent(new CustomEvent('open:create-patient')), 400);
              }}
            >
              <UserPlus className="w-6 h-6" />
              <span>{t('quickActions.newPatient')}</span>
            </Button>
            <Button
              className="h-auto py-4 flex flex-col items-center gap-2 bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                if (typeof onNavigate === 'function') onNavigate('appointments');
                else navigate('/appointments');
                setTimeout(() => window.dispatchEvent(new CustomEvent('open:create-appointment')), 400);
              }}
            >
              <CalendarPlus className="w-6 h-6" />
              <span>{t('quickActions.newAppointment')}</span>
            </Button>
            <Button
              className="h-auto py-4 flex flex-col items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (typeof onNavigate === 'function') onNavigate('payments');
                else navigate('/payments');
                setTimeout(() => window.dispatchEvent(new CustomEvent('open:record-payment')), 400);
              }}
            >
              <Wallet className="w-6 h-6" />
              <span>{t('quickActions.recordPayment')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
              <CardTitle>{t('recentActivity.title')}</CardTitle>
              <CardDescription>{t('recentActivity.description')}</CardDescription>
            </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'appointment' ? 'bg-blue-500' :
                    activity.type === 'payment' ? 'bg-emerald-500' : 'bg-purple-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.patient}</p>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                    {activity.doctor && (
                      <p className="text-xs text-gray-500 mt-1">{activity.doctor}</p>
                    )}
                    {activity.amount && (
                      <p className="text-xs font-medium text-emerald-600 mt-1">{activity.amount}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
              <CardTitle>{t('upcoming.title')}</CardTitle>
              <CardDescription>{t('upcoming.description')}</CardDescription>
            </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-blue-100 text-blue-700">
                    <span className="text-xs font-medium">{t('appointment.timeLabel')}</span>
                    <span className="text-sm font-bold">{appointment.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{appointment.patient}</p>
                    <p className="text-sm text-gray-600">{appointment.procedure}</p>
                    <p className="text-xs text-gray-500 mt-1">{appointment.doctor}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate('appointments')}
              >
                {t('viewFullCalendar')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
