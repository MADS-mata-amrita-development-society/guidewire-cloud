import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth.tsx';
import { fetchDriverProfile, fileClaim } from '@/services/api.ts';
import { Card } from '@/components/Card/Card.tsx';
import { Button } from '@/components/Button/Button.tsx';
import { Input, Textarea } from '@/components/Input/Input.tsx';
import { CloudRain, Megaphone, ArrowLeft, Check, MapPin, CalendarBlank } from '@phosphor-icons/react';
import { estimateMaxClaimAmount, formatCurrency } from '@/config/constants.ts';
import type { DriverProfile } from '@/types/index.ts';
import './FileClaimPage.css';

type ClaimType = 'natural_disaster' | 'strike_curfew' | null;

export function FileClaimPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [claimType, setClaimType] = useState<ClaimType>(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);

  const totalSteps = 3;

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await fetchDriverProfile(user.id);
      setDriverProfile((data as DriverProfile | null) ?? null);
    };
    void loadProfile();
  }, [user]);

  const estimatedCap = estimateMaxClaimAmount(driverProfile?.avg_weekly_earnings || 0, driverProfile?.tier || 'basic');

  const canContinue = () => {
    if (step === 1) return !!claimType;
    if (step === 2) return !!date && !!location.trim() && Number(amount) > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !claimType) return;
    const parsedAmount = Number(amount);
    if (parsedAmount <= 0 || !Number.isFinite(parsedAmount)) {
      setError('Claim amount must be a positive number.');
      return;
    }
    if (!date || !location.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const { error: err } = await fileClaim({
        driver_id: user.id,
        company_id: profile?.company_id || null,
        claim_type: claimType,
        description,
        claimed_amount: Number(amount),
        location_text: location,
        event_date: date,
      });

      if (err) {
        console.error('[FileClaimPage] Claim error:', err);
        setError(typeof err === 'string' ? err : (err as Error).message || (err as {details?: string}).details || 'Failed to submit claim. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch (e: unknown) {
      console.error('[FileClaimPage] Unexpected error:', e);
      setError((e as Error)?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="file-claim-page">
        <div className="page-content">
          <div className="claim-success">
            <div className="claim-success-icon"><Check size={28} /></div>
            <h2>Claim Submitted</h2>
            <p className="text-muted">Your claim is pending admin review. You'll be notified once it's processed.</p>
            <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-claim-page">
      <div className="file-claim-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <h1>File a Claim</h1>
        <span className="step-indicator text-sm text-muted">Step {step}/{totalSteps}</span>
      </div>

      <div className="step-progress">
        <div className="step-progress-bar" style={{ width: `${(step / totalSteps) * 100}%` }} />
      </div>

      <div className="page-content file-claim-content">
        {error && (
          <div style={{
            padding: '8px 12px', background: 'var(--aegis-danger-bg)',
            border: '1px solid var(--aegis-danger-border)', borderRadius: 'var(--radius-md)',
            color: '#991B1B', fontSize: 'var(--text-sm)',
          }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="step-content">
            <h2 className="step-title">What happened?</h2>
            <p className="step-description text-muted">Select the type of disruption</p>
            <div className="claim-type-options">
              <Card
                className={`claim-type-card ${claimType === 'natural_disaster' ? 'selected' : ''}`}
                interactive
                onClick={() => setClaimType('natural_disaster')}
              >
                <div className="claim-type-icon disaster"><CloudRain size={24} /></div>
                <h3>Natural Disaster</h3>
                <p className="text-sm text-muted">Heavy rain, flooding, or other natural events</p>
              </Card>
              <Card
                className={`claim-type-card ${claimType === 'strike_curfew' ? 'selected' : ''}`}
                interactive
                onClick={() => setClaimType('strike_curfew')}
              >
                <div className="claim-type-icon strike"><Megaphone size={24} /></div>
                <h3>Strike / Curfew</h3>
                <p className="text-sm text-muted">Political strikes, curfews, or civil disruptions</p>
              </Card>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2 className="step-title">Details</h2>
            <p className="step-description text-muted">Provide information about the disruption</p>
            <div className="claim-form">
              <Input label="Date of Disruption" type="date" value={date} onChange={e => setDate(e.target.value)} icon={<CalendarBlank size={16} />} required />
              <Input label="Location" placeholder="e.g., Koramangala, Bangalore" value={location} onChange={e => setLocation(e.target.value)} icon={<MapPin size={16} />} required />
              <Input label="Claim Amount (₹)" type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} required helper="Based on your missed earnings" />
              <p className="text-xs text-muted">Your current estimated cap is {formatCurrency(estimatedCap)} based on tier and earnings. Requests above cap may be auto-reduced or rejected.</p>
              <Textarea label="Description" placeholder="Describe what happened..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h2 className="step-title">Review</h2>
            <p className="step-description text-muted">Verify your claim details</p>
            <Card className="review-card">
              <div className="review-row">
                <span className="review-label">Type</span>
                <span className="review-value">{claimType === 'natural_disaster' ? 'Natural Disaster' : 'Strike / Curfew'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Date</span>
                <span className="review-value">{date}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Location</span>
                <span className="review-value">{location}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Amount</span>
                <span className="review-value font-serif font-bold">{formatCurrency(Number(amount) || 0)}</span>
              </div>
              {description && (
                <div className="review-row">
                  <span className="review-label">Description</span>
                  <span className="review-value">{description}</span>
                </div>
              )}
            </Card>
          </div>
        )}

        <div className="step-nav">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)} icon={<ArrowLeft size={14} />}>Back</Button>
          )}
          <div style={{ flex: 1 }} />
          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canContinue()}>Continue</Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} icon={<Check size={14} />}>Submit Claim</Button>
          )}
        </div>
      </div>
    </div>
  );
}
