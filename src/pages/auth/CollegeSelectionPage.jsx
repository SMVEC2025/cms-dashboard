import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { COLLEGES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

function CollegeSelectionPage() {
  const navigate = useNavigate();
  const { profile, selectedCollegeId, selectCollege } = useAuth();
  const [activeCollege, setActiveCollege] = useState(selectedCollegeId || '');
  const [submitting, setSubmitting] = useState(false);

  if (profile?.role === 'staff' && selectedCollegeId) {
    return <Navigate to="/" replace />;
  }

  const handleContinue = async () => {
    if (!activeCollege) {
      toast.error('Choose a college before continuing.');
      return;
    }

    try {
      setSubmitting(true);
      await selectCollege(activeCollege);
      toast.success('College access updated.');
      navigate('/');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="college-pick">
      <div className="college-pick__container">
        {/* Step indicator */}
        <div className="college-pick__step">
          <span className="college-pick__step-dot college-pick__step-dot--done" />
          <span className="college-pick__step-line" />
          <span className="college-pick__step-dot college-pick__step-dot--active" />
          <span className="college-pick__step-line college-pick__step-line--pending" />
          <span className="college-pick__step-dot" />
        </div>

        {/* Question */}
        <div className="college-pick__question">
          <span className="college-pick__emoji">🏛️</span>
          <h1 className="college-pick__title">Which college do you belong to?</h1>
          <p className="college-pick__desc">
            Your dashboard, posts, and permissions will be scoped to this college.
          </p>
        </div>

        {/* College options */}
        <div className="college-pick__grid">
          {COLLEGES.map((college) => (
            <button
              key={college.id}
              type="button"
              className={`college-pick__option ${activeCollege === college.id ? 'is-selected' : ''}`}
              onClick={() => setActiveCollege(college.id)}
            >
              <span className="college-pick__option-radio">
                {activeCollege === college.id && (
                  <span className="college-pick__option-radio-dot" />
                )}
              </span>
              <div className="college-pick__option-text">
                <span className="college-pick__option-name">{college.name}</span>
                <span className="college-pick__option-id">{college.id}</span>
              </div>
              {activeCollege === college.id && (
                <svg className="college-pick__option-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Continue */}
        <div className="college-pick__actions">
          <button
            type="button"
            className="college-pick__continue"
            onClick={handleContinue}
            disabled={!activeCollege || submitting}
          >
            {submitting ? (
              <>
                <span className="college-pick__spinner" />
                Saving...
              </>
            ) : (
              <>
                Continue to Dashboard
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollegeSelectionPage;
