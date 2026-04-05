import dynamic from 'next/dynamic';

const DynamicPage = dynamic(() => import('@/components/pages/knowledge-graph-control.client'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function Page() {
  return <DynamicPage />;
}
