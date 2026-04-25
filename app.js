let peer = null;
let currentCall = null;
let localStream = null;
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

async function joinChannel() {
    const channelId = document.getElementById('channel-input').value;
    if (!channelId) return alert("Inserisci un numero!");

    // Chiediamo all'utente di identificarsi per evitare il conflitto di ID
    const role = confirm("Premi OK se sei il primo ad entrare (User A), Annulla se sei il secondo (User B)");
    const myId = 'onair-' + channelId + (role ? '-A' : '-B');
    const partnerId = 'onair-' + channelId + (role ? '-B' : '-A');

    statusEl.innerText = "Connessione come " + (role ? "User A" : "User B") + "...";
    
    peer = new Peer(myId);

    peer.on('open', (id) => {
        statusEl.innerText = "Online sul canale " + channelId;
        pttBtn.disabled = false;
        // Salviamo il partnerId globalmente per usarlo quando premiamo il tasto
        window.currentPartner = partnerId;
    });

    peer.on('call', (call) => {
        statusEl.innerText = "Ricezione audio LIVE...";
        call.answer();
        call.on('stream', (remoteStream) => {
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.play();
        });
    });
}

async function startTransmitting() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        statusEl.innerText = "TRASMISSIONE IN CORSO...";
        // Chiamiamo il partner specifico (se io sono A, chiamo B e viceversa)
        currentCall = peer.call(window.currentPartner, localStream);
    } catch (err) {
        console.error("Errore microfono:", err);
    }
}

function stopTransmitting() {
    if (currentCall) currentCall.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    statusEl.innerText = "Canale in ascolto";
}

// Eventi per il tasto PTT
pttBtn.addEventListener('mousedown', startTransmitting);
pttBtn.addEventListener('mouseup', stopTransmitting);
pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startTransmitting(); });
pttBtn.addEventListener('touchend', stopTransmitting);
