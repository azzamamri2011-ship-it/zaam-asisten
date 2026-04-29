/**
 * ZAAM-CORE v9.8 (ULTRA STABLE)
 * Fix: Vertical Debugging & Auto-Copy Button
 */

const Engine = {
    state: {
        isBusy: false,
        view: 'hero',
        chats: JSON.parse(localStorage.getItem('zaam_pro_v8')) || []
    },

    dom: {
        input: document.getElementById('user-prompt'),
        submitBtn: document.getElementById('send-trigger'),
        msgCont: document.getElementById('message-container'),
        heroView: document.getElementById('hero-view'),
        scroller: document.getElementById('chat-viewport'),
        loading: document.getElementById('typing-indicator'),
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('sideOverlay'),
        history: document.getElementById('history-container')
    },

    init() {
        this.renderHistory();
        this.bindEvents();
        this.setupMarked(); // Konfigurasi tombol salin otomatis
    },

    setupMarked() {
        const renderer = new marked.Renderer();
        
        // FEATURE: Injeksi Tombol Salin pada setiap blok kode
        renderer.code = (code, lang) => {
            const id = 'code-' + Math.random().toString(36).substr(2, 9);
            return `
                <div class="relative group my-4 rounded-xl overflow-hidden border border-white/10">
                    <div class="flex justify-between items-center bg-[#0d1117] px-4 py-2 border-b border-white/5">
                        <span class="text-[10px] font-bold text-indigo-400 uppercase">${lang || 'code'}</span>
                        <button onclick="Engine.copy('${id}')" class="text-[10px] bg-white/5 hover:bg-indigo-600 px-3 py-1 rounded-md transition-all flex items-center gap-2">
                            <i class="far fa-copy"></i> Salin
                        </button>
                    </div>
                    <pre class="!m-0 !bg-[#010409]"><code id="${id}" class="language-${lang}">${this.sanitize(code)}</code></pre>
                </div>`;
        };

        marked.setOptions({ renderer, breaks: true, gfm: true });
    },

    // FEATURE: Fungsi Salin Instan
    copy(id) {
        const text = document.getElementById(id).innerText;
        navigator.clipboard.writeText(text).then(() => {
            const btn = event.currentTarget;
            btn.innerHTML = '<i class="fas fa-check text-green-400"></i> Tersalin!';
            setTimeout(() => { btn.innerHTML = '<i class="far fa-copy"></i> Salin'; }, 2000);
        });
    },

    async submit() {
        const text = this.dom.input.value.trim();
        if (!text || this.state.isBusy) return;

        if (this.state.view === 'hero') {
            this.dom.heroView.classList.add('hidden');
            this.dom.msgCont.classList.remove('hidden');
            this.state.view = 'chat';
        }

        this.appendMessage(text, 'user');
        this.clearInput();
        this.toggleLoading(true);

        try {
            // Optimasi Fast Response dengan Timeout
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20000); 

            const response = await fetch(`https://api-varhad.my.id/ai/gemini?prompt=${encodeURIComponent(text)}`, { signal: controller.signal });
            clearTimeout(timer);

            if (!response.ok) throw new Error();
            const data = await response.json();
            const aiReply = data.text || data.result || "Gagal mengambil data.";

            this.appendMessage(aiReply, 'ai');
            this.updateHistory(text, aiReply);

        } catch (error) {
            // Penanganan error agar tidak seperti gambar
            this.appendMessage("Koneksi ZaamAi terganggu. Sedang mencoba menyambungkan kembali...", 'ai', true);
        } finally {
            this.toggleLoading(false);
        }
    },

    appendMessage(content, role, isError = false) {
        const wrapper = document.createElement('div');
        
        // DEBUGGING: Forced Vertical Layout (Ke Bawah)
        // Menghapus flex-row-reverse agar chat konsisten menumpuk ke bawah
        wrapper.className = `msg-entry flex flex-col ${role === 'user' ? 'items-end' : 'items-start'} gap-2 w-full mb-6`;

        const isUser = role === 'user';
        const body = isUser ? this.sanitize(content) : marked.parse(content);

        wrapper.innerHTML = `
            <div class="flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] ${isUser ? 'bg-slate-700' : 'bg-indigo-600'}">
                    <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
                </div>
                <span class="text-[10px] font-bold text-slate-500 uppercase">${isUser ? 'Anda' : 'Zaam AI'}</span>
            </div>
            <div class="bubble-ui ${isUser ? 'bg-indigo-600' : 'bg-[#161b22] border border-white/10'} p-4 rounded-2xl max-w-full overflow-hidden">
                <div class="prose prose-invert prose-sm max-w-none break-words">
                    ${body}
                </div>
            </div>
        `;

        this.dom.msgCont.appendChild(wrapper);
        this.scroll();
    },

    // Fungsi pembantu lainnya tetap sama namun lebih bersih
    bindEvents() { /* ... kode bindEvents Anda ... */ },
    toggleSidebar() { /* ... kode sidebar Anda ... */ },
    resizeInput(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; },
    toggleLoading(status) { this.state.isBusy = status; this.dom.loading.classList.toggle('hidden', !status); },
    clearInput() { this.dom.input.value = ''; this.dom.input.style.height = 'auto'; },
    scroll() { this.dom.scroller.scrollTo({ top: this.dom.scroller.scrollHeight, behavior: 'smooth' }); },
    sanitize(s) { const t = document.createElement('div'); t.textContent = s; return t.innerHTML; },
    renderHistory() { /* ... kode renderHistory Anda ... */ },
    updateHistory(u, a) { /* ... kode updateHistory Anda ... */ }
};

Engine.init();
