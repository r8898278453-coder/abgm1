import { z } from 'zod';
import { crmHash,crmRevision } from './crmIdentity';

export const appointmentOutcomeState=z.enum(['HELD','NO_SHOW','UNDETERMINED']);
export const appointmentOutcomeCommand=z.object({
  requestKey:crmHash,bookingVersion:crmRevision,expectedVersion:crmRevision,
  outcome:appointmentOutcomeState,evidence:z.string().trim().min(5).max(500),
}).strict();

export const APPOINTMENT_OUTCOME_LABELS={
  HELD:'Held',NO_SHOW:'No-show',UNDETERMINED:'Undetermined',
} as const;
