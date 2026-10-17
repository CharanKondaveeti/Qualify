import '../../styles/page-loader.css';
/** Accessible, reduced-motion aware loading state; lightweight SVG, no external assets. */
export default function PageLoader({ label = 'Loading QUALIFY…', fullPage = false }) {
  return <div className={`qualify-page-loading ${fullPage ? 'qualify-page-loading--full' : ''}`} role="status" aria-live="polite" aria-label={label}>
    <svg className="qualify-page-loading__svg" width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
      <circle cx="27" cy="27" r="22" stroke="#e4eaf2" strokeWidth="3.5" />
      <circle className="qualify-page-loading__orbit" cx="27" cy="27" r="22" stroke="#2558ad" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="40 140" />
      <path d="M18 27.5l6 6L37 20" stroke="#1f427e" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span>{label}</span>
  </div>;
}
