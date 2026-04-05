import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { RealTimeSecurityDashboard } from '@/components/security/RealTimeSecurityDashboard';

export default function RealTimeSecurityPage() {
  return (
    <SecurityLayout>
      <Head>
        <title>Real-Time Security | AI Homelab</title>
        <meta name="description" content="Live security monitoring with WebSocket updates" />
      </Head>
      
      <RealTimeSecurityDashboard 
        showAlerts={true}
        showAnomalies={true}
        showAuditStream={true}
        showStats={true}
      />
    </SecurityLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/security/realtime',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
