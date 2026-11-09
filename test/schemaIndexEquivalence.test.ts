import assert from 'node:assert/strict';
import { hasEquivalentIndex, type IndexRow } from '../server/schemaIndexes';

const index = (columns: string[], unique = false, table = 'custom_domains'): IndexRow[] => columns.map((column, i) => ({
  TABLE_NAME: table, INDEX_NAME: 'legacy_name', COLUMN_NAME: column, SEQ_IN_INDEX: i + 1, NON_UNIQUE: unique ? 0 : 1, SUB_PART: null,
}));
assert.equal(hasEquivalentIndex(index(['company_id', 'domain']), 'custom_domains', ['company_id']), true);
assert.equal(hasEquivalentIndex(index(['company_id', 'domain']), 'custom_domains', ['domain']), false);
assert.equal(hasEquivalentIndex(index(['company_id', 'domain'], true), 'custom_domains', ['domain'], true), false);
assert.equal(hasEquivalentIndex(index(['domain']), 'custom_domains', ['domain'], true), false);
assert.equal(hasEquivalentIndex(index(['domain'], true), 'custom_domains', ['domain'], true), true);
assert.equal(hasEquivalentIndex(index(['domain'], true, 'another_table'), 'custom_domains', ['domain'], true), false);
assert.equal(hasEquivalentIndex([{ ...index(['domain'], true)[0], SUB_PART: 20 }], 'custom_domains', ['domain'], true), false);
assert.equal(hasEquivalentIndex(index(['company_id', 'domain'], true).reverse(), 'custom_domains', ['company_id', 'domain'], true), true);
assert.equal(hasEquivalentIndex([], 'custom_domains', ['domain'], true), false);
console.log('Index equivalence: column order, leading coverage, exact uniqueness, prefix length and tenant-table separation passed.');
