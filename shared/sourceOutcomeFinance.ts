import type {SourceOutcomeReport} from './sourceOutcomeReport';

export interface DeclaredCostEvidence {
 evidenceId:string;
 revision:string;
 currency:string;
 amountMinor:number;
}

export function validateSourceOutcomeCosts(value:unknown,report:SourceOutcomeReport):DeclaredCostEvidence[] {
 if(!Array.isArray(value)||value.length>1000)throw new Error('SOURCE_OUTCOME_COST_EVIDENCE_INVALID');
 const totals=new Map<string,bigint>();
 let previous='';
 for(const row of value){
  if(!row||Object.keys(row).sort().join(',')!=='amountMinor,currency,evidenceId,revision'||
   typeof row.evidenceId!=='string'||!/^[a-f0-9]{64}$/.test(row.evidenceId)||row.evidenceId<=previous||
   typeof row.revision!=='string'||!/^[1-9]\d{0,19}$/.test(row.revision)||BigInt(row.revision)>18446744073709551615n||
   typeof row.currency!=='string'||!/^[A-Z]{3}$/.test(row.currency)||
   !Number.isSafeInteger(row.amountMinor)||row.amountMinor<=0)throw new Error('SOURCE_OUTCOME_COST_EVIDENCE_INVALID');
  previous=row.evidenceId;
  totals.set(row.currency,(totals.get(row.currency)??0n)+BigInt(row.amountMinor));
 }
 if(totals.size!==Object.keys(report.declaredCostMinor).length||
  [...totals].some(([currency,amount])=>report.declaredCostMinor[currency]!==String(amount)))throw new Error('SOURCE_OUTCOME_COST_RECONCILIATION');
 return value;
}

export function sourceOutcomeCostsCsv(costs:unknown,report:SourceOutcomeReport){
 const evidence=validateSourceOutcomeCosts(costs,report);
 const rows=[['evidence_id','revision','currency','declared_cost_minor','as_of_utc','timezone']];
 for(const row of evidence)rows.push([row.evidenceId,row.revision,row.currency,String(row.amountMinor),new Date(report.checkedAtMs).toISOString(),report.timeZone]);
 return rows.map(row=>row.join(',')).join('\r\n')+'\r\n';
}
