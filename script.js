/**
 * ZAAM-ASISTEN ULTRA ENGINE v10.5
 * Build: Stable - Enterprise Grade
 * Fix: Button Not Responding, Vertical Layout Debugging, Auto-Copy Integration
 */

const ZaamEngine = {
    // 1. STATE MANAGEMENT
    state: {
        isBusy: false,
        view: 'welcome',
        history: JSON.parse(localStorage.getItem('zaam_ultra_data')) || [],
        apiEndpoint: 'https://api-varhad.my.id/ai/gemini',
        sessionStartTime: Date.now()
    },

    // 2. DOM SELECTORS (Pastikan ID di HTML Sesuai)
    dom: {
        input: document.getElementById('user-input'),
        sendBtn: document.getElementById('send-btn'),
        chatFlow: document.getElementById('chat-flow'),
        chatContainer: document.getElementById('chat-container'),
        welcomeUI: document.getElementById('welcome-ui'),
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('overlay'),
        historyList: document.getElementById('history-list'),
        loader: null // Akan dibuat dinamis jika perlu
    },

    // 3. INITIALIZATION
    init() {
        console.log("Zaam Engine v10.5: Booting...");
        
        try {
            this.setupMarked();
            this.renderHistory();
            this.registerEventListeners();
            this.checkConnection();
            console.log("Zaam Engine: Active & Functional.");
        } catch (error) {
            console.error("Critical Failure during Init:", error);
        }
    },

    // 4. MARKED.JS CONFIGURATION (Fitur Tombol Salin)
    setupMarked() {
        if (typeof marked === 'undefined') {
            console.error("Marked.js not found! Fitur kodingan tidak akan maksimal.");
            return;
        }

        const renderer = new marked.Renderer();

        // Custom Rule untuk blok kode agar ada tombol salin
        renderer.code = (code, lang) => {
            const codeId = 'snippet-' + Math.random().toString(36).substr(2, 9);
            const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            return `
            <div class="code-wrap my-4 rounded-xl border border-white/10 bg-[#0d1117] overflow-hidden shadow-2xl">
                <div class="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-red-500"></span>
                        <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span class="w-2 h-2 rounded-full bg-green-500"></span>
                        <span class="ml-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">${lang || 'code'}</span>
                    </div>
                    <button onclick="ZaamEngine.copyToClipboard('${codeId}', this)" 
                            class="flex items-center gap-2 text-[11px] font-bold text-indigo-400 hover:text-white transition-colors py-1 px-2 rounded hover:bg-indigo-600/20">
                        <i class="far fa-copy"></i> <span>Salin Kode</span>
                    </button>
                </div>
                <pre class="p-4 overflow-x-auto leading-relaxed"><code id="${codeId}" class="language-${lang} text-sm font-mono text-indigo-100">${escapedCode}</code></pre>
            </div>`;
        };

        marked.setOptions({
            renderer: renderer,
            highlight: function(code, lang) {
                return code; // Syntax highlighting bisa ditambahkan via Prism.js/Highlight.js
            },
            pedantic: false,
            gfm: true,
            breaks: true,
            sanitize: false,
            smartLists: true,
            smartypants: false,
            xhtml: false
        });
    },

    // 5. EVENT LISTENERS
    registerEventListeners() {
        // Tombol Kirim Click
        if (this.dom.sendBtn) {
            this.dom.sendBtn.addEventListener('click', () => this.handleChatSubmission());
        }

        // Input Keyboard (Enter)
        if (this.dom.input) {
            this.dom.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleChatSubmission();
                }
            });
        }

        // Overlay & Sidebar
        if (this.dom.overlay) {
            this.dom.overlay.addEventListener('click', () => this.toggleSidebar());
        }

        // Window Resize Handling
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024 && this.dom.sidebar.classList.contains('active')) {
                this.toggleSidebar();
            }
        });
    },

    // 6. CORE FUNCTIONALITIES
    toggleSidebar() {
        const isActive = this.dom.sidebar.classList.toggle('active');
        if (this.dom.overlay) {
            this.dom.overlay.style.display = isActive ? 'block' : 'none';
        }
    },

    autoResize(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = newHeight + 'px';
    },

    async handleChatSubmission() {
        const prompt = this.dom.input.value.trim();
        if (!prompt || this.state.isBusy) return;

        // Switch View
        if (this.state.view === 'welcome') {
            this.dom.welcomeUI.style.display = 'none';
            this.dom.chatContainer.classList.remove('hidden');
            this.state.view = 'chat';
        }

        // 1. Render User Message
        this.appendMessage(prompt, 'user');
        this.dom.input.value = '';
        this.autoResize(this.dom.input);
        
        // 2. Start Loading
        this.setLoadingState(true);

        // 3. Fetch Data
        try {
            const timeout = new AbortController();
            const id = setTimeout(() => timeout.abort(), 30000); // 30 detik timeout

            const response = await fetch(`${this.state.apiEndpoint}?prompt=${encodeURIComponent(prompt)}`, {
                signal: timeout.signal
            });
            
            clearTimeout(id);

            if (!response.ok) throw new Error("Server Response Not OK");

            const data = await response.json();
            const aiReply = data.text || data.result || "Maaf, sistem tidak memberikan respons teks.";

            // 4. Render AI Message
            this.appendMessage(aiReply, 'ai');
            this.saveToLocal(prompt, aiReply);

        } catch (error) {
            console.error("Chat Error:", error);
            let errMsg = "Koneksi terputus atau server sibuk. Mohon coba lagi.";
            if (error.name === 'AbortError') errMsg = "Permintaan terlalu lama (Timeout). Gunakan prompt yang lebih singkat.";
            
            this.appendMessage(errMsg, 'ai', true);
        } finally {
            this.setLoadingState(false);
        }
    },

    // 7. UI RENDERING
    appendMessage(content, role, isError = false) {
        const msgNode = document.createElement('div');
        
        // FIX: DEBUGGING VERTICAL (Layout Ke Bawah)
        msgNode.className = `msg-node flex flex-col ${role === 'user' ? 'items-end' : 'items-start'} w-full`;
        
        const isUser = role === 'user';
        const formattedContent = isUser ? this.escapeHTML(content) : marked.parse(content);

        msgNode.innerHTML = `
            <div class="flex items-center gap-2 mb-2 ${isUser ? 'flex-row-reverse' : ''}">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shadow-lg 
                    ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}">
                    <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
                </div>
                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${isUser ? 'Client' : 'Zaam Intelligence'}</span>
            </div>
            <div class="bubble p-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300
                ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#161b22] border border-white/5 rounded-tl-none'}
                ${isError ? 'border-red-500/50 text-red-400 bg-red-500/5' : ''}
                max-w-[95%] sm:max-w-[85%]">
                <div class="prose prose-invert prose-sm max-w-none break-words">
                    ${formattedContent}
                </div>
            </div>
        `;

        this.dom.chatContainer.appendChild(msgNode);
        this.scrollToBottom();
    },

    scrollToBottom() {
        this.dom.chatFlow.scrollTo({
            top: this.dom.chatFlow.scrollHeight,
            behavior: 'smooth'
        });
    },

    setLoadingState(loading) {
        this.state.isBusy = loading;
        this.dom.sendBtn.disabled = loading;
        this.dom.sendBtn.innerHTML = loading ? '<i class="fas fa-circle-notch animate-spin"></i>' : '<i class="fas fa-paper-plane"></i>';
        this.dom.input.placeholder = loading ? "Sedang memproses instruksi..." : "Tanyakan sesuatu pada Zaam...";
    },

    // 8. UTILS & FEATURES
    copyToClipboard(elementId, btn) {
        const text = document.getElementById(elementId).innerText;
        
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-green-400"></i> <span class="text-green-400">Tersalin</span>';
            btn.classList.add('bg-green-500/10');
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('bg-green-500/10');
            }, 2500);
        }).catch(err => {
            console.error("Gagal menyalin:", err);
        });
    },

    saveToLocal(user, ai) {
        const session = {
            id: Date.now(),
            title: user.substring(0, 35) + (user.length > 35 ? '...' : ''),
            userPrompt: user,
            aiResponse: ai,
            timestamp: new Date().toISOString()
        };

        this.state.history.unshift(session);
        if (this.state.history.length > 15) this.state.history.pop();
        
        localStorage.setItem('zaam_ultra_data', JSON.stringify(this.state.history));
        this.renderHistory();
    },

    renderHistory() {
        if (!this.dom.historyList) return;
        
        this.dom.historyList.innerHTML = '';
        
        if (this.state.history.length === 0) {
            this.dom.historyList.innerHTML = '<p class="px-4 text-[11px] text-slate-600 font-bold italic">Belum ada riwayat...</p>';
            return;
        }

        this.state.history.forEach(item => {
            const btn = document.createElement('button');
            btn.className = "w-full text-left p-3 text-[12px] text-slate-400 hover:bg-indigo-600/10 hover:text-indigo-400 rounded-xl transition-all flex items-center gap-3 group";
            btn.innerHTML = `
                <i class="far fa-comment-alt group-hover:scale-110 transition-transform"></i>
                <span class="truncate flex-1">${item.title}</span>
            `;
            btn.onclick = () => this.loadSession(item);
            this.dom.historyList.appendChild(btn);
        });
    },

    loadSession(data) {
        this.dom.welcomeUI.style.display = 'none';
        this.dom.chatContainer.classList.remove('hidden');
        this.dom.chatContainer.innerHTML = ''; // Reset View
        this.state.view = 'chat';
        
        this.appendMessage(data.userPrompt, 'user');
        this.appendMessage(data.aiResponse, 'ai');
        
        if (window.innerWidth < 1024) this.toggleSidebar();
    },

    quickChat(prompt) {
        this.dom.input.value = prompt;
        this.autoResize(this.dom.input);
        this.handleChatSubmission();
    },

    newChat() {
        location.reload(); // Cara termudah untuk reset total state
    },

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    checkConnection() {
        if (!navigator.onLine) {
            alert("Koneksi Internet Terputus. Zaam mungkin tidak merespons.");
        }
    }
};

// 9. BOOTSTRAP
document.addEventListener('DOMContentLoaded', () => {
    ZaamEngine.init();
});

// Shortcut Global untuk elemen HTML (karena dipanggil via onclick)
window.App = ZaamEngine; 
