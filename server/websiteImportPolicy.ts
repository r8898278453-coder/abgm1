import {BlockList,isIP} from 'node:net';
export class WebsiteImportError extends Error{constructor(public code:string){super(code);}}
const blocked4=new BlockList();
for(const [address,prefix]of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked4.addSubnet(address,prefix,'ipv4');
const global6=new BlockList();global6.addSubnet('2000::',3,'ipv6');
const blocked6=new BlockList();for(const [address,prefix]of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]] as const)blocked6.addSubnet(address,prefix,'ipv6');
/** Conservative global unicast, using native subnet matching for compressed/expanded addresses. */
export function publicWebsiteAddress(address:string){
 if(address.includes('%'))return false;
 if(isIP(address)===4)return!blocked4.check(address,'ipv4');
 if(isIP(address)===6)return global6.check(address,'ipv6')&&!blocked6.check(address,'ipv6');
 return false;
}
export function websiteImportUrl(value:string,origin?:string){
 let url:URL;try{url=new URL(value);}catch{throw new WebsiteImportError('WEBSITE_URL_INVALID');}
 if(value.length>2048||url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||url.hash||url.search||url.hostname.endsWith('.')||url.hostname==='localhost'||!url.hostname.includes('.')||isIP(url.hostname.replace(/^\[|\]$/g,'')))throw new WebsiteImportError('WEBSITE_URL_UNSUPPORTED');
 if(origin&&url.origin!==origin)throw new WebsiteImportError('WEBSITE_ORIGIN_CHANGED');
 return url;
}
