/** JSON wire semantics with stable object-key order; array order remains meaningful. */
export function canonicalJson(input:unknown):string{
 const wire=JSON.stringify(input);if(wire===undefined)throw new Error('JSON input required');
 const sort=(value:any):any=>Array.isArray(value)?value.map(sort):value!==null&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value;
 return JSON.stringify(sort(JSON.parse(wire)));
}
