import { KPICard } from './KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Calendar, DollarSign, CreditCard, TrendingUp, UserPlus, CalendarPlus, Wallet, Clock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const recentActivities = [
    { id: 1, type: 'appointment', patient: 'Sarah Johnson', action: 'Appointment completed', time: '10 minutes ago', doctor: 'Dr. Smith' },
    { id: 2, type: 'payment', patient: 'Michael Chen', action: 'Payment received', time: '25 minutes ago', amount: '$350' },
    { id: 3, type: 'patient', patient: 'Emma Wilson', action: 'New patient registered', time: '1 hour ago', doctor: 'Dr. Martinez' },
    { id: 4, type: 'appointment', patient: 'James Brown', action: 'Appointment scheduled', time: '2 hours ago', doctor: 'Dr. Smith' },
    { id: 5, type: 'payment', patient: 'Lisa Anderson', action: 'Insurance claim processed', time: '3 hours ago', amount: '$500' },
  ];

  const upcomingAppointments = [
    { id: 1, time: '10:00 AM', patient: 'Robert Garcia', procedure: 'Root Canal', doctor: 'Dr. Smith', status: 'Scheduled' },
    { id: 2, time: '11:30 AM', patient: 'Jennifer Lee', procedure: 'Teeth Cleaning', doctor: 'Dr. Martinez', status: 'Scheduled' },
    { id: 3, time: '2:00 PM', patient: 'David Kim', procedure: 'Crown Placement', doctor: 'Dr. Smith', status: 'Scheduled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Today's Appointments"
          value={12}
          icon={Calendar}
          trend={{ value: '2 more than yesterday', isPositive: true }}
        />
        <KPICard
          title="Monthly Revenue"
          value="$48,350"
          icon={DollarSign}
          trend={{ value: '12% from last month', isPositive: true }}
        />
        <KPICard
          title="Outstanding Payments"
          value="$8,420"
          icon={CreditCard}
          description="From 15 patients"
        />
        <KPICard
          title="Insurance Savings"
          value="$12,680"
          icon={TrendingUp}
          trend={{ value: '8% this month', isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              className="h-auto py-4 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => onNavigate('patients')}
            >
              <UserPlus className="w-6 h-6" />
              <span>New Patient</span>
            </Button>
            <Button 
              className="h-auto py-4 flex flex-col items-center gap-2 bg-teal-600 hover:bg-teal-700"
              onClick={() => onNavigate('appointments')}
            >
              <CalendarPlus className="w-6 h-6" />
              <span>New Appointment</span>
            </Button>
            <Button 
              className="h-auto py-4 flex flex-col items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onNavigate('payments')}
            >
              <Wallet className="w-6 h-6" />
              <span>Record Payment</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and actions</CardDescription>
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
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>Upcoming appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-blue-100 text-blue-700">
                    <span className="text-xs font-medium">Time</span>
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
                View Full Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
