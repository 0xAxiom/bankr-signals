import { redirect } from 'next/navigation';

interface SignalRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function SignalRedirect({ params }: SignalRedirectProps) {
  const { id } = await params;
  redirect(`/signals/${id}`);
}