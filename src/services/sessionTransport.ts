export const SESSION_TOKEN_KEY='abga_auth_token',CSRF_KEY='abga_session_csrf';
export function storedSessionToken(){try{return localStorage.getItem(SESSION_TOKEN_KEY);}catch{return null;}}
export function sessionTransport(){const token=storedSessionToken(),cookie=token?.startsWith('cookie-session:')===true;let csrf='';try{csrf=localStorage.getItem(CSRF_KEY)||'';}catch{}return{identity:token,headers:cookie?(csrf?{'X-CSRF-Token':csrf}:{}):token?{Authorization:'Bearer '+token}:{},credentials:(cookie?'same-origin':'omit') as RequestCredentials};}
