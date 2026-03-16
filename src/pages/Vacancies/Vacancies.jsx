import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Plus, X, Briefcase, MapPin, DollarSign, Loader2 } from 'lucide-react';

const Vacancies = () => {
  const { currentUser } = useAuth();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    salary: '',
    location: ''
  });

  const fetchVacancies = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'vacancies'), 
        where('employerId', '==', currentUser.uid)
        // orderBy('createdAt', 'desc') // Requires composite index to use with where, doing client sort instead
      );
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Client-side sort fallback
      fetched.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setVacancies(fetched);
    } catch (error) {
      console.error("Error fetching vacancies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await addDoc(collection(db, 'vacancies'), {
        ...formData,
        requirements: formData.requirements.split('\\n'),
        employerId: currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setFormData({ title: '', description: '', requirements: '', salary: '', location: '' });
      fetchVacancies();
    } catch (error) {
      console.error("Error creating vacancy: ", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-fade-in relative h-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vacancies</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your job postings here</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} />
          Post New Vacancy
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="animate-spin" color="var(--accent-primary)" size={32} />
          </div>
        ) : vacancies.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <Briefcase size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)' }}>No vacancies posted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2">
            {vacancies.map(vacancy => (
              <div key={vacancy.id} className="glass-panel" style={{ padding: '1.5rem', transition: 'transform var(--transition-fast)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.25rem' }}>{vacancy.title}</h3>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    backgroundColor: vacancy.status === 'active' ? 'rgba(76, 209, 55, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                    color: vacancy.status === 'active' ? '#4cd137' : 'var(--accent-primary)'
                  }}>
                    {vacancy.status.toUpperCase()}
                  </span>
                </div>
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {vacancy.description}
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {vacancy.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <MapPin size={14} /> {vacancy.location}
                    </div>
                  )}
                  {vacancy.salary && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <DollarSign size={14} /> {vacancy.salary}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Vacancy Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-secondary)', padding: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Create Vacancy</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Job Title</label>
                <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Senior Frontend Developer" />
              </div>
              
              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Location (Optional)</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Remote, or New York" />
                </div>
                <div className="form-group">
                  <label className="form-label">Salary Range (Optional)</label>
                  <input type="text" name="salary" value={formData.salary} onChange={handleChange} placeholder="e.g. $80k - $120k" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea name="description" required value={formData.description} onChange={handleChange} placeholder="Describe the role..." style={{ minHeight: '100px' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Requirements (one per line)</label>
                <textarea name="requirements" required value={formData.requirements} onChange={handleChange} placeholder="- 4+ years of React&#10;- Experience with Firebase..." style={{ minHeight: '100px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? <Loader2 className="animate-spin" size={18} /> : 'Publish Vacancy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vacancies;
