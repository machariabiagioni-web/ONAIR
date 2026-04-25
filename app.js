let socket;
let mediaRecorder;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// Colleghiamoci al server
socket = io("https://onair-server.onrender.com");

socket.on("connect", () => {
    statusEl.innerText = "SISTEMA PRONTO";
    statusEl.style.color = "#0f0";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Scegli un canale!");
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = "Canale: " + currentChannel;
    pttBtn.disabled = false;
}

// RICEZIONE
socket.on("audio-stream", async (blobData) => {
    // Trasformiamo i dati ricevuti in un oggetto audio
    const blob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    try {
        await audio.play();
        // Puliamo la memoria dopo 2 secondi
        setTimeout(() => URL.revokeObjectURL(audioUrl), 2000);
    } catch (e) {
        console.log("Errore riproduzione (clicca sulla pagina per sbloccare l'audio)");
    }
});

// TRASMISSIONE
async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.connected) {
                socket.emit("audio-data", {
                    channel: currentChannel,
                    blob: event.data
                });
            }
        };

        // Mandiamo pacchetti ogni 400ms (molto stabile)
        mediaRecorder.start(400);
        statusEl.innerText = ">>> TRASMISSIONE <<<";
        statusEl.style.color = "#f00";
    } catch (err) {
        alert("Microfono non trovato o negato!");
    }
}

function stopTransmitting() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    statusEl.innerText = "In ascolto...";
    statusEl.style.color = "#0f0";
}

// Eventi pulsante
pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { 
    if (e.type === 'touchstart') e.preventDefault();
    startTransmitting(); 
};
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
