import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_COLLEGE_ID = 'smvec-engineering-college';

// Dummy backgrounds for college selection. Replace these URLs with your real images later.
const COLLEGE_BACKGROUND_IMAGES = {
  'smvec-engineering-college': 'https://agri.smvec.ac.in/assets/img/breadcrumb/DJI_0981.jpg',
  'smvsas-arts-and-science': 'https://arts.smvec.ac.in/assets/img/image/Sri_Manakula_Vinayagar_Engineering_College.webp',
  'smvec-centre-of-legal-education': 'https://law.smvec.ac.in/assets/img/hero/hero-bg-2.jpg',
  'smvec-school-of-agricultural-science': 'https://agri.smvec.ac.in/assets/img/hero/hero-11.webp',
  'smvec-allied-health-science': 'https://mbbscouncilcdn.s3.amazonaws.com/wp-content/uploads/2020/03/Sri-Manakula-Vinayagar-Medical-College-and-Hospital-Pondicherry-Overall-Campus.jpg',
  'smv-school': 'https://arts.smvec.ac.in/assets/img/image/Sri_Manakula_Vinayagar_Engineering_College.webp',
  'takshashila-engineering-college': 'https://cache.careers360.mobi/media/colleges/social-media/media-gallery/63710/2026/3/10/Campus%20View%20of%20Takshashila%20Medical%20College%20Villupuram_Campus-View.jpg',
  'takshashila-medical-college': 'https://cache.careers360.mobi/media/colleges/social-media/media-gallery/63710/2026/3/10/Campus%20View%20of%20Takshashila%20Medical%20College%20Villupuram_Campus-View.jpg',
  'smvmch-college-and-hospital': 'https://smvmch.ac.in/images/AboutAS/about.jpg',
  'mvit': 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Mvitimage.jpg',
  'mailam-engineering-college': 'https://mailamengg.ac.in/wp-content/uploads/2026/03/Mailam-College.png',
  'smv-arch':'https://arts.smvec.ac.in/assets/img/image/Sri_Manakula_Vinayagar_Engineering_College.webp',
  'SMVEC-pharmacy':'https://arts.smvec.ac.in/assets/img/image/Sri_Manakula_Vinayagar_Engineering_College.webp',
  'sop-school-of-physiotherapy':'https://arts.smvec.ac.in/assets/img/image/Sri_Manakula_Vinayagar_Engineering_College.webp',
};

function getCollegeBackground(collegeId) {
  if (!collegeId) {
    return COLLEGE_BACKGROUND_IMAGES[DEFAULT_COLLEGE_ID];
  }

  return COLLEGE_BACKGROUND_IMAGES[collegeId]
    || `https://picsum.photos/seed/${collegeId}/1920/1080`;
}

function CollegeSelectionPage() {
  const navigate = useNavigate();
  const { profile, selectedCollegeId, selectCollege, colleges } = useAuth();
  const initialCollege = selectedCollegeId || DEFAULT_COLLEGE_ID;
  const [activeCollege, setActiveCollege] = useState(initialCollege);
  const [submitting, setSubmitting] = useState(false);
  const [backgroundTransition, setBackgroundTransition] = useState(() => ({
    current: getCollegeBackground(initialCollege),
    previous: null,
    key: 0,
  }));

  useEffect(() => {
    const nextBackground = getCollegeBackground(activeCollege || DEFAULT_COLLEGE_ID);

    setBackgroundTransition((previousState) => {
      if (previousState.current === nextBackground) {
        return previousState;
      }

      return {
        current: nextBackground,
        previous: previousState.current,
        key: previousState.key + 1,
      };
    });
  }, [activeCollege]);

  useEffect(() => {
    if (!backgroundTransition.previous) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setBackgroundTransition((previousState) => ({
        ...previousState,
        previous: null,
      }));
    }, 620);

    return () => window.clearTimeout(timeoutId);
  }, [backgroundTransition.key, backgroundTransition.previous]);

  useEffect(() => {
    if (!colleges.length) {
      return;
    }

    const hasActiveCollege = colleges.some((college) => college.id === activeCollege);
    if (hasActiveCollege) {
      return;
    }

    const defaultCollege = colleges.find((college) => college.id === DEFAULT_COLLEGE_ID);
    setActiveCollege(defaultCollege?.id || colleges[0].id);
  }, [activeCollege, colleges]);

  if (profile?.role === 'admin' || (profile?.role === 'staff' && selectedCollegeId)) {
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
      <div className="college-pick__bg-stage" aria-hidden="true">
        {backgroundTransition.previous && (
          <div
            key={`bg-prev-${backgroundTransition.key}`}
            className="college-pick__bg-layer is-exiting"
            style={{ backgroundImage: `url(${backgroundTransition.previous})` }}
          />
        )}
        <div
          key={`bg-current-${backgroundTransition.key}`}
          className={`college-pick__bg-layer ${backgroundTransition.previous ? 'is-entering' : 'is-active'}`}
          style={{ backgroundImage: `url(${backgroundTransition.current})` }}
        />
      </div>
      <div className='college-pick-overlay-bg'>
        <div className="college-pick__container">
      

        {/* Question */}
        <div className="college-pick__question">
          <h1 className="college-pick__title">Which college do you belong to?</h1>
          <p className="college-pick__desc">
            Your dashboard, posts, and permissions will be scoped to this college.
          </p>
        </div>

        {/* College options */}
        <div className="college-pick__grid">
          {colleges.map((college) => (
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
    </div>
  );
}

export default CollegeSelectionPage;
