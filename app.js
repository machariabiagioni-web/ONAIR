let socket;
let mediaRecorder;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// 1. Collegamento al server (Sostituiremo l'URL dopo la creazione su Render)
socket = io("https://onair-server-vostronome.onrender.com"); 

socket.on("connect", () => {
    statusEl.innerText = "Connesso al Server";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Scegli un canale!");
    
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = currentChannel;
    statusEl.innerText = "Online - Canale " + currentChannel;
    pttBtn.disabled = false;
}

// 2. RICEZIONE: Il server ci "rimbalza" l'audio degli altri
socket.on("audio-stream", (blobData) => {
    // Riceviamo i dati grezzi e li trasformiamo in audio riproducibile
    const audioBlob = new Blob([blobData], { type: 'audio/webm; codecs=opus' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play().catch(e => console.log("Errore riproduzione:", e));
});

// 3. TRASMISSIONE: Catturiamo e inviamo pacchetti ogni 100ms
async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true } 
        });
        
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.connected) {
                // Inviamo il "pezzo" di audio al server con il numero del canale
                socket.emit("audio-data", {
                    channel: currentChannel,
                    blob: event.data
                });
            }
        };

        // Invia pacchetti piccolissimi per evitare ritardi (100ms)
        mediaRecorder.start(100); 
        statusEl.innerText = ">>> TRASMISSIONE IN CORSO <<<";
        statusEl.style.color = "#ff0000";
    } catch (err) {
        alert("Accesso microfono negato!");
    }
}

function stopTransmitting() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    statusEl.innerText = "Canale in ascolto...";
    statusEl.style.color = "#0f0";
}

// Supporto sia per PC che per Telefono (Touch)
pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { e.preventDefault(); startTransmitting(); };
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
