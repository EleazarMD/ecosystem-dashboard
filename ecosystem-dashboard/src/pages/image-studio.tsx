import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { Box, Flex } from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ImageStudioSidebar } from '@/components/image-studio/ImageStudioSidebar';
import { ImageGenerationPanel } from '@/components/image-studio/ImageGenerationPanel';
import { ImageEditingPanel } from '@/components/image-studio/ImageEditingPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { ImageStudioProvider, useImageStudio } from '@/contexts/ImageStudioContext';
import { GalleryView } from '@/components/image-studio/GalleryView';
import { CollectionsView } from '@/components/image-studio/CollectionsView';
import { RecentPromptsView } from '@/components/image-studio/RecentPromptsView';
import { FavoritesView } from '@/components/image-studio/FavoritesView';

const ImageStudioContent = () => {
    const bgGradient = useSemanticToken('background.gradient.subtle');
    const { setIsOpen, setContext, setCustomData } = useRightPanel();
    const { activeView } = useImageStudio();
    const [isPremium, setIsPremium] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Fetch user subscription status and role
    useEffect(() => {
        const fetchUserAccess = async () => {
            try {
                const [subRes, userRes] = await Promise.all([
                    fetch('/api/user/subscription'),
                    fetch('/api/auth/me')
                ]);
                
                if (subRes.ok) {
                    const data = await subRes.json();
                    // Premium tiers: pro, enterprise, or adult
                    setIsPremium(data.tier === 'pro' || data.tier === 'enterprise' || data.tier === 'adult');
                }
                
                if (userRes.ok) {
                    const userData = await userRes.json();
                    // Admin and user accounts get edit access
                    setIsAdmin(userData.role === 'admin' || userData.role === 'user');
                }
            } catch (error) {
                console.error('Failed to fetch user access:', error);
            }
        };
        fetchUserAccess();
    }, []);

    // Set image-studio context on mount only
    useEffect(() => {
        setContext('image-studio');
    }, [setContext]);

    // Update custom data when activeView changes (without forcing panel open)
    useEffect(() => {
        setCustomData({ activeTab: activeView });
    }, [setCustomData, activeView]);

    // Render content based on activeView from sidebar
    const renderMainContent = () => {
        // Check if user has access to edit features (premium or admin/user role)
        const hasEditAccess = isPremium || isAdmin;
        
        switch (activeView) {
            case 'generate':
                return <ImageGenerationPanel />;
            case 'edit':
                return <ImageEditingPanel isPremium={hasEditAccess} />;
            case 'gallery':
                return <GalleryView />;
            case 'collections':
                return <CollectionsView />;
            case 'recent':
                return <RecentPromptsView />;
            case 'favorites':
                return <FavoritesView />;
            default:
                return <ImageGenerationPanel />;
        }
    };

    return (
        <DashboardLayout>
            <Head>
                <title>Image Studio | AI Homelab</title>
            </Head>

            <Flex h="calc(100vh - 64px)" overflow="hidden" gap={4}>
                {/* Left Sidebar */}
                <ImageStudioSidebar />

                {/* Main Content */}
                <Box flex={1} minW="0" overflow="hidden">
                    {renderMainContent()}
                </Box>
            </Flex>
        </DashboardLayout>
    );
};

const ImageStudioPage = () => {
    return (
        <ImageStudioProvider>
            <ImageStudioContent />
        </ImageStudioProvider>
    );
};

export default ImageStudioPage;

// Server-side account tenancy check - redirect child accounts to child art studio
export { getServerSideProps } from '@/lib/adult-page-guard';
