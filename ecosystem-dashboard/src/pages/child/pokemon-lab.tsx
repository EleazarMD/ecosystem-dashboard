/**
 * Pokemon Lab Page
 *
 * Brilliant.com-style interactive learning interface for the Pokemon
 * knowledge graph. Accessible at /child/pokemon-lab.
 */

import React from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import { Box } from '@chakra-ui/react';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { PokemonLab } from '@/components/child/PokemonLab';

function PokemonLabPageContent() {
  return (
    <Box
      minH="100vh"
      bg="gray.900"
      p={{ base: 4, md: 6 }}
      color="white"
      borderRadius="xl"
      boxShadow="inner"
    >
      <PokemonLab />
    </Box>
  );
}

export default function PokemonLabPage() {
  return (
    <ChildDashboardLayout pageType="home">
      <PokemonLabPageContent />
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

  return { props: {} };
};
