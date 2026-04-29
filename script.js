/**
 * ZAAM-ASISTEN PRO ENGINE v9.5
 * Author: Gemini Adaptive AI
 * Features: Vertical Debugging, Auto-Copy, Session Persistence
 */

const App = {
    // Application State Management
    state: {
        isBusy: false,
        view: 'hero',
        logs: JSON.parse(localStorage.getItem('zaam_ultra_logs')) || []
    },

    // Reference Elements for DOM Manipulation
    dom: {
        input: document.getElementById('main-textarea'),
        btn: document.getElementById('send-btn'),
        render: document.getElementById('main-render'),
        hero: document.getElementById('hero-landing'),
        scroller: document.getElementById('chat-flow'),
        loader: document.getElementById('thinking-ui'),
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('overlayPanel'),
        history: document.getElementById('history-rail')
    },

    // Initialization Sequence
    init() {
        this.renderLogs();
        this.registerEvents();
        this.setupMarked();
        console.log("%c ZAAM-ENGINE ONLINE ", "background: #6366f1; color: #fff; font-weight: bold;");
    },

    // Setup Markdown with Feature: Code Copy Injection
    setupMarked() {
        const renderer = new marked.Renderer();
        
        // Overwrite Code Block Rendering
        renderer.code = (code, lang) => {
            const blockId = 'snippet-' + Math.random().toString(36).substr(2, 9);
            const language = lang || 'source';
            
            return `
                <div class="code-block-container">
                    <div class="code-meta">
                        <span class="lang-tag">${language}</span>
                        <button class="copy-trigger" onclick="App.copySnippet('${blockId}', this)">
                            <i class="far fa-copy"></i> Salin
                        </button>
                    </div>
                    <pre><code id="${blockId}">${this.escapeHtml(code)}</code></pre>
                </div>`;
        };

        marked.setOptions({ 
            renderer: renderer, 
            breaks: true, 
            gfm: true,
            headerIds: false,
            mangle: false 
        });
    },

    registerEvents() {
        // Desktop Send Key (Enter without Shift)
        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 1024) {
                e.preventDefault();
                this.handleAction();
            }
        });

        // Overlay handling for mobile
        this.dom.overlay.onclick = () => this.toggleSidebar();
    },

    toggleSidebar() {
        const active = this.dom.sidebar.classList.toggle('active');
        this.dom.overlay.style.display = active ? 'block' : 'none';
    },

    autoResize(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    },

    quick(prompt) {
        this.dom.input.value = prompt;
        this.autoResize(this.dom.input);
        this.handleAction();
    },

    // Feature: Copy Logic with Visual Feedback
    async copySnippet(id, btn) {
        const codeElement = document.getElementById(id);
        if (!codeElement) return;

        try {
            await navigator.clipboard.writeText(codeElement.innerText);
            
            // UI Feedback
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-green-400"></i> Tersalin';
            btn.style.borderColor = '#22c55e';
            
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.borderColor = '';
            }, 2500);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    },

    // Main Messaging Engine
    async handleAction() {
        const val = this.dom.input.value.trim();
        if (!val || this.state.isBusy) return;

        // Transition from Hero to Chat
        if (this.state.view === 'hero') {
            this.dom.hero.classList.add('hidden');
            this.dom.render.classList.remove('hidden');
            this.state.view = 'chat';
        }

        this.injectUI(val, 'user');
        this.clearInput();
        this.toggleLoading(true);

        try {
            const response = await fetch(`https://api-varhad.my.id/ai/gemini?prompt=${encodeURIComponent(val)}`);
            if (!response.ok) throw new Error('Network response fail');

            const data = await response.json();
            const aiReply = data.text || data.result || "Gagal memproses data.";

            this.injectUI(aiReply, 'ai');
            this.persist(val, aiReply);

        } catch (error) {
            this.injectUI("Koneksi ZaamAi terputus. Mohon periksa jaringan Anda atau coba kembali beberapa saat lagi.", 'ai', true);
        } finally {
            this.toggleLoading(false);
        }
    },

    injectUI(content, role, isErr = false) {
        const node = document.createElement('div');
        const isUser = role === 'user';
        
        // Debugging Vertical: node-node-column layout
        node.className = `message-node ${isUser ? 'user-node' : 'ai-node'}`;
        
        const htmlContent = isUser ? this.escapeHtml(content) : marked.parse(content);
        const icon = isUser ? 'fa-user' : 'fa-robot';

        node.innerHTML = `
            <div class="node-avatar"><i class="fas ${icon}"></i></div>
            <div class="node-bubble ${isErr ? 'text-red-400 border-red-500/20' : ''}">
                <div class="prose prose-invert prose-sm max-w-none">
                    ${htmlContent}
                </div>
            </div>
        `;

        this.dom.render.appendChild(node);
        this.autoScroll();
    },

    toggleLoading(status) {
        this.state.isBusy = status;
        this.dom.loader.classList.toggle('hidden', !status);
        this.dom.btn.disabled = status;
        this.dom.input.placeholder = status ? "Memproses kodingan..." : "Masukkan instruksi kodingan di sini...";
    },

    autoScroll() {
        this.dom.scroller.scrollTo({ top: this.dom.scroller.scrollHeight, behavior: 'smooth' });
    },

    clearInput() {
        this.dom.input.value = '';
        this.dom.input.style.height = 'auto';
    },

    persist(u, a) {
        const entry = {
            id: Date.now(),
            title: u.substring(0, 35) + '...',
            u: u,
            a: a,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.state.logs.unshift(entry);
        if (this.state.logs.length > 20) this.state.logs.pop();
        localStorage.setItem('zaam_ultra_logs', JSON.stringify(this.state.logs));
        this.renderLogs();
    },

    renderLogs() {
        this.dom.history.innerHTML = '<p class="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-8 mb-4">Riwayat Terkini</p>';
        this.state.logs.forEach(log => {
            const btn = document.createElement('div');
            btn.className = 'px-8 py-3.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer truncate transition-all border-l-2 border-transparent hover:border-indigo-500';
            btn.innerHTML = `<i class="far fa-comment-alt mr-3 text-indigo-500/50"></i> ${log.title}`;
            btn.onclick = () => this.loadLog(log);
            this.dom.history.appendChild(btn);
        });
    },

    loadLog(data) {
        this.dom.hero.classList.add('hidden');
        this.dom.render.classList.remove('hidden');
        this.dom.render.innerHTML = '';
        this.state.view = 'chat';
        this.injectUI(data.u, 'user');
        this.injectUI(data.a, 'ai');
        if (window.innerWidth < 1024) this.toggleSidebar();
    },

    newSession() {
        this.dom.render.innerHTML = '';
        this.dom.hero.classList.remove('hidden');
        this.dom.render.classList.add('hidden');
        this.state.view = 'hero';
        this.clearInput();
        if (window.innerWidth < 1024) this.toggleSidebar();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize Application
App.init();
