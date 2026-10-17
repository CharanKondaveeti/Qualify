# JSX tree inventory

Source-derived trees for every JSX file, including conditional branches, repeated templates and currently unreachable components. These are not claims that every branch was rendered in a browser. Component tags refer to their own file trees; expressions are abbreviated. Line numbers refer to the inspected source.

## src/app/App.jsx

```text
Navigate to="{`/admin/exams/${examId}`}" [L31]
AdminRouteGuard [L33]
LandingPage [L35]
LandingPage [L36]
ExamPage [L38]
ExamRegistrationPage [L39]
ResultsPage [L40]
AdminAuthPage [L41]
InstitutionGate [L43]
  ApplyInstitutionPage [L43]
InstitutionGate [L44]
  AcceptInvitePage [L44]
Navigate to="/admin/institutions" [L46]
Navigate to="/admin" [L47]
Navigate to="/admin/exams" [L48]
LegacyExamRedirect [L49]
Navigate to="/admin/question-bank" [L50]
DashboardPage [L51]
AdminStartPage [L52]
ExamsPage [L53]
CalendarPage [L54]
ReportsPage [L55]
QuestionBankPage [L56]
CreateExamPage [L57]
CreateExamPage [L58]
ExamDetailsPage [L59]
TeamPage [L60]
InstitutionsPage [L61]
SettingsPage [L62]
div className="portal-message" [L64]
  h1 [L64]
  a href="/" [L64]
Provider [L68]
  QueryClientProvider [L68]
    div className="app-container" [L69]
      Suspense [L69]
        div className="portal-message" [L69]
        RouterProvider [L70]
      ToastContainer [L70]
    ReactQueryDevtools [L71]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/components/AccordionSection.jsx

```text
div className="{`accordion-item ${isExpanded ? \"open\" : \"\"}`}" [L7]
  div className="accordion-title" [L8]
    span [L9]
    FiChevronUp [L10]
    FiChevronDown [L10]
  div className="accordion-body" [L12]
```

- L8: Mouse interaction on non-semantic element.

## src/features/admin/components/AdminRouteGuard.jsx

```text
Navigate to="{destination}" [L22]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/components/ExamAccessGuard.jsx

```text
Navigate to="{isOwner ? '/admin/institutions' : '/institution/apply'}" [L5]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/components/ExamDetailsTabs.jsx

```text
div className="upcoming-exam-details" [L95]
  div className="menu" [L96]
    button className="{activeMenu === \"questions\" ? \"active\" : \"\"}" [L97]
    button className="{activeMenu === \"students\" ? \"active\" : \"\"}" [L103]
    div className="questions-section" [L113]
      QuestionList [L114]
      QuestionTable [L123]
    StudentTable [L132]
    div className="students-section" [L140]
      div className="students-container" [L141]
        table className="students-table" [L142]
          thead [L143]
            tr [L144]
              th [L145]
              th [L146]
              th [L147]
              th [L148]
              th [L149]
          tbody [L153]
            tr className="student-row" [L155]
                td [L158]
                  input [L159]
                td [L167]
                  input [L168]
                td [L176]
                  input type="email" [L177]
                td [L187]
                td [L191]
                  div className="edit-actions" [L192]
                    button className="edit-actions-save-btn" [L193]
                      FaCheckCircle [L197]
                    button className="edit-actions-cancel-btn" [L199]
                      FaTimesCircle [L203]
                td [L211]
                td [L212]
                td [L213]
                td [L215]
                td [L218]
                  div className="table-actions" [L219]
                    button className="edit-btn" [L220]
                      FiEdit2 [L224]
                    button className="delete-btn" [L226]
                      FaTrash [L230]
```

- L159: Control lacks explicit label association (manual review).
- L168: Control lacks explicit label association (manual review).
- L177: Control lacks explicit label association (manual review).

## src/features/admin/components/ExamHeader.jsx

```text
div className="exam-report-header" [L80]
  button type="button" className="exam-report-back-btn" [L81]
    FiArrowLeft className="exam-report-icon-left" [L86]
  div className="exam-report-exam-header" [L90]
    div [L91]
      h1 className="exam-report-exam-title" [L92]
      div className="exam-report-exam-meta" [L94]
        span className="exam-report-meta-item" [L95]
          FiUser className="exam-report-meta-icon" [L96]
        span className="exam-report-meta-item exam-report-editable-field" [L100]
          FiClock className="exam-report-meta-icon" [L101]
          input type="datetime-local" aria-label="Scheduled start" [L103]
        span className="exam-report-meta-item" [L114]
          FiAward className="exam-report-meta-icon" [L115]
        span className="exam-report-meta-item exam-report-editable-field" [L119]
          FiClock className="exam-report-meta-icon" [L120]
            input type="number" aria-label="Duration in minutes" className="duration-input" [L123]
        span className="exam-report-meta-item exam-report-editable-field" [L138]
          FiClock className="exam-report-meta-icon" [L139]
            input type="number" aria-label="Entry window in minutes" className="duration-input" [L143]
      button type="button" className="exam-report-save-btn" [L161]
        FiSave className="exam-report-meta-icon" [L167]
      p role="alert" [L172]
    div className="{`exam-report-status-chip ${exam.exam_status}`}" [L175]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/components/ExamOperations.jsx

```text
section className="qualify-ops" [L117]
  h2 [L118]
  p className="muted" [L118]
  p role="alert" className="ops-error" [L119]
  p role="status" className="ops-info" [L119]
  div className="ops-cards" [L120]
    div [L120]
      strong [L120]
      span [L120]
  div className="ops-actions" [L121]
    button [L121]
    button [L121]
    button [L121]
    button [L121]
  h3 [L122]
  div className="ops-actions" [L122]
    label htmlFor="student-status-filter" [L122]
      select id="student-status-filter" [L122]
        option [L122]
        option [L122]
    input className="ops-search" type="search" aria-label="Search students by name, roll number or email" [L122]
  div className="ops-scroll" [L123]
    table [L123]
      thead [L123]
        tr [L123]
          th [L123]
          th [L123]
          th [L123]
          th [L123]
      tbody [L123]
        tr [L123]
          td [L123]
            small [L123]
          td [L123]
          td [L123]
          td [L123]
            div className="ops-actions" [L123]
              button [L123]
                button [L123]
                button [L123]
                button [L123]
  div className="ops-panel" [L124]
    h3 [L124]
    p className="muted" [L124]
      code [L124]
    textarea [L124]
    button [L124]
  div className="ops-activity-heading" [L125]
    h3 [L125]
    button type="button" className="ops-danger" [L125]
  div className="ops-actions" [L126]
    input className="ops-search" type="search" aria-label="Search recent exam activity by student or event" [L126]
    span className="ops-count" [L126]
  div className="ops-scroll ops-activity-scroll" role="region" aria-label="Recent exam activity, scrollable" [L127]
    table [L127]
      thead [L127]
        tr [L127]
          th [L127]
          th [L127]
          th [L127]
      tbody [L127]
        tr [L127]
          td [L127]
          td [L127]
          td [L127]
        tr [L127]
          td [L127]
  p className="ops-helper" [L128]
```

- L124: Control lacks explicit label association (manual review).

## src/features/admin/components/ExamRegistrationLink.jsx

```text
div className="registry-link" [L5]
  span [L5]
    a href="{link}" [L5]
  button className="copy-btn" [L5]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/components/ManagerAccessGuard.jsx

```text
Navigate to="{canUseExams ? '/admin/exams' : '/admin/settings'}" [L5]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/components/UpcomingExamNotice.jsx

```text
div className="exam-report-edit-section" [L5]
  div className="exam-report-edit-header" [L6]
    FiEdit2 className="exam-report-edit-icon" [L7]
    h2 className="exam-report-edit-title" [L8]
  p className="exam-report-edit-description" [L10]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/context/AdminWorkspaceContext.jsx

```text
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/pages/AdminStartPage.jsx

```text
Navigate to="{canUseExams ? '/admin/exams' : isOwner ? '/admin/institutions' : '/institution/apply'}" [L5]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/pages/CalendarPage.jsx

```text
div className="loading-container" [L33]
  div className="loading-spinner" [L34]
  p [L35]
div className="error-container" [L41]
  p [L42]
  button className="retry-btn" [L43]
div className="calendar-tab" [L143]
  div className="calendar-header" [L144]
    div className="header-content" [L145]
      div className="header-title" [L146]
        FiCalendar className="header-icon" [L147]
        h2 [L148]
      div className="month-navigation" [L151]
        button className="nav-btn" aria-label="Previous month" [L152]
          FiChevronLeft [L157]
        h3 className="current-month" [L160]
        button className="nav-btn" aria-label="Next month" [L164]
          FiChevronRight [L169]
        button className="today-btn" [L172]
  div className="calendar-grid-container" [L179]
    div className="day-names" [L180]
      div className="day-name" [L182]
    div className="calendar-grid" [L188]
      div className="{`calendar-day ${ dayObj.isCurrentMonth ? \"\" : \"other-month\" } ${ dayObj.date.toDateString() === new Date().toDateString() ? \"today\" : \"\" } ${dayObj.hasExam ? \"" [L190]
        div className="day-number" [L201]
        div className="exam-marker" [L203]
          div className="exam-dot" [L204]
          div className="exam-title" [L206]
          div className="exam-count" [L208]
  div className="exam-popup-overlay" [L220]
    div className="exam-popup compact" [L224]
      button className="close-popup" [L228]
      h3 className="popup-date" [L234]
      div className="compact-exam-list" [L245]
        div className="compact-exam-card" [L247]
          div className="exam-time" [L248]
          div className="exam-main" [L254]
            div className="exam-title" [L255]
            div className="exam-course" [L256]
          div className="{`exam-status status-${exam.exam_status}`}" [L258]
```

- L190: Mouse interaction on non-semantic element.
- L220: Mouse interaction on non-semantic element.
- L224: Mouse interaction on non-semantic element.

## src/features/admin/pages/CreateExamPage.jsx

```text
div className="create-exam__container" [L209]
  div className="create-exam__header" [L210]
    button type="button" aria-label="Back to exams" [L211]
      FiArrowLeft [L216]
    h4 [L218]
  form className="create-exam__form-grid" [L221]
    div className="create-exam__form-group" [L225]
      label htmlFor="name" [L226]
      input id="name" [L227]
      p className="create-exam__error" [L229]
    div className="create-exam__form-group" [L233]
      label htmlFor="course" [L234]
      input id="course" [L235]
      p className="create-exam__error" [L237]
    div className="create-exam__form-group" [L241]
      label htmlFor="date" [L242]
      input id="date" type="date" [L243]
    div className="create-exam__form-group" [L250]
      label htmlFor="time" [L251]
      input id="time" type="time" [L252]
    div className="create-exam__form-group" [L259]
      label htmlFor="duration" [L260]
      input id="duration" type="number" [L261]
    div className="create-exam__form-group" [L273]
      label htmlFor="markingMode" [L274]
      select id="markingMode" [L275]
        option [L280]
        option [L283]
    div className="create-exam__form-group" [L287]
      label htmlFor="totalMarks" [L288]
      input id="totalMarks" type="number" [L291]
      input id="totalMarks" type="number" [L302]
      small [L310]
    div className="create-exam__form-group" [L317]
      label htmlFor="passMark" [L318]
      input id="passMark" type="number" [L319]
    div className="create-exam__form-group" [L331]
      label [L332]
        input type="checkbox" [L333]
    div className="create-exam__form-group" [L342]
      label [L343]
        input type="checkbox" [L344]
    div className="create-exam__form-group" [L353]
      label htmlFor="instructions" [L354]
      textarea id="instructions" [L355]
    BankPicker [L363]
    FileUpload [L365]
    div className="create-exam__preview-section" [L371]
      PreviewQuestions [L372]
    div className="create-exam__actions" [L380]
      button type="button" className="create-exam__add-question-btn" [L381]
      button type="submit" className="create-exam__submit-btn" [L389]
        span [L395]
          FiLoader [L396]
  Modal [L405]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/pages/DashboardPage.jsx

```text
div className="portal-message" role="alert" [L87]
  p [L87]
  button [L87]
div className="portal-message" [L88]
AdminWorkspaceContext.Provider [L102]
  div className="{`admin-dashboard ${collapsed ? 'sidebar-collapsed' : ''}`}" [L103]
    aside className="sidebar" [L104]
      div className="sidebar-header" [L105]
        NavLink to="/" className="logo" [L105]
        button aria-label="Toggle navigation" className="toggle-btn" [L105]
          FiMenu [L105]
      nav className="nav-menu" [L106]
        NavLink aria-label="{label}" to="{`/admin/${path}`}" className="{({isActive}) => `nav-item ${isActive ? 'active' : ''}`}" [L106]
          Icon className="nav-icon" [L106]
          span className="nav-text" [L106]
      div className="sidebar-footer" [L107]
        button aria-label="Sign out" className="logout-btn" [L107]
          FiLogOut className="nav-icon" [L107]
          span [L107]
    main className="main-content" [L109]
      header className="top-nav" [L109]
        div className="integrated-top-left" [L110]
          span className="workspace-label" [L110]
          label className="integrated-picker" [L111]
            select aria-label="Select institution" [L112]
              option [L113]
        div className="user-profile" [L117]
          span className="integrated-role" [L117]
          span className="avatar" [L117]
          span [L117]
      div className="content-wrapper" [L118]
        div className="demo-banner" [L119]
          span [L119]
            strong [L119]
          NavLink to="/exams/demo-active/student/demo-student" [L119]
        div className="ops-panel" [L120]
        Outlet [L121]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/pages/ExamDetailsPage.jsx

```text
p className="portal-message" [L141]
p className="portal-message" [L146]
div className="view-exam-details" [L166]
  ExamHeader [L167]
  section className="exam-lifecycle" aria-label="Automatic exam schedule" [L169]
    h3 [L170]
    p [L172]
      strong [L173]
    p [L175]
      strong [L176]
    p [L178]
      strong [L179]
    p [L182]
    button type="button" className="action-btn" [L188]
    p role="alert" [L198]
    p role="status" [L201]
    ExamRegistryLink [L207]
    UpcomingExamNotice [L208]
  SummaryGrid [L213]
  section className="qualify-ops" [L222]
    h2 [L223]
    p className="muted" [L224]
    div className="ops-actions" [L229]
      select aria-label="New exam owner" [L230]
        option [L235]
        option [L240]
      button type="button" className="action-btn" [L247]
    p role="status" [L257]
  ExamOperations [L261]
  StudentQuesTab [L263]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/pages/ExamsPage.jsx

```text
span className="{`status-badge ${status}`}" [L91]
button aria-label="{`Delete ${exam.title}`}" className="delete-btn" [L97]
  span className="spinner" [L104]
  FiTrash2 [L106]
div className="loader-container" [L112]
  div className="loader" [L113]
  p [L114]
p className="error-message" [L120]
table className="exams-table" [L123]
  thead [L124]
    tr [L125]
      th [L126]
      th [L127]
      th [L128]
      th [L129]
      th [L130]
      th [L131]
  tbody [L134]
    tr className="exam-row" [L137]
      td [L144]
      td [L145]
      td [L146]
      td [L147]
      td [L148]
      td [L149]
    tr [L153]
      td className="no-exams-message" [L154]
div className="exams-tab" [L165]
  div className="exam-summary" [L166]
    div [L166]
      strong [L166]
      span [L166]
  div className="exams-management" [L167]
    div className="exams-header" [L169]
      h2 [L170]
        FiBook className="header-icon" [L171]
      button className="add-exam-btn" [L174]
        FiPlus [L178]
    div className="exams-controls" [L184]
      div className="search-bar" [L185]
        FiSearch className="search-icon" [L186]
        input type="text" [L187]
      div className="filter-tabs" [L195]
        button className="{`filter-btn ${ activeFilter === filter ? \"active\" : \"\" }`}" [L197]
    div className="exams-table-container" [L212]
  Modal [L215]
```

- L187: Control lacks explicit label association (manual review).

## src/features/admin/pages/InstitutionsPage.jsx

```text
section className="integrated-section" [L31]
  span className="eyebrow" [L32]
  h1 [L32]
  p className="integrated-muted" [L33]
  p className="ops-error" role="alert" [L34]
  p className="ops-info" role="status" [L34]
  div className="exam-summary" [L35]
    div [L35]
      strong [L35]
      span [L35]
  div className="integrated-grid" [L36]
    div className="content-section" [L37]
      h2 [L37]
      p className="integrated-muted" [L37]
      form className="integrated-form" [L38]
        label [L39]
          input [L39]
        label [L40]
          input [L40]
        label [L41]
          input type="email" [L41]
        button className="integrated-primary" [L42]
    div className="content-section" [L45]
      h2 [L45]
      div className="integrated-scroll" [L46]
        p className="integrated-muted" [L46]
        article className="integrated-item" [L46]
          h3 [L47]
          p [L47]
            strong [L47]
          p className="integrated-muted" [L48]
          p [L48]
          p className="integrated-muted" [L49]
          label [L50]
            textarea [L50]
          div className="integrated-actions" [L51]
            button className="integrated-primary" [L51]
            button className="integrated-danger" [L52]
  div className="content-section" [L56]
    div className="integrated-section-head" [L56]
      h2 [L56]
      input type="search" aria-label="Search institutions" [L56]
    div className="table-container" [L57]
      table className="data-table" [L57]
        thead [L57]
          tr [L57]
            th [L57]
            th [L57]
            th [L57]
            th [L57]
            th [L57]
        tbody [L57]
          tr [L58]
            td [L58]
            td [L58]
            td [L58]
            td [L58]
            td [L58]
              div className="integrated-actions" [L58]
                button className="action-btn" [L58]
                button className="{i.status==='active'?'integrated-danger':'action-btn'}" [L58]
          tr [L59]
            td [L59]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/pages/QuestionBankPage.jsx

```text
section className="qualify-ops" [L93]
  h1 [L94]
  p className="muted" [L95]
    strong [L95]
  div className="ops-panel" [L96]
    label className="ops-field" [L96]
      select aria-label="Question visibility" [L97]
        option [L97]
        option [L97]
  p className="muted" [L99]
  p role="alert" className="ops-error" [L100]
  p role="status" className="ops-info" [L101]
  div className="ops-panel" [L103]
    h2 [L104]
    p className="muted" [L105]
    p [L106]
      a href="/templates/questions.csv" [L106]
    form [L107]
      div className="ops-bank-grid" [L108]
        label className="ops-field" [L109]
          input [L109]
        label className="ops-field" [L110]
          input [L110]
        label className="ops-field" [L111]
          select [L111]
            option [L111]
            option [L111]
            option [L111]
      input className="ops-file-input" type="file" aria-label="Choose question bank CSV" [L113]
      button type="submit" [L114]
    p className="ops-helper" [L116]
  div className="ops-panel" [L119]
    h2 [L119]
    form className="bank-form" [L119]
      input [L119]
      input [L119]
      select [L119]
        option [L119]
      textarea [L119]
      input [L120]
      label [L121]
        select [L121]
          option [L121]
      label [L121]
        input type="number" [L121]
      button type="submit" [L121]
  h2 [L122]
  input aria-label="Search question bank" [L123]
  div className="ops-scroll" [L124]
    table [L124]
      thead [L124]
        tr [L124]
          th [L124]
          th [L124]
          th [L124]
          th [L124]
          th [L124]
      tbody [L124]
        tr [L124]
          td [L124]
          td [L124]
          td [L124]
          td [L124]
          td [L124]
            button [L124]
              button [L124]
              button [L124]
  p [L125]
    Link to="/admin/exam/create" [L125]
```

- L119: Control lacks explicit label association (manual review).
- L119: Control lacks explicit label association (manual review).
- L119: Control lacks explicit label association (manual review).
- L119: Control lacks explicit label association (manual review).
- L120: Control lacks explicit label association (manual review).

## src/features/admin/pages/ReportsPage.jsx

```text
section className="integrated-section" [L15]
  span className="eyebrow" [L16]
  h1 [L16]
  p className="integrated-muted" [L17]
  p className="ops-error" role="alert" [L18]
  div className="exam-summary" [L19]
    div [L20]
      strong [L20]
      span [L20]
  div className="content-section" [L22]
    h2 [L22]
    p [L22]
    div className="table-container" [L22]
      table className="data-table" [L22]
        thead [L22]
          tr [L22]
            th [L22]
            th [L22]
            th [L22]
            th [L22]
            th [L22]
        tbody [L22]
          tr [L23]
            td [L23]
              Link to="{`/admin/exams/${item.exam_id}`}" [L23]
            td [L23]
            td [L23]
            td [L23]
            td [L23]
          tr [L24]
            td [L24]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/pages/SettingsPage.jsx

```text
section className="portal-settings" [L11]
  span className="eyebrow" [L11]
  h1 [L11]
  p [L11]
  div className="settings-card" [L11]
    h2 [L11]
    p [L11]
    button className="action-btn" [L11]
  div className="settings-card" [L11]
    h2 [L11]
    p [L11]
    a href="/templates/questions.csv" [L11]
  div className="settings-card" [L11]
    h2 [L11]
    p [L11]
    button className="action-btn" [L11]
    p role="status" [L11]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/admin/pages/TeamPage.jsx

```text
section className="integrated-section" [L46]
  span className="eyebrow" [L46]
  h1 [L46]
  p className="integrated-muted" [L47]
  p className="ops-error" role="alert" [L48]
  p className="ops-info" role="status" [L48]
  div className="content-section" [L49]
    div className="integrated-grid" [L50]
      div className="content-section" [L50]
        h2 [L50]
        p className="integrated-muted" [L50]
        form className="integrated-form" [L51]
          label [L51]
            input type="email" [L51]
          label [L52]
            select [L52]
              option [L52]
              option [L52]
          button className="integrated-primary" [L52]
        div className="integrated-item" [L53]
          label [L53]
            input [L53]
          button className="action-btn" [L53]
      div className="content-section" [L55]
        h2 [L55]
        p className="integrated-muted" [L55]
        form className="integrated-form" [L56]
          label [L57]
            input type="email" [L57]
          button className="integrated-primary" [L57]
    div className="content-section" [L60]
      div className="integrated-section-head" [L60]
        h2 [L60]
        input type="search" aria-label="Search staff" [L60]
      div className="table-container" [L61]
        table className="data-table" [L61]
          thead [L61]
            tr [L61]
              th [L61]
              th [L61]
              th [L61]
              th [L61]
          tbody [L61]
            tr [L62]
              td [L62]
                small className="integrated-muted" [L62]
              td [L62]
              td [L62]
              td [L63]
                div className="integrated-actions" [L63]
                  button className="action-btn" [L63]
                  button className="{m.status==='active'?'integrated-danger':'action-btn'}" [L64]
            tr [L65]
              td [L65]
    div className="content-section" [L68]
      h2 [L68]
      div className="integrated-scroll" [L68]
        p className="integrated-muted" [L68]
        div className="integrated-item" [L68]
          strong [L68]
          p className="integrated-muted" [L68]
          button className="integrated-danger" [L68]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/auth/pages/AdminAuthPage.jsx

```text
div className="portal-message" [L79]
div className="adminAuth-container" [L84]
  div className="adminAuth-card" [L85]
    h1 className="adminAuth-logo-text" [L86]
    p className="adminAuth-logo-subtext" [L88]
    form className="adminAuth-form" [L92]
      div className="adminAuth-input-group" [L97]
        label [L98]
        input type="text" [L100]
      div className="adminAuth-input-group" [L110]
        label [L111]
        input type="email" [L113]
      div className="adminAuth-input-group" [L122]
        label [L123]
        input type="password" [L125]
      div className="adminAuth-input-group" [L135]
        label [L136]
        input type="password" [L138]
      p className="adminAuth-error" [L148]
      button type="submit" className="adminAuth-button" [L150]
      p className="signup-link" [L154]
        span [L157]
```

- L100: Control lacks explicit label association (manual review).
- L113: Control lacks explicit label association (manual review).
- L125: Control lacks explicit label association (manual review).
- L138: Control lacks explicit label association (manual review).
- L157: Mouse interaction on non-semantic element.

## src/features/auth/pages/LandingPage.jsx

```text
div className="loginpage-container" [L17]
  div className="loginpage-header" [L18]
    div className="loginpage-logo" [L18]
      h1 className="loginpage-logo-text" [L18]
    span className="eyebrow" [L18]
    h1 className="loginpage-title" [L18]
    p className="loginpage-subtitle" [L18]
  div className="loginpage-cards" [L19]
    section className="loginpage-card loginpage-admin-card" [L20]
      div className="portal-card-number" [L20]
      h2 [L20]
      p [L20]
      Link to="/admin-login" className="loginpage-button loginpage-admin-button" [L20]
      Link className="demo-link" to="/institution/apply" [L20]
      a className="demo-link" href="/admin/exams?demo=1" [L20]
    section className="loginpage-card loginpage-student-card" [L21]
      div className="portal-card-number" [L21]
      h2 [L21]
      p [L21]
      form [L21]
        label className="sr-only" htmlFor="exam-link" [L21]
        input id="exam-link" className="portal-input" [L21]
        button className="loginpage-button loginpage-student-button" [L21]
      p role="alert" [L21]
      a className="demo-link" href="/exams/demo-active/student/demo-student?demo=1" [L21]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/institutions/components/InstitutionGate.jsx

```text
div className="portal-message" [L31]
div className="portal-message" [L32]
Navigate to="{`/admin-login${next}`}" [L36]
div className="portal-message" role="alert" [L38]
  p [L38]
Navigate to="/admin/institutions" [L39]
Navigate to="/admin/exams" [L42]
Navigate to="/institution" [L43]
Navigate to="/institution/apply" [L45]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/institutions/pages/AcceptInvitePage.jsx

```text
div className="adminAuth-container" [L18]
  div className="adminAuth-card" [L18]
    h1 className="adminAuth-logo-text" [L19]
    p className="adminAuth-logo-subtext" [L19]
    p [L20]
      strong [L20]
    p role="alert" className="adminAuth-error" [L21]
    button className="adminAuth-button" [L22]
    p role="alert" [L22]
    p [L23]
      Link to="{`/admin-login?next=${encodeURIComponent(`/institution/invite?token=${token}`)}`}" [L23]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/institutions/pages/ApplyInstitutionPage.jsx

```text
div className="adminAuth-container" [L26]
  div className="adminAuth-card" [L26]
    h1 className="adminAuth-logo-text" [L27]
    p className="adminAuth-logo-subtext" [L27]
    p [L28]
    p [L29]
      Link to="/admin" [L29]
    p role="alert" className="adminAuth-error" [L30]
    p role="status" [L30]
    form className="adminAuth-form" [L31]
      div className="adminAuth-input-group" [L32]
        label htmlFor="{key}" [L32]
        input id="{key}" type="{type}" [L32]
      div className="adminAuth-input-group" [L33]
        label htmlFor="details" [L33]
        textarea id="details" [L33]
      button className="adminAuth-button" [L34]
    h3 [L36]
    p [L36]
    p [L36]
      strong [L36]
      small [L36]
    p [L37]
      Link to="/admin-login" [L37]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/questions/components/BankPicker.jsx

```text
div className="ops-panel" [L12]
  button type="button" [L12]
  div [L13]
    p [L13]
    input [L13]
    p role="alert" [L13]
    p [L13]
      button type="button" [L13]
```

- L13: Control lacks explicit label association (manual review).

## src/features/questions/components/OptionEditor.jsx

```text
div className="option-edit" [L8]
  input type="text" [L9]
  button className="{`option-select ${i === correctOption ? \"selected\" : \"\"}`}" [L14]
```

- L9: Control lacks explicit label association (manual review).

## src/features/questions/components/QuestionCard.jsx

```text
div className="question-card" [L16]
  div className="question-card__header" [L17]
    span className="question-card__number" [L21]
    span className="question-card__text" [L23]
    small [L25]
    div className="question-card__actions" [L32]
      button type="button" className="question-card__edit-btn" aria-label="{`Edit question ${index + 1}`}" [L33]
        FiEdit2 [L42]
      button type="button" className="question-card__delete-btn" aria-label="{`Delete question ${index + 1}`}" [L45]
        FiTrash2 [L54]
  div className="question-card__options" [L61]
    div className="{`question-card__option ${ Number(i) === Number(q.correct_option) ? \"correct\" : \"\" }`}" [L63]
```

- L17: Mouse interaction on non-semantic element.

## src/features/questions/components/QuestionFileUpload.jsx

```text
div className="create-exam__form-group upload-file__form-group" [L6]
  label [L7]
  div className="upload-area" [L8]
    label className="upload-btn" [L9]
      FiUpload [L10]
      input type="file" [L12]
    div className="loading-indicator" [L20]
      FiLoader className="spinner" [L21]
      span [L22]
  p className="error-text" [L26]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/questions/components/QuestionList.jsx

```text
  div className="question-manager__question-list" [L132]
    QuestionCard [L134]
  button className="add-question-btn" [L148]
  div className="modal-overlay" [L161]
    div className="modal-content" [L162]
      h4 [L163]
      div className="form-group" [L164]
        label [L165]
        input type="text" [L166]
      div className="form-group" [L177]
        label [L178]
        div className="option-edit" [L180]
          input type="text" [L181]
          button className="{`option-select ${ i === newQuestion.correct_option ? \"selected\" : \"\" }`}" [L190]
      button className="add-btn" [L203]
      button className="cancel-btn" [L206]
  div className="editor-modal" [L217]
    div className="modal-content" [L218]
      h4 [L219]
      div className="form-group" [L220]
        label [L221]
        input type="text" [L222]
      div className="form-group" [L233]
        label [L234]
        div className="option-edit" [L236]
          input type="text" [L237]
          button className="{`option-select ${ i === editingQuestion.correct_option ? \"selected\" : \"\" }`}" [L249]
      div className="modal-actions" [L265]
        button className="cancel-btn" [L266]
        button className="save-btn" [L272]
```

- L166: Control lacks explicit label association (manual review).
- L181: Control lacks explicit label association (manual review).
- L222: Control lacks explicit label association (manual review).
- L237: Control lacks explicit label association (manual review).

## src/features/questions/components/QuestionPreview.jsx

```text
  h3 className="Preview-question__heading" [L117]
  div className="preview-questions" [L120]
    QuestionCard [L122]
  AddNewModal [L137]
  EditQuestionModal [L147]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/questions/components/QuestionTable.jsx

```text
div className="exam-report-questions-table" [L28]
  div className="exam-report-table-wrapper" [L29]
    table className="exam-report-table" [L30]
      thead [L31]
        tr [L32]
          th [L33]
          th [L34]
      tbody [L40]
        tr className="exam-report-table-row" [L50]
          td [L51]
          td [L52]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/questions/dialogs/AddQuestionDialog.jsx

```text
div className="modal-overlay" role="dialog" [L11]
  div className="modal-content" [L21]
    h4 [L22]
    div className="form-group" [L24]
      label [L25]
      input type="text" [L26]
    div className="form-group" [L38]
      label [L39]
      OptionEditor [L40]
    div className="form-group" [L61]
      label htmlFor="new-question-marks" [L62]
      input id="new-question-marks" type="number" [L65]
      p [L79]
    div className="modal-actions" [L83]
      button type="button" className="cancel-btn" [L84]
      button type="button" className="add-btn" [L92]
```

- L11: Dialog has no accessible name.
- L26: Control lacks explicit label association (manual review).

## src/features/questions/dialogs/EditQuestionDialog.jsx

```text
div className="editor-modal" role="dialog" [L10]
  div className="modal-content" [L20]
    h4 [L21]
    div className="form-group" [L23]
      label [L24]
      input type="text" [L25]
    div className="form-group" [L37]
      label [L38]
      OptionEditor [L39]
    div className="form-group" [L60]
      label htmlFor="edit-question-marks" [L61]
      input id="edit-question-marks" type="number" [L63]
      small [L79]
    div className="modal-actions" [L86]
      button type="button" className="cancel-btn" [L87]
      button type="button" className="save-btn" [L95]
```

- L10: Dialog has no accessible name.
- L25: Control lacks explicit label association (manual review).

## src/features/reports/components/PerformanceOverview.jsx

```text
div className="exam-report-performance-card" [L12]
  div className="exam-report-performance-item" [L13]
    div className="{`exam-report-icon-container ${iconColor}`}" [L14]
    div [L15]
      p className="exam-report-label" [L16]
      p className="exam-report-value" [L17]
div className="exam-report-performance-section" [L26]
  div className="exam-report-section-header" [L27]
  div className="exam-report-performance-grid" [L28]
    PerformanceItem [L29]
      FiClock className="exam-report-icon" [L32]
    PerformanceItem [L35]
      FiAlertCircle className="exam-report-icon" [L38]
    PerformanceItem [L41]
      FiCheckCircle className="exam-report-icon" [L44]
    PerformanceItem [L47]
      FiAlertTriangle className="exam-report-icon" [L50]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/reports/components/StatusBadge.jsx

```text
FiClock className="exam-report-status-icon" [L15]
FiClock className="exam-report-status-icon" [L19]
FiCheckCircle className="exam-report-status-icon" [L23]
FiXCircle className="exam-report-status-icon" [L27]
FiAlertCircle className="exam-report-status-icon" [L31]
FiAlertTriangle className="exam-report-status-icon" [L35]
span className="{`exam-report-badge ${ statusMap[status]?.color || \"exam-report-status-badge gray\" }`}" [L40]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/reports/components/StudentTable.jsx

```text
div className="exam-report-student-table" [L80]
  div className="qualifying-mark-input" [L82]
    label htmlFor="qualifying-mark" [L83]
    input type="number" id="qualifying-mark" [L84]
    button className="save-passmark-button" [L96]
      div className="spinner" aria-label="Saving" [L97]
      p [L97]
    button className="export-button" [L99]
      FaFileExport [L104]
      span [L105]
  p className="error-message" role="alert" [L108]
  table className="exam-report-table" [L111]
    thead [L112]
      tr [L113]
        th [L114]
        th [L115]
        th [L116]
        th [L117]
    tbody [L120]
      tr [L125]
        td [L126]
        td [L127]
        td [L128]
          span [L130]
          span [L132]
        td [L135]
          span className="exam-report-result-badge failed" [L137]
          span className="exam-report-result-badge passed" [L141]
          span className="exam-report-result-badge failed" [L145]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/reports/components/SummaryGrid.jsx

```text
div className="{`exam-report-summary-card exam-report-border-${borderColor}`}" [L8]
  div className="exam-report-card-content" [L11]
    div [L12]
      p className="exam-report-card-label" [L13]
      div className="exam-report-card-metric" [L14]
        p className="exam-report-card-value" [L15]
        span className="{`exam-report-card-percentage ${borderColor}`}" [L17]
    div className="{`exam-report-icon-container ${borderColor}`}" [L23]
div className="exam-report-summary-grid" [L102]
  SummaryCard [L103]
    FiUsers className="exam-report-icon" [L106]
    SummaryCard [L112]
      FiCheckCircle className="exam-report-icon" [L115]
    SummaryCard [L118]
      FiAward className="exam-report-icon" [L121]
    SummaryCard [L124]
      FiAlertCircle className="exam-report-icon" [L127]
    SummaryCard [L135]
      FiCheckCircle className="exam-report-icon" [L139]
    SummaryCard [L142]
      FiAward className="exam-report-icon" [L148]
    SummaryCard [L151]
      FiAlertCircle className="exam-report-icon" [L157]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/components/ExamHeader.jsx

```text
div className="examBoard__exam-header" [L7]
  div className="examBoard__exam-meta" [L8]
    div className="examBoard__student-details" [L9]
      div className="examBoard__student-info" [L10]
        StudentInfoRow [L11]
        StudentInfoRow [L15]
        StudentInfoRow [L16]
  div className="examBoard__exam-title" [L21]
    h1 [L22]
    div className="examBoard__exam-subject" [L23]
  div className="{`examBoard__time-remaining ${ timeLeft <= 300 ? \"warning\" : \"\" }`}" [L28]
    FiClock className="examBoard__timer-icon" [L33]
    span className="examBoard__timer-text" [L34]
div className="examBoard__student-row" [L42]
  span className="examBoard__student-label" [L43]
  span className="examBoard__student-value" [L44]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/components/ExamModal.jsx

```text
div className="modal-overlay" [L4]
  div className="{`modal-container ${modal.type}`}" [L5]
    div className="modal-header" [L6]
      h3 [L7]
      button className="modal-close" [L9]
        FiX [L10]
    div className="modal-body" [L15]
      p [L16]
    div className="modal-footer" [L19]
        button className="modal-confirm" [L22]
          div className="button-spinner" [L28]
            div className="spinner" [L29]
            span [L30]
        button className="modal-cancel" [L37]
      button className="modal-ok" [L46]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/components/ExamStartCard.jsx

```text
div className="exam-status-container" [L13]
  div className="exam-status-card ready" [L14]
    h2 [L15]
    div className="exam-details-preview" [L17]
      div [L18]
        strong [L19]
      div [L21]
        strong [L22]
      div [L24]
        strong [L25]
    div className="exam-countdown" [L31]
      h3 [L32]
    button className="start-exam-button pulse" [L37]
    div className="exam-expired-message" [L43]
      h3 [L44]
    div className="exam-instructions" [L49]
      h3 [L50]
      ul [L51]
        li [L52]
        li [L55]
        li [L56]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/components/ExamSubmitted.jsx

```text
div className="exam-status-container" [L5]
  div className="exam-status-card success" [L6]
    FiCheckCircle className="status-icon" [L7]
    h2 [L8]
    p [L9]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/components/QuestionContent.jsx

```text
div className="question-content" [L8]
  h3 [L9]
  div className="options-list" [L10]
    button type="button" className="{`option-item ${isSelected ? \"selected\" : \"\"}`}" [L15]
      div className="option-selector" [L26]
        div className="{`option-circle ${isSelected ? \"selected\" : \"\"}`}" [L27]
      div className="option-text" [L31]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/components/QuestionHeader.jsx

```text
div className="question-header" [L9]
  span className="question-counter" [L10]
  div className="question-nav-buttons" [L13]
    button [L14]
      FiChevronLeft [L18]
    button [L20]
      FiChevronRight [L24]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/components/QuestionPalette.jsx

```text
div className="question-palette" [L13]
  h3 [L14]
  div className="progress-bar" [L15]
    div className="progress-fill" [L16]
    div className="progress-text" [L20]
  div className="question-grid" [L24]
    button className="{`question-number ${ currentQuestionIndex === index ? \"current\" : \"\" } ${answers[q.question_id] !== undefined ? \"answered\" : \"\"} ${flags[q.question_id] ? \"revie" aria-label="{`Question ${index + 1}${flags[q.question_id] ? \", marked for review\" : \"\"}`}" [L26]
  button className="submit-button" [L38]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/pages/ExamPage.jsx

```text
div className="portal-message" [L583]
div className="portal-message" role="alert" [L593]
  h2 [L594]
  p [L596]
  Link to="/" [L598]
div className="portal-message" role="alert" [L609]
  h2 [L610]
  p [L612]
  p [L614]
  button type="button" [L619]
  p [L642]
div className="portal-message" [L653]
div className="portal-message" [L665]
  span className="eyebrow" [L666]
  h1 [L668]
  p [L670]
  Link to="{`/results/${studentId}`}" [L675]
  ExamStartCard [L694]
  p role="status" className="portal-message" [L705]
  div className="exam-consent" [L710]
    label [L711]
      input type="checkbox" [L712]
    p [L721]
  p role="alert" [L724]
div className="portal-message" role="alert" [L735]
div className="exam-container" [L748]
  ExamHeader [L749]
  div className="exam-toolbar" [L759]
    span role="status" [L760]
    button type="button" [L762]
  p role="alert" className="error-message" [L773]
  p role="alert" [L779]
  div className="exam-content" [L782]
    QuestionPalette [L783]
    div className="question-container" [L797]
      QuestionHeader [L798]
      QuestionContent [L814]
      div className="exam-question-actions" [L821]
        button type="button" [L822]
        button type="button" [L830]
  div className="exam-confirm" [L846]
    div role="dialog" aria-label="Confirm exam submission" [L847]
      h2 [L852]
      p [L854]
      button type="button" [L859]
      button type="button" [L867]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/pages/ExamRegistrationPage.jsx

```text
div className="registration-container" [L67]
  div className="registration-card" [L68]
    div className="registration-header" [L69]
      h1 [L70]
    div className="exam-details" [L75]
      div className="detail-item" [L76]
        FiBook className="detail-icon" [L77]
        div [L78]
          h3 [L79]
          p [L80]
      div className="detail-grid" [L84]
        div className="detail-item" [L85]
          FiCalendar className="detail-icon" [L86]
          div [L87]
            p className="detail-label" [L88]
            p [L89]
        div className="detail-item" [L93]
          FiClock className="detail-icon" [L94]
          div [L95]
            p className="detail-label" [L96]
            p [L97]
        div className="detail-item" [L101]
          FiAward className="detail-icon" [L102]
          div [L103]
            p className="detail-label" [L104]
            p [L105]
    Loader [L111]
    p role="alert" [L112]
    form className="registration-form" [L114]
      div className="form-group" [L115]
        label htmlFor="name" [L116]
          FiUser className="input-icon" [L117]
        input id="name" type="text" [L120]
      div className="form-group" [L130]
        label htmlFor="hallticket" [L131]
          FiHash className="input-icon" [L132]
        input id="hallticket" type="text" [L135]
      div className="form-group" [L145]
        label htmlFor="email" [L146]
          FiMail className="input-icon" [L147]
        input id="email" type="email" [L150]
      button type="submit" className="submit-button" [L160]
    div className="{`message ${message.type}`}" [L166]
    div [L168]
      p [L168]
        strong [L168]
      a className="demo-link" href="{examLink}" [L168]
      button type="button" [L168]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/features/student/pages/ResultsPage.jsx

```text
main className="portal-message" [L14]
  h1 [L14]
  p role="alert" [L15]
  p [L16]
  p [L17]
  p [L18]
  section className="result-card" [L19]
    h2 [L19]
    p [L19]
    h2 [L19]
    p [L19]
      strong [L19]
    button [L19]
  Link to="/" [L20]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/main.jsx

```text
StrictMode [L9]
  App [L10]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/shared/components/BlurLoader.jsx

```text
div className="blur-loader-overlay" [L4]
  div className="loader" [L5]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/shared/components/ExamLoader.jsx

```text
div className="loading-placeholder" [L5]
  div className="loading-animation" [L6]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

## src/shared/components/Modal.jsx

```text
div className="modal-overlay" [L7]
  div role="dialog" aria-label="{modal.title}" className="{`modal-container ${modal.type}`}" [L8]
    div className="modal-header" [L9]
      h3 [L10]
      button className="modal-close" [L12]
        FiX [L13]
    div className="modal-body" [L18]
      p [L19]
    div className="modal-footer" [L22]
        button className="modal-confirm" [L25]
          div className="button-spinner" [L31]
            div className="spinner" [L32]
            span [L33]
        button className="modal-cancel" [L40]
      button className="modal-ok" [L49]
```

No issues flagged by the limited structural heuristics; this is not a full accessibility pass.

