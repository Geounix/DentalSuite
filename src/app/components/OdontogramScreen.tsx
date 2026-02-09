import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { StatusBadge } from './StatusBadge';
import { X, Plus, Calendar, DollarSign } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface Procedure {
  id: string;
  condition: string;
  treatment: string;
  status: 'Planned' | 'In Progress' | 'Completed';
  doctor: string;
  cost: number;
  date: string;
  notes?: string;
}

interface ToothData {
  number: number;
  procedures: Procedure[];
}

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getProcedures, createDentalProcedure, getUsers, getPatient, updateDentalProcedure } from '../lib/api';

export function OdontogramScreen({ patientId }: { patientId?: number }) {
  const { t } = useTranslation();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Map<number, ToothData>>(new Map());
  const [patientName, setPatientName] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [treatmentOptions, setTreatmentOptions] = useState<string[]>([]);
  const [conditionOptions, setConditionOptions] = useState<string[]>([]);
  const DEFAULT_TREATMENTS = ['Composite Filling','Root Canal Therapy','Crown Placement','Dental Implant','Extraction','Cleaning & Scaling'];
  const DEFAULT_CONDITIONS = ['Cavity','Root Canal Required','Crown Needed','Missing Tooth','Gum Disease','Fracture'];

  const [newProcedure, setNewProcedure] = useState<Partial<Procedure>>({
    condition: '',
    treatment: '',
    status: 'Planned',
    doctor: 'Dr. Smith',
    cost: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (!patientId) return;
    let mounted = true;
    async function load() {
      try {
        const [procsRes, usersRes] = await Promise.all([getProcedures(), getUsers()]);
        const users = usersRes.users || [];
        if (mounted) setUsersList(users);
        // load patient name
        try {
          const p = await getPatient(patientId);
          if (mounted && p && p.patient) setPatientName(p.patient.name);
        } catch (err) {
          // fallback: ignore
        }
        const procs = procsRes.procedures || [];

        const map = new Map<number, ToothData>();
        procs.filter((p: any) => p.patientId === patientId).forEach((p: any) => {
          const tooth = p.toothNumber;
          const doctorName = users.find((u: any) => u.id === p.doctorId)?.name || 'Unknown';
          const proc: Procedure = {
            id: String(p.id),
            condition: p.condition || '',
            treatment: p.treatment || '',
            status: (p.status || 'planned') === 'planned' ? 'Planned' : (p.status === 'in progress' ? 'In Progress' : (p.status === 'completed' ? 'Completed' : String(p.status))),
            doctor: doctorName,
            cost: p.cost ?? 0,
            date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
            notes: p.notes
          };

          const existing = map.get(tooth);
          if (existing) existing.procedures.push(proc);
          else map.set(tooth, { number: tooth, procedures: [proc] });
        });

        if (!mounted) return;
        // build dynamic treatment/condition options from procedures
        const treatmentsSet = new Set<string>(DEFAULT_TREATMENTS);
        const conditionsSet = new Set<string>(DEFAULT_CONDITIONS);
        procs.forEach((p: any) => {
          if (p.treatment) treatmentsSet.add(p.treatment);
          if (p.condition) conditionsSet.add(p.condition);
        });
        if (mounted) {
          setTreatmentOptions(Array.from(treatmentsSet));
          setConditionOptions(Array.from(conditionsSet));
        }
        // merge with current teethData (replace entries from API)
        const newMap = new Map<number, ToothData>(teethData);
        map.forEach((v, k) => newMap.set(k, v));
        setTeethData(newMap);
      } catch (err) {
        console.error('Failed to load dental procedures', err);
      }
    }
    load();
    return () => { mounted = false; };
  }, [patientId]);

  // when opening a tooth, prefill doctor if available
  useEffect(() => {
    if (selectedTooth !== null) {
      const today = new Date().toISOString().split('T')[0];
      setNewProcedure({
        condition: '',
        treatment: '',
        status: 'Planned',
        doctor: usersList.length ? usersList[0].name : 'Dr. Smith',
        cost: 0,
        date: today,
        notes: ''
      });
    }
  }, [selectedTooth, usersList]);

  // Tooth numbering (FDI notation)
  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const getToothStatus = (toothNumber: number): string => {
    const tooth = teethData.get(toothNumber);
    if (!tooth || tooth.procedures.length === 0) return 'healthy';
    
    const hasCompleted = tooth.procedures.some(p => p.status === 'Completed');
    const hasInProgress = tooth.procedures.some(p => p.status === 'In Progress');
    const hasPlanned = tooth.procedures.some(p => p.status === 'Planned');
    
    if (hasInProgress) return 'in-progress';
    if (hasPlanned) return 'planned';
    if (hasCompleted) return 'completed';
    return 'healthy';
  };

  const getToothColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'fill-emerald-400 stroke-emerald-600';
      case 'in-progress': return 'fill-blue-400 stroke-blue-600';
      case 'planned': return 'fill-amber-400 stroke-amber-600';
      default: return 'fill-white stroke-gray-300 hover:fill-blue-50';
    }
  };

  const handleToothClick = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
  };

  const handleAddProcedure = () => {
    if (!selectedTooth || !newProcedure.condition || !newProcedure.treatment || !patientId) return;

    const procedure: Procedure = {
      id: Date.now().toString(),
      condition: newProcedure.condition!,
      treatment: newProcedure.treatment!,
      status: newProcedure.status as 'Planned' | 'In Progress' | 'Completed',
      doctor: newProcedure.doctor!,
      cost: newProcedure.cost!,
      date: newProcedure.date!,
      notes: newProcedure.notes
    };

    const currentTooth = teethData.get(selectedTooth);
    const updatedTooth: ToothData = currentTooth 
      ? { ...currentTooth, procedures: [...currentTooth.procedures, procedure] }
      : { number: selectedTooth, procedures: [procedure] };

    // Persist to API
    (async () => {
      try {
        // attempt to resolve doctorId by name
        const usersRes = await getUsers();
        const doctor = usersRes.users?.find((u: any) => u.name === procedure.doctor);
        const payload: any = {
          patientId,
          toothNumber: selectedTooth,
          condition: procedure.condition,
          treatment: procedure.treatment,
          status: procedure.status.toLowerCase(),
          doctorId: doctor ? doctor.id : undefined,
          cost: procedure.cost,
          date: procedure.date,
          notes: procedure.notes
        };
        const res = await createDentalProcedure(payload);
        const created = res.procedure;
        const proc: Procedure = {
          id: String(created.id),
          condition: created.condition || procedure.condition || '',
          treatment: created.treatment || procedure.treatment || '',
          status: created.status === 'planned' ? 'Planned' : (created.status === 'in progress' ? 'In Progress' : (created.status === 'completed' ? 'Completed' : created.status)),
          doctor: doctor ? doctor.name : procedure.doctor || 'Unknown',
          cost: created.cost ?? procedure.cost ?? 0,
          date: created.date ? new Date(created.date).toISOString().split('T')[0] : (procedure.date || ''),
          notes: created.notes || procedure.notes
        };

        const currentTooth = teethData.get(selectedTooth);
        const updatedTooth: ToothData = currentTooth
          ? { ...currentTooth, procedures: [...currentTooth.procedures, proc] }
          : { number: selectedTooth, procedures: [proc] };

        const newTeethData = new Map(teethData);
        newTeethData.set(selectedTooth, updatedTooth);
        setTeethData(newTeethData);
      } catch (err) {
        console.error('Failed to create dental procedure', err);
        alert('Failed to save procedure');
      }
    })();

    // Reset form
    setNewProcedure({
      condition: '',
      treatment: '',
      status: 'Planned',
      doctor: 'Dr. Smith',
      cost: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const selectedToothData = selectedTooth ? teethData.get(selectedTooth) : undefined;
  const [procEdits, setProcEdits] = useState<Record<string, { status?: string; notes?: string; cost?: number }>>({});

  const handleUpdateProcedure = async (procId: string) => {
    const edit = procEdits[procId];
    if (!edit) return;
    try {
      const payload: any = {};
      if (edit.status) payload.status = edit.status.toLowerCase();
      if (typeof edit.cost === 'number') payload.cost = edit.cost;
      if (edit.notes) payload.notes = edit.notes;
      const res = await updateDentalProcedure(procId as any, payload);
      const updated = res.procedure || res;

      // update local teethData
      const newTeeth = new Map(teethData);
      for (const [toothNum, td] of newTeeth.entries()) {
        const idx = td.procedures.findIndex((p) => String(p.id) === String(procId));
        if (idx !== -1) {
          const updatedProc = {
            ...td.procedures[idx],
            status: updated.status === 'planned' ? 'Planned' : (updated.status === 'in progress' ? 'In Progress' : (updated.status === 'completed' ? 'Completed' : updated.status)),
            cost: updated.cost ?? td.procedures[idx].cost,
            notes: updated.notes ?? td.procedures[idx].notes,
            date: updated.date ? new Date(updated.date).toISOString().split('T')[0] : td.procedures[idx].date
          };
          const newProcs = [...td.procedures];
          newProcs[idx] = updatedProc;
          newTeeth.set(toothNum, { ...td, procedures: newProcs });
          break;
        }
      }
      setTeethData(newTeeth);
      // clear edit state for this proc
      setProcEdits(prev => { const copy = { ...prev }; delete copy[procId]; return copy; });
    } catch (err) {
      console.error('Failed updating procedure', err);
      alert('Failed to update procedure');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('odontogram.title')}</h1>
        <p className="text-gray-600 mt-1">{t('odontogram.subtitle', { patient: patientName ?? `#${patientId}` })}</p>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-white border-2 border-gray-300"></div>
              <span className="text-sm text-gray-700">{t('odontogram.legend.healthy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-400 border-2 border-amber-600"></div>
              <span className="text-sm text-gray-700">{t('odontogram.legend.planned')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-400 border-2 border-blue-600"></div>
              <span className="text-sm text-gray-700">{t('odontogram.legend.inProgress')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-400 border-2 border-emerald-600"></div>
              <span className="text-sm text-gray-700">{t('odontogram.legend.completed')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dental Chart */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t('odontogram.chartTitle')}</CardTitle>
          <CardDescription>{t('odontogram.chartDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-12">
            {/* Upper Arch */}
            <div>
              <div className="text-center mb-4">
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded">{t('odontogram.upperArch')}</span>
              </div>
              <div className="flex justify-center items-end gap-1 px-4" style={{ 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                height: '120px',
                position: 'relative',
                marginBottom: '20px'
              }}>
                {upperTeeth.map((toothNumber, index) => {
                  const angle = ((index - 7.5) / 8) * 30; // Curve effect
                  const yOffset = Math.abs(angle) * 1.5;
                  return (
                    <div 
                      key={toothNumber}
                      className="flex flex-col items-center cursor-pointer group"
                      style={{ 
                        transform: `translateY(${yOffset}px) rotate(${angle}deg)`,
                        transition: 'all 0.2s'
                      }}
                      onClick={() => handleToothClick(toothNumber)}
                    >
                      <svg width="45" height="60" viewBox="0 0 45 60" className="transition-transform group-hover:scale-110">
                        <rect
                          x="8"
                          y="10"
                          width="29"
                          height="45"
                          rx="5"
                          className={`${getToothColor(getToothStatus(toothNumber))} stroke-2 transition-all cursor-pointer`}
                        />
                      </svg>
                      <span className="text-xs font-medium mt-1 text-gray-700">{toothNumber}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lower Arch */}
            <div>
              <div className="text-center mb-4">
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded">{t('odontogram.lowerArch')}</span>
              </div>
              <div className="flex justify-center items-start gap-1 px-4" style={{ 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                height: '120px',
                position: 'relative',
                marginTop: '20px'
              }}>
                {lowerTeeth.map((toothNumber, index) => {
                  const angle = ((index - 7.5) / 8) * -30; // Opposite curve
                  const yOffset = Math.abs(angle) * 1.5;
                  return (
                    <div 
                      key={toothNumber}
                      className="flex flex-col items-center cursor-pointer group"
                      style={{ 
                        transform: `translateY(${yOffset}px) rotate(${angle}deg)`,
                        transition: 'all 0.2s'
                      }}
                      onClick={() => handleToothClick(toothNumber)}
                    >
                      <span className="text-xs font-medium mb-1 text-gray-700">{toothNumber}</span>
                      <svg width="45" height="60" viewBox="0 0 45 60" className="transition-transform group-hover:scale-110">
                        <rect
                          x="8"
                          y="5"
                          width="29"
                          height="45"
                          rx="5"
                          className={`${getToothColor(getToothStatus(toothNumber))} stroke-2 transition-all cursor-pointer`}
                        />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tooth Details Side Panel */}
      <Sheet open={selectedTooth !== null} onOpenChange={() => setSelectedTooth(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('odontogram.toothTitle', { num: selectedTooth })}</SheetTitle>
            <SheetDescription>
              {t('odontogram.toothDescription')}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Existing Procedures */}
            {selectedToothData && selectedToothData.procedures.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('odontogram.procedureHistory.title')}</h3>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {selectedToothData.procedures.map((procedure) => (
                      <Card key={procedure.id} className="border-l-4" style={{
                        borderLeftColor: 
                          procedure.status === 'Completed' ? '#10b981' :
                          procedure.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
                      }}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">{procedure.treatment}</h4>
                                <p className="text-sm text-gray-600">{t('odontogram.labels.condition')}: {procedure.condition}</p>
                              </div>
                              <StatusBadge status={procedure.status} />
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                {procedure.date}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <DollarSign className="w-4 h-4" />
                                ${procedure.cost}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{t('odontogram.labels.doctor')}: {procedure.doctor}</p>
                            <div className="mt-4 space-y-3">
                              <div>
                                <Label>{t('odontogram.labels.notes')}</Label>
                                <Textarea
                                  value={procEdits[String(procedure.id)]?.notes ?? procedure.notes ?? ''}
                                  onChange={(e) => setProcEdits(prev => ({ ...prev, [String(procedure.id)]: { ...prev[String(procedure.id)], notes: e.target.value } }))}
                                  placeholder={t('odontogram.placeholders.notes')}
                                  rows={3}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>Cost ($)</Label>
                                  <Input
                                    type="number"
                                    value={procEdits[String(procedure.id)]?.cost ?? procedure.cost ?? 0}
                                    onChange={(e) => setProcEdits(prev => ({ ...prev, [String(procedure.id)]: { ...prev[String(procedure.id)], cost: parseFloat(e.target.value) } }))}
                                  />
                                </div>

                                <div>
                                  <Label>{t('odontogram.labels.status')}</Label>
                                  <Select value={(procEdits[String(procedure.id)]?.status) || procedure.status} onValueChange={(value: any) => setProcEdits(prev => ({ ...prev, [String(procedure.id)]: { ...prev[String(procedure.id)], status: value } }))}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Planned">{t('odontogram.status.planned')}</SelectItem>
                                      <SelectItem value="In Progress">{t('odontogram.status.inProgress')}</SelectItem>
                                      <SelectItem value="Completed">{t('odontogram.status.completed')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <Button onClick={() => handleUpdateProcedure(String(procedure.id))} className="h-10">
                                  {t('odontogram.actions.save')}
                                </Button>
                                <Button variant="outline" className="h-10" onClick={() => setProcEdits(prev => { const c = { ...prev }; delete c[String(procedure.id)]; return c; })}>
                                  {t('common.cancel')}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Add New Procedure Form */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('odontogram.addNew.title')}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('odontogram.labels.condition')}</Label>
                    <Select value={newProcedure.condition || ''} onValueChange={(value) => setNewProcedure({ ...newProcedure, condition: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('odontogram.placeholders.selectCondition')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(conditionOptions.length ? conditionOptions : ["Cavity","Root Canal Required","Crown Needed","Missing Tooth","Gum Disease","Fracture"]).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('odontogram.labels.treatment')}</Label>
                    <Select value={newProcedure.treatment || ''} onValueChange={(value) => setNewProcedure({ ...newProcedure, treatment: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('odontogram.placeholders.selectTreatment')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(treatmentOptions.length ? treatmentOptions : ["Composite Filling","Root Canal Therapy","Crown Placement","Dental Implant","Extraction","Cleaning & Scaling"]).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('odontogram.labels.status')}</Label>
                    <Select value={newProcedure.status} onValueChange={(value: any) => setNewProcedure({ ...newProcedure, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Planned">{t('odontogram.status.planned')}</SelectItem>
                        <SelectItem value="In Progress">{t('odontogram.status.inProgress')}</SelectItem>
                        <SelectItem value="Completed">{t('odontogram.status.completed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('odontogram.labels.doctor')}</Label>
                    <Select value={newProcedure.doctor || ''} onValueChange={(value) => setNewProcedure({ ...newProcedure, doctor: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {usersList.length ? usersList.map((u) => (
                          <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                        )) : (
                          <>
                            <SelectItem value="Dr. Smith">Dr. Smith</SelectItem>
                            <SelectItem value="Dr. Martinez">Dr. Martinez</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('odontogram.labels.cost')}</Label>
                    <Input
                      type="number"
                      value={newProcedure.cost}
                      onChange={(e) => setNewProcedure({ ...newProcedure, cost: parseFloat(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('odontogram.labels.date')}</Label>
                    <Input
                      type="date"
                      value={newProcedure.date}
                      onChange={(e) => setNewProcedure({ ...newProcedure, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('odontogram.labels.notesOptional')}</Label>
                  <Textarea
                    value={newProcedure.notes}
                    onChange={(e) => setNewProcedure({ ...newProcedure, notes: e.target.value })}
                    placeholder={t('odontogram.placeholders.additionalNotes')}
                    rows={3}
                  />
                </div>

                <Button onClick={handleAddProcedure} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('odontogram.actions.addProcedure')}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
