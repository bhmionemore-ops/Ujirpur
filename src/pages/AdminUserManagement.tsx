import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteField, where, getDocs } from 'firebase/firestore';
import { Users, Shield, CheckCircle, XCircle, Search, ArrowLeft, User, Mail, Facebook, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useFirebase } from '../FirebaseContext';
import { useLanguage } from '../LanguageContext';
import { toast } from 'sonner';

interface UserData {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'user';
  facebookId?: string;
  createdAt?: any;
  lastLogin?: any;
}

export const AdminUserManagement = () => {
  const { isAdmin, user: currentUser } = useFirebase();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      setUsers(docs);
      setLoading(false);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, 'users');
      } catch (e) {
        setError(e as Error);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [isAdmin, navigate]);

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      const newFacebookId = currentStatus ? deleteField() : `manual_${Date.now()}`;
      const newIsVerified = !currentStatus;

      // 1. Update User Document
      await updateDoc(userRef, {
        facebookId: newFacebookId
      });

      // 2. Update Influencer Profiles (if any)
      const q = query(collection(db, 'influencers'), where('uid', '==', userId));
      const influencerSnaps = await getDocs(q);
      
      if (!influencerSnaps.empty) {
        for (const influencerDoc of influencerSnaps.docs) {
          await updateDoc(doc(db, 'influencers', influencerDoc.id), {
            facebookId: newFacebookId,
            isVerified: newIsVerified
          });
        }
      }

      toast.success(language === 'bn' 
        ? (currentStatus ? 'ভেরিফিকেশন সরানো হয়েছে' : 'ব্যবহারকারী ভেরিফাইড করা হয়েছে') 
        : (currentStatus ? 'Verification removed' : 'User verified successfully')
      );
    } catch (err) {
      console.error(err);
      toast.error(language === 'bn' ? 'ব্যর্থ হয়েছে' : 'Operation failed');
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    if (userId === currentUser?.uid) {
      toast.error(language === 'bn' ? 'আপনি নিজের রোল পরিবর্তন করতে পারবেন না' : 'You cannot change your own role');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(userRef, {
        role: newRole
      });
      toast.success(language === 'bn' ? `রোল পরিবর্তন করা হয়েছে: ${newRole}` : `Role updated to ${newRole}`);
    } catch (err) {
      console.error(err);
      toast.error(language === 'bn' ? 'ব্যর্থ হয়েছে' : 'Operation failed');
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Link to="/admin/analytics" className="inline-flex items-center gap-2 text-zinc-500 hover:text-brand-600 font-bold text-sm mb-4 transition-colors">
              <ArrowLeft size={16} />
              Back to Analytics
            </Link>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight flex items-center gap-4">
              <Users size={40} className="text-brand-600" />
              User Management
            </h1>
            <p className="text-zinc-500 font-medium mt-2">Manage user roles and verification status</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white border border-zinc-200 rounded-2xl w-full md:w-80 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 font-bold">Loading users...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-zinc-50" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <User size={24} />
                      </div>
                    )}
                    {u.facebookId && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg">
                        <CheckCircle size={14} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-zinc-900 truncate flex items-center gap-2">
                      {u.displayName || 'Anonymous'}
                      {u.role === 'admin' && (
                        <span className="px-2 py-0.5 bg-brand-100 text-brand-600 text-[10px] uppercase tracking-widest rounded-full">Admin</span>
                      )}
                    </h3>
                    <p className="text-zinc-500 text-sm truncate flex items-center gap-1.5">
                      <Mail size={12} />
                      {u.email || 'No email'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Verification Toggle */}
                  <button
                    onClick={() => toggleVerification(u.id, !!u.facebookId)}
                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      u.facebookId 
                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <Facebook size={14} />
                    {u.facebookId ? 'Unverify' : 'Verify'}
                  </button>

                  {/* Role Toggle */}
                  <button
                    onClick={() => toggleRole(u.id, u.role)}
                    disabled={u.id === currentUser?.uid}
                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      u.role === 'admin'
                        ? 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    } ${u.id === currentUser?.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {u.role === 'admin' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                    {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                  </button>
                </div>
              </motion.div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-zinc-200">
                <Users size={48} className="text-zinc-200 mx-auto mb-4" />
                <p className="text-zinc-400 font-bold">No users found matching your search</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
