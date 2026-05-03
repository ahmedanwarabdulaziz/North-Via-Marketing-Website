import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { fetchDeviceMetrics, fetchGeographicMetrics } from './app/actions/ads-reports';
import { db } from './lib/firebase';

async function test() {
  const docs = await db.collection('google_ads_accounts').limit(1).get();
  if (docs.empty) {
    console.error('No accounts found.');
    process.exit(1);
  }
  const customerId = docs.docs[0].data().customerId;
  console.log("Fetching for", customerId);

  const devices = await fetchDeviceMetrics(customerId, '2024-01-01', '2026-12-31');
  console.log('Devices Result:', JSON.stringify(devices, null, 2));

  const geo = await fetchGeographicMetrics(customerId, '2024-01-01', '2026-12-31');
  console.log('Geo Result:', JSON.stringify(geo, null, 2));
  process.exit(0);
}

test();
