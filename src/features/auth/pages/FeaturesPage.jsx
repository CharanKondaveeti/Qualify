import { Link } from 'react-router-dom';
import { FiBookOpen, FiUsers, FiBarChart2, FiShield, FiClipboard, FiCheckCircle } from 'react-icons/fi';
import '../styles/landing-page.css';
import '../styles/features-page.css';
const capabilities = [
  {title:'Examination creation',text:'Configure papers, timing, marks and question randomization.',Icon:FiBookOpen},
  {title:'Student management',text:'Manage registrations and monitor ongoing examinations.',Icon:FiUsers},
  {title:'Results & reporting',text:'Review submissions and publish results after completion.',Icon:FiBarChart2},
  {title:'Role-based security',text:'Platform, institution and staff permissions remain separated.',Icon:FiShield},
  {title:'Question banks',text:'Organize reusable questions and import examination questions.',Icon:FiClipboard},
  {title:'Controlled staff access',text:'Verify account ownership and require Super Admin confirmation.',Icon:FiCheckCircle},
];
export default function FeaturesPage(){return <main className="qualify-features-page">
  <nav className="qualify-features-nav"><Link to="/" className="qa-brand">QUALIFY</Link><div><Link to="/demo">Explore demo</Link><Link to="/login">Sign in</Link></div></nav>
  <section className="qualify-features-hero"><span className="eyebrow">QUALIFY EXAMINATION PLATFORM</span><h1>Built for serious institutional examinations.</h1><p>Everything your institution needs for structured assessment, from question creation through published results.</p></section>
  <div className="qualify-features-grid">{capabilities.map(({title,text,Icon})=><article className="qualify-features-card" key={title}><Icon aria-hidden="true"/><h2>{title}</h2><p>{text}</p></article>)}</div>
  <section className="qualify-features-bottom"><h2>See how QUALIFY works</h2><p>Explore a sample institution workspace and student examination without connecting a real account.</p><a href="/demo" className="qualify-features-button">Open interactive demo →</a></section>
</main>}
