import { useState } from 'react';
import toast from 'react-hot-toast';
import { createStaffUser, DEFAULT_STAFF_PASSWORD } from '@/services/adminUsersService';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function UserCreatePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(DEFAULT_STAFF_PASSWORD);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (trimmedPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const createdUser = await createStaffUser({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      setEmail('');
      setPassword(DEFAULT_STAFF_PASSWORD);
      toast.success(`Staff user created: ${createdUser?.email || trimmedEmail}`);
    } catch (createError) {
      const message = createError.message || 'Failed to create staff user.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-users-page">
      <section className="panel staff-users-page__panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Admin</span>
            <h3>Create staff user</h3>
            <p>
              This creates a new login in Supabase Auth and a matching profile with role{' '}
              <strong>staff</strong>.
            </p>
          </div>
        </div>

        <form className="staff-users-form" onSubmit={handleSubmit}>
          <label className="staff-users-form__field" htmlFor="staff-email">
            <span>Email</span>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
              placeholder="staff@smvec.ac.in"
              autoComplete="email"
            />
          </label>

          <label className="staff-users-form__field" htmlFor="staff-password">
            <span>Password</span>
            <input
              id="staff-password"
              type="text"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              placeholder={DEFAULT_STAFF_PASSWORD}
              autoComplete="off"
            />
            <small>Default password is {DEFAULT_STAFF_PASSWORD}. You can edit before creating.</small>
          </label>

          {error && <p className="staff-users-form__error">{error}</p>}

          <div className="staff-users-form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Staff User'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default UserCreatePage;
