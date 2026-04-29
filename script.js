/**
 * ZAAM-ASISTEN PRO ENGINE v8.0
 * Robust, Modular, and Bug-Free
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
        // Configure Markdown Engine
        marked.setOptions({ breaks: true, gfm: true });
        console.log("Engine v8.0 Status: Ready");
    },

    bindEvents() {
        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 1024) {
                e.preventDefault();
                this.submit();
            }
        });
        this.dom.overlay.onclick = () => this.toggleSidebar();
    },

    toggleSidebar() {
        const isActive = this.dom.sidebar.classList.toggle('active');
        this.dom.overlay.style.display = isActive ? 'block' : 'none';
    },

    resizeInput(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 180) + 'px';
    },

    setPrompt(val) {
        this.dom.input.value = val;
        this.resizeInput(this.dom.input);
        this.submit();
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
            const endpoint = `https://api-varhad.my.id/ai/gemini?prompt=${encodeURIComponent(text)}`;
            const response = await fetch(endpoint);
            
            if (!response.ok) throw new Error("Gateway Error");

            const data = await response.json();
            const aiReply = this.extractContent(data);

            this.appendMessage(aiReply, 'ai');
            this.updateHistory(text, aiReply);

        } catch (error) {
            this.appendMessage("Sistem mengalami gangguan teknis saat menghubungi server AI.", 'ai', true);
        } finally {
            this.toggleLoading(false);
        }
    },

    extractContent(data) {
        if (data.text) return data.text;
        if (data.result) return typeof data.result === 'string' ? data.result : (data.result.text || JSON.stringify(data.result));
        return Object.values(data).find(v => typeof v === 'string') || "No response received.";
    },

    appendMessage(content, role, isError = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `msg-entry ${role === 'user' ? 'flex-row-reverse' : ''}`;

        const isUser = role === 'user';
        const avatarColor = isUser ? 'bg-slate-700' : (isError ? 'bg-red-500' : 'bg-indigo-600');
        const icon = isUser ? 'fa-user' : 'fa-robot';

        const body = isUser ? this.sanitize(content) : marked.parse(content);

        wrapper.innerHTML = `
            <div class="avatar-ui ${avatarColor}"><i class="fas ${icon}"></i></div>
            <div class="bubble-ui ${isUser ? 'bubble-user' : 'bubble-ai'}">
                <div class="prose prose-invert prose-sm md:prose-base max-w-none">
                    ${body}
                </div>
            </div>
        `;

        this.dom.msgCont.appendChild(wrapper);
        this.scroll();
    },

    toggleLoading(status) {
        this.state.isBusy = status;
        this.dom.loading.classList.toggle('hidden', !status);
        this.dom.submitBtn.disabled = status;
    },

    clearInput() {
        this.dom.input.value = '';
        this.dom.input.style.height = 'auto';
    },

    scroll() {
        this.dom.scroller.scrollTo({ top: this.dom.scroller.scrollHeight, behavior: 'smooth' });
    },

    updateHistory(user, ai) {
        const session = {
            id: Date.now(),
            title: user.substring(0, 35) + '...',
            user: user,
            ai: ai,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.state.chats.unshift(session);
        if (this.state.chats.length > 20) this.state.chats.pop();
        localStorage.setItem('zaam_pro_v8', JSON.stringify(this.state.chats));
        this.renderHistory();
    },

    renderHistory() {
        this.dom.history.innerHTML = '<p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-8 mb-4">Recent Discussions</p>';
        this.state.chats.forEach(item => {
            const div = document.createElement('div');
            div.className = 'hist-box';
            div.innerHTML = `<i class="far fa-message text-[10px]"></i> <div class="truncate"><span>${item.title}</span></div>`;
            div.onclick = () => this.loadSession(item);
            this.dom.history.appendChild(div);
        });
    },

    loadSession(data) {
        this.dom.heroView.classList.add('hidden');
        this.dom.msgCont.classList.remove('hidden');
        this.dom.msgCont.innerHTML = '';
        this.state.view = 'chat';
        this.appendMessage(data.user, 'user');
        this.appendMessage(data.ai, 'ai');
        if (window.innerWidth < 1024) this.toggleSidebar();
    },

    reset() {
        this.dom.msgCont.innerHTML = '';
        this.dom.heroView.classList.remove('hidden');
        this.dom.msgCont.classList.add('hidden');
        this.state.view = 'hero';
        this.clearInput();
        if (window.innerWidth < 1024) this.toggleSidebar();
    },

    sanitize(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
};

// Launch
Engine.init();
