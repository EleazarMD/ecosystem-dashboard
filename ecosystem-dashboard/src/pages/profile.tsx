/**
 * /profile — Redirects to /settings/profile
 */

import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/settings/profile',
      permanent: true,
    },
  };
};

export default function ProfileRedirect() {
  return null;
}
