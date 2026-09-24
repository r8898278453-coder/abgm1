import {
  calculateRevenueAttribution,
  normalizeSource,
  isProviderVerifiedPayment,
  SUPPORTED_SOURCES,
  SupportedSource,
} from '../server/revenueAttribution';
import { DbLead, DbInvoice } from '../server/db';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Starting Real Revenue Attribution Engine Unit Tests...\n');

// ----------------------------------------------------
// TEST 1: Source Normalization & Anti-Inference Rules
// ----------------------------------------------------
console.log('Test 1: Strict Source Normalization & Anti-Inference');

assert(normalizeSource('Google Maps Local 3-Pack') === 'Google', 'Should map Google Maps to Google');
assert(normalizeSource('Google Ads Campaign') === 'Google', 'Should map Google Ads to Google');
assert(normalizeSource('SEO Organic Search') === 'Organic', 'Should map SEO to Organic');
assert(normalizeSource('bga.aaditechs.in Contact Form') === 'Website', 'Should map website form to Website');
assert(normalizeSource('WhatsApp Direct Lead') === 'WhatsApp', 'Should map WhatsApp to WhatsApp');
assert(normalizeSource('Telegram Support Bot') === 'Telegram', 'Should map Telegram to Telegram');
assert(normalizeSource('Instagram Reel Ad') === 'Social', 'Should map Instagram to Social');
assert(normalizeSource('Client Referral Recommendation') === 'Referral', 'Should map referral to Referral');
assert(normalizeSource('Email Newsletter Campaign') === 'Campaign', 'Should map campaign to Campaign');
assert(normalizeSource('Direct Walk-in Consultation') === 'Manual', 'Should map walk-in to Manual');

// Anti-inference check: Ambiguous, missing, or unsupported sources must STRICTLY return 'Unknown'
assert(normalizeSource(null) === 'Unknown', 'Null source must be Unknown');
assert(normalizeSource(undefined) === 'Unknown', 'Undefined source must be Unknown');
assert(normalizeSource('') === 'Unknown', 'Empty string must be Unknown');
assert(normalizeSource('Random Unidentifiable Channel') === 'Unknown', 'Unrecognized source must be Unknown, never guessed');
assert(normalizeSource('unknown') === 'Unknown', 'Explicit unknown must be Unknown');

console.log('  ✅ Test 1 Passed: Supported sources resolved strictly, unstated sources never inferred.');

// ----------------------------------------------------
// TEST 2: Provider-Verified Payment Validation
// ----------------------------------------------------
console.log('\nTest 2: Provider-Verified Payment Validation');

const authenticInvoice: DbInvoice = {
  id: 'INV-202609-1001',
  company_id: 'comp_tenant_a',
  date: '2026-09-20',
  plan: 'Growth Tier',
  amount: 25000,
  gst_amount: 4500,
  total_amount: 29500,
  payment_method: 'UPI / Razorpay Verified',
  payment_id: 'pay_RZP9820491823',
  order_id: 'order_RZP772183921',
  status: 'Paid',
};

const simulatedInvoice: DbInvoice = {
  id: 'INV-202609-1002',
  company_id: 'comp_tenant_a',
  date: '2026-09-20',
  plan: 'Growth Tier',
  amount: 25000,
  gst_amount: 4500,
  total_amount: 29500,
  payment_method: 'Simulated Demo Gateway',
  payment_id: 'sim_pay_test123',
  status: 'Paid',
};

const pendingInvoice: DbInvoice = {
  id: 'INV-202609-1003',
  company_id: 'comp_tenant_a',
  date: '2026-09-20',
  plan: 'Growth Tier',
  amount: 15000,
  gst_amount: 2700,
  total_amount: 17700,
  payment_method: 'Razorpay',
  payment_id: 'pay_REAL99120',
  status: 'Pending',
};

const missingPaymentIdInvoice: DbInvoice = {
  id: 'INV-202609-1004',
  company_id: 'comp_tenant_a',
  date: '2026-09-20',
  plan: 'Growth Tier',
  amount: 10000,
  gst_amount: 1800,
  total_amount: 11800,
  payment_method: 'Client Mock Payment',
  status: 'Paid',
};

assert(isProviderVerifiedPayment(authenticInvoice) === true, 'Authentic payment must be verified');
assert(isProviderVerifiedPayment(simulatedInvoice) === false, 'Simulated payment must be rejected');
assert(isProviderVerifiedPayment(pendingInvoice) === false, 'Pending non-paid invoice must be rejected');
assert(isProviderVerifiedPayment(missingPaymentIdInvoice) === false, 'Invoice lacking provider payment_id must be rejected');

console.log('  ✅ Test 2 Passed: Strict provider verification active (simulated/mock payments rejected).');

// ----------------------------------------------------
// TEST 3: Full CRM Lifecycle & Revenue Attribution
// ----------------------------------------------------
console.log('\nTest 3: Full CRM Lifecycle (SOURCE -> LEAD -> QUALIFIED -> OPPORTUNITY -> QUOTE/DEAL -> WON/LOST -> PAYMENT -> REVENUE)');

const testLeads: DbLead[] = [
  // Lead 1: Google -> qualified -> opportunity -> quotation -> won -> Paid
  {
    id: 'lead_1',
    company_id: 'comp_tenant_a',
    name: 'Rajesh Singhania',
    phone: '+91 98201 44520',
    email: 'rajesh@singhania.com',
    service: 'Fleet App',
    stage: 'won',
    intent_score: 95,
    source: 'Google 3-Pack Call',
  },
  // Lead 2: Website -> qualified -> opportunity -> quotation
  {
    id: 'lead_2',
    company_id: 'comp_tenant_a',
    name: 'Pooja Mehta',
    phone: '+91 98202 33445',
    email: 'pooja@mehtaclinic.in',
    service: 'Website Development',
    stage: 'quotation',
    intent_score: 85,
    source: 'Website Inquiry Form',
  },
  // Lead 3: WhatsApp -> contacted / opportunity
  {
    id: 'lead_3',
    company_id: 'comp_tenant_a',
    name: 'Vikram Joshi',
    phone: '+91 98333 11223',
    service: 'Local SEO Retainer',
    stage: 'contacted',
    intent_score: 75,
    source: 'WhatsApp Direct Chat',
  },
  // Lead 4: Social -> new lead
  {
    id: 'lead_4',
    company_id: 'comp_tenant_a',
    name: 'Anita Desai',
    phone: '+91 98777 66554',
    service: 'Social Media Management',
    stage: 'new',
    intent_score: 60,
    source: 'Instagram Ad Lead',
  },
  // Lead 5: Referral -> lost
  {
    id: 'lead_5',
    company_id: 'comp_tenant_a',
    name: 'Suresh Patil',
    phone: '+91 98111 22334',
    service: 'Custom Software',
    stage: 'lost',
    intent_score: 40,
    source: 'Partner Referral',
  },
];

const testInvoices: DbInvoice[] = [
  // Verified invoice linked to Lead 1 (Rajesh Singhania via Phone +91 98201 44520)
  {
    id: 'INV-001',
    company_id: 'comp_tenant_a',
    date: '2026-09-20',
    plan: 'Fleet App Development',
    amount: 65000,
    gst_amount: 11700,
    total_amount: 76700,
    payment_method: 'UPI / Razorpay Verified',
    payment_id: 'pay_RZP_AUTH_991',
    order_id: 'order_RZP_AUTH_991',
    customer_name: 'Rajesh Singhania',
    customer_phone: '+91 98201 44520',
    status: 'Paid',
  },
  // Unverified/simulated invoice - MUST BE EXCLUDED from verified revenue
  {
    id: 'INV-002',
    company_id: 'comp_tenant_a',
    date: '2026-09-20',
    plan: 'Demo Retainer',
    amount: 50000,
    gst_amount: 9000,
    total_amount: 59000,
    payment_method: 'Simulated',
    payment_id: 'sim_pay_9999',
    status: 'Paid',
  },
];

const attributionResult = calculateRevenueAttribution({
  companyId: 'comp_tenant_a',
  leads: testLeads,
  invoices: testInvoices,
  // No cost data provided
});

assert(attributionResult.totalLeads === 5, 'Total leads must equal 5');
assert(attributionResult.qualifiedLeads === 2, 'Qualified leads (won + quotation) must equal 2');
assert(attributionResult.opportunities === 3, 'Opportunities (won + quotation + contacted) must equal 3');
assert(attributionResult.quotesDeals === 2, 'Quotes/Deals (quotation + won) must equal 2');
assert(attributionResult.wonLeads === 1, 'Won leads must equal 1');
assert(attributionResult.lostLeads === 1, 'Lost leads must equal 1');
assert(attributionResult.customers === 1, 'Distinct paying customers must equal 1');
assert(attributionResult.conversionRate === 20, 'Conversion rate must be 1 / 5 = 20.00%');
assert(attributionResult.totalRevenue === 65000, 'Total verified revenue must equal ₹65,000');
assert(attributionResult.unverifiedRevenueIgnored === 50000, 'Unverified revenue must be safely isolated and ignored');
assert(attributionResult.verifiedInvoicesCount === 1, 'Verified invoices count must equal 1');
assert(attributionResult.unverifiedInvoicesCount === 1, 'Unverified invoices count must equal 1');

// Check Google source attribution
const googleMetrics = attributionResult.revenueBySource['Google'];
assert(googleMetrics.leads === 1, 'Google leads count must be 1');
assert(googleMetrics.won === 1, 'Google won count must be 1');
assert(googleMetrics.customers === 1, 'Google paying customers count must be 1');
assert(googleMetrics.revenue === 65000, 'Google attributed revenue must equal ₹65,000');
assert(googleMetrics.conversionRate === 100, 'Google conversion rate must equal 100%');

console.log('  ✅ Test 3 Passed: Complete CRM lifecycle and verified revenue attribution computed.');

// ----------------------------------------------------
// TEST 4: Strict Zero-Fabrication of ROI (Cost Missing vs. Cost Provided)
// ----------------------------------------------------
console.log('\nTest 4: Strict Zero-Fabrication of ROI');

// Scenario A: No cost data provided -> ROI must strictly be 'UNAVAILABLE'
assert(attributionResult.overallRoi === 'UNAVAILABLE', 'ROI must be UNAVAILABLE when cost is missing');
assert(attributionResult.revenueBySource['Google'].roi === 'UNAVAILABLE', 'Source ROI must be UNAVAILABLE when spend is null');

// Scenario B: Verified cost data provided -> calculate real ROI mathematically
const attributionWithCost = calculateRevenueAttribution({
  companyId: 'comp_tenant_a',
  leads: testLeads,
  invoices: testInvoices,
  costBySource: {
    Google: 15000,
    Social: 5000,
  },
  totalCost: 20000,
});

// Total verified revenue = ₹65,000, Spend = ₹20,000 -> Net profit = ₹45,000 -> ROI = (45,000 / 20,000) * 100 = 225.00%
assert(attributionWithCost.totalSpend === 20000, 'Total spend must equal ₹20,000');
assert(attributionWithCost.overallRoi === 225, `Overall ROI should be 225%, got ${attributionWithCost.overallRoi}`);

// Google: Revenue = 65000, Spend = 15000 -> (65000 - 15000)/15000 * 100 = 333.33%
assert(attributionWithCost.revenueBySource['Google'].roi === 333.33, 'Google ROI should be 333.33%');
// Website: Spend is null -> ROI must remain UNAVAILABLE
assert(attributionWithCost.revenueBySource['Website'].roi === 'UNAVAILABLE', 'Website ROI must be UNAVAILABLE when spend is missing');

console.log('  ✅ Test 4 Passed: ROI is never fabricated; marked UNAVAILABLE when spend is missing.');

// ----------------------------------------------------
// TEST 5: Tenant Isolation Check
// ----------------------------------------------------
console.log('\nTest 5: Multi-Tenant Data Isolation');

const tenantBLeads: DbLead[] = [
  {
    id: 'lead_b1',
    company_id: 'comp_tenant_b',
    name: 'Tenant B Client',
    phone: '+91 99999 88888',
    service: 'Mobile App',
    stage: 'won',
    intent_score: 90,
    source: 'Website',
  },
];

const tenantBInvoices: DbInvoice[] = [
  {
    id: 'INV-B1',
    company_id: 'comp_tenant_b',
    date: '2026-09-20',
    plan: 'App Maintenance',
    amount: 100000,
    gst_amount: 18000,
    total_amount: 118000,
    payment_method: 'UPI / Razorpay Verified',
    payment_id: 'pay_RZP_TENANT_B',
    customer_phone: '+91 99999 88888',
    status: 'Paid',
  },
];

// Combine all leads and invoices in multi-tenant environment
const allLeads = [...testLeads, ...tenantBLeads];
const allInvoices = [...testInvoices, ...tenantBInvoices];

// Compute attribution for Tenant A
const isolatedTenantA = calculateRevenueAttribution({
  companyId: 'comp_tenant_a',
  leads: allLeads,
  invoices: allInvoices,
});

// Compute attribution for Tenant B
const isolatedTenantB = calculateRevenueAttribution({
  companyId: 'comp_tenant_b',
  leads: allLeads,
  invoices: allInvoices,
});

assert(isolatedTenantA.totalLeads === 5, 'Tenant A must strictly see 5 leads, not 6');
assert(isolatedTenantA.totalRevenue === 65000, 'Tenant A must strictly see ₹65,000, not ₹165,000');

assert(isolatedTenantB.totalLeads === 1, 'Tenant B must strictly see 1 lead');
assert(isolatedTenantB.totalRevenue === 100000, 'Tenant B must strictly see ₹100,000');
assert(isolatedTenantB.revenueBySource['Website'].revenue === 100000, 'Tenant B Website revenue must be ₹100,000');

console.log('  ✅ Test 5 Passed: Complete multi-tenant isolation verified with zero cross-tenant leakage.');

console.log('\n🎉 ALL 5 REVENUE ATTRIBUTION UNIT TESTS PASSED PERFECTLY!');
