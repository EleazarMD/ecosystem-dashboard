import { PCGSafetyService, getPCGSafetyService } from './PCGSafetyService';

export * from './PCGSafetyService';

export type PICSafetyService = PCGSafetyService;
export const PICSafetyService = PCGSafetyService;
export const getPICSafetyService = getPCGSafetyService;
