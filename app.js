let socket;
let mediaRecorder;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// Coda per gestire i frammenti audio in arrivo
let audioQueue = [];
let isPlaying = false;

socket = io("https://onair-server.onrender.com");

socket.on("connect", () => {
    statusEl.innerText = "SISTEMA PRONTO (Wi-Fi)";
    statusEl.style.color = "#0f0";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Scegli un canale!");
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = "Canale: " + currentChannel;
    pttBtn.disabled = false;
}

// RICEZIONE FLUIDA
socket.on("audio-stream", (blobData) => {
    audioQueue.push(blobData);
    if (!isPlaying) playNext();
});

async function playNext() {
    if (audioQueue.length === 0) {
        isPlaying = false;
        return;
    }

    isPlaying = true;
    const blobData = audioQueue.shift();
    const blob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
    const audio = new Audio(URL.createObjectURL(blob));

    audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        playNext();
    };

    audio.play().catch(() => playNext());
}

// TRASMISSIONE LEGGERA
async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && socket.connected) {
                socket.emit("audio-data", { channel: currentChannel, blob: e.data });
            }
        };

        // Pacchetti da 400ms: il perfetto equilibrio tra velocità e stabilità
        mediaRecorder.start(400); 
        statusEl.innerText = ">>> TRASMISSIONE <<<";
        statusEl.style.color = "#f00";
    } catch (err) { alert("Errore Microfono!"); }
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
