let peer = null;
let currentCall = null;
let localStream = null;
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');
const channelDisplay = document.getElementById('current-channel');

// 1. Inizializza Audio Context per l'effetto sfumatura
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const mainGainNode = audioCtx.createGain();
mainGainNode.connect(audioCtx.destination);

async function joinChannel() {
    const channelId = document.getElementById('channel-input').value;
    if (!channelId) return alert("Inserisci un numero!");

    statusEl.innerText = "Connessione in corso...";
    channelDisplay.innerText = channelId;

    // Inizializza PeerJS con l'ID del canale (prefisso per evitare conflitti)
    // Nota: PeerJS genera un ID univoco. In un sistema reale useresti un broker.
    // Qui usiamo l'ID del canale come nome utente.
    peer = new Peer('bf88s-channel-' + channelId);

    peer.on('open', (id) => {
        statusEl.innerText = "Online sul canale " + channelId;
        pttBtn.disabled = false;
    });

    peer.on('call', (call) => {
        // Quando ricevi una chiamata (qualcuno preme PTT)
        statusEl.innerText = "Ricezione audio...";
        
        call.answer(); // Rispondi automaticamente
        call.on('stream', (remoteStream) => {
            playStreamWithFade(remoteStream);
        });
        
        call.on('close', () => {
            statusEl.innerText = "Canale in ascolto";
        });
    });

    peer.on('error', (err) => {
        console.error(err);
        statusEl.innerText = "Errore: Canale occupato o problema rete";
    });
}

function playStreamWithFade(stream) {
    const source = audioCtx.createMediaStreamSource(stream);
    const streamGain = audioCtx.createGain();
    
    // Effetto sfumatura entrata
    streamGain.gain.setValueAtTime(0, audioCtx.currentTime);
    streamGain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.3);
    
    source.connect(streamGain);
    streamGain.connect(mainGainNode);
}

// 3. Gestione PTT (Push To Talk)
pttBtn.addEventListener('mousedown', startTransmitting);
pttBtn.addEventListener('mouseup', stopTransmitting);
pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startTransmitting(); });
pttBtn.addEventListener('touchend', stopTransmitting);

async function startTransmitting() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const channelId = document.getElementById('channel-input').value;
        
        // Qui dovresti avere una lista di peer nel canale. 
        // Per semplicità facciamo il "broadcast" a un ID convenzionale o specifico.
        // In una versione avanzata useresti un server per listare i peer.
        statusEl.innerText = "TRASMISSIONE IN CORSO...";
        
        // Esempio: chiama il peer "partner" (logica semplificata per 2 persone)
        // Per un gruppo servirebbe un array di ID.
        currentCall = peer.call('bf88s-channel-' + channelId + '-partner', localStream);
    } catch (err) {
        console.error("Permesso microfono negato", err);
    }
}

function stopTransmitting() {
    if (currentCall) currentCall.close();
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    statusEl.innerText = "Canale in ascolto";
}