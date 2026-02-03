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

export const deleteConsent = async (id: number) => {
  const { data } = await api.delete(`/api/consents/${id}`);
  return data;
};

// ---------------- DOCUMENTS ----------------
export const uploadDocument = async (file: File, type?: string) => {
  const form = new FormData();
  form.append("file", file);
  if (type) form.append("type", type);

  const { data } = await api.post("/api/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
};

export const getDocuments = async (type?: string) => {
  const { data } = await api.get("/api/documents", {
    params: type ? { type } : {},
  });
  return data;
};

export const deleteDocument = async (id: number) => {
  const { data } = await api.delete(`/api/documents/${id}`);
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
