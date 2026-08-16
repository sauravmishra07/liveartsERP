/**
 * Daily recompute (Requirements §7.4) — the serverless stand-in for the BullMQ
 * scheduler, which cannot run on Netlify because there is no long-lived process.
 * Schedule lives in netlify.toml. Runs the same JobsService code path as the
 * manual "Recompute" button, so nothing can drift between the two.
 */
const { schedule } = require('@netlify/functions');
const { runDailyJobs } = require('../../backend/dist/serverless');

exports.handler = schedule('0 20 * * *', async () => {
  // 20:00 UTC = 01:30 IST next day.
  try {
    const result = await runDailyJobs();
    console.log('daily-jobs ok', JSON.stringify(result));
    return { statusCode: 200 };
  } catch (err) {
    console.error('daily-jobs failed', err);
    return { statusCode: 500 };
  }
});
