import { Message } from '../types';
export declare const useChat: () => {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    currentStreamMessage: string;
    sendMessage: (content: string) => Promise<void>;
    clearError: () => void;
    clearChat: () => void;
};
//# sourceMappingURL=useChat.d.ts.map