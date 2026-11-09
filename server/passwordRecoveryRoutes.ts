import crypto from 'node:crypto';
import type {Express,Request,RequestHandler} from 'express';
/** Only configured server origin may receive a recovery token; never trust Host/forwarded headers. */
export function passwordRecoveryUrl(rawToken:string,configured=process.env.APP_URL||'https://bga.aaditechs.in'){
 if(!/^[a-f0-9]{64}$/.test(rawToken))throw new Error('RESET_TOKEN_INVALID');
 const url=new URL(configured);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'&&url.pathname!=='')throw new Error('RESET_ORIGIN_INVALID');
 url.pathname='/reset-password';url.searchParams.set('token',rawToken);return url.href;
}
export function registerPasswordRecoveryRoutes(app:Express,deps:{forgotLimit:RequestHandler;forgotValidate:RequestHandler;resetValidate:RequestHandler;configured:()=>boolean;find:(email:string)=>Promise<any>;create:(user:string,token:string,expires:Date)=>Promise<string>;send:(user:any,url:string)=>Promise<{success:boolean}>;consume:(hash:string,password:string)=>Promise<{userId:string}|null>;afterReset?:(user:string,req:Request)=>void|Promise<void>}){
 app.post('/api/auth/forgot-password',deps.forgotLimit,deps.forgotValidate,async(req,res)=>{
  res.set('Cache-Control','no-store');try{
   // Validate the fixed origin even for an unknown email to avoid topology leaks by identity.
   const raw=crypto.randomBytes(32).toString('hex'),url=passwordRecoveryUrl(raw);
   if(!deps.configured()){res.status(503).json({success:false,error:'Password recovery unavailable'});return;}
   const user=await deps.find(req.body.email);
   if(user){await deps.create(user.id,crypto.createHash('sha256').update(raw).digest('hex'),new Date(Date.now()+30*60*1000));
    // Provider acceptance is not delivery. Identity-specific provider failures do
    // not change this public response or expose provider/customer details.
    try{await deps.send(user,url);}catch{/* best-effort dispatch; reset token remains bounded by expiry */}
   }
   res.json({success:true,message:'If that email is registered, a recovery email was requested. Delivery is not confirmed.'});
  }catch{res.status(503).json({success:false,error:'Password recovery unavailable'});}
 });
 app.post('/api/auth/reset-password',deps.forgotLimit,deps.resetValidate,async(req,res)=>{
  res.set('Cache-Control','no-store');try{
   const result=await deps.consume(crypto.createHash('sha256').update(req.body.token.trim()).digest('hex'),req.body.newPassword);
   if(!result){res.status(400).json({success:false,error:'Invalid, expired, or already used reset link. Request a new link.'});return;}
   // An optional local lockout cleanup must never negate an acknowledged password commit.
   try{await deps.afterReset?.(result.userId,req);}catch{/* no external notification/customer data */}
   res.json({success:true,message:'Password reset confirmed. Sign in again with your new password.'});
  }catch{res.status(503).json({success:false,error:'Password reset unconfirmed. Try signing in or request a new link.'});}
 });
}
