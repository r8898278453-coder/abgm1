export const PUBLICATION_CHANNELS=['google','facebook','instagram','whatsapp','telegram'] as const;
export interface ScopedPublicationControls{version:string;paused:boolean;dailyPostLimit:number|null;quota?:{date:string;reservedPosts:number;remaining:number|null};channels:string[];updatedBy:string|null;updatedAtMs:number|null}
