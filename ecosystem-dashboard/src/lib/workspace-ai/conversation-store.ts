import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'workspace-ai-conversations.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    metadata?: any;
}

export interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages: Message[];
    config?: any;
}

class ConversationStore {
    private getConversations(): Conversation[] {
        if (!fs.existsSync(CONVERSATIONS_FILE)) {
            return [];
        }
        try {
            const data = fs.readFileSync(CONVERSATIONS_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading conversations file:', error);
            return [];
        }
    }

    private saveConversations(conversations: Conversation[]) {
        fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
    }

    getAll(): Conversation[] {
        return this.getConversations().sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }

    getById(id: string): Conversation | null {
        const conversations = this.getConversations();
        return conversations.find(c => c.id === id) || null;
    }

    create(title: string, config?: any): Conversation {
        const conversations = this.getConversations();
        const newConversation: Conversation = {
            id: uuidv4(),
            title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: [],
            config
        };

        conversations.push(newConversation);
        this.saveConversations(conversations);
        return newConversation;
    }

    addMessage(conversationId: string, message: Omit<Message, 'created_at'>): Message {
        const conversations = this.getConversations();
        const conversationIndex = conversations.findIndex(c => c.id === conversationId);

        if (conversationIndex === -1) {
            throw new Error('Conversation not found');
        }

        const newMessage: Message = {
            ...message,
            created_at: new Date().toISOString()
        };

        conversations[conversationIndex].messages.push(newMessage);
        conversations[conversationIndex].updated_at = new Date().toISOString();

        this.saveConversations(conversations);
        return newMessage;
    }

    update(id: string, updates: Partial<Conversation>): Conversation | null {
        const conversations = this.getConversations();
        const index = conversations.findIndex(c => c.id === id);

        if (index === -1) return null;

        conversations[index] = {
            ...conversations[index],
            ...updates,
            updated_at: new Date().toISOString()
        };

        this.saveConversations(conversations);
        return conversations[index];
    }

    delete(id: string): boolean {
        let conversations = this.getConversations();
        const initialLength = conversations.length;
        conversations = conversations.filter(c => c.id !== id);

        if (conversations.length !== initialLength) {
            this.saveConversations(conversations);
            return true;
        }
        return false;
    }
}

export const conversationStore = new ConversationStore();
