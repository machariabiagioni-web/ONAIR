let peer = null;
let currentCall = null;
let localStream = null;
const statusEl = document.getElementById('status');

async function joinChannel() {
    const channelId = document.getElementById('channel-input').value;
    if (!channelId) return alert("Inserisci un numero!");

    const role = confirm("OK per Utente A, ANNULLA per Utente B");
    const myId = 'onair-' + channelId + (role ? '-A' : '-B');
    window.partnerId = 'onair-' + channelId + (role ? '-B' : '-A');

    // CONFIGURAZIONE AVANZATA: Usiamo i server di PeerJS che includono TURN
    peer = new Peer(myId, {
        debug: 3 // Ti mostra gli errori dettagliati in console
    });

    peer.on('open', (id) => {
        statusEl.innerText = "Connesso come " + (role ? "A" : "B");
        document.getElementById('ptt-btn').disabled = false;
    });

    peer.on('call', (call) => {
        statusEl.innerText = "RICEZIONE IN CORSO...";
        call.answer();
        call.on('stream', (remoteStream) => {
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.play().catch(e => console.error("Errore autoplay:", e));
        });
    });

    peer.on('error', (err) => {
        statusEl.innerText = "Errore: " + err.type;
        console.error(err);
    });
}

async function startTransmitting() {
    try {
        // Chiediamo il microfono con alta qualità per la tesi elettroacustica
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true } 
        });
        
        statusEl.innerText = "TRASMISSIONE...";
        currentCall = peer.call(window.partnerId, localStream);
    } catch (err) {
        statusEl.innerText = "Errore Microfono";
    }
}

function stopTransmitting() {
    if (currentCall) currentCall.close();
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    statusEl.innerText = "In ascolto";
}

const ptt = document.getElementById('ptt-btn');
ptt.onmousedown = ptt.ontouchstart = (e) => { e.preventDefault(); startTransmitting(); };
ptt.onmouseup = ptt.ontouchend = stopTransmitting;
