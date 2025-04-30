import React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import "./css/accordionSection.css";

const AccordionSection = ({ title, isExpanded, toggleExpand, children }) => {
  return (
    <div className={`accordion-item ${isExpanded ? "open" : ""}`}>
      <div className="accordion-title" onClick={toggleExpand}>
        <span>{title}</span>
        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
      </div>
      {isExpanded && <div className="accordion-body">{children}</div>}
    </div>
  );
};

export default AccordionSection;
