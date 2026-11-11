import React,{useState} from 'react';
export const AgencyLocationEditor:React.FC<{location:any;disabled:boolean;onSave:(body:unknown)=>void}>=({location,disabled,onSave})=>{
 const [editing,setEditing]=useState(false),[name,setName]=useState(location.name),[address,setAddress]=useState(location.address||''),[city,setCity]=useState(location.city||''),[latitude,setLatitude]=useState(location.latitude===null?'':String(location.latitude)),[longitude,setLongitude]=useState(location.longitude===null?'':String(location.longitude)),[error,setError]=useState('');
 if(!editing)return <button disabled={disabled} onClick={()=>setEditing(true)}>Edit location {location.name}</button>;
 return <form aria-label={`Edit location ${location.name}`} onSubmit={e=>{e.preventDefault();const lat=latitude.trim()===''?null:Number(latitude),lng=longitude.trim()===''?null:Number(longitude);if((lat===null)!==(lng===null)||lat!==null&&(!Number.isFinite(lat)||lat< -90||lat>90)||lng!==null&&(!Number.isFinite(lng)||lng< -180||lng>180)){setError('Provide both valid coordinates or leave both empty.');return;}setError('');onSave({expectedVersion:location.version,name,address:address.trim()||null,city:city.trim()||null,latitude:lat,longitude:lng});}}>
  <label>Name<input aria-label="Edit location name" required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
  <label>Address<input aria-label="Edit location address" maxLength={500} value={address} onChange={e=>setAddress(e.target.value)}/></label>
  <label>City<input aria-label="Edit location city" maxLength={160} value={city} onChange={e=>setCity(e.target.value)}/></label>
  <label>Latitude<input aria-label="Edit location latitude" type="number" step="any" min="-90" max="90" value={latitude} onChange={e=>setLatitude(e.target.value)}/></label>
  <label>Longitude<input aria-label="Edit location longitude" type="number" step="any" min="-180" max="180" value={longitude} onChange={e=>setLongitude(e.target.value)}/></label>
  {error&&<p role="alert">{error}</p>}<button disabled={disabled}>Save location changes</button><button type="button" disabled={disabled} onClick={()=>setEditing(false)}>Cancel location edit</button>
 </form>;
}
