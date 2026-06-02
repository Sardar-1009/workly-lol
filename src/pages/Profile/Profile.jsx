import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../config/firebase';
import { doc, getDoc, setDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { Loader2, Save, Upload, Building } from 'lucide-react';

const Profile = () => {
  const { currentUser } = useAuth();
  
  const [profileData, setProfileData] = useState({
    companyName: '',
    email: '',
    description: '',
    logo: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'employers', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfileData(docSnap.data());
          setPreview(docSnap.data().logo);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [currentUser]);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      // Check file size (e.g., limit to 1MB to fit well in Firestore)
      if (selected.size > 1024 * 1024) {
        alert("Файл слишком большой. Пожалуйста, выберите изображение размером менее 1 МБ.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFile(reader.result); // Save as base64 string
        setPreview(reader.result);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setSaving(true);
    setSuccessMsg('');
    
    try {
      let logoUrl = profileData.logo;
      
      // Check if we have a new base64 image string
      if (file && typeof file === 'string') {
        logoUrl = file;
      }
      
      // Update Firestore
      const updateData = {
        companyName: profileData.companyName,
        description: profileData.description,
        logo: logoUrl
      };
      
      // Use setDoc with merge: true in case the document doesn't exist yet
      await setDoc(doc(db, 'employers', currentUser.uid), updateData, { merge: true });

      // Sync companyName + companyLogo to all existing chats of this employer
      // so Flutter mobile app shows correct branding immediately
      try {
        const chatsSnap = await getDocs(
          query(collection(db, 'chats'), where('employerId', '==', currentUser.uid))
        );
        await Promise.all(
          chatsSnap.docs.map(chatDoc =>
            updateDoc(doc(db, 'chats', chatDoc.id), {
              companyName: updateData.companyName,
              companyLogo: updateData.logo || '',
            })
          )
        );
      } catch (syncErr) {
        console.warn('Чаты не обновлены:', syncErr);
      }

      setProfileData(prev => ({ ...prev, ...updateData }));
      setSuccessMsg('Профиль успешно обновлен!');
      setTimeout(() => setSuccessMsg(''), 3000);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Ошибка при сохранении: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Loader2 className="animate-spin" color="var(--accent-primary)" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in relative h-full flex flex-col">
      <div className="page-header">
        <div>
          <h1 className="page-title">Профиль компании</h1>
          <p style={{ color: 'var(--text-muted)' }}>Управляйте данными вашей компании</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem', maxWidth: '600px' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {successMsg && (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(76, 209, 55, 0.1)', color: '#4cd137', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(76, 209, 55, 0.2)' }}>
              {successMsg}
            </div>
          )}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Logo Upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ 
                width: '100px', height: '100px', 
                borderRadius: '50%', backgroundColor: 'var(--bg-main)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                overflow: 'hidden', border: '2px solid var(--border-color)' 
              }}>
                {preview ? (
                  <img src={preview} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Building size={40} color="var(--text-muted)" />
                )}
              </div>
              
              <div>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={18} />
                  Загрузить логотип
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Рекомендуется: Квадратный PNG или JPG</p>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

            <div className="form-group">
              <label className="form-label">Почта (Только для чтения)</label>
              <input type="email" value={currentUser?.email || profileData.email || ''} disabled style={{ opacity: 0.7 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Название компании</label>
              <input 
                type="text" 
                name="companyName" 
                required 
                value={profileData.companyName} 
                onChange={handleChange} 
                placeholder="напр. Acme Corp" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Описание компании</label>
              <textarea 
                name="description" 
                value={profileData.description} 
                onChange={handleChange} 
                placeholder="Расскажите кандидатам о миссии и культуре вашей компании..." 
                style={{ minHeight: '150px' }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Сохранение...' : 'Сохранить профиль'}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
