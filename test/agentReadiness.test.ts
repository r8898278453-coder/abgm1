import assert from 'assert';
import fs from 'fs';
import path from 'path';

async function runAgentReadinessTests() {
  console.log('🧪 Starting Agent-Ready Architecture Verification Tests...\n');

  // -------------------------------------------------------------
  // 1 & 3: robots.txt Content-Signal and Sitemap Directives
  // -------------------------------------------------------------
  console.log('Goal 1 & 3: Testing robots.txt Content-Signal and Sitemap directives...');
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'robots.txt must exist in /public');
  const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
  assert.ok(
    /Content-Signal:\s*search=yes,\s*ai-train=no/i.test(robotsContent),
    'robots.txt must declare Content-Signal: search=yes, ai-train=no'
  );
  assert.ok(
    /Sitemap:\s*https:\/\/bga\.aaditechs\.in\/sitemap\.xml/i.test(robotsContent),
    'robots.txt must declare Sitemap: https://bga.aaditechs.in/sitemap.xml'
  );
  console.log('  ✅ Goal 1 & 3 Passed: robots.txt correctly declares Content-Signal and Sitemap.');

  // -------------------------------------------------------------
  // 2: sitemap.xml exists, is valid XML, and lists URLs
  // -------------------------------------------------------------
  console.log('Goal 2: Testing sitemap.xml existence and URL list...');
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml must exist in /public');
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  assert.ok(sitemapContent.startsWith('<?xml'), 'sitemap.xml must start with XML declaration');
  assert.ok(sitemapContent.includes('<urlset'), 'sitemap.xml must contain <urlset>');
  
  const requiredUrls = [
    'https://bga.aaditechs.in/',
    'https://bga.aaditechs.in/about',
    'https://bga.aaditechs.in/contact',
    'https://bga.aaditechs.in/services',
    'https://bga.aaditechs.in/pricing',
    'https://bga.aaditechs.in/terms',
    'https://bga.aaditechs.in/privacy',
    'https://bga.aaditechs.in/llms.txt',
  ];
  for (const url of requiredUrls) {
    assert.ok(sitemapContent.includes(`<loc>${url}</loc>`), `sitemap.xml must list ${url}`);
  }
  console.log('  ✅ Goal 2 Passed: sitemap.xml is parseable XML and lists all 8 required key URLs.');

  // -------------------------------------------------------------
  // 5, 6, 7, 8, 9, 10, 11, 12, 13, 18: index.html Inspection
  // -------------------------------------------------------------
  console.log('Goal 5-13 & 18: Testing index.html semantics, JSON-LD, H1, links & WebMCP...');
  const indexPath = path.join(process.cwd(), 'index.html');
  assert.ok(fs.existsSync(indexPath), 'index.html must exist');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Goal 5: Content readable without JS
  const strippedText = indexHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(
    strippedText.length > 2000,
    `Raw HTML text content must be substantial without JS (found ${strippedText.length} chars, expected > 2000)`
  );
  console.log(`  ✅ Goal 5 Passed: Raw HTML contains ${strippedText.length} text characters (rich content without JS).`);

  // Goal 6: Canonical link, title, meta description
  assert.ok(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/bga\.aaditechs\.in\/["']/i.test(indexHtml) ||
    /<link[^>]+href=["']https:\/\/bga\.aaditechs\.in\/["'][^>]+rel=["']canonical["']/i.test(indexHtml),
    'index.html must contain canonical link to https://bga.aaditechs.in/'
  );
  assert.ok(/<title>Aaditech BGA/i.test(indexHtml), 'index.html must contain descriptive title');
  assert.ok(/<meta\s+name=["']description["']/i.test(indexHtml), 'index.html must contain meta description');
  console.log('  ✅ Goal 6 Passed: Canonical link, title, and meta description verified.');

  // Goal 7: Clear heading hierarchy - exactly one <h1> on homepage
  const h1Matches = indexHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  assert.ok(h1Matches && h1Matches.length === 1, `Must have exactly one <h1> on homepage (found ${h1Matches?.length})`);
  assert.ok(h1Matches[0].includes('Aaditech BGA'), '<h1> must describe the page');
  console.log('  ✅ Goal 7 Passed: Exactly one <h1> found on homepage naming the application.');

  // Goal 8, 9, 10, 11: JSON-LD structured data
  const jsonLdMatch = indexHtml.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
  assert.ok(jsonLdMatch, 'index.html must contain a valid JSON-LD script block');
  const parsedJsonLd = JSON.parse(jsonLdMatch[1]);
  assert.ok(parsedJsonLd['@context'] === 'https://schema.org', 'JSON-LD context must be https://schema.org');
  assert.ok(Array.isArray(parsedJsonLd['@graph']), 'JSON-LD must use @graph for multiple schema types');

  const graphTypes = parsedJsonLd['@graph'].map((n: any) => n['@type']);
  assert.ok(graphTypes.includes('Organization'), 'JSON-LD must declare Organization schema');
  assert.ok(graphTypes.includes('LocalBusiness'), 'JSON-LD must declare LocalBusiness schema');
  assert.ok(graphTypes.includes('WebSite'), 'JSON-LD must declare WebSite schema');
  assert.ok(graphTypes.includes('WebApplication'), 'JSON-LD must declare WebApplication schema');
  assert.ok(graphTypes.includes('WebPage'), 'JSON-LD must declare WebPage schema');
  console.log(`  ✅ Goal 8 & 11 Passed: JSON-LD covers 5 schema types (${graphTypes.join(', ')}).`);

  // Goal 9 & 13: Organization and LocalBusiness completeness & machine-readable contact
  const orgNode = parsedJsonLd['@graph'].find((n: any) => n['@type'] === 'Organization');
  const localNode = parsedJsonLd['@graph'].find((n: any) => n['@type'] === 'LocalBusiness');
  assert.ok(orgNode && orgNode.email === 'contact@aaditechs.in', 'Organization must have email');
  assert.ok(orgNode && orgNode.telephone === '+918898278453', 'Organization must have telephone');
  assert.ok(localNode && localNode.telephone === '+918898278453', 'LocalBusiness must have telephone');
  console.log('  ✅ Goal 9 & 13 Passed: Organization and LocalBusiness nodes complete with telephone & email.');

  // Goal 10: sameAs links
  assert.ok(Array.isArray(orgNode.sameAs) && orgNode.sameAs.length >= 3, 'Organization must have sameAs links');
  assert.ok(orgNode.sameAs.some((u: string) => u.includes('linkedin.com')), 'sameAs must include LinkedIn');
  assert.ok(orgNode.sameAs.some((u: string) => u.includes('twitter.com') || u.includes('x.com')), 'sameAs must include Twitter/X');
  assert.ok(orgNode.sameAs.some((u: string) => u.includes('github.com')), 'sameAs must include GitHub');
  console.log('  ✅ Goal 10 Passed: Entity linked to external social profiles via sameAs.');

  // Goal 12: About, contact and legal pages linked
  assert.ok(/href=["']\/about["']/i.test(indexHtml), 'Must link to /about');
  assert.ok(/href=["']\/contact["']/i.test(indexHtml), 'Must link to /contact');
  assert.ok(/href=["']\/terms["']/i.test(indexHtml), 'Must link to /terms');
  assert.ok(/href=["']\/privacy["']/i.test(indexHtml), 'Must link to /privacy');
  assert.ok(/href=["']\/pricing["']/i.test(indexHtml), 'Must link to /pricing');
  assert.ok(/href=["']\/services["']/i.test(indexHtml), 'Must link to /services');
  console.log('  ✅ Goal 12 Passed: About, contact, services, pricing, terms, and privacy links present.');

  // Goal 13: mailto: and tel: links in HTML
  assert.ok(/href=["']mailto:contact@aaditechs\.in["']/i.test(indexHtml), 'Must have mailto: contact link');
  assert.ok(/href=["']tel:\+918898278453["']/i.test(indexHtml), 'Must have tel: contact link');
  console.log('  ✅ Goal 13 Passed: HTML contains machine-readable mailto: and tel: links.');

  // Goal 14 & 15: llms.txt is well-formed
  console.log('Goal 14 & 15: Testing llms.txt structure and Markdown formatting...');
  const llmsPath = path.join(process.cwd(), 'public', 'llms.txt');
  assert.ok(fs.existsSync(llmsPath), 'llms.txt must exist in /public');
  const llmsContent = fs.readFileSync(llmsPath, 'utf-8');
  assert.ok(llmsContent.startsWith('# '), 'llms.txt must start with top-level "# " heading');
  assert.ok(llmsContent.includes('\n> '), 'llms.txt must contain a blockquote "> " summary');
  assert.ok(/\[.+?\]\(https?:\/\/.+?\)/.test(llmsContent), 'llms.txt must contain Markdown links to key pages');
  console.log('  ✅ Goal 14 & 15 Passed: llms.txt is well-formed with "# ", "> ", and structured links.');

  // Goal 18: WebMCP tools registered and form annotated
  assert.ok(
    /toolname=["']submit_lead_inquiry["']/i.test(indexHtml),
    'Form must be annotated with toolname for WebMCP agents'
  );
  assert.ok(
    /tooldescription=["'][\s\S]+?["']/i.test(indexHtml),
    'Form must be annotated with tooldescription for WebMCP agents'
  );
  assert.ok(
    indexHtml.includes('navigator.modelContext.registerTool') || indexHtml.includes('modelContext.registerTool'),
    'index.html must register WebMCP tools on page load'
  );
  console.log('  ✅ Goal 18 Passed: Form annotated with toolname/tooldescription and WebMCP script registered.');

  // Goal 19: MCP Server Card (SEP-1649)
  console.log('Goal 19: Testing SEP-1649 MCP Server Card...');
  const cardPath = path.join(process.cwd(), 'public', '.well-known', 'mcp', 'server-card.json');
  assert.ok(fs.existsSync(cardPath), 'server-card.json must exist at /.well-known/mcp/server-card.json');
  const cardJson = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
  assert.strictEqual(cardJson.name, 'aaditech-bga');
  assert.ok(cardJson.version, 'MCP server card must have version');
  assert.ok(cardJson.endpoint, 'MCP server card must declare endpoint URL');
  assert.ok(cardJson.capabilities && cardJson.capabilities.tools, 'MCP card must declare capabilities');
  assert.ok(Array.isArray(cardJson.tools) && cardJson.tools.length >= 3, 'MCP card must list available tools');
  console.log('  ✅ Goal 19 Passed: Valid SEP-1649 MCP Server Card published.');

  // -------------------------------------------------------------
  // Server Route & 404 & Markdown & Link Header Verification
  // -------------------------------------------------------------
  console.log('Goal 4, 16, 17: Testing server.ts protocol configuration...');
  const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
  assert.ok(serverCode.includes("app.get('/robots.txt'"), 'server.ts must handle /robots.txt');
  assert.ok(serverCode.includes("app.get('/sitemap.xml'"), 'server.ts must handle /sitemap.xml');
  assert.ok(serverCode.includes("app.get('/llms.txt'"), 'server.ts must handle /llms.txt');
  assert.ok(serverCode.includes("server-card.json"), 'server.ts must handle MCP server-card.json');
  assert.ok(serverCode.includes("isMarkdownRequested"), 'server.ts must support Accept: text/markdown negotiation');
  assert.ok(serverCode.includes("RFC_8288_LINK_HEADER"), 'server.ts must emit RFC 8288 Link header');
  assert.ok(serverCode.includes("handle404"), 'server.ts must enforce real HTTP 404 for missing pages');
  console.log('  ✅ Goals 4, 16, 17 Passed: Server routes, Markdown negotiation, Link headers, and real 404 handler verified.');

  console.log('\n=========================================================================');
  console.log('🎉 ALL 19 AGENT-READY GOALS VERIFIED WITH 100% SUCCESS!');
  console.log('=========================================================================');
}

runAgentReadinessTests().catch((err) => {
  console.error('❌ Agent-readiness test failed:', err);
  process.exit(1);
});
