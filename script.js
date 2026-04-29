/**
 * ZAAM-CORE v9.7 (STABLE EDITION)
 * Logika Fast-Response & Anti-Connection Drop
 */

const Core = {
    state: {
        isProcessing: false,
        view: 'welcome',
        history: JSON.parse(localStorage.getItem('zaam_stable_v9')) || []
    },

    dom: {
        input: document.getElementById('user-input'),
        btn: document.getElementById('send-trigger'),
        list: document.getElementById('message-list'),
        welcome: document.getElementById('welcome-view'),
        loader: document.getElementById('loading-state'),
        scroller: document.getElementById('chat-scroller'),
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('uiOverlay'),
        historyList: document.getElementById('history-container')
    },

    init() {
        this.renderHistory();
        this.setupMarkdown();
        this.bindEvents();
    },

    setupMarkdown() {
        const renderer = new marked.Renderer();
        renderer.code = (code, lang) => {
            const id = 'code-' + Math.random().toString(36).substr(2, 9);
            return `
                <div class="code-container">
                    <div class="code-header">
                        <span class="lang-label">${lang || 'code'}</span>
                        <button class="copy-btn" onclick="Core.copyText('${id}', this)">
                            <i class="far fa-copy"></i> Salin
                        </button>
                    </div>
                    <pre><code id="${id}">${this.escape(code)}</code></pre>
                </div>`;
        };
        marked.setOptions({ renderer, breaks: true, gfm: true });
    },

    bindEvents() {
        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 1024) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.dom.overlay.onclick = () => this.toggleSidebar();
    },

    toggleSidebar() {
        const active = this.dom.sidebar.classList.toggle('active');
        this.dom.overlay.style.display = active ? 'block' : 'none';
    },

    resize(el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    },

    async sendMessage() {
        const text = this.dom.input.value.trim();
        if (!text || this.state.isProcessing) return;

        if (this.state.view === 'welcome') {
            this.dom.welcome.classList.add('hidden');
            this.dom.list.classList.remove('hidden');
            this.state.view = 'chat';
        }

        this.appendUI(text, 'user');
        this.dom.input.value = '';
        this.dom.input.style.height = 'auto';
        this.setLoading(true);

        // --- FAST RESPONSE FETCH LOGIC ---
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 detik timeout

            const response = await fetch(`https://api-varhad.my.id/ai/gemini?prompt=${encodeURIComponent(text)}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error("Server Sibuk");

            const data = await response.json();
            const reply = data.text || data.result || "Gagal mendapatkan respons valid.";

            this.appendUI(reply, 'ai');
            this.saveHistory(text, reply);

        } catch (error) {
            let errorMsg = "Koneksi tidak stabil. Saya akan mencoba menyambungkan ulang...";
            if (error.name === 'AbortError') errorMsg = "Server memakan waktu terlalu lama. Coba kirim ulang pesan singkat.";
            
            this.appendUI(errorMsg, 'ai', true);
        } finally {
            this.setLoading(false);
        }
    },

    appendUI(content, role, isError = false) {
        const node = document.createElement('div');
        node.className = `msg-entry ${role === 'user' ? 'user-node' : 'ai-node'}`;
        
        const isUser = role === 'user';
        const body = isUser ? this.escape(content) : marked.parse(content);

        node.innerHTML = `
            <div class="node-info">
                <div class="avatar"><i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i></div>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${isUser ? 'Anda' : 'Zaam AI'}</span>
            </div>
            <div class="bubble ${isError ? 'border-red-500/30 text-red-400 bg-red-500/5' : ''}">
                <div class="prose prose-invert prose-sm max-w-none">
                    ${body}
                </div>
            </div>
        `;

        this.dom.list.appendChild(node);
        this.scroll();
    },

    copyText(id, btn) {
        const code = document.getElementById(id).innerText;
        navigator.clipboard.writeText(code).then(() => {
            const old = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-green-400"></i> Tersalin';
            setTimeout(() => btn.innerHTML = old, 2000);
        });
    },

    saveHistory(u, a) {
        const session = { id: Date.now(), title: u.substring(0, 30) + '...', u, a };
        this.state.history.unshift(session);
        if (this.state.history.length > 15) this.state.history.pop();
        localStorage.setItem('zaam_stable_v9', JSON.stringify(this.state.history));
        this.renderHistory();
    },

    renderHistory() {
        this.dom.historyList.innerHTML = '<p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-8 mb-4">Percakapan Terakhir</p>';
        this.state.history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'px-8 py-3 text-xs text-slate-400 hover:bg-white/5 cursor-pointer truncate transition-all';
            div.innerHTML = `<i class="far fa-comment-dots mr-3 text-indigo-500"></i> ${item.title}`;
            div.onclick = () => {
                this.dom.welcome.classList.add('hidden');
                this.dom.list.classList.remove('hidden');
                this.dom.list.innerHTML = '';
                this.state.view = 'chat';
                this.appendUI(item.u, 'user');
                this.appendUI(item.a, 'ai');
                if (window.innerWidth < 1024) this.toggleSidebar();
            };
            this.dom.historyList.appendChild(div);
        });
    },

    setLoading(s) {
        this.state.isProcessing = s;
        this.dom.loader.classList.toggle('hidden', !s);
        this.dom.btn.disabled = s;
    },

    scroll() {
        this.dom.scroller.scrollTo({ top: this.dom.scroller.scrollHeight, behavior: 'smooth' });
    },

    reset() { location.reload(); },

    escape(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }
};

Core.init();
