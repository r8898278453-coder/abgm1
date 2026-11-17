import {StrictMode,Suspense,lazy} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
const App=lazy(()=>import('./App.tsx'));
const ClientReportPage=lazy(()=>import('./components/ClientReportPage.tsx'));
const View=location.pathname.startsWith('/client-report/')?ClientReportPage:App;
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={<p role="status">Loading…</p>}><View/></Suspense></StrictMode>);
