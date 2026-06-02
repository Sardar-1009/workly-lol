import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { User, X, MessageSquare, Check, XCircle, Loader2, Briefcase, Mail, FileText, ExternalLink, Video, Filter, Trash2 } from 'lucide-react';

const Candidates = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [vacancies, setVacancies] = useState({});
  const [candidates, setCandidates] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedApp, setSelectedApp] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [vacancyFilter, setVacancyFilter] = useState('all');

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

      // Filter out dismissed applications
      const activeApps = fetchedApps.filter(app => app.status !== 'dismissed');

      // Client sort by newest
      activeApps.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setApplications(activeApps);

      if (activeApps.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Extract unique candidate and vacancy IDs
      const userIds = [...new Set(activeApps.map(app => app.userId))].filter(Boolean);
      const vacancyIds = [...new Set(activeApps.map(app => app.vacancyId))].filter(Boolean);

      // 3. Fetch candidates (assuming they are stored in 'users' collection)
      const candidatesData = {};
      if (userIds.length > 0) {
        // Firestore 'in' query supports max 10, batching if needed, but for MVP doing Promise.all
        await Promise.all(userIds.map(async (uid) => {
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

  const handleDismissCandidate = async (appId) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'applications', appId), { status: 'dismissed' });
      setApplications(apps => apps.filter(app => app.id !== appId));
      if (selectedApp?.id === appId) {
        setSelectedApp(null);
      }
    } catch (error) {
      console.error("Error dismissing candidate:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleMessageCandidate = async (userId) => {
    setUpdating(true);
    try {
      // Check if chat already exists
      const chatQuery = query(
        collection(db, 'chats'),
        where('employerId', '==', currentUser.uid),
        where('userId', '==', userId)
      );
      const chatSnapshot = await getDocs(chatQuery);

      if (!chatSnapshot.empty) {
        // Redirect to existing chat — also patch companyName/logo if missing
        const existingChat = chatSnapshot.docs[0];
        const existingData = existingChat.data();
        if (!existingData.companyName && currentUser.employerProfile?.companyName) {
          await updateDoc(doc(db, 'chats', existingChat.id), {
            companyName: currentUser.employerProfile.companyName,
            companyLogo: currentUser.employerProfile.logo || '',
          });
        }
        navigate(`/messages?chat=${existingChat.id}`);
      } else {
        // Create new chat — include employer company info for mobile app
        const newChatRef = await addDoc(collection(db, 'chats'), {
          employerId: currentUser.uid,
          userId: userId,
          companyName: currentUser.employerProfile?.companyName || '',
          companyLogo: currentUser.employerProfile?.logo || '',
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Кандидаты</h1>
          <p style={{ color: 'var(--text-muted)' }}>Просматривайте отклики на ваши вакансии</p>
        </div>
        {Object.keys(vacancies).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={vacancyFilter}
              onChange={(e) => setVacancyFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                minWidth: '200px',
                outline: 'none',
              }}
            >
              <option value="all">Все вакансии</option>
              {Object.values(vacancies).map(v => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="animate-spin" color="var(--accent-primary)" size={32} />
          </div>
        ) : applications.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <User size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)' }}>Пока нет кандидатов.</p>
          </div>
        ) : (() => {
          const filteredApps = vacancyFilter === 'all'
            ? applications
            : applications.filter(app => app.vacancyId === vacancyFilter);

          return filteredApps.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <Filter size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)' }}>Нет кандидатов по выбранной вакансии.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2">
              {filteredApps.map(app => {
                const candidate = candidates[app.userId];
                const vacancy = vacancies[app.vacancyId];
                if (!candidate) return null;

                return (
                  <div key={app.id} onClick={() => setSelectedApp(app)} className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform var(--transition-fast)', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {candidate.photoUrl ? <img src={candidate.photoUrl} alt={candidate.fullName || 'candidate'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="var(--text-muted)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{candidate.fullName || 'Неизвестный кандидат'}</h3>
                          {candidate.introVideoUrl && (
                            <span
                              title="Видео-визитка"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.15rem 0.55rem', borderRadius: '1rem',
                                fontSize: '0.75rem', fontWeight: 600,
                                backgroundColor: 'rgba(168, 85, 247, 0.12)',
                                color: '#a855f7',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Video size={11} /> 🎥
                            </span>
                          )}
                          {candidate.resumeUrl ? (
                            <a
                              href={candidate.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={candidate.resumeFileName || 'Смотреть резюме'}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.15rem 0.55rem', borderRadius: '1rem',
                                fontSize: '0.75rem', fontWeight: 600,
                                backgroundColor: 'rgba(14, 165, 233, 0.12)',
                                color: '#0ea5e9',
                                border: '1px solid rgba(14, 165, 233, 0.3)',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <FileText size={11} /> Резюме
                            </a>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.15rem 0.55rem', borderRadius: '1rem',
                              fontSize: '0.75rem',
                              backgroundColor: 'rgba(255,255,255,0.04)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-color)',
                              whiteSpace: 'nowrap',
                            }}>Нет резюме</span>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>Откликнулся на: <span style={{ color: 'var(--text-main)' }}>{vacancy?.title || 'Неизвестную вакансию'}</span></p>
                      </div>
                      <button
                        title="Убрать кандидата"
                        onClick={(e) => { e.stopPropagation(); handleDismissCandidate(app.id); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-muted)', padding: '0.25rem',
                          borderRadius: '0.25rem', transition: 'color 0.15s',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff4757'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={16} />
                      </button>
                      {app.status === 'pending' && <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f39c12', flexShrink: 0 }} title="На рассмотрении"></span>}
                      {app.status === 'invited' && <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#4cd137', flexShrink: 0 }} title="Приглашен"></span>}
                      {app.status === 'rejected' && <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--accent-primary)', flexShrink: 0 }} title="Отклонен"></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
        }
      </div>

      {/* Candidate Profile Modal */}
      {selectedApp && candidates[selectedApp.userId] && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-secondary)', padding: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {candidates[selectedApp.userId].photoUrl ? <img src={candidates[selectedApp.userId].photoUrl} alt="candidate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={32} color="var(--text-muted)" />}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{candidates[selectedApp.userId].fullName || 'Неизвестно'}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Откликнулся на {vacancies[selectedApp.vacancyId]?.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} /> Почта</h4>
                <p>{candidates[selectedApp.userId].email || 'Почта не указана'}</p>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={14} /> Резюме
                </h4>
                {candidates[selectedApp.userId].resumeUrl ? (
                  <a
                    href={candidates[selectedApp.userId].resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.6rem 1.1rem', borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      color: '#0ea5e9',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.1)'}
                  >
                    <FileText size={16} />
                    {candidates[selectedApp.userId].resumeFileName || 'Смотреть резюме'}
                    <ExternalLink size={13} style={{ opacity: 0.7 }} />
                  </a>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={14} style={{ opacity: 0.4 }} /> Резюме не прикреплено
                  </p>
                )}
              </div>

              {/* Video Introduction Section */}
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Video size={14} /> Видео-визитка
                </h4>
                {candidates[selectedApp.userId].introVideoUrl ? (
                  <div style={{
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#000',
                  }}>
                    <video
                      src={candidates[selectedApp.userId].introVideoUrl}
                      controls
                      controlsList="nodownload"
                      preload="metadata"
                      style={{
                        width: '100%',
                        maxHeight: '320px',
                        display: 'block',
                      }}
                    />
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Video size={14} style={{ opacity: 0.4 }} /> Кандидат не записал видео-визитку
                  </p>
                )}
              </div>

              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={14} /> Опыт и О себе</h4>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{candidates[selectedApp.userId].about || candidates[selectedApp.userId].experience || 'Нет описания для этого кандидата.'}</p>
              </div>

              {candidates[selectedApp.userId].skills && (
                <div>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Навыки</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(Array.isArray(candidates[selectedApp.userId].skills) ? candidates[selectedApp.userId].skills : [candidates[selectedApp.userId].skills]).map((skill, i) => (
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
                {selectedApp.status !== 'invited' && (
                  <button disabled={updating} onClick={() => handleStatusUpdate(selectedApp.id, 'invited')} className="btn" style={{ backgroundColor: 'rgba(76, 209, 55, 0.1)', color: '#4cd137', padding: '0.5rem 1rem' }}>
                    <Check size={18} /> Пригласить
                  </button>
                )}
                {selectedApp.status !== 'rejected' && (
                  <button disabled={updating} onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')} className="btn" style={{ backgroundColor: 'rgba(255, 71, 87, 0.1)', color: 'var(--accent-primary)', padding: '0.5rem 1rem' }}>
                    <XCircle size={18} /> Отклонить
                  </button>
                )}
                <button disabled={updating} onClick={() => handleDismissCandidate(selectedApp.id)} className="btn" style={{ backgroundColor: 'rgba(255, 71, 87, 0.08)', color: '#ff6b81', padding: '0.5rem 1rem' }}>
                  <Trash2 size={18} /> Убрать
                </button>
              </div>

              <button disabled={updating} onClick={() => handleMessageCandidate(selectedApp.userId)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                <MessageSquare size={18} /> Сообщение
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Candidates;
