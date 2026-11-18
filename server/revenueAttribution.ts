import type {Pool} from 'mysql2/promise';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {LEGACY_ATTRIBUTION_NOTICE,type SourceRevenueMetrics,type RevenueAttributionSummary} from '../shared/revenueAttributionView';
export type {SourceRevenueMetrics,RevenueAttributionSummary} from '../shared/revenueAttributionView';
import type {DbLead,DbInvoice} from './db';
import {ATTRIBUTION_SOURCES,declaredAttributionSource,type AttributionSource} from '../shared/attributionSources';
export const SUPPORTED_SOURCES=ATTRIBUTION_SOURCES;
export type SupportedSource=AttributionSource;
export type CrmLifecycleStage='new'|'contacted'|'qualified'|'opportunity'|'quotation'|'proposal'|'won'|'lost';
export type AttributionLead=Pick<DbLead,'id'|'company_id'|'stage'|'source'>;
export interface RevenueAttributionOptions{companyId:string;leads:AttributionLead[];invoices:DbInvoice[];costBySource?:Partial<Record<SupportedSource,number|null>>;totalCost?:number|null}
export const normalizeSource=declaredAttributionSource;
/** An invoice label, payment ID or saved Paid status is not provider verification.
 * No customer-payment evidence adapter currently backs this legacy view. Billing stays separate. */
export function isProviderVerifiedPayment(_invoice:DbInvoice):boolean{return false;}
export function isLeadQualified(stage:string){return['qualified','opportunity','quotation','quote','deal','proposal','won'].includes((stage||'').toLowerCase());}
export function isLeadOpportunity(stage:string){return['opportunity','quotation','quote','deal','proposal','won'].includes((stage||'').toLowerCase());}
export function isLeadQuoteOrDeal(stage:string){return['quotation','quote','deal','proposal','won'].includes((stage||'').toLowerCase());}
export function calculateRevenueAttribution(options:RevenueAttributionOptions):RevenueAttributionSummary{
 const {companyId,leads=[],invoices=[]}=options;if(typeof companyId!=='string'||!companyId||companyId.length>64)throw new Error('ATTRIBUTION_SCOPE_INVALID');
 const sourcesList:SourceRevenueMetrics[]=SUPPORTED_SOURCES.map(source=>({source,leads:0,qualifiedLeads:0,opportunities:0,quotesDeals:0,won:0,lost:0,customers:0,conversionRate:0,revenue:0,spend:null,roi:'UNAVAILABLE',status:'UNAVAILABLE'}));
 const revenueBySource=Object.fromEntries(sourcesList.map(v=>[v.source,v])) as Record<SupportedSource,SourceRevenueMetrics>;let totalLeads=0,qualifiedLeads=0,opportunities=0,quotesDeals=0,wonLeads=0,lostLeads=0,unverifiedInvoicesCount=0;const seen=new Set<string>(),seenInvoices=new Set<string>();
 for(const lead of leads){if(lead?.company_id!==companyId||typeof lead.id!=='string'||!lead.id||seen.has(lead.id))continue;seen.add(lead.id);const bucket=revenueBySource[normalizeSource(lead.source)],stage=typeof lead.stage==='string'?lead.stage.toLowerCase():'';bucket.leads++;totalLeads++;if(isLeadQualified(stage)){qualifiedLeads++;bucket.qualifiedLeads++;}if(isLeadOpportunity(stage)){opportunities++;bucket.opportunities++;}if(isLeadQuoteOrDeal(stage)){quotesDeals++;bucket.quotesDeals++;}if(stage==='won'){wonLeads++;bucket.won++;}if(stage==='lost'){lostLeads++;bucket.lost++;}bucket.status='CALCULATED';}
 // Subscription/platform invoices must never be turned into client sales revenue.
 for(const invoice of invoices){if(invoice?.company_id!==companyId||typeof invoice.id!=='string'||!invoice.id||seenInvoices.has(invoice.id))continue;seenInvoices.add(invoice.id);unverifiedInvoicesCount++;}
 return{companyId,totalLeads,qualifiedLeads,opportunities,quotesDeals,wonLeads,lostLeads,customers:0,conversionRate:0,totalRevenue:0,unverifiedRevenueIgnored:0,totalSpend:null,overallRoi:'UNAVAILABLE',revenueBySource,sourcesList,verifiedInvoicesCount:0,unverifiedInvoicesCount,attributionStatus:totalLeads?'CALCULATED':'UNAVAILABLE',timestamp:new Date().toISOString(),revenueEvidence:'UNAVAILABLE',costEvidence:'UNAVAILABLE',definition:LEGACY_ATTRIBUTION_NOTICE};
}

export async function readAttributionLeads(pool:Pool,company:string):Promise<AttributionLead[]>{if(typeof company!=='string'||!company||company.length>64)throw new Error('ATTRIBUTION_SCOPE_INVALID');return withReadOnlySqlDeadline(pool,async sql=>{const [rows]:any=await sql.query('SELECT id,company_id,stage,source FROM leads WHERE company_id=? ORDER BY id LIMIT 1001',[company]);if(rows.length>1000)throw new Error('ATTRIBUTION_CAPACITY');return rows;});}
