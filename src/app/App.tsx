import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { UserManagementScreen } from './components/UserManagementScreen';
import { PatientsScreen } from './components/PatientsScreen';
import { AppointmentsScreen } from './components/AppointmentsScreen';
import { PaymentsScreen } from './components/PaymentsScreen';
import { InsuranceScreen } from './components/InsuranceScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { DocumentsScreen } from './components/DocumentsScreen';
import { ConsentFormsScreen } from './components/ConsentFormsScreen';

import { 
  Activity,
  LayoutDashboard, 
  Users, 
  UserCog, 
  Calendar, 
  DollarSign, 
  Shield, 
  FileText, 
  FileCheck, 
  BarChart3,
  Menu,
  X,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { Avatar, AvatarFallback } from './components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';

type Screen = 
  | 'dashboard' 
  | 'users' 
  | 'patients' 
  | 'appointments' 
  | 'payments' 
  | 'insurance' 
  | 'documents' 
  | 'consent-forms' 
  | 'reports';

const navigationItems = [
  { id: 'dashboard' as Screen, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patients' as Screen, label: 'Patients', icon: Users },
  { id: 'appointments' as Screen, label: 'Appointments', icon: Calendar },
  { id: 'payments' as Screen, label: 'Payments', icon: DollarSign },
  { id: 'insurance' as Screen, label: 'Insurance', icon: Shield },
  { id: 'documents' as Screen, label: 'Documents', icon: FileText },
  { id: 'consent-forms' as Screen, label: 'Consent Forms', icon: FileCheck },
  { id: 'reports' as Screen, label: 'Reports', icon: BarChart3 },
  { id: 'users' as Screen, label: 'User Management', icon: UserCog },
];

function AppContent({ user, setUser, setIsLoggedIn }: { user: any, setUser: any, setIsLoggedIn: any }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
    : 'U';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`
          ${isSidebarCollapsed ? 'w-20' : 'w-64'} 
          bg-white border-r border-gray-200 
          transition-all duration-300 
          flex flex-col
          fixed lg:static inset-y-0 left-0 z-50
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-gray-200`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">DentaCare</h1>
                <p className="text-xs text-gray-600">Clinic Management</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          )}
          {/* Mobile close button */}
          <button 
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === `/${item.id}`;
              return (
                <Link
                  key={item.id}
                  to={`/${item.id}`}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}
                    ${isSidebarCollapsed ? 'justify-center' : ''}
                  `}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-600'}`} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collapse Toggle */}
        <div className="hidden lg:block border-t border-gray-200 p-4">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="hidden md:block">
              <p className="text-sm text-gray-600">Welcome back,</p>
              <p className="font-semibold text-gray-900">{user?.name ?? 'User'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Settings */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <Avatar>
                    <AvatarFallback className="bg-blue-600 text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user?.name ?? 'User'}</p>
                    <p className="text-xs text-gray-600">{user?.role ?? ''}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setUser(null);
                  setIsLoggedIn(false);
                }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardScreen />} />
              <Route path="/users" element={<UserManagementScreen />} />
              <Route path="/patients" element={<PatientsScreen />} />
              <Route path="/appointments" element={<AppointmentsScreen />} />
              <Route path="/payments" element={<PaymentsScreen />} />
              <Route path="/insurance" element={<InsuranceScreen />} />
              <Route path="/documents" element={<DocumentsScreen />} />
              <Route path="/consent-forms" element={<ConsentFormsScreen />} />
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(localStorage.getItem('token')));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(u, t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      setIsLoggedIn(true);
    }} />;
  }

  return <AppContent user={user} setUser={setUser} setIsLoggedIn={setIsLoggedIn} />;
}
