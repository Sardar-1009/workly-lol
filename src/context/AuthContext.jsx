import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up func
  const register = async (email, password, companyData) => {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save additional profile data to Firestore ('employers' collection)
      const employerData = {
        uid: user.uid,
        email: user.email,
        companyName: companyData.companyName,
        description: companyData.description || '',
        logo: companyData.logo || '',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'employers', user.uid), employerData);
      
      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  // Login func
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Logout func
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch employer profile and merge into the user object
        try {
          const employerDoc = await getDoc(doc(db, 'employers', user.uid));
          if (employerDoc.exists()) {
            setCurrentUser({ ...user, employerProfile: employerDoc.data() });
          } else {
            setCurrentUser(user);
          }
        } catch {
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    register,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
