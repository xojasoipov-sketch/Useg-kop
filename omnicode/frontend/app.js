// OmniCode asosiy JavaScript fayli
class OmniCode {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialMessages();
    }

    setupEventListeners() {
        document.getElementById('sendButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('userInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Emoji picker bilan ishlash
        const emojiPicker = document.getElementById('emojiPicker');
        emojiPicker.addEventListener('emoji-click', event => {
            const emoji = event.detail.unicode;
            document.getElementById('userInput').value += this.addPremiumBadge(emoji);
        });
    }

    loadInitialMessages() {
        // Boshlang'ich xabarlarni yuklash
        const messages = this.getInitialMessages();
        this.displayMessages(messages);
    }

    getInitialMessages() {
        return [
            { text: "👋 Salom! Men OmniCode - mobil uchun AI dasturchi agentman.", isUser: false },
            { text: "💡 Qanday yordam bera olaman?", isUser: false },
            { text: "✨ Men kod yozish, dastroylar yaratish, va boshqa IT masalalarida yordam bera olaman! 🎉", isUser: false }
        ];
    }

    sendMessage() {
        const input = document.getElementById('userInput');
        let message = input.value.trim();

        if (message) {
            // Barcha emojilarga premium belgisini qo'shish
            message = this.addPremiumBadgesToMessage(message);
            this.addMessage(message, true);
            input.value = '';

            // AI javobini kuting
            setTimeout(() => {
                this.addMessage("🤖 Men sizning so'rovingizni qayta ishlayapman...", false);
            }, 500);
        }
    }

    addPremiumBadge(emoji) {
        // Emojiga premium belgisini qo'shish
        return `<span class="premium-emoji">${emoji}</span>`;
    }

    addPremiumBadgesToMessage(text) {
        // Matndagi barcha emojilarga premium belgisini qo'shish
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F191}-\u{1F251}\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0063}\u{E0073}\u{E0070}\u{E007F}]/gu;
        return text.replace(emojiRegex, match => this.addPremiumBadge(match));
    }

    addMessage(text, isUser) {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

        // Emojilarga premium belgisini qo'shish
        const processedText = this.addPremiumBadgesToMessage(text);

        messageDiv.innerHTML = marked.parse(processedText);
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    displayMessages(messages) {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        messages.forEach(msg => this.addMessage(msg.text, msg.isUser));
    }
}

// Dasturni ishga tushiramiz
new OmniCode();