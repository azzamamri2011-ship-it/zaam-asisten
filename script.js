/**
 * ZAAM ENGINE PRO v9.5 - CORE LOGIC
 * Fokus: Fungsionalitas Tombol Kirim, Sesi Baru, dan Sidebar.
 */

const App = {
    // 1. STATE MANAGEMENT
    state: {
        isBusy: false,
        view: 'hero', // 'hero' atau 'chat'
        history: JSON.parse(localStorage.getItem('zaam_session_v95')) || [],
        apiURL: 'https://api-varhad.my.id/ai/gemini'
    },

    // 2. INITIALIZATION
    init() {
        console.log("Zaam Engine v9.5: Sinkronisasi Berhasil.");
        this.setupMarked();
        this.renderHistory();
        this.bindEvents();
    },

    // 3. EVENT LISTENERS (Tombol & Keyboard)
    bindEvents() {
        const input = document.getElementById('main-textarea');
        const overlay = document.getElementById('overlayPanel');

        // Mengirim pesan via tombol Enter (Kecuali Shift+Enter)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 1024) {
                e.preventDefault();
                this.handleAction();
            }
        });

        // Menutup sidebar saat klik area gelap (Overlay)
        overlay.onclick = () => this.toggleSidebar();
    },

    // 4. CORE FUNCTION: MENGIRIM PESAN
    async handleAction() {
        const input = document.getElementById('main-textarea');
        const prompt = input.value.trim();

        // Validasi: Tidak boleh kosong atau saat AI sedang berpikir
        if (!prompt || this.state.isBusy) return;

        // Berpindah dari tampilan awal (Hero) ke tampilan Chat
        if (this.state.view === 'hero') {
            document.getElementById('hero-landing').classList.add('hidden');
            document.getElementById('main-render').classList.remove('hidden');
            this.state.view = 'chat';
        }

        // Tampilkan pesan Anda di layar
        this.appendMessage(prompt, 'user');
        input.value = '';
        this.autoResize(input);

        // Aktifkan indikator loading
        this.setLoading(true);

        try {
            // Ambil data dari API dengan timeout 25 detik
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 25000);

            const response = await fetch(`${this.state.apiURL}?prompt=${encodeURIComponent(prompt)}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeout);

            if (!response.ok) throw new Error("Server Error");

            const data = await response.json();
            const reply = data.text || data.result || "Maaf, sistem tidak merespons.";

            // Tampilkan balasan AI
            this.appendMessage(reply, 'ai');
            this.saveToHistory(prompt, reply);

        } catch (error) {
            let msg = "Koneksi ZaamAi terputus. Mohon periksa jaringan Anda.";
            if (error.name === 'AbortError') msg = "Waktu habis (Timeout). Gunakan prompt yang lebih pendek.";
            this.appendMessage(msg, 'ai', true);
        } finally {
            this.setLoading(false);
        }
    },

    // 5. UI RENDERING ENGINE
    appendMessage(content, role, isError = false) {
        const container = document.getElementById('main-render');
        const node = document.createElement('div');
        
        // Layout Vertikal sesuai CSS .message-node
        node.className = `message-node ${role === 'ai' ? 'ai-node' : 'user-node'}`;

        const isAI = role === 'ai';
        const bodyHTML = isAI ? marked.parse(content) : `<p>${this.sanitize(content)}</p>`;

        node.innerHTML = `
            <div class="node-avatar">
                <i class="fas ${isAI ? 'fa-robot' : 'fa-user'}"></i>
            </div>
            <div class="node-bubble shadow-lg ${isError ? 'border-red-500/30 text-red-400 bg-red-500/5' : ''}">
                <div class="prose prose-invert prose-sm max-w-none">
                    ${bodyHTML}
                </div>
            </div>
        `;

        container.appendChild(node);
        this.scrollToBottom();
    },

    // 6. SIDEBAR & SESSION CONTROL
    toggleSidebar() {
        const side = document.getElementById('sidebar');
        const over = document.getElementById('overlayPanel');
        const isActive = side.classList.toggle('active');
        
        // Sidebar kembali ke asal/muncul dikontrol via class .active
        over.style.display = isActive ? 'block' : 'none';
    },

    newSession() {
        // Reset tampilan ke awal (Sesi Baru)
        if (confirm("Mulai sesi baru? Riwayat chat saat ini akan dibersihkan dari layar.")) {
            location.reload();
        }
    },

    // 7. UTILITIES (Salin Kode, Scroll, Auto-Resize)
    setupMarked() {
        const renderer = new marked.Renderer();
        renderer.code = (code, lang) => {
            const id = 'snippet-' + Math.random().toString(36).substr(2, 9);
            return `
            <div class="code-block-container">
                <div class="code-meta">
                    <span class="lang-tag">${lang || 'code'}</span>
                    <button class="copy-trigger" onclick="App.copyCode('${id}', this)">
                        <i class="far fa-copy"></i> Salin
                    </button>
                </div>
                <pre><code id="${id}">${code.replace(/</g, '&lt;')}</code></pre>
            </div>`;
        };
        marked.setOptions({ renderer, breaks: true });
    },

    copyCode(targetId, btn) {
        const text = document.getElementById(targetId).innerText;
        navigator.clipboard.writeText(text).then(() => {
            const old = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-green-400"></i> Tersalin';
            setTimeout(() => btn.innerHTML = old, 2000);
        });
    },

    autoResize(el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    },

    setLoading(status) {
        this.state.isBusy = status;
        document.getElementById('thinking-ui').classList.toggle('hidden', !status);
        document.getElementById('send-btn').disabled = status;
    },

    scrollToBottom() {
        const flow = document.getElementById('chat-flow');
        flow.scrollTo({ top: flow.scrollHeight, behavior: 'smooth' });
    },

    quick(text) {
        document.getElementById('main-textarea').value = text;
        this.handleAction();
    },

    saveToHistory(u, a) {
        const session = { id: Date.now(), title: u.substring(0, 30) + '...', u, a };
        this.state.history.unshift(session);
        if (this.state.history.length > 15) this.state.history.pop();
        localStorage.setItem('zaam_session_v95', JSON.stringify(this.state.history));
        this.renderHistory();
    },

    renderHistory() {
        const rail = document.getElementById('history-rail');
        const header = rail.querySelector('p');
        rail.innerHTML = '';
        rail.appendChild(header);

        this.state.history.forEach(item => {
            const div = document.createElement('div');
            div.className = "px-8 py-3 text-xs text-slate-400 hover:bg-white/5 cursor-pointer truncate transition-all flex items-center gap-3";
            div.innerHTML = `<i class="far fa-comment-alt text-indigo-500"></i> ${item.title}`;
            div.onclick = () => this.loadSession(item);
            rail.appendChild(div);
        });
    },

    loadSession(data) {
        const render = document.getElementById('main-render');
        document.getElementById('hero-landing').classList.add('hidden');
        render.classList.remove('hidden');
        render.innerHTML = '';
        this.state.view = 'chat';
        this.appendMessage(data.u, 'user');
        this.appendMessage(data.a, 'ai');
        if (window.innerWidth < 1024) this.toggleSidebar();
    },

    sanitize(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};

// Aktifkan aplikasi saat halaman siap
document.addEventListener('DOMContentLoaded', () => App.init());
