import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity, FiArrowRight, FiHome, FiCheckCircle, FiChevronRight,
  FiClock, FiLayers, FiPlus, FiRefreshCw, FiSearch, FiShield,
  FiSlash, FiUsers, FiX,
} from 'react-icons/fi';
import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import PageLoader from '../../../shared/components/PageLoader';
import {
  createInstitutionAsPlatformOwner,
  getInstitutionApplicationsForReview,
  listPlatformInstitutions,
  setInstitutionStatus,
} from '../../../services/institutionService';
import { useAdminWorkspace } from '../context/AdminWorkspaceContext';
import './platform-institutions.css';

const FILTERS = [
  { id: 'all', label: 'All institutions' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || 'IN').slice(0, 2)).toUpperCase();
}

function suggestedCode(name) {
  return String(name || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
}

export default function InstitutionsPage() {
  const dialog = useAppDialog();
  const { refreshWorkspace } = useAdminWorkspace();
  const [institutions, setInstitutions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', code: '', superAdminEmail: '' });
  const createButtonRef = useRef(null);
  const drawerRef = useRef(null);
  const nameInputRef = useRef(null);

  const load = useCallback(async () => {
    const [rows, apps] = await Promise.all([
      listPlatformInstitutions(), getInstitutionApplicationsForReview(),
    ]);
    setInstitutions(rows || []);
    setApplications(apps || []);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([listPlatformInstitutions(), getInstitutionApplicationsForReview()])
      .then(([rows, apps]) => {
        if (!mounted) return;
        setInstitutions(rows || []);
        setApplications(apps || []);
      })
      .catch(err => { if (mounted) setError(err.message || 'Unable to load institutions.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const closeCreate = () => {
    if (busyId) return;
    setCreateOpen(false);
    setFormError('');
    requestAnimationFrame(() => createButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!createOpen) return undefined;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nameInputRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape' && !busyId) {
        event.preventDefault();
        setCreateOpen(false);
        requestAnimationFrame(() => createButtonRef.current?.focus());
      }
      if (event.key !== 'Tab') return;
      const controls = [...(drawerRef.current?.querySelectorAll('input:not([disabled]),button:not([disabled])') || [])];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls[controls.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
        event.preventDefault();
        controls[0].focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [createOpen, busyId]);

  async function refresh() {
    if (loading || refreshing || busyId) return;
    setRefreshing(true);
    setError('');
    try { await load(); }
    catch (err) { setError(err.message || 'Could not refresh institutions.'); }
    finally { setRefreshing(false); }
  }

  async function createInstitution(event) {
    event.preventDefault();
    if (busyId) return;
    setFormError('');
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toLowerCase(),
      superAdminEmail: form.superAdminEmail.trim().toLowerCase(),
    };
    if (payload.name.length < 3 || !/^[a-z0-9][a-z0-9-]{2,39}$/.test(payload.code)) {
      setFormError('Enter a valid institution name and a unique code of 3–40 lowercase characters.');
      return;
    }
    setBusyId('create');
    try {
      await createInstitutionAsPlatformOwner(payload);
      setCreateOpen(false);
      setForm({ name: '', code: '', superAdminEmail: '' });
      setMessage('Institution created successfully.');
      setError('');
      const updates = await Promise.allSettled([load(), refreshWorkspace()]);
      if (updates[0].status === 'rejected') {
        setError('Institution was created. Refresh the page to see it in the registry.');
      }
      requestAnimationFrame(() => createButtonRef.current?.focus());
    } catch (err) { setFormError(err.message || 'Unable to create this institution.'); }
    finally { setBusyId(''); }
  }

  async function changeStatus(institution) {
    if (busyId) return;
    const suspending = institution.status === 'active';
    const verb = suspending ? 'Suspend' : 'Reactivate';
    const confirmed = await dialog.confirm(
      suspending
        ? 'Suspend ' + institution.name + '? Institution staff will lose access until the institution is reactivated. Existing examinations and records will be retained.'
        : 'Reactivate ' + institution.name + '? Active institution members will regain access based on their existing roles.',
      {
        title: verb + ' institution?',
        confirmLabel: verb + ' institution',
        danger: suspending,
      },
    );
    if (!confirmed) return;
    setBusyId(institution.id);
    setError('');
    setMessage('');
    try {
      await setInstitutionStatus(institution.id, suspending ? 'suspended' : 'active');
      setMessage(institution.name + ' ' + (suspending ? 'suspended.' : 'reactivated.'));
      const updates = await Promise.allSettled([load(), refreshWorkspace()]);
      if (updates[0].status === 'rejected') setError('Status changed. Refresh to update the registry.');
    } catch (err) { setError(err.message || 'Unable to change institution status.'); }
    finally { setBusyId(''); }
  }

  const stats = useMemo(() => {
    const active = institutions.filter(item => item.status === 'active').length;
    const suspended = institutions.filter(item => item.status === 'suspended').length;
    const pending = applications.filter(app => app.status === 'pending').length;
    const members = institutions.reduce((sum, item) => sum + Number(item.member_count || 0), 0);
    return { total: institutions.length, active, suspended, pending, members };
  }, [institutions, applications]);

  const pendingApplications = useMemo(
    () => applications.filter(app => app.status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [applications],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = institutions.filter(item =>
      (filter === 'all' || item.status === filter) &&
      [item.name, item.code].filter(Boolean).join(' ').toLowerCase().includes(term)
    );
    result.sort((a, b) => {
      if (sort === 'members') return Number(b.member_count || 0) - Number(a.member_count || 0) || String(a.name).localeCompare(String(b.name));
      if (sort === 'name-desc') return String(b.name).localeCompare(String(a.name));
      return String(a.name).localeCompare(String(b.name));
    });
    return result;
  }, [institutions, filter, search, sort]);

  return <section className="integrated-section qi-owner">
    <header className="qi-heading">
      <div className="qi-heading-copy">
        <div className="qi-breadcrumb"><FiShield aria-hidden="true" /> Platform Owner <FiChevronRight aria-hidden="true" /> Institution management</div>
        <h1>Institutions</h1>
        <p>Manage your institution network, review applications and control institutional access.</p>
      </div>
      <div className="qi-heading-actions">
        <Link className="qi-button qi-button-secondary" to="/platform/applications">
          <FiClock aria-hidden="true" /> Applications
          {stats.pending > 0 && <span className="qi-count-bubble">{stats.pending}</span>}
        </Link>
        <button ref={createButtonRef} type="button" className="qi-button qi-button-primary"
          onClick={() => { setCreateOpen(true); setFormError(''); }}>
          <FiPlus aria-hidden="true" /> New institution
        </button>
      </div>
    </header>

    {error && <div role="alert" className="qi-notice qi-notice-error">{error}</div>}
    {message && <div role="status" className="qi-notice qi-notice-success"><FiCheckCircle aria-hidden="true" /> {message}</div>}

    <div className="qi-metrics" aria-label="Institution overview">
      <div className="qi-metric"><span className="qi-metric-icon"><FiLayers aria-hidden="true" /></span><span className="qi-metric-title">Total institutions</span><strong>{loading ? '—' : stats.total}</strong><small>Registered on Qualify</small></div>
      <div className="qi-metric"><span className="qi-metric-icon qi-metric-icon-active"><FiActivity aria-hidden="true" /></span><span className="qi-metric-title">Active institutions</span><strong>{loading ? '—' : stats.active}</strong><small>Currently operating</small></div>
      <div className="qi-metric"><span className="qi-metric-icon qi-metric-icon-muted"><FiSlash aria-hidden="true" /></span><span className="qi-metric-title">Suspended</span><strong>{loading ? '—' : stats.suspended}</strong><small>Access paused</small></div>
      <div className="qi-metric"><span className="qi-metric-icon qi-metric-icon-pending"><FiClock aria-hidden="true" /></span><span className="qi-metric-title">Awaiting review</span><strong>{loading ? '—' : stats.pending}</strong><small>Registration applications</small></div>
    </div>

    {!loading && pendingApplications.length > 0 && <div className="qi-review-strip">
      <span className="qi-review-marker"><FiClock aria-hidden="true" /></span>
      <div className="qi-review-copy">
        <strong>{stats.pending} application{stats.pending === 1 ? '' : 's'} awaiting review</strong>
        <span>
          {pendingApplications.slice(0, 2).map(app => app.institution_name).join(' · ')}
          {stats.pending > 2 ? ' · +' + (stats.pending - 2) + ' more' : ''}
        </span>
      </div>
      <Link to="/platform/applications" className="qi-review-link">Review applications <FiArrowRight aria-hidden="true" /></Link>
    </div>}

    <section className="qi-registry" aria-labelledby="qi-registry-title">
      <div className="qi-registry-top">
        <div>
          <div className="qi-registry-title"><h2 id="qi-registry-title">Institution directory</h2><span>{stats.total} total</span></div>
          <p>A central view of all registered institutions and their access status.</p>
        </div>
        <button className="qi-refresh" type="button" disabled={loading || refreshing || Boolean(busyId)} onClick={refresh} aria-label="Refresh institution directory">
          <FiRefreshCw aria-hidden="true" className={refreshing ? 'qi-spinning' : ''} /> Refresh
        </button>
      </div>

      <div className="qi-toolbar">
        <div className="qi-filter-tabs" role="group" aria-label="Filter institutions">
          {FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id}
            className={filter === item.id ? 'qi-filter is-selected' : 'qi-filter'} onClick={() => setFilter(item.id)}>
            {item.label}
            <span>{item.id === 'all' ? stats.total : stats[item.id]}</span>
          </button>)}
        </div>
        <div className="qi-toolbar-right">
          <label className="qi-search"><FiSearch aria-hidden="true" />
            <input value={search} onChange={event => setSearch(event.target.value)}
              type="search" placeholder="Search name or code" aria-label="Search institutions" />
          </label>
          <label className="qi-sort">
            <span>Sort:</span>
            <select aria-label="Sort institutions" value={sort} onChange={event => setSort(event.target.value)}>
              <option value="name">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="members">Most members</option>
            </select>
          </label>
        </div>
      </div>

      <div className="qi-table-scroll">
        <table className="qi-table">
          <thead><tr><th scope="col">Institution</th><th scope="col">Code</th><th scope="col">Members</th><th scope="col">Access status</th><th scope="col" className="qi-action-col">Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="qi-table-empty"><PageLoader label="Loading institution directory…" /></td></tr> :
              visible.length ? visible.map(institution => <tr key={institution.id}>
                <td>
                  <div className="qi-institution-cell">
                    <span className="qi-institution-avatar" aria-hidden="true">{initials(institution.name)}</span>
                    <div className="qi-institution-detail">
                      <Link to={'/platform/institutions/' + institution.id}>{institution.name}</Link>
                      <small>Registered institution</small>
                    </div>
                  </div>
                </td>
                <td><code className="qi-institution-code">{institution.code}</code></td>
                <td><span className="qi-members"><FiUsers aria-hidden="true" /> {institution.member_count ?? 0}</span></td>
                <td>
                  <span className={institution.status === 'active' ? 'qi-status qi-status-active' : 'qi-status qi-status-suspended'}>
                    <span aria-hidden="true" />{institution.status === 'active' ? 'Active' : institution.status === 'suspended' ? 'Suspended' : institution.status}
                  </span>
                </td>
                <td className="qi-row-actions">
                  <Link className="qi-row-view" to={'/platform/institutions/' + institution.id}>View <FiChevronRight aria-hidden="true" /></Link>
                  <button type="button" disabled={Boolean(busyId)}
                    className={institution.status === 'active' ? 'qi-row-status qi-row-suspend' : 'qi-row-status qi-row-activate'}
                    onClick={() => changeStatus(institution)}>
                    {busyId === institution.id ? 'Updating…' : institution.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>) : <tr><td colSpan={5} className="qi-table-empty">
                <div className="qi-empty-icon"><FiHome aria-hidden="true" /></div>
                <strong>{search ? 'No matches found' : filter !== 'all' ? 'No institutions in this category' : 'No institutions registered yet'}</strong>
                <span>{search ? 'Try another name or institution code.' : 'Institutions will appear here when added or approved.'}</span>
                {(search || filter !== 'all') && <button type="button" className="qi-clear" onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</button>}
              </td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="qi-registry-footer">
        <span>Showing <strong>{loading ? '—' : visible.length}</strong> of <strong>{stats.total}</strong> institutions</span>
        <span className="qi-footer-label"><FiShield aria-hidden="true" /> Platform-level access controls</span>
      </footer>
    </section>

    {createOpen && <div className="qi-drawer-backdrop" onMouseDown={event => {
      if (event.currentTarget === event.target) closeCreate();
    }}>
      <aside ref={drawerRef} className="qi-drawer" role="dialog" aria-modal="true" aria-labelledby="qi-create-title" aria-describedby="qi-create-description">
        <div className="qi-drawer-header">
          <div className="qi-drawer-label"><FiHome aria-hidden="true" /> INSTITUTION SETUP</div>
          <button className="qi-drawer-close" type="button" disabled={Boolean(busyId)} onClick={closeCreate} aria-label="Close institution form"><FiX aria-hidden="true" /></button>
          <h2 id="qi-create-title">Create institution</h2>
          <p id="qi-create-description">Add an institution directly to Qualify and appoint its first Super Admin.</p>
        </div>
        <form id="qi-create-form" className="qi-drawer-form" onSubmit={createInstitution}>
          {formError && <div role="alert" className="qi-notice qi-notice-error">{formError}</div>}
          <div className="qi-drawer-section"><span>01</span><strong>Institution details</strong></div>
          <label className="qi-field">Institution name <span>*</span>
            <input ref={nameInputRef} required minLength={3} maxLength={160}
              placeholder="e.g. North Valley Institute of Technology" value={form.name}
              onChange={event => setForm(previous => ({
                ...previous,
                name: event.target.value,
                code: (!previous.code || previous.code === suggestedCode(previous.name))
                  ? suggestedCode(event.target.value) : previous.code,
              }))} />
          </label>
          <label className="qi-field">Unique institution code <span>*</span>
            <input required minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9-]{2,39}"
              placeholder="e.g. north-valley" value={form.code}
              onChange={event => setForm(previous => ({ ...previous, code: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
            <small>3–40 characters. Lowercase letters, numbers and hyphens only.</small>
          </label>
          <div className="qi-drawer-section qi-drawer-section-second"><span>02</span><strong>First Super Admin</strong></div>
          <label className="qi-field">Verified Qualify account email <span>*</span>
            <input required type="email" autoComplete="email" placeholder="admin@institution.edu"
              value={form.superAdminEmail} onChange={event => setForm(previous => ({ ...previous, superAdminEmail: event.target.value }))} />
            <small>Direct creation requires an existing verified Qualify Auth account. For new applicants, use the email-OTP registration process.</small>
          </label>
          <div className="qi-drawer-hint"><FiShield aria-hidden="true" />
            <p>This action creates a new institution. Its administrator and data remain isolated from other institutions.</p>
          </div>
        </form>
        <div className="qi-drawer-footer">
          <button type="button" className="qi-button qi-button-secondary" disabled={Boolean(busyId)} onClick={closeCreate}>Cancel</button>
          <button type="submit" form="qi-create-form" className="qi-button qi-button-primary" disabled={Boolean(busyId)}>
            {busyId === 'create' ? 'Creating…' : 'Create institution'} <FiArrowRight aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>}
  </section>;
}
