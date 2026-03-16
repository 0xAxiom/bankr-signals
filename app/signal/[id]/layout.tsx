import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface SignalPageProps {
  params: { id: string }
}

async function getSignal(id: string) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://bankrsignals.com' 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/signals/${id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching signal for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: SignalPageProps): Promise<Metadata> {
  const signal = await getSignal(params.id);
  
  if (!signal) {
    return {
      title: 'Signal Not Found - Bankr Signals',
      description: 'The requested trading signal could not be found.',
    };
  }

  const pnlText = signal.pnlPct !== null 
    ? ` | ${signal.pnlPct > 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}% PnL`
    : signal.status === 'open' ? ' | Open' : '';
    
  const confidenceText = signal.confidence 
    ? ` | ${Math.round(signal.confidence * 100)}% confidence` 
    : '';
    
  const leverageText = signal.leverage ? ` ${signal.leverage}x` : '';
  
  const title = `${signal.action}${leverageText} $${signal.token} at $${signal.entry_price}${pnlText}`;
  const description = signal.reasoning || `${signal.action} signal for ${signal.token} by ${signal.provider_name}${confidenceText}`;
  
  const ogImageUrl = `https://bankrsignals.com/api/og/signal?id=${params.id}`;
  
  return {
    title: `${title} - Bankr Signals`,
    description: description,
    openGraph: {
      title: title,
      description: description,
      type: 'article',
      url: `https://bankrsignals.com/signal/${params.id}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${signal.action} ${signal.token} signal by ${signal.provider_name}`,
        },
      ],
      siteName: 'Bankr Signals',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@AxiomBot',
      title: title,
      description: description,
      images: [ogImageUrl],
    },
  };
}

export default function SignalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}