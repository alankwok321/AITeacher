export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  image?: {
    mimeType: string;
    data: string; // Base64 representation
  };
  sources?: Array<{ title: string; uri: string }>;
  audioUrl?: string; // Cache generated speech
  isSpeaking?: boolean;
}

export interface ChatPersonality {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  icon: string; // Lucide Icon string e.g., 'Sparkles', 'Code', etc.
  color: string; // Tailwind color classes for icons
  accentColor: string; // Tailwind color classes for buttons
}

export interface ChatSession {
  id: string;
  title: string;
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerPhotoURL?: string;
  messages: Message[];
  personalityId: string;
  useSearch: boolean;
  createdAt: string;
  voiceId: string; // 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'
}

export interface Textbook {
  id: string;
  name: string;
  uploadedAt: string;
  uploadedBy: string;
  totalChars: number;
}

export interface TextbookContent {
  id: string;
  chunks: string[];
}

