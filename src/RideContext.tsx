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

    const q = query(collection(db, 'vehicles'), where('driverUid', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setIsDriver(!snapshot.empty);
    }, (error) => {
      console.error("Error checking driver status:", error);
    });

    return () => unsub();
  }, [user]);

  // Listen for incoming requests if user is a driver
  useEffect(() => {
    if (!user || !isDriver) {
      setActiveIncomingRequest(null);
      return;
    }

    // Listen for pending requests that match driver's vehicle type or just all pending requests for now
    // In a real app, we'd filter by proximity and vehicle type
    const q = query(
      collection(db, 'ride_requests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestRequest = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        } as RideRequest;
        
        // Only show if it's a new request (within last 5 minutes)
        const now = new Date().getTime();
        const requestTime = latestRequest.createdAt?.toDate?.().getTime() || now;
        
        if (now - requestTime < 300000) { // 5 minutes
          setActiveIncomingRequest(latestRequest);
        }
      } else {
        setActiveIncomingRequest(null);
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'ride_requests');
      } catch (e) {
        console.error(e);
      }
    });

    return () => unsub();
  }, [user, isDriver]);

  const acceptRide = async (requestId: string) => {
    if (!user) return;
    try {
      const rideRef = doc(db, 'ride_requests', requestId);
      
      // Get driver details
      const q = query(collection(db, 'vehicles'), where('driverUid', '==', user.uid));
      const driverSnap = await onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const driverData = snap.docs[0].data();
          updateDoc(rideRef, {
            status: 'accepted',
            driverUid: user.uid,
            driverName: user.displayName || 'Driver',
            driverPhone: driverData.driverPhone || '',
            acceptedAt: serverTimestamp()
          });
          toast.success("Ride accepted!");
          setActiveIncomingRequest(null);
        }
      });
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
