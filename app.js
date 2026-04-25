let socket;
let mediaRecorder;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// 1. Collegamento al server
socket = io("https://onair-server.onrender.com");

socket.on("connect", () => {
    statusEl.innerText = "CONNESSO AL SERVER";
    statusEl.style.color = "#0f0";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Metti un canale!");
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = currentChannel;
    pttBtn.disabled = false;
}

// 2. RICEZIONE: Usiamo un sistema di accodamento
socket.on("audio-stream", (blobData) => {
    const blob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    audio.play().then(() => {
        // Pulizia immediata dopo la riproduzione
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }).catch(e => console.log("Salto pacchetto..."));
});

// 3. TRASMISSIONE: Il segreto è nel "Time Slice"
async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && socket.connected) {
                // Inviamo il blocco intero
                socket.emit("audio-data", {
                    channel: currentChannel,
                    blob: e.data
                });
            }
        };

        // TRUCCO: Invece di mandare tutto insieme alla fine, 
        // mandiamo un blocco ogni 500ms (mezzo secondo)
        mediaRecorder.start(500); 
        
        statusEl.innerText = ">>> PARLA ORA <<<";
        statusEl.style.color = "#ff0000";
    } catch (err) { alert("Microfono bloccato!"); }
}

function stopTransmitting() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    statusEl.innerText = "In ascolto...";
    statusEl.style.color = "#0f0";
}

pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { 
    if (e.type === 'touchstart') e.preventDefault(); 
    startTransmitting(); 
};
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
