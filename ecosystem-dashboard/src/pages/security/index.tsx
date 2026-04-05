import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';

export default function SecurityPage() {
  return (
    <SecurityLayout>
      <Head>
        <title>Security Dashboard | AI Homelab</title>
        <meta name="description" content="Security monitoring and approval management" />
      </Head>
      
      <SecurityDashboard 
        showApprovals={true}
        showAuditLog={true}
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
        destination: '/auth/signin?callbackUrl=/security',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
