import { useEffect, useState } from "react";
import { FiSearch, FiUploadCloud, FiCheckCircle } from "react-icons/fi";
import { emptyInstitution, institutionTypes, searchInstitutionDirectory } from "../../../services/institutionSignupService";

const LABELS = {
 name:"Official institution name", institution_type:"Institution category",
 code:"Institution code",official_phone:"Official phone number",official_email:"Official email",
 applicant_name:"Your full name",super_admin_designation:"Your designation at the institution",
 secondary_phone:"Alternate phone (optional)",
 address_line:"Address",city:"City / town",district:"District",state:"State / UT",
 postal_code:"Postal ZIP code", website:"Official website (optional)",
 affiliation:"Board / university affiliation (optional)",
 registration_number:"Affiliation / registration number (optional)"
};
const STATES=["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
"Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
"Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
"Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh",
"Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"];

export default function InstitutionSignupFields({ value=emptyInstitution,onChange,logo,onLogo,showLogo=true }) {
  const [focused,setFocused]=useState(false);
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(false);
  const [lookupError,setLookupError]=useState("");
  const set = (field,v) => onChange(previous => ({...previous,[field]:v}));
  useEffect(() => {
    if (value.name.trim().length < 3 || !focused) {setSuggestions([]);setLoading(false);return;}
    let cancelled=false;
    const timer=setTimeout(() => {
      setLoading(true);
      searchInstitutionDirectory(value.name,value.institution_type)
        .then(rows => {if(!cancelled){setSuggestions(rows);setLookupError("");}})
        .catch(() => {if(!cancelled){setSuggestions([]);setLookupError("Directory suggestions unavailable. You can enter your institution manually.");}})
        .finally(() => {if(!cancelled)setLoading(false);});
    },300);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[value.name,value.institution_type,focused]);

  function choose(result){
    onChange(old=>({...old,name:result.name,institution_type:result.type||old.institution_type,
      state:result.state||old.state,district:result.district||old.district,
      city:result.city||old.city,directory_source:result.source||"manual",
      directory_id:result.source_id||"",directory_name:result.name}));
    setSuggestions([]);setFocused(false);
  }

  function field(key,type="text",extra={}){
    return <div className="adminAuth-input-group" key={key}>
      <label htmlFor={`signup-${key}`}>{LABELS[key]}</label>
      <input id={`signup-${key}`} name={key} type={type} value={value[key]||""}
        onChange={e=>set(key,e.target.value)} required={!key.includes("optional") && !["secondary_phone","website","affiliation","registration_number"].includes(key)}
        {...extra}/>
    </div>;
  }


  return <section className="qa-signup-institution" aria-label="Institution details">
    <header><span>INSTITUTION REGISTRATION</span><h2>Institution details</h2><p>Complete your institution details for Platform Owner review.</p></header>
    <div className="qa-application-grid">
      {field("applicant_name","text",{maxLength:120,placeholder:"Your full name",autoComplete:"name"})}
      {field("super_admin_designation","text",{maxLength:120,placeholder:"e.g. Principal, Dean, Director or Registrar"})}
      <div className="adminAuth-input-group">
        <label htmlFor="signup-category">Institution category</label>
        <select id="signup-category" value={value.institution_type} required onChange={e=>set("institution_type",e.target.value)}>
          <option value="">Select category</option>
          {institutionTypes.map(([id,name])=><option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      <div className="adminAuth-input-group">
        <label htmlFor="signup-code">Institution code</label>
        <input id="signup-code" required type="text" minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9-]{2,39}"
         placeholder="e.g. swarnandhra" value={value.code||""}
         onChange={e=>set("code",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))}/>
      </div>
      <div className="adminAuth-input-group qa-wide">
        <label htmlFor="signup-search">Official institution name</label>
        <div className="qa-directory-search"><FiSearch/>
          <input id="signup-search" name="name" type="text" autoComplete="off" required
            minLength={3} maxLength={160} placeholder="Search colleges or type the complete registered name"
            value={value.name||""}
            onFocus={()=>setFocused(true)}
            onBlur={()=>setTimeout(()=>setFocused(false),150)}
            onChange={e=>{
              onChange(old=>({...old,name:e.target.value,directory_source:"manual",directory_id:"",directory_name:""}));
              setFocused(true);
            }}/>
        </div>
        {focused&&value.name.trim().length>=3&&(
          <div className="qa-directory-results" role="listbox" aria-label="Matching institutions">
            {loading&&<p>Searching institutions…</p>}
            {!loading&&suggestions.map((row,i)=><button key={`${row.source}-${row.source_id}-${i}`} type="button"
              role="option" aria-selected={value.directory_id===row.source_id}
              onMouseDown={e=>e.preventDefault()} onClick={()=>choose(row)}>
              <strong>{row.name}</strong>
              <small>{[row.city,row.district,row.state].filter(Boolean).join(", ")||"Directory entry"}</small>
            </button>)}
            {!loading&&!suggestions.length&&<p>No match? Your typed full institution name will be used.</p>}
          </div>
        )}
        {lookupError&&<small className="qa-directory-note">{lookupError}</small>}
        <small className="qa-directory-note">Select a directory suggestion or enter the full registered name in this same field.</small>
      </div>
      {field("official_phone","tel",{maxLength:20,placeholder:"+91 ...",autoComplete:"tel"})}
      {field("secondary_phone","tel",{maxLength:20})}
      {field("address_line","text",{maxLength:250,placeholder:"Building, street and locality"})}
      <div className="adminAuth-input-group">
        <label htmlFor="signup-state">State / Union Territory</label>
        <select id="signup-state" required value={value.state||""} onChange={e=>set("state",e.target.value)}>
          <option value="">Select state</option>{STATES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {field("district","text",{maxLength:80})}
      {field("city","text",{maxLength:80})}
      {field("postal_code","text",{maxLength:6,inputMode:"numeric",pattern:"[1-9][0-9]{5}"})}
      {field("website","url",{maxLength:250,placeholder:"https://..."})}
      {field("affiliation","text",{maxLength:200})}
      {field("registration_number","text",{maxLength:100})}
      <div className="adminAuth-input-group qa-wide">
        <label htmlFor="signup-notes">Verification notes (optional)</label>
        <textarea id="signup-notes" rows={3} maxLength={1500} value={value.details||""}
         onChange={e=>set("details",e.target.value)} placeholder="Additional information that will help the Platform Owner verify your institution"/>
      </div>
      {showLogo && <div className="adminAuth-input-group qa-wide">
        <label htmlFor="signup-logo"><FiUploadCloud style={{verticalAlign:"middle"}}/> Institution logo (optional)</label>
        <input id="signup-logo" type="file" accept="image/png,image/jpeg,image/webp"
         onChange={e=>onLogo(e.target.files?.[0]||null)}/>
        {logo&&<small className="qa-directory-note"><FiCheckCircle/> {logo.name} selected. This file is saved locally until verification; if you switch browsers, you may need to upload it from Settings.</small>}
        <small className="qa-directory-note">PNG / JPG / WebP, max 1 MB. Logo publication requires approved institutional access.</small>
      </div>}
    </div>
  </section>;
}
