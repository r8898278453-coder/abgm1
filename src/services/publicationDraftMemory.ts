/** Stable account/workspace intent keys; no content stored in browser storage. */
export async function publicationDraftKey(actor:string,company:string,signature:string):Promise<string>{
  if(!actor || !company)throw new Error('Sign in and select a workspace before publishing');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([actor,company,signature])));
  return 'abgm1:meta-draft:'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
