import React,{Suspense,lazy,useSyncExternalStore,type ComponentType} from 'react';
import {featureSessionRevision,subscribeFeatureSession} from '../services/featureSession';
class FeatureFailure extends React.Component<React.PropsWithChildren<{label:string}>,{failed:boolean}>{
 declare props:React.PropsWithChildren<{label:string}>;
 state={failed:false};
 static getDerivedStateFromError(){return{failed:true};}
 render(){if(this.state.failed)return <section role="alert" aria-label={`${this.props.label} unavailable`} className="rounded-xl border p-5 space-y-3"><h2>{this.props.label} unavailable</h2><p>This feature could not load or render. You can navigate to another feature or reload the application.</p><p>A previous action may still have committed. Review its saved history before repeating it.</p><button type="button" onClick={()=>window.location.reload()}>Reload application</button></section>;return this.props.children;}
}
/** One shared read/loading/error/session boundary. No automatic action replay or import retry. */
export function lazyFeature<P extends object>(label:string,load:()=>Promise<{default:ComponentType<P>}>,when?:(props:P)=>boolean){
 const Feature=lazy(load);
 const Boundary=(props:P)=>{const scope=useSyncExternalStore(subscribeFeatureSession,featureSessionRevision,()=>0);if(when&&!when(props))return null;const context=(props as any).companyId??(props as any).activeCompanyId??(props as any).business?.id??'';return <FeatureFailure key={JSON.stringify([scope,context])} label={label}><Suspense fallback={<p role="status" aria-live="polite">Loading {label}…</p>}><Feature {...props}/></Suspense></FeatureFailure>;};
 Boundary.displayName=`Lazy${label.replace(/\s/g,'')}`;return Boundary;
}
