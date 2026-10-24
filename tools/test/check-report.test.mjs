import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  e2eDetail,
  rate,
  selectGates,
  toMarkdown,
  toRow,
  unitDetail,
} from '../lib/check-report.mjs';

describe('check-report', () => {
  it('rates to one decimal and says when there is nothing to rate', () => {
    assert.equal(rate(39, 40), '97.5% (39/40 passed)');
    assert.equal(rate(2, 3), '66.7% (2/3 passed)');
    assert.equal(rate(0, 0), 'no tests');
  });

  it('reads the unit result and coverage, or says they are missing', () => {
    assert.deepEqual(
      unitDetail({ numPassedTests: 43, numTotalTests: 43 }, { total: { lines: { pct: 88.34 } } }),
      { result: '100% (43/43 passed)', note: 'line coverage 88.34%' },
    );
    assert.deepEqual(unitDetail(undefined, undefined), { result: 'no results', note: '' });
  });

  it('counts a flaky e2e test against the pass rate and names flaky and skipped tests', () => {
    assert.deepEqual(e2eDetail({ expected: 5, unexpected: 0, flaky: 1, skipped: 2 }), {
      result: '83.3% (5/6 passed)',
      note: '1 flaky, 2 skipped',
    });
    assert.deepEqual(e2eDetail(undefined), { result: 'no results', note: '' });
  });

  it('keeps the gates --only names, minus those --skip names, in their order', () => {
    const gates = ['lint', 'unit', 'build', 'e2e'].map((id) => ({ id }));
    const ids = (only, skip) => selectGates(gates, only, skip).map(({ id }) => id);

    assert.deepEqual(ids(undefined, undefined), ['lint', 'unit', 'build', 'e2e']);
    assert.deepEqual(ids('e2e,lint', undefined), ['lint', 'e2e']);
    assert.deepEqual(ids(undefined, 'e2e'), ['lint', 'unit', 'build']);
  });

  it('writes FAIL once, then the measured result when the gate has one', () => {
    const gate = { id: 'unit', name: 'Unit tests' };

    assert.equal(toRow(gate, false, undefined, 1).result, 'FAIL');
    assert.equal(
      toRow(gate, false, { result: '97.5% (39/40 passed)', note: '' }, 1).result,
      'FAIL: 97.5% (39/40 passed)',
    );
    assert.equal(toRow(gate, true, undefined, 1).result, 'pass');
  });

  it('ends the checklist with which gates failed', () => {
    const rows = [
      toRow({ id: 'lint', name: 'Lint' }, true, undefined, 3),
      toRow({ id: 'unit', name: 'Unit tests' }, false, { result: 'no results', note: '' }, 4),
    ];

    const markdown = toMarkdown(rows);

    assert.match(markdown, /\| Unit tests \| FAIL \| FAIL: no results \| 4s \|/);
    assert.match(markdown, /1 of 2 gates failed: Unit tests\./);
    assert.match(toMarkdown(rows.slice(0, 1)), /All 1 gates pass\./);
  });
});
