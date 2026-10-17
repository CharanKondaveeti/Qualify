import React from "react";
import { FiUpload, FiLoader } from "react-icons/fi";

const FileUpload = ({ handleFileUpload, isLoading, questionError }) => {
  return (
    <div className="create-exam__form-group upload-file__form-group">
      <label>Upload Questions *</label>
      <div className="upload-area">
        <label className="upload-btn">
          <FiUpload />
          Choose CSV File
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>
        {isLoading && (
          <div className="loading-indicator">
            <FiLoader className="spinner" />
            <span>Processing file...</span>
          </div>
        )}
      </div>
      {questionError && <p className="error-text">{questionError}</p>}
    </div>
  );
};

export default FileUpload;
