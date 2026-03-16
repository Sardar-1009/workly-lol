import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { User, X, MessageSquare, Check, XCircle, Loader2, Briefcase, Mail } from 'lucide-react';

const Candidates = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState([]);
  const [vacancies, setVacancies] = useState({});
  const [candidates, setCandidates] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [selectedApp, setSelectedApp] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [currentUser]);

  const fetchApplications = async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch applications for this employer
      const q = query(collection(db, 'applications'), where('employerId', '==', currentUser.uid));
      const appSnapshot = await getDocs(q);
      const fetchedApps = appSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Client sort by newest
      fetchedApps.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setApplications(fetchedApps);

      if (fetchedApps.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Extract unique candidate and vacancy IDs
      const candidateIds = [...new Set(fetchedApps.map(app => app.candidateId))].filter(Boolean);
      const vacancyIds = [...new Set(fetchedApps.map(app => app.vacancyId))].filter(Boolean);

      // 3. Fetch candidates (assuming they are stored in 'users' collection)
      const candidatesData = {};
      if (candidateIds.length > 0) {
        // Firestore 'in' query supports max 10, batching if needed, but for MVP doing Promise.all
        await Promise.all(candidateIds.map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            candidatesData[uid] = { id: userDoc.id, ...userDoc.data() };
          }
        }));
      }
      setCandidates(candidatesData);

      // 4. Fetch related vacancies simply via Promise.all
      const vacanciesData = {};
      if (vacancyIds.length > 0) {
        await Promise.all(vacancyIds.map(async (vid) => {
          const vacDoc = await getDoc(doc(db, 'vacancies', vid));
          if (vacDoc.exists()) {
            vacanciesData[vid] = { id: vacDoc.id, ...vacDoc.data() };
          }
        }));
      }
      setVacancies(vacanciesData);
      
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appId, newStatus) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'applications', appId), { status: newStatus });
      setApplications(apps => apps.map(app => app.id === appId ? { ...app, status: newStatus } : app));
      if (selectedApp?.id === appId) {
        setSelectedApp({ ...selectedApp, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleMessageCandidate = async (candidateId) => {
    setUpdating(true);
    try {
      // Check if chat already exists
      const chatQuery = query(
        collection(db, 'chats'), 
        where('employerId', '==', currentUser.uid),
        where('candidateId', '==', candidateId)
      );
      const chatSnapshot = await getDocs(chatQuery);
      
      if (!chatSnapshot.empty) {
        // Redirect to existing chat
        const existingChatId = chatSnapshot.docs[0].id;
        navigate(`/messages?chat=${existingChatId}`);
      } else {
        // Create new chat
        const newChatRef = await addDoc(collection(db, 'chats'), {
          employerId: currentUser.uid,
          candidateId: candidateId,
          lastMessage: '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        navigate(`/messages?chat=${newChatRef.id}`);
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="animate-fade-in relative h-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p style={{ color: 'var(--text-muted)' }}>Review applicants to your active roles</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="animate-spin" color="var(--accent-primary)" size={32} />
          </div>
        ) : applications.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <User size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)' }}>No candidates have applied yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2">
            {applications.map(app => {
              const candidate = candidates[app.candidateId];
              const vacancy = vacancies[app.vacancyId];
              if (!candidate) return null; // Wait for candidate data or handle missing

              return (
                <div key={app.id} onClick={() => setSelectedApp(app)} className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform var(--transition-fast)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {candidate.photoUrl ? <img src={candidate.photoUrl} alt={candidate.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="var(--text-muted)" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{candidate.displayName || 'Unknown Candidate'}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Applied for: <span style={{ color: 'var(--text-main)' }}>{vacancy?.title || 'Unknown Role'}</span></p>
                    </div>
                    {app.status === 'pending' && <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f39c12' }} title="Pending"></span>}
                    {app.status === 'accepted' && <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#4cd137' }} title="Accepted"></span>}
                    {app.status === 'rejected' && <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} title="Rejected"></span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Candidate Profile Modal */}
      {selectedApp && candidates[selectedApp.candidateId] && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-secondary)', padding: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {candidates[selectedApp.candidateId].photoUrl ? <img src={candidates[selectedApp.candidateId].photoUrl} alt="candidate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={32} color="var(--text-muted)" />}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{candidates[selectedApp.candidateId].displayName || 'Unknown'}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Applied for {vacancies[selectedApp.vacancyId]?.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14}/> Email</h4>
                <p>{candidates[selectedApp.candidateId].email || 'No email provided'}</p>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={14}/> Experience & About</h4>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{candidates[selectedApp.candidateId].about || candidates[selectedApp.candidateId].experience || 'No description available for this candidate.'}</p>
              </div>

              {candidates[selectedApp.candidateId].skills && (
                <div>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Skills</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(Array.isArray(candidates[selectedApp.candidateId].skills) ? candidates[selectedApp.candidateId].skills : [candidates[selectedApp.candidateId].skills]).map((skill, i) => (
                      <span key={i} style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '1rem', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedApp.status !== 'accepted' && (
                  <button disabled={updating} onClick={() => handleStatusUpdate(selectedApp.id, 'accepted')} className="btn" style={{ backgroundColor: 'rgba(76, 209, 55, 0.1)', color: '#4cd137', padding: '0.5rem 1rem' }}>
                    <Check size={18} /> Accept
                  </button>
                )}
                {selectedApp.status !== 'rejected' && (
                  <button disabled={updating} onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')} className="btn" style={{ backgroundColor: 'rgba(255, 71, 87, 0.1)', color: 'var(--accent-primary)', padding: '0.5rem 1rem' }}>
                    <XCircle size={18} /> Reject
                  </button>
                )}
              </div>

              <button disabled={updating} onClick={() => handleMessageCandidate(selectedApp.candidateId)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                <MessageSquare size={18} /> Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Candidates;
