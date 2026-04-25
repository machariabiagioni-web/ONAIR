let socket;
let mediaRecorder;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

socket = io("https://onair-server.onrender.com");

socket.on("connect", () => {
    statusEl.innerText = "SISTEMA PRONTO";
    statusEl.style.color = "#0f0";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Metti un canale!");
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = currentChannel;
    pttBtn.disabled = false;
}

// RICEZIONE: Ogni pacchetto è un "proiettile" indipendente
socket.on("audio-stream", async (blobData) => {
    try {
        const blob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
        const audio = new Audio(URL.createObjectURL(blob));
        // Forza la riproduzione immediata
        await audio.play();
    } catch (e) {
        // Se un pacchetto fallisce, il sistema non si ferma!
        console.log("Jitter rilevato, salto pacchetto...");
    }
});

async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Specifichiamo una qualità bassa (8000 bps) per "bucare" il 4G
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm; codecs=opus',
            audioBitsPerSecond: 8000 
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && socket.connected) {
                socket.emit("audio-data", {
                    channel: currentChannel,
                    blob: e.data
                });
            }
        };

        // Mandiamo pezzi ogni 400ms: abbastanza veloci per il tempo reale, 
        // abbastanza lenti per non intasare il server Render Free.
        mediaRecorder.start(400); 
        statusEl.innerText = "TRASMISSIONE ATTIVA";
    } catch (err) { alert("Errore Microfono"); }
}

function stopTransmitting() {
    if (mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    statusEl.innerText = "In ascolto...";
}

pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { if(e.type==='touchstart') e.preventDefault(); startTransmitting(); };
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
