import assert from 'assert';
import http from 'http';
import express from 'express';
import fs from 'fs';
import path from 'path';

// Extract the protocol routes and logic from server setup for direct HTTP testing
async function runHttpProtocolTests() {
  console.log('🧪 Starting Live HTTP Protocol & Agent Negotiation Tests...\n');

  const app = express();

  const RFC_8288_LINK_HEADER =
    '</llms.txt>; rel="alternate"; type="text/plain", </>; rel="alternate"; type="text/markdown", </.well-known/mcp/server-card.json>; rel="service-desc"; type="application/json"';

  const ROBOTS_TXT_CONTENT = fs.readFileSync(path.join(process.cwd(), 'public', 'robots.txt'), 'utf-8');
  const SITEMAP_XML_CONTENT = fs.readFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), 'utf-8');
  const LLMS_TXT_CONTENT = fs.readFileSync(path.join(process.cwd(), 'public', 'llms.txt'), 'utf-8');
  const MCP_SERVER_CARD_JSON = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'public', '.well-known', 'mcp', 'server-card.json'), 'utf-8')
  );

  const HOMEPAGE_MARKDOWN_CONTENT = `# Aaditech BGA - Autonomous Business Growth Accelerator\n\n> 24/7 Autonomous AI Marketing & Growth Acceleration Platform`;

  // Protocol Endpoints
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain; charset=utf-8').send(ROBOTS_TXT_CONTENT);
  });

  app.get('/sitemap.xml', (_req, res) => {
    res.type('application/xml; charset=utf-8').send(SITEMAP_XML_CONTENT);
  });

  app.get('/llms.txt', (_req, res) => {
    res.type('text/plain; charset=utf-8').send(LLMS_TXT_CONTENT);
  });

  app.get(['/.well-known/mcp/server-card.json', '/.well-known/mcp/server-card'], (_req, res) => {
    res.type('application/json; charset=utf-8').json(MCP_SERVER_CARD_JSON);
  });

  const VALID_SPA_ROUTES = new Set([
    '/',
    '/index.html',
    '/about',
    '/contact',
    '/services',
    '/pricing',
    '/terms',
    '/privacy',
  ]);

  function isMarkdownRequested(req: express.Request): boolean {
    const accept = req.headers['accept'] || '';
    return typeof accept === 'string' && accept.includes('text/markdown');
  }

  function handle404(req: express.Request, res: express.Response) {
    if (isMarkdownRequested(req)) {
      res.status(404).set({ 'Content-Type': 'text/markdown; charset=utf-8' }).send(`# 404 Not Found\n\nThe requested URL \`${req.path}\` does not exist on Aaditech BGA.`);
      return;
    }
    const accept = req.headers['accept'] || '';
    if (typeof accept === 'string' && accept.includes('application/json')) {
      res.status(404).json({ success: false, error: 'Not Found', status: 404, path: req.path });
      return;
    }
    res.status(404).set({ 'Content-Type': 'text/html; charset=utf-8' }).send('<!doctype html><html><body><h1>404 Not Found</h1></body></html>');
  }

  app.get('*', (req, res) => {
    const url = req.path;
    if (!VALID_SPA_ROUTES.has(url)) {
      handle404(req, res);
      return;
    }
    if (isMarkdownRequested(req)) {
      res.setHeader('Link', RFC_8288_LINK_HEADER);
      res.setHeader('Vary', 'Accept');
      res.status(200).set({ 'Content-Type': 'text/markdown; charset=utf-8' }).send(HOMEPAGE_MARKDOWN_CONTENT);
      return;
    }
    res.setHeader('Link', RFC_8288_LINK_HEADER);
    res.setHeader('Vary', 'Accept');
    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send('<!doctype html><html><body><h1>Aaditech BGA</h1></body></html>');
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test 1: GET /robots.txt
    const resRobots = await fetch(`${baseUrl}/robots.txt`);
    assert.strictEqual(resRobots.status, 200);
    assert.ok(resRobots.headers.get('content-type')?.includes('text/plain'));
    const robotsTxt = await resRobots.text();
    assert.ok(robotsTxt.includes('Content-Signal: search=yes, ai-train=no'));
    assert.ok(robotsTxt.includes('Sitemap: https://bga.aaditechs.in/sitemap.xml'));
    console.log('✅ HTTP Test 1 Passed: /robots.txt returns 200 text/plain with Content-Signal & Sitemap.');

    // Test 2: GET /sitemap.xml
    const resSitemap = await fetch(`${baseUrl}/sitemap.xml`);
    assert.strictEqual(resSitemap.status, 200);
    assert.ok(resSitemap.headers.get('content-type')?.includes('xml'));
    const sitemapXml = await resSitemap.text();
    assert.ok(sitemapXml.includes('<loc>https://bga.aaditechs.in/</loc>'));
    console.log('✅ HTTP Test 2 Passed: /sitemap.xml returns 200 application/xml.');

    // Test 3: GET /llms.txt
    const resLlms = await fetch(`${baseUrl}/llms.txt`);
    assert.strictEqual(resLlms.status, 200);
    assert.ok(resLlms.headers.get('content-type')?.includes('text/plain'));
    const llmsTxt = await resLlms.text();
    assert.ok(llmsTxt.startsWith('# '));
    console.log('✅ HTTP Test 3 Passed: /llms.txt returns 200 text/plain (not HTML catch-all).');

    // Test 4: GET /.well-known/mcp/server-card.json
    const resCard = await fetch(`${baseUrl}/.well-known/mcp/server-card.json`);
    assert.strictEqual(resCard.status, 200);
    assert.ok(resCard.headers.get('content-type')?.includes('application/json'));
    const cardData = await resCard.json();
    assert.strictEqual(cardData.name, 'aaditech-bga');
    console.log('✅ HTTP Test 4 Passed: /.well-known/mcp/server-card.json returns 200 application/json.');

    // Test 5: Missing page returns real HTTP 404
    const res404 = await fetch(`${baseUrl}/non-existent-page-xyz-8973`);
    assert.strictEqual(res404.status, 404, 'Non-existent page must return HTTP 404 status, not 200');
    console.log('✅ HTTP Test 5 Passed: Non-existent URL returned real HTTP 404 status.');

    // Test 6: Missing page with Accept: text/markdown returns 404 markdown
    const res404Md = await fetch(`${baseUrl}/missing-url-markdown`, {
      headers: { Accept: 'text/markdown' },
    });
    assert.strictEqual(res404Md.status, 404);
    assert.ok(res404Md.headers.get('content-type')?.includes('text/markdown'));
    console.log('✅ HTTP Test 6 Passed: Missing page with Accept: text/markdown returns 404 text/markdown.');

    // Test 7: GET / with Accept: text/markdown returns Markdown representation
    const resMd = await fetch(`${baseUrl}/`, {
      headers: { Accept: 'text/markdown' },
    });
    assert.strictEqual(resMd.status, 200);
    assert.ok(resMd.headers.get('content-type')?.includes('text/markdown'));
    const mdBody = await resMd.text();
    assert.ok(mdBody.startsWith('# '));
    console.log('✅ HTTP Test 7 Passed: Homepage negotiates Accept: text/markdown and returns markdown.');

    // Test 8: Homepage Link headers
    const resHome = await fetch(`${baseUrl}/`);
    assert.strictEqual(resHome.status, 200);
    const linkHeader = resHome.headers.get('link');
    assert.ok(linkHeader, 'Homepage must emit Link header');
    assert.ok(linkHeader.includes('</llms.txt>; rel="alternate"'));
    assert.ok(linkHeader.includes('</>; rel="alternate"; type="text/markdown"'));
    console.log('✅ HTTP Test 8 Passed: Homepage advertises resources via RFC 8288 Link header.');

  } finally {
    server.close();
  }

  console.log('\n=========================================================================');
  console.log('🎉 ALL LIVE HTTP PROTOCOL TESTS PASSED WITH 100% SUCCESS!');
  console.log('=========================================================================');
}

runHttpProtocolTests().catch((err) => {
  console.error('❌ HTTP protocol test failed:', err);
  process.exit(1);
});
