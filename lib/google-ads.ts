import { GoogleAdsApi } from 'google-ads-api';
import { db } from './firebase';
import { decryptString } from './encryption';

/**
 * Initializes the Official Google Ads Node Client
 */
export async function getAdsClient() {
  const doc = await db.collection('google_connections').doc('master_admin_connection').get();
  if (!doc.exists) throw new Error('No Google connection found. Please connect your account first.');

  const connection = doc.data();
  if (!connection?.encryptedRefreshToken) throw new Error('No refresh token exists. Disconnect and reconnect your Google account.');

  const refreshToken = decryptString(connection.encryptedRefreshToken);
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  if (!developerToken) {
    throw new Error('Missing GOOGLE_ADS_DEVELOPER_TOKEN in environment variables.');
  }

  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    developer_token: developerToken,
  });

  return { client, refreshToken };
}

/**
 * Official Google Ads API implementation.
 * Overcomes Google's strict 404 REST barriers by utilizing the official gRPC mappings.
 */
export async function listAccessibleCustomers() {
  const { client, refreshToken } = await getAdsClient();
  const accounts: any[] = [];
  const targetCustomerIds: string[] = [];

  // Step 1: listAccessibleCustomers accurately returns all raw IDs the email can touch natively
  let accessibleCustomers: any;
  try {
    accessibleCustomers = await client.listAccessibleCustomers(refreshToken);
  } catch (err: any) {
    console.error('Initial listAccessibleCustomers fail:', err);
    return [];
  }
  
  const resources = accessibleCustomers.resource_names || accessibleCustomers.resourceNames || [];
  for (const res of resources) {
    targetCustomerIds.push(res.split('/')[1]);
  }

  if (targetCustomerIds.length === 0) return [];

  // Step 2: Query each ID totally independently to grab its Descriptive Name
  for (const customerId of targetCustomerIds) {
    try {
      // By explicitly omitting login_customer_id, we tell Google:
      // "I am directly authenticated via my email to access this ID."
      const customer = client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
        // specifically NOT injecting login_customer_id here so it doesn't cross-taint stand-alone accounts!
      });

      const entries = await customer.query(`
        SELECT 
          customer_client.id, 
          customer_client.descriptive_name, 
          customer_client.currency_code, 
          customer_client.time_zone 
        FROM customer_client 
        WHERE customer_client.level = 0
      `);

      for (const row of entries) {
        if (row.customer_client && row.customer_client.id) {
          accounts.push({
            customerId: row.customer_client.id.toString(),
            descriptiveName: row.customer_client.descriptive_name || `Account ${row.customer_client.id}`,
            currencyCode: row.customer_client.currency_code,
            timeZone: row.customer_client.time_zone
          });
        }
      }
    } catch (error: any) {
      console.warn(`Direct query failed for standalone target ${customerId}:`, error.message || error);
    }
  }

  // Deduplicate
  return accounts.filter((v, i, a) => a.findIndex(t => (t.customerId === v.customerId)) === i);
}
