/**
 * Child Chat Page
 * 
 * Child-friendly AI chat interface
 */

import React, { useRef } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import { authOptions } from '../api/auth/[...nextauth]';
import { ChildChatUI } from '@/components/child/ChildChatUI';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import {
  KNOWN_ACTIVITY_IDS,
  useActivityContext,
  createFreeChatContextProvider,
} from '@/domains/learning/shared/activity-registry';

function ChildChatPageContent() {
  const router = useRouter();
  // Note: RightPanelContext automatically detects /child/chat route and sets context

  // Register FreeChat context provider with the Context Hub
  const chatStateRef = useRef({ childName: '' });
  useActivityContext(KNOWN_ACTIVITY_IDS.FREE_CHAT, () => createFreeChatContextProvider(chatStateRef));

  return (
    <ChildChatUI
      serviceId="personal-ai"
      serviceName="Companion AI"
      serviceEmoji="🌟"
      onBack={() => router.push('/child/home')}
      useCompanionAI={true}
    />
  );
}

export default function ChildChatPage() {
  return (
    <ChildDashboardLayout pageType="chat">
      <ChildChatPageContent />
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
