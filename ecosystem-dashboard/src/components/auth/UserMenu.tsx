/**
 * User Menu Component
 * 
 * Dropdown menu showing user info and actions:
 * - Profile link
 * - Settings link
 * - Sign out
 */

import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  HStack,
  VStack,
  Text,
  Badge,
  Icon,
  useColorModeValue,
  Box,
} from '@chakra-ui/react';
import { FiUser, FiSettings, FiLogOut, FiShield } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { useSession } from 'next-auth/react';
import { getChildTheme } from '@/lib/child-themes';

export function UserMenu() {
  const { user, signOut, isPlatformAdmin, currentTenant } = useAuth();
  const { data: session } = useSession();
  
  const menuBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  
  if (!user) {
    return null;
  }
  
  // Check if this is a child account and get theme
  const isChildAccount = session?.user?.accountType === 'child';
  const themeId = session?.user?.themeId || 'child-pusheen';
  const childTheme = isChildAccount ? getChildTheme(themeId) : null;
  const serviceIcons = childTheme?.childExtras?.serviceIcons;
  const themeColors = childTheme?.colors;
  
  const handleSignOut = () => {
    const callbackUrl = isChildAccount ? '/auth/child-signin' : '/auth/signin';
    signOut({ callbackUrl });
  };
  
  return (
    <Menu>
      <MenuButton position="relative" zIndex={1200}>
        <Avatar
          size={isChildAccount ? "md" : "sm"}
          name={user.name}
          src={user.image}
          cursor="pointer"
          border={isChildAccount ? "3px solid" : "none"}
          borderColor={isChildAccount ? themeColors?.accent : "transparent"}
          boxShadow={isChildAccount ? "0 0 12px rgba(0,0,0,0.15)" : "none"}
          transition="all 0.2s"
          _hover={{
            transform: isChildAccount ? "scale(1.1)" : "scale(1.05)",
            borderColor: isChildAccount ? themeColors?.accentHover : "transparent",
          }}
        />
      </MenuButton>
      
      <MenuList 
        bg={isChildAccount ? themeColors?.backgroundSecondary : menuBg} 
        shadow="xl" 
        minW={isChildAccount ? "260px" : "220px"} 
        zIndex={1200}
        borderRadius={isChildAccount ? "2xl" : "md"}
        border={isChildAccount ? "2px solid" : "1px solid"}
        borderColor={isChildAccount ? themeColors?.accent : "gray.200"}
        overflow="hidden"
      >
        {/* User Info */}
        <VStack 
          align="start" 
          px={isChildAccount ? 5 : 4} 
          py={isChildAccount ? 4 : 3} 
          spacing={isChildAccount ? 2 : 1}
          bg={isChildAccount ? themeColors?.background : "transparent"}
        >
          <HStack spacing={2}>
            {isChildAccount && (
              <Text fontSize="2xl">{childTheme?.childExtras?.decorations?.emoji[0] || '👋'}</Text>
            )}
            <Text 
              fontWeight="bold" 
              fontSize={isChildAccount ? "lg" : "md"}
              color={isChildAccount ? themeColors?.text : "inherit"}
            >
              {user.name}
            </Text>
            {isPlatformAdmin && (
              <Badge colorScheme="orange" size="sm">
                <HStack spacing={1}>
                  <Icon as={FiShield} boxSize={3} />
                  <Text>Admin</Text>
                </HStack>
              </Badge>
            )}
          </HStack>
          {!isChildAccount && (
            <>
              <Text fontSize="sm" color="gray.500">{user.email}</Text>
              {currentTenant && (
                <Text fontSize="xs" color="gray.400">
                  {currentTenant.tenantName}
                </Text>
              )}
            </>
          )}
        </VStack>
        
        <MenuDivider borderColor={isChildAccount ? themeColors?.accent : "gray.200"} />
        
        {/* Menu Items */}
        {!isChildAccount && (
          <MenuItem
            icon={<Icon as={FiUser} />}
            as="a"
            href="/settings/profile"
            _hover={{ bg: hoverBg }}
          >
            Profile
          </MenuItem>
        )}
        
        <MenuItem
          icon={
            isChildAccount && serviceIcons?.home ? (
              <Box w={6} h={6} display="flex" alignItems="center" justifyContent="center">
                <img src={serviceIcons.home} alt="Settings" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </Box>
            ) : (
              <Icon as={FiSettings} />
            )
          }
          as="a"
          href={isChildAccount ? "/child/home" : "/settings"}
          _hover={{ bg: isChildAccount ? themeColors?.backgroundTertiary : hoverBg }}
          fontSize={isChildAccount ? "md" : "sm"}
          py={isChildAccount ? 3 : 2}
          fontWeight={isChildAccount ? "600" : "normal"}
          color={isChildAccount ? themeColors?.text : "inherit"}
        >
          {isChildAccount ? "🏠 My Dashboard" : "Settings"}
        </MenuItem>
        
        <MenuDivider borderColor={isChildAccount ? themeColors?.accent : "gray.200"} />
        
        <MenuItem
          icon={
            isChildAccount ? (
              <Text fontSize="xl">👋</Text>
            ) : (
              <Icon as={FiLogOut} />
            )
          }
          onClick={handleSignOut}
          _hover={{ bg: isChildAccount ? themeColors?.backgroundTertiary : hoverBg }}
          color={isChildAccount ? themeColors?.text : "red.500"}
          fontSize={isChildAccount ? "md" : "sm"}
          py={isChildAccount ? 3 : 2}
          fontWeight={isChildAccount ? "600" : "normal"}
        >
          {isChildAccount ? "Say Goodbye" : "Sign Out"}
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

export default UserMenu;
