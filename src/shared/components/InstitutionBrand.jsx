import { useEffect, useState } from "react";
import { FiBookOpen } from "react-icons/fi";
import { institutionLogoUrl } from "../../services/institutionService";
import "../styles/institution-brand.css";

// Reused in the admin top bar, settings, registration and exam instructions.
export default function InstitutionBrand({
  name,
  logoPath,
  subtitle,
  className = "",
}) {
  const [broken, setBroken] = useState(false);
  const url = institutionLogoUrl(logoPath);
  useEffect(() => setBroken(false), [url]);
  return (
    <div className={`qualify-institution-brand ${className}`}>
      <span className="qualify-institution-mark" aria-hidden="true">
        {url && !broken ? (
          <img src={url} alt="" onError={() => setBroken(true)} />
        ) : (
          <FiBookOpen />
        )}
      </span>
      <span className="qualify-institution-copy">
        <strong title={name || "Institution workspace"}>
          {name || "Institution workspace"}
        </strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </div>
  );
}
