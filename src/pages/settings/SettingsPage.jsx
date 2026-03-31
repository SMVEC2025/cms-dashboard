import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { updateUserMetadata, updateUserPassword } from '@/services/authService';
import { updateProfileName } from '@/services/profileService';

function getDisplayName(profile, user) {
  return profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
}

function validateName(value) {
  const normalized = value.trim();
  if (!normalized) return 'Name is required.';
  if (normalized.length < 2) return 'Name must be at least 2 characters.';
  return '';
}

function validatePassword(password, confirmPassword) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
}

function SettingsPage() {
  const { user, profile, selectedCollegeName, refreshProfile } = useAuth();
  const displayName = useMemo(() => getDisplayName(profile, user), [profile, user]);
  const [fullName, setFullName] = useState(displayName);
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setFullName(displayName);
  }, [displayName]);

  const handleNameSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validateName(fullName);
    if (validationMessage) { setNameError(validationMessage); return; }

    const normalizedName = fullName.trim();
    if (normalizedName === displayName.trim()) { toast('Your name is already up to date.'); return; }

    setSavingName(true);
    setNameError('');
    try {
      await updateProfileName({ userId: user.id, fullName: normalizedName });
      try {
        await updateUserMetadata({ ...(user?.user_metadata || {}), full_name: normalizedName });
      } catch (metadataError) {
        console.error('Failed to sync auth metadata after profile name update.', metadataError);
      }
      await refreshProfile();
      toast.success('Name updated successfully.');
    } catch (error) {
      const message = error.message || 'Failed to update your name.';
      setNameError(message);
      toast.error(message);
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
    setPasswordError('');
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validatePassword(passwordForm.password, passwordForm.confirmPassword);
    if (validationMessage) { setPasswordError(validationMessage); return; }

    setSavingPassword(true);
    setPasswordError('');
    try {
      await updateUserPassword(passwordForm.password);
      setPasswordForm({ password: '', confirmPassword: '' });
      toast.success('Password updated successfully.');
    } catch (error) {
      const message = error.message || 'Failed to update your password.';
      setPasswordError(message);
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const avatarLetter = (displayName || 'A')[0].toUpperCase();

  return (
    <div className="settings-page">

      {/* Identity strip */}
      <section className="panel settings-identity">
        <div className="settings-identity__left">
          <div className="settings-identity__avatar">{avatarLetter}</div>
          <div>
            <h2 className="settings-identity__name">{displayName || 'Your Name'}</h2>
            <p className="settings-identity__email">{user?.email}</p>
          </div>
        </div>
        <div className="settings-identity__right">
          <span className="settings-pill">{profile?.role || 'staff'} account</span>
          {selectedCollegeName && (
            <span className="settings-pill settings-pill--soft">{selectedCollegeName}</span>
          )}
        </div>
      </section>

      <div className="settings-page__grid">

        {/* Profile card */}
        <section className="panel settings-card">
          <div className="settings-card__label">
            <span className="settings-card__eyebrow">Profile</span>
            <h3 className="settings-card__title">Update your name</h3>
            <p className="settings-card__desc">Visible across the CMS</p>
          </div>

          <div className="settings-card__divider" />

          <form className="settings-form" onSubmit={handleNameSubmit}>
            <div className="settings-field">
              <label className="settings-field__label" htmlFor="full-name">Full name</label>
              <input
                id="full-name"
                className="settings-field__input"
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setNameError(''); }}
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </div>

            <div className="settings-field-row">
              <div className="settings-field">
                <label className="settings-field__label">Email address</label>
                <input
                  className="settings-field__input"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                />
              </div>
              <div className="settings-field">
                <label className="settings-field__label">Role</label>
                <input
                  className="settings-field__input"
                  type="text"
                  value={profile?.role || 'staff'}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {nameError && <p className="settings-field__error">{nameError}</p>}

            <div className="settings-form__actions">
             
              <button type="submit" className="btn btn--primary settings-btn" disabled={savingName}>
                {savingName ? 'Saving...' : 'Save name'}
              </button>
            </div>
          </form>
        </section>

        {/* Security card */}
        <section className="panel settings-card">
          <div className="settings-card__label">
            <span className="settings-card__eyebrow">Security</span>
            <h3 className="settings-card__title">Change password</h3>
            <p className="settings-card__desc">Minimum 8 characters</p>
          </div>

          <div className="settings-card__divider" />

          <form className="settings-form" onSubmit={handlePasswordSubmit}>
            <div className="settings-field">
              <label className="settings-field__label" htmlFor="new-password">New password</label>
              <input
                id="new-password"
                className="settings-field__input"
                type="password"
                value={passwordForm.password}
                onChange={handlePasswordChange('password')}
                placeholder="Enter a new password"
                autoComplete="new-password"
              />
            </div>

            <div className="settings-field">
              <label className="settings-field__label" htmlFor="confirm-password">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                className="settings-field__input"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange('confirmPassword')}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
              />
            </div>

            {passwordError && <p className="settings-field__error">{passwordError}</p>}

            <div className="settings-form__actions">
            
              <button
                type="submit"
                className="btn btn--primary settings-btn"
                disabled={savingPassword}
              >
                {savingPassword ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </section>

      </div>
    </div>
  );
}

export default SettingsPage;
