import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { StatusBadge } from './StatusBadge';
import { CalendarPlus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit2, AlertTriangle, X, Clock, User, Stethoscope } from 'lucide-react';
import { getAppointments, createAppointment, getPatients, getUsers, updateAppointment, getCatalogProcedures } from '../lib/api';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { SearchableSelect } from './SearchableSelect';

interface Appointment {
  id: number;
  scheduledAt: Date;
  patient: string;
  patientId?: number;
  doctor: string;
  doctorId?: number;
  procedure: string;
  status: string;
  duration: number;
  notes?: string;
}

export function AppointmentsScreen() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [catalogProcedures, setCatalogProcedures] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | 'all'>('all');
  const [inactivePatients, setInactivePatients] = useState<string[]>([]);
  const [showInactiveBanner, setShowInactiveBanner] = useState(true);

  // Edit modal
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState({
    patientId: '', doctorId: '', procedure: '',
    date: '', time: '', duration: 60, notes: ''
  });

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    procedure: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    notes: ''
  });

  const refreshAppointments = async (pts: any[], drs: any[]) => {
    const apptsRes = await getAppointments();
    return apptsRes.appointments.map((a: any) => ({
      id: a.id,
      scheduledAt: new Date(a.scheduledAt),
      patient: pts.find((p: any) => p.id === a.patientId)?.name || 'Unknown',
      patientId: a.patientId,
      doctor: drs.find((d: any) => d.id === a.doctorId)?.name || 'Unknown',
      doctorId: a.doctorId,
      procedure: a.procedure,
      status: a.status,
      duration: a.duration,
      notes: a.notes || '',
    }));
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [apptsRes, patientsRes, usersRes, catRes] = await Promise.all([
          getAppointments(),
          getPatients(),
          getUsers(),
          getCatalogProcedures({ limit: 2000 }).catch(() => ({ catalog: [] })),
        ]);
        const pats = patientsRes.patients;
        const drs = usersRes.users.filter((u: any) => String(u.role).toLowerCase() === 'doctor');
        setCatalogProcedures(catRes.catalog || []);

        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const me = usersRes.users.find((u: any) => u.id === payload.id) || usersRes.users[0];
            setCurrentUser(me);
          } else {
            setCurrentUser(usersRes.users[0]);
          }
        } catch {
          setCurrentUser(usersRes.users[0]);
        }

        setPatients(pats);
        setDoctors(drs);

        const mapped: Appointment[] = apptsRes.appointments.map((a: any) => ({
          id: a.id,
          scheduledAt: new Date(a.scheduledAt),
          patient: pats.find((p: any) => p.id === a.patientId)?.name || 'Unknown',
          patientId: a.patientId,
          doctor: drs.find((d: any) => d.id === a.doctorId)?.name || 'Unknown',
          doctorId: a.doctorId,
          procedure: a.procedure,
          status: a.status,
          duration: a.duration,
          notes: a.notes || '',
        }));
        setAppointments(mapped);

        // Detect patients inactive >90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const inactive = pats.filter((pat: any) => {
          const lastAppt = mapped
            .filter(a => a.patientId === pat.id)
            .sort((x, y) => y.scheduledAt.getTime() - x.scheduledAt.getTime())[0];
          return !lastAppt || lastAppt.scheduledAt < ninetyDaysAgo;
        }).map((p: any) => p.name);
        setInactivePatients(inactive);
      } catch (err) {
        console.error('Error loading data', err);
      }
    }

    fetchData();
    const onOpenCreate = () => setIsCreateModalOpen(true);
    window.addEventListener('open:create-appointment', onOpenCreate as EventListener);
    return () => { window.removeEventListener('open:create-appointment', onOpenCreate as EventListener); };
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const isBeforeToday = (date: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const compare = new Date(date); compare.setHours(0, 0, 0, 0);
    return compare < today;
  };

  const isToday = isSameDay(currentDate, new Date());

  const handlePrevDay = () => {
    const d = new Date(currentDate); d.setDate(d.getDate() - 1);
    if (!isBeforeToday(d)) setCurrentDate(d);
  };
  const handleNextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); };
  const handleToday = () => setCurrentDate(new Date());

  const getStatusColor = (status: string) => {
    switch (String(status).toLowerCase()) {
      case 'scheduled': return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100';
      case 'completed': return 'border-l-emerald-500 bg-emerald-50';
      case 'cancelled': return 'border-l-red-400 bg-red-50 opacity-70';
      default: return 'border-l-gray-400 bg-gray-50';
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateAppointment(id, { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      console.error('Failed to update appointment status', err);
    }
  };

  // Open edit modal
  const openEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    const d = appt.scheduledAt;
    setEditForm({
      patientId: String(appt.patientId || ''),
      doctorId: String(appt.doctorId || ''),
      procedure: appt.procedure,
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      duration: appt.duration,
      notes: appt.notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAppt) return;
    try {
      const patientId = Number(editForm.patientId) || undefined;
      const doctorId = Number(editForm.doctorId) || undefined;
      const scheduledAt = new Date(`${editForm.date}T${editForm.time}:00`);
      await updateAppointment(editingAppt.id, {
        patientId, doctorId,
        procedure: editForm.procedure,
        scheduledAt: scheduledAt.toISOString(),
        duration: editForm.duration,
        notes: editForm.notes,
      });
      const updated = await refreshAppointments(patients, doctors);
      setAppointments(updated);
      setEditingAppt(null);
    } catch (err) {
      console.error('Failed to save edit', err);
      alert('Error al guardar los cambios.');
    }
  };

  const handleCreateAppointment = async () => {
    const patientId = Number(formData.patientId);
    const doctorId = Number(formData.doctorId);
    if (!patientId) { alert(t('appointmentForm.errors.selectPatient')); return; }
    if (!doctorId) { alert(t('appointmentForm.errors.selectDoctor')); return; }
    if (!formData.procedure) { alert('Selecciona un procedimiento.'); return; }
    const scheduledAt = new Date(`${formData.date}T${formData.time}:00`);
    if (scheduledAt < new Date()) { alert('No se puede agendar en el pasado.'); return; }
    try {
      await createAppointment({ patientId, doctorId, procedure: formData.procedure, scheduledAt: scheduledAt.toISOString(), duration: formData.duration, notes: formData.notes });
      const updated = await refreshAppointments(patients, doctors);
      setAppointments(updated);
      setIsCreateModalOpen(false);
      setFormData({ patientId: '', doctorId: '', procedure: '', date: new Date().toISOString().split('T')[0], time: '09:00', duration: 60, notes: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      alert(`Error: ${msg}`);
    }
  };

  if (!currentUser) return <div className="p-8 text-gray-500">{t('loading.user')}</div>;

  // Options for searchable selects
  const patientOptions = patients.map(p => ({ value: String(p.id), label: p.name }));
  const doctorOptions = doctors.map(d => ({ value: String(d.id), label: d.name }));
  const procedureOptions = catalogProcedures.map(c => ({ value: c.name, label: c.name }));

  // Filtered doctors for display
  const visibleDoctors = currentUser.role === 'admin' ? doctors : doctors.filter((d: any) => d.id === currentUser.id);

  // Day view: appointments for selected doctor filter
  const getDayAppts = (doctorId?: number) =>
    appointments
      .filter(a => a.scheduledAt && isSameDay(a.scheduledAt, currentDate))
      .filter(a => !doctorId || a.doctorId === doctorId)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const activeDoctorId = selectedDoctorId === 'all' ? undefined : selectedDoctorId;
  const dayAppointments = getDayAppts(activeDoctorId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('appointments.title')}</h1>
          <p className="text-gray-600 mt-1">{t('appointments.subtitle')}</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <CalendarPlus className="w-4 h-4 mr-2" />
          {t('appointments.newAppointment')}
        </Button>
      </div>

      {/* Inactivity Alert Banner */}
      {showInactiveBanner && inactivePatients.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {inactivePatients.length} paciente{inactivePatients.length > 1 ? 's' : ''} sin consulta en más de 3 meses
            </p>
            <p className="text-sm text-amber-700 mt-1 truncate">
              {inactivePatients.slice(0, 5).join(', ')}{inactivePatients.length > 5 ? ` y ${inactivePatients.length - 5} más…` : ''}
            </p>
          </div>
          <button onClick={() => setShowInactiveBanner(false)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Bar */}
      <Card>
        <CardContent className="pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevDay} disabled={isToday}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[200px]">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900 text-sm">{formatDate(currentDate)}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {!isToday && (
              <Button variant="outline" size="sm" onClick={handleToday}>Hoy</Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Doctor Filter (only in day view) */}
            {view === 'day' && visibleDoctors.length > 1 && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <Select
                  value={String(selectedDoctorId)}
                  onValueChange={(v) => setSelectedDoctorId(v === 'all' ? 'all' : Number(v))}
                >
                  <SelectTrigger className="w-44 h-8 text-sm">
                    <SelectValue placeholder="Todos los doctores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los doctores</SelectItem>
                    {visibleDoctors.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week')}>
              <TabsList>
                <TabsTrigger value="day">{t('appointments.view.day')}</TabsTrigger>
                <TabsTrigger value="week">{t('appointments.view.week')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* ── DAY VIEW ── */}
      {view === 'day' && (
        <div className="space-y-3">
          {dayAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Sin citas para este día</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Agregar cita
                </Button>
              </CardContent>
            </Card>
          ) : (
            dayAppointments.map(appt => (
              <div
                key={appt.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-l-4 shadow-sm transition-all ${getStatusColor(appt.status)}`}
              >
                {/* Time */}
                <div className="flex flex-col items-center w-14 flex-shrink-0">
                  <Clock className="w-4 h-4 text-gray-400 mb-0.5" />
                  <span className="text-sm font-bold text-gray-700">
                    {appt.scheduledAt.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                  <span className="text-xs text-gray-400">{appt.duration}m</span>
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-gray-200 flex-shrink-0" />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 truncate">{appt.patient}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Stethoscope className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate">{appt.procedure}</span>
                  </div>
                  {selectedDoctorId === 'all' && (
                    <p className="text-xs text-gray-400 mt-1">Dr. {appt.doctor}</p>
                  )}
                </div>

                {/* Status + Actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge status={appt.status} />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => openEdit(appt)}
                      title="Editar cita"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {String(appt.status).toLowerCase() === 'scheduled' && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleUpdateStatus(appt.id, 'completed')}
                        >
                          {t('appointments.complete')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                        >
                          {t('appointments.cancel')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (() => {
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
        });

        const drsToShow = visibleDoctors;
        return (
          <div className="space-y-4">
            {drsToShow.map((doc: any) => {
              const apptsForDoc = appointments.filter(a => a.doctorId === doc.id);
              return (
                <Card key={doc.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dr. {doc.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {days.map(day => {
                        const dayAppts = apptsForDoc
                          .filter(a => isSameDay(a.scheduledAt, day))
                          .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
                        const isPast = isBeforeToday(day);
                        const isCurrentDay = isSameDay(day, new Date());
                        return (
                          <div key={day.toISOString()} className={`p-2 border rounded-lg min-h-[80px] ${isCurrentDay ? 'border-blue-300 bg-blue-50/40' : 'border-gray-100'} ${isPast ? 'opacity-60' : ''}`}>
                            <div className={`text-xs font-semibold mb-2 ${isCurrentDay ? 'text-blue-600' : 'text-gray-500'}`}>
                              {day.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' })}
                            </div>
                            {dayAppts.length === 0
                              ? <div className="text-xs text-gray-300 italic">Libre</div>
                              : dayAppts.map(a => (
                                <div
                                  key={a.id}
                                  onClick={() => openEdit(a)}
                                  className={`p-1.5 rounded text-xs mb-1 cursor-pointer border-l-2 ${getStatusColor(a.status)}`}
                                >
                                  <div className="font-medium truncate">{a.scheduledAt.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                  <div className="truncate text-gray-700">{a.patient}</div>
                                </div>
                              ))}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* ── Edit Appointment Modal ── */}
      <Dialog open={!!editingAppt} onOpenChange={() => setEditingAppt(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cita</DialogTitle>
            <DialogDescription>Modifica los datos de la cita agendada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <SearchableSelect
                options={patientOptions}
                value={editForm.patientId}
                onChange={v => setEditForm({ ...editForm, patientId: v })}
                placeholder="Buscar paciente..."
              />
            </div>
            <div className="space-y-2">
              <Label>Doctor</Label>
              <SearchableSelect
                options={doctorOptions}
                value={editForm.doctorId}
                onChange={v => setEditForm({ ...editForm, doctorId: v })}
                placeholder="Buscar doctor..."
              />
            </div>
            <div className="space-y-2">
              <Label>Procedimiento</Label>
              <SearchableSelect
                options={procedureOptions}
                value={editForm.procedure}
                onChange={v => setEditForm({ ...editForm, procedure: v })}
                placeholder="Buscar procedimiento del catálogo..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duración</Label>
              <Select value={editForm.duration.toString()} onValueChange={v => setEditForm({ ...editForm, duration: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1.5 horas</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Observaciones opcionales…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAppt(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Appointment Modal ── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('appointmentForm.scheduleTitle')}</DialogTitle>
            <DialogDescription>{t('appointmentForm.scheduleDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('appointmentForm.patientLabel')}</Label>
              <SearchableSelect
                options={patientOptions}
                value={formData.patientId}
                onChange={v => setFormData({ ...formData, patientId: v })}
                placeholder="Buscar paciente..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t('appointmentForm.doctorLabel')}</Label>
              <SearchableSelect
                options={doctorOptions}
                value={formData.doctorId}
                onChange={v => setFormData({ ...formData, doctorId: v })}
                placeholder="Buscar doctor..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t('appointmentForm.procedureLabel')}</Label>
              <SearchableSelect
                options={procedureOptions}
                value={formData.procedure}
                onChange={v => setFormData({ ...formData, procedure: v })}
                placeholder="Buscar procedimiento del catálogo..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.date}
                  onChange={e => {
                    const today = new Date().toISOString().split('T')[0];
                    if (e.target.value < today) { alert(t('appointmentForm.pastDateError')); return; }
                    setFormData({ ...formData, date: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('appointmentForm.timeLabel')}</Label>
                <Input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('appointmentForm.durationLabel')}</Label>
              <Select value={formData.duration.toString()} onValueChange={v => setFormData({ ...formData, duration: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">{t('appointmentForm.durationOptions.30')}</SelectItem>
                  <SelectItem value="45">{t('appointmentForm.durationOptions.45')}</SelectItem>
                  <SelectItem value="60">{t('appointmentForm.durationOptions.60')}</SelectItem>
                  <SelectItem value="90">{t('appointmentForm.durationOptions.90')}</SelectItem>
                  <SelectItem value="120">{t('appointmentForm.durationOptions.120')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Observaciones adicionales…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreateAppointment} className="bg-blue-600 hover:bg-blue-700">
              {t('appointmentForm.scheduleButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
