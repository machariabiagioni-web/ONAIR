let socket;
let mediaRecorder;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// Ci colleghiamo solo a Render (niente WebRTC complicato che il 4G blocca)
socket = io("https://onair-server.onrender.com");

socket.on("connect", () => {
    statusEl.innerText = "PRONTO (4G OPTIMIZED)";
    statusEl.style.color = "#0f0";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Scegli un canale!");
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = currentChannel;
    pttBtn.disabled = false;
}

// RICEZIONE: Ogni pacchetto è un "messaggio web" standard
socket.on("audio-stream", (blobData) => {
    const blob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play().catch(() => {}); // Ignora errori se il pacchetto è corrotto
});

async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Usiamo un bitrate bassissimo (6000) per farlo passare ovunque
        mediaRecorder = new MediaRecorder(stream, { 
            mimeType: 'audio/webm; codecs=opus',
            audioBitsPerSecond: 6000 
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && socket.connected) {
                // Il server di Render farà da "ponte" per tutti
                socket.emit("audio-data", {
                    channel: currentChannel,
                    blob: e.data
                });
            }
        };

        // Mandiamo pacchetti ogni 300ms (stabilità massima)
        mediaRecorder.start(300);
        statusEl.innerText = ">>> TRASMETTENDO <<<";
        statusEl.style.color = "#ff0000";
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

pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { if(e.type==='touchstart') e.preventDefault(); startTransmitting(); };
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
