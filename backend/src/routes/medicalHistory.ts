import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth as any);

/** GET /api/medical-history/:patientId  — fetch history for a patient */
router.get('/:patientId', asyncHandler(async (req, res) => {
  const patientId = Number(req.params.patientId);
  const record = await prisma.medicalHistory.findUnique({ where: { patientId } });
  res.json({ medicalHistory: record ?? null });
}));

/** PUT /api/medical-history/:patientId  — upsert history */
router.put('/:patientId', asyncHandler(async (req, res) => {
  const patientId = Number(req.params.patientId);
  const {
    personalAnswers,
    currentMedications,
    dentalAnswers,
    lastDentalVisit,
    allergyNsaids,
    allergyAntibiotics,
    allergyAspirin,
    allergyOther,
    generalNotes,
    medications,
  } = req.body;

  const record = await prisma.medicalHistory.upsert({
    where: { patientId },
    create: {
      patientId,
      personalAnswers,
      currentMedications,
      dentalAnswers,
      lastDentalVisit,
      allergyNsaids,
      allergyAntibiotics,
      allergyAspirin,
      allergyOther,
      generalNotes,
      medications,
    },
    update: {
      personalAnswers,
      currentMedications,
      dentalAnswers,
      lastDentalVisit,
      allergyNsaids,
      allergyAntibiotics,
      allergyAspirin,
      allergyOther,
      generalNotes,
      medications,
    },
  });

  res.json({ medicalHistory: record });
}));

export default router;
