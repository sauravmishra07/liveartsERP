/**
 * Clears all operational/test records, keeping only the exact data the Zoho .ds
 * defines: the branches (NIT 5, Jawahar Colony) + the admin user.
 * The .ds is an app-definition export — it contains no student/fee/employee
 * records, so a clean install has only branches until real data is imported.
 * Run: npx ts-node -r tsconfig-paths/register src/reset-data.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const CLEAR = [
  'students',
  'feerecords',
  'expenses',
  'studentattendances',
  'employees',
  'employeeattendances',
  'enquiries',
  'demos',
  'followups',
  'enquiryactivities',
  'whatsappmessages',
  'presetmessages',
  'changehistories',
  'batches',
  'batchwisesummaries',
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  for (const name of CLEAR) {
    if (existing.includes(name)) {
      const r = await db.collection(name).deleteMany({});
      // eslint-disable-next-line no-console
      console.log(`cleared ${name}: ${r.deletedCount}`);
    }
  }
  const branches = await db.collection('branches').countDocuments();
  const users = await db.collection('users').countDocuments();
  // eslint-disable-next-line no-console
  console.log(`\nKept (real .ds data): branches=${branches}, users=${users}\n`);
  await mongoose.disconnect();
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
