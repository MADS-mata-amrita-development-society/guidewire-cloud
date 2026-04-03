import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth.tsx';
import { Button } from '@/components/Button/Button.tsx';
import { Input } from '@/components/Input/Input.tsx';
import { Shield, Envelope, Lock } from '@phosphor-icons/react';
import '../../driver/pages/LoginPage.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
    else navigate('/');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo"><Shield size={24} /></div>
          <h1 className="login-title font-serif">Aegis</h1>
          <p className="login-subtitle">Admin Portal</p>
        </div>
        {error && (
          <div style={{ padding: '8px 12px', marginBottom: 'var(--space-4)', background: 'var(--aegis-danger-bg)', border: '1px solid var(--aegis-danger-border)', borderRadius: 'var(--radius-md)', color: '#991B1B', fontSize: 'var(--text-sm)' }}>
            {error}
          </div>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <Input label="Email" type="email" placeholder="admin@aegis.com" value={email} onChange={e => setEmail(e.target.value)} icon={<Envelope size={16} />} required />
          <Input label="Password" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} icon={<Lock size={16} />} required />
          <Button type="submit" fullWidth size="lg" loading={loading}>Sign In</Button>
        </form>
        <p className="login-footer-text">Aegis Insurance Admin Console</p>
      </div>
    </div>
  );
}
