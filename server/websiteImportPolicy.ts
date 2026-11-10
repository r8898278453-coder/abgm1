import {isIP} from 'node:net';
export class WebsiteImportError extends Error{constructor(public code:string){super(code);}}
/** Conservative global-unicast policy; private, mapped and special-purpose ranges refuse. */
export function publicWebsiteAddress(address:string){
 if(isIP(address)===4){const [a,b]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2||b===88)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0);}
 if(isIP(address)===6){const first=parseInt(address.split(':')[0],16);return first>=0x2000&&first<=0x3fff&&first!==0x2001&&first!==0x3fff&&!/^2002:/i.test(address);}
 return false;
}
export function websiteImportUrl(value:string,origin?:string){
 let url:URL;try{url=new URL(value);}catch{throw new WebsiteImportError('WEBSITE_URL_INVALID');}
 if(value.length>2048||url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||url.hash||url.search||url.hostname.endsWith('.')||url.hostname==='localhost'||!url.hostname.includes('.')||isIP(url.hostname.replace(/^\[|\]$/g,'')))throw new WebsiteImportError('WEBSITE_URL_UNSUPPORTED');
 if(origin&&url.origin!==origin)throw new WebsiteImportError('WEBSITE_ORIGIN_CHANGED');
 return url;
}
