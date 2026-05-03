/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Download, 
  MessageSquare,
  Menu,
  X,
  Star,
  Users,
  Award,
  BookOpen,
  Search,
  Send,
  Calendar,
  User,
  MessageCircle,
  LogIn,
  LogOut,
  Mail as MailIcon,
  Lock,
  Chrome,
  ChevronRight,
  FilePlus,
  Edit
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReactMarkdown from 'react-markdown';
import { 
  collection, 
  addDoc,
  setDoc,
  serverTimestamp, 
  doc, 
  getDocFromServer,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, auth, app } from './firebase';

const storage = getStorage(app);
import { cn } from './utils';
import { 
  BUSINESS_DETAILS, 
  COURSES, 
  FEATURES, 
  TESTIMONIALS, 
  STUDY_MATERIALS,
  BLOG_POSTS 
} from './constants';
import { getChatResponse, ChatMessage } from './services/aiService';

// --- Validation Schemas ---

const enquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid 10-digit phone number').max(15),
  course: z.string().min(1, 'Please select a course'),
});

type EnquiryFormData = z.infer<typeof enquirySchema>;

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormData = z.infer<typeof authSchema>;

// --- Components ---

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }: { isOpen: boolean; onClose: () => void; initialMode?: 'login' | 'signup' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode, isOpen]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const handleEmailAuth = async (data: AuthFormData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: data.email,
          role: 'student',
          createdAt: serverTimestamp(),
        });
      }
      setIsAuthSuccess(true);
      setTimeout(() => {
        onClose();
        setIsAuthSuccess(false);
        reset();
      }, 2000);
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      const errorCode = err.code;
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setAuthError('Invalid email or password. Please try again.');
      } else if (errorCode === 'auth/email-already-in-use') {
        setAuthError('This email is already registered. Please login instead.');
      } else if (errorCode === 'auth/weak-password') {
        setAuthError('Password is too weak. Please use at least 6 characters.');
      } else if (errorCode === 'auth/network-request-failed') {
        setAuthError('Network error. Please check your internet connection.');
      } else {
        setAuthError(`Auth Error: ${err.message || 'Something went wrong.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Ensure profile exists in Firestore
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDocFromServer(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          role: 'student',
          createdAt: serverTimestamp(),
        });
      }

      setIsAuthSuccess(true);
      setTimeout(() => {
        onClose();
        setIsAuthSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError('Popup blocked! Please allow popups for this site to sign in with Google.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled. Please try again.');
      } else {
        setAuthError(`Google Auth Failed: ${err.message || 'Try email login instead.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="bg-red-600 p-8 text-white relative overflow-hidden flex items-center gap-6">
           <img 
             src={BUSINESS_DETAILS.logo} 
             alt="Logo" 
             className="h-20 w-20 object-contain bg-white rounded-full p-2 shadow-xl relative z-10"
             referrerPolicy="no-referrer"
           />
           <div className="relative z-10">
              <h3 className="text-2xl font-black mb-1">{isLogin ? 'Welcome Back!' : 'Start Your Journey'}</h3>
              <p className="text-white/80 text-sm italic">Kautilya Academy Rewa Portal</p>
           </div>
           <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full"></div>
           <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors font-bold text-white">
              <X size={20}/>
           </button>
        </div>

        <div className="p-8">
           {isAuthSuccess ? (
             <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                   <CheckCircle2 size={40}/>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">{isLogin ? 'Login Successful' : 'Account Created'}</h3>
                <p className="text-slate-600">Redirecting to your student portal...</p>
             </div>
           ) : (
             <>
                {/* Independent Form - Separated from other site forms */}
                <form onSubmit={handleSubmit(handleEmailAuth)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                    <div className="relative">
                        <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                        <input 
                          {...register('email')}
                          type="email" 
                          placeholder="name@example.com"
                          autoComplete="email"
                          className={cn(
                            "w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-red-600/20 focus:border-red-600",
                            errors.email ? "border-red-500" : "border-slate-200"
                          )}
                        />
                    </div>
                    {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                        <input 
                          {...register('password')}
                          type="password" 
                          placeholder="••••••••"
                          autoComplete={isLogin ? "current-password" : "new-password"}
                          className={cn(
                            "w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-red-600/20 focus:border-red-600",
                            errors.password ? "border-red-500" : "border-slate-200"
                          )}
                        />
                    </div>
                    {errors.password && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.password.message}</p>}
                  </div>

                  {authError && <p className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">{authError}</p>}

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : (isLogin ? 'Login to Portal' : 'Create My Account')}
                  </button>
                </form>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold">Or continue with</span></div>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Chrome size={20} className="text-slate-600"/> Continue with Google
                </button>

                <p className="mt-8 text-center text-sm text-slate-500">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setAuthError(null); reset(); }}
                    className="ml-1 text-red-600 font-black hover:underline"
                  >
                    {isLogin ? 'Fast Sign Up' : 'Login instead'}
                  </button>
                </p>
             </>
           )}
        </div>
      </motion.div>
    </div>
  );
};

const CourseModal = ({ isOpen, onClose, course }: { isOpen: boolean; onClose: () => void; course: any }) => {
  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <div className="bg-red-600 p-8 text-white relative overflow-hidden">
           <div className="relative z-10 flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <BookOpen size={32}/>
              </div>
              <div>
                <h3 className="text-2xl font-black">{course.title}</h3>
                <p className="text-white/80 font-medium">Detailed Course Information</p>
              </div>
           </div>
           <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full"></div>
           <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={24}/>
           </button>
        </div>

        <div className="p-8 space-y-8">
           <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                 <div className="bg-red-100 text-red-600 p-2 rounded-lg"><Calendar size={20}/></div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                    <p className="text-lg font-bold text-slate-900">{course.duration}</p>
                 </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                 <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Award size={20}/></div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course Fee</p>
                    <p className="text-lg font-bold text-slate-900">{course.fees || 'Contact for Details'}</p>
                 </div>
              </div>
           </div>

           <div>
              <h4 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                 <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
                 Comprehensive Syllabus
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                 {course.syllabus?.map((item: string, idx: number) => (
                   <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-red-200 hover:bg-red-50/10 transition-colors">
                      <CheckCircle2 size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{item}</span>
                   </div>
                 )) || <p className="text-slate-500 text-sm">Syllabus details coming soon...</p>}
              </div>
           </div>

           <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                    <h4 className="text-xl font-bold mb-2">Ready to Start?</h4>
                    <p className="text-slate-400 text-sm">Join our specialized batch starting next week.</p>
                 </div>
                 <div className="flex gap-4">
                    <a href={BUSINESS_DETAILS.whatsappLink} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all text-sm">WhatsApp Inquiry</a>
                    <button onClick={onClose} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm">Close</button>
                 </div>
              </div>
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-red-600/10 rounded-full"></div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

const AdminEmails = ['kautilyaacademyrewa91@gmail.com', 'mahaksaket9@gmail.com'];

const AdminPortal = ({ user, onBack }: { user: FirebaseUser; onBack: () => void }) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [status, setStatus] = useState({ isOpen: false, material: null as any });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'study_materials'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterials(docs);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      // Logic for deleting from Firestore. Storage deletion would be nice too but requires URL parsing.
      // await deleteDoc(doc(db, 'study_materials', id));
      alert('Delete feature coming soon - currently requires direct Firestore access for safety.');
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="pt-32 text-center">Loading Admin Portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-slate-900 p-8 rounded-3xl text-white shadow-2xl">
          <div>
            <h2 className="text-3xl font-black mb-2">Admin Command Center</h2>
            <p className="text-white/60 text-sm font-medium">Manage your institution's digital assets</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setStatus({ isOpen: true, material: null })}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
            >
              <FilePlus size={20}/>
              Upload PDF
            </button>
            <button 
              onClick={onBack}
              className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold transition-all border border-white/10"
            >
              Back to Site
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden text-slate-900">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-bold text-lg">Manage Study Materials</h3>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{materials.length} Items Listed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Date Added</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {materials.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase tracking-widest">{item.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                         <button onClick={() => setStatus({ isOpen: true, material: item })} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><Edit size={18}/></button>
                         <a href={item.url} target="_blank" rel="noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Download size={18}/></a>
                         <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><X size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AdminMaterialModal 
        isOpen={status.isOpen} 
        onClose={() => setStatus({ isOpen: false, material: null })} 
        material={status.material}
      />
    </div>
  );
};

const StudentDashboard = ({ user, onBack }: { user: FirebaseUser; onBack: () => void }) => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, we would fetch from Firestore here.
    // For this build, I'll simulate fetching or use real queries if possible.
    // Since I can't easily add data to the DB, I'll provide demo state if empty.
    
    const fetchData = async () => {
      try {
        // Real logic would be: 
        // const q = query(collection(db, 'enrollments'), where('userId', '==', user.uid));
        // ... etc
        
        // Simulating delay
        await new Promise(r => setTimeout(r, 1000));
        
        setEnrollments([
          { id: '1', courseTitle: 'MPPSC Target Batch 2024', enrolledAt: new Date().toISOString(), status: 'active' },
          { id: '2', courseTitle: 'UPSC Foundation Course', enrolledAt: new Date().toISOString(), status: 'active' }
        ]);
        
        setSchedules([
          { id: '1', title: 'MPPSC Prelims Mock Test', date: '2024-06-15T10:00:00Z', duration: '2 Hours' },
          { id: '2', title: 'Answer Writing Workshop', date: '2024-06-20T14:00:00Z', duration: '3 Hours' }
        ]);
        
        setMaterials([
          { id: '1', title: 'MP History Notes - Part 1', category: 'History', url: '#' },
          { id: '2', title: 'Current Affairs - May 2024', category: 'General Awareness', url: '#' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Student Dashboard</h2>
            <p className="text-slate-500 font-medium italic">Welcome back, {user.email}</p>
          </div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-red-600 font-bold transition-colors"
          >
            <ArrowRight size={20} className="rotate-180"/>
            Back to Public Site
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Enrolled Courses */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <BookOpen size={24} className="text-red-600" />
                My Enrollments
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {enrollments.map(enrollment => (
                  <div key={enrollment.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-red-200 transition-all">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">{enrollment.status}</p>
                    <h4 className="font-bold text-slate-900 mb-2">{enrollment.courseTitle}</h4>
                    <p className="text-xs text-slate-400">Joined: {new Date(enrollment.enrolledAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Personalized Study Materials */}
            <section className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Download size={24} className="text-blue-600" />
                Study Materials
              </h3>
              <div className="space-y-3">
                {materials.map(material => (
                  <div key={material.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Download size={18}/></div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{material.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{material.category}</p>
                      </div>
                    </div>
                    <a href={material.url} className="text-xs font-bold text-blue-600 hover:underline">Download PDF</a>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Test Schedules */}
          <div className="space-y-8">
            <section className="bg-slate-900 p-8 rounded-3xl shadow-2xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <Calendar size={24} className="text-red-500" />
                  Test Schedule
                </h3>
                <div className="space-y-6">
                  {schedules.map(test => (
                    <div key={test.id} className="border-l-2 border-red-500 pl-4 space-y-1">
                      <p className="text-xs font-bold text-red-500 uppercase tracking-[0.2em]">
                        {new Date(test.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <h4 className="font-bold text-sm">{test.title}</h4>
                      <p className="text-[10px] text-white/60">{test.duration} • Online Portal</p>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/30">
                  View Full Calendar
                </button>
              </div>
              <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-red-600/10 rounded-full blur-3xl"></div>
            </section>

            {/* Quick Actions */}
            <div className="p-6 bg-white rounded-3xl border border-slate-100 space-y-4">
              <h4 className="font-bold text-slate-900">Need Guidance?</h4>
              <button className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between group transition-all">
                <span className="text-sm font-bold text-slate-700">Chat with Mentor</span>
                <MessageSquare size={18} className="text-slate-400 group-hover:text-red-600" />
              </button>
              <button className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between group transition-all">
                <span className="text-sm font-bold text-slate-700">Submit Feedback</span>
                <Star size={18} className="text-slate-400 group-hover:text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ 
  onShowDashboard, 
  onShowAdmin,
  showDashboard, 
  user,
  onLogout 
}: { 
  onShowDashboard: () => void; 
  onShowAdmin: () => void;
  showDashboard: boolean;
  user: FirebaseUser | null;
  onLogout: () => void;
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Courses', href: '#courses' },
    { name: 'Results', href: '#results' },
    { name: 'Blog', href: '#blog' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 py-3",
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src="logo.png" 
              alt="Kautilya Academy" 
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className={cn(
                  "text-sm font-medium hover:text-red-600 transition-colors",
                  isScrolled ? "text-slate-600" : "text-white/90"
                )}
              >
                {link.name}
              </a>
            ))}
            
            <div className="h-6 w-px bg-slate-200 mx-2 hidden lg:block"></div>

            {user ? (
              <div className="flex items-center gap-4">
                 {!showDashboard && (
                   <div className="flex gap-2">
                     {user.email && AdminEmails.includes(user.email) && (
                        <button 
                          onClick={onShowAdmin}
                          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-all shadow-lg"
                        >
                          <Lock size={14}/>
                          Admin Portal
                        </button>
                     )}
                     <button 
                       onClick={onShowDashboard}
                       className="hidden lg:flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                     >
                       Student Dashboard
                       <ArrowRight size={14}/>
                     </button>
                   </div>
                 )}
                 <div className="hidden lg:block text-right">
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", isScrolled ? "text-slate-400" : "text-white/60")}>Logged in as</p>
                    <p className={cn("text-xs font-bold", isScrolled ? "text-slate-900" : "text-white")}>{user.email}</p>
                 </div>
                 <button 
                   onClick={handleLogout}
                   className="p-2 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                   title="Logout"
                 >
                   <LogOut size={18}/>
                 </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openAuth('login')}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all border",
                    isScrolled 
                      ? "border-slate-200 text-slate-700 hover:bg-slate-50" 
                      : "border-white/20 text-white hover:bg-white/10"
                  )}
                >
                  Login
                </button>
                <button 
                  onClick={() => openAuth('signup')}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all",
                    isScrolled 
                      ? "bg-slate-900 text-white hover:bg-slate-800" 
                      : "bg-white text-slate-900 hover:bg-slate-100"
                  )}
                >
                  Sign Up
                </button>
              </div>
            )}

            <a 
              href={BUSINESS_DETAILS.whatsappLink}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-red-600/30 active:scale-95"
            >
              Enquiry Now
            </a>
          </div>

          <button 
            className={cn("md:hidden p-2", isScrolled ? "text-slate-900" : "text-white")}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 bg-white shadow-xl p-4 flex flex-col gap-4 md:hidden border-t"
            >
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href}
                  className="text-slate-800 font-medium py-2 px-4 hover:bg-slate-50 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                 {user ? (
                   <div className="flex flex-col gap-3">
                      {!showDashboard && (
                        <>
                          {user.email && AdminEmails.includes(user.email) && (
                            <button 
                              onClick={() => { onShowAdmin(); setIsMobileMenuOpen(false); }}
                              className="bg-slate-900 text-white text-center py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                              <Lock size={18}/>
                              Admin Portal
                            </button>
                          )}
                          <button 
                            onClick={() => { onShowDashboard(); setIsMobileMenuOpen(false); }}
                            className="bg-red-600 text-white text-center py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                          >
                            Student Dashboard
                            <ArrowRight size={18}/>
                          </button>
                        </>
                      )}
                      <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                         <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Session</p>
                            <p className="text-sm font-bold text-slate-900">{user.email}</p>
                         </div>
                         <button onClick={handleLogout} className="text-red-600 p-2"><LogOut size={20}/></button>
                      </div>
                   </div>
                 ) : (
                   <>
                    <button 
                      onClick={() => openAuth('login')}
                      className="bg-slate-50 text-slate-900 text-center py-3 rounded-lg font-bold border border-slate-200"
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => openAuth('signup')}
                      className="bg-slate-900 text-white text-center py-3 rounded-lg font-bold"
                    >
                      Sign Up
                    </button>
                   </>
                 )}
                 <a 
                   href={BUSINESS_DETAILS.whatsappLink}
                   className="bg-red-600 text-white text-center py-3 rounded-lg font-bold"
                 >
                   Enquiry Now
                 </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authModalMode}
      />
    </>
  );
};

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-slate-900">
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1920&auto=format&fit=crop" 
          alt="Students Studying"
          className="w-full h-full object-cover opacity-30"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 z-10 w-full grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Best in Madhya Pradesh
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
            Rewa's No.1 Coaching for <br/>
            <span className="text-red-600">Government Exams</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-xl">
            Providing expert guidance for UPSC, MPPSC, SSC & Banking with curated results and personal mentorship in the heart of Rewa.
          </p>
          <div className="flex flex-wrap gap-4">
            <a 
              href="#contact" 
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-red-600/30 transition-all active:scale-95"
            >
              Enroll Now <ArrowRight size={18}/>
            </a>
            <a 
              href={BUSINESS_DETAILS.whatsappLink}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-bold flex items-center gap-2 border border-white/10 transition-all active:scale-95"
            >
              WhatsApp Us <MessageSquare size={18}/>
            </a>
          </div>
          <div className="mt-12 flex items-center gap-6">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <img 
                  key={i}
                  src={`https://i.pravatar.cc/150?u=${i}`} 
                  alt="Student"
                  className="w-12 h-12 rounded-full border-4 border-slate-900 object-cover"
                />
              ))}
            </div>
            <div>
              <div className="flex text-amber-400 mb-1">
                <Star size={16} fill="currentColor"/>
                <Star size={16} fill="currentColor"/>
                <Star size={16} fill="currentColor"/>
                <Star size={16} fill="currentColor"/>
                <Star size={16} fill="currentColor"/>
              </div>
              <p className="text-white text-sm font-medium">Rated 4.9 ⭐ by 5000+ students</p>
            </div>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.8, delay: 0.2 }}
           className="hidden lg:block relative"
        >
          <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-red-600/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col gap-6">
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                 <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold">U</div>
                 <div>
                   <p className="text-white font-bold">UPSC Pre-Batch</p>
                   <p className="text-slate-400 text-sm">Starts 15th May</p>
                 </div>
               </div>
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 self-end w-4/5">
                 <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">M</div>
                 <div>
                   <p className="text-white font-bold">MPPSC Specialized</p>
                   <p className="text-slate-400 text-sm">Foundation Batch</p>
                 </div>
               </div>
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                 <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold">S</div>
                 <div>
                   <p className="text-white font-bold">SSC Excellence</p>
                   <p className="text-slate-400 text-sm">Daily Speed Tests</p>
                 </div>
               </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-red-600 rounded-2xl rotate-12 -z-10 animate-pulse"></div>
        </motion.div>
      </div>
    </div>
  );
};

const StatsSection = () => {
  const stats = [
    { label: 'Total Selections', value: '1200+', icon: Award },
    { label: 'Active Students', value: '800+', icon: Users },
    { label: 'Expert Mentors', value: '25+', icon: BookOpen },
    { label: 'Success Rate', value: '85%', icon: CheckCircle2 },
  ];

  return (
    <div className="py-12 bg-white relative -mt-12 z-20 shadow-xl max-w-6xl mx-auto rounded-3xl overflow-hidden border border-slate-100">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 bg-red-50/50 rounded-full flex items-center justify-center text-red-600 mb-4">
              <stat.icon size={24}/>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const CourseSection = ({ onSelectCourse }: { onSelectCourse: (course: any) => void }) => {
  return (
    <section id="courses" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-red-600 font-bold uppercase tracking-widest text-sm mb-4">Our Specializations</h2>
          <p className="text-3xl md:text-5xl font-black text-slate-900 mb-6">Master Your Future With Our Expert Courses</p>
          <div className="h-1.5 w-20 bg-red-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {COURSES.map((course, i) => (
            <motion.div 
              key={course.id}
              whileHover={{ y: -10 }}
              onClick={() => onSelectCourse(course)}
              className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col h-full group cursor-pointer"
            >
              <div className="bg-red-50 text-red-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                <BookOpen size={28}/>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{course.title}</h3>
              <p className="text-slate-600 mb-6 flex-grow line-clamp-3">{course.description}</p>
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                 <span className="text-sm font-bold text-slate-400">{course.duration}</span>
                 <button className="text-red-600 font-bold text-sm flex items-center gap-1 hover:translate-x-1 transition-transform">
                   Details <ArrowRight size={14}/>
                 </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SuccessStrategiesSection = () => {
  const strategies = [
    {
      title: "Consistency is Key",
      tip: "Consistency beats talent when talent doesn't work hard. Study every single day.",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop",
      icon: Calendar
    },
    {
      title: "Smart Revision",
      tip: "Revise daily to retain concepts longer. Don't wait for the weekend to start over.",
      image: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
      icon: BookOpen
    },
    {
      title: "Analyze PYQs",
      tip: "Focus on Previous Year Questions for better exam understanding and pattern recognition.",
      image: "https://images.unsplash.com/photo-1454165833767-023023023023?q=80&w=600&auto=format&fit=crop",
      icon: Search
    },
    {
      title: "Mock Test Mastery",
      tip: "Regular mock tests improve speed and accuracy. Treat every mock as the final exam.",
      image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop",
      icon: CheckCircle2
    },
    {
      title: "Quality Over Quantity",
      tip: "4 hours of focused study is always better than 10 hours with distractions.",
      image: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=80&w=600&auto=format&fit=crop",
      icon: Star
    },
    {
      title: "Stay Motivated",
      tip: "Believe in yourself and you're halfway there. Your hard work will pay off.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop",
      icon: Award
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-red-600 font-bold uppercase tracking-widest text-sm mb-4">Aspirant's Guide</h2>
          <h3 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">Success Strategies for Competitive Exams</h3>
          <p className="text-slate-500 font-medium">Expert-curated tips and daily motivation to help you stay ahead in your journey to excellence.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {strategies.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 group"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded-xl text-red-600 shadow-sm">
                   <item.icon size={20}/>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-red-600 transition-colors">{item.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{item.tip}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
    </section>
  );
};

const WhyChooseUs = () => {
  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400&auto=format&fit=crop" alt="Classroom" className="rounded-3xl object-cover w-full h-80 shadow-lg" referrerPolicy="no-referrer"/>
                  <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=400&auto=format&fit=crop" alt="Students" className="rounded-3xl object-cover w-full h-48 shadow-lg" referrerPolicy="no-referrer"/>
                </div>
                <div className="space-y-4 pt-12">
                   <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400&auto=format&fit=crop" alt="Mentorship" className="rounded-3xl object-cover w-full h-48 shadow-lg" referrerPolicy="no-referrer"/>
                   <img src="https://images.unsplash.com/photo-1491841573634-28140fc7ced7?q=80&w=400&auto=format&fit=crop" alt="Library" className="rounded-3xl object-cover w-full h-80 shadow-lg" referrerPolicy="no-referrer"/>
                </div>
             </div>
          </div>

          <div>
             <h2 className="text-red-600 font-bold uppercase tracking-widest text-sm mb-4">Why Kautilya Academy</h2>
             <h3 className="text-3xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">We Build Foundations for Your Dream Success</h3>
             
             <div className="grid gap-8">
                {FEATURES.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                       <CheckCircle2 size={24}/>
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h4>
                       <p className="text-slate-600">{f.description}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ResultsSection = () => {
  return (
    <section id="results" className="py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
           <div className="max-w-2xl">
              <h2 className="text-red-500 font-bold uppercase tracking-widest text-sm mb-4">Wall of Fame</h2>
              <p className="text-3xl md:text-5xl font-black mb-6">Our Radiant Selections in MPPSC & SSC</p>
           </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
           {TESTIMONIALS.map((t, i) => (
             <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-3xl relative">
                <div className="flex text-amber-400 mb-6">
                   {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor"/>)}
                </div>
                <p className="text-lg text-slate-200 mb-8 font-medium italic">"{t.text}"</p>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center font-bold text-white uppercase">{t.name[0]}</div>
                   <div>
                      <p className="font-bold text-white">{t.name}</p>
                      <p className="text-red-500 text-xs font-bold uppercase">{t.rank}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
};

const BlogPostDetail = ({ post, onBack }: { post: any; onBack: () => void }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-32 pb-20 px-4 max-w-4xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-bold mb-8 transition-colors"
      >
        <ArrowRight size={20} className="rotate-180" />
        Back to Insights
      </button>

      <div className="rounded-3xl overflow-hidden shadow-2xl bg-white border border-slate-100">
        <div className="h-64 md:h-[400px] w-full overflow-hidden">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        </div>
        
        <div className="p-8 md:p-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              {post.category}
            </span>
            <span className="text-slate-400 text-sm font-medium italic">
              By {post.author}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
            {post.title}
          </h1>

          <div className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-red-600">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-8 rounded-2xl gap-6">
               <div>
                  <h4 className="font-bold text-slate-900 text-lg">Interested in this topic?</h4>
                  <p className="text-slate-500 text-sm">Join our batch to get personalized mentorship and complete material.</p>
               </div>
               <button className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/25">
                 Join Academy Today
               </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BlogSection = ({ onSelectPost }: { onSelectPost: (post: any) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'UPSC', 'MPPSC', 'SSC', 'Current Affairs', 'Study Tips'];

  const filteredPosts = BLOG_POSTS.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section id="blog" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
           <div className="max-w-xl text-center md:text-left">
              <h2 className="text-red-600 font-bold uppercase tracking-widest text-sm mb-4">Success Resources</h2>
              <h3 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">Master Your Preparation with <span className="text-red-600">Expert Insights</span></h3>
              <p className="text-slate-500 font-medium text-lg">Strategies, tips, and updates to stay ahead in your competitive journey.</p>
           </div>
           
           <div className="w-full md:w-auto flex flex-col gap-4">
              <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                 <input 
                   type="text" 
                   placeholder="Search articles..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full md:w-80 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all shadow-sm"
                 />
              </div>
              <div className="flex gap-2 pb-2 scrollbar-none">
                 {categories.map(cat => (
                   <button 
                     key={cat}
                     onClick={() => setSelectedCategory(cat)}
                     className={cn(
                       "px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap border-2",
                       selectedCategory === cat 
                         ? "bg-red-600 border-red-600 text-white shadow-xl shadow-red-600/30" 
                         : "bg-white border-slate-100 text-slate-500 hover:border-red-600 hover:text-red-600"
                     )}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredPosts.map((post, idx) => (
             <motion.article 
               key={post.id}
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.1 }}
               className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col group h-full hover:-translate-y-2 transition-all duration-300"
             >
               <div className="relative h-56 overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 left-4">
                     <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-red-600 uppercase tracking-widest">
                        {post.category}
                     </span>
                  </div>
               </div>
               <div className="p-8 flex flex-col flex-grow">
                  <h4 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-red-600 transition-colors leading-snug">{post.title}</h4>
                  <p className="text-slate-500 text-sm mb-8 flex-grow leading-relaxed font-medium">{post.excerpt}</p>
                  <button 
                    onClick={() => onSelectPost(post)}
                    className="flex items-center gap-2 text-red-600 font-bold text-sm group"
                  >
                    Read Full Article 
                    <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
             </motion.article>
           ))}
        </div>
      </div>
    </section>
  );
};

const AdminMaterialModal = ({ isOpen, onClose, material = null }: { isOpen: boolean; onClose: () => void; material?: any }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (material) {
      setTitle(material.title || '');
      setCategory(material.category || 'General');
    } else {
      setTitle('');
      setCategory('General');
      setFile(null);
    }
  }, [material, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      if (material) {
        // Mode: Edit
        const docRef = doc(db, 'study_materials', material.id);
        const updateData: any = {
          title,
          category,
          updatedAt: serverTimestamp()
        };

        // If a new file is provided during edit
        if (file) {
          const storageRef = ref(storage, `study_materials/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          updateData.url = downloadURL;
        }

        await updateDoc(docRef, updateData);
      } else {
        // Mode: Create
        if (!file || !title) {
          alert('Title and file are required for new uploads.');
          setIsUploading(false);
          return;
        }

        const storageRef = ref(storage, `study_materials/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await addDoc(collection(db, 'study_materials'), {
          title,
          category,
          url: downloadURL,
          createdAt: serverTimestamp(),
          label: 'New'
        });
      }

      onClose();
    } catch (error) {
      console.error('Operation failed:', error);
      alert('Operation failed. Please check permissions.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">{material ? 'Edit Material' : 'Upload Study Material'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20"
              placeholder="e.g. Indian Polity Notes"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20"
            >
              <option>General</option>
              <option>MPPSC</option>
              <option>UPSC</option>
              <option>SSC/Banking</option>
              <option>Current Affairs</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              {material ? 'Replace PDF (Optional)' : 'PDF File'}
            </label>
            <input 
              type="file" 
              accept=".pdf"
              required={!material}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
            />
          </div>
          <button 
            type="submit" 
            disabled={isUploading}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
          >
            {isUploading ? 'Processing...' : (material ? 'Save Changes' : 'Upload Now')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const StudyMaterialSection = () => {
  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    // Real-time listener for materials
    const q = query(collection(db, 'study_materials'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterials(docs);
    });

    return () => unsubscribe();
  }, []);

  // Seed default data if empty (one-time check)
  useEffect(() => {
    const seedData = async () => {
      try {
        const q = query(collection(db, 'study_materials'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          const defaults = [
            { title: "Monthly Current Affairs - May 2024", category: "Current Affairs", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", label: "New" },
            { title: "Indian Polity: Fast-Track Notes", category: "UPSC/MPPSC", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", label: "Premium" },
            { title: "Economy 2024: Budget Highlights", category: "Economy", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", label: "Hot" },
            { title: "SSC CGL Practice Set - 12", category: "SSC", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", label: "Free" },
            { title: "History Short Notes for Prelims", category: "UPSC", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
            { title: "Geography: Map Mastery Guide", category: "Geography", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
          ];

          for (const item of defaults) {
            await addDoc(collection(db, 'study_materials'), {
              ...item,
              createdAt: serverTimestamp()
            });
          }
        }
      } catch (e) {
        console.error('Seeding error:', e);
      }
    };
    seedData();
  }, []);

  return (
    <section id="materials" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              Latest <span className="text-red-600 italic">Study Material</span>
            </h2>
            <p className="text-slate-500 text-lg font-medium">Access our high-quality PDFs, notes, and preparation guides curated by experts.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(materials.length > 0 ? materials : []).map((item, idx) => (
            <motion.div 
              key={item.id || idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-white border border-slate-100 p-8 rounded-3xl hover:border-red-200 hover:shadow-2xl hover:shadow-red-600/5 transition-all group relative overflow-hidden"
            >
              {item.label && (
                <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-red-600/20">
                  {item.label}
                </div>
              )}
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                <Download size={28}/>
              </div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-2">{item.category}</p>
              <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-red-600 transition-colors">{item.title}</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
                Comprehensive study guide covering key concepts and exam-oriented tips.
              </p>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-4 px-6 bg-slate-50 rounded-xl flex items-center justify-center gap-3 font-bold text-slate-900 group-hover:bg-red-600 group-hover:text-white transition-all transform group-hover:scale-[1.02]"
              >
                <span>Download PDF</span>
                <ChevronRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform"/>
              </a>
            </motion.div>
          ))}
          {materials.length === 0 && (
            <p className="text-slate-400 italic">No materials found. Seeding initial data...</p>
          )}
        </div>
      </div>
    </section>
  );
};

const EnquiryForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<EnquiryFormData>({
    resolver: zodResolver(enquirySchema),
  });

  const onSubmit = async (data: EnquiryFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'enquiries'), { ...data, createdAt: serverTimestamp() });
      setIsSuccess(true);
    } catch (e) {
      setError('Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="contact" className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden">
      {isSuccess ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40}/></div>
          <h3 className="text-3xl font-black text-slate-900">Request Sent!</h3>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <h3 className="text-3xl font-black text-slate-900 mb-4">Get Free Counselling</h3>
          <input {...register('name')} placeholder="Name" className="w-full px-5 py-4 bg-slate-50 border rounded-xl" />
          <input {...register('phone')} placeholder="Phone" className="w-full px-5 py-4 bg-slate-50 border rounded-xl" />
          <select {...register('course')} className="w-full px-5 py-4 bg-slate-50 border rounded-xl">
             <option value="">Select Course</option>
             {COURSES.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
          </select>
          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-red-600 text-white rounded-xl font-bold">
            {isSubmitting ? "Submitting..." : "Get Free Counselling"}
          </button>
        </form>
      )}
    </div>
  );
};

const ContactSection = () => {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
           <div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-8">Reach Out to Us</h2>
              <div className="space-y-8 mb-12">
                 <div className="flex gap-6"><MapPin className="text-red-600" size={28}/> <div><p className="font-bold">{BUSINESS_DETAILS.address}</p></div></div>
                 <div className="flex gap-6"><Phone className="text-red-600" size={28}/> <div><p className="font-bold">{BUSINESS_DETAILS.phone}</p></div></div>
                 <div className="flex gap-6"><Mail className="text-red-600" size={28}/> <div><p className="font-bold">{BUSINESS_DETAILS.email}</p></div></div>
              </div>
              <div className="w-full h-80 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                 <iframe src={BUSINESS_DETAILS.googleMapEmbed} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"></iframe>
              </div>
           </div>
           <div className="lg:sticky lg:top-32"><EnquiryForm /></div>
        </div>
      </div>
    </section>
  );
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', content: 'Namaste! How can I help you today?' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    const response = await getChatResponse([...messages, userMsg]);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mb-4 w-96 h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="bg-red-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <img src={BUSINESS_DETAILS.logo} className="h-8 w-8 bg-white rounded-full p-0.5" alt="Bot Logo" referrerPolicy="no-referrer" />
                 <p className="font-bold">Kautilya Assistant</p>
              </div>
              <button onClick={() => setIsOpen(false)}><X size={20}/></button>
            </div>
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
               {messages.map((msg, i) => (
                 <div key={i} className={cn("flex max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm", msg.role === 'user' ? "ml-auto bg-red-600 text-white" : "bg-white text-slate-800")}>
                   <ReactMarkdown>{msg.content}</ReactMarkdown>
                 </div>
               ))}
            </div>
            <div className="p-4 bg-white border-t flex gap-2">
               <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-grow px-4 py-2 border rounded-xl outline-none" placeholder="Ask a question..." />
               <button onClick={handleSend} className="bg-red-600 text-white p-2 rounded-xl"><Send size={18}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isOpen && <button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl"><MessageCircle size={32}/></button>}
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white pt-24 pb-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-4">
              <img 
                src={BUSINESS_DETAILS.logo} 
                alt="Kautilya Academy" 
                className="h-12 w-12 object-contain bg-white rounded-full p-1 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-bold text-lg">Kautilya Academy <span className="text-red-600">Rewa</span></p>
                <p className="text-slate-500 text-xs tracking-widest uppercase font-bold">Shaping Futures Since 2003</p>
              </div>
           </div>
           <p className="text-slate-500 text-sm">© 2024 Kautilya Academy Rewa. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedBlogPost, setSelectedBlogPost] = useState<any>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setShowDashboard(false);
        setShowAdminPortal(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-red-600 selection:text-white">
      <Navbar 
        onShowDashboard={() => { setShowDashboard(true); setShowAdminPortal(false); }} 
        onShowAdmin={() => { setShowAdminPortal(true); setShowDashboard(false); }}
        showDashboard={showDashboard || showAdminPortal} 
        user={user}
        onLogout={() => signOut(auth)}
      />
      
      {showAdminPortal && user && AdminEmails.includes(user.email || '') ? (
        <AdminPortal user={user} onBack={() => setShowAdminPortal(false)} />
      ) : showDashboard && user ? (
        <StudentDashboard user={user} onBack={() => setShowDashboard(false)} />
      ) : selectedBlogPost ? (
        <BlogPostDetail post={selectedBlogPost} onBack={() => setSelectedBlogPost(null)} />
      ) : (
        <>
          <Hero />
          <StatsSection />
          <CourseSection onSelectCourse={(c: any) => setSelectedCourse(c)} />
          <SuccessStrategiesSection />
          <WhyChooseUs />
          <ResultsSection />
          <BlogSection onSelectPost={(p: any) => setSelectedBlogPost(p)} />
          <StudyMaterialSection />
          <ContactSection />
        </>
      )}

      <Footer />
      <ChatWidget />
      <AnimatePresence>
        {selectedCourse && (
          <CourseModal 
            isOpen={!!selectedCourse} 
            onClose={() => setSelectedCourse(null)} 
            course={selectedCourse} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
