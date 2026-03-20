import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { StatusBadge } from './StatusBadge';
import { X, Plus, Calendar, DollarSign, FileText, Pencil, Trash2, BanIcon } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useTranslation } from 'react-i18next';
import {
  getProcedures, createDentalProcedure, getUsers, getPatient,
  updateDentalProcedure, deleteDentalProcedure, getCatalogProcedures, getClinicSettings
} from '../lib/api';
import html2pdf from 'html2pdf.js';

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
  missing?: boolean;
  missingProcId?: string;
}

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

export function OdontogramScreen({ patientId }: { patientId?: number }) {
  const { t } = useTranslation();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Map<number, ToothData>>(new Map());
  const [patientName, setPatientName] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [treatmentOptions, setTreatmentOptions] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  // Edit state for existing procedures
  const [editingProcId, setEditingProcId] = useState<string | null>(null);
  const [procEdits, setProcEdits] = useState<{ status?: string; notes?: string; cost?: number }>({});

  // Add form
  const blankForm = () => ({
    condition: '', treatment: '', status: 'Planned' as const,
    doctor: usersList.length ? usersList[0].name : '',
    cost: 0, date: new Date().toISOString().split('T')[0], notes: ''
  });
  const [newProcedure, setNewProcedure] = useState<any>(blankForm());

  useEffect(() => {
    if (!patientId) return;
    let mounted = true;
    async function load() {
      try {
        const [procsRes, usersRes, catalogRes, settingsRes] = await Promise.all([
          getProcedures(),
          getUsers(),
          getCatalogProcedures({ limit: 2000 }),
          getClinicSettings().catch(() => null)
        ]);
        const users = usersRes.users || [];
        if (mounted) {
          setUsersList(users);
          setTreatmentOptions(catalogRes.catalog || []);
          if (settingsRes?.settings) setClinicSettings(settingsRes.settings);
        }
        try {
          const p = await getPatient(patientId!);
          if (mounted && p?.patient) setPatientName(p.patient.name);
        } catch { /* ignore */ }
        const procs = procsRes.procedures || [];
        const map = new Map<number, ToothData>();
        procs.filter((p: any) => p.patientId === patientId).forEach((p: any) => {
          const tooth = p.toothNumber;
          let existing = map.get(tooth);
          if (!existing) {
            existing = { number: tooth, procedures: [] };
            map.set(tooth, existing);
          }
          if (p.status === 'missing') {
            existing.missing = true;
            existing.missingProcId = String(p.id);
          } else {
            const doctorName = users.find((u: any) => u.id === p.doctorId)?.name || 'Unknown';
            const normalizeStatus = (s: string): Procedure['status'] => {
              const sl = (s || 'planned').toLowerCase();
              if (sl === 'completed') return 'Completed';
              if (sl === 'in progress') return 'In Progress';
              return 'Planned';
            };
            const proc: Procedure = {
              id: String(p.id),
              condition: p.condition || '',
              treatment: p.treatment || '',
              status: normalizeStatus(p.status),
              doctor: doctorName,
              cost: p.cost || 0,
              date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
              notes: p.notes
            };
            existing.procedures.push(proc);
          }
        });
        if (!mounted) return;
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

  // Reset add-form when opening a tooth
  useEffect(() => {
    if (selectedTooth !== null) {
      setNewProcedure({
        condition: '', treatment: '', status: 'Planned',
        doctor: usersList.length ? usersList[0].name : '',
        cost: 0, date: new Date().toISOString().split('T')[0], notes: ''
      });
      setEditingProcId(null);
      setProcEdits({});
    }
  }, [selectedTooth]);

  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const getToothStatus = (toothNumber: number): string => {
    const tooth = teethData.get(toothNumber);
    if (!tooth) return 'healthy';
    if (tooth.missing) return 'missing';
    if (!tooth.procedures.length) return 'healthy';
    if (tooth.procedures.some(p => p.status === 'In Progress')) return 'in-progress';
    if (tooth.procedures.some(p => p.status === 'Planned')) return 'planned';
    if (tooth.procedures.some(p => p.status === 'Completed')) return 'completed';
    return 'healthy';
  };

  const getToothColor = (status: string) => {
    switch (status) {
      case 'completed':   return 'fill-emerald-400 stroke-emerald-600';
      case 'in-progress': return 'fill-blue-400 stroke-blue-600';
      case 'planned':     return 'fill-amber-400 stroke-amber-600';
      case 'missing':     return 'fill-gray-300 stroke-gray-500';
      default:            return 'fill-white stroke-gray-300 hover:fill-blue-50';
    }
  };

  const handleToothClick = (toothNumber: number) => setSelectedTooth(toothNumber);

  // Toggle missing state (persisted to API by sending status 'missing')
  const handleToggleMissing = async () => {
    if (!selectedTooth || !patientId) return;
    const newTeeth = new Map(teethData);
    const current = newTeeth.get(selectedTooth) || { number: selectedTooth, procedures: [] };

    if (current.missing && current.missingProcId) {
      try {
        await deleteDentalProcedure(Number(current.missingProcId));
        const updated = { ...current, missing: false, missingProcId: undefined };
        newTeeth.set(selectedTooth, updated);
        setTeethData(newTeeth);
      } catch (err) {
        console.error('Failed restoring tooth', err);
        alert('Error al restaurar el diente.');
      }
    } else {
      try {
        const payload: any = {
          patientId, toothNumber: selectedTooth,
          condition: 'Diente ausente', treatment: 'Ausencia / Extracción',
          status: 'missing', doctorId: usersList.length ? usersList[0].id : undefined,
          cost: 0, date: new Date().toISOString().split('T')[0],
          notes: 'Marcado como ausente desde el odontograma'
        };
        const res = await createDentalProcedure(payload);
        const updated = { ...current, missing: true, missingProcId: String(res.procedure.id) };
        newTeeth.set(selectedTooth, updated);
        setTeethData(newTeeth);
      } catch (err) {
        console.error('Failed marking as missing', err);
        alert('Error al marcar diente como ausente.');
      }
    }
  };

  const selectedToothData = selectedTooth ? teethData.get(selectedTooth) : undefined;

  const handleAddProcedure = async () => {
    if (!selectedTooth || !newProcedure.condition || !newProcedure.treatment || !patientId) return;
    try {
      const allUsers = usersList.length ? usersList : (await getUsers()).users || [];
      const doctor = allUsers.find((u: any) => u.name === newProcedure.doctor);
      const payload: any = {
        patientId, toothNumber: selectedTooth,
        condition: newProcedure.condition, treatment: newProcedure.treatment,
        status: newProcedure.status.toLowerCase(),
        doctorId: doctor?.id, cost: newProcedure.cost,
        date: newProcedure.date, notes: newProcedure.notes
      };
      const res = await createDentalProcedure(payload);
      const created = res.procedure;
      const normalizeStatus = (s: string): Procedure['status'] => {
        if (s === 'completed') return 'Completed';
        if (s === 'in progress') return 'In Progress';
        return 'Planned';
      };
      const proc: Procedure = {
        id: String(created.id),
        condition: created.condition || newProcedure.condition,
        treatment: created.treatment || newProcedure.treatment,
        status: normalizeStatus(created.status),
        doctor: doctor?.name || newProcedure.doctor || 'Unknown',
        cost: created.cost || newProcedure.cost || 0,
        date: created.date ? new Date(created.date).toISOString().split('T')[0] : newProcedure.date || '',
        notes: created.notes || newProcedure.notes
      };
      const newTeeth = new Map(teethData);
      const cur = newTeeth.get(selectedTooth);
      newTeeth.set(selectedTooth, cur
        ? { ...cur, procedures: [...cur.procedures, proc] }
        : { number: selectedTooth, procedures: [proc] }
      );
      setTeethData(newTeeth);
      setNewProcedure({ condition: '', treatment: '', status: 'Planned', doctor: usersList[0]?.name || '', cost: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err) {
      console.error('Failed to create procedure', err);
      alert('Error al guardar el procedimiento');
    }
  };

  const handleTreatmentChange = (treatmentName: string) => {
    const cat = treatmentOptions.find(t => t.name === treatmentName);
    setNewProcedure((prev: any) => ({ ...prev, treatment: treatmentName, cost: cat ? cat.price : prev.cost }));
  };

  const handleEditStart = (proc: Procedure) => {
    setEditingProcId(proc.id);
    setProcEdits({ status: proc.status, notes: proc.notes || '', cost: proc.cost });
  };

  const handleEditCancel = () => {
    setEditingProcId(null);
    setProcEdits({});
  };

  const handleUpdateProcedure = async (procId: string) => {
    try {
      const payload: any = {};
      if (procEdits.status) payload.status = procEdits.status.toLowerCase().replace(' ', ' ');
      if (typeof procEdits.cost === 'number') payload.cost = procEdits.cost;
      if (procEdits.notes !== undefined) payload.notes = procEdits.notes;
      const res = await updateDentalProcedure(procId as any, payload);
      const updated = res.procedure || res;
      const normalizeStatus = (s: string): Procedure['status'] => {
        if (s === 'completed') return 'Completed';
        if (s === 'in progress') return 'In Progress';
        return 'Planned';
      };
      const newTeeth = new Map(teethData);
      for (const [, td] of newTeeth.entries()) {
        const idx = td.procedures.findIndex(p => String(p.id) === String(procId));
        if (idx !== -1) {
          const newProcs = [...td.procedures];
          newProcs[idx] = {
            ...newProcs[idx],
            status: normalizeStatus(updated.status),
            cost: updated.cost ?? newProcs[idx].cost,
            notes: updated.notes ?? newProcs[idx].notes,
            date: updated.date ? new Date(updated.date).toISOString().split('T')[0] : newProcs[idx].date
          } as Procedure;
          newTeeth.set(td.number, { ...td, procedures: newProcs });
          break;
        }
      }
      setTeethData(newTeeth);
      setEditingProcId(null);
      setProcEdits({});
    } catch (err) {
      console.error('Failed updating procedure', err);
      alert('Error al actualizar el procedimiento');
    }
  };

  const handleDeleteProcedure = async (procId: string) => {
    if (!confirm('¿Eliminar este procedimiento? Esta acción no se puede deshacer.')) return;
    try {
      await deleteDentalProcedure(Number(procId));
      const newTeeth = new Map(teethData);
      for (const [toothNum, td] of newTeeth.entries()) {
        const idx = td.procedures.findIndex(p => String(p.id) === String(procId));
        if (idx !== -1) {
          const newProcs = td.procedures.filter(p => String(p.id) !== String(procId));
          newTeeth.set(toothNum, { ...td, procedures: newProcs });
          break;
        }
      }
      setTeethData(newTeeth);
      if (editingProcId === procId) { setEditingProcId(null); setProcEdits({}); }
    } catch (err) {
      console.error('Failed deleting procedure', err);
      alert('Error al eliminar el procedimiento');
    }
  };

  const handleGenerateQuote = async () => {
    const allProcs: (Procedure & { toothNumber: number })[] = [];
    teethData.forEach(tooth => {
      tooth.procedures.forEach(p => {
        if (p.status === 'Planned') allProcs.push({ ...p, toothNumber: tooth.number });
      });
    });
    if (allProcs.length === 0) { alert(t('odontogram.quote.noPlanned')); return; }
    const total = allProcs.reduce((sum, p) => sum + (p.cost || 0), 0).toFixed(2);
    const dateStr = new Date().toLocaleDateString();
    const clinicName = clinicSettings?.name || 'DentaCare';
    const rowsHtml = allProcs.map(p => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 12px; font-weight: 500; color: #374151;">#${p.toothNumber}</td>
        <td style="padding: 10px 12px;"><div style="font-weight: 600; color: #111827;">${p.treatment}</div><div style="font-size: 11px; color: #6b7280;">${p.condition}</div></td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #111827;">$${(p.cost || 0).toFixed(2)}</td>
      </tr>
    `).join('');
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #111827; padding: 32px; width: 180mm; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 28px;">
          <div>
            <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 800; text-transform: uppercase; color: #030213;">${clinicName}</h1>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">Cotización de Tratamiento Odontológico</p>
          </div>
          <div style="text-align: right;"><p style="margin: 0; font-size: 13px; color: #374151;"><strong>Fecha:</strong> ${dateStr}</p></div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #1f2937;">Paciente: ${patientName ?? `#${patientId}`}</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">ID: #${patientId}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #374151; border-bottom: 2px solid #d1d5db;">Diente</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #374151; border-bottom: 2px solid #d1d5db;">Tratamiento</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #374151; border-bottom: 2px solid #d1d5db;">Costo</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
          <div style="background: #f0f0f5; border: 1px solid #c7c7d6; border-radius: 8px; padding: 14px 20px; min-width: 220px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">Costo Total Estimado:</span>
              <span style="font-size: 20px; font-weight: 800; color: #030213;">$${total}</span>
            </div>
          </div>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #9ca3af; font-style: italic;">Esta cotización es de carácter informativo. Los precios están sujetos a cambios. Válido por 30 días.</p>
        </div>
      </div>
    `;
    const container = document.createElement('div');
    container.style.position = 'fixed'; container.style.left = '-9999px'; container.style.top = '0';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `Cotizacion_${(patientName || String(patientId)).replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };
    try { await html2pdf().set(opt).from(container.firstElementChild as HTMLElement).save(); }
    catch (err) { console.error('PDF generation failed:', err); alert('No se pudo generar la cotización.'); }
    finally { document.body.removeChild(container); }
  };

  const isMissing = selectedTooth ? (teethData.get(selectedTooth)?.missing ?? false) : false;

  // ─── Tooth SVG (with X for missing) ───────────────────────────────────────
  const ToothShape = ({ toothNumber, isUpper }: { toothNumber: number; isUpper: boolean }) => {
    const status = getToothStatus(toothNumber);
    const color = getToothColor(status);
    const isMissingTooth = status === 'missing';
    return (
      <div
        className="flex flex-col items-center cursor-pointer group"
        style={{ transition: 'all 0.2s' }}
        onClick={() => handleToothClick(toothNumber)}
      >
        {!isUpper && <span className="text-xs font-medium mb-1 text-gray-700">{toothNumber}</span>}
        <svg width="40" height="54" viewBox="0 0 40 54" className="transition-transform group-hover:scale-110">
          <rect
            x="6" y={isUpper ? '8' : '2'} width="28" height="42" rx="5"
            className={`${color} stroke-2 transition-all cursor-pointer`}
          />
          {isMissingTooth && (
            <>
              <line x1="10" y1={isUpper ? '14' : '8'} x2="30" y2={isUpper ? '44' : '38'} className="stroke-gray-500 stroke-2" />
              <line x1="30" y1={isUpper ? '14' : '8'} x2="10" y2={isUpper ? '44' : '38'} className="stroke-gray-500 stroke-2" />
            </>
          )}
        </svg>
        {isUpper && <span className="text-xs font-medium mt-1 text-gray-700">{toothNumber}</span>}
      </div>
    );
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
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4">
            {[
              { label: t('odontogram.legend.healthy'), color: 'bg-white border-2 border-gray-300' },
              { label: t('odontogram.legend.planned'), color: 'bg-amber-400 border-2 border-amber-600' },
              { label: t('odontogram.legend.inProgress'), color: 'bg-blue-400 border-2 border-blue-600' },
              { label: t('odontogram.legend.completed'), color: 'bg-emerald-400 border-2 border-emerald-600' },
              { label: 'Diente ausente', color: 'bg-gray-300 border-2 border-gray-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded ${item.color} relative`} />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dental Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>{t('odontogram.chartTitle')}</CardTitle>
          <CardDescription>{t('odontogram.chartDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-10">
            {/* Upper Arch */}
            <div>
              <div className="text-center mb-3">
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded">{t('odontogram.upperArch')}</span>
              </div>
              <div className="flex justify-center items-end gap-1" style={{ height: '100px' }}>
                {upperTeeth.map((n, i) => {
                  const angle = ((i - 7.5) / 8) * 28;
                  const y = Math.abs(angle) * 1.4;
                  return (
                    <div key={n} style={{ transform: `translateY(${y}px) rotate(${angle}deg)`, transition: 'all 0.2s' }}>
                      <ToothShape toothNumber={n} isUpper={true} />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Lower Arch */}
            <div>
              <div className="text-center mb-2">
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded">{t('odontogram.lowerArch')}</span>
              </div>
              <div className="flex justify-center items-start gap-1" style={{ height: '100px', marginTop: '16px' }}>
                {lowerTeeth.map((n, i) => {
                  const angle = ((i - 7.5) / 8) * -28;
                  const y = Math.abs(angle) * 1.4;
                  return (
                    <div key={n} style={{ transform: `translateY(${y}px) rotate(${angle}deg)`, transition: 'all 0.2s' }}>
                      <ToothShape toothNumber={n} isUpper={false} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tooth Detail Side Panel ─────────────────────────────────────────── */}
      <Sheet open={selectedTooth !== null} onOpenChange={() => setSelectedTooth(null)}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
          {/* Fixed header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>{t('odontogram.toothTitle', { num: selectedTooth })}</SheetTitle>
                <SheetDescription className="mt-0.5">{t('odontogram.toothDescription')}</SheetDescription>
              </div>
              {/* Missing toggle button */}
              <Button
                size="sm"
                variant={isMissing ? 'destructive' : 'outline'}
                className="text-xs gap-1.5 h-8"
                onClick={handleToggleMissing}
              >
                <BanIcon className="w-3.5 h-3.5" />
                {isMissing ? 'Restaurar diente' : 'Marcar ausente'}
              </Button>
            </div>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

            {/* ── Existing Procedures ─────────────────────────────────── */}
            {selectedToothData && selectedToothData.procedures.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  {t('odontogram.procedureHistory.title')}
                </h3>
                <div className="space-y-3">
                  {selectedToothData.procedures.map((proc) => {
                    const isEditing = editingProcId === proc.id;
                    const borderColor = proc.status === 'Completed' ? '#10b981' : proc.status === 'In Progress' ? '#3b82f6' : '#f59e0b';
                    return (
                      <div key={proc.id} className="rounded-lg border bg-white shadow-sm overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
                        {/* Card header — always visible */}
                        <div className="flex items-start justify-between px-4 pt-3 pb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{proc.treatment}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{proc.condition}</p>
                          </div>
                          <StatusBadge status={proc.status} />
                        </div>
                        {/* Compact info row */}
                        <div className="flex gap-4 text-xs text-gray-500 px-4 pb-2">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{proc.date}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${proc.cost}</span>
                          <span>{proc.doctor}</span>
                        </div>
                        {proc.notes && !isEditing && (
                          <p className="text-xs text-gray-500 italic px-4 pb-2">📝 {proc.notes}</p>
                        )}

                        {/* Edit form — only shown when editing */}
                        {isEditing && (
                          <div className="border-t px-4 py-3 space-y-3 bg-gray-50">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Estado</Label>
                                <Select
                                  value={procEdits.status || proc.status}
                                  onValueChange={v => setProcEdits(p => ({ ...p, status: v }))}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Planned">Planificado</SelectItem>
                                    <SelectItem value="In Progress">En Progreso</SelectItem>
                                    <SelectItem value="Completed">Completado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Costo ($)</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  value={procEdits.cost ?? proc.cost}
                                  onChange={e => setProcEdits(p => ({ ...p, cost: parseFloat(e.target.value) }))}
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Notas</Label>
                              <Textarea
                                rows={2}
                                className="text-xs resize-none"
                                value={procEdits.notes ?? proc.notes ?? ''}
                                onChange={e => setProcEdits(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Notas del procedimiento…"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleUpdateProcedure(proc.id)}>
                                Guardar
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleEditCancel}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        {!isEditing && (
                          <div className="flex gap-2 px-4 pb-3 pt-1">
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => handleEditStart(proc)}
                            >
                              <Pencil className="w-3 h-3" /> Editar
                            </Button>
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeleteProcedure(proc.id)}
                            >
                              <Trash2 className="w-3 h-3" /> Eliminar
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Add New Procedure ──────────────────────────────────── */}
            {!isMissing && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  {t('odontogram.addNew.title')}
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t('odontogram.labels.condition')}</Label>
                      <Select value={newProcedure.condition || ''} onValueChange={v => setNewProcedure({ ...newProcedure, condition: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Condición" /></SelectTrigger>
                        <SelectContent>
                          {conditionOptions.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t('odontogram.labels.treatment')}</Label>
                      <Select value={newProcedure.treatment || ''} onValueChange={handleTreatmentChange}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tratamiento" /></SelectTrigger>
                        <SelectContent>
                          {treatmentOptions.map(t => <SelectItem key={t.id} value={t.name} className="text-xs">{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t('odontogram.labels.status')}</Label>
                      <Select value={newProcedure.status} onValueChange={v => setNewProcedure({ ...newProcedure, status: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Planned">Planificado</SelectItem>
                          <SelectItem value="In Progress">En Progreso</SelectItem>
                          <SelectItem value="Completed">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t('odontogram.labels.doctor')}</Label>
                      <Select value={newProcedure.doctor || ''} onValueChange={v => setNewProcedure({ ...newProcedure, doctor: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {usersList.length ? usersList.map(u => <SelectItem key={u.id} value={u.name} className="text-xs">{u.name}</SelectItem>)
                            : <><SelectItem value="Dr. Smith">Dr. Smith</SelectItem><SelectItem value="Dr. Martinez">Dr. Martinez</SelectItem></>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t('odontogram.labels.cost')}</Label>
                      <Input type="number" className="h-9 text-xs" value={newProcedure.cost}
                        onChange={e => setNewProcedure({ ...newProcedure, cost: parseFloat(e.target.value) })} placeholder="0.00" />
                    </div>
                    <div>
                      <Label className="text-xs">{t('odontogram.labels.date')}</Label>
                      <Input type="date" className="h-9 text-xs" value={newProcedure.date}
                        onChange={e => setNewProcedure({ ...newProcedure, date: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t('odontogram.labels.notesOptional')}</Label>
                    <Textarea rows={2} className="text-xs resize-none" value={newProcedure.notes}
                      onChange={e => setNewProcedure({ ...newProcedure, notes: e.target.value })}
                      placeholder={t('odontogram.placeholders.additionalNotes')} />
                  </div>
                </div>
              </div>
            )}

            {isMissing && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                <BanIcon className="w-10 h-10" />
                <p className="text-sm font-medium">Diente marcado como ausente</p>
                <p className="text-xs text-center">Haz clic en "Restaurar diente" para agregar procedimientos.</p>
              </div>
            )}
          </div>

          {/* Fixed footer with action button */}
          {!isMissing && (
            <div className="border-t px-6 py-4 flex-shrink-0 bg-white">
              <Button
                onClick={handleAddProcedure}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!newProcedure.condition || !newProcedure.treatment}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('odontogram.actions.addProcedure')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
