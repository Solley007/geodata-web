import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// Live Virtual Inspection — WebRTC session hook.
//
// Media flows peer-to-peer over WebRTC (two participants: officer + client).
// Signaling (SDP offer/answer + ICE candidates) is relayed through the
// `inspectionSignals` Convex table via short-lived polling — no third-party
// video SaaS, reusing the existing reliable Convex realtime infrastructure
// only for the handshake, not for the media itself.
// ══════════════════════════════════════════════════════════════════════════

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type ConnectionState = "idle" | "connecting" | "connected" | "failed" | "disconnected";

export function useInspectionWebRTC(inspectionId: Id<"liveInspections"> | null, myKey: string, isInitiator: boolean) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sentSignalIds = useRef<Set<string>>(new Set());

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteJoined, setRemoteJoined] = useState(false);

  const sendSignal = useMutation(api.liveInspections.sendSignal);
  const signals = useQuery(
    api.liveInspections.listSignals,
    inspectionId ? { id: inspectionId, forUserKey: myKey } : "skip"
  );

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
      if (event.candidate && inspectionId) {
        void sendSignal({
          id: inspectionId,
          fromUserKey: myKey,
          signalType: "ice-candidate",
          payload: JSON.stringify(event.candidate),
        });
      }
    };
    pc.ontrack = (event) => {
      setRemoteJoined(true);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") setConnectionState("connected");
      else if (state === "failed") setConnectionState("failed");
      else if (state === "disconnected" || state === "closed") setConnectionState("disconnected");
    };
    return pc;
  }, [inspectionId, myKey, sendSignal]);

  const start = useCallback(async () => {
    if (!inspectionId) return;
    setError(null);
    setConnectionState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pcRef.current = pc;

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal({ id: inspectionId, fromUserKey: myKey, signalType: "offer", payload: JSON.stringify(offer) });
      }
    } catch (err) {
      const name = (err as Error).name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Camera/microphone permission denied. Enable access in your browser settings.");
      } else if (name === "NotFoundError") {
        setError("No camera or microphone found on this device.");
      } else {
        setError("Failed to start the live session.");
      }
      setConnectionState("failed");
    }
  }, [inspectionId, myKey, isInitiator, createPeerConnection, sendSignal]);

  const stop = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    pcRef.current?.close();
    pcRef.current = null;
    setConnectionState("idle");
    setRemoteJoined(false);
    if (inspectionId) {
      void sendSignal({ id: inspectionId, fromUserKey: myKey, signalType: "leave", payload: "{}" });
    }
  }, [inspectionId, myKey, sendSignal]);

  const toggleMic = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((v) => !v);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCameraOn((v) => !v);
  }, []);

  // Process incoming signaling messages as they arrive.
  useEffect(() => {
    if (!signals || !pcRef.current) return;
    const pc = pcRef.current;
    const process = async () => {
      for (const signal of signals) {
        if (sentSignalIds.current.has(signal._id)) continue;
        sentSignalIds.current.add(signal._id);
        try {
          if (signal.signalType === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.payload)));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (inspectionId) {
              await sendSignal({ id: inspectionId, fromUserKey: myKey, signalType: "answer", payload: JSON.stringify(answer) });
            }
          } else if (signal.signalType === "answer") {
            if (!pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.payload)));
            }
          } else if (signal.signalType === "ice-candidate") {
            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(signal.payload)));
          } else if (signal.signalType === "leave") {
            setRemoteJoined(false);
            setConnectionState("disconnected");
          }
        } catch {
          // Ignore malformed/late signals — the session self-heals as new ones arrive.
        }
      }
    };
    void process();
  }, [signals, inspectionId, myKey, sendSignal]);

  // Always release camera/mic on unmount.
  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
  }, []);

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    connectionState,
    micOn,
    cameraOn,
    error,
    remoteJoined,
    start,
    stop,
    toggleMic,
    toggleCamera,
  };
}
