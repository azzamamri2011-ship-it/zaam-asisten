/**
 * NANZZAI PRO - CORE ENGINE v10.0
 * Optimized for: api-varhad.my.id
 * Features: Auto-copy, Dynamic Content Detection, Smooth Scrolling
 */

const NanzzEngine = {
    // 1. KONFIGURASI STATE
    state: {
        isBusy: false,
        apiEndpoint: 'https://api-varhad.my.id/ai/gemini',
    },

    // 2. DOM SELECTORS
    dom: {
        list: document.getElementById('messages-list'),
        input: document.getElementById('user-input'),
        btn: document.getElementById('send-btn'),
        status: document.getElementById('status-bar'),
        window: document.getElementById('chat-window')
    },

    // 3. INISIALISASI
    init() {
        this.setupMarkdown();
        this.bindEvents();
        console.log("ZaamAi Pro Engine: Ready to work.");
    },

    // 4. SETUP MARKED (Dengan Tombol Salin Otomatis)
    setupMarkdown() {
        const renderer = new marked.Renderer();
        
        // Custom Rule: Menambahkan Header dan Tombol Salin pada blok kodingan
        renderer.code = (code, lang) => {
            const id = 'code-' + Math.random().toString(36).substr(2, 9);
            const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            return `
            <div class="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl">
                <div class="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                    <span class="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">${lang || 'code'}</span>
                    <button onclick="NanzzEngine.copy('${id}', this)" class="text-[10px] font-bold text-indigo-400 hover:text-white transition-all flex items-center gap-2">
                        <i class="far fa-copy"></i> Salin
                    </button>
                </div>
                <pre class="!m-0 !p-4 !bg-transparent overflow-x-auto"><code id="${id}" class="language-${lang} text-zinc-200">${escapedCode}</code></pre>
            </div>`;
        };

        marked.setOptions({ renderer, breaks: true, gfm: true });
    },

    // 5. EVENT LISTENERS
    bindEvents() {
        // Handle Enter key
        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
    },

    // 6. CORE ACTION: SEND & FETCH
    async handleSend() {
        const text = this.dom.input.value.trim();
        if (!text || this.state.isBusy) return;

        // Render Pesan User
        this.addMessage(text, 'user');
        this.dom.input.value = '';
        this.dom.input.style.height = 'auto';
        
        this.setLoading(true);

        try {
            // Fast Response Integrity (Timeout 30 detik)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.state.apiEndpoint}?prompt=${encodeURIComponent(text)}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeout);

            if (!response.ok) throw new Error("Gateway Error");

            const data = await response.json();
            
            // INTEGRITAS API: Deteksi mendalam untuk berbagai format JSON
            let finalContent = "";
            if (data && typeof data === 'object') {
                finalContent = data.text || data.result || 
                               (typeof data.result === 'object' ? data.result.text : null) ||
                               Object.values(data).find(v => typeof v === 'string') || 
                               "AI tidak memberikan respons teks.";
            } else {
                finalContent = data || "Gagal memproses data.";
            }

            this.addMessage(finalContent, 'ai');

        } catch (error) {
            let errorMsg = "Koneksi tidak stabil. Mohon coba lagi.";
            if (error.name === 'AbortError') errorMsg = "Waktu tunggu habis. Server sedang sibuk.";
            this.addMessage(errorMsg, 'error');
        } finally {
            this.setLoading(false);
        }
    },

    // 7. UI ENGINE
    addMessage(content, role) {
        const div = document.createElement('div');
        // DEBUGGING VERTICAL: Menggunakan Flex Column agar rapi ke bawah
        div.className = `flex flex-col gap-2 animate-in ${role === 'user' ? 'items-end' : 'items-start'}`;
        
        const isUser = role === 'user';
        const isError = role === 'error';
        
        const label = isUser ? 'ANDA' : (isError ? 'ERROR' : 'GEMINI');
        const labelClass = isUser ? 'text-zinc-500 mr-1' : (isError ? 'text-red-500' : 'text-indigo-400 ml-1');
        const bubbleClass = isUser 
            ? 'bg-indigo-600 text-white rounded-tr-none border-transparent' 
            : (isError ? 'bg-red-950/30 border-red-900/50 text-red-200' : 'bg-zinc-900 border-zinc-800 text-zinc-200 rounded-tl-none');

        const formattedContent = isUser ? this.escapeHtml(content) : marked.parse(content);

        div.innerHTML = `
            <div class="flex items-center gap-2 text-[10px] font-bold tracking-widest ${labelClass}">
                ${!isUser && !isError ? '<i class="fas fa-sparkles"></i>' : ''} ${label}
            </div>
            <div class="max-w-[95%] md:max-w-[85%] p-4 rounded-2xl border shadow-sm ${bubbleClass}">
                <div class="prose prose-sm md:prose-base prose-invert max-w-none">
                    ${formattedContent}
                </div>
            </div>
        `;

        this.dom.list.appendChild(div);
        this.scroll();
    },

    // 8. UTILITIES
    setLoading(isLoading) {
        this.state.isBusy = isLoading;
        this.dom.status.classList.toggle('hidden', !isLoading);
        this.dom.btn.disabled = isLoading;
        this.dom.btn.innerHTML = isLoading ? '<i class="fas fa-circle-notch animate-spin"></i>' : '<i class="fas fa-paper-plane-vertical"></i>';
    },

    scroll() {
        this.dom.window.scrollTo({ top: this.dom.window.scrollHeight, behavior: 'smooth' });
    },

    copy(id, btn) {
        const text = document.getElementById(id).innerText;
        navigator.clipboard.writeText(text).then(() => {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-green-400"></i> Tersalin';
            setTimeout(() => { btn.innerHTML = original; }, 2000);
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Hubungkan ke window agar fungsi onclick="NanzzEngine.handleSend()" bekerja
window.handleSend = () => NanzzEngine.handleSend();
// Jalankan Engine
NanzzEngine.init();
