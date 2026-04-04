import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, MapPin, Phone, Clock, CheckCircle2, XCircle, AlertCircle, Plus, Search, User, Navigation, ShieldCheck, Star, MessageCircle, Send, Mic, MicOff, PhoneOff, Volume2, X, ChevronRight, Activity, LocateFixed } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useFirebase } from '../FirebaseContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, getDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';

const BookingAlertModal = ({ 
  request, 
  onAccept, 
  onDecline 
}: { 
  request: RideRequest; 
  onAccept: () => void; 
  onDecline: () => void;
}) => {
  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1357/1357-preview.mp3');
    audio.loop = true;
    audio.play().catch(e => console.log('Audio play blocked'));
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-600">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl text-center space-y-8"
      >
        <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Car size={48} className="text-brand-600" />
        </div>
        
        <div>
          <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight mb-2">New Booking!</h2>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Incoming Ride Request</p>
        </div>

        <div className="space-y-6 text-left bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <div className="w-2 h-2 rounded-full bg-current" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pickup</p>
              <p className="font-bold text-zinc-900 line-clamp-2">{request.from}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Drop-off</p>
              <p className="font-bold text-zinc-900 line-clamp-2">{request.to}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estimated Fare</p>
              <p className="text-2xl font-black text-emerald-600">₹{request.fare}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rider</p>
              <p className="font-bold text-zinc-900">{request.riderName}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onDecline}
            className="py-5 bg-zinc-100 text-zinc-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            Accept
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Fix Leaflet default icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DriverIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Barnia Center Coordinates
const BARNIA_CENTER: [number, number] = [23.8859, 88.4869];

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

const MapClickHandler = ({ 
  onMapClick, 
  isPickingLocation, 
  onLocationSelect 
}: { 
  onMapClick: (e: L.LeafletMouseEvent) => void,
  isPickingLocation: string | null,
  onLocationSelect: (lat: number, lng: number) => void
}) => {
  const map = useMap();
  useEffect(() => {
    map.on('click', onMapClick);
    const onMoveEnd = () => {
      if (isPickingLocation) {
        const center = map.getCenter();
        onLocationSelect(center.lat, center.lng);
      }
    };
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('click', onMapClick);
      map.off('moveend', onMoveEnd);
    };
  }, [map, onMapClick, isPickingLocation, onLocationSelect]);
  return null;
};

const PickupIcon = L.divIcon({
  html: `
    <div class="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
      <div class="w-2 h-2 bg-white rounded-full"></div>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const DropoffIcon = L.divIcon({
  html: `
    <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white border-2 border-white shadow-lg rotate-45">
      <div class="w-2 h-2 bg-white rounded-sm -rotate-45"></div>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const RouteLine = ({ from, to }: { from: { lat: number; lng: number } | null, to: { lat: number; lng: number } | null }) => {
  if (!from || !to) return null;
  return (
    <>
      <Marker position={[from.lat, from.lng]} icon={PickupIcon}>
        <Popup>Pickup Location</Popup>
      </Marker>
      <Marker position={[to.lat, to.lng]} icon={DropoffIcon}>
        <Popup>Drop-off Location</Popup>
      </Marker>
      <Polyline positions={[[from.lat, from.lng], [to.lat, to.lng]]} color="#f58e27" weight={4} dashArray="10, 10" />
    </>
  );
};

interface Vehicle {
  id: string;
  driverUid: string;
  driverName: string;
  driverPhone: string;
  vehicleType: 'Toto' | 'Auto' | 'Bike' | 'Car';
  vehicleNumber: string;
  status: 'available' | 'busy' | 'offline';
  isVerified?: boolean;
  rating?: number;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  createdAt: any;
}

interface RideRequest {
  id: string;
  riderUid: string;
  riderName: string;
  riderPhone: string;
  from: string;
  to: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  vehicleId?: string;
  driverUid?: string;
  driverName?: string;
  driverPhone?: string;
  fare?: number;
  rating?: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  createdAt: any;
}

interface ChatMessage {
  id: string;
  requestId: string;
  senderUid: string;
  senderName: string;
  text: string;
  createdAt: any;
}

const RatingModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  driverName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (rating: number) => void;
  driverName: string;
}) => {
  const [rating, setRating] = useState(5);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mx-auto mb-6">
              <Star size={40} fill="currentColor" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-2">Rate your ride</h3>
            <p className="text-zinc-500 text-sm font-bold mb-8">How was your trip with {driverName}?</p>
            
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-2 transition-all ${rating >= star ? 'text-amber-400' : 'text-zinc-200'}`}
                >
                  <Star size={32} fill={rating >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            <button
              onClick={() => onSubmit(rating)}
              className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
            >
              Submit Rating
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const VoiceCallModal = ({ 
  isOpen, 
  onClose, 
  requestId, 
  callerUid, 
  receiverUid, 
  receiverName,
  isIncoming = false,
  callId: existingCallId
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  requestId: string; 
  callerUid: string; 
  receiverUid: string; 
  receiverName: string;
  isIncoming?: boolean;
  callId?: string;
}) => {
  const [status, setStatus] = useState<'calling' | 'ongoing' | 'ended' | 'missed'>('calling');
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pc = React.useRef<RTCPeerConnection | null>(null);
  const [callId, setCallId] = useState<string | null>(existingCallId || null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const setupCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);

        pc.current = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

        pc.current.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        if (isIncoming && existingCallId) {
          // Handle incoming call
          const callDoc = doc(db, 'ride_calls', existingCallId);
          const snapshot = await getDoc(callDoc);
          if (snapshot.exists()) {
            const data = snapshot.data();
            await pc.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            await updateDoc(callDoc, { answer, status: 'ongoing' });
            setStatus('ongoing');
          }
        } else {
          // Initiate call
          const newCallDoc = await addDoc(collection(db, 'ride_calls'), {
            requestId,
            callerUid,
            receiverUid,
            status: 'calling',
            createdAt: serverTimestamp()
          });
          setCallId(newCallDoc.id);

          pc.current.onicecandidate = (event) => {
            if (event.candidate) {
              updateDoc(newCallDoc, {
                iceCandidates: arrayUnion(event.candidate.toJSON())
              });
            }
          };

          const offer = await pc.current.createOffer();
          await pc.current.setLocalDescription(offer);
          await updateDoc(newCallDoc, { offer });

          // Listen for answer
          const unsub = onSnapshot(newCallDoc, (snapshot) => {
            const data = snapshot.data();
            if (data?.answer && !pc.current?.currentRemoteDescription) {
              pc.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
              setStatus('ongoing');
            }
            if (data?.status === 'ended') {
              cleanup();
              onClose();
            }
          });
          return unsub;
        }
      } catch (err) {
        console.error("Call setup error:", err);
        toast.error("Could not start voice call");
        onClose();
      }
    };

    setupCall();

    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    localStream?.getTracks().forEach(track => track.stop());
    pc.current?.close();
    if (callId) {
      updateDoc(doc(db, 'ride_calls', callId), { status: 'ended' });
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
      setIsMuted(!isMuted);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden p-12 text-center"
          >
            <div className="mb-12">
              <div className="w-32 h-32 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-8 relative">
                <div className="absolute inset-0 rounded-full border-4 border-brand-500/20 animate-ping" />
                <div className="w-24 h-24 rounded-full bg-brand-500 flex items-center justify-center text-white shadow-2xl shadow-brand-500/40">
                  <User size={48} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{receiverName}</h3>
              <p className="text-brand-500 font-black text-xs uppercase tracking-widest animate-pulse">
                {status === 'calling' ? 'Calling...' : 'Ongoing Call'}
              </p>
            </div>

            <div className="flex justify-center gap-6">
              <button
                onClick={toggleMute}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-zinc-700 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button
                onClick={() => {
                  cleanup();
                  onClose();
                }}
                className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/40"
              >
                <PhoneOff size={24} />
              </button>
            </div>

            <audio ref={remoteAudioRef} autoPlay />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const AssignedDriverIcon = L.divIcon({
  html: `
    <div class="relative">
      <div class="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-2xl border-4 border-white animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-1z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
      </div>
      <div class="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
    </div>
  `,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
});

const ServiceAreaModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-brand-500" />
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center text-brand-600">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Service Unavailable</h3>
              <p className="text-zinc-500 font-bold leading-relaxed">
                We're currently only serving the <span className="text-brand-600">Nadia District</span> area. 
                Our service is not yet available in your selected location.
              </p>
            </div>
            <div className="w-full p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center gap-3">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Want us in your area?</p>
              <a 
                href="mailto:info@barnia.in" 
                className="text-lg font-black text-brand-600 hover:text-brand-700 transition-colors"
              >
                info@barnia.in
              </a>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-500/20"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export const VillageTransportPage = () => {
  const { t, language } = useLanguage();
  const { user, setAuthModalOpen } = useFirebase();
  const [activeTab, setActiveTab] = useState<'find' | 'driver' | 'requests'>('find');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [myVehicle, setMyVehicle] = useState<Vehicle | null>(null);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [myRequests, setMyRequests] = useState<RideRequest[]>([]);
  const [currentRiderRide, setCurrentRiderRide] = useState<RideRequest | null>(null);
  const [activeDriverRide, setActiveDriverRide] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVehicleSelection, setShowVehicleSelection] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState<'pickup' | 'dropoff' | null>(null);
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('Toto');

  const isWithinServiceArea = (address: string) => {
    const lowerAddress = address.toLowerCase();
    return lowerAddress.includes('nadia') || lowerAddress.includes('krishnanagar') || lowerAddress.includes('kalyani') || lowerAddress.includes('ranaghat') || lowerAddress.includes('chakdaha');
  };

  const onMapClick = async (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data.display_name) address = data.display_name;
    } catch (error) {
      console.error("Reverse geocode error:", error);
    }

    if (!isWithinServiceArea(address)) {
      setShowServiceAreaModal(true);
      setIsPickingLocation(null);
      return;
    }

    if (isPickingLocation === 'pickup') {
      setPickupCoords({ lat, lng });
      setFromLocation(address);
      setIsPickingLocation(null);
      setShowRequestModal(true);
      setShowFromSuggestions(false);
      toast.success("Pickup location set!");
    } else if (isPickingLocation === 'dropoff') {
      setDropoffCoords({ lat, lng });
      setToLocation(address);
      setIsPickingLocation(null);
      setShowRequestModal(true);
      setShowToSuggestions(false);
      toast.success("Drop-off location set!");
    }
  };

  const searchLocations = async (query: string, type: 'from' | 'to') => {
    if (query.length < 3) {
      if (type === 'from') setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`);
      const data = await response.json();
      if (type === 'from') setFromSuggestions(data);
      else setToSuggestions(data);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromLocation && showFromSuggestions) searchLocations(fromLocation, 'from');
    }, 500);
    return () => clearTimeout(timer);
  }, [fromLocation, showFromSuggestions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (toLocation && showToSuggestions) searchLocations(toLocation, 'to');
    }, 500);
    return () => clearTimeout(timer);
  }, [toLocation, showToSuggestions]);

  // Registration states
  const [regVehicleType, setRegVehicleType] = useState<'Toto' | 'Auto' | 'Bike' | 'Car'>('Toto');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [isVehicleNumberValid, setIsVehicleNumberValid] = useState(true);
  const [regPhone, setRegPhone] = useState('');
  const [activeChat, setActiveChat] = useState<RideRequest | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeCall, setActiveCall] = useState<{
    requestId: string;
    callerUid: string;
    receiverUid: string;
    receiverName: string;
    isIncoming: boolean;
    callId?: string;
  } | null>(null);
  const [ratingRide, setRatingRide] = useState<RideRequest | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
  const [incomingBooking, setIncomingBooking] = useState<RideRequest | null>(null);
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Notification sound for drivers
  useEffect(() => {
    if (user && myVehicle && myVehicle.status === 'available') {
      const q = query(
        collection(db, 'ride_requests'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = { id: change.doc.id, ...change.doc.data() } as RideRequest;
            // Only notify if it's a new request (within last 30 seconds)
            const createdAt = data.createdAt?.toDate();
            if (createdAt && (new Date().getTime() - createdAt.getTime()) < 30000) {
              setIncomingBooking(data);
              toast.info(`New Ride Request: ${data.from} to ${data.to}`, {
                description: `Fare: ₹${data.fare || 'TBD'}`,
                duration: 10000,
              });
            }
          }
        });
      });
      return () => unsub();
    }
  }, [user, myVehicle]);

  // Geolocation tracking for drivers
  useEffect(() => {
    let watchId: number;
    if (user && myVehicle && myVehicle.status === 'available') {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await updateDoc(doc(db, 'vehicles', myVehicle.id), {
                location: {
                  lat: latitude,
                  lng: longitude,
                  updatedAt: new Date().toISOString()
                }
              });
            } catch (error) {
              console.error("Error updating location:", error);
            }
          },
          (error) => {
            console.error("Geolocation error:", error);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, myVehicle?.id, myVehicle?.status]);

  useEffect(() => {
    // Listen for available and busy vehicles (to track assigned drivers)
    const qVehicles = query(collection(db, 'vehicles'), where('status', 'in', ['available', 'busy']));
    const unsubVehicles = onSnapshot(qVehicles, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(docs);
      setLoading(false);
    });

    // Listen for my vehicle
    if (user) {
      const qMyVehicle = query(collection(db, 'vehicles'), where('driverUid', '==', user.uid));
      const unsubMyVehicle = onSnapshot(qMyVehicle, (snapshot) => {
        if (!snapshot.empty) {
          setMyVehicle({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vehicle);
        } else {
          setMyVehicle(null);
        }
      });

      // Listen for my ride requests (as a rider)
      const qMyRequests = query(
        collection(db, 'ride_requests'), 
        where('riderUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubMyRequests = onSnapshot(qMyRequests, (snapshot) => {
        setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRequest)));
      });

      return () => {
        unsubVehicles();
        unsubMyVehicle();
        unsubMyRequests();
      };
    }

    return () => unsubVehicles();
  }, [user]);

  useEffect(() => {
    // Listen for incoming requests (as a driver)
    if (user && myVehicle) {
      const qIncoming = query(
        collection(db, 'ride_requests'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const unsubIncoming = onSnapshot(qIncoming, (snapshot) => {
        setRideRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRequest)));
      });

      // Also listen for my active rides (accepted)
      const qActive = query(
        collection(db, 'ride_requests'),
        where('driverUid', '==', user.uid),
        where('status', '==', 'accepted'),
        orderBy('createdAt', 'desc')
      );
      const unsubActive = onSnapshot(qActive, (snapshot) => {
        const activeDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRequest));
        setRideRequests(prev => [...prev, ...activeDocs]);
      });

      return () => {
        unsubIncoming();
        unsubActive();
      };
    }
  }, [user, myVehicle]);

  useEffect(() => {
    if (activeChat) {
      const q = query(
        collection(db, 'ride_chat_messages'),
        where('requestId', '==', activeChat.id),
        orderBy('createdAt', 'asc')
      );
      const unsub = onSnapshot(q, (snapshot) => {
        setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      });
      return () => unsub();
    } else {
      setChatMessages([]);
    }
  }, [activeChat]);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls
    const q = query(
      collection(db, 'ride_calls'),
      where('receiverUid', '==', user.uid),
      where('status', '==', 'calling')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Find the ride request to get the caller's name
          getDoc(doc(db, 'ride_requests', data.requestId)).then((rideSnap) => {
            if (rideSnap.exists()) {
              const rideData = rideSnap.data();
              setActiveCall({
                requestId: data.requestId,
                callerUid: data.callerUid,
                receiverUid: data.receiverUid,
                receiverName: user.uid === rideData.riderUid ? rideData.driverName || 'Driver' : rideData.riderName,
                isIncoming: true,
                callId: change.doc.id
              });
            }
          });
        }
      });
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    // Find the most recent active ride for the rider
    const activeRide = myRequests.find(req => req.status === 'pending' || req.status === 'accepted');
    setCurrentRiderRide(activeRide || null);
  }, [myRequests]);

  useEffect(() => {
    // Find the most recent active ride for the driver
    const activeRide = rideRequests.find(req => req.status === 'accepted' && req.driverUid === user?.uid);
    setActiveDriverRide(activeRide || null);
  }, [rideRequests, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'ride_chat_messages'), {
        requestId: activeChat.id,
        senderUid: user.uid,
        senderName: user.displayName || 'User',
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!isWithinServiceArea(fromLocation) || !isWithinServiceArea(toLocation)) {
      setShowServiceAreaModal(true);
      return;
    }

    // Simple fare estimation logic
    setShowRequestModal(false);
    setShowVehicleSelection(true);
  };

  const handleConfirmRide = async () => {
    if (!user) return;

    const baseFares: Record<string, number> = {
      'Toto': 20,
      'Auto': 30,
      'Bike': 15,
      'Car': 100
    };
    const estimatedFare = baseFares[selectedVehicleType] || 20;

    try {
      await addDoc(collection(db, 'ride_requests'), {
        riderUid: user.uid,
        riderName: user.displayName || 'User',
        riderPhone: user.phoneNumber || '',
        from: fromLocation,
        to: toLocation,
        pickupCoords,
        dropoffCoords,
        vehicleType: selectedVehicleType,
        fare: estimatedFare,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success(t.transport.requestSent);
      setShowVehicleSelection(false);
      setFromLocation('');
      setToLocation('');
      setPickupCoords(null);
      setDropoffCoords(null);
    } catch (error) {
      console.error("Error requesting ride:", error);
      toast.error("Failed to request ride");
    }
  };

  const handleRatingSubmit = async (rating: number) => {
    if (!ratingRide) return;
    try {
      await updateDoc(doc(db, 'ride_requests', ratingRide.id), {
        rating
      });
      setRatingRide(null);
      toast.success("Thank you for your rating!");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    }
  };

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validation
    let isValid = true;
    if (!regPhone || !isPhoneValid) {
      toast.error(language === 'bn' ? "সঠিক ফোন নম্বর দিন" : "Please enter a valid 10-digit phone number");
      setIsPhoneValid(false);
      isValid = false;
    }

    if (regVehicleType !== 'Toto' && !regVehicleNumber) {
      toast.error(language === 'bn' ? "যানবাহন নম্বর দিন" : "Please enter vehicle number");
      setIsVehicleNumberValid(false);
      isValid = false;
    }

    if (!isValid) return;

    try {
      await addDoc(collection(db, 'vehicles'), {
        driverUid: user.uid,
        driverName: user.displayName || 'Driver',
        driverPhone: regPhone,
        vehicleType: regVehicleType,
        vehicleNumber: regVehicleNumber,
        status: 'available',
        createdAt: serverTimestamp()
      });
      toast.success("Vehicle registered successfully!");
      setShowRegisterModal(false);
    } catch (error) {
      console.error("Error registering vehicle:", error);
      toast.error("Failed to register vehicle");
    }
  };

  const updateRideStatus = async (requestId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'ride_requests', requestId), {
        status,
        driverUid: user?.uid,
        driverName: user?.displayName || 'Driver',
        driverPhone: myVehicle?.driverPhone || '',
        vehicleId: myVehicle?.id
      });
      
      // If accepted, mark vehicle as busy
      if (status === 'accepted' && myVehicle) {
        await updateDoc(doc(db, 'vehicles', myVehicle.id), { status: 'busy' });
      }
      // If completed or cancelled, mark vehicle as available
      if ((status === 'completed' || status === 'cancelled') && myVehicle) {
        await updateDoc(doc(db, 'vehicles', myVehicle.id), { status: 'available' });
      }

      toast.success(`Ride ${status}`);
    } catch (error) {
      console.error("Error updating ride status:", error);
      toast.error("Failed to update status");
    }
  };

  const toggleVehicleStatus = async () => {
    if (!myVehicle) return;
    const newStatus = myVehicle.status === 'available' ? 'offline' : 'available';
    try {
      await updateDoc(doc(db, 'vehicles', myVehicle.id), { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-black uppercase tracking-widest mb-6"
          >
            <Car size={14} />
            {t.transport.title}
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tight mb-6 uppercase">
            {language === 'bn' ? 'বার্নিয়া রাইড' : 'Barnia Ride'}
          </h1>
          <p className="text-zinc-500 font-medium max-w-2xl mx-auto text-lg">
            {t.transport.subtitle}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-1.5 rounded-3xl border border-zinc-200 shadow-sm flex gap-1">
            {[
              { id: 'find', label: language === 'bn' ? 'পরিবহন' : 'Poribohon', icon: Car },
              { id: 'driver', label: t.transport.driverMode, icon: User },
              { id: 'requests', label: language === 'bn' ? 'আমার রাইড' : 'My Rides', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
                {tab.id === 'requests' && currentRiderRide && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Rider Status Overlay (Uber-like) */}
        <AnimatePresence>
          {currentRiderRide && activeTab === 'find' && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-24 left-4 right-4 z-[50] md:left-auto md:right-8 md:w-[400px]"
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-brand-100 p-8 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-100 overflow-hidden">
                  {currentRiderRide.status === 'pending' && (
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-1/3 h-full bg-brand-600 shadow-[0_0_10px_rgba(234,88,12,0.5)]"
                    />
                  )}
                  {currentRiderRide.status === 'accepted' && (
                    <div className="w-full h-full bg-emerald-500" />
                  )}
                </div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-black text-zinc-900 uppercase tracking-tight">
                      {currentRiderRide.status === 'pending' 
                        ? (language === 'bn' ? 'ড্রাইভার খোঁজা হচ্ছে...' : 'Finding your ride...') 
                        : (language === 'bn' ? 'ড্রাইভার আসছে' : 'Driver Assigned')}
                    </h4>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                      Ride ID: #{currentRiderRide.id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                  <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-inner ${
                    currentRiderRide.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {currentRiderRide.status === 'pending' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      >
                        <Clock size={28} />
                      </motion.div>
                    ) : <Car size={28} />}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-600 shadow-sm">
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Destination</p>
                      <p className="font-bold text-zinc-900 truncate">{currentRiderRide.to}</p>
                    </div>
                  </div>

                  {currentRiderRide.status === 'accepted' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                          <User size={28} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Driver Assigned</p>
                          <h5 className="text-lg font-black text-zinc-900">{currentRiderRide.driverName}</h5>
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star size={12} fill="currentColor" />
                            <span className="text-xs font-black">4.8</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveChat(currentRiderRide)}
                          className="flex-1 py-3 bg-white text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={14} />
                          Chat
                        </button>
                        <a
                          href={`tel:${currentRiderRide.driverPhone}`}
                          className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                        >
                          <Phone size={14} />
                          Call
                        </a>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all"
                  >
                    View Details
                  </button>
                  {currentRiderRide.status === 'pending' && (
                    <button
                      onClick={() => updateRideStatus(currentRiderRide.id, 'cancelled')}
                      className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence mode="wait">
          <ServiceAreaModal 
            isOpen={showServiceAreaModal} 
            onClose={() => setShowServiceAreaModal(false)} 
          />

          {activeTab === 'find' && (
            <motion.div
              key="find"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`grid grid-cols-1 ${showVehicleSelection ? '' : 'lg:grid-cols-3'} gap-8 relative`}
            >
              {/* Request Card */}
              {!showVehicleSelection && (
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 shadow-sm sticky top-32">
                    <div className="w-16 h-16 rounded-3xl bg-brand-50 flex items-center justify-center text-brand-600 mb-8">
                      <Navigation size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-4 uppercase tracking-tight">{t.transport.requestRide}</h3>
                    <p className="text-zinc-500 text-sm font-medium mb-8 leading-relaxed">
                      {language === 'bn' ? 'আপনার গন্তব্য লিখুন এবং নিকটস্থ ড্রাইভারদের সাথে যোগাযোগ করুন।' : 'Enter your destination and connect with nearby drivers.'}
                    </p>
                    
                    <button
                      onClick={() => setShowRequestModal(true)}
                      className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3"
                    >
                      <Plus size={20} />
                      {t.transport.requestRide}
                    </button>

                    <div className="mt-8 pt-8 border-t border-zinc-100">
                      <div className="flex items-center gap-4 text-zinc-500">
                        <ShieldCheck size={20} className="text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-widest">{language === 'bn' ? 'নিরাপদ ও নির্ভরযোগ্য' : 'Safe & Reliable'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Vehicles */}
              <div className={`${showVehicleSelection ? 'col-span-full' : 'lg:col-span-2'} space-y-8`}>
                {/* Live Map */}
                <div className={`bg-white rounded-[2.5rem] border border-zinc-200 overflow-hidden shadow-sm relative z-0 transition-all duration-500 ${showVehicleSelection ? 'h-[calc(100vh-450px)]' : 'h-[400px]'}`}>
                  <MapContainer center={BARNIA_CENTER} zoom={14} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapClickHandler 
                      onMapClick={onMapClick} 
                      isPickingLocation={isPickingLocation}
                      onLocationSelect={(lat, lng) => {
                        // This updates the coords as the map moves
                        if (isPickingLocation === 'pickup') {
                          setPickupCoords({ lat, lng });
                        } else if (isPickingLocation === 'dropoff') {
                          setDropoffCoords({ lat, lng });
                        }
                      }}
                    />
                    <RouteLine 
                      from={currentRiderRide?.pickupCoords || activeDriverRide?.pickupCoords || pickupCoords} 
                      to={currentRiderRide?.dropoffCoords || activeDriverRide?.dropoffCoords || dropoffCoords} 
                    />
                    {(currentRiderRide?.pickupCoords || activeDriverRide?.pickupCoords || pickupCoords) && (
                      <MapUpdater center={[(currentRiderRide?.pickupCoords || activeDriverRide?.pickupCoords || pickupCoords)!.lat, (currentRiderRide?.pickupCoords || activeDriverRide?.pickupCoords || pickupCoords)!.lng]} />
                    )}
                    {vehicles.map((vehicle) => {
                      const isAssignedToMe = currentRiderRide?.driverUid === vehicle.driverUid;
                      const isMe = user?.uid === vehicle.driverUid;
                      
                      // Only show available vehicles OR the one assigned to me OR my own vehicle
                      if (vehicle.status !== 'available' && !isAssignedToMe && !isMe) return null;

                      return (
                        vehicle.location && (
                          <Marker 
                            key={vehicle.id} 
                            position={[vehicle.location.lat, vehicle.location.lng]}
                            icon={isAssignedToMe ? AssignedDriverIcon : DriverIcon}
                          >
                            <Popup>
                              <div className="p-2">
                                <p className="font-black text-zinc-900 uppercase tracking-tight">
                                  {isAssignedToMe ? 'Your Driver' : vehicle.vehicleType}
                                </p>
                                <p className="text-xs font-bold text-zinc-500">{vehicle.driverName}</p>
                                <p className="text-xs font-bold text-brand-600 mt-1">{vehicle.status}</p>
                              </div>
                            </Popup>
                          </Marker>
                        )
                      );
                    })}
                  </MapContainer>

                  {isPickingLocation && (
                    <div className="absolute inset-0 z-[1001] pointer-events-none flex items-center justify-center">
                      <div className="relative -translate-y-8">
                        <div className="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce">
                          <MapPin size={28} className="text-white" />
                        </div>
                        <div className="w-3 h-3 bg-brand-600/40 rounded-full mx-auto mt-1 blur-[1px]" />
                        
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-16 pointer-events-auto">
                          <div className="bg-zinc-900 text-white px-4 py-2 rounded-xl shadow-2xl border border-zinc-800 whitespace-nowrap">
                            <p className="text-[10px] font-black uppercase tracking-widest">
                              {isPickingLocation === 'pickup' ? 'Set Pickup' : 'Set Drop-off'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isPickingLocation && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1002] flex flex-col items-center gap-4">
                      <button
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((position) => {
                              const { latitude, longitude } = position.coords;
                              setPickupCoords({ lat: latitude, lng: longitude });
                              // MapUpdater will handle the zoom/center
                            });
                          }
                        }}
                        className="w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center text-zinc-900 hover:bg-zinc-50 transition-all border border-zinc-200"
                      >
                        <LocateFixed size={24} />
                      </button>
                      <button
                        onClick={async () => {
                          const coords = isPickingLocation === 'pickup' ? pickupCoords : dropoffCoords;
                          if (coords) {
                            try {
                              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`);
                              const data = await res.json();
                              if (data.display_name) {
                                if (isPickingLocation === 'pickup') setFromLocation(data.display_name);
                                else setToLocation(data.display_name);
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          setIsPickingLocation(null);
                          setShowRequestModal(true);
                        }}
                        className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-brand-700 transition-all"
                      >
                        Confirm Location
                      </button>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Live Tracking</span>
                    </div>
                  </div>
                  {showVehicleSelection && (
                    <button 
                      onClick={() => {
                        setShowVehicleSelection(false);
                        setShowRequestModal(true);
                      }}
                      className="absolute top-4 left-4 z-[1000] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-zinc-900 hover:bg-zinc-50 transition-all"
                    >
                      <ChevronRight size={24} className="rotate-180" />
                    </button>
                  )}
                </div>

                {!showVehicleSelection && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loading ? (
                      Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-48 bg-zinc-100 rounded-[2.5rem] animate-pulse" />
                      ))
                    ) : vehicles.length > 0 ? (
                      vehicles.map((vehicle) => (
                        <motion.div
                          key={vehicle.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 hover:shadow-xl hover:shadow-zinc-200/50 transition-all group"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                              <Car size={28} />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                                {t.transport.pending}
                              </div>
                              {vehicle.isVerified && (
                                <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                                  <CheckCircle2 size={12} />
                                  <span className="text-[8px] font-black uppercase tracking-widest">Verified</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{vehicle.vehicleType}</h4>
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star size={14} fill="currentColor" />
                              <span className="text-sm font-black">{vehicle.rating || '4.8'}</span>
                            </div>
                          </div>
                          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6">{vehicle.vehicleNumber}</p>
                          
                          <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-zinc-600">
                              <User size={16} className="text-brand-500" />
                              <span className="text-sm font-bold">{vehicle.driverName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-600">
                              <Phone size={16} className="text-brand-500" />
                              <span className="text-sm font-bold">{vehicle.driverPhone}</span>
                            </div>
                          </div>

                          <a
                            href={`tel:${vehicle.driverPhone}`}
                            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center justify-center gap-3"
                          >
                            <Phone size={16} />
                            {t.transport.contact}
                          </a>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-300 mx-auto mb-6">
                          <Car size={40} />
                        </div>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest">{t.transport.noVehicles}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'driver' && (
            <motion.div
              key="driver"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-4xl mx-auto"
            >
              {!myVehicle ? (
                <div className="bg-white rounded-[2.5rem] border border-zinc-200 p-12 text-center shadow-sm">
                  <div className="w-24 h-24 rounded-[2rem] bg-brand-50 flex items-center justify-center text-brand-600 mx-auto mb-8">
                    <Car size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-zinc-900 mb-4 uppercase tracking-tight">{t.transport.becomeDriver}</h3>
                  <p className="text-zinc-500 font-medium mb-12 max-w-md mx-auto">
                    {language === 'bn' ? 'আপনার যানবাহন নথিভুক্ত করুন এবং বার্নিয়ার মানুষের সেবা করুন।' : 'Register your vehicle and serve the people of Barnia.'}
                  </p>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-12 py-5 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
                  >
                    {t.transport.registerVehicle}
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Driver Map */}
                  <div className="bg-white rounded-[2.5rem] border border-zinc-200 overflow-hidden shadow-sm h-[300px] relative z-0">
                    <MapContainer 
                      center={myVehicle.location ? [myVehicle.location.lat, myVehicle.location.lng] : BARNIA_CENTER} 
                      zoom={15} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <RouteLine 
                        from={activeDriverRide?.pickupCoords || selectedRide?.pickupCoords} 
                        to={activeDriverRide?.dropoffCoords || selectedRide?.dropoffCoords} 
                      />
                      {(activeDriverRide?.pickupCoords || selectedRide?.pickupCoords || (myVehicle.location && { lat: myVehicle.location.lat, lng: myVehicle.location.lng })) && (
                        <MapUpdater center={
                          activeDriverRide?.pickupCoords 
                            ? [activeDriverRide.pickupCoords.lat, activeDriverRide.pickupCoords.lng]
                            : selectedRide?.pickupCoords
                              ? [selectedRide.pickupCoords.lat, selectedRide.pickupCoords.lng]
                              : [myVehicle.location!.lat, myVehicle.location!.lng]
                        } />
                      )}
                      {myVehicle.location && (
                        <Marker position={[myVehicle.location.lat, myVehicle.location.lng]} icon={DriverIcon}>
                          <Popup>
                            <span className="font-bold">Your Location</span>
                          </Popup>
                        </Marker>
                      )}
                    </MapContainer>
                    <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${myVehicle.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                          {myVehicle.status === 'available' ? 'Broadcasting Location' : 'Location Hidden'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Driver Status Card */}
                  <div className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center text-brand-600 border border-zinc-100">
                        <Car size={40} />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{myVehicle.vehicleType}</h4>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{myVehicle.vehicleNumber}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border ${
                        myVehicle.status === 'available' 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                          : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                      }`}>
                        {myVehicle.status}
                      </div>
                      <button
                        onClick={toggleVehicleStatus}
                        className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          myVehicle.status === 'available'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'
                        }`}
                      >
                        {myVehicle.status === 'available' ? 'Go Offline' : 'Go Online'}
                      </button>
                    </div>
                  </div>

                  {/* Incoming Requests */}
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-4">
                      <AlertCircle className="text-brand-600" />
                      {language === 'bn' ? 'আগত অনুরোধ' : 'Incoming Requests'}
                    </h3>
                    
                    {rideRequests.length > 0 ? (
                      rideRequests.map((request) => (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 shadow-sm hover:border-brand-300 transition-all"
                        >
                          <div className="flex flex-col md:flex-row justify-between gap-8">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                                  <User size={24} />
                                </div>
                                <div>
                                  <h5 className="font-black text-zinc-900 uppercase tracking-tight">{request.riderName}</h5>
                                  <p className="text-zinc-500 text-xs font-bold">{request.riderPhone}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.transport.from}</p>
                                  <p className="font-bold text-zinc-900">{request.from}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.transport.to}</p>
                                  <p className="font-bold text-zinc-900">{request.to}</p>
                                </div>
                              </div>

                              {request.fare && (
                                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 mb-6">
                                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Estimated Fare</p>
                                  <p className="text-2xl font-black text-emerald-700">₹{request.fare}</p>
                                </div>
                              )}

                              {request.pickupCoords && request.dropoffCoords && (
                                <button
                                  onClick={() => {
                                    setSelectedRide(request);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest hover:text-brand-700 transition-colors"
                                >
                                  <Navigation size={14} />
                                  View Route on Map
                                </button>
                              )}
                            </div>

                            <div className="flex flex-row md:flex-col gap-3 justify-end">
                              {request.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => updateRideStatus(request.id, 'accepted')}
                                    className="flex-1 md:flex-none px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle2 size={16} />
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => updateRideStatus(request.id, 'cancelled')}
                                    className="flex-1 md:flex-none px-8 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                                  >
                                    <XCircle size={16} />
                                    Decline
                                  </button>
                                </>
                              ) : request.status === 'accepted' ? (
                                <>
                                  <button
                                    onClick={() => setActiveChat(request)}
                                    className="flex-1 md:flex-none px-8 py-4 bg-brand-50 text-brand-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-100 transition-all flex items-center justify-center gap-2"
                                  >
                                    <MessageCircle size={16} />
                                    Chat
                                  </button>
                                  <button
                                    onClick={() => setActiveCall({
                                      requestId: request.id,
                                      callerUid: user?.uid || '',
                                      receiverUid: request.riderUid,
                                      receiverName: request.riderName,
                                      isIncoming: false
                                    })}
                                    className="flex-1 md:flex-none px-8 py-4 bg-brand-50 text-brand-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-100 transition-all flex items-center justify-center gap-2"
                                  >
                                    <Volume2 size={16} />
                                    Online Call
                                  </button>
                                  <a
                                    href={`tel:${request.riderPhone}`}
                                    className="flex-1 md:flex-none px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                                  >
                                    <Phone size={16} />
                                    Call
                                  </a>
                                  <button
                                    onClick={() => {
                                      updateRideStatus(request.id, 'completed');
                                      // No rating for driver to rider in this simple version
                                    }}
                                    className="flex-1 md:flex-none px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle2 size={16} />
                                    Complete
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="py-12 text-center bg-zinc-50 rounded-[2.5rem] border border-dashed border-zinc-200">
                        <p className="text-zinc-400 font-bold uppercase tracking-widest">No active requests</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              {myRequests.length > 0 ? (
                myRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                          <Car size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ride ID</p>
                          <p className="font-bold text-zinc-900">#{request.id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                          request.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          request.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' :
                          request.status === 'completed' ? 'bg-blue-50 text-blue-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {request.status}
                        </div>
                        {request.fare && (
                          <p className="text-emerald-600 font-black text-lg mt-2">₹{request.fare}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mt-1 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-current" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.transport.from}</p>
                            <p className="font-bold text-zinc-900">{request.from}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 mt-1 shrink-0">
                            <MapPin size={12} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.transport.to}</p>
                            <p className="font-bold text-zinc-900">{request.to}</p>
                          </div>
                        </div>
                        {request.pickupCoords && request.dropoffCoords && (
                          <button
                            onClick={() => {
                              setSelectedRide(request);
                              setActiveTab('find');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest hover:text-brand-700 transition-colors mt-4"
                          >
                            <Navigation size={14} />
                            View Route on Map
                          </button>
                        )}
                      </div>

                      {request.status === 'accepted' && (
                        <div className="space-y-4">
                          <div className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Driver Assigned</p>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400">
                                  <User size={20} />
                                </div>
                                <div>
                                  <p className="font-bold text-zinc-900">{request.driverName || 'Driver'}</p>
                                  <p className="text-zinc-500 text-xs font-bold">{request.driverPhone}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setActiveChat(request)}
                                  className="p-3 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all"
                                >
                                  <MessageCircle size={20} />
                                </button>
                                <button
                                  onClick={() => setActiveCall({
                                    requestId: request.id,
                                    callerUid: user?.uid || '',
                                    receiverUid: request.driverUid || '',
                                    receiverName: request.driverName || 'Driver',
                                    isIncoming: false
                                  })}
                                  className="p-3 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all"
                                >
                                  <Volume2 size={20} />
                                </button>
                                <a
                                  href={`tel:${request.driverPhone}`}
                                  className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all"
                                >
                                  <Phone size={20} />
                                </a>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ShieldCheck size={18} className="text-red-600" />
                              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Safety Center</span>
                            </div>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">
                              SOS
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <button
                        onClick={() => updateRideStatus(request.id, 'cancelled')}
                        className="text-xs font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors"
                      >
                        Cancel Request
                      </button>
                    )}

                    {request.status === 'completed' && !request.rating && (
                      <button
                        onClick={() => setRatingRide(request)}
                        className="w-full mt-4 py-4 bg-brand-50 text-brand-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Star size={16} />
                        Rate Driver
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-300 mx-auto mb-6">
                    <Clock size={40} />
                  </div>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest">No ride history</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {showRequestModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRequestModal(false)}
                className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-zinc-100 flex items-center gap-4 bg-white sticky top-0 z-10">
                  <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <X size={24} className="text-zinc-900" />
                  </button>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">Plan your trip</h3>
                </div>

                <div className="p-6 space-y-6">
                  <div className="flex gap-3 mb-6">
                    <button 
                      onClick={() => {
                        setIsPickingLocation('pickup');
                        setShowRequestModal(false);
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((position) => {
                            const { latitude, longitude } = position.coords;
                            setPickupCoords({ lat: latitude, lng: longitude });
                          });
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full text-sm font-bold text-brand-600 border border-brand-100"
                    >
                      <LocateFixed size={16} />
                      Live Pickup
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-sm font-bold text-zinc-900">
                      <User size={16} />
                      For me
                      <ChevronRight size={14} className="rotate-90" />
                    </button>
                  </div>

                  <div className="relative bg-white border-2 border-zinc-900 rounded-3xl p-4 flex gap-4">
                    <div className="flex flex-col items-center py-2">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-zinc-900 bg-white" />
                      <div className="w-0.5 flex-1 bg-zinc-900 my-1" />
                      <div className="w-2.5 h-2.5 bg-zinc-900" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={fromLocation}
                          onChange={(e) => {
                            setFromLocation(e.target.value);
                            setShowFromSuggestions(true);
                          }}
                          onFocus={() => setShowFromSuggestions(true)}
                          placeholder="Where from?"
                          className="w-full py-2 bg-transparent outline-none font-bold text-lg placeholder:text-zinc-300"
                        />
                        {fromLocation && (
                          <button onClick={() => setFromLocation('')} className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-zinc-100 rounded-full">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="h-px bg-zinc-100" />
                      <div className="relative">
                        <input
                          type="text"
                          value={toLocation}
                          onChange={(e) => {
                            setToLocation(e.target.value);
                            setShowToSuggestions(true);
                          }}
                          onFocus={() => setShowToSuggestions(true)}
                          placeholder="Where to?"
                          className="w-full py-2 bg-transparent outline-none font-bold text-lg placeholder:text-zinc-300"
                        />
                        {toLocation && (
                          <button onClick={() => setToLocation('')} className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-zinc-100 rounded-full">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <button className="p-2 bg-zinc-100 rounded-full self-center">
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {/* Suggestions list */}
                    {(showFromSuggestions ? fromSuggestions : toSuggestions).map((s, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          if (!isWithinServiceArea(s.display_name)) {
                            setShowServiceAreaModal(true);
                            return;
                          }
                          if (showFromSuggestions) {
                            setFromLocation(s.display_name);
                            setPickupCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                            setShowFromSuggestions(false);
                          } else {
                            setToLocation(s.display_name);
                            setDropoffCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                            setShowToSuggestions(false);
                          }
                        }}
                        className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 rounded-2xl transition-all border-b border-zinc-50 last:border-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 shrink-0">
                          <MapPin size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-bold text-zinc-900 truncate">{s.display_name.split(',')[0]}</p>
                          <p className="text-xs text-zinc-500 font-medium truncate">{s.display_name}</p>
                        </div>
                        <p className="text-xs text-zinc-400 font-bold shrink-0">{(Math.random() * 10).toFixed(1)} mi</p>
                      </button>
                    ))}

                    <button 
                      onClick={() => {
                        setIsPickingLocation(showFromSuggestions ? 'pickup' : 'dropoff');
                        setShowRequestModal(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 rounded-2xl transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900">
                        <Navigation size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-zinc-900">Set location on map</p>
                      </div>
                    </button>
                  </div>

                  {fromLocation && toLocation && (
                    <button
                      onClick={handleRequestRide}
                      className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl"
                    >
                      Choose a trip
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {showVehicleSelection && (
            <div className="fixed inset-0 z-[120] flex items-end justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowVehicleSelection(false)}
                className="absolute inset-0 bg-transparent"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-2xl bg-white rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-t border-zinc-200"
              >
                <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-4 shrink-0" />
                
                <div className="px-8 pb-4 border-b border-zinc-100">
                  <h3 className="text-xl font-black text-zinc-900 text-center uppercase tracking-tight">Choose a trip</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {[
                    { type: 'Toto', name: 'Go Non AC', capacity: 4, time: '5 min', price: 20, icon: Car, badge: null },
                    { type: 'Bike', name: 'Bike', capacity: 1, time: '2 min', price: 15, icon: Navigation, badge: 'Faster' },
                    { type: 'Auto', name: 'Barnia Go', capacity: 3, time: '5 min', price: 30, icon: Car, badge: null },
                    { type: 'Car', name: 'Premier', capacity: 4, time: '10 min', price: 100, icon: Car, badge: 'Top Rated' },
                  ].map((v) => (
                    <button
                      key={v.type}
                      onClick={() => setSelectedVehicleType(v.type as any)}
                      className={`w-full p-4 rounded-3xl border-2 transition-all flex items-center gap-4 ${
                        selectedVehicleType === v.type
                          ? 'border-zinc-900 bg-zinc-50'
                          : 'border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      <div className="w-20 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                        <v.icon size={32} className="text-zinc-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-zinc-900 uppercase tracking-tight">{v.name}</p>
                          <div className="flex items-center gap-1 text-zinc-400">
                            <User size={12} />
                            <span className="text-xs font-bold">{v.capacity}</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {v.time}</p>
                        {v.badge && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-brand-100 text-brand-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                            {v.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-black text-zinc-900">₹{v.price}</p>
                    </button>
                  ))}
                </div>

                <div className="p-6 bg-white border-t border-zinc-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-sm font-bold text-zinc-900">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">
                        ₹
                      </div>
                      Cash
                      <ChevronRight size={14} className="rotate-90" />
                    </button>
                    <button className="p-3 bg-zinc-100 rounded-full text-zinc-900">
                      <Clock size={20} />
                    </button>
                  </div>

                  <button
                    onClick={handleConfirmRide}
                    className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl"
                  >
                    Choose {selectedVehicleType}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showRegisterModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRegisterModal(false)}
                className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{t.transport.registerVehicle}</h3>
                  <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-zinc-200 rounded-xl transition-colors">
                    <XCircle size={24} className="text-zinc-400" />
                  </button>
                </div>
                <form onSubmit={handleRegisterVehicle} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t.transport.vehicleType}</label>
                    <select
                      value={regVehicleType}
                      onChange={(e) => setRegVehicleType(e.target.value as any)}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-bold text-sm appearance-none"
                    >
                      <option value="Toto">Toto</option>
                      <option value="Auto">Auto</option>
                      <option value="Bike">Bike</option>
                      <option value="Car">Car</option>
                    </select>
                  </div>
                  
                  {regVehicleType !== 'Toto' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{language === 'bn' ? 'যানবাহন নম্বর' : 'Vehicle Number'}</label>
                      <input
                        required
                        type="text"
                        value={regVehicleNumber}
                        onChange={(e) => {
                          setRegVehicleNumber(e.target.value);
                          setIsVehicleNumberValid(e.target.value !== '');
                        }}
                        placeholder="e.g. WB 52 X 1234"
                        className={`w-full px-6 py-4 bg-zinc-50 border rounded-2xl focus:ring-2 outline-none transition-all font-bold text-sm ${
                          isVehicleNumberValid ? 'border-zinc-200 focus:ring-brand-500/20 focus:border-brand-500' : 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                        }`}
                      />
                      {!isVehicleNumberValid && (
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">{language === 'bn' ? 'যানবাহন নম্বর দিন' : 'Vehicle number is required'}</p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t.transport.phone}</label>
                    <input
                      required
                      type="tel"
                      value={regPhone}
                      onChange={(e) => {
                        setRegPhone(e.target.value);
                        const isValid = /^[6-9]\d{9}$/.test(e.target.value.replace(/\D/g, ''));
                        setIsPhoneValid(isValid || e.target.value === '');
                      }}
                      placeholder="10-digit mobile number"
                      className={`w-full px-6 py-4 bg-zinc-50 border rounded-2xl focus:ring-2 outline-none transition-all font-bold text-sm ${
                        isPhoneValid ? 'border-zinc-200 focus:ring-brand-500/20 focus:border-brand-500' : 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                      }`}
                    />
                    {!isPhoneValid && (
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">Invalid phone number. Please enter a valid 10-digit number.</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
                  >
                    {t.transport.registerVehicle}
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {incomingBooking && (
            <BookingAlertModal
              request={incomingBooking}
              onAccept={() => {
                updateRideStatus(incomingBooking.id, 'accepted');
                setIncomingBooking(null);
              }}
              onDecline={() => setIncomingBooking(null)}
            />
          )}

          {activeChat && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveChat(null)}
                className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[600px]"
              >
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-zinc-900 uppercase tracking-tight">
                        {user?.uid === activeChat.riderUid ? activeChat.driverName || 'Driver' : activeChat.riderName}
                      </h3>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Live Chat</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveChat(null)} className="p-2 hover:bg-zinc-200 rounded-xl transition-colors">
                    <XCircle size={24} className="text-zinc-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-zinc-50/30">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderUid === user?.uid ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${
                            msg.senderUid === user?.uid
                              ? 'bg-brand-600 text-white rounded-tr-none'
                              : 'bg-white border border-zinc-100 text-zinc-900 rounded-tl-none shadow-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-300 mb-4">
                        <MessageCircle size={32} />
                      </div>
                      <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Start the conversation</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-zinc-100">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-bold text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:shadow-none"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {activeCall && (
            <VoiceCallModal
              isOpen={!!activeCall}
              onClose={() => setActiveCall(null)}
              requestId={activeCall.requestId}
              callerUid={activeCall.callerUid}
              receiverUid={activeCall.receiverUid}
              receiverName={activeCall.receiverName}
              isIncoming={activeCall.isIncoming}
              callId={activeCall.callId}
            />
          )}

          {ratingRide && (
            <RatingModal
              isOpen={!!ratingRide}
              onClose={() => setRatingRide(null)}
              onSubmit={handleRatingSubmit}
              driverName={ratingRide.driverName || 'Driver'}
            />
          )}
        </AnimatePresence>

        {/* Safety Center Floating Button */}
        <div className="fixed bottom-8 right-8 z-[1000]">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSafetyModal(true)}
            className="w-16 h-16 bg-red-600 text-white rounded-full shadow-2xl shadow-red-500/40 flex items-center justify-center hover:bg-red-700 transition-all border-4 border-white"
          >
            <AlertCircle size={32} />
          </motion.button>
        </div>

        {/* Safety Modal */}
        <AnimatePresence>
          {showSafetyModal && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
                <button 
                  onClick={() => setShowSafetyModal(false)}
                  className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
                    <AlertCircle size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight mb-2">Safety Center</h2>
                  <p className="text-zinc-500 font-medium">Your safety is our top priority in Barnia.</p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => window.open('tel:100')}
                    className="w-full p-6 bg-red-600 text-white rounded-2xl flex items-center justify-between group hover:bg-red-700 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Phone size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-black uppercase tracking-widest text-xs opacity-80">Emergency</p>
                        <p className="text-xl font-black">Call Police (100)</p>
                      </div>
                    </div>
                    <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
                  </button>

                  <button 
                    onClick={() => window.open('tel:102')}
                    className="w-full p-6 bg-emerald-600 text-white rounded-2xl flex items-center justify-between group hover:bg-emerald-700 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Activity size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-black uppercase tracking-widest text-xs opacity-80">Medical</p>
                        <p className="text-xl font-black">Ambulance (102)</p>
                      </div>
                    </div>
                    <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
                  </button>

                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-zinc-900 uppercase tracking-widest text-[10px] mb-4">Safety Tips</h4>
                    <ul className="space-y-3">
                      {[
                        'Share your ride status with family',
                        'Verify vehicle number before boarding',
                        'Always wear a helmet/seatbelt',
                        'Report any suspicious behavior'
                      ].map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 font-medium">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
