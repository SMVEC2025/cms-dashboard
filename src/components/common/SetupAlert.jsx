function SetupAlert() {
  return (
    <div className="setup-alert">
      <strong>Supabase environment variables are missing.</strong>
      <p>
        Add values in `.env`, run the SQL migration, and configure the media edge function before using
        authentication, storage, and approvals.
      </p>
    </div>
  );
}

export default SetupAlert;
