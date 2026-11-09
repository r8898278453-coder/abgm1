/** Review destination configuration is not OAuth authorization or ownership verification. */
export function reviewCollectionUrl(profile:{google_review_url?:unknown;googlePlaceId?:unknown}):string|null{
 if(profile.google_review_url){
  if(typeof profile.google_review_url!=='string'||profile.google_review_url.length>2048)return null;
  try{const url=new URL(profile.google_review_url);if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
   const allowed=(url.hostname==='g.page'&&url.pathname.endsWith('/review'))||url.hostname==='maps.app.goo.gl'||(url.hostname==='search.google.com'&&url.pathname==='/local/writereview'&&!!url.searchParams.get('placeid'))||(['google.com','www.google.com'].includes(url.hostname)&&url.pathname.startsWith('/maps'));
   return allowed?url.href:null;
  }catch{return null;}
 }
 return typeof profile.googlePlaceId==='string'&&/^[a-zA-Z0-9_-]{1,256}$/.test(profile.googlePlaceId)?`https://search.google.com/local/writereview?placeid=${encodeURIComponent(profile.googlePlaceId)}`:null;
}
