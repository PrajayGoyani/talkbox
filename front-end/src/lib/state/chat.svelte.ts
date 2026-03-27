export type Message = {
    id: string;
    contentBody: string;
    senderId: string;
    createdAt: Date;
};

// Global Store built using Svelte 5 Runes
export class ChatStore {
    messages: Message[] = $state([]);
    hasMoreTop: boolean = $state(true);
    hasMoreBottom: boolean = $state(false);
    showJumpToBottom: boolean = $state(false);

    readonly MAX_MESSAGES = 100;

    constructor() {
        // Init empty
    }

    addMessage(msg: Message) {
        // If we're not at the bottom of the scroll, we might not want to append 
        // immediately but instead show "Jump to latest". For simulation:
        this.messages.push(msg);

        // Keep bounds
        if (this.messages.length > this.MAX_MESSAGES) {
            this.messages.shift(); // remove oldest to keep 100 window
            this.hasMoreTop = true;
        }
    }

    async loadOlderMessages() {
        if (!this.hasMoreTop) return;
        
        // Mock fetch older messages
        console.log("Fetching older messages for pagination...");
        const newOldPkts: Message[] = []; // pretend we fetched 50

        this.messages = [...newOldPkts, ...this.messages];

        if (this.messages.length > this.MAX_MESSAGES) {
            // Trim from bottom because we are scrolling up
            this.messages = this.messages.slice(0, this.MAX_MESSAGES);
            this.hasMoreBottom = true; 
        }
    }

    async jumpToLatest() {
        // Clear historical buffer and load newest window
        this.messages = [];
        console.log("Jumped to latest. Clearing buffer and fetching latest 100...");
        
        // Mock fetch latest 100
        this.hasMoreBottom = false;
        this.hasMoreTop = true;
        this.showJumpToBottom = false;
    }
}

export const chatStore = new ChatStore();
