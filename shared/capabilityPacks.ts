/** Planning preferences only; these never grant provider permissions or enable execution. */
export const CAPABILITY_PACKS={local_service:['content','crm','local_seo','reviews'],local_appointments:['content','crm','local_seo','reviews','appointments'],b2b:['content','crm','sales'],product:['content','crm','catalog']} as const;
export type CapabilityPack=keyof typeof CAPABILITY_PACKS;
