import {parse} from 'parse5';
import crypto from 'node:crypto';
import type {WebsitePage} from './websiteImportFetch';
import {WebsiteImportError,websiteImportUrl} from './websiteImportPolicy';
const ignored=new Set(['script','style','template','noscript','svg','canvas','iframe','object','embed','nav','footer','form']);
const blocks=new Set(['p','div','section','article','main','h1','h2','h3','h4','li','br','tr','dt','dd']);
/** Static text only. HTML is parsed as data; no scripts, resources or browser are executed. */
export function extractWebsitePage(page:WebsitePage){
 if(!/^text\/(?:html|plain)(?:;|$)/i.test(page.contentType))throw new WebsiteImportError('WEBSITE_RESPONSE_UNSUPPORTED');
 if(page.bytes.length>256*1024)throw new WebsiteImportError('WEBSITE_BYTE_LIMIT');
 const declared=/charset\s*=\s*["']?([^\s;"'>]+)/i.exec(page.contentType)?.[1];
 if(declared&&!/^(utf-8|utf8|us-ascii)$/i.test(declared))throw new WebsiteImportError('WEBSITE_ENCODING_UNSUPPORTED');
 let html:string;try{html=new TextDecoder('utf-8',{fatal:true}).decode(page.bytes);}catch{throw new WebsiteImportError('WEBSITE_ENCODING_UNSUPPORTED');}
 const origin=websiteImportUrl(page.url).origin,links=new Set<string>();let title='',nodes=0,size=0;const text:string[]=[];
 const append=(value:string)=>{size+=value.length;if(size>128*1024)throw new WebsiteImportError('WEBSITE_TEXT_LIMIT');text.push(value);};
 if(page.contentType.startsWith('text/plain'))append(html);
 else{
  const tree:any=parse(html);const stack:Array<{node:any;depth:number;inTitle:boolean;closing?:boolean}>=[{node:tree,depth:0,inTitle:false}];
  while(stack.length){const {node,depth,inTitle,closing}=stack.pop()!;if(closing){append('\n');continue;}if(++nodes>50000||depth>256)throw new WebsiteImportError('WEBSITE_COMPLEXITY_LIMIT');
   const attrs=Object.fromEntries((node.attrs||[]).map((a:any)=>[a.name,a.value]));
   if(ignored.has(node.tagName)||'hidden'in attrs||attrs['aria-hidden']==='true'||/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attrs.style||''))continue;
   if(node.nodeName==='#text'){if(inTitle)title+=(node.value||'');else append(node.value||'');continue;}
   if(node.tagName==='meta'&&attrs.charset&&!/^(utf-8|utf8|us-ascii)$/i.test(attrs.charset))throw new WebsiteImportError('WEBSITE_ENCODING_UNSUPPORTED');
   if(node.tagName==='a'&&attrs.href&&links.size<64){try{const url=new URL(attrs.href,page.url);websiteImportUrl(url.href,origin);if(/\/(?:about|contact|services?|products?|pricing|faq)(?:[\/.-]|$)/i.test(url.pathname))links.add(url.href);}catch{}}
   if(blocks.has(node.tagName)){append('\n');stack.push({node,depth,inTitle,closing:true});}
   for(let index=(node.childNodes?.length||0)-1;index>=0;index--)stack.push({node:node.childNodes[index],depth:depth+1,inTitle:inTitle||node.tagName==='title'});
  }
 }
 const normalized=text.join('').replace(/[\t\r ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 return{url:page.url,title:title.replace(/\s+/g,' ').trim().slice(0,300),text:normalized,contentSha:crypto.createHash('sha256').update(page.bytes).digest('hex'),textSha:crypto.createHash('sha256').update(normalized).digest('hex'),byteSize:page.bytes.length,links:[...links].sort(),state:normalized?'STATIC_TEXT_EXTRACTED':'EMPTY_OR_RENDERING_REQUIRED'};
}
