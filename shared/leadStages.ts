export const LEAD_STAGES=['new','contacted','qualified','opportunity','quotation','proposal','won','lost'] as const;
export type LeadStage=typeof LEAD_STAGES[number];
