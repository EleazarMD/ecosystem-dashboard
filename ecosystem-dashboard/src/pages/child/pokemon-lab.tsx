/**
 * Pokemon Lab Page
 *
 * Brilliant.com-style interactive learning interface for the Pokemon
 * knowledge graph. Accessible at /child/pokemon-lab.
 *
 * Now wired with the Tutor Companion (§4) and Context Provider (§3).
 */

import React, { useRef, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import { Box } from '@chakra-ui/react';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { PokemonLab } from '@/components/child/PokemonLab';
import { StudioReturnBanner } from '@/components/child/learning-kit';
import {
  activityRegistry,
  KNOWN_ACTIVITY_IDS,
  createPokemonLabContextProvider,
} from '@/domains/learning/shared/activity-registry';
import type { PokemonLabStateSnapshot } from '@/domains/learning/shared/activity-registry';

/**
 * The Pokemon Lab is a self-contained "Pokemon world". It deliberately does
 * NOT inherit the active child theme wallpaper (e.g. Minecraft grass) so the
 * interface stays readable and consistent for every child.
 */
function PokemonLabPageContent() {
  // Context state ref — updated by PokemonLab on view changes.
  const stateRef = useRef<PokemonLabStateSnapshot>({
    view: 'home',
  });
  // Bump counter on each state ref change so the page re-renders and the
  // context envelope recomputes for the Tutor Companion.
  const [, setContextVersion] = useState(0);

  const activity = activityRegistry.get(KNOWN_ACTIVITY_IDS.POKEMON_LAB);

  // Create context provider once.
  const contextProvider = useMemo(
    () => createPokemonLabContextProvider(stateRef),
    [],
  );

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-b, #1a1a2e, #16213e, #0f3460)"
      backgroundImage="url(/themes/pokemon/Wallpapers/pokeball-scatter.svg)"
      backgroundRepeat="repeat"
      backgroundSize="320px"
      backgroundBlendMode="overlay"
      p={{ base: 3, md: 6 }}
      color="white"
      borderRadius="2xl"
    >
      <StudioReturnBanner />
      <PokemonLab stateRef={stateRef} onStateChange={() => setContextVersion((v) => v + 1)} />
    </Box>
  );
}

export default function PokemonLabPage() {
  return (
    <ChildDashboardLayout pageType="pokemon-lab">
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
