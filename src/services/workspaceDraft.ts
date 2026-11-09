/** Only editable profile fields participate in autosave. Reported metrics have their own server owners. */
export function workspaceDraft(state:any){
 const rows=(items:any,keys:string[])=>Array.isArray(items)?items.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]]))):[];
 return {business:state.business,
  keywords:rows(state.keywords,['id','keyword','name']),
  campaigns:rows(state.campaigns,['id','name','type','status','channels','target_audience','start_date','end_date','budget']),
  knowledge_base:{documents:state.knowledgeDocs,faqs:state.knowledgeFaqs},
  engine_settings:{approvalSettings:state.approvalSettings,isHolidayPaused:state.isHolidayPaused},
 };
}
