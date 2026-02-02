import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { StatusBadge } from './StatusBadge';
import { FileCheck, Search, Eye, Edit, CheckCircle2, XCircle, FilePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ConsentForm {
  id: number;
  title: string;
  patient: string;
  procedure: string;
  doctor: string;
  createdDate: string;
  status: 'Signed' | 'Unsigned' | 'Pending Review';
  signedDate?: string;
}

export function ConsentFormsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState<ConsentForm | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [signature, setSignature] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  const [newFormData, setNewFormData] = useState({
    patient: '',
    procedure: '',
    doctor: '',
    formType: ''
  });

  const [forms, setForms] = useState<ConsentForm[]>([
    { id: 1, title: 'Root Canal Therapy Consent', patient: 'Michael Chen', procedure: 'Root Canal', doctor: 'Dr. Martinez', createdDate: '2025-12-20', status: 'Signed', signedDate: '2025-12-20' },
    { id: 2, title: 'Tooth Extraction Consent', patient: 'Robert Garcia', procedure: 'Extraction', doctor: 'Dr. Smith', createdDate: '2026-01-08', status: 'Unsigned' },
    { id: 3, title: 'Dental Implant Procedure Consent', patient: 'Lisa Anderson', procedure: 'Dental Implant', doctor: 'Dr. Smith', createdDate: '2026-01-07', status: 'Pending Review' },
    { id: 4, title: 'Crown Placement Consent', patient: 'Emma Wilson', procedure: 'Crown', doctor: 'Dr. Martinez', createdDate: '2026-01-03', status: 'Signed', signedDate: '2026-01-03' },
    { id: 5, title: 'General Anesthesia Consent', patient: 'James Brown', procedure: 'Multiple Extractions', doctor: 'Dr. Smith', createdDate: '2025-11-28', status: 'Signed', signedDate: '2025-11-28' },
  ]);

  const filteredForms = forms.filter(form =>
    form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    form.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    form.procedure.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const signedCount = forms.filter(f => f.status === 'Signed').length;
  const unsignedCount = forms.filter(f => f.status === 'Unsigned').length;
  const pendingCount = forms.filter(f => f.status === 'Pending Review').length;

  // Canvas signature functions
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // Set drawing style
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [selectedForm]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSignForm = () => {
    // In a real app, this would save the signature and update the form status
    alert('Consent form signed successfully!');
    setSelectedForm(null);
    setHasSignature(false);
  };

  const handleCreateForm = () => {
    const today = new Date().toISOString().split('T')[0];
    const newForm: ConsentForm = {
      id: forms.length + 1,
      title: `${newFormData.formType} Consent`,
      patient: newFormData.patient,
      procedure: newFormData.procedure,
      doctor: newFormData.doctor,
      createdDate: today,
      status: 'Unsigned'
    };
    setForms([...forms, newForm]);
    setIsCreateModalOpen(false);
    setNewFormData({ patient: '', procedure: '', doctor: '', formType: '' });
  };

  // Sample patient and doctor data for dropdowns
  const patients = ['Sarah Johnson', 'Michael Chen', 'Emma Wilson', 'James Brown', 'Lisa Anderson', 'Robert Garcia'];
  const doctors = ['Dr. Smith', 'Dr. Martinez', 'Dr. Johnson', 'Dr. Lee'];
  const formTypes = [
    'Root Canal Therapy',
    'Tooth Extraction',
    'Dental Implant Procedure',
    'Crown Placement',
    'General Anesthesia',
    'Teeth Whitening',
    'Orthodontic Treatment',
    'Wisdom Teeth Removal'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consent Forms</h1>
          <p className="text-gray-600 mt-1">Manage patient consent and authorization forms</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <FilePlus className="w-4 h-4 mr-2" />
          Create Consent Form
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Signed Forms</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{signedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unsigned Forms</CardTitle>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unsignedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting signature</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
            <FileCheck className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-gray-500 mt-1">Requires action</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search consent forms by patient, procedure, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Forms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Forms ({filteredForms.length})</CardTitle>
          <CardDescription>View and manage patient consent forms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Title</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Signed Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.title}</TableCell>
                    <TableCell className="text-gray-600">{form.patient}</TableCell>
                    <TableCell className="text-gray-600">{form.procedure}</TableCell>
                    <TableCell className="text-gray-600">{form.doctor}</TableCell>
                    <TableCell className="text-gray-600">{form.createdDate}</TableCell>
                    <TableCell className="text-gray-600">
                      {form.signedDate || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={form.status} />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedForm(form)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Detail Modal */}
      {selectedForm && (
        <Dialog open={!!selectedForm} onOpenChange={() => setSelectedForm(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedForm.title}</DialogTitle>
              <DialogDescription>
                Patient: {selectedForm.patient} | Doctor: {selectedForm.doctor}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Form Information */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Procedure</p>
                    <p className="font-medium text-gray-900">{selectedForm.procedure}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={selectedForm.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created Date</p>
                    <p className="font-medium text-gray-900">{selectedForm.createdDate}</p>
                  </div>
                  {selectedForm.signedDate && (
                    <div>
                      <p className="text-sm text-gray-600">Signed Date</p>
                      <p className="font-medium text-gray-900">{selectedForm.signedDate}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Consent Form Content */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Consent Form Details</h3>
                <div className="bg-white border rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Procedure Information</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      I, {selectedForm.patient}, hereby consent to the {selectedForm.procedure} procedure 
                      to be performed by {selectedForm.doctor} at DentaCare Dental Clinic.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Understanding of Treatment</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      I understand that the proposed treatment involves the following:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1 ml-4">
                      <li>The nature and purpose of the procedure has been explained to me</li>
                      <li>I have been informed of alternative treatments available</li>
                      <li>I understand the risks and benefits associated with this procedure</li>
                      <li>I have had the opportunity to ask questions and receive answers</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Risks and Complications</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      I have been informed of potential risks including but not limited to: pain, swelling, 
                      infection, bleeding, nerve damage, and the possibility that additional treatment may be required.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Patient Authorization</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      I authorize the dentist and staff to perform the procedure described above. 
                      I understand that no guarantee or assurance has been given regarding the results 
                      of the treatment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Digital Signature Area */}
              {selectedForm.status === 'Unsigned' || selectedForm.status === 'Pending Review' ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Digital Signature</h3>
                  <div className="space-y-3">
                    <Label>Sign below with your mouse or touchscreen</Label>
                    <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        className="w-full touch-none cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Draw your signature above
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearSignature}
                        type="button"
                      >
                        Clear Signature
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-900">
                      This digital signature is legally binding and equivalent to a handwritten signature
                    </p>
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={!hasSignature}
                    onClick={handleSignForm}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Sign Consent Form
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Signature</h3>
                  <div className="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl italic font-semibold text-gray-900">{selectedForm.patient}</p>
                        <p className="text-sm text-gray-600 mt-2">Signed electronically on {selectedForm.signedDate}</p>
                      </div>
                      <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Form Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Consent Form</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new consent form
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Form Information */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient</Label>
                  <Select
                    value={newFormData.patient}
                    onValueChange={(value) => setNewFormData({ ...newFormData, patient: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient} value={patient}>{patient}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Doctor</Label>
                  <Select
                    value={newFormData.doctor}
                    onValueChange={(value) => setNewFormData({ ...newFormData, doctor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map(doctor => (
                        <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Procedure</Label>
                  <Input
                    value={newFormData.procedure}
                    onChange={(e) => setNewFormData({ ...newFormData, procedure: e.target.value })}
                    placeholder="Enter procedure"
                  />
                </div>
                <div>
                  <Label>Form Type</Label>
                  <Select
                    value={newFormData.formType}
                    onValueChange={(value) => setNewFormData({ ...newFormData, formType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form type" />
                    </SelectTrigger>
                    <SelectContent>
                      {formTypes.map(formType => (
                        <SelectItem key={formType} value={formType}>{formType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleCreateForm}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Create Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}