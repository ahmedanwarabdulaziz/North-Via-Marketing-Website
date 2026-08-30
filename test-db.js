const admin = require('firebase-admin');

async function check() {
  const { getAdminInvoiceById } = require('./lib/admin-ops');
  const invoice = await getAdminInvoiceById('nLl0HifZJd3te2oQcPwx');
  console.log('Invoice in DB:', invoice);
}

check().catch(console.error);
