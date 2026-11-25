import { CompanyForm } from '@/components/admin/CompanyForm';
import { getCompany } from '@/lib/sales-docs';

export const dynamic = 'force-dynamic';

export default async function CompanyPage() {
  return <CompanyForm initial={await getCompany()} />;
}
