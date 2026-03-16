import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPatients, getUsers, getConsents, createConsent, uploadDocument, signConsent, updateConsent, getConsent, getDocument } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { StatusBadge } from './StatusBadge';
import { FileCheck, Search, Eye, Edit, CheckCircle2, XCircle, FilePlus, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ConsentForm {
  id: number;
  title: string;
  patient: string;
  patientId?: number;
  procedure: string;
  doctor: string;
  createdDate: string;
  status: 'Signed' | 'Unsigned' | 'Pending Review';
  signedDate?: string;
  formData?: any;
}

interface PatientItem {
  id: number;
  name: string;
  nationalId?: string;
  address?: string;
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
    patientId: '' as number | string,
    procedure: '',
    doctorId: '' as number | string,
    formType: '',
    templateId: ''
  });

  const [patientsList, setPatientsList] = useState<PatientItem[]>([]);
  const [doctorsList, setDoctorsList] = useState<Array<{ id: number; name: string; role?: string }>>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // ── Shared intro/closing paragraphs used by all templates ──────────────────
  const INTRO = `Para satisfacción de los DERECHOS DEL PACIENTE, como instrumento favorecedor del correcto uso de los procedimientos diagnósticos y terapéuticos, y en cumplimiento de la Ley 42-01 (Ley General de Salud), en el capítulo IV de los derechos y deberes en relación con la salud, Santo Domingo, Distrito Nacional, declaro:\n\nYo, {{patientName}}, dominicano(a), mayor de edad, portador(a) de la cédula de identidad y electoral No. {{patientNationalId}}, con domicilio en {{patientAddress}}, declaro que me he dirigido a la clínica odontológica DENTAL SUITE BY VICTOR DE JESUS SRL y he sido informado/a de manera clara, respetuosa y suficiente sobre el tratamiento odontológico que se me propone en el límite de las posibilidades técnicas y del conocimiento actual para mi caso. En pleno uso de mis facultades mentales, y con total libertad, declaro estar consciente de las etapas de mi tratamiento, el tiempo propuesto y doy mi consentimiento para recibir atención en esta clínica.\n\nAutorizo al personal de la clínica a realizar toda documentación clínica, fotográfica y videográfica necesaria de todas las etapas de mi tratamiento y que este material pueda ser utilizado con fines de archivo y documentación para usos académicos y publicitarios de la institución, respetando los límites del código de ética y a la vez realizar los procedimientos necesarios para mi salud bucal, entendiendo que:`;
  const PAYMENT = `\n\nAsumo la responsabilidad de pagar y cubrir con los gastos de honorarios médicos, materiales y trabajos de laboratorios que conlleve el desarrollo de mi tratamiento, el mismo se me entregará a través de un presupuesto inicial (presuntivo) al momento del inicio de este y deberá ser cubierto al momento de finalizar dichos trabajos.`;
  const CLOSING = `\n\nHe comprendido toda la información proporcionada.\nHe tenido oportunidad de hacer preguntas y recibir respuestas claras.\nAcepto voluntariamente el tratamiento propuesto.\nEntiendo que este consentimiento no sustituye el deber de información continua durante el proceso clínico.\n\nCiudad y fecha: Santo Domingo, República Dominicana, {{date}}\n\nDeclarante: {{patientName}}\n\nProfesional: {{doctorName}}`;

  const templates = [
    {
      id: 'operacion',
      title: 'Operatoria',
      content: `CONSENTIMIENTO INFORMADO – OPERATORIA\n\n${INTRO}\n\nLa Operatoria dental es el área enfocada en la prevención, diagnóstico y tratamiento de la caries dental y otras lesiones mediante restauraciones con resinas, incrustaciones, entre otras. Suele considerarse un procedimiento seguro y de bajo riesgo comparado con una cirugía, pero también puede tener complicaciones locales o generales.\n\nSe me ha informado que, aunque poco frecuentes, pueden presentarse complicaciones como:\n\n• Sensibilidad dental al frío, calor o presión\n• Daño pulpar\n• Filtración marginal\n• Fractura dental o de la restauración\n• Problemas oclusales\n• Dolor o inflamación transitoria en el área tratada\n• Reacciones alérgicas poco frecuentes\n• Daño a tejidos blandos\n• Problemas estéticos\n• Complicaciones sistémicas (muy raras)${PAYMENT}${CLOSING}`
    },
    {
      id: 'protesis',
      title: 'Prótesis',
      content: `CONSENTIMIENTO INFORMADO – PRÓTESIS\n\n${INTRO}\n\nLa prótesis dental es la especialidad que repone dientes ausentes y estructuras orales perdidas, mediante prótesis fijas, removibles o implantosoportadas, con el objetivo de restablecer la función masticatoria, fonética y estética.\n\nSe me ha informado que, aunque poco frecuentes, pueden presentarse complicaciones como:\n\nRiesgos biológicos:\n• Irritación y lesiones de la mucosa oral\n• Acumulación de placa y caries\n• Enfermedad periodontal\n• Reabsorción ósea\n• Infecciones fúngicas\n\nRiesgos mecánicos:\n• Fractura de la prótesis\n• Aflojamiento o descementación de la prótesis\n• Requerir ajustes o reemplazos en el tiempo\n\nRiesgos funcionales:\n• Alteraciones en la masticación y la fonación\n• Problemas de oclusión\n\nRiesgos psicológicos y sociales:\n• Inseguridad estética o funcional\n• Sensación de cuerpo extraño o dificultad de adaptación\n• Disminución de la calidad de vida${PAYMENT}${CLOSING}`
    },
    {
      id: 'cirugia',
      title: 'Cirugía',
      content: `CONSENTIMIENTO INFORMADO – CIRUGÍA\n\n${INTRO}\n\nLa exodoncia dental (extracción dental) es un procedimiento común, pero como toda cirugía, conlleva ciertos riesgos y posibles complicaciones. Estos dependen de factores como el estado general de salud del paciente, la complejidad del caso y la técnica utilizada.\n\nSe me ha informado que puede presentar riesgos como:\n\n• Dolor e inflamación\n• Sangrado\n• Infección\n• Alveolitis (alveolitis seca)\n• Lesiones a las estructuras vecinas (dientes adyacentes, lengua, labios, nervios)\n• Senos maxilares (perforación)\n• Fractura ósea\n• Parestesia (pérdida de sensibilidad, hormigueo)\n• Trismo (limitación de la apertura de la boca)\n• Complicaciones sistémicas\n• Reacciones adversas a la anestesia local\n• Crisis en pacientes con enfermedades sistémicas: hipertensión no controlada, diabetes no controlada, problemas cardíacos${PAYMENT}${CLOSING}`
    },
    {
      id: 'ortodoncia',
      title: 'Ortodoncia',
      content: `CONSENTIMIENTO INFORMADO – ORTODONCIA\n\n${INTRO}\n\nLa Ortodoncia interceptiva se aplica en niños para corregir alteraciones en el crecimiento y desarrollo de los maxilares y la posición dental temprana. Aunque es un tratamiento preventivo y menos invasivo que la Ortodoncia correctiva en adolescentes y adultos, también implica ciertos riesgos y complicaciones que deben considerarse.\n\nSe me ha informado que puede presentar riesgos como:\n\nRiesgos locales (en boca):\n• Irritación de tejidos blandos\n• Lesiones o úlceras traumáticas\n• Aumento de la placa bacteriana y caries\n• Gingivitis o inflamación periodontal\n• Reabsorción radicular\n• Alteración en la erupción dentaria\n\nRiesgos funcionales:\n• Dolor o molestias al inicio o en ajustes\n• Dificultad para hablar o masticar\n• Fractura o desprendimiento del aparato\n\nRiesgos relacionados con la cooperación del paciente:\n• Falta de uso del aparato removible\n• Manipulación inadecuada del aparato\n• Mala higiene bucal\n\nRiesgos médicos / sistémicos (menos comunes):\n• Reacciones alérgicas\n• Complicaciones en pacientes con condiciones médicas especiales\n\nPrevención y control de riesgos:\n• Historia clínica completa (médica y dental)\n• Instrucciones claras de higiene bucal y uso del aparato\n• Controles periódicos para ajustar, revisar adaptación y evaluar el crecimiento\n• Educación y motivación del niño y los padres para asegurar cooperación${PAYMENT}${CLOSING}`
    },
    {
      id: 'endodoncia',
      title: 'Endodoncia',
      content: `CONSENTIMIENTO INFORMADO – ENDODONCIA\n\n${INTRO}\n\nLa Endodoncia se dedica al diagnóstico y tratamiento de las enfermedades de la pulpa dental y los tejidos periapicales por medio de la limpieza y sellado de los conductos radiculares. Cuando se realiza un tratamiento endodóntico (tratamiento de conductos), existen algunos riesgos y posibles complicaciones, tanto durante como después del procedimiento:\n\nRiesgos durante el tratamiento:\n• Perforación radicular o de piso de cámara pulpar\n• Fractura de instrumentos endodónticos dentro del conducto\n• Sobre instrumentación o sobreobturación\n• Extravasación de irrigantes (ej. hipoclorito de sodio)\n• Falsa vía o conducto lateral\n\nRiesgos posteriores al tratamiento:\n• Dolor postoperatorio\n• Edema (inflamación)\n• Infección persistente o absceso\n• Fracaso del tratamiento (necesidad de retratamiento o extracción)\n• Fractura dental\n\nRiesgos generales:\n• Reacciones alérgicas a medicamentos, anestésicos o materiales\n• Lesión en estructuras cercanas (ej. nervio dentario inferior en molares inferiores o seno maxilar en molares superiores)${PAYMENT}${CLOSING}`
    },
    {
      id: 'periodoncia',
      title: 'Periodoncia',
      content: `CONSENTIMIENTO INFORMADO – PERIODONCIA\n\n${INTRO}\n\nLa Periodoncia es la disciplina encargada de la prevención, diagnóstico y tratamiento de las enfermedades de las encías y de los tejidos que soportan los dientes, buscando preservar la salud periodontal y la estabilidad de la dentición. Los procedimientos periodontales (como raspado y alisado radicular, cirugía periodontal, injertos de encía o regeneración ósea) conllevan ciertos riesgos y complicaciones posibles:\n\nRiesgos inmediatos (durante o justo después del procedimiento):\n• Sangrado excesivo\n• Dolor o molestia\n• Inflamación y edema\n• Infección local\n• Lesión de estructuras adyacentes\n\nRiesgos posteriores:\n• Retracción gingival\n• Sensibilidad dental\n• Movilidad dental aumentada\n• Falla del injerto o regeneración\n• Recidiva de la enfermedad periodontal\n\nRiesgos generales:\n• Reacciones adversas a anestesia o medicamentos\n• Complicaciones sistémicas${PAYMENT}${CLOSING}`
    },
    {
      id: 'odontopediatria',
      title: 'Odontopediatría',
      content: `CONSENTIMIENTO INFORMADO – ODONTOPEDIATRÍA\n\n${INTRO}\n\nLa Odontopediatría está enfocada en la atención integral de la salud bucal de niños y adolescentes. Atender a un paciente de odontopediatría implica riesgos diferentes a los del adulto, porque los niños tienen particularidades anatómicas, fisiológicas, psicológicas y de conducta. Los riesgos pueden clasificarse en tres grandes grupos: conductuales, clínicos y médicos.\n\nRiesgos conductuales / emocionales:\n• Ansiedad y miedo dental: el niño puede resistirse, llorar o moverse bruscamente durante el procedimiento\n• Trauma psicológico si la experiencia es negativa, generando rechazo a futuras atenciones\n• Manejo inadecuado de la conducta: puede dificultar el tratamiento y aumentar el riesgo de accidentes\n\nRiesgos clínicos / locales:\n• Lesiones de tejidos blandos: mordedura accidental por anestesia local o daño durante la atención\n• Aspiración o deglución de objetos pequeños: instrumental, algodones, fragmentos dentales\n• Complicaciones anestésicas locales: dolor, hematoma, parestesia, necrosis tisular\n• Infecciones si no se mantiene un adecuado control de asepsia\n• Manejo de la erupción dentaria: riesgo de dañar dientes permanentes en desarrollo\n\nRiesgos médicos / sistémicos:\n• Reacciones adversas a medicamentos (anestésicos locales, antibióticos, analgésicos, sedantes)\n• Complicaciones médicas en pacientes con enfermedades sistémicas (asma, cardiopatías, diabetes, trastornos de coagulación, epilepsia)\n• Sobredosificación de anestesia o medicación (los niños son más vulnerables por su menor peso corporal)\n• Emergencias médicas: reacciones alérgicas, síncope, crisis convulsivas, broncoespasmo${PAYMENT}${CLOSING}`
    },
    {
      id: 'armonizacion',
      title: 'Armonización Orofacial',
      content: `CONSENTIMIENTO INFORMADO – ARMONIZACIÓN OROFACIAL\n\n${INTRO}\n\nLa Armonización orofacial está orientada a mejorar la estética y el equilibrio del rostro, incluye procedimientos estéticos mínimamente invasivos (ácido hialurónico, toxina botulínica, bioestimuladores, hilos tensores, láser, etc.) con fines funcionales y estéticos. Aunque suelen ser seguros en manos entrenadas, sí existen riesgos y complicaciones que pueden ir de leves a graves.\n\n1. Riesgos locales (más frecuentes):\n• Dolor, edema y eritema en el sitio de aplicación\n• Hematomas por punción de vasos sanguíneos\n• Asimetrías faciales si el producto se coloca de manera desigual\n• Reacciones inflamatorias locales (enrojecimiento, sensibilidad, induración)\n• Migración del material (ej. rellenos que se desplazan)\n• Nódulos o granulomas por reacción a material de relleno\n\n2. Riesgos funcionales / estéticos:\n• Resultado insatisfactorio (efecto exagerado, artificial o contrario a lo esperado)\n• Alteraciones en la expresión facial si se excede la dosis de toxina botulínica\n• Problemas funcionales temporales: dificultad para sonreír, masticar o hablar\n\n3. Riesgos vasculares (los más graves):\n• Obstrucción vascular por inyección intravascular accidental → puede causar necrosis de tejidos blandos\n• Compromiso ocular (en casos muy poco frecuentes, pero graves) → puede producir pérdida de visión\n\n4. Riesgos sistémicos:\n• Reacciones alérgicas a la toxina, rellenos o anestésicos locales\n• Infecciones por falta de asepsia o manipulación inadecuada\n• Complicaciones en pacientes con enfermedades sistémicas (inmunodeprimidos, coagulopatías, embarazadas, lactantes)${PAYMENT}${CLOSING}`
    },
    {
      id: 'implantes',
      title: 'Implantes',
      content: `CONSENTIMIENTO INFORMADO – IMPLANTES\n\n${INTRO}\n\nLos implantes dentales son aditamentos biocompatibles que se colocan en el hueso maxilar o mandibular. Es indispensable un período de espera para que el hueso cicatrice y se adhiera firmemente al implante; este tiempo varía según cada paciente entre 4 a 6 meses. La colocación de implantes dentales es un procedimiento quirúrgico muy predecible y seguro cuando se planifica correctamente, pero no está exento de riesgos y posibles complicaciones.\n\n1. Riesgos quirúrgicos inmediatos (durante la colocación):\n• Lesión de estructuras anatómicas: nervio dentario inferior, nervio lingual, senos maxilares o fosas nasales\n• Fractura ósea\n• Hemorragia excesiva\n• Aspiración o deglución de componentes\n\n2. Riesgos postoperatorios tempranos:\n• Dolor e inflamación\n• Sangrado o hematomas\n• Infección\n• Dehiscencia de la herida\n• Falla en la osteointegración temprana (adherencia del hueso al implante)\n\n3. Riesgos a largo plazo:\n• Periimplantitis (infección crónica alrededor del implante)\n• Fractura del implante o de la corona\n• Pérdida de osteointegración${PAYMENT}${CLOSING}`
    }
  ];

  const formTypes = [
    'General Consent',
    'Surgery Consent',
    'Anesthesia Consent',
    'Other'
  ];

  const [forms, setForms] = useState<ConsentForm[]>([]);

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

    // Set canvas size — use actual rendered width or fallback to 600px
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = 200;

    // Fill white background so PNG export is not transparent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
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
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
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
    // Refill white background so the cleared canvas doesn't go transparent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Re-apply stroke style after fill
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasSignature(false);
    setSignature('');
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setSignature(dataUrl);
  };

  const handleCreateForm = async () => {
    const tpl = templates.find(t => t.id === newFormData.templateId);
    const rendered = tpl ? renderTemplate(tpl.content) : undefined;
    const title = tpl ? `${tpl.title} Consent` : (newFormData.formType ? `${newFormData.formType} Consent` : 'Consent Form');
    const patientName = patientsList.find(p => String(p.id) === String(newFormData.patientId))?.name || '';
    const doctorName = doctorsList.find(d => String(d.id) === String(newFormData.doctorId))?.name || '';
    // If a patient is selected, persist to backend; otherwise keep local
    try {
      if (newFormData.patientId) {
        const payload: any = {
          patientId: Number(newFormData.patientId),
        };
        if (newFormData.templateId) payload.templateId = newFormData.templateId;
        if (rendered) payload.formData = rendered;
        const res: any = await createConsent(payload);
        const consent = res?.consent || res;
        const newForm: ConsentForm = {
          id: consent.id,
          title,
          patient: patientName,
          patientId: Number(newFormData.patientId),
          procedure: newFormData.procedure || '',
          doctor: doctorName,
          createdDate: consent.createdAt ? new Date(consent.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          status: consent.signedAt ? 'Signed' : 'Unsigned',
          signedDate: consent.signedAt ? new Date(consent.signedAt).toISOString().slice(0, 10) : undefined,
          formData: consent.formData || rendered,
        };
        setForms([newForm, ...forms]);
      } else {
        const newForm: ConsentForm = {
          id: Date.now(),
          title,
          patient: patientName,
          procedure: newFormData.procedure || '',
          doctor: doctorName,
          createdDate: new Date().toISOString().slice(0, 10),
          status: 'Unsigned',
          formData: rendered,
        };
        setForms([newForm, ...forms]);
      }
    } catch (err: any) {
      console.error('Failed to create consent', err);
      // fallback to local creation
      const newForm: ConsentForm = {
        id: Date.now(),
        title,
        patient: patientName,
        procedure: newFormData.procedure || '',
        doctor: doctorName,
        createdDate: new Date().toISOString().slice(0, 10),
        status: 'Unsigned',
        formData: rendered,
      };
      setForms([newForm, ...forms]);
    } finally {
      setIsCreateModalOpen(false);
      setNewFormData({ patientId: '', procedure: '', doctorId: '', formType: '', templateId: '' });
    }
  };

  const handleSignForm = async () => {
    saveSignature();
    if (!selectedForm) return;
    try {
      // if a signature is present on the canvas, read it and upload
      const dataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : signature;
      if (dataUrl && dataUrl.startsWith('data:')) {
        const res = await (async () => {
          // convert dataURL to File
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const file = new File([u8arr], `consent - signature - ${selectedForm.id || Date.now()}.png`, { type: mime });
          const uploadRes: any = await uploadDocument(file, 'consent-signature', selectedForm.patientId);
          console.debug('uploadDocument response', uploadRes);
          return uploadRes?.document || uploadRes;
        })();
        // attach document to consent (PUT) via createConsent/sign endpoints: first set documentId using backend PUT
        if (res && res.id) {
          try {
            // prefer updateConsent to set documentId
            console.debug('attaching documentId to consent', { consentId: selectedForm.id, documentId: res.id });
            await updateConsent(selectedForm.id, { documentId: res.id });
            console.debug('attached documentId');
          } catch (e) {
            // ignore
            console.error('failed attaching documentId via updateConsent', e);
          }
        }
      }

      // call sign endpoint to set signerName and signedAt
      const patientName = selectedForm.patient;
      console.debug('signing consent', { id: selectedForm.id, signerName: patientName });
      await signConsent(selectedForm.id, patientName);
      console.debug('signConsent completed');

      // refresh consent from server and update UI
      try {
        const latestRes: any = await getConsent(selectedForm.id);
        console.debug('getConsent after sign', latestRes);
        const latest = latestRes?.consent || latestRes;
        const updated: ConsentForm = {
          id: latest.id,
          title: latest.templateId ? `${(templates.find(t => t.id === latest.templateId)?.title) || 'Consent'} Consent` : 'Consent Form',
          patient: patientsList.find(p => p.id === latest.patientId)?.name || selectedForm.patient,
          patientId: latest.patientId,
          procedure: latest.procedure || selectedForm.procedure,
          doctor: latest.doctorName || selectedForm.doctor,
          createdDate: latest.createdAt ? new Date(latest.createdAt).toISOString().slice(0, 10) : selectedForm.createdDate,
          status: latest.signedAt ? 'Signed' : 'Unsigned',
          signedDate: latest.signedAt ? new Date(latest.signedAt).toISOString().slice(0, 10) : selectedForm.signedDate,
          formData: latest.formData || selectedForm.formData,
        };
        setForms(forms.map(f => f.id === updated.id ? updated : f));
        setSelectedForm(updated);
      } catch (e) {
        // fallback to optimistic update
        const updatedStatus: 'Signed' = 'Signed';
        const updated: ConsentForm = { ...selectedForm, status: updatedStatus, signedDate: new Date().toISOString().slice(0, 10) };
        setForms(forms.map(f => f.id === selectedForm.id ? updated : f));
        setSelectedForm(updated);
      }
    } catch (err: any) {
      console.error('Failed signing consent', err);
    }
  };

  const escapeHtml = (unsafe: string) => {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const downloadPDF = () => {
    if (!selectedForm) return;

    // Use an HTML string template directly. html2pdf renders via off-screen iframe.
    const htmlString = `
      <div style="background-color: white; padding: 30px 40px; color: black; font-family: 'Times New Roman', serif; max-width: 170mm; margin: 0 auto; box-sizing: border-box;">

        <!-- CLINIC LOGO CENTERED -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #9ca3af; font-size: 36px; font-style: italic; font-weight: 300; margin: 0; font-family: 'Arial', sans-serif; display: block; width: 100%;">
            <span style="font-size: 40px;">D</span>ental <span style="font-size: 40px;">S</span>uite
          </h1>
          <p style="color: #9ca3af; font-size: 13px; letter-spacing: 2px; margin: 4px 0 0 0; font-family: 'Arial', sans-serif;">Odontolog&iacute;a Especializada</p>
        </div>

        <!-- TITLE CENTERED -->
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="margin: 4px 0; font-weight: bold; font-size: 15px; letter-spacing: 1px;">CONSENTIMIENTO INFORMADO</p>
          <p style="margin: 4px 0; font-weight: bold; font-size: 14px;">${selectedForm.procedure.toUpperCase()}</p>
        </div>

        <!-- CONSENT CONTENT -->
        <div style="text-align: justify; font-size: 12.5px; line-height: 1.7; word-break: break-word; overflow-wrap: break-word;">
          ${(selectedForm.formData || '').replace(/<p/g, '<p style="page-break-inside: avoid; margin-bottom: 8px;"')}
        </div>

        <!-- SIGNATURE -->
        ${signatureUrl ? `
        <div style="margin-top: 40px; page-break-inside: avoid;">
          <p style="margin-bottom: 6px; font-weight: bold; font-size: 12.5px;">Firma del Paciente:</p>
          <img src="${signatureUrl}" style="max-height: 70px; max-width: 220px; display: block; border: 1px solid #ccc;" crossorigin="anonymous" />
          <p style="margin-top: 6px; font-size: 11px; color: #555;">Firmado electr&oacute;nicamente el ${selectedForm.signedDate || ''}</p>
        </div>` : ''}

      </div>
    `;

    const opt = {
      margin:       [15, 15, 15, 15] as [number, number, number, number],
      filename:     `Consentimiento_${selectedForm.patient.replace(/\s+/g, '_')}_${selectedForm.procedure.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        ignoreElements: (node: HTMLElement) => {
          return node.nodeName === 'STYLE' || node.nodeName === 'LINK';
        }
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(htmlString).save().catch((err: any) => console.error("PDF generation failed:", err));
  };

  const renderTemplate = (tpl: string) => {
    if (!tpl) return '';
    const d = new Date().toLocaleDateString();
    const patientObj = patientsList.find(p => String(p.id) === String(newFormData.patientId));
    console.debug('Consent preview patientObj', patientObj);
    const doctorNameRaw = (doctorsList.find(d => String(d.id) === String(newFormData.doctorId))?.name) || '________________';

    // Escape user-provided values
    const patientName = escapeHtml((patientObj?.name) || '________________');
    const patientNationalId = escapeHtml((patientObj?.nationalId) || '______');
    const patientAddress = escapeHtml((patientObj?.address) || '________________');
    const doctorName = escapeHtml(doctorNameRaw);

    // Replace placeholders
    let html = tpl
      .replace(/{{patientName}}/g, patientName)
      .replace(/{{patientNationalId}}/g, patientNationalId)
      .replace(/{{patientAddress}}/g, patientAddress)
      .replace(/{{doctorName}}/g, doctorName)
      .replace(/{{date}}/g, escapeHtml(d));

    // Apply bolding for requested phrases (these are part of the template, safe to inject tags)
    const boldPhrases = [
      'DERECHOS DEL PACIENTE',
      'Ley 42-01 (Ley General de Salud)',
      'Operatoria dental',
      'Asumo la responsabilidad de pagar y cubrir con los gastos de honorarios médicos, materiales y trabajos de laboratorios que conlleve el desarrollo de mi tratamiento, el mismo se me entregará a través de un presupuesto inicial (presuntivo) al momento del inicio de este y deberá ser cubierto al momento de finalizar dichos trabajos.'
    ];
    boldPhrases.forEach(p => {
      // replace plain phrase with <strong> phrase </strong>
      const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      html = html.replace(re, `<strong>${p}</strong>`);
    });

    // Convert newlines to <br/>
    html = html.replace(/\n/g, '<br/>');

    return html;
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setFetchError(null);
        const patsRes: any = await getPatients();
        const usersRes: any = await getUsers();
        console.debug('getPatients response', patsRes);
        console.debug('getUsers response', usersRes);
        const pats = (patsRes?.patients || patsRes || []).map((p: any) => ({ id: p.id, name: p.name, nationalId: p.nationalId || '', address: p.address || '' }));
        const allUsers = (usersRes?.users || usersRes || []);
        const docsPreferred = allUsers.filter((u: any) => u.role === 'doctor' || u.role === 'dentist' || u.role === 'odontologo');
        const docsSource = docsPreferred.length ? docsPreferred : allUsers;
        const docs = docsSource.map((u: any) => ({ id: u.id, name: u.name, role: u.role }));
        if (mounted) {
          setPatientsList(pats);
          setDoctorsList(docs);
          // load consents after patients/doctors are available
          try {
            const consRes: any = await getConsents();
            const cons = (consRes?.consents || consRes || []).map((c: any) => ({
              id: c.id,
              title: c.templateId ? `${(templates.find(t => t.id === c.templateId)?.title) || 'Consent'} Consent` : 'Consent Form',
              patient: pats.find((pp: any) => pp.id === c.patientId)?.name || '',
              patientId: c.patientId,
              procedure: c.procedure || '',
              doctor: c.doctorName || '',
              createdDate: c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '',
              status: c.signedAt ? 'Signed' : 'Unsigned',
              signedDate: c.signedAt ? new Date(c.signedAt).toISOString().slice(0, 10) : undefined,
              formData: c.formData,
            }));
            setForms(cons);
          } catch (e) {
            console.error('Failed loading consents', e);
          }
        }
      } catch (err: any) {
        console.error('Failed loading patients or users', err);
        if (mounted) setFetchError(err?.message || 'Failed loading patients or doctors');
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // When a consent is selected, fetch its server-side details (to get documentId) and load signature
  useEffect(() => {
    let mounted = true;
    const fetchDetails = async () => {
      if (!selectedForm || !selectedForm.id) {
        setSignatureUrl(null);
        return;
      }
      try {
        const res: any = await getConsent(selectedForm.id);
        const consent = res?.consent || res;
        if (!mounted) return;
        if (consent.documentId) {
          try {
            const dres: any = await getDocument(consent.documentId);
            const doc = dres?.document || dres;
            if (doc?.key) {
              const apiHost = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
              const prefix = apiHost.replace(/\/$/, '');
              // No spaces in the URL — trim the key just in case
              setSignatureUrl(`${prefix}/uploads/${doc.key.trim()}`);
            }
          } catch (e) {
            console.error('Failed to load signature document', e);
            setSignatureUrl(null);
          }
        } else {
          setSignatureUrl(null);
        }
        // merge server fields into selectedForm for display
        setSelectedForm(prev => prev ? { ...prev, signedDate: consent.signedAt ? new Date(consent.signedAt).toISOString().slice(0, 10) : prev.signedDate, status: consent.signedAt ? 'Signed' : prev.status } : prev);
      } catch (err) {
        console.error('Failed to load consent details', err);
        setSignatureUrl(null);
      }
    };
    fetchDetails();
    return () => { mounted = false; };
  }, [selectedForm?.id]);

  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('consentForms.title')}</h1>
          <p className="text-gray-600 mt-1">{t('consentForms.subtitle')}</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <FilePlus className="w-4 h-4 mr-2" />
          {t('consentForms.createButton')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('consentForms.summaryCards.signed')}</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{signedCount}</div>
            <p className="text-xs text-gray-500 mt-1">{t('consentForms.summaryCards.completed')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('consentForms.summaryCards.unsigned')}</CardTitle>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unsignedCount}</div>
            <p className="text-xs text-gray-500 mt-1">{t('consentForms.summaryCards.awaitingSignature')}</p>
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
                  {selectedForm.formData ? (
                    <div className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: String(selectedForm.formData) }} />
                  ) : null}
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
                      <div className="flex flex-col items-end gap-3">
                        {signatureUrl ? (
                          <img src={signatureUrl} alt="Signature" className="max-w-xs h-24 object-contain border bg-white" />
                        ) : (
                          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                        )}
                        <Button variant="default" size="sm" onClick={downloadPDF} className="flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Descargar PDF
                        </Button>
                      </div>
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
                    value={String(newFormData.patientId)}
                    onValueChange={(value) => setNewFormData({ ...newFormData, patientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsList.length ? (
                        patientsList.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="">No patients found</SelectItem>
                      )}
                      {fetchError && <div className="px-3 py-2 text-xs text-red-600">{fetchError}</div>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Doctor</Label>
                  <Select
                    value={String(newFormData.doctorId)}
                    onValueChange={(value) => setNewFormData({ ...newFormData, doctorId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctorsList.length ? (
                        doctorsList.map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}{d.role ? ` — ${d.role} ` : ''}</SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="">No doctors found</SelectItem>
                      )}
                      {fetchError && <div className="px-3 py-2 text-xs text-red-600">{fetchError}</div>}
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
                  <Label>Form Type / Template</Label>
                  <Select
                    value={newFormData.templateId || newFormData.formType}
                    onValueChange={(value) => {
                      // if selecting a template id, set templateId; otherwise set formType
                      const isTpl = templates.some(t => t.id === value);
                      setNewFormData({ ...newFormData, templateId: isTpl ? value : '', formType: isTpl ? '' : value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form type" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(tpl => (
                        <SelectItem key={tpl.id} value={tpl.id}>{tpl.title}</SelectItem>
                      ))}
                      {formTypes.map(formType => (
                        <SelectItem key={formType} value={formType}>{formType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* Template Preview */}
            {newFormData.templateId && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Preview</h4>
                <div className="prose max-h-64 overflow-y-auto text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: renderTemplate(templates.find(t => t.id === newFormData.templateId)?.content || '') }} />
              </div>
            )}
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
