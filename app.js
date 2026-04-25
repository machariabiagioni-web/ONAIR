let socket;
let mediaRecorder;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// 1. Collegamento al server reale su Render
socket = io("https://onair-server.onrender.com", {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
}); 

// Gestione stati del server
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

// 2. RICEZIONE OTTIMIZZATA: Gestisce meglio i frammenti per evitare blocchi
socket.on("audio-stream", (blobData) => {
    const audioBlob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    // Pulizia automatica della memoria quando il frammento finisce
    audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audio.remove();
    };

    audio.play().catch(e => {
        // Se un pacchetto arriva male o troppo tardi, lo scartiamo senza bloccare tutto
        console.log("Pacchetto scartato per mantenere il tempo reale");
    });
});

// 3. TRASMISSIONE: Pacchetti da 200ms (migliore per stabilità 4G)
async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                echoCancellation: true, 
                noiseSuppression: true,
                autoGainControl: true 
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

        // 200ms è il compromesso ideale tra latenza e stabilità della connessione
        mediaRecorder.start(200); 
        statusEl.innerText = ">>> STAI PARLANDO <<<";
        statusEl.style.color = "#ff0000";
    } catch (err) {
        alert("Accesso microfono negato o non disponibile!");
    }
}

function stopTransmitting() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        // Chiudiamo il microfono per risparmiare banda e batteria
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    statusEl.innerText = "In ascolto su Canale " + currentChannel;
    statusEl.style.color = "#0f0";
}

// Gestione interazione Touch e Mouse
pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { 
    if (e.type === 'touchstart') e.preventDefault(); 
    startTransmitting(); 
};
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
