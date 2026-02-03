import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { StatusBadge } from './StatusBadge';
import { CalendarPlus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { getAppointments, createAppointment, getPatients, getUsers, updateAppointment } from '../lib/api';

interface Appointment {
  id: number;
  scheduledAt: Date;
  patient: string;
  doctor: string;
  doctorId?: number;
  procedure: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  duration: number;
}

export function AppointmentsScreen() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null); // <-- Usuario actual

  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    procedure: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    notes: ''
  });

  // Cargar usuario actual, pacientes, doctores y citas
  useEffect(() => {
    async function fetchData() {
      try {
        const [apptsRes, patientsRes, usersRes] = await Promise.all([
          getAppointments(),
          getPatients(),
          getUsers()
        ]);

        setPatients(patientsRes.patients);

        // Normalizar roles y obtener lista de doctores
        const doctorsData = usersRes.users.filter((u: any) => String(u.role).toLowerCase() === 'doctor');
        // Detectar usuario actual desde el token si es posible
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const me = usersRes.users.find((u: any) => u.id === payload.id) || usersRes.users[0];
            setCurrentUser(me);
          } else {
            setCurrentUser(usersRes.users[0]);
          }
        } catch (e) {
          setCurrentUser(usersRes.users[0]);
        }
        setDoctors(doctorsData);

        const mapped = apptsRes.appointments.map((a: any) => {
          const patientName = patientsRes.patients.find((p: any) => p.id === a.patientId)?.name || 'Unknown';
          const doctorName = usersRes.users.find((d: any) => d.id === a.doctorId)?.name || 'Unknown';
          return {
            id: a.id,
            scheduledAt: new Date(a.scheduledAt),
            patient: patientName,
            doctor: doctorName,
            doctorId: a.doctorId,
            procedure: a.procedure,
            status: a.status,
            duration: a.duration
          };
        });

        setAppointments(mapped);
      } catch (err) {
        console.error('Error loading data', err);
      }
    }

    fetchData();
    // listen for dashboard quick action
    const onOpenCreate = () => setIsCreateModalOpen(true);
    window.addEventListener('open:create-appointment', onOpenCreate as EventListener);
    return () => { window.removeEventListener('open:create-appointment', onOpenCreate as EventListener); };
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const isBeforeToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compare = new Date(date);
    compare.setHours(0, 0, 0, 0);
    return compare < today;
  };

  // Handlers (modifica estos en tu componente)
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);

    if (isBeforeToday(d)) {
      return; // No permite ir al pasado
    }

    setCurrentDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date());

  // Verificar si estamos en hoy
  const isToday = isSameDay(currentDate, new Date());

  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 9 + i;
    return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
  });

  const getStatusColor = (status: string) => {
    switch (String(status).toLowerCase()) {
      case 'scheduled': return 'border-l-blue-500 bg-blue-50';
      case 'completed': return 'border-l-emerald-500 bg-emerald-50';
      case 'cancelled': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateAppointment(id, { status });
      // refresh appointments
      const latest = await getAppointments();
      const mappedLatest = latest.appointments.map((a: any) => {
        const patientName = patients.find((p: any) => p.id === a.patientId)?.name || 'Unknown';
        const doctorName = doctors.find((d: any) => d.id === a.doctorId)?.name || 'Unknown';
        return {
          id: a.id,
          scheduledAt: new Date(a.scheduledAt),
          patient: patientName,
          doctor: doctorName,
          doctorId: a.doctorId,
          procedure: a.procedure,
          status: a.status,
          duration: a.duration
        };
      });
      setAppointments(mappedLatest);
    } catch (err) {
      console.error('Failed to update appointment status', err);
      alert('Failed to update appointment');
    }
  };

  const handleCreateAppointment = async () => {
    try {
      const patientId = patients.find(p => p.name === formData.patient)?.id;
      const doctorId = doctors.find(d => d.name === formData.doctor)?.id;

      if (!patientId || !doctorId) {
        return alert("Select a valid patient and doctor");
      }

      const scheduledAt = new Date(`${formData.date}T${formData.time}:00`);

      // 🔒 VALIDACIÓN 1: No permitir fechas pasadas
      const now = new Date();
      if (scheduledAt < now) {
        alert("Cannot schedule appointments in the past");
        return;
      }

      // 🔒 VALIDACIÓN 2: No permitir duplicados (mismo doctor, misma fecha, misma hora)
      const isDuplicate = appointments.some(appt => {
        const sameDoctor = appt.doctorId && doctorId ? appt.doctorId === doctorId : appt.doctor === formData.doctor;
        const sameDate = appt.scheduledAt.toDateString() === scheduledAt.toDateString();
        const sameHour = appt.scheduledAt.getHours() === scheduledAt.getHours();
        const sameMinute = appt.scheduledAt.getMinutes() === scheduledAt.getMinutes();

        return sameDoctor && sameDate && sameHour && sameMinute;
      });

      if (isDuplicate) {
        alert(`Doctor ${formData.doctor} already has an appointment scheduled at ${formData.time} on this date. Please choose a different time.`);
        return;
      }

      // Si pasa todas las validaciones, crear la cita
      const res = await createAppointment({
        patientId,
        doctorId,
        procedure: formData.procedure,
        scheduledAt: scheduledAt.toISOString(),
        duration: formData.duration,
        notes: formData.notes
      });

      // Refrescar la lista completa desde la API para asegurar consistencia
      const latest = await getAppointments();
      const mappedLatest = latest.appointments.map((a: any) => {
        const patientName = patients.find((p: any) => p.id === a.patientId)?.name || 'Unknown';
        const doctorName = doctors.find((d: any) => d.id === a.doctorId)?.name || 'Unknown';
        return {
          id: a.id,
          scheduledAt: new Date(a.scheduledAt),
          patient: patientName,
          doctor: doctorName,
          doctorId: a.doctorId,
          procedure: a.procedure,
          status: a.status,
          duration: a.duration
        };
      });

      setAppointments(mappedLatest);

      setIsCreateModalOpen(false);

      // Limpiar formulario después de éxito
      setFormData({
        patient: '',
        doctor: '',
        procedure: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        duration: 60,
        notes: ''
      });

    } catch (err) {
      console.error('Error creating appointment', err);
      alert('Failed to create appointment');
    }
  };

  if (!currentUser) return <div>Loading user...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">Manage patient appointments and scheduling</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <CalendarPlus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>
      {/* JSX (tu vista) */}
      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handlePrevDay}
              disabled={isToday}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">{formatDate(currentDate)}</h2>
            </div>

            <Button variant="outline" onClick={handleNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              onClick={handleToday}
              disabled={isToday}
            >
              Today
            </Button>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week')}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Calendar View: day or week */}
      {view === 'day' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {doctors
            .filter(doc => currentUser.role === 'admin' || doc.id === currentUser.id)
            .map(doc => {
              const apptsForDoctor = appointments.filter(a =>
                (currentUser.role === 'admin' || a.doctor === currentUser.name) &&
                a.doctor === doc.name &&
                a.scheduledAt.toDateString() === currentDate.toDateString()
              );

              return (
                <Card key={doc.id}>
                  <CardHeader>
                    <CardTitle>{doc.name}'s Schedule</CardTitle>
                    <CardDescription>{apptsForDoctor.length} appointments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {timeSlots.map(time => {
                        const [hourStr, minuteStr] = time.split(':');
                        const hour = parseInt(hourStr);
                        const isPM = time.includes('PM');
                        const hour24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
                        const minute = parseInt(minuteStr);

                        const appt = apptsForDoctor.find(a =>
                          a.scheduledAt.getHours() === hour24 &&
                          a.scheduledAt.getMinutes() === minute
                        );

                        return (
                          <div key={time} className="flex items-center gap-3 min-h-[60px]">
                            <div className="w-20 text-sm text-gray-600 font-medium">{time}</div>
                            {appt ? (
                              <div className={`flex-1 p-3 rounded-lg border-l-4 ${getStatusColor(appt.status)} cursor-pointer hover:shadow-md transition-shadow`}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{appt.patient}</p>
                                    <p className="text-sm text-gray-600">{appt.procedure}</p>
                                    <p className="text-xs text-gray-500 mt-1">{appt.duration} min</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <StatusBadge status={appt.status} />
                                    <div className="flex gap-2">
                                      {appt.status.toLowerCase() !== 'completed' && (
                                        <Button size="sm" onClick={() => handleUpdateStatus(appt.id, 'completed')}>Complete</Button>
                                      )}
                                      {appt.status.toLowerCase() !== 'cancelled' && (
                                        <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(appt.id, 'cancelled')}>Cancel</Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 p-3 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">Available</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        <div className="space-y-6">
          {doctors
            .filter(doc => currentUser.role === 'admin' || doc.id === currentUser.id)
            .map(doc => {
              const weekStart = new Date(currentDate);
              const dow = weekStart.getDay();
              weekStart.setDate(weekStart.getDate() - dow);
              const days = Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                return d;
              });

              const apptsForDoctor = appointments.filter(a => a.doctor === doc.name);

              return (
                <Card key={doc.id}>
                  <CardHeader>
                    <CardTitle>{doc.name} — Week</CardTitle>
                    <CardDescription>{apptsForDoctor.length} appointments this week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-4">
                      {days.map(day => {
                        const apptsForDay = apptsForDoctor.filter(a => a.scheduledAt.toDateString() === day.toDateString())
                          .sort((a,b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

                        return (
                          <div key={day.toISOString()} className="p-2 border rounded">
                            <div className="text-xs text-gray-500 font-medium mb-2">{day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                            <div className="space-y-2">
                              {apptsForDay.length === 0 && <div className="text-xs text-gray-400">No appts</div>}
                              {apptsForDay.map(appt => (
                                <div key={appt.id} className={`p-2 rounded ${getStatusColor(appt.status)} text-sm` }>
                                  <div className="font-medium">{appt.patient}</div>
                                  <div className="text-xs text-gray-700">{appt.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {appt.procedure}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Create Appointment Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>Create a new appointment for a patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Patient */}
            <div className="space-y-2">
              <Label htmlFor="patient">Patient</Label>
              <Select value={formData.patient} onValueChange={(value) => setFormData({ ...formData, patient: value })}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Doctor */}
            <div className="space-y-2">
              <Label htmlFor="doctor">Doctor</Label>
              <Select value={formData.doctor} onValueChange={(value) => setFormData({ ...formData, doctor: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Procedure */}
            <div className="space-y-2">
              <Label htmlFor="procedure">Procedure</Label>
              <Select value={formData.procedure} onValueChange={(value) => setFormData({ ...formData, procedure: value })}>
                <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teeth Cleaning">Teeth Cleaning</SelectItem>
                  <SelectItem value="Root Canal">Root Canal</SelectItem>
                  <SelectItem value="Crown Placement">Crown Placement</SelectItem>
                  <SelectItem value="Filling">Filling</SelectItem>
                  <SelectItem value="Extraction">Extraction</SelectItem>
                  <SelectItem value="Consultation">Consultation</SelectItem>
                  <SelectItem value="Checkup">Checkup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}  // ← Esto bloquea días anteriores
                  value={formData.date}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    const today = new Date().toISOString().split('T')[0];

                    // Validación extra por si acaso
                    if (selectedDate < today) {
                      alert("Cannot schedule appointments in the past");
                      return;
                    }

                    setFormData({ ...formData, date: selectedDate });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={formData.duration.toString()} onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAppointment} className="bg-blue-600 hover:bg-blue-700">Schedule Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
