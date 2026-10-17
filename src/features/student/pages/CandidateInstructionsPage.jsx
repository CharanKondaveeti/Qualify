import { Link, useParams } from 'react-router-dom';
export default function CandidateInstructionsPage(){
  const {examId}=useParams();
  return <main className="portal-message"><h1>Examination instructions</h1><p>Open the private examination link issued after registration to access your own attempt. Your start instructions and countdown are shown there.</p><Link to={`/join/${encodeURIComponent(examId)}`}>Go to registration</Link></main>;
}
