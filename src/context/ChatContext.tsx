import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, Message } from '../types';
import { dbService } from '../services/db';
import { useAuth } from './AuthContext';
interface ChatContextType {
  conversations: Conversation[]; activeConversation: Conversation | null; messages: Message[];
  isLoadingMessages: boolean; isOpen: boolean; error: string;
  openChatWithConversation: (id: string) => Promise<void>; openChatForClaim: (id: string) => Promise<void>;
  closeChat: () => void; sendMessage: (content: string) => Promise<void>; refreshConversations: () => Promise<void>;
}
const ChatContext = createContext<ChatContextType | undefined>(undefined);
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const userId = useRef(user?.id); userId.current = user?.id;
  const activeId = useRef<string>();
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await dbService.getConversations(user.id);
      if (userId.current === user.id) { setConversations(data); setActiveConversation((previous) => previous ? data.find((c) => c.id === previous.id) || null : null); setError(''); }
    } catch (error) { if (userId.current === user.id) setError(error instanceof Error ? error.message : 'Could not load conversations.'); }
  }, [user]);
  useEffect(() => {
    setConversations([]); setActiveConversation(null); activeId.current = undefined; setMessages([]); setIsOpen(false); setError('');
    void refreshConversations();
    const timer = setInterval(() => void refreshConversations(), 5000);
    return () => clearInterval(timer);
  }, [refreshConversations]);
  useEffect(() => {
    if (!user || !activeConversation || !isOpen) return;
    let cancelled = false;
    const load = async () => {
      setIsLoadingMessages(true);
      try {
        const data = await dbService.getMessages(activeConversation.id);
        if (!cancelled && userId.current === user.id) { setMessages(data); setError(''); }
      } catch (error) { if (!cancelled) setError(error instanceof Error ? error.message : 'Could not load messages.'); }
      finally { if (!cancelled) setIsLoadingMessages(false); }
    };
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeConversation?.id, user?.id, isOpen]);
  const open = async (id: string, byClaim = false) => {
    if (!user) return;
    try {
      const all = await dbService.getConversations(user.id);
      if (userId.current !== user.id) return;
      const target = all.find((c) => byClaim ? c.claimId === id : c.id === id);
      if (!target) throw new Error('Conversation is unavailable.');
      setConversations(all); setMessages([]); activeId.current = target.id;
      setActiveConversation(target); setIsOpen(true); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not open conversation.'); setIsOpen(true); }
  };
  const sendMessage = async (content: string) => {
    if (!user || !activeConversation) throw new Error('Open a conversation first.');
    const sent = await dbService.sendMessage(activeConversation.id, user.id, user.name, content);
    if (userId.current === user.id && activeId.current === sent.conversationId) {
      setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
      void refreshConversations();
    }
  };
  return <ChatContext.Provider value={{ conversations, activeConversation, messages, isLoadingMessages, isOpen, error,
    openChatWithConversation: (id) => open(id), openChatForClaim: (id) => open(id, true), closeChat: () => setIsOpen(false), sendMessage, refreshConversations }}>{children}</ChatContext.Provider>;
};
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
