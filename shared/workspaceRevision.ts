export function validWorkspaceRevision(value:unknown):value is string{
 return typeof value==='string'&&/^(0|[1-9]\d{0,19})$/.test(value)&&BigInt(value)<=18446744073709551615n;
}
export class WorkspaceConflict extends Error{
 readonly status=409;
 constructor(){super('Workspace changed. Reload before saving; no changes were written.');}
}
