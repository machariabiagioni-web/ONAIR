let peer = null;
let currentCall = null;
let localStream = null;

// Questi sono i "ponti" che usa anche WhatsApp per superare i firewall 4G
const peerConfig = {
    config: {
        'iceServers': [
            { url: 'stun:stun.l.google.com:19302' },
            { url: 'stun:stun1.l.google.com:19302' },
            { url: 'stun:stun2.l.google.com:19302' }
        ]
    }
};

async function joinChannel() {
    const channelId = document.getElementById('channel-input').value;
    if (!channelId) return alert("Inserisci un numero!");

    // Logica A/B per non far scontrare i due telefoni
    const role = confirm("Premi OK se sei l'UTENTE A, ANNULLA se sei l'UTENTE B");
    const myId = 'onair-' + channelId + (role ? '-A' : '-B');
    window.partnerId = 'onair-' + channelId + (role ? '-B' : '-A');

    // Creiamo il Peer con la configurazione per il 4G
    peer = new Peer(myId, peerConfig);

    peer.on('open', (id) => {
        document.getElementById('status').innerText = "Online come " + (role ? "A" : "B");
        document.getElementById('ptt-btn').disabled = false;
    });

    peer.on('call', (call) => {
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
        // Chiamiamo l'altro utente sulla sua "porta" specifica
        currentCall = peer.call(window.partnerId, localStream);
        document.getElementById('status').innerText = "TRASMISSIONE...";
    } catch (err) { alert("Attiva il microfono!"); }
}

function stopTransmitting() {
    if (currentCall) currentCall.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    document.getElementById('status').innerText = "In ascolto...";
}

// Collega i tasti (Mouse e Touch per cellulare)
const btn = document.getElementById('ptt-btn');
btn.onmousedown = btn.ontouchstart = (e) => { e.preventDefault(); startTransmitting(); };
btn.onmouseup = btn.ontouchend = stopTransmitting;
