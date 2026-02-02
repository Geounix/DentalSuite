import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Calendar, TrendingUp, DollarSign, Activity, Users } from 'lucide-react';
import { useState } from 'react';

export function ReportsScreen() {
  const [dateRange, setDateRange] = useState('last-30-days');

  const revenueData = [
    { month: 'Jul', revenue: 42000, target: 40000 },
    { month: 'Aug', revenue: 45000, target: 42000 },
    { month: 'Sep', revenue: 48000, target: 45000 },
    { month: 'Oct', revenue: 52000, target: 48000 },
    { month: 'Nov', revenue: 49000, target: 50000 },
    { month: 'Dec', revenue: 54000, target: 52000 },
    { month: 'Jan', revenue: 48350, target: 55000 },
  ];

  const procedureData = [
    { name: 'Cleaning', count: 145, revenue: 21750 },
    { name: 'Filling', count: 89, revenue: 26700 },
    { name: 'Root Canal', count: 34, revenue: 40800 },
    { name: 'Crown', count: 28, revenue: 42000 },
    { name: 'Extraction', count: 45, revenue: 13500 },
    { name: 'Implant', count: 12, revenue: 30000 },
  ];

  const insuranceData = [
    { name: 'BlueCross', value: 35, coverage: 125000 },
    { name: 'Aetna', value: 25, coverage: 89000 },
    { name: 'Cigna', value: 20, coverage: 72000 },
    { name: 'Delta', value: 15, coverage: 145000 },
    { name: 'Other', value: 5, coverage: 48000 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const outstandingData = [
    { range: '0-30 days', amount: 3200 },
    { range: '31-60 days', amount: 2400 },
    { range: '61-90 days', amount: 1800 },
    { range: '90+ days', amount: 1020 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Financial insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="last-90-days">Last 90 days</SelectItem>
                <SelectItem value="last-year">Last year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">$174,750</div>
            <p className="text-xs text-emerald-600 mt-1">↑ 12% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">$8,420</div>
            <p className="text-xs text-gray-500 mt-1">From 15 patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Procedures</CardTitle>
            <Activity className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">353</div>
            <p className="text-xs text-gray-500 mt-1">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">New Patients</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">24</div>
            <p className="text-xs text-emerald-600 mt-1">↑ 8% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue vs. target comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: any) => `$${value.toLocaleString()}`}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} name="Actual Revenue" />
              <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Target" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procedure Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Procedure Statistics</CardTitle>
            <CardDescription>Revenue by procedure type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={procedureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Insurance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Insurance Distribution</CardTitle>
            <CardDescription>Patient coverage by provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={insuranceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {insuranceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: any) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Balances by Age</CardTitle>
          <CardDescription>Aging report for unpaid invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={outstandingData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="range" type="category" stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: any) => `$${value.toLocaleString()}`}
              />
              <Bar dataKey="amount" fill="#f59e0b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Procedure Performance Details</CardTitle>
          <CardDescription>Comprehensive breakdown by procedure type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Procedure</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Count</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Total Revenue</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Avg per Procedure</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {procedureData.map((procedure, index) => {
                  const totalRevenue = procedureData.reduce((sum, p) => sum + p.revenue, 0);
                  const percentage = ((procedure.revenue / totalRevenue) * 100).toFixed(1);
                  const avgPerProcedure = Math.round(procedure.revenue / procedure.count);
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{procedure.name}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{procedure.count}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">${procedure.revenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">${avgPerProcedure.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
