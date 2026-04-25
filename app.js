let socket;
let mediaRecorder;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// 1. Collegamento al server reale su Render
// Sostituito l'URL generico con quello del tuo server live
socket = io("https://onair-server.onrender.com", {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
}); 

// Gestione stati del server (utile per quando il server si deve "svegliare")
socket.on("connect", () => {
    statusEl.innerText = "CONNESSO AL SERVER";
    statusEl.style.color = "#0f0";
});

socket.on("reconnecting", (attempt) => {
    statusEl.innerText = "Sveglia server in corso... (tentativo " + attempt + ")";
    statusEl.style.color = "#ffa500";
});

socket.on("disconnect", () => {
    statusEl.innerText = "SCONNESSO - Riconnessione...";
    statusEl.style.color = "#ff0000";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Scegli un canale!");
    
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = currentChannel;
    statusEl.innerText = "Online - Canale " + currentChannel;
    pttBtn.disabled = false;
}

// 2. RICEZIONE: Il server rimbalza l'audio
socket.on("audio-stream", (blobData) => {
    const audioBlob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Boost del volume per facilitare l'udito (opzionale per la tesi)
    audio.play().catch(e => console.log("Errore riproduzione:", e));
});

// 3. TRASMISSIONE: Pacchetti da 100ms
async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                echoCancellation: true, 
                noiseSuppression: true,
                autoGainControl: true // Fondamentale per la tesi: stabilizza il volume
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.connected) {
                socket.emit("audio-data", {
                    channel: currentChannel,
                    blob: event.data
                });
            }
        };

        mediaRecorder.start(100); 
        statusEl.innerText = ">>> STAI PARLANDO <<<";
        statusEl.style.color = "#ff0000";
    } catch (err) {
        alert("Accesso microfono negato o non disponibile!");
    }
}

function stopTransmitting() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    statusEl.innerText = "In ascolto su Canale " + currentChannel;
    statusEl.style.color = "#0f0";
}

// Gestione interazione Touch e Mouse
pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { 
    if (e.type === 'touchstart') e.preventDefault(); // Evita zoom su mobile
    startTransmitting(); 
};
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
