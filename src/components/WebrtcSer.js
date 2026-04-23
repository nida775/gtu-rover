import React, {useRef,useState,useEffect} from "react";

export function WebrtcSer(streamUrl) {
    const [status, setStatus] = useState('disconnected');
    const pcRef = useRef(null); 
    const videoRef=useRef(null);

    useEffect(() => {
    	if (!streamUrl) {
    		console.warn( 'streamUrl boş' );
    		return ;
    		}
        let pc = null;
        const connectWebRTC = async () => {
            try {
                setStatus('connecting');
                console.log ( ' webrtc trying to connect to : ', streamUrl);
                pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' }, // stun sunucusu ekleyin
                    ], 
                });
                pcRef.current = pc; // Store the peer connection in the ref
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.oniceconnectionstatechange = () => {
                    console.log('ICE Connection State:', pc.iceConnectionState);
                    if (pc.iceConnectionState === 'connected') {
                        setStatus('connected');
                    } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                        setStatus('disconnected');
                    } else if (pc.iceConnectionState === 'checking') {
                        setStatus('connecting');
                    } else if (pc.iceConnectionState === 'error') {
                        setStatus('error');
                    }
                };
		pc.ontrack = (event) => {
		  console.log('📹 Video track alındı');
		  const remoteStream = event.streams[0];
		  
		  if (videoRef.current) {
		    videoRef.current.srcObject = remoteStream;
		    setStatus('streaming');
		  } else {
		    // Referans henüz hazır değilse, stream'i bir değişkende tutup 
		    // element oluşunca bağlamak için küçük bir kontrol ekleyelim
			console.warn('⚠️ videoRef.current henüz hazır değil, bekleniyor...');
                        const checkRef = setInterval(() => {
                            if (videoRef.current) {
                                videoRef.current.srcObject = remoteStream;
                                videoRef.current.play()
                                    .then(() => {
                                        console.log("✅ Video başarıyla oynatılıyor");
                                        setStatus('streaming');
                                    })
                                    .catch(err => console.error("⚠️ Oynatma başlatılamadı:", err));
                                clearInterval(checkRef);
                            }
                        }, 100);
                        // 5 saniye sonra hala yoksa temizle
                        setTimeout(() => clearInterval(checkRef), 5000);
                    }
                };

                const offer = await pc.createOffer(); // Create the offer
                await pc.setLocalDescription(offer); 
                console.log ( 'offer send '); 
                const response = await fetch(streamUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({sdp: offer.sdp}),
                }); // Send the offer to the server and wait for the answer
                if (!response.ok){
                	console.error('go2rtc apı hatası', response.status);
                	return;
                }
                const text = await response.text();
                console.log('response', text);
		let answer;

		try {
		    // Eğer gelen veri JSON ise (senin durumun gibi)
		    const data = JSON.parse(text);
		    answer = data.sdp;
		    console.log('answer', answer);
		} catch (e) {
		    // Eğer gelen veri zaten düz metin ise
		    answer = text;
		}

		console.log("Ayıklanan SDP:", answer);

		await pc.setRemoteDescription({
		    type: 'answer',
		    sdp: answer,
		});
            } 
            catch (error) {
                console.error('WebRTC connection error:', error);
                setStatus('error');
            }
        };
        connectWebRTC();
        return ()=> {
            if (pc) {
                pc.close();
                console.log('WebRTC connection closed');
            }
        };
    }, [streamUrl]);
    return { videoRef, status };
}
