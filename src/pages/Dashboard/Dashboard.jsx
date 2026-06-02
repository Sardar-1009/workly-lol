import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Briefcase, Users, MessageSquare, TrendingUp, Loader2 } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, loading }) => (
  <div className="glass-panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
    <div style={{ 
      width: '56px', height: '56px', borderRadius: 'var(--radius-md)',
      backgroundColor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <Icon size={28} color={color} />
    </div>
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{label}</p>
      {loading ? (
        <Loader2 size={20} className="animate-spin" color={color} style={{ marginTop: '0.5rem' }} />
      ) : (
        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color, margin: '0.1rem 0 0' }}>{value}</p>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ vacancies: 0, candidates: 0, chats: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchStats = async () => {
      try {
        const [vacSnap, appSnap, chatSnap] = await Promise.all([
          getDocs(query(collection(db, 'vacancies'), where('employerId', '==', currentUser.uid), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'applications'), where('employerId', '==', currentUser.uid))),
          getDocs(query(collection(db, 'chats'), where('employerId', '==', currentUser.uid))),
        ]);
        
        const activeApps = appSnap.docs.filter(doc => doc.data().status !== 'dismissed');
        
        setStats({
          vacancies: vacSnap.size,
          candidates: activeApps.length,
          chats: chatSnap.size,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  const handleFillApplications = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => ({id: d.id, ...d.data()}));
      
      const candidates = users.filter(u => u.role !== 'employer');
      const actualCandidates = candidates.length > 0 ? candidates : users;

      const vacSnap = await getDocs(collection(db, 'vacancies'));
      const vacancies = vacSnap.docs.map(d => ({id: d.id, ...d.data()}));
      
      if (actualCandidates.length === 0 || vacancies.length === 0) {
        alert("Not enough users or vacancies found in database.");
        return;
      }

      let count = 0;
      for (const vacancy of vacancies) {
        if (!vacancy.employerId) continue;
        const numApps = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numApps; i++) {
            const candidate = actualCandidates[Math.floor(Math.random() * actualCandidates.length)];
            await addDoc(collection(db, "applications"), {
                employerId: vacancy.employerId,
                userId: candidate.id,
                vacancyId: vacancy.id,
                status: "pending",
                createdAt: serverTimestamp()
            });
            count++;
        }
      }
      alert(`Successfully created ${count} applications!`);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Дашборд</h1>
          <p style={{ color: 'var(--text-muted)' }}>Обзор процесса найма</p>
        </div>
        <button onClick={handleFillApplications} className="btn btn-primary">
          Сгенерировать отклики
        </button>
      </div>

      <div className="grid grid-cols-2" style={{ marginTop: '2rem', gap: '1.5rem' }}>
        <StatCard icon={Briefcase} label="Активные вакансии" value={stats.vacancies} color="var(--accent-primary)" loading={loading} />
        <StatCard icon={Users} label="Всего кандидатов" value={stats.candidates} color="#7c3aed" loading={loading} />
        <StatCard icon={MessageSquare} label="Активные чаты" value={stats.chats} color="#0ea5e9" loading={loading} />
        <StatCard icon={TrendingUp} label="Опубликовано" value={stats.vacancies} color="#f59e0b" loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;
