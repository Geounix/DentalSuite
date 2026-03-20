import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from './lib/axios';

// ── Lazy-loaded screens ──────────────────────────────────────────────────────
// Each screen is loaded only when the user navigates to it, reducing the
// initial bundle size significantly.
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const DashboardScreen = lazy(() => import('./components/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const UserManagementScreen = lazy(() => import('./components/UserManagementScreen').then(m => ({ default: m.UserManagementScreen })));
const PatientsScreen = lazy(() => import('./components/PatientsScreen').then(m => ({ default: m.PatientsScreen })));
const AppointmentsScreen = lazy(() => import('./components/AppointmentsScreen').then(m => ({ default: m.AppointmentsScreen })));
const PaymentsScreen = lazy(() => import('./components/PaymentsScreen').then(m => ({ default: m.PaymentsScreen })));
const InsuranceScreen = lazy(() => import('./components/InsuranceScreen').then(m => ({ default: m.InsuranceScreen })));
const ReportsScreen = lazy(() => import('./components/ReportsScreen').then(m => ({ default: m.ReportsScreen })));
const DocumentsScreen = lazy(() => import('./components/DocumentsScreen').then(m => ({ default: m.DocumentsScreen })));
const ConsentFormsScreen = lazy(() => import('./components/ConsentFormsScreen').then(m => ({ default: m.ConsentFormsScreen })));
const CatalogScreen = lazy(() => import('./components/CatalogScreen').then(m => ({ default: m.CatalogScreen })));
const SettingsScreen = lazy(() => import('./components/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
// ────────────────────────────────────────────────────────────────────────────

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
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { Avatar, AvatarFallback } from './components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { getAppointments, getPatients, getClinicSettings } from './lib/api';

type Screen =
  | 'dashboard'
  | 'users'
  | 'patients'
  | 'appointments'
  | 'payments'
  | 'insurance'
  | 'documents'
  | 'consent-forms'
  | 'reports'
  | 'catalog';

const navigationItems = [
  { id: 'dashboard' as Screen, labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'patients' as Screen, labelKey: 'nav.patients', icon: Users },
  { id: 'appointments' as Screen, labelKey: 'nav.appointments', icon: Calendar },
  { id: 'payments' as Screen, labelKey: 'nav.payments', icon: DollarSign },
  { id: 'insurance' as Screen, labelKey: 'nav.insurance', icon: Shield },
  { id: 'documents' as Screen, labelKey: 'nav.documents', icon: FileText },
  { id: 'consent-forms' as Screen, labelKey: 'nav.consentForms', icon: FileCheck },
  { id: 'reports' as Screen, labelKey: 'nav.reports', icon: BarChart3 },
  { id: 'catalog' as Screen, labelKey: 'nav.catalog', icon: Settings },
  { id: 'users' as Screen, labelKey: 'nav.userManagement', icon: UserCog },
];

/** Full-page loading spinner shown while a lazy-loaded screen chunk fetches. */
function ScreenLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

function AppContent({ user, setUser, setIsLoggedIn }: { user: any; setUser: any; setIsLoggedIn: any }) {
  const { t, i18n } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [clinicName, setClinicName] = useState(() => localStorage.getItem('clinicName') || 'DentaCare');
  const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(() => localStorage.getItem('clinicLogoUrl') || null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore network errors */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
  };

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const res: any = await getClinicSettings();
        if (mounted && res?.settings) {
          const name = res.settings.name || 'DentaCare';
          const logo = res.settings.logoUrl || null;
          setClinicName(name);
          setClinicLogoUrl(logo);
          // Cache immediately to avoid flash on next reload
          localStorage.setItem('clinicName', name);
          if (logo) localStorage.setItem('clinicLogoUrl', logo);
          else localStorage.removeItem('clinicLogoUrl');
        }
      } catch (err) {
        console.error('Failed to load clinic settings for layout', err);
      }
    }
    loadSettings();
    return () => { mounted = false; };
  }, []);

  const apiHost = (import.meta as any).env.PROD ? '' : ((import.meta as any).env.VITE_API_URL || 'http://localhost:4000');
  const prefix = apiHost ? apiHost.replace(/\/$/, '') : '';

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
              {clinicLogoUrl ? (
                <img src={`${prefix}/uploads/${clinicLogoUrl.replace(/\\/g, '/')}`} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{clinicName}</h1>
                <p className="text-xs text-gray-600">{t('logo.subtitle')}</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
             clinicLogoUrl ? (
               <img src={`${prefix}/uploads/${clinicLogoUrl.replace(/\\/g, '/')}`} alt="Logo" className="w-10 h-10 object-contain" />
             ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
             )
          )}
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
                  title={isSidebarCollapsed ? t(item.labelKey) : ''}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-600'}`} />
                  {!isSidebarCollapsed && <span>{t(item.labelKey)}</span>}
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
                <span className="text-sm">{t('collapse')}</span>
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
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block">
              <p className="text-sm text-gray-600">{t('welcome.back')}</p>
              <p className="font-semibold text-gray-900">{user?.name ?? t('user.anon')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium">{t('notifications.upcoming')}</p>
                  <p className="text-xs text-gray-500">{t('notifications.next60')}</p>
                </div>
                <UpcomingNotifications />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium">{t('settings.language')}</p>
                </div>
                <DropdownMenuItem onClick={() => { localStorage.setItem('language', 'es-419'); i18n.changeLanguage('es-419'); }}>
                  Español (Latinoamérica)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { localStorage.setItem('language', 'en'); i18n.changeLanguage('en'); }}>
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                {(user?.role?.toLowerCase() === 'admin') && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Ajustes del Sistema
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('user.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Suspense fallback={<ScreenLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardScreen onNavigate={(screen: string) => navigate(`/${screen}`)} />} />
                <Route path="/users" element={<UserManagementScreen />} />
                <Route path="/patients" element={<PatientsScreen />} />
                <Route path="/appointments" element={<AppointmentsScreen />} />
                <Route path="/payments" element={<PaymentsScreen />} />
                <Route path="/insurance" element={<InsuranceScreen />} />
                <Route path="/documents" element={<DocumentsScreen />} />
                <Route path="/consent-forms" element={<ConsentFormsScreen />} />
                <Route path="/reports" element={<ReportsScreen />} />
                <Route path="/catalog" element={<CatalogScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function UpcomingNotifications() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let timer: any;

    async function load() {
      try {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        const apptsRes: any = await getAppointments(dateStr);
        const patsRes: any = await getPatients();
        const appts = apptsRes?.appointments || apptsRes || [];
        const pats = patsRes?.patients || patsRes || [];

        const now = new Date();
        const windowMs = 60 * 60 * 1000; // next 60 minutes
        const upper = new Date(now.getTime() + windowMs);

        const upcoming = appts
          .filter((a: any) => a.scheduledAt)
          .map((a: any) => ({ ...a, scheduledAtDate: new Date(a.scheduledAt) }))
          .filter((a: any) => a.scheduledAtDate >= now && a.scheduledAtDate <= upper)
          .sort((x: any, y: any) => x.scheduledAtDate.getTime() - y.scheduledAtDate.getTime())
          .slice(0, 6)
          .map((a: any) => ({
            id: a.id,
            time: a.scheduledAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            patient: pats.find((p: any) => p.id === a.patientId)?.name || `#${a.patientId}`,
            procedure: a.procedure || '',
          }));

        if (mounted) setItems(upcoming);
      } catch (err) {
        console.error('Failed loading upcoming notifications', err);
      }
    }

    load();
    timer = setInterval(load, 30 * 1000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  if (!items.length) {
    return (
      <div className="px-3 py-3">
        <p className="text-sm text-gray-600">{t('notifications.none')}</p>
        <div className="mt-3">
          <button className="w-full text-left text-sm text-blue-600" onClick={() => navigate('/appointments')}>{t('viewCalendar')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-1">
      {items.map((it) => (
        <DropdownMenuItem key={it.id} onClick={() => navigate('/appointments')}>
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-medium">{it.patient}</p>
              <p className="text-xs text-gray-500">{it.procedure}</p>
            </div>
            <div className="text-xs text-gray-600 ml-4">{it.time}</div>
          </div>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <div className="px-2 py-1">
        <button className="w-full text-sm text-gray-600" onClick={() => navigate('/appointments')}>{t('openSchedule')}</button>
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
    return (
      <Suspense fallback={<ScreenLoader />}>
        <LoginScreen onLogin={(u: any, t: string) => {
          // Store token for Axios interceptor and user for display only
          localStorage.setItem('token', t);
          localStorage.setItem('user', JSON.stringify(u));
          setUser(u);
          setIsLoggedIn(true);
        }} />
      </Suspense>
    );
  }

  return <AppContent user={user} setUser={setUser} setIsLoggedIn={setIsLoggedIn} />;
}
