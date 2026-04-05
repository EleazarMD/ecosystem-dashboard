/**
 * GooseMind Persona Settings Panel
 * Right panel component for managing AI persona and agent settings
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Heading,
    Text,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Badge,
    Button,
    Select,
    Divider,
    useToast,
    Spinner,
    Icon,
} from '@chakra-ui/react';
import { FiUser, FiCpu, FiSave, FiRefreshCw } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use HTTPS via Tailscale
const GOOSE_MIND_API = 'https://rtx-workstation.tailb64e64.ts.net:8031';

interface Persona {
    id: string;
    display_name: string;
    base_identity: string;
}

interface AgentSettings {
    user_id: string;
    active_persona: string;
    temperature: number;
    creativity: number;
    curiosity: number;
    verbosity: number;
    formality: number;
}

export default function GooseMindPersonaPanel() {
    const textSecondary = useSemanticToken('text.secondary');
    const bgSubtle = useSemanticToken('bg.subtle');
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [settings, setSettings] = useState<AgentSettings | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [personasRes, settingsRes] = await Promise.all([
                fetch(`${GOOSE_MIND_API}/personas`),
                fetch(`${GOOSE_MIND_API}/settings/eleazar`),
            ]);
            if (personasRes.ok) setPersonas(await personasRes.json());
            if (settingsRes.ok) setSettings(await settingsRes.json());
        } catch (error) {
            console.error('Error fetching persona data:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const saveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const response = await fetch(`${GOOSE_MIND_API}/settings/eleazar`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (response.ok) {
                toast({ title: 'Settings saved', status: 'success', duration: 2000 });
            }
        } catch (error) {
            toast({ title: 'Save failed', status: 'error', duration: 2000 });
        }
        setSaving(false);
    };

    const switchPersona = async (personaId: string) => {
        try {
            await fetch(`${GOOSE_MIND_API}/settings/eleazar/persona/${personaId}`, { method: 'POST' });
            setSettings(prev => prev ? { ...prev, active_persona: personaId } : null);
            toast({ title: `Switched to ${personaId}`, status: 'success', duration: 2000 });
        } catch (error) {
            toast({ title: 'Switch failed', status: 'error', duration: 2000 });
        }
    };

    const SliderSetting = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
        <Box>
            <HStack justify="space-between" mb={1}>
                <Text fontSize="sm">{label}</Text>
                <Badge size="sm" colorScheme="blue">{(value * 100).toFixed(0)}%</Badge>
            </HStack>
            <Slider value={value} min={0} max={1} step={0.1} onChange={onChange} size="sm">
                <SliderTrack><SliderFilledTrack bg="blue.500" /></SliderTrack>
                <SliderThumb boxSize={3} />
            </Slider>
        </Box>
    );

    if (loading) {
        return (
            <VStack py={8}><Spinner /><Text fontSize="sm">Loading...</Text></VStack>
        );
    }

    return (
        <VStack spacing={4} align="stretch" p={4}>
            <HStack>
                <Icon as={FiUser} color="blue.400" />
                <Heading size="sm">Persona Settings</Heading>
            </HStack>

            <Box>
                <Text fontSize="xs" color={textSecondary} mb={2}>Active Persona</Text>
                <Select
                    size="sm"
                    value={settings?.active_persona || ''}
                    onChange={(e) => switchPersona(e.target.value)}
                >
                    {personas.map(p => (
                        <option key={p.id} value={p.id}>{p.display_name}</option>
                    ))}
                </Select>
            </Box>

            <Divider />

            <Box>
                <HStack mb={2}>
                    <Icon as={FiCpu} color="green.400" />
                    <Text fontSize="sm" fontWeight="medium">LLM Settings</Text>
                </HStack>
                <Box p={2} bg={bgSubtle} borderRadius="md" fontSize="xs">
                    <Text><strong>Chat:</strong> Qwen3-32B (localhost:8007)</Text>
                    <Text><strong>Embeddings:</strong> NV-Embed-v2 (localhost:8006)</Text>
                </Box>
            </Box>

            <Divider />

            {settings && (
                <VStack spacing={3} align="stretch">
                    <Text fontSize="sm" fontWeight="medium">Agent Personality</Text>
                    <SliderSetting
                        label="Temperature"
                        value={settings.temperature}
                        onChange={(v) => setSettings({ ...settings, temperature: v })}
                    />
                    <SliderSetting
                        label="Creativity"
                        value={settings.creativity}
                        onChange={(v) => setSettings({ ...settings, creativity: v })}
                    />
                    <SliderSetting
                        label="Curiosity"
                        value={settings.curiosity}
                        onChange={(v) => setSettings({ ...settings, curiosity: v })}
                    />
                    <SliderSetting
                        label="Verbosity"
                        value={settings.verbosity}
                        onChange={(v) => setSettings({ ...settings, verbosity: v })}
                    />
                    <SliderSetting
                        label="Formality"
                        value={settings.formality}
                        onChange={(v) => setSettings({ ...settings, formality: v })}
                    />
                </VStack>
            )}

            <HStack>
                <Button size="sm" leftIcon={<FiSave />} colorScheme="blue" onClick={saveSettings} isLoading={saving} flex={1}>
                    Save
                </Button>
                <Button size="sm" leftIcon={<FiRefreshCw />} variant="outline" onClick={fetchData}>
                    Refresh
                </Button>
            </HStack>
        </VStack>
    );
}
