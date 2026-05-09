import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Briefcase, Lock, Mail, Building, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    description: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Пароли не совпадают');
    }

    try {
      setError('');
      setLoading(true);
      
      let logoUrl = '';
      if (logoFile) {
        const fileRef = ref(storage, `logos/${Date.now()}_${logoFile.name}`);
        const uploadResult = await uploadBytes(fileRef, logoFile);
        logoUrl = await getDownloadURL(uploadResult.ref);
      }

      await register(formData.email, formData.password, {
        companyName: formData.companyName,
        description: formData.description,
        logoUrl
      });
      
      navigate('/dashboard');
    } catch (err) {
      setError('Не удалось создать аккаунт. ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card animate-fade-in" style={{ maxWidth: '600px', margin: '2rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <Briefcase size={48} color="var(--accent-primary)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.75rem' }}>Создать аккаунт</h2>
          <p className="form-label">Присоединяйтесь, чтобы найти идеальных кандидатов</p>
        </div>

        {error && <div className="error-text" style={{ textAlign: 'center', backgroundColor: 'rgba(255, 71, 87, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid grid-cols-2">
            <div className="form-group">
              <label className="form-label">Название компании</label>
              <div style={{ position: 'relative' }}>
                <Building size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" name="companyName" required 
                  placeholder="Acme Corp" value={formData.companyName} onChange={handleChange}
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email компании</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" name="email" required 
                  placeholder="hr@acme.com" value={formData.email} onChange={handleChange}
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Описание компании</label>
            <div style={{ position: 'relative' }}>
              <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
              <textarea 
                name="description" required 
                placeholder="Расскажите кандидатам о корпоративной культуре, миссии и преимуществах..." 
                value={formData.description} onChange={handleChange}
                style={{ paddingLeft: '2.75rem', minHeight: '100px', resize: 'vertical' }}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Логотип компании (Опционально)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{
                cursor: 'pointer', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', 
                border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, color: 'var(--text-muted)'
              }}>
                <ImageIcon size={18} />
                {logoFile ? logoFile.name : 'Загрузить файл...'}
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2">
            <div className="form-group">
              <label className="form-label">Пароль</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" name="password" required 
                  placeholder="••••••••" value={formData.password} onChange={handleChange}
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Подтвердите пароль</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" name="confirmPassword" required 
                  placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange}
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>
          </div>

          <button disabled={loading} type="submit" className="btn btn-primary" style={{ marginTop: '1rem', height: '3rem' }}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Создать аккаунт'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Уже есть аккаунт? <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}>Войти здесь</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
