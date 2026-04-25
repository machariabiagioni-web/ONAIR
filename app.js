let socket;
let localStream;
let peerConnection;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// --- CONFIGURAZIONE VoIP PROFESSIONALE (Tuo account Metered) ---
const iceConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, 
        { urls: "stun:openrelay.metered.ca:80" },
        {
            urls: "turn:openrelay.metered.ca:443", 
            username: "038d70b4dbcba2d46bfb0cb8", 
            credential: "iaqbMaOGxGFUmPJz"
        }
    ]
};

// 1. Collegamento al server di segnalazione su Render
socket = io("https://onair-server.onrender.com"); 

socket.on("connect", () => { 
    statusEl.innerText = "SISTEMA PRONTO (VoIP)"; 
    statusEl.style.color = "#0f0";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Inserisci un canale!");
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = currentChannel;
    pttBtn.disabled = false;
}

// 2. LOGICA DI SEGNALAZIONE (WebRTC)
socket.on("signal", async (data) => {
    if (!peerConnection) startPeerConnection(false);

    if (data.offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("signal", { channel: currentChannel, answer });
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

async function startPeerConnection(isCaller) {
    peerConnection = new RTCPeerConnection(iceConfig);

    // Quando riceviamo l'audio dall'altro telefono
    peerConnection.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play();
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", { channel: currentChannel, candidate: event.candidate });
        }
    };

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("signal", { channel: currentChannel, offer });
    }
}

async function startTransmitting() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await startPeerConnection(true);
        statusEl.innerText = ">>> TRASMISSIONE ATTIVA <<<";
        statusEl.style.color = "#ff0000";
    } catch (err) {
        alert("Errore microfono: " + err);
    }
}

function stopTransmitting() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    statusEl.innerText = "In ascolto su Canale " + currentChannel;
    statusEl.style.color = "#0f0";
}

// Supporto Touch per Mobile
pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { 
    if (e.type === 'touchstart') e.preventDefault(); 
    startTransmitting(); 
};
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
