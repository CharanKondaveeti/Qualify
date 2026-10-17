import PageLoader from '../../../shared/components/PageLoader';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publishedResult, savePrivateToken } from '../../../services/secureExamService';
import '../styles/secure-exam.css';
export default function ResultsPage({ demoStudentId }) {
  const params=useParams();
  const studentId=demoStudentId || params.studentId;
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const token=new URLSearchParams(location.hash.replace(/^#/,'' )).get('access');
    if(token){savePrivateToken(studentId,token);history.replaceState(null,'',location.pathname+location.search);}
    publishedResult(studentId).then(setResult).catch(err=>setError(err.message));
  },[studentId]);
  return <main className="portal-message"><h1>Qualify · Examination Results</h1>
    {error&&<p role="alert">{error}</p>}
    {!error&&!result&&<PageLoader label="Checking your result…" />}
    {result?.status==='pending'&&<p>Your examination is not submitted yet.</p>}
    {result?.status==='unpublished'&&<p>Your submission is recorded. Results have not been published by the administrator.</p>}
    {result?.status==='published'&&<section className="result-card"><h2>{result.title}</h2><p>{result.student_name} · {result.roll_no}</p><h2>{result.score} / {result.total_marks}</h2><p><strong>{result.passed?'PASSED':'NOT PASSED'}</strong> · Passing mark: {result.pass_mark}</p><button onClick={()=>window.print()}>Print scorecard</button></section>}
    <Link to="/">Return to home</Link>
  </main>;
}
