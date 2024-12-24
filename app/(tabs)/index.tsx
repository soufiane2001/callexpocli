import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, Button, Alert, Platform } from 'react-native';
import { collection, doc, setDoc, getDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { firestore } from './firebase'; // Import Firestore instance

export default function HomeScreen() {
  const [callId, setCallId] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);

  const servers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  const startCall = async () => {
    const callDocRef = doc(collection(firestore, 'calls'));
    const offerCandidatesRef = collection(callDocRef, 'offerCandidates');
    const answerCandidatesRef = collection(callDocRef, 'answerCandidates');

    setCallId(callDocRef.id);
    setIsCalling(true);

    peerConnection.current = new RTCPeerConnection(servers);

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => peerConnection.current.addTrack(track, localStream));
    }

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidatesRef, event.candidate.toJSON());
      }
    };

    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    const offerDescription = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDocRef, { offer });

    // Listen for answer
    onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.current.setRemoteDescription(answerDescription);
      }
    });

    // Listen for ICE candidates
    onSnapshot(answerCandidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const joinCall = async () => {
    const callDocRef = doc(firestore, 'calls', callId);
    const offerCandidatesRef = collection(callDocRef, 'offerCandidates');
    const answerCandidatesRef = collection(callDocRef, 'answerCandidates');

    peerConnection.current = new RTCPeerConnection(servers);

    if (localStream) {
      localStream.getTracks().forEach((track) => peerConnection.current.addTrack(track, localStream));
    }

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidatesRef, event.candidate.toJSON());
      }
    };

    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    const callDoc = await getDoc(callDocRef);
    if (!callDoc.exists()) {
      Alert.alert('Error', 'Call ID not found');
      return;
    }

    const callData = callDoc.data();
    const offerDescription = callData.offer;
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await setDoc(callDocRef, { answer }, { merge: true });

    // Listen for ICE candidates
    onSnapshot(offerCandidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.current.addIceCandidate(candidate);
        }
      });
    });
  };

  return (
    <View style={styles.container}>
      {!isCalling ? (
        <>
          <Text style={styles.title}>Enter Call ID to Join</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Call ID"
            value={callId}
            onChangeText={setCallId}
          />
          <Button title="Start Call" onPress={startCall} />
          <Button title="Join Call" onPress={joinCall} />
        </>
      ) : (
        <>
          <Text style={styles.title}>Call ID: {callId}</Text>
          <Text>Waiting for the other user to join...</Text>
        </>
      )}
      {remoteStream && (
        <View>
          <Text>Connected!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    width: '80%',
  },
});
