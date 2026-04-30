// Konfigurasi Elemen DOM
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const messagesList = document.getElementById('messages-list');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatWindow = document.getElementById('chat-window');
const typingStatus = document.getElementById('typing-status');

// Memuat data riwayat dari LocalStorage
let chatHistory = JSON.parse(localStorage.getItem('zaam_ultra_history')) || [];

/**
 * Fungsi untuk membuka/tutup sidebar riwayat
 */
function toggleSidebar() { 
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('visible', isOpen);
}

/**
 * Fungsi untuk membersihkan tampilan dan memulai chat baru
 */
function createNewChat() {
    messagesList.innerHTML = `
        <div id="intro" class="text-center py-20 space-y-6">
            <div class="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10">
                <i class="fas fa-robot text-2xl text-indigo-500"></i>
            </div>
            <h2 class="text-xl font-bold text-white">Mulai Chat Baru</h2>
            <p class="text-zinc-500 text-sm max-w-xs mx-auto">Ketik pesan di bawah untuk memulai obrolan baru.</p>
        </div>
    `;
    userInput.value = '';
    userInput.style.height = 'auto';
    if (sidebar.classList.contains('open')) toggleSidebar();
}

/**
 * Mengatur tinggi textarea secara otomatis saat mengetik
 */
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

/**
 * Menangani pengiriman pesan
 */
async function handleSend() {
    const text = userInput.value.trim();
    if (!text || sendBtn.disabled) return;

    const intro = document.getElementById('intro');
    if (intro) intro.remove();

    addMessage(text, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    setLoading(true);

    try {
        const response = await fetch(`https://api-faa.my.id/faa/dolphin-ai?text=${encodeURIComponent(text)}`);
        const data = await response.json();

        if (data && data.status) {
            addMessage(data.result, 'ai');
            saveToHistory(text, data.result);
        } else {
            addMessage("Maaf, sistem sedang offline.", "ai");
        }
    } catch (error) {
        addMessage("Koneksi terputus. Silakan coba lagi.", "ai");
    } finally {
        setLoading(false);
    }
}

/**
 * Menambahkan bubble chat ke jendela pesan
 */
function addMessage(content, role) {
    const div = document.createElement('div');
    div.className = `animate-msg flex flex-col ${role === 'user' ? 'items-end' : 'items-start'} w-full`;
    
    div.innerHTML = `
        <div class="flex items-center gap-2 mb-2.5 px-2">
            <span class="text-[9px] font-black uppercase tracking-widest text-zinc-600">${role === 'user' ? 'Anda' : 'ZaamAi'}</span>
        </div>
        <div class="max-w-[92%] md:max-w-[85%] p-5 rounded-[1.8rem] shadow-2xl ${role === 'user' ? 'chat-user' : 'chat-ai'}">
            <div class="prose prose-invert prose-sm max-w-none text-[14px] md:text-[15px] leading-relaxed">
                ${role === 'user' ? content : marked.parse(content)}
            </div>
        </div>
    `;
    messagesList.appendChild(div);
    scrollDown();
}

/**
 * Menampilkan status loading saat AI berpikir
 */
function setLoading(l) {
    typingStatus.classList.toggle('hidden', !l);
    sendBtn.disabled = l;
    sendBtn.style.opacity = l ? '0.5' : '1';
}

/**
 * Menyimpan pesan ke riwayat lokal
 */
function saveToHistory(userMsg, aiMsg) {
    const newHistory = { 
        id: Date.now(),
        title: userMsg.substring(0, 30) + '...', 
        user: userMsg, 
        ai: aiMsg,
        time: new Date().toLocaleTimeString() 
    };
    chatHistory.unshift(newHistory);
    if (chatHistory.length > 25) chatHistory.pop();
    localStorage.setItem('zaam_ultra_history', JSON.stringify(chatHistory));
    updateHistoryUI();
}

/**
 * Memuat chat spesifik dari riwayat saat diklik
 */
function loadFromHistory(id) {
    const item = chatHistory.find(h => h.id === id);
    if (item) {
        const intro = document.getElementById('intro');
        if (intro) intro.remove();
        messagesList.innerHTML = ''; 
        addMessage(item.user, 'user');
        addMessage(item.ai, 'ai');
        toggleSidebar(); 
    }
}

/**
 * Memperbarui tampilan list riwayat di sidebar
 */
function updateHistoryUI() {
    const list = document.getElementById('history-list');
    list.innerHTML = chatHistory.map(item => `
        <div onclick="loadFromHistory(${item.id})" class="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer">
            <div class="text-[11px] font-bold text-zinc-300 truncate">${item.title}</div>
            <div class="text-[8px] text-zinc-600 mt-2 font-black uppercase tracking-tighter">${item.time}</div>
        </div>
    `).join('');
}

/**
 * Menghapus semua riwayat
 */
function clearHistory() { 
    chatHistory = []; 
    localStorage.removeItem('zaam_ultra_history'); 
    updateHistoryUI(); 
}

/**
 * Menggulung layar ke pesan paling bawah
 */
function scrollDown() { 
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' }); 
}

// Inisialisasi awal saat halaman dimuat
updateHistoryUI();
