import {validWorkspaceRevision} from './workspaceRevision';
export interface CalendarPhotoPlan{model:1;confirmed:true;allowRepeatedPhoto:boolean;selections:{slot:number;assetId:string;revision:string;hash:string}[]}
export function normalizeCalendarPhotos(value:any,slots:number):CalendarPhotoPlan{
 const keys=(v:any,list:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...list].sort().join(',');
 if(!keys(value,['model','confirmed','allowRepeatedPhoto','selections'])||value.model!==1||value.confirmed!==true||typeof value.allowRepeatedPhoto!=='boolean'||!Array.isArray(value.selections)||!value.selections.length||value.selections.length>12||value.selections.some((s:any)=>!keys(s,['slot','assetId','revision','hash'])||!Number.isInteger(s.slot)||s.slot<0||s.slot>=slots||typeof s.assetId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(s.assetId)||!validWorkspaceRevision(s.revision)||s.revision==='0'||typeof s.hash!=='string'||!/^[a-f0-9]{64}$/.test(s.hash))||new Set(value.selections.map((s:any)=>s.slot)).size!==value.selections.length)throw Error('PLAN_PHOTOS_INVALID');
 if(!value.allowRepeatedPhoto&&new Set(value.selections.map((s:any)=>s.hash)).size!==value.selections.length)throw Error('PLAN_PHOTO_REUSE_REVIEW_REQUIRED');
 return{model:1,confirmed:true,allowRepeatedPhoto:value.allowRepeatedPhoto,selections:[...value.selections].sort((a,b)=>a.slot-b.slot).map(s=>({...s}))};
}
