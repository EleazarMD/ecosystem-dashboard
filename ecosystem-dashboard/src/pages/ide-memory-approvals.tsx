import dynamic from 'next/dynamic';

const DynamicPage = dynamic(() => import('@/components/pages/ide-memory-approvals.client'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function Page() {
  return <DynamicPage />;
}
