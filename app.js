let socket;
let audioContext;
let processor;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

socket = io("https://onair-server.onrender.com", { reconnection: true });

socket.on("connect", () => { statusEl.innerText = "CONNESSO"; statusEl.style.color = "#0f0"; });

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Scegli un canale!");
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = currentChannel;
    pttBtn.disabled = false;
    // Inizializziamo l'audio context per la ricezione
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
}

// RICEZIONE: Trasforma i dati grezzi in suono istantaneo
socket.on("audio-stream", (audioData) => {
    const float32Data = new Float32Array(audioData);
    const buffer = audioContext.createBuffer(1, float32Data.length, 16000);
    buffer.getChannelData(0).set(float32Data);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
});

async function startTransmitting() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        
        // Creamo un processore che cattura ogni 4096 campioni (molto veloce)
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
            if (socket.connected) {
                const inputData = e.inputBuffer.getChannelData(0);
                // Inviamo i dati grezzi (molto più stabili dei file)
                socket.emit("audio-data", {
                    channel: currentChannel,
                    blob: inputData.buffer
                });
            }
        };

        statusEl.innerText = ">>> TRASMISSIONE <<<";
        statusEl.style.color = "#ff0000";
    } catch (err) { alert("Errore microfono!"); }
}

function stopTransmitting() {
    if (processor) {
        processor.disconnect();
        processor.onaudioprocess = null;
        processor = null;
    }
    statusEl.innerText = "In ascolto...";
    statusEl.style.color = "#0f0";
}

pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { if(e.type==='touchstart') e.preventDefault(); startTransmitting(); };
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
