import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shiftDate,countDays,rangeError} from './dateRange.js';
test('conta dias incluindo extremos, ano bissexto e transições de mês',()=>{
 assert.equal(countDays('2024-02-28','2024-03-01'),3);
 assert.equal(countDays('2026-10-25','2026-10-25'),1);
 assert.equal(shiftDate('2026-01-01',-1),'2025-12-31');
 assert.equal(rangeError('2025-10-26','2026-10-25','2026-10-25'),'');
 assert.match(rangeError('2025-10-25','2026-10-25','2026-10-25'),/365/);
 assert.match(rangeError('2026-10-25','2026-10-24','2026-10-25'),/posterior/);
 assert.match(rangeError('2026-10-25','2026-10-26','2026-10-25'),/hoje/);
});
