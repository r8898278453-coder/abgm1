import QRCode from 'qrcode';
export async function createReviewQr(url:string){
 const options={errorCorrectionLevel:'M' as const,margin:4,width:512,color:{dark:'#000000',light:'#ffffff'}};
 const [image,svg]=await Promise.all([QRCode.toDataURL(url,options),QRCode.toString(url,{...options,type:'svg'})]);
 return {image,svg};
}
export function printReviewCard(image:string,name:string){
 const frame=document.createElement('iframe');frame.title='Print review collection card';frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px';document.body.appendChild(frame);
 const doc=frame.contentDocument;if(!doc){frame.remove();throw new Error('Print unavailable');}
 const heading=doc.createElement('h1');heading.textContent=name;const message=doc.createElement('p');message.textContent='Share your honest experience on Google';
 const qr=doc.createElement('img');qr.alt='Google review QR';qr.width=400;qr.height=400;
 qr.onload=()=>{frame.contentWindow?.focus();frame.contentWindow?.print();};qr.onerror=()=>frame.remove();doc.body.append(heading,message,qr);qr.src=image;
 setTimeout(()=>frame.remove(),60000);
}
