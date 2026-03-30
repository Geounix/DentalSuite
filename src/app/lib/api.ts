import api from "./axios";

// ---------------- USERS ----------------
export const getUsers = async () => {
  const { data } = await api.get("/api/users");
  return data;
};

export const createUser = async (payload: {
  name: string;
  email: string;
  role?: string;
  password?: string;
}) => {
  const { data } = await api.post("/api/users", payload);
  return data;
};

export const updateUser = async (
  id: number,
  payload: { name?: string; role?: string; password?: string; status?: string },
) => {
  const { data } = await api.put(`/api/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id: number) => {
  const { data } = await api.delete(`/api/users/${id}`);
  return data;
};

// ---------------- SETTINGS ----------------
export const getClinicSettings = async () => {
  const { data } = await api.get('/api/settings');
  return data; // { settings: {...} }
};

export const updateClinicSettings = async (payload: { name?: string; logoUrl?: string }) => {
  const { data } = await api.put('/api/settings', payload);
  return data;
};

export const uploadLogo = async (file: File) => {
  const form = new FormData();
  form.append('logo', file);
  const { data } = await api.post('/api/settings/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const resetPassword = async (id: number) => {
  const { data } = await api.post(`/api/users/${id}/reset-password`);
  return data;
};

// ---------------- PATIENTS ----------------
export const getPatients = async () => {
  const { data } = await api.get("/api/patients");
  return data; // { patients: [...] }
};

export const getPatient = async (id: number) => {
  const { data } = await api.get(`/api/patients/${id}`);
  return data; // { patient: {...} }
};

export const createPatient = async (payload: {
  name: string;
  email: string;
  phone: string;
  nationalId?: string;
  dateOfBirth: string;
  address?: string;
  insurance?: string;
}) => {
  const { data } = await api.post("/api/patients", payload);
  return data; // { patient: {...} }
};

export const updatePatient = async (
  id: number,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    nationalId?: string;
    dateOfBirth?: string;
    address?: string;
    insurance?: string;
  },
) => {
  const { data } = await api.put(`/api/patients/${id}`, payload);
  return data; // { patient: {...} }
};

export const deletePatient = async (id: number) => {
  const { data } = await api.delete(`/api/patients/${id}`);
  return data;
};

// ---------------- PROCEDURES ----------------
export const getProcedures = async () => {
  const { data } = await api.get("/api/procedures");
  return data;
};

// Dental procedures (odontogram)
export const createDentalProcedure = async (payload: {
  patientId: number;
  toothNumber: number;
  condition?: string;
  treatment?: string;
  status?: string;
  doctorId?: number;
  cost?: number;
  date?: string;
  notes?: string;
}) => {
  const { data } = await api.post('/api/procedures', payload);
  return data;
};

export const updateDentalProcedure = async (id: number, payload: any) => {
  const { data } = await api.put(`/api/procedures/${id}`, payload);
  return data;
};

export const deleteDentalProcedure = async (id: number) => {
  const { data } = await api.delete(`/api/procedures/${id}`);
  return data;
};

// ---------------- INSURANCES ----------------
export const getInsurances = async () => {
  const { data } = await api.get("/api/insurances");
  return data;
};

export const getInsurance = async (id: number) => {
  const { data } = await api.get(`/api/insurances/${id}`);
  return data;
};

export const createInsurance = async (payload: {
  name: string;
  code?: string;
  contact?: string;
  notes?: string;
  defaultCoverage?: number;
}) => {
  const { data } = await api.post("/api/insurances", payload);
  return data;
};

export const updateInsurance = async (
  id: number,
  payload: {
    name?: string;
    code?: string;
    contact?: string;
    notes?: string;
    defaultCoverage?: number;
  },
) => {
  const { data } = await api.put(`/api/insurances/${id}`, payload);
  return data;
};

export const deleteInsurance = async (id: number) => {
  const { data } = await api.delete(`/api/insurances/${id}`);
  return data;
};

// ---------------- PLANS ----------------
export const createPlan = async (
  insuranceId: number,
  payload: { planName: string; type?: string },
) => {
  const { data } = await api.post(
    `/api/insurances/${insuranceId}/plans`,
    payload,
  );
  return data;
};

export const updatePlan = async (
  planId: number,
  payload: { planName?: string; type?: string },
) => {
  const { data } = await api.put(`/api/insurances/plans/${planId}`, payload);
  return data;
};

export const deletePlan = async (planId: number) => {
  const { data } = await api.delete(`/api/insurances/plans/${planId}`);
  return data;
};

// ---------------- PROCEDURES (PLAN) ----------------
export const createProcedure = async (
  planId: number,
  payload: { name: string; coverageAmount?: number; copayPercent?: number },
) => {
  const { data } = await api.post(
    `/api/insurances/plans/${planId}/procedures`,
    payload,
  );
  return data;
};

export const updateProcedure = async (
  id: number,
  payload: { name?: string; coverageAmount?: number; copayPercent?: number },
) => {
  const { data } = await api.put(`/api/insurances/procedures/${id}`, payload);
  return data;
};

export const deleteProcedure = async (id: number) => {
  const { data } = await api.delete(`/api/insurances/procedures/${id}`);
  return data;
};

// ---------------- CONSENTS ----------------
export const getConsents = async (patientId?: number) => {
  const { data } = await api.get("/api/consents", {
    params: patientId ? { patientId } : {},
  });
  return data;
};

export const getConsent = async (id: number) => {
  const { data } = await api.get(`/api/consents/${id}`);
  return data; // { consent: {...} }
};

export const createConsent = async (payload: {
  patientId: number;
  templateId?: string;
  formData?: any;
  documentId?: number;
}) => {
  const { data } = await api.post("/api/consents", payload);
  return data;
};

export const signConsent = async (id: number, signerName?: string) => {
  const { data } = await api.post(`/api/consents/${id}/sign`, {
    signerName,
  });
  return data;
};

export const updateConsent = async (id: number, payload: any) => {
  const { data } = await api.put(`/api/consents/${id}`, payload);
  return data; // { consent: {...} }
};

export const deleteConsent = async (id: number) => {
  const { data } = await api.delete(`/api/consents/${id}`);
  return data;
};

// ---------------- DOCUMENTS ----------------
export const uploadDocument = async (file: File, type?: string, patientId?: number) => {
  const form = new FormData();
  form.append("file", file);
  if (type) form.append("type", type);
  if (patientId) form.append("patientId", String(patientId));

  const url = type ? `/api/documents/upload?type=${type}` : "/api/documents/upload";
  const { data } = await api.post(url, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
};

export const getDocuments = async (type?: string, patientId?: number) => {
  const params: any = {};
  if (type) params.type = type;
  if (patientId) params.patientId = patientId;
  const { data } = await api.get("/api/documents", { params });
  return data;
};

export const getDocument = async (id: number) => {
  const { data } = await api.get(`/api/documents/${id}`);
  return data; // { document: {...} }
};

export const deleteDocument = async (id: number) => {
  const { data } = await api.delete(`/api/documents/${id}`);
  return data;
};

// ---------------- CATALOG ----------------
export const getCatalogProcedures = async (params?: { search?: string; limit?: number; offset?: number }) => {
  const { data } = await api.get("/api/catalog", { params });
  return data; // { catalog: [...], total: number }
};

export const createCatalogProcedure = async (payload: { name: string; price: number }) => {
  const { data } = await api.post("/api/catalog", payload);
  return data;
};

export const updateCatalogProcedure = async (id: number, payload: { name?: string; price?: number }) => {
  const { data } = await api.put(`/api/catalog/${id}`, payload);
  return data;
};

export const deleteCatalogProcedure = async (id: number) => {
  const { data } = await api.delete(`/api/catalog/${id}`);
  return data;
};

// ---------------- APPOINTMENTS ----------------
export const getAppointments = async (date?: string) => {
  const { data } = await api.get("/api/appointments", {
    params: date ? { date } : {},
  });
  return data; // { appointments: [...] }
};

export const getAppointment = async (id: number) => {
  const { data } = await api.get(`/api/appointments/${id}`);
  return data;
};

export const createAppointment = async (payload: {
  patientId: number;
  doctorId?: number;
  procedure: string;
  scheduledAt: string;
  duration: number;
  notes?: string;
  status?: string;
}) => {
  const { data } = await api.post("/api/appointments", payload);
  return data;
};

export const updateAppointment = async (
  id: number,
  payload: {
    patientId?: number;
    doctorId?: number;
    procedure?: string;
    scheduledAt?: string;
    duration?: number;
    notes?: string;
    status?: string;
  },
) => {
  const { data } = await api.put(`/api/appointments/${id}`, payload);
  return data;
};

export const deleteAppointment = async (id: number) => {
  const { data } = await api.delete(`/api/appointments/${id}`);
  return data;
};

// ---------------- PAYMENTS ----------------
export const getPayments = async () => {
  const { data } = await api.get('/api/payments');
  return data; // { payments: [...] }
};

export const getPayment = async (id: number) => {
  const { data } = await api.get(`/api/payments/${id}`);
  return data; // { payment: {...} }
};

export const createPayment = async (payload: {
  patientId: number;
  appointmentId?: number | null;
  procedure?: string;
  items?: any[];
  originalAmount: number;
  insuranceCoverage?: number;
  amountPaid?: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}) => {
  const { data } = await api.post('/api/payments', payload);
  return data; // { payment: {...} }
};

export const updatePayment = async (id: number, payload: any) => {
  const { data } = await api.put(`/api/payments/${id}`, payload);
  return data;
};

export const deletePayment = async (id: number) => {
  const { data } = await api.delete(`/api/payments/${id}`);
  return data;
};

export const getPaymentTransactions = async (paymentId: number) => {
  const { data } = await api.get(`/api/payments/${paymentId}/transactions`);
  return data; // { transactions: [...] }
};


export const createPaymentTransaction = async (paymentId: number, payload: { amount: number; method?: string; transactionId?: string; notes?: string }) => {
  const { data } = await api.post(`/api/payments/${paymentId}/transactions`, payload);
  return data; // { transaction: {...}, payment: {...} }
};

// ---------------- MEDICAL HISTORY ----------------
export const getMedicalHistory = async (patientId: number) => {
  const { data } = await api.get(`/api/medical-history/${patientId}`);
  return data; // { medicalHistory: {...} }
};

export const saveMedicalHistory = async (patientId: number, payload: any) => {
  const { data } = await api.put(`/api/medical-history/${patientId}`, payload);
  return data; // { medicalHistory: {...} }
};

// ---------------- GASTOS ----------------
export const getGastos = async (filters?: { from?: string; to?: string; categoria?: string }) => {
  const params = new URLSearchParams();
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.categoria) params.set('categoria', filters.categoria);
  const { data } = await api.get(`/api/gastos?${params.toString()}`);
  return data; // { gastos: [...] }
};

export const getGastosSummary = async (filters?: { from?: string; to?: string }) => {
  const params = new URLSearchParams();
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  const { data } = await api.get(`/api/gastos/summary?${params.toString()}`);
  return data; // { totalGastos, totalItbis, totalDescuento, byMonth, byCategoria }
};

export const createGasto = async (payload: any) => {
  const { data } = await api.post('/api/gastos', payload);
  return data; // { gasto: {...} }
};

export const updateGasto = async (id: number, payload: any) => {
  const { data } = await api.put(`/api/gastos/${id}`, payload);
  return data; // { gasto: {...} }
};

export const deleteGasto = async (id: number) => {
  const { data } = await api.delete(`/api/gastos/${id}`);
  return data;
};

// ---------------- REPORTS (real data) ----------------
export const getReportRevenue = async (filters?: { from?: string; to?: string }) => {
  const params = new URLSearchParams();
  if (filters?.from) params.set('startDate', filters.from);
  if (filters?.to) params.set('endDate', filters.to);
  const { data } = await api.post('/api/reports/run', { type: 'monthlyRevenue', ...(filters?.from ? { startDate: filters.from } : {}), ...(filters?.to ? { endDate: filters.to } : {}) });
  return data;
};

// ---------------- COTIZACIONES ----------------
export const getCotizaciones = async (patientId?: number) => {
  const params = patientId ? `?patientId=${patientId}` : '';
  const { data } = await api.get(`/api/cotizaciones${params}`);
  return data; // { cotizaciones: [...] }
};

export const createCotizacion = async (payload: {
  patientId: number;
  title: string;
  items: { name: string; description?: string; quantity: number; price: number }[];
  discount?: number;
  tax?: number;
  notes?: string;
  validUntil?: string;
}) => {
  const { data } = await api.post('/api/cotizaciones', payload);
  return data; // { cotizacion: {...} }
};

export const updateCotizacion = async (id: number, payload: any) => {
  const { data } = await api.put(`/api/cotizaciones/${id}`, payload);
  return data;
};

export const addCotizacionPayment = async (id: number, amount: number, notes?: string) => {
  const { data } = await api.post(`/api/cotizaciones/${id}/payments`, { amount, notes });
  return data;
};

export const deleteCotizacion = async (id: number) => {
  const { data } = await api.delete(`/api/cotizaciones/${id}`);
  return data;
};
