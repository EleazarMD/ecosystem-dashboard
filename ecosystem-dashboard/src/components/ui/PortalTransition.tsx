import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@chakra-ui/react';

interface PortalTransitionProps {
    isActive: boolean;
    onComplete: () => void;
    color?: string;
}

export const PortalTransition: React.FC<PortalTransitionProps> = ({
    isActive,
    onComplete,
    color = '#ffffff'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);
    const [showWhiteout, setShowWhiteout] = useState(false);

    // Reset state when inactive
    useEffect(() => {
        if (!isActive) {
            setShowWhiteout(false);
        }
    }, [isActive]);

    useEffect(() => {
        if (!isActive || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Star/Particle system
        const stars: { x: number; y: number; z: number; pz: number }[] = [];
        const numStars = 800;
        const speedBase = 2;
        let speedMultiplier = 1;
        let frameCount = 0;

        // Initialize stars
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * canvas.width,
                pz: 0 // Previous z
            });
        }

        const animate = () => {
            // Clear with fade trail
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Center origin
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // Accelerate
            frameCount++;
            if (frameCount < 100) {
                speedMultiplier = 1 + (frameCount / 100) * 50; // Ramp up speed
            } else {
                speedMultiplier = 50 + ((frameCount - 100) / 50) * 100; // Warp speed
            }

            // Trigger whiteout and completion
            if (frameCount === 120) {
                setShowWhiteout(true);
            }
            if (frameCount === 150) {
                onComplete();
            }

            // Draw stars
            ctx.beginPath();
            for (let i = 0; i < numStars; i++) {
                const star = stars[i];

                // Update Z
                star.pz = star.z;
                star.z -= speedBase * speedMultiplier;

                // Reset if passed camera
                if (star.z <= 0) {
                    star.z = canvas.width;
                    star.pz = star.z;
                    star.x = Math.random() * canvas.width - canvas.width / 2;
                    star.y = Math.random() * canvas.height - canvas.height / 2;
                }

                // Project 3D to 2D
                // x' = x / z
                const x = cx + (star.x / star.z) * canvas.width;
                const y = cy + (star.y / star.z) * canvas.height;

                const px = cx + (star.x / star.pz) * canvas.width;
                const py = cy + (star.y / star.pz) * canvas.height;

                // Draw streak
                if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                    const size = (1 - star.z / canvas.width) * 4;
                    const alpha = (1 - star.z / canvas.width);

                    const whiteColor = '255, 255, 255';
                    ctx.strokeStyle = `rgba(${whiteColor}, ${alpha})`;
                    ctx.lineWidth = size;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isActive, onComplete]);

    return (
        <AnimatePresence>
            {isActive && (
                <Box
                    position="fixed"
                    top={0}
                    left={0}
                    w="100vw"
                    h="100vh"
                    zIndex={9999}
                    pointerEvents="none"
                >
                    {/* Black background fade in */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'black',
                        }}
                    />

                    {/* Canvas Layer */}
                    <motion.canvas
                        ref={canvasRef}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                        }}
                    />

                    {/* Whiteout Flash */}
                    {showWhiteout && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'white',
                            }}
                        />
                    )}
                </Box>
            )}
        </AnimatePresence>
    );
};
