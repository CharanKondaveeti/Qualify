import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publishedResult } from '../../../services/secureExamService';
import PageLoader from '../../../shared/components/PageLoader';
/** Never announce a successful submission based solely on a guessed URL. */
export default function CandidateSubmittedPage(){
  const {studentId}=useParams(); const [result,setResult]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let current=true;publishedResult(studentId).then(r=>{if(current)setResult(r)}).catch(e=>{if(current)setError(e.message)});return()=>{current=false}},[studentId]);
  if(!result&&!error)return <PageLoader fullPage label="Verifying examination submission…"/>;
  const submitted=result?.status==='unpublished'||result?.status==='published';
  return <main className="portal-message"><h1>{submitted?'Submission recorded':'Submission not confirmed'}</h1>
    <p>{error||(!submitted?'Your attempt has not been confirmed as submitted. Open your private examination link to check its status.':'Thank you. Your answers are recorded. Results become visible when your institution publishes them.')}</p>
    {submitted&&<Link to={`/candidate/results/${encodeURIComponent(studentId)}`}>View result status</Link>}
  </main>;
}
