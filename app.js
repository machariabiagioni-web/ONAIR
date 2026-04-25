const socket = io("INSERISCI_URL_DEL_TUO_SERVER_QUI"); // Es: https://onair-server.onrender.com
let mediaRecorder;
let currentChannel = "";

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Metti un numero!");
    
    socket.emit("join-channel", currentChannel);
    document.getElementById('status').innerText = "Online - Canale " + currentChannel;
    document.getElementById('ptt-btn').disabled = false;
}

// Ricezione: Quando il server ci manda l'audio di qualcun altro
socket.on("audio-stream", (blobData) => {
    const audioBlob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
});

async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Tagliamo l'audio in pezzi da 100ms per il Realtime
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                socket.emit("audio-data", {
                    channel: currentChannel,
                    blob: event.data
                });
            }
        };

        mediaRecorder.start(100); // Invia un pacchetto ogni 100ms
        document.getElementById('status').innerText = "STAI PARLANDO...";
    } catch (err) { alert("Errore microfono!"); }
}

function stopTransmitting() {
    if (mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    document.getElementById('status').innerText = "In ascolto...";
}

// Eventi tasto
const btn = document.getElementById('ptt-btn');
btn.onmousedown = btn.ontouchstart = (e) => { e.preventDefault(); startTransmitting(); };
btn.onmouseup = btn.ontouchend = stopTransmitting;
