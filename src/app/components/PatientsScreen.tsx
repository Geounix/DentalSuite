import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getPatients, createPatient, updatePatient, getAppointments, getUsers, getProcedures, getPayments, getDocuments, deleteDocument, uploadDocument } from '../lib/api';
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
  address: string;
  lastVisit: string;
  nextAppointment?: string;
  balance: number;
}

export function PatientsScreen() {
  const { t } = useTranslation();
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
    nationalId: '',
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
            address: p.address ?? '',
            // include nationalId so other components can access it
            nationalId: p.nationalId ?? '',
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
        address: data.patient.address ?? '',
        // include nationalId locally so other screens can use it
        ...(data.patient.nationalId ? { nationalId: data.patient.nationalId } : {}),
        lastVisit: '-',
        nextAppointment: undefined,
        balance: data.patient.balance ?? 0
      };
      setPatients([newPatient, ...patients]);
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', phone: '', nationalId: '', dateOfBirth: '', address: '', insurance: '' });
    } catch (err) {
      console.error('Error creating patient', err);
      alert('Error creating patient');
    }
  };

  // Listen for external open-create events (from dashboard quick actions)
  useEffect(() => {
    const onOpen = () => setIsCreateModalOpen(true);
    window.addEventListener('open:create-patient', onOpen as EventListener);
    return () => { window.removeEventListener('open:create-patient', onOpen as EventListener); };
  }, []);

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
      setFormData({ name: '', email: '', phone: '', nationalId: '', dateOfBirth: '', address: '', insurance: '' });
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
                <h1 className="text-3xl font-bold text-gray-900">{t('patients.title')}</h1>
                <p className="text-gray-600 mt-1">{t('patients.subtitle')}</p>
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" />
                {t('patients.addPatient')}
              </Button>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('patients.searchPlaceholder')}
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
              <CardTitle>{t('patients.listTitle', { count: filteredPatients.length })}</CardTitle>
              <CardDescription>{t('patients.listDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('patients.table.name')}</TableHead>
                      <TableHead>{t('patients.table.contact')}</TableHead>
                      <TableHead>{t('patients.table.dateOfBirth')}</TableHead>
                      <TableHead>{t('patients.table.lastVisit')}</TableHead>
                      <TableHead>{t('patients.table.nextAppointment')}</TableHead>
                      <TableHead>{t('patients.table.balance')}</TableHead>
                      <TableHead className="w-[100px]">{t('patients.table.actions')}</TableHead>
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
                            {t('patients.view')}
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
                                nationalId: (patient as any).nationalId || '',
                                dateOfBirth: patient.dateOfBirth,
                                address: patient.address || '',
                                insurance: ''
                              });
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t('patients.edit')}
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
                <DialogTitle>{t('patients.createModal.title')}</DialogTitle>
                <DialogDescription>
                  {t('patients.createModal.description')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('patients.createModal.labels.fullName')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('patients.createModal.placeholders.fullName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationalId">Cédula de identidad</Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    maxLength={11}
                    onChange={(e) => {
                      // allow only digits and limit to 11
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setFormData({ ...formData, nationalId: digits });
                    }}
                    placeholder="12345678901"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">{t('patients.createModal.labels.dob')}</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('patients.createModal.labels.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('patients.createModal.placeholders.email')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('patients.createModal.labels.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t('patients.createModal.placeholders.phone')}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">{t('patients.createModal.labels.address')}</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t('patients.createModal.placeholders.address')}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="insurance">{t('patients.createModal.labels.insurance')}</Label>
                  <Input
                    id="insurance"
                    value={formData.insurance}
                    onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                    placeholder={t('patients.createModal.placeholders.insurance')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreatePatient} className="bg-blue-600 hover:bg-blue-700">
                  {t('patients.createModal.createButton')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Patient Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t('patients.editModal.title')}</DialogTitle>
                <DialogDescription>
                  {t('patients.editModal.description')}
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
                <div className="space-y-2">
                  <Label htmlFor="nationalIdEdit">Cédula de identidad</Label>
                  <Input
                    id="nationalIdEdit"
                    value={(formData as any).nationalId || ''}
                    maxLength={11}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setFormData({ ...formData, nationalId: digits });
                    }}
                    placeholder="12345678901"
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
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleEditPatient} className="bg-blue-600 hover:bg-blue-700">
                  {t('patients.editModal.updateButton')}
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
  const { t } = useTranslation();
  const [patientPayments, setPatientPayments] = useState<any[]>([]);
  const [loadingPatientPayments, setLoadingPatientPayments] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadPayments() {
      try {
        setLoadingPatientPayments(true);
        const res = await getPayments();
        const pays = (res.payments || []).filter((p: any) => p.patientId === patient.id).map((p: any) => ({
          id: p.id,
          date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : (p.date || ''),
          description: p.procedure || p.notes || 'Payment',
          amount: p.originalAmount || 0,
          insurance: p.insuranceCoverage || 0,
          finalAmount: p.finalAmount || 0,
          amountPaid: p.amountPaid || 0,
          status: p.status ?? (p.amountPaid >= p.finalAmount ? 'Paid' : (p.amountPaid > 0 ? 'Partial' : 'Pending'))
        }));
        if (!mounted) return;
        setPatientPayments(pays);
      } catch (err) {
        console.error('Failed loading patient payments', err);
      } finally {
        if (mounted) setLoadingPatientPayments(false);
      }
    }
    loadPayments();
    return () => { mounted = false; };
  }, [patient.id]);
  // Documents (gallery) state
  const [patientDocs, setPatientDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<any>(null);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [patientUploading, setPatientUploading] = useState<Record<string, boolean>>({});

  const handlePatientBrowse = () => fileInputRef.current?.click();

  const handlePatientFiles = async (files: File[]) => {
    for (const f of files) {
      try {
        setPatientUploading((s) => ({ ...s, [f.name]: true }));
        await uploadDocument(f, undefined, patient.id);
        // refresh - fetch documents for this patient only
        const res = await getDocuments(undefined, patient.id);
        const list = (res.documents || res || []);
        setPatientDocs(list);
      } catch (err: any) {
        console.error('upload error', err);
        const msg = err?.body?.error || (err?.body ? JSON.stringify(err.body) : 'Upload failed');
        alert(msg);
      } finally {
        setPatientUploading((s) => {
          const n = { ...s };
          delete n[f.name];
          return n;
        });
      }
    }
  };

  const handlePatientInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) handlePatientFiles(files);
    e.currentTarget.value = '';
  };

  useEffect(() => {
    let mounted = true;
    async function loadDocs() {
      try {
        setLoadingDocs(true);
        const res = await getDocuments(undefined, patient.id);
        const list = (res.documents || res || []);
        if (!mounted) return;
        setPatientDocs(list);
      } catch (err) {
        console.error('Failed loading patient documents', err);
      } finally {
        if (mounted) setLoadingDocs(false);
      }
    }
    loadDocs();
    return () => { mounted = false; };
  }, [patient.id]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setPatientDocs(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(draggedIndex, 1);
      arr.splice(index, 0, moved);
      return arr;
    });
    setDraggedIndex(null);
  };

  const handleOpenImage = (doc: any) => { setCurrentImage(doc); setIsImageOpen(true); };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(id);
      setPatientDocs(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed deleting document', err);
      alert('Could not delete document');
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>← {t('patients.profile.back')}</Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
          <p className="text-gray-600 mt-1">{t('patients.profile.patientId', { id: patient.id })}</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Calendar className="w-4 h-4 mr-2" />
          {t('patients.profile.newAppointment')}
        </Button>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">{t('patients.profile.email')}</p>
              <p className="font-medium text-gray-900">{patient.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('patients.profile.phone')}</p>
              <p className="font-medium text-gray-900">{patient.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('patients.profile.dateOfBirth')}</p>
              <p className="font-medium text-gray-900">{patient.dateOfBirth}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('patients.profile.outstandingBalance')}</p>
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
            {t('patients.profile.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="w-4 h-4 mr-2" />
            {t('patients.profile.tabs.history')}
          </TabsTrigger>
          <TabsTrigger value="odontogram">
            <Activity className="w-4 h-4 mr-2" />
            {t('patients.profile.tabs.odontogram')}
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="w-4 h-4 mr-2" />
            {t('patients.profile.tabs.payments')}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileCheck className="w-4 h-4 mr-2" />
            {t('patients.profile.tabs.documents')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                    <CardTitle>{t('patients.profile.recentAppointments.title')}</CardTitle>
                  </CardHeader>
                <CardContent>
                  <RecentAppointments patientId={patient.id} />
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <CardTitle>{t('patients.profile.upcomingAppointments.title')}</CardTitle>
                </CardHeader>
              <CardContent>
                <UpcomingAppointments patientId={patient.id} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>{t('patients.profile.medicalHistory.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <PatientMedicalHistory patientId={patient.id} />
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="odontogram">
          <OdontogramScreen patientId={patient.id} />
        </TabsContent>

        <TabsContent value="payments">
          <Card>
              <CardHeader>
              <CardTitle>{t('patients.profile.payments.title')}</CardTitle>
              </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('payments.table.date')}</TableHead>
                    <TableHead>{t('payments.table.description')}</TableHead>
                    <TableHead>{t('payments.table.amount')}</TableHead>
                    <TableHead>{t('payments.table.insurance')}</TableHead>
                    <TableHead>{t('payments.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPatientPayments ? (
                    <TableRow>
                      <TableCell colSpan={5}>{t('payments.transactions.loading')}</TableCell>
                    </TableRow>
                  ) : patientPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-gray-400">{t('patients.profile.payments.none')}</TableCell>
                    </TableRow>
                  ) : (
                    patientPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-gray-600">{p.date}</TableCell>
                        <TableCell className="text-gray-600">{p.description}</TableCell>
                        <TableCell className="text-gray-600">${p.amount}</TableCell>
                        <TableCell className="text-emerald-600 font-medium">-${p.insurance}</TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex items-start gap-4">
              <div>
                <CardTitle>Patient Documents</CardTitle>
                <CardDescription>Radiographs and uploaded images</CardDescription>
              </div>
              <div className="ml-auto">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handlePatientInputChange} />
                <Button onClick={handlePatientBrowse} className="bg-blue-600 hover:bg-blue-700" disabled={Object.keys(patientUploading).length > 0}>
                  {Object.keys(patientUploading).length > 0 ? 'Uploading...' : 'Upload Files'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div>Loading documents...</div>
              ) : patientDocs.length === 0 ? (
                <div className="text-sm text-gray-400">No documents for this patient</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {patientDocs.map((doc: any, idx: number) => (
                    <div
                      key={doc.id}
                      className="group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                    >
                      <div className="w-full h-40 bg-gray-100 rounded overflow-hidden cursor-move" onClick={() => handleOpenImage(doc)}>
                        <img src={`${API_BASE}/uploads/${doc.key}`} alt={doc.filename} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-sm truncate">{doc.filename}</div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenImage(doc)}>View</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{currentImage?.filename}</DialogTitle>
                <DialogDescription>{currentImage?.createdAt ? new Date(currentImage.createdAt).toLocaleString() : ''}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {currentImage && <img src={`${API_BASE}/uploads/${currentImage.key}`} alt={currentImage.filename} className="w-full h-auto rounded" />}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImageOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
        const twoMonthsFromNow = new Date();
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
        const appts = (apptsRes.appointments || [])
          .filter((a: any) => a.patientId === patientId)
          .map((a: any) => ({ ...a, scheduledAt: new Date(a.scheduledAt) }))
          .filter((a: any) => a.scheduledAt < twoMonthsFromNow) // recent: less than 2 months from now (past or near future)
          .sort((a: any, b: any) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
          .slice(0, 5)
          .map((a: any) => ({
            id: a.id,
            procedure: a.procedure,
            doctorName: usersRes.users?.find((u: any) => u.id === a.doctorId)?.name || 'Unknown',
            date: a.scheduledAt.toISOString().split('T')[0],
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

// Upcoming appointments (more than 2 months from now)
function UpcomingAppointments({ patientId }: { patientId: number }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [apptsRes, usersRes] = await Promise.all([getAppointments(), getUsers()]);
        const twoMonthsFromNow = new Date();
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
        const appts = (apptsRes.appointments || [])
          .filter((a: any) => a.patientId === patientId)
          .map((a: any) => ({ ...a, scheduledAt: new Date(a.scheduledAt) }))
          .filter((a: any) => a.scheduledAt >= twoMonthsFromNow) // upcoming: >= 2 months from now
          .sort((a: any, b: any) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
          .slice(0, 5)
          .map((a: any) => ({
            id: a.id,
            procedure: a.procedure,
            doctorName: usersRes.users?.find((u: any) => u.id === a.doctorId)?.name || 'Unknown',
            date: a.scheduledAt.toISOString().split('T')[0],
            status: a.status || 'scheduled'
          }));
        if (!mounted) return;
        setAppointments(appts);
      } catch (err) {
        console.error('Failed loading upcoming appointments', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [patientId]);

  if (loading) return <div>Loading appointments...</div>;
  if (appointments.length === 0) return <div className="text-sm text-gray-400">No upcoming appointments</div>;

  return (
    <div className="space-y-3">
      {appointments.map(appt => (
        <div key={appt.id} className="flex justify-between items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
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

// Patient medical history derived from dental procedures
function PatientMedicalHistory({ patientId }: { patientId: number }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [procsRes, usersRes] = await Promise.all([getProcedures(), getUsers()]);
        const procs = (procsRes.procedures || []).filter((p: any) => p.patientId === patientId);
        const users = usersRes.users || [];

        const mapped = procs.map((p: any) => ({
          id: p.id,
          date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
          type: 'Procedure',
          title: p.treatment || p.condition || 'Procedure',
          doctor: users.find((u: any) => u.id === p.doctorId)?.name || 'Unknown',
          notes: p.notes || ''
        })).sort((a: any, b: any) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });

        if (!mounted) return;
        setRecords(mapped);
      } catch (err) {
        console.error('Failed loading medical history', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [patientId]);

  if (loading) return <div>Loading medical history...</div>;
  if (records.length === 0) return <div className="text-sm text-gray-400">No medical history available</div>;

  return (
    <div className="space-y-4">
      {records.map((record: any, index: number) => (
        <div key={record.id || index} className="flex gap-4 pb-4 border-b last:border-0">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            {index !== records.length - 1 && <div className="w-px h-full bg-gray-200 mt-2" />}
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
  );
}
