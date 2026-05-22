import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext';
import { toast } from 'sonner';

export interface RideRequest {
  id: string;
  riderUid: string;
  riderName: string;
  riderPhone: string;
  from: string;
  to: string;
  vehicleType: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'completed';
  driverUid?: string;
  driverName?: string;
  driverPhone?: string;
  fare?: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  createdAt: any;
}

interface RideContextType {
  activeIncomingRequest: RideRequest | null;
  acceptRide: (requestId: string) => Promise<void>;
  declineRide: (requestId: string) => Promise<void>;
  isDriver: boolean;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useFirebase();
  const [activeIncomingRequest, setActiveIncomingRequest] = useState<RideRequest | null>(null);
  const [isDriver, setIsDriver] = useState(false);

  // Check if user is a driver
  useEffect(() => {
    if (!user) {
      setIsDriver(false);
      return;
    }

    const checkViaApi = async () => {
      try {
        const res = await fetch(`/api/admin/data/vehicles?limit=100`);
        if (res.ok) {
          const vehicles = await res.json();
          setIsDriver(vehicles.some((v: any) => v.driverUid === user.uid));
        }
      } catch (e) {}
    };

    const q = query(collection(db, 'vehicles'), where('driverUid', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setIsDriver(!snapshot.empty);
    }, (error) => {
      console.warn("Permission denied for vehicles, retrying via API:", error.message);
      checkViaApi();
    });

    return () => unsub();
  }, [user]);

  // Listen for incoming requests if user is a driver
  useEffect(() => {
    if (!user || !isDriver) {
      setActiveIncomingRequest(null);
      return;
    }

    const fetchViaApi = async () => {
      try {
        const res = await fetch(`/api/admin/data/ride_requests?limit=20`);
        if (res.ok) {
          const requests = await res.json();
          const valid = requests
            .filter((req: any) => req.status === 'pending' && req.riderUid !== user.uid);
          
          if (valid.length > 0) {
            setActiveIncomingRequest(valid[0]);
          } else {
            setActiveIncomingRequest(null);
          }
        }
      } catch (e) {}
    };

    // Listen for pending requests
    const q = query(
      collection(db, 'ride_requests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Get the most recent pending request that isn't from the current user
        const validRequests = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as RideRequest))
          .filter(req => req.riderUid !== user.uid);

        if (validRequests.length > 0) {
          const latestRequest = validRequests[0];
          setActiveIncomingRequest(prev => prev?.id === latestRequest.id ? prev : latestRequest);
        } else {
          setActiveIncomingRequest(null);
        }
      } else {
        setActiveIncomingRequest(null);
      }
    }, (error) => {
      console.warn("Permission denied for ride_requests, retrying via API:", error.message);
      fetchViaApi();
      // Also setup a poll because onSnapshot is dead
      const poll = setInterval(fetchViaApi, 10000);
      return () => clearInterval(poll);
    });

    return () => unsub();
  }, [user, isDriver]);

  const acceptRide = async (requestId: string) => {
    if (!user) return;
    try {
      const rideRef = doc(db, 'ride_requests', requestId);
      
      // Get driver details - Use getDocs instead of onSnapshot to avoid leaks and infinite loops
      const { getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'vehicles'), where('driverUid', '==', user.uid));
      const driverSnap = await getDocs(q);
      
      if (!driverSnap.empty) {
        const driverData = driverSnap.docs[0].data();
        await updateDoc(rideRef, {
          status: 'accepted',
          driverUid: user.uid,
          driverName: user.displayName || 'Driver',
          driverPhone: driverData.driverPhone || '',
          acceptedAt: serverTimestamp()
        });
        toast.success("Ride accepted!");
        setActiveIncomingRequest(null);
      }
    } catch (error) {
      toast.error("Failed to accept ride");
      console.error(error);
    }
  };

  const declineRide = async (requestId: string) => {
    // For now, just hide it locally
    setActiveIncomingRequest(null);
  };

  return (
    <RideContext.Provider value={{ activeIncomingRequest, acceptRide, declineRide, isDriver }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};
