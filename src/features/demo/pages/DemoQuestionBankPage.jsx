import { useState } from 'react';
import { Link } from 'react-router-dom';
import { seedDemo } from '../../../lib/demoClient';
export default function DemoQuestionBankPage(){
 const [examId,setExamId]=useState('demo-active');
 const demo=seedDemo();
 const questions=demo.questions.filter(q=>q.exam_id===examId);
 return <section className="integrated-section"><span className="eyebrow">DEMO · SAMPLE DATA</span><h1>Question bank preview</h1><p className="integrated-muted">Browse example questions. In a real institution, staff can create reusable question banks and import CSV files.</p>
 <div className="content-section"><label>Sample paper <select aria-label="Choose sample paper" value={examId} onChange={e=>setExamId(e.target.value)}>{demo.exams.map(exam=><option key={exam.exam_id} value={exam.exam_id}>{exam.title}</option>)}</select></label>
 <div className="table-container"><table className="data-table"><thead><tr><th>Question</th><th>Options</th><th>Marks</th></tr></thead><tbody>{questions.map(q=><tr key={q.question_id}><td>{q.question_text}</td><td>{q.options.join(' · ')}</td><td>{q.marks}</td></tr>)}</tbody></table></div><Link to="/demo/admin/exams">← Return to sample exams</Link></div></section>
}
