/** Public form state contains only request/receipt metadata, never contact fields or form-token values. */
export function storefrontInquiryScript(token:string,source:string,endpoint:string){
 const literal=(value:string)=>JSON.stringify(value).replace(/</g,'\\u003c');
 return `(async function(){
 const token=${literal(token)},source=${literal(source)},endpoint=${literal(endpoint)},receiptEndpoint=${literal(endpoint.replace(/\/leads$/,'/leads/receipt'))};
 const form=document.getElementById('leadForm'),btn=document.getElementById('submitBtn'),feedback=document.getElementById('formFeedback'),check=document.getElementById('checkInquiryReceipt'),fresh=document.getElementById('newInquiry');
 let key=null,state=null,sending=false,checking=false,ready=false;
 const lock=value=>{form.querySelectorAll('input,textarea').forEach(input=>{input.disabled=value;});btn.disabled=value;};
 const show=(message,ok=false)=>{feedback.className=ok?'text-emerald-700 block p-3':'text-red-700 block p-3';feedback.textContent=message;};
 const persist=value=>{sessionStorage.setItem(key,JSON.stringify(value));state=value;};
 const received=(leadId,exact=false)=>{persist({v:1,id:state.id,status:'CONFIRMED',leadId});ready=false;lock(true);fresh.hidden=false;check.hidden=true;if(exact)form.reset();show(exact?'Thank you! Your inquiry has been submitted successfully.':'Your previous inquiry was received. Start a new inquiry only if needed.',true);};
 async function lookup(){
  if(!state||checking||sending)return;checking=true;ready=false;lock(true);check.disabled=true;
  try{
   const response=await fetch(receiptEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({publicFormToken:token,requestId:state.id}),signal:AbortSignal.timeout(8000)});
   const data=await response.json();if(!response.ok||data.success!==true||data.requestId!==state.id)throw new Error('unconfirmed');
   if(data.receipt?.status==='RECEIVED'&&typeof data.receipt.leadId==='string'){received(data.receipt.leadId);}
   else if(data.receipt?.status==='NOT_FOUND'&&state.status==='PENDING'){ready=true;lock(false);check.hidden=false;show('No saved receipt observed yet. Submit the same inquiry using this reference, or check again.');}
   else throw new Error('unconfirmed');
  }catch{check.hidden=false;show('Receipt unavailable. Keep these details and check again before retrying.');}
  finally{checking=false;check.disabled=false;}
 }
 check.addEventListener('click',()=>{void lookup();});
 fresh.addEventListener('click',()=>{if(sending||checking)return;try{sessionStorage.removeItem(key);state=null;ready=true;form.reset();lock(false);fresh.hidden=true;check.hidden=true;feedback.textContent='';}catch{ready=false;lock(true);show('Inquiry recovery unavailable in this browser. Contact the business directly.');}});
 form.addEventListener('submit',async function(event){
  event.preventDefault();if(!ready||sending||checking)return;sending=true;ready=false;lock(true);fresh.hidden=true;check.hidden=true;btn.textContent='Submitting...';
  try{
   if(!state)persist({v:1,id:crypto.randomUUID(),status:'PENDING'});
   const payload={publicFormToken:token,requestId:state.id,name:document.getElementById('leadName').value,phone:document.getElementById('leadPhone').value,email:document.getElementById('leadEmail').value,service:document.getElementById('leadService').value,notes:document.getElementById('leadMessage').value,source};
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});const data=await response.json();
   if(response.ok&&data.success===true&&data.requestId===state.id&&data.idempotent===true&&typeof data.lead?.id==='string')received(data.lead.id,true);
   else if([400,401,403,404,413,422,429].includes(response.status)&&data.success===false){ready=true;lock(false);check.hidden=false;show('Inquiry was rejected. Check your details or contact the business.');}
   else{check.hidden=false;show(response.status===409?'This reference belongs to different inquiry details. Check the previous receipt before starting again.':'Submission was not confirmed. Keep these details and check the receipt before retrying.');}
  }catch{check.hidden=false;show('Submission was not confirmed. Keep these details and check the receipt before retrying.');}
  finally{sending=false;btn.textContent='Submit Inquiry';}
 });
 lock(true);
 try{
  if(!token||!crypto.subtle||!crypto.randomUUID)throw new Error('unavailable');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));key='bga_inquiry_v1_'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  const saved=sessionStorage.getItem(key);if(saved){const value=JSON.parse(saved);if(value.v!==1||typeof value.id!=='string'||!(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i).test(value.id)||!['PENDING','CONFIRMED'].includes(value.status))throw new Error('unavailable');state=value;await lookup();}
  else{sessionStorage.setItem(key,JSON.stringify({v:1,probe:true}));sessionStorage.removeItem(key);ready=true;lock(false);}
 }catch{ready=false;lock(true);show('Inquiry recovery unavailable in this browser. Contact the business directly.');}
})();`;
}
