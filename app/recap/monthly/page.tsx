import { redirect } from 'next/navigation';

export default function MonthlyRecapIndex() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  redirect(`/recap/monthly/${yearMonth}`);
}
