import { useState } from "react";
import { FiCheck, FiCopy, FiExternalLink, FiLink2 } from "react-icons/fi";

export default function ExamRegistrationLink({ examId }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const link = `${window.location.origin}/join/${examId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setError("");
    } catch {
      setCopied(false);
      setError("Could not copy automatically. Select the link to copy it.");
    }
  }

  return (
    <section className="qualify-registration-strip" aria-labelledby="qualify-reg-heading">
      <div className="qualify-registration-strip__heading">
        <span className="qualify-registration-strip__icon"><FiLink2 aria-hidden="true" /></span>
        <div>
          <h2 id="qualify-reg-heading">Registration link</h2>
          <p>Share this link with students to register for this exam.</p>
        </div>
      </div>
      <div className="qualify-registration-strip__actions">
        <input type="text" aria-label="Exam registration URL" readOnly value={link}
          onFocus={(event) => event.currentTarget.select()} />
        <button type="button" className="qualify-primary-action" onClick={copyLink}>
          {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a className="qualify-outline-action" href={link} target="_blank" rel="noopener noreferrer">
          <FiExternalLink aria-hidden="true" /> Open link
        </a>
      </div>
      {error && <p role="alert" className="qualify-registration-strip__error">{error}</p>}
    </section>
  );
}
