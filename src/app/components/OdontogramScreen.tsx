import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { StatusBadge } from './StatusBadge';
import { X, Plus, Calendar, DollarSign, FileText } from 'lucide-react';
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

import { useTranslation } from 'react-i18next';
import { getProcedures, createDentalProcedure, getUsers, getPatient, updateDentalProcedure, getCatalogProcedures, getClinicSettings } from '../lib/api';
import html2pdf from 'html2pdf.js';

export function OdontogramScreen({ patientId }: { patientId?: number }) {
  const { t } = useTranslation();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Map<number, ToothData>>(new Map());
  const [patientName, setPatientName] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [treatmentOptions, setTreatmentOptions] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  // Static options requested by the user
  const conditionOptions = [
    'Diente sano', 'Clase I', 'Clase II', 'Clase III', 'Clase IV', 'Clase V',
    'Caries incipiente', 'Caries moderada', 'Caries profunda', 'Caries recurrente',
    'Lesión cervical no cariosa', 'Desgaste dental', 'Abrasión dental', 'Atrición dental',
    'Erosión dental', 'Fractura dental', 'Fisura dental', 'Hipoplasia del esmalte',
    'Fluorosis dental', 'Manchas dentales', 'Pulpa normal', 'Pulpitis reversible',
    'Pulpitis irreversible', 'Necrosis pulpar', 'Diente previamente tratado',
    'Terapia iniciada previamente', 'Tejidos apicales normales', 'Periodontitis apical sintomática',
    'Periodontitis apical asintomática', 'Absceso apical agudo', 'Absceso apical crónico',
    'Osteítis condensante', 'Movilidad grado I', 'Movilidad grado II', 'Movilidad grado III',
    'Furcación grado I', 'Furcación grado II', 'Furcación grado III', 'Recesión gingival',
    'Bolsa periodontal', 'Sangrado al sondaje', 'Supuración', 'Placa bacteriana',
    'Cálculo dental', 'Restauración desbordante', 'Contacto abierto', 'Impactación alimentaria',
    'Diente ectópico', 'Diente supernumerario', 'Microdoncia', 'Macrodoncia',
    'Amelogénesis imperfecta', 'Dentinogénesis imperfecta', 'Fusión dental', 'Geminación dental',
    'Taurodontismo', 'Raíz dilacerada', 'Hipercementosis', 'Reabsorción radicular interna',
    'Reabsorción radicular externa', 'Espacio edéntulo'
  ];

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
        const [procsRes, usersRes, catalogRes, settingsRes] = await Promise.all([
          getProcedures(),
          getUsers(),
          getCatalogProcedures({ limit: 2000 }), // Load all to have them available
          getClinicSettings().catch(() => null)
        ]);
        const users = usersRes.users || [];
        if (mounted) {
          setUsersList(users);
          setTreatmentOptions(catalogRes.catalog || []);
          if (settingsRes && settingsRes.settings) {
            setClinicSettings(settingsRes.settings);
          }
        }
        // load patient name
        try {
          const p = await getPatient(patientId!);
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
            status: (p.status || 'planned').toLowerCase() === 'planned' ? 'Planned' : (p.status.toLowerCase() === 'in progress' ? 'In Progress' : (p.status.toLowerCase() === 'completed' ? 'Completed' : 'Planned')),
            doctor: doctorName,
            cost: p.cost || 0,
            date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
            notes: p.notes
          };

          const existing = map.get(tooth);
          if (existing) existing.procedures.push(proc);
          else map.set(tooth, { number: tooth, procedures: [proc] });
        });

        if (!mounted) return;

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
          status: created.status === 'planned' ? 'Planned' : (created.status === 'in progress' ? 'In Progress' : (created.status === 'completed' ? 'Completed' : 'Planned')),
          doctor: doctor ? doctor.name : procedure.doctor || 'Unknown',
          cost: created.cost || procedure.cost || 0,
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

  const handleTreatmentChange = (treatmentName: string) => {
    const selectedCatalogItem = treatmentOptions.find(t => t.name === treatmentName);
    setNewProcedure(prev => ({
      ...prev,
      treatment: treatmentName,
      cost: selectedCatalogItem ? selectedCatalogItem.price : prev.cost
    }));
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
            status: updated.status === 'planned' ? 'Planned' : (updated.status === 'in progress' ? 'In Progress' : (updated.status === 'completed' ? 'Completed' : 'Planned')),
            cost: updated.cost !== null && updated.cost !== undefined ? updated.cost : td.procedures[idx].cost,
            notes: updated.notes ?? td.procedures[idx].notes,
            date: updated.date ? new Date(updated.date).toISOString().split('T')[0] : td.procedures[idx].date
          } as Procedure;
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

  const handleGenerateQuote = async () => {
    const allProcs: (Procedure & { toothNumber: number })[] = [];
    teethData.forEach(tooth => {
      tooth.procedures.forEach(p => {
        if (p.status === 'Planned') allProcs.push({ ...p, toothNumber: tooth.number });
      });
    });

    if (allProcs.length === 0) {
      alert(t('odontogram.quote.noPlanned'));
      return;
    }

    const total = allProcs.reduce((sum, p) => sum + (p.cost || 0), 0).toFixed(2);
    const dateStr = new Date().toLocaleDateString();
    const clinicName = clinicSettings?.name || 'DentaCare';

    const rowsHtml = allProcs.map(p => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 12px; font-weight: 500; color: #374151;">#${p.toothNumber}</td>
        <td style="padding: 10px 12px;">
          <div style="font-weight: 600; color: #111827;">${p.treatment}</div>
          <div style="font-size: 11px; color: #6b7280;">${p.condition}</div>
        </td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #111827;">$${(p.cost || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #111827; padding: 32px; width: 180mm; box-sizing: border-box;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 28px;">
          <div>
            <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #030213;">${clinicName}</h1>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">Cotizaci&oacute;n de Tratamiento Odontol&oacute;gico</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 13px; color: #374151;"><strong>Fecha:</strong> ${dateStr}</p>
          </div>
        </div>

        <!-- Patient Info -->
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #1f2937;">Paciente: ${patientName ?? `#${patientId}`}</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">ID: #${patientId}</p>
        </div>

        <!-- Procedure Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #374151; border-bottom: 2px solid #d1d5db;">Diente</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #374151; border-bottom: 2px solid #d1d5db;">Tratamiento / Procedimiento</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #374151; border-bottom: 2px solid #d1d5db;">Costo</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <!-- Total -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
          <div style="background: #f0f0f5; border: 1px solid #c7c7d6; border-radius: 8px; padding: 14px 20px; min-width: 220px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">Costo Total Estimado:</span>
              <span style="font-size: 20px; font-weight: 800; color: #030213;">$${total}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #9ca3af; font-style: italic;">Esta cotizaci&oacute;n es de car&aacute;cter informativo. Los precios est&aacute;n sujetos a cambios tras una evaluaci&oacute;n cl&iacute;nica exhaustiva. V&aacute;lido por 30 d&iacute;as.</p>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const opt = {
      margin:       [10, 10, 10, 10] as [number, number, number, number],
      filename:     `Cotizacion_${(patientName || String(patientId)).replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    try {
      await html2pdf().set(opt).from(container.firstElementChild as HTMLElement).save();
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('No se pudo generar la cotización.');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('odontogram.title')}</h1>
          <p className="text-gray-600 mt-1">{t('odontogram.subtitle', { patient: patientName ?? `#${patientId}` })}</p>
        </div>
        <Button onClick={handleGenerateQuote} className="bg-primary text-white hover:bg-primary/90">
          <FileText className="w-4 h-4 mr-2" />
          {t('odontogram.quote.button')}
        </Button>
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
          <SheetHeader className="px-4 sm:px-6 pt-6 pb-2">
            <SheetTitle>{t('odontogram.toothTitle', { num: selectedTooth })}</SheetTitle>
            <SheetDescription>
              {t('odontogram.toothDescription')}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-6 px-4 sm:px-6 pb-6">
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
            <div className="pb-10">
              <h3 className="text-lg font-semibold mb-4">{t('odontogram.addNew.title')}</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>{t('odontogram.labels.condition')}</Label>
                    <Select value={newProcedure.condition || ''} onValueChange={(value) => setNewProcedure({ ...newProcedure, condition: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('odontogram.placeholders.selectCondition')} />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('odontogram.labels.treatment')}</Label>
                    <Select value={newProcedure.treatment || ''} onValueChange={handleTreatmentChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('odontogram.placeholders.selectTreatment')} />
                      </SelectTrigger>
                      <SelectContent>
                        {treatmentOptions.map((t) => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
