import { FiBookOpen } from 'react-icons/fi';
import '../../styles/page-loader.css';

/**
 * Shared QUALIFY loading state. Reuses the book-and-wordmark identity from the
 * website header so both real data loading and brief navigation feel consistent.
 */
export default function PageLoader({ label = 'Loading QUALIFY…', fullPage = false }) {
  return (
    <div
      className={`qualify-page-loading${fullPage ? ' qualify-page-loading--full' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="qualify-page-loading__brand" aria-hidden="true">
        <span className="qualify-page-loading__mark"><FiBookOpen /></span>
        <span className="qualify-page-loading__wordmark">QUALIFY</span>
      </div>
      <span className="qualify-page-loading__track" aria-hidden="true" />
      <span className="qualify-page-loading__label">{label}</span>
    </div>
  );
}
