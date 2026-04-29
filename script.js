/**
 * NANZZAI PRO - API INTEGRITY OPTIMIZATION
 * Menjamin respon API tidak kosong & tombol berfungsi 100%
 */

const messagesList = document.getElementById('messages-list');
const userInput = document.getElementById('user-input');
const statusBar = document.getElementById('status-bar');
const sendBtn = document.getElementById('send-btn');
const chatWindow = document.getElementById('chat-window');

// 1. INTEGRITAS MARKDOWN & COPY BUTTON
const renderer = new marked.Renderer();
renderer.code = (code, lang) => {
    const id = 'code-' + Math.random().toString(36).substr(2, 9);
    return `
    <div class="relative group my-4 rounded-lg overflow-hidden border border-zinc-800">
        <div class="flex justify-between items-center bg-zinc-900 px-4 py-2 border-b border-zinc-800">
            <span class="text-[10px] font-mono text-zinc-500 uppercase">${lang || 'code'}</span>
            <button onclick="copyCode('${id}', this)" class="text-[10px] text-indigo-400 hover:text-white flex items-center gap-1">
                <i class="far fa-copy"></i> Salin
            </button>
        </div>
        <pre class="!m-0 !p-4 !bg-zinc-950"><code id="${id}" class="language-${lang}">${code.replace(/</g, '&lt;')}</code></pre>
    </div>`;
};
marked.setOptions({ renderer, breaks: true, gfm: true });

// 2. FUNGSI COPY (Agar tombol salin berfungsi)
window.copyCode = (id, btn) => {
    const text = document.getElementById(id).innerText;
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check text-green-500"></i> Tersalin';
        setTimeout(() => btn.innerHTML = original, 2000);
    });
};

// 3. FUNGSI KIRIM & INTEGRITAS API (CORE FIX)
async function handleSend() {
    const text = userInput.value.trim();
    if (!text || sendBtn.disabled) return;

    // Tampilkan pesan User
    addMessage(text, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    
    setLoading(true);

    try {
        // Melakukan fetch ke API
        const response = await fetch(`https://api-varhad.my.id/ai/gemini?prompt=${encodeURIComponent(text)}`);
        
        if (!response.ok) throw new Error("API Connection Failed");

        const data = await response.json();

        // --- SMART DATA DETECTION (Integritas API) ---
        // Mencari teks di segala kemungkinan field JSON
        let finalContent = "";
        
        if (data) {
            if (typeof data === 'string') {
                finalContent = data;
            } else if (data.text) {
                finalContent = data.text;
            } else if (data.result) {
                // Jika result berupa object, cek dalamnya, jika string langsung ambil
                finalContent = typeof data.result === 'object' ? (data.result.text || JSON.stringify(data.result)) : data.result;
            } else if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                finalContent = data.candidates[0].content.parts[0].text;
            } else {
                // Mencari field apapun yang isinya string
                const fallback = Object.values(data).find(v => typeof v === 'string');
                finalContent = fallback || "Maaf, respon dalam format yang tidak didukung.";
            }
        } else {
            finalContent = "Respon server kosong.";
        }
        // ----------------------------------------------

        addMessage(finalContent, 'ai');

    } catch (error) {
        console.error("API Error:", error);
        addMessage("Terjadi kesalahan teknis saat menghubungi NanzzAi.", 'error');
    } finally {
        setLoading(false);
    }
}

// 4. FUNGSI UI (Avatar, Bubble, & Scroll)
function addMessage(content, role) {
    const div = document.createElement('div');
    // Memastikan tetap ke bawah (Vertical Alignment)
    div.className = `flex flex-col gap-2 animate-in ${role === 'user' ? 'items-end' : 'items-start'}`;
    
    const isUser = role === 'user';
    const isError = role === 'error';
    const label = isUser ? 'ANDA' : (isError ? 'ERROR' : 'NANZZAI');
    const labelClass = isUser ? 'text-zinc-500' : (isError ? 'text-red-500' : 'text-indigo-400');
    const bubbleClass = isUser 
        ? 'bg-indigo-600 text-white rounded-tr-none' 
        : (isError ? 'bg-red-950/30 border-red-900/50 text-red-200' : 'bg-zinc-900 border-zinc-800 text-zinc-200 rounded-tl-none');

    const formattedContent = isUser ? escapeHtml(content) : marked.parse(content);

    div.innerHTML = `
        <div class="flex items-center gap-2 text-[10px] font-bold tracking-widest ${labelClass}">
            ${!isUser ? '<i class="fas fa-sparkles"></i>' : ''} ${label}
        </div>
        <div class="max-w-[90%] p-4 rounded-2xl border shadow-sm ${bubbleClass}">
            <div class="prose prose-sm md:prose-base prose-invert max-w-none">
                ${formattedContent}
            </div>
        </div>
    `;

    messagesList.appendChild(div);
    scrollDown();
}

// 5. FUNGSI PENDUKUNG (Loading, Scroll, Escape)
function setLoading(isLoading) {
    statusBar.classList.toggle('hidden', !isLoading);
    sendBtn.disabled = isLoading;
    sendBtn.innerHTML = isLoading ? 
        '<i class="fas fa-circle-notch animate-spin"></i>' : 
        '<i class="fas fa-paper-plane-vertical"></i>';
}

function scrollDown() {
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 6. EVENT LISTENER KEYBOARD (Fungsi Enter)
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Menghubungkan fungsi global ke HTML
window.handleSend = handleSend;
