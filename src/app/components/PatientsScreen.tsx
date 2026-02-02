import { useState, useEffect } from 'react';
import { getPatients, createPatient, updatePatient, getAppointments, getUsers } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { StatusBadge } from './StatusBadge';
import { UserPlus, Search, Eye, Calendar, FileText, DollarSign, FileCheck, Activity, Edit } from 'lucide-react';
import { OdontogramScreen } from './OdontogramScreen';

interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  lastVisit: string;
  nextAppointment?: string;
  balance: number;
}

export function PatientsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    insurance: ''
  });

  // Cargar pacientes y calcular próximas citas
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const [patientsRes, apptsRes] = await Promise.all([getPatients(), getAppointments()]);
        const appts = apptsRes.appointments || [];
        const mapped: Patient[] = patientsRes.patients.map((p: any) => {
          const patientAppts = appts.filter((a: any) => a.patientId === p.id).map((a: any) => ({ ...a, scheduledAt: new Date(a.scheduledAt) }));
          const upcoming = patientAppts
            .filter((a: any) => a.scheduledAt > new Date())
            .sort((a: any, b: any) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
          const past = patientAppts
            .filter((a: any) => a.scheduledAt <= new Date())
            .sort((a: any, b: any) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

          return {
            id: p.id,
            name: p.name,
            email: p.email ?? '',
            phone: p.phone ?? '',
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '',
            lastVisit: past.length ? past[0].scheduledAt.toISOString().split('T')[0] : '-',
            nextAppointment: upcoming.length ? upcoming[0].scheduledAt.toISOString().split('T')[0] : undefined,
            balance: p.balance ?? 0
          };
        });
        setPatients(mapped);
      } catch (err) {
        console.error('Error loading patients', err);
      }
    };
    loadPatients();
  }, []);

  // Crear paciente
  const handleCreatePatient = async () => {
    try {
      const data = await createPatient(formData);
      const newPatient: Patient = {
        id: data.patient.id,
        name: data.patient.name,
        email: data.patient.email ?? '',
        phone: data.patient.phone ?? '',
        dateOfBirth: data.patient.dateOfBirth ? new Date(data.patient.dateOfBirth).toISOString().split('T')[0] : '',
        lastVisit: '-',
        nextAppointment: undefined,
        balance: data.patient.balance ?? 0
      };
      setPatients([newPatient, ...patients]);
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', phone: '', dateOfBirth: '', address: '', insurance: '' });
    } catch (err) {
      console.error('Error creating patient', err);
      alert('Error creating patient');
    }
  };

  // Editar paciente
  const handleEditPatient = async () => {
    if (!editingPatient) return;
    try {
      const data = await updatePatient(editingPatient.id, formData);
      const updatedPatient: Patient = {
        id: data.patient.id,
        name: data.patient.name,
        email: data.patient.email ?? '',
        phone: data.patient.phone ?? '',
        dateOfBirth: data.patient.dateOfBirth ? new Date(data.patient.dateOfBirth).toISOString().split('T')[0] : '',
        lastVisit: '-',
        nextAppointment: undefined,
        balance: data.patient.balance ?? 0
      };
      setPatients(patients.map(p => p.id === editingPatient.id ? updatedPatient : p));
      setIsEditModalOpen(false);
      setEditingPatient(null);
      setFormData({ name: '', email: '', phone: '', dateOfBirth: '', address: '', insurance: '' });
    } catch (err) {
      console.error('Error updating patient', err);
      alert('Error updating patient');
    }
  };

  // Filtrar pacientes
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery)
  );

  return (
    <>
      {!selectedPatient ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
              <p className="text-gray-600 mt-1">Manage patient records and information</p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search patients by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Patients Table */}
          <Card>
            <CardHeader>
              <CardTitle>Patient List ({filteredPatients.length})</CardTitle>
              <CardDescription>View and manage patient records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Next Appointment</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">{patient.email}</div>
                            <div className="text-sm text-gray-600">{patient.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{patient.dateOfBirth}</TableCell>
                        <TableCell className="text-gray-600">{patient.lastVisit}</TableCell>
                        <TableCell>
                          {patient.nextAppointment ? (
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-gray-900">{patient.nextAppointment}</div>
                              <StatusBadge status="Scheduled" />
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${patient.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            ${patient.balance}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPatient(patient);
                              setFormData({
                                name: patient.name,
                                email: patient.email,
                                phone: patient.phone,
                                dateOfBirth: patient.dateOfBirth,
                                address: '',
                                insurance: ''
                              });
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Create Patient Modal */}
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Patient</DialogTitle>
                <DialogDescription>
                  Create a new patient record
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="insurance">Insurance Provider</Label>
                  <Input
                    id="insurance"
                    value={formData.insurance}
                    onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                    placeholder="BlueCross BlueShield"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePatient} className="bg-blue-600 hover:bg-blue-700">
                  Create Patient
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Patient Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Patient</DialogTitle>
                <DialogDescription>
                  Update patient record
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="insurance">Insurance Provider</Label>
                  <Input
                    id="insurance"
                    value={formData.insurance}
                    onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                    placeholder="BlueCross BlueShield"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditPatient} className="bg-blue-600 hover:bg-blue-700">
                  Update Patient
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <PatientProfileScreen patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
      )}
    </>
  );
}

// Patient Profile with Tabs
function PatientProfileScreen({ patient, onBack }: { patient: Patient; onBack: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
          <p className="text-gray-600 mt-1">Patient ID: #{patient.id}</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Calendar className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{patient.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium text-gray-900">{patient.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date of Birth</p>
              <p className="font-medium text-gray-900">{patient.dateOfBirth}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Outstanding Balance</p>
              <p className={`font-medium ${patient.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ${patient.balance}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="w-4 h-4 mr-2" />
            Medical History
          </TabsTrigger>
          <TabsTrigger value="odontogram">
            <Activity className="w-4 h-4 mr-2" />
            Odontogram
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="w-4 h-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileCheck className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                  <CardTitle>Recent Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentAppointments patientId={patient.id} />
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patient.nextAppointment && (
                    <div className="flex justify-between items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <p className="font-medium text-gray-900">6-Month Checkup</p>
                        <p className="text-sm text-gray-600">Dr. Smith</p>
                        <p className="text-xs text-gray-500 mt-1">{patient.nextAppointment}</p>
                      </div>
                      <StatusBadge status="Scheduled" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Medical History Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: '2026-01-05', type: 'Procedure', title: 'Professional Cleaning', doctor: 'Dr. Smith', notes: 'Regular cleaning completed. No issues found.' },
                  { date: '2025-12-15', type: 'Procedure', title: 'Root Canal Therapy - Session 2', doctor: 'Dr. Martinez', notes: 'Root canal completed successfully. Crown placement scheduled.' },
                  { date: '2025-11-28', type: 'Consultation', title: 'Root Canal Consultation', doctor: 'Dr. Martinez', notes: 'Patient experiencing pain in tooth #18. Root canal recommended.' },
                ].map((record, index) => (
                  <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      {index !== 2 && <div className="w-px h-full bg-gray-200 mt-2" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{record.title}</h4>
                          <p className="text-sm text-gray-600">{record.doctor}</p>
                        </div>
                        <div className="text-sm text-gray-500">{record.date}</div>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{record.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="odontogram">
          <OdontogramScreen patientId={patient.id} />
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>2026-01-05</TableCell>
                    <TableCell>Teeth Cleaning</TableCell>
                    <TableCell>$150</TableCell>
                    <TableCell>$100</TableCell>
                    <TableCell><StatusBadge status="Paid" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2025-12-15</TableCell>
                    <TableCell>Root Canal Therapy</TableCell>
                    <TableCell>$850</TableCell>
                    <TableCell>$500</TableCell>
                    <TableCell><StatusBadge status="Paid" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Patient Documents</CardTitle>
              <CardDescription>Medical records, consent forms, and attachments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['X-Ray - 2026-01-05.pdf', 'Consent Form - Root Canal.pdf', 'Insurance Card.jpg'].map((doc, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <FileText className="w-8 h-8 text-blue-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">{doc}</p>
                    <p className="text-xs text-gray-500 mt-1">Uploaded: 2026-01-05</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Recent appointments (API-driven)
function RecentAppointments({ patientId }: { patientId: number }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [apptsRes, usersRes] = await Promise.all([getAppointments(), getUsers()]);
        const appts = (apptsRes.appointments || [])
          .filter((a: any) => a.patientId === patientId)
          .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
          .slice(0, 5)
          .map((a: any) => ({
            id: a.id,
            procedure: a.procedure,
            doctorName: usersRes.users?.find((u: any) => u.id === a.doctorId)?.name || 'Unknown',
            date: new Date(a.scheduledAt).toISOString().split('T')[0],
            status: a.status || 'scheduled'
          }));
        if (!mounted) return;
        setAppointments(appts);
      } catch (err) {
        console.error('Failed loading recent appointments', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [patientId]);

  if (loading) return <div>Loading appointments...</div>;
  if (appointments.length === 0) return <div className="text-sm text-gray-400">No recent appointments</div>;

  return (
    <div className="space-y-3">
      {appointments.map(appt => (
        <div key={appt.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">{appt.procedure}</p>
            <p className="text-sm text-gray-600">{appt.doctorName}</p>
            <p className="text-xs text-gray-500 mt-1">{appt.date}</p>
          </div>
          <StatusBadge status={appt.status} />
        </div>
      ))}
    </div>
  );
}
