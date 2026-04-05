import React, { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    prevX: number;
    prevY: number;
    color: string;
    opacity: number;
    speed: number;
}

interface Attractor {
    x: number;
    y: number;
    strength: number;
    radius: number;
}

interface SwarmEffectProps {
    count?: number;
    interactive?: boolean;
    color?: string;
    generativeMode?: boolean;
    cycleDuration?: number; // seconds
}

// Noise function for organic patterns
const noise2D = (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const n00 = Math.sin(X * 12.9898 + Y * 78.233) * 43758.5453;
    const n10 = Math.sin((X + 1) * 12.9898 + Y * 78.233) * 43758.5453;
    const n01 = Math.sin(X * 12.9898 + (Y + 1) * 78.233) * 43758.5453;
    const n11 = Math.sin((X + 1) * 12.9898 + (Y + 1) * 78.233) * 43758.5453;

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * v;

    return (nx0 * (1 - v) + nx1 * v) % 1;
};

export const SwarmEffect = React.memo<SwarmEffectProps>(({
    count = 2500,
    interactive = true,
    color,
    generativeMode = false,
    cycleDuration = 60, // 60 second cycles
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const particles = useRef<Particle[]>([]);
    const attractors = useRef<Attractor[]>([]);
    const mouse = useRef({ x: -1000, y: -1000 });
    const animationFrameId = useRef<number>(0);
    const dimensions = useRef({ width: 0, height: 0 });
    const timeRef = useRef<number>(0);
    const cycleStartRef = useRef<number>(0);

    const defaultColor = useSemanticToken('interactive.primary');
    const particleColor = color || defaultColor;
    const bgColor = useSemanticToken('bg.canvas');

    const colorRef = useRef(particleColor);
    const bgColorRef = useRef(bgColor);

    useEffect(() => {
        colorRef.current = particleColor;
        bgColorRef.current = bgColor;
    }, [particleColor, bgColor]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const colors = [
            '#4A90E2', '#9B59B6', '#1ABC9C', '#E74C3C', '#E91E63',
        ];

        // Generate attractors in organic patterns
        const generateAttractors = () => {
            attractors.current = [];
            const w = canvas.width;
            const h = canvas.height;

            // Choose pattern type randomly
            const patternType = Math.floor(Math.random() * 3);

            if (patternType === 0) {
                // Spiral galaxy
                const centerX = w / 2;
                const centerY = h / 2;
                const arms = 3;
                for (let i = 0; i < 30; i++) {
                    const angle = (i / 30) * Math.PI * 4;
                    const arm = i % arms;
                    const radius = (i / 30) * Math.min(w, h) * 0.4;
                    const armAngle = angle + (arm * Math.PI * 2 / arms);
                    attractors.current.push({
                        x: centerX + Math.cos(armAngle) * radius,
                        y: centerY + Math.sin(armAngle) * radius,
                        strength: 0,
                        radius: 100,
                    });
                }
            } else if (patternType === 1) {
                // Radial symmetry (mandala)
                const centerX = w / 2;
                const centerY = h / 2;
                const rings = 5;
                const pointsPerRing = 8;
                for (let ring = 0; ring < rings; ring++) {
                    const radius = ((ring + 1) / rings) * Math.min(w, h) * 0.4;
                    for (let point = 0; point < pointsPerRing; point++) {
                        const angle = (point / pointsPerRing) * Math.PI * 2;
                        attractors.current.push({
                            x: centerX + Math.cos(angle) * radius,
                            y: centerY + Math.sin(angle) * radius,
                            strength: 0,
                            radius: 80,
                        });
                    }
                }
            } else {
                // Organic noise-based pattern
                for (let i = 0; i < 40; i++) {
                    const nx = noise2D(i * 0.3, 0);
                    const ny = noise2D(i * 0.3, 100);
                    attractors.current.push({
                        x: nx * w,
                        y: ny * h,
                        strength: 0,
                        radius: 120,
                    });
                }
            }
        };

        const initParticles = () => {
            particles.current = [];
            const w = canvas.width;
            const h = canvas.height;

            for (let i = 0; i < count; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;

                particles.current.push({
                    x, y,
                    vx: 0, vy: 0,
                    prevX: x, prevY: y,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    opacity: Math.random() * 0.3 + 0.2,
                    speed: 0,
                });
            }

            if (generativeMode) {
                generateAttractors();
                cycleStartRef.current = timeRef.current;
            }
        };

        const handleResize = () => {
            if (!container) return;

            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;

            if (Math.abs(newWidth - dimensions.current.width) > 1 ||
                Math.abs(newHeight - dimensions.current.height) > 1) {

                dimensions.current = { width: newWidth, height: newHeight };
                canvas.width = newWidth;
                canvas.height = newHeight;
                initParticles();
            }
        };

        const animate = () => {
            timeRef.current += 0.005;

            // Calculate convergence progress for generative mode
            let convergence = 0;
            if (generativeMode) {
                const cycleTime = (timeRef.current - cycleStartRef.current) / cycleDuration;
                convergence = cycleTime % 1; // 0 to 1

                // Reset cycle
                if (convergence < 0.01 && cycleTime > 1) {
                    generateAttractors();
                    cycleStartRef.current = timeRef.current;
                }

                // Update attractor strengths based on convergence
                // 0-0.3: chaos, 0.3-0.7: organizing, 0.7-1.0: resolved, then fade
                const attractionPhase = Math.max(0, Math.min(1, (convergence - 0.2) / 0.6));
                const targetStrength = attractionPhase < 0.8 ? attractionPhase : (1 - (attractionPhase - 0.8) / 0.2);

                attractors.current.forEach(a => {
                    a.strength = targetStrength * 0.5;
                });
            }

            // Clear and redraw background
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = bgColorRef.current;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.globalCompositeOperation = 'lighter';

            const mouseX = mouse.current.x;
            const mouseY = mouse.current.y;

            particles.current.forEach(p => {
                p.prevX = p.x;
                p.prevY = p.y;

                // Base flow field (reduced in generative mode during convergence)
                const flowStrength = generativeMode ? (1 - convergence * 0.7) : 1;
                const noiseScale = 0.002;
                const noiseSpeed = 0.3;

                const angle = noise2D(
                    p.x * noiseScale,
                    p.y * noiseScale + timeRef.current * noiseSpeed
                ) * Math.PI * 4;

                const strength = 0.3 * flowStrength;
                p.vx += Math.cos(angle) * strength;
                p.vy += Math.sin(angle) * strength;

                // Attractor forces (generative mode)
                if (generativeMode) {
                    attractors.current.forEach(a => {
                        const dx = a.x - p.x;
                        const dy = a.y - p.y;
                        const distSq = dx * dx + dy * dy;
                        const dist = Math.sqrt(distSq);

                        if (dist < a.radius && dist > 1) {
                            const force = (1 - dist / a.radius) * a.strength;
                            p.vx += (dx / dist) * force;
                            p.vy += (dy / dist) * force;
                        }
                    });
                }

                // Mouse interaction
                if (interactive && mouseX > -100) {
                    const dx = p.x - mouseX;
                    const dy = p.y - mouseY;
                    const distSq = dx * dx + dy * dy;
                    const maxDist = 200;

                    if (distSq < maxDist * maxDist) {
                        const dist = Math.sqrt(distSq);
                        const force = (1 - dist / maxDist) * 5;
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                    }
                }

                // Damping
                p.vx *= 0.85;
                p.vy *= 0.85;

                p.x += p.vx;
                p.y += p.vy;

                p.speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

                // Wrap edges
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Draw
                const trailLength = Math.min(p.speed * 2, 10);

                if (trailLength > 0.5) {
                    const angle = Math.atan2(p.vy, p.vx);
                    const endX = p.x - Math.cos(angle) * trailLength;
                    const endY = p.y - Math.sin(angle) * trailLength;

                    const r = parseInt(p.color.substr(1, 2), 16);
                    const g = parseInt(p.color.substr(3, 2), 16);
                    const b = parseInt(p.color.substr(5, 2), 16);

                    const gradient = ctx.createLinearGradient(p.x, p.y, endX, endY);
                    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.opacity})`);
                    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.8})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    const r = parseInt(p.color.substr(1, 2), 16);
                    const g = parseInt(p.color.substr(3, 2), 16);
                    const b = parseInt(p.color.substr(5, 2), 16);

                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.globalCompositeOperation = 'source-over';
            animationFrameId.current = requestAnimationFrame(animate);
        };

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.current.x = e.clientX - rect.left;
            mouse.current.y = e.clientY - rect.top;
        };

        const onMouseLeave = () => {
            mouse.current.x = -1000;
            mouse.current.y = -1000;
        };

        window.addEventListener('resize', handleResize);
        if (interactive) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseleave', onMouseLeave);
        }

        handleResize();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (interactive) {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseleave', onMouseLeave);
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [count, interactive, generativeMode, cycleDuration]);

    return (
        <Box
            ref={containerRef}
            position="absolute"
            top={0}
            left={0}
            w="full"
            h="full"
            pointerEvents="none"
            zIndex={0}
            overflow="hidden"
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </Box>
    );
});
