import { useState, useEffect } from 'react';
import { getMedicalHistory, saveMedicalHistory } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Textarea } from './ui/textarea';
import { Save, Plus, Trash2, HeartPulse, Stethoscope, AlertTriangle, Pill } from 'lucide-react';

// ─── Questions ────────────────────────────────────────────────────────────────
const PERSONAL_QUESTIONS = [
  '¿Se encuentra en buen estado de salud?',
  '¿Ha tenido alguna atención de salud en el último año?',
  '¿Ha sido operado alguna vez?',
  '¿Toma actualmente algún medicamento? (Especifique abajo)',
  '¿Ha sufrido problemas cardíacos?',
  '¿Ha sufrido hepatitis?',
  '¿Ha sufrido epilepsia?',
  '¿Ha sufrido de problemas renales?',
  '¿Ha sufrido de diabetes?',
  '¿Ha sufrido tuberculosis?',
  '¿Ha sufrido anemias o discrasias sanguíneas?',
  '¿Padece desmayo?',
  '¿Es alérgico a la penicilina?',
  '¿Ha tenido dolores de cabeza frecuentemente?',
  '¿Fue tratado o tomó algún medicamento para algún problema emocional?',
];

const DENTAL_QUESTIONS = [
  '¿Ha tenido intervenciones dentales recientemente?',
  '¿Ha recibido instrucciones de higiene oral?',
  '¿Tiene algún hábito dental (bruxismo, rechinar dientes, morder objetos)?',
  '¿Ha tenido sangrado abundante como consecuencia de tratamiento dental?',
  '¿Tiene sensibilidad dental (frío, calor, dulce)?',
];

// ─── Types ──────────────────────────────────────────────────────────────────
type TriState = true | false | null;
type Answers = Record<string, TriState>;
interface Medication { drug: string; objective: string }

interface MedicalHistoryTabProps {
  patientId: number;
}

// ─── Yes/No Toggle ───────────────────────────────────────────────────────────
function YesNoToggle({
  value,
  onChange,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  return (
    <div className="flex gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onChange(value === true ? null : true)}
        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
          value === true
            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
            : 'bg-white text-gray-500 border-gray-300 hover:border-emerald-400 hover:text-emerald-600'
        }`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(value === false ? null : false)}
        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
          value === false
            ? 'bg-red-500 text-white border-red-500 shadow-sm'
            : 'bg-white text-gray-500 border-gray-300 hover:border-red-400 hover:text-red-600'
        }`}
      >
        No
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MedicalHistoryTab({ patientId }: MedicalHistoryTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Personal antecedents
  const [personalAnswers, setPersonalAnswers] = useState<Answers>({});
  const [currentMedications, setCurrentMedications] = useState('');

  // Dental history
  const [dentalAnswers, setDentalAnswers] = useState<Answers>({});
  const [lastDentalVisit, setLastDentalVisit] = useState('');

  // Allergies
  const [allergyNsaids, setAllergyNsaids] = useState('');
  const [allergyAntibiotics, setAllergyAntibiotics] = useState('');
  const [allergyAspirin, setAllergyAspirin] = useState('');
  const [allergyOther, setAllergyOther] = useState('');

  // General notes & medications table
  const [generalNotes, setGeneralNotes] = useState('');
  const [medications, setMedications] = useState<Medication[]>([{ drug: '', objective: '' }]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await getMedicalHistory(patientId);
        const h = res.medicalHistory;
        if (h && mounted) {
          setPersonalAnswers((h.personalAnswers as Answers) ?? {});
          setCurrentMedications(h.currentMedications ?? '');
          setDentalAnswers((h.dentalAnswers as Answers) ?? {});
          setLastDentalVisit(h.lastDentalVisit ?? '');
          setAllergyNsaids(h.allergyNsaids ?? '');
          setAllergyAntibiotics(h.allergyAntibiotics ?? '');
          setAllergyAspirin(h.allergyAspirin ?? '');
          setAllergyOther(h.allergyOther ?? '');
          setGeneralNotes(h.generalNotes ?? '');
          if (Array.isArray(h.medications) && h.medications.length > 0) {
            setMedications(h.medications as Medication[]);
          }
        }
      } catch (e) {
        console.error('Failed loading medical history', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [patientId]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      await saveMedicalHistory(patientId, {
        personalAnswers,
        currentMedications,
        dentalAnswers,
        lastDentalVisit,
        allergyNsaids,
        allergyAntibiotics,
        allergyAspirin,
        allergyOther,
        generalNotes,
        medications: medications.filter(m => m.drug.trim()),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed saving medical history', e);
      alert('Error al guardar los antecedentes');
    } finally {
      setSaving(false);
    }
  };

  const setPersonal = (key: string, v: TriState) =>
    setPersonalAnswers(prev => ({ ...prev, [key]: v }));
  const setDental = (key: string, v: TriState) =>
    setDentalAnswers(prev => ({ ...prev, [key]: v }));

  const addMed = () => setMedications(m => [...m, { drug: '', objective: '' }]);
  const removeMed = (i: number) => setMedications(m => m.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof Medication, val: string) =>
    setMedications(m => m.map((med, idx) => idx === i ? { ...med, [field]: val } : med));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-500" />
            Antecedentes Médicos
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Historial médico y dental del paciente</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={`gap-2 ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar cambios'}
        </Button>
      </div>

      {/* ── Personal Antecedents ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="w-4 h-4 text-blue-500" />
            Antecedentes Personales
          </CardTitle>
          <CardDescription>Responda Sí o No según corresponda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PERSONAL_QUESTIONS.map((q, i) => {
              const key = `q${i + 1}`;
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-4 p-3 rounded-lg transition-colors ${
                    personalAnswers[key] === true
                      ? 'bg-emerald-50 border border-emerald-200'
                      : personalAnswers[key] === false
                      ? 'bg-red-50 border border-red-100'
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <span className="text-sm text-gray-700 flex-1">
                    <span className="font-semibold text-gray-400 mr-2">{i + 1}.</span>
                    {q}
                  </span>
                  <YesNoToggle
                    value={personalAnswers[key] ?? null}
                    onChange={v => setPersonal(key, v)}
                  />
                </div>
              );
            })}
          </div>

          {/* Current medications free text (Q4) */}
          <div className="mt-5 space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Medicamentos actuales (Especifique)
            </Label>
            <Input
              placeholder="Ej. Metformina 500mg, Enalapril 10mg…"
              value={currentMedications}
              onChange={e => setCurrentMedications(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Dental History ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8 2 5 5 5 8c0 2 .5 3.5 1.5 5L8 20h8l1.5-7C18.5 11.5 19 10 19 8c0-3-3-6-7-6z" />
            </svg>
            Historia Dental
          </CardTitle>
          <CardDescription>Antecedentes odontológicos del paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Last dental visit */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-700 flex-1">¿Cuándo fue su última visita al odontólogo?</span>
              <Input
                type="text"
                placeholder="Ej. Enero 2024"
                value={lastDentalVisit}
                onChange={e => setLastDentalVisit(e.target.value)}
                className="w-40 text-sm"
              />
            </div>
            {DENTAL_QUESTIONS.map((q, i) => {
              const key = `d${i + 1}`;
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-4 p-3 rounded-lg transition-colors ${
                    dentalAnswers[key] === true
                      ? 'bg-emerald-50 border border-emerald-200'
                      : dentalAnswers[key] === false
                      ? 'bg-red-50 border border-red-100'
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <span className="text-sm text-gray-700 flex-1">
                    <span className="font-semibold text-gray-400 mr-2">{i + 1}.</span>
                    {q}
                  </span>
                  <YesNoToggle
                    value={dentalAnswers[key] ?? null}
                    onChange={v => setDental(key, v)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Allergies ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alergias a Medicamentos
          </CardTitle>
          <CardDescription>
            ¿Es sensible o alérgico a los medicamentos usados en odontología?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">AINEs / Analgésicos</Label>
              <Input
                placeholder="Ej. Ibuprofeno, Naproxeno…"
                value={allergyNsaids}
                onChange={e => setAllergyNsaids(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Antibióticos</Label>
              <Input
                placeholder="Ej. Amoxicilina, Clindamicina…"
                value={allergyAntibiotics}
                onChange={e => setAllergyAntibiotics(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Aspirina</Label>
              <Input
                placeholder="Dosis o reacción conocida…"
                value={allergyAspirin}
                onChange={e => setAllergyAspirin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Otras alergias</Label>
              <Input
                placeholder="Látex, anestésicos locales…"
                value={allergyOther}
                onChange={e => setAllergyOther(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Medications Table ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="w-4 h-4 text-violet-500" />
              Medicamentos Actuales
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addMed} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </Button>
          </div>
          <CardDescription>Indique todos los medicamentos, suplementos o vitaminas que toma actualmente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-2 pb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fármaco</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Objetivo / Indicación</span>
              <span />
            </div>
            {medications.map((med, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                <Input
                  placeholder="Nombre del medicamento"
                  value={med.drug}
                  onChange={e => updateMed(i, 'drug', e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="Para qué lo toma"
                  value={med.objective}
                  onChange={e => updateMed(i, 'objective', e.target.value)}
                  className="text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeMed(i)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  disabled={medications.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── General Notes ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notas Adicionales</CardTitle>
          <CardDescription>
            Describa cualquier tratamiento dental, cirugía, reacciones a medicamentos o enfermedades previas que considere relevante
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Notas clínicas, alergias no listadas, condiciones especiales…"
            rows={4}
            value={generalNotes}
            onChange={e => setGeneralNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* ── Legal Notice ───────────────────────────────────────────────── */}
      <div className="text-center text-xs text-gray-400 italic border-t border-dashed pt-4">
        EN EL FUTURO COMUNÍQUENOS CUALQUIER CAMBIO EN SUS ANTECEDENTES MÉDICOS O DE CUALQUIER MEDICAMENTO QUE ESTÉ TOMANDO.
      </div>

    </div>
  );
}
