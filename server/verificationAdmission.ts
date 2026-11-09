/** Bounded process-local admission, not a durable/distributed provider quota. */
export class VerificationAdmission {
  private readonly entries=new Map<string,{active:boolean;attempts:number[]}>();
  constructor(private readonly clock=Date.now,private readonly capacity=1000,private readonly perMinute=6){}
  acquire(company:string):{release:()=>void}|{retryAfterSeconds:number}{
    const now=this.clock();
    for(const [key,entry] of this.entries){
      entry.attempts=entry.attempts.filter(at=>at>now-60000);
      if(!entry.active && entry.attempts.length===0)this.entries.delete(key);
    }
    let entry=this.entries.get(company);
    if(entry?.active)return {retryAfterSeconds:1};
    if(entry && entry.attempts.length>=this.perMinute)return {retryAfterSeconds:Math.max(1,Math.ceil((entry.attempts[0]+60000-now)/1000))};
    if(!entry){
      if(this.entries.size>=this.capacity)return {retryAfterSeconds:60};
      entry={active:false,attempts:[]};this.entries.set(company,entry);
    }
    entry.active=true;entry.attempts.push(now);
    let released=false;
    return {release:()=>{if(!released){released=true;entry!.active=false;}}};
  }
}
