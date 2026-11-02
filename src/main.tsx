import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register WebMCP tools for in-browser agents (navigator.modelContext)
if (typeof window !== 'undefined') {
  try {
    const modelContext = (navigator as any)?.modelContext || (window as any)?.modelContext;
    if (modelContext && typeof modelContext.registerTool === 'function') {
      modelContext.registerTool({
        name: 'get_business_growth_status',
        description: 'Get current autonomous marketing, local SEO rankings, review status, and lead pipeline for Aaditech BGA.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: { type: 'string', description: 'Optional company ID or slug' }
          }
        },
        execute: async () => {
          try {
            const res = await fetch('/api/db/status');
            return await res.json();
          } catch (err: any) {
            return { success: false, error: String(err?.message || err) };
          }
        }
      });

      modelContext.registerTool({
        name: 'scan_local_seo_ranks',
        description: 'Trigger a 3x3 local geo-grid rank observation across Google Maps Local 3-Pack for a target keyword.',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Target keyword' },
            companyId: { type: 'string', description: 'Target company ID' }
          },
          required: ['keyword', 'companyId']
        },
        execute: async (args: any) => {
          try {
            const res = await fetch(`/api/companies/${encodeURIComponent(args.companyId)}/keywords/scan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keyword: args.keyword })
            });
            return await res.json();
          } catch (err: any) {
            return { success: false, error: String(err?.message || err) };
          }
        }
      });

      modelContext.registerTool({
        name: 'submit_lead_inquiry',
        description: 'Submit a new business growth inquiry or qualified customer lead to Aaditech BGA.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Lead contact name' },
            email: { type: 'string', description: 'Lead contact email' },
            phone: { type: 'string', description: 'Contact phone number' },
            company: { type: 'string', description: 'Business name' }
          },
          required: ['name', 'email']
        },
        execute: async (args: any) => {
          try {
            const res = await fetch('/api/leads/public', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(args)
            });
            return await res.json();
          } catch (err: any) {
            return { success: false, error: String(err?.message || err) };
          }
        }
      });
    }
  } catch (e) {
    console.warn('[WebMCP] In-browser agent registration notice:', e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
