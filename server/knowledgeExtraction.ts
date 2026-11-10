import JSZip from 'jszip';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {SOURCE_MAX_BYTES,KNOWLEDGE_TEXT_MAX_BYTES,type KnowledgeChunk,type SourceState} from '../shared/knowledge';
const exec=promisify(execFile);let active=0;
export function parserEnvironment(source=process.env,directory=tmpdir()):NodeJS.ProcessEnv{
 const allowed=['PATH','HTTP_PROXY','HTTPS_PROXY','NO_PROXY','http_proxy','https_proxy','no_proxy','SSL_CERT_FILE','SSL_CERT_DIR'];
 return {...Object.fromEntries(allowed.filter(key=>source[key]!==undefined).map(key=>[key,source[key]])),LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TMPDIR:directory};
}
export type ExtractedSource={state:SourceState;code:string;text:string|null;chunks:KnowledgeChunk[]};
const result=(state:SourceState,code:string):ExtractedSource=>({state,code,text:null,chunks:[]});
function chunks(pages:string[],ocr=false):ExtractedSource{
 const normalized=pages.map(text=>text.replace(/\r\n?/g,'\n').replace(/\0/g,''));const text=normalized.join('\n\f\n').trim();
 if(Buffer.byteLength(text)>KNOWLEDGE_TEXT_MAX_BYTES)return result('FAILED','TEXT_LIMIT');
 if(!text)return result(ocr?'NEEDS_OCR':'FAILED',ocr?'NO_TEXT_EXTRACTED':'EMPTY_TEXT');
 const values:KnowledgeChunk[]=[];normalized.forEach((page,index)=>{
  for(let start=0;start<page.length;){
   let end=Math.min(page.length,start+1200);
   if(end<page.length){
    // Prefer a nearby word boundary; preserve exact normalized-page offsets.
    const boundary=page.slice(start+1100,end).search(/\s+\S*$/u);
    if(boundary>=0)end=start+1100+boundary+1;
    if(/[\uDC00-\uDFFF]/.test(page[end]))end--;
   }
   const excerpt=page.slice(start,end);if(excerpt.trim())values.push({index:values.length,page:pages.length>1?index+1:null,start,end,text:excerpt});start=end;
  }
 });
 if(values.length>500)return result('FAILED','CHUNK_LIMIT');return {state:'EXTRACTED',code:'TEXT_EXTRACTED',text,chunks:values};
}
function xmlText(value:string){
 if(/<!DOCTYPE|<!ENTITY/i.test(value))throw new Error('XML_DECLARATION_UNSUPPORTED');
 const decode=(text:string)=>text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity:string)=>{if(entity[0]==='#'){const hex=entity[1]?.toLowerCase()==='x',code=parseInt(entity.slice(hex?2:1),hex?16:10);return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'';}return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as any)[entity.toLowerCase()];});
 return [...value.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map(paragraph=>[...paragraph[1].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(match=>decode(match[1])).join('')).join('\n');
}
async function boundedZipText(zip:JSZip){
 const entry=zip.file('word/document.xml');if(!entry)throw new Error('DOCX_BODY_MISSING');
 return new Promise<string>((resolve,reject)=>{const stream=entry.nodeStream('nodebuffer') as import('node:stream').Readable,parts:Buffer[]=[];let size=0;stream.on('data',(part:Buffer)=>{size+=part.length;if(size>KNOWLEDGE_TEXT_MAX_BYTES){stream.destroy(new Error('DOCX_TEXT_LIMIT'));return;}parts.push(part);});stream.on('error',reject);stream.on('end',()=>{try{resolve(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));}catch(error){reject(error);}});});
}
/** Local parsers only. Document text is never executed or fetched as a URL. */
export async function extractKnowledge(filename:string,bytes:Buffer):Promise<ExtractedSource>{
 if(bytes.length<1||bytes.length>SOURCE_MAX_BYTES)return result('FAILED','FILE_SIZE_LIMIT');
 if(active>=2)return result('FAILED','EXTRACTION_CAPACITY');active++;
 try{
  const extension=path.extname(filename).toLowerCase();
  if(['.txt','.md'].includes(extension)){if(bytes.subarray(0,5).toString()==='%PDF-'||bytes.subarray(0,4).equals(Buffer.from([80,75,3,4])))return result('UNSUPPORTED','FILE_SIGNATURE_MISMATCH');try{return chunks([new TextDecoder('utf-8',{fatal:true}).decode(bytes)]);}catch{return result('UNSUPPORTED','UTF8_REQUIRED');}}
  if(extension==='.docx'){
   if(bytes.readUInt16LE(0)!==0x4b50)return result('FAILED','DOCX_SIGNATURE_INVALID');
   const zip=await JSZip.loadAsync(bytes);if(Object.keys(zip.files).length>256)return result('FAILED','DOCX_ENTRY_LIMIT');
   const extracted=chunks([xmlText(await boundedZipText(zip))]);if(extracted.state==='EXTRACTED')extracted.code='DOCX_BODY_TEXT_ONLY';return extracted;
  }
  if(extension!=='.pdf')return result('UNSUPPORTED','FILE_TYPE_UNSUPPORTED');
  if(bytes.subarray(0,5).toString()!=='%PDF-')return result('FAILED','PDF_SIGNATURE_INVALID');
  const directory=await mkdtemp(path.join(tmpdir(),'abgm-knowledge-'));
  try{
   const input=path.join(directory,'source.pdf');await writeFile(input,bytes,{mode:0o600,flag:'wx'});
   const env=parserEnvironment(process.env,directory);const info=await exec('pdfinfo',[input],{timeout:2500,maxBuffer:32768,env});const count=Number(/^Pages:\s+(\d+)/m.exec(info.stdout)?.[1]);
   if(!count||count>40)return result('FAILED','PDF_PAGE_LIMIT');
   const output=await exec('pdftotext',['-layout','-enc','UTF-8',input,'-'],{timeout:5000,maxBuffer:KNOWLEDGE_TEXT_MAX_BYTES,env});
   const pages=output.stdout.split('\f');if(!pages.at(-1)?.trim())pages.pop();const extracted=chunks(pages,true);if(extracted.state==='EXTRACTED')extracted.chunks.forEach(chunk=>{if(count===1)chunk.page=1;});return extracted;
  }catch(error:any){return result(error?.code==='ENOENT'?'UNSUPPORTED':'FAILED',error?.code==='ENOENT'?'PDF_PARSER_UNAVAILABLE':'PDF_UNREADABLE');}
  finally{await rm(directory,{recursive:true,force:true});}
 }catch{return result('FAILED','SOURCE_UNREADABLE');}finally{active--;}
}
