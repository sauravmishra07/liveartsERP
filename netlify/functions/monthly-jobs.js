/**
 * Monthly jobs — recurring expenses (§6.8) + salary posting (§6.7).
 * Both are idempotent, so a retry or an accidental double-run cannot duplicate rows.
 */
const { schedule } = require('@netlify/functions');
const { runMonthlyJobs } = require('../../backend/dist/serverless');

exports.handler = schedule('30 0 1 * *', async () => {
  // 00:30 UTC on the 1st = 06:00 IST on the 1st.
  try {
    const result = await runMonthlyJobs();
    console.log('monthly-jobs ok', JSON.stringify(result));
    return { statusCode: 200 };
  } catch (err) {
    console.error('monthly-jobs failed', err);
    return { statusCode: 500 };
  }
});
