import PageLoader from '../../../shared/components/PageLoader';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { institutionReportSummary } from '../../../services/institutionExamService';
import { useAdminWorkspace } from '../context/AdminWorkspaceContext';

export default function ReportsPage() {
  const { institutionId, selectedInstitution, isSuperAdmin } = useAdminWorkspace();
  const { data: summary = [], isLoading, error } = useQuery({
    queryKey:['institution-report', institutionId],
    queryFn: () => institutionReportSummary(institutionId),
    enabled: Boolean(institutionId),
  });
  const registrations = summary.reduce((total,item)=>total+Number(item.registrations||0),0);
  const submitted = summary.reduce((total,item)=>total+Number(item.submitted||0),0);
  return <section className="integrated-section">
    <span className="eyebrow">EXAM ANALYTICS</span><h1>{isSuperAdmin?'Institution-wide reports':'My exam reports'}</h1>
    <p className="integrated-muted">{selectedInstitution?.name} · Results include only exams your role is allowed to manage.</p>
    {error&&<p className="ops-error" role="alert">{error.message}</p>}
    <div className="exam-summary">
      {[['Examinations',summary.length],['Registrations',registrations],['Submissions',submitted]].map(([title,count])=><div key={title}><strong>{count}</strong><span>{title}</span></div>)}
    </div>
    <div className="content-section"><h2>Examination performance</h2>{isLoading?<PageLoader label="Loading reports…" />:<div className="table-container"><table className="data-table"><thead><tr><th>Exam</th><th>Status</th><th>Registered</th><th>Submitted</th><th>Average marks</th></tr></thead><tbody>
      {summary.map(item=><tr key={item.exam_id}><td><Link to={`/app/i/${institutionId}/exams/${item.exam_id}/students`}>{item.title}</Link></td><td>{item.exam_status}</td><td>{item.registrations}</td><td>{item.submitted}</td><td>{item.average_score??'—'}</td></tr>)}
      {!summary.length&&!isLoading&&<tr><td colSpan={5}>No exam reports yet.</td></tr>}
    </tbody></table></div>}</div>
  </section>;
}
