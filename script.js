// --- CONFIGURATION ---
const sidebar = document.getElementById('sidebar');
const messagesList = document.getElementById('messages-list');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatWindow = document.getElementById('chat-window');
const typingIndicator = document.getElementById('ai-typing');
const historyList = document.getElementById('history-list');

let currentSession = [];
let allSessions = JSON.parse(localStorage.getItem('zaam_data')) || [];

// --- CORE FUNCTIONS ---

function toggleSidebar() {
    sidebar.classList.toggle('active');
}

// Menyesuaikan tinggi textarea otomatis
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Menangani klik kirim
sendBtn.onclick = handleSend;

// Menangani tombol Enter
userInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    // Hapus welcome screen jika ada
    const welcome = document.getElementById('welcome-ui');
    if (welcome) welcome.remove();

    addMessage(text, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    
    setLoading(true);

    try {
        const response = await fetch(`https://api-faa.my.id/faa/dolphin-ai?text=${encodeURIComponent(text)}`);
        const data = await response.json();
        
        if (data.status) {
            addMessage(data.result, 'ai');
            saveToStorage();
        } else {
            addMessage("Maaf, terjadi gangguan koneksi.", "error");
        }
    } catch (err) {
        addMessage("Gagal terhubung ke server.", "error");
    } finally {
        setLoading(false);
    }
}

function addMessage(content, role) {
    const div = document.createElement('div');
    div.className = `animate-msg flex flex-col ${role === 'user' ? 'items-end' : 'items-start'} w-full mb-2`;
    
    const bubbleClass = role === 'user' ? 'bubble-user text-white' : 'bubble-ai text-zinc-300';
    const label = role === 'user' ? 'ANDA' : 'ZAAMAI';

    div.innerHTML = `
        <span class="text-[9px] font-bold text-zinc-600 mb-1 px-2 tracking-widest">${label}</span>
        <div class="max-w-[85%] p-4 shadow-lg ${bubbleClass}">
            <div class="prose prose-invert prose-sm text-[15px] leading-relaxed">
                ${role === 'user' ? content : marked.parse(content)}
            </div>
        </div>
    `;

    messagesList.appendChild(div);
    currentSession.push({ role, content });
    scrollToBottom();
}

function scrollToBottom() {
    setTimeout(() => {
        chatWindow.scrollTo({
            top: chatWindow.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

function setLoading(state) {
    typingIndicator.classList.toggle('hidden', !state);
    sendBtn.disabled = state;
    sendBtn.style.opacity = state ? '0.5' : '1';
}

// --- SESSION & HISTORY ---

function saveToStorage() {
    if (currentSession.length === 0) return;
    
    const sessionObj = {
        id: Date.now(),
        title: currentSession[0].content.substring(0, 30) + "...",
        chats: [...currentSession]
    };

    allSessions.unshift(sessionObj);
    if (allSessions.length > 20) allSessions.pop();
    
    localStorage.setItem('zaam_data', JSON.stringify(allSessions));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = allSessions.map(session => `
        <div onclick="loadSession(${session.id})" class="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-indigo-500/30 cursor-pointer transition-all">
            <p class="text-[11px] font-bold text-zinc-300 truncate">${session.title}</p>
            <p class="text-[8px] text-zinc-600 mt-1 uppercase font-bold">Saved Session</p>
        </div>
    `).join('');
}

function loadSession(id) {
    const session = allSessions.find(s => s.id === id);
    if (!session) return;

    const welcome = document.getElementById('welcome-ui');
    if (welcome) welcome.remove();

    messagesList.innerHTML = '';
    currentSession = [];
    
    session.chats.forEach(chat => {
        addMessage(chat.content, chat.role);
    });

    if (window.innerWidth < 768) toggleSidebar();
}

document.getElementById('new-chat-btn').onclick = () => {
    location.reload(); // Cara termudah untuk reset sesi
};

// Inisialisasi Riwayat
renderHistory();

// Handle keyboard mobile resize
window.visualViewport.addEventListener('resize', () => {
    scrollToBottom();
});
