/**
 * Adult Page Guard
 * 
 * Server-side props that redirect child accounts to their appropriate child pages.
 * Import and re-export from adult-only pages to enforce account tenancy.
 */

import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Map adult routes to child routes
const ADULT_TO_CHILD_ROUTES: Record<string, string> = {
  '/email': '/child/email',
  '/email': '/child/email',
  '/email-graphrag': '/child/email',
  '/workspace': '/child/workspace',
  '/openclaw': '/child/chat',
  '/image-studio': '/child/art-studio',
  '/calendar': '/child/planner',
  '/dashboard': '/child/home',
  '/ai-research': '/child/home',
  '/podcast-studio': '/child/home',
  '/knowledge-graph': '/child/home',
  '/agentic-workflows': '/child/home',
  '/ml-training': '/child/home',
  '/clinical-evidence': '/child/home',
  '/approvals': '/child/home',
  '/family': '/child/home',
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  // Not logged in - redirect to signin
  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  
  // Child account - redirect to child version of the page
  if (user.accountType === 'child') {
    const currentPath = context.resolvedUrl.split('?')[0]; // Remove query params
    const childRoute = ADULT_TO_CHILD_ROUTES[currentPath] || '/child/home';
    
    return {
      redirect: {
        destination: childRoute,
        permanent: false,
      },
    };
  }

  // Adult account - allow access
  return { props: {} };
};
