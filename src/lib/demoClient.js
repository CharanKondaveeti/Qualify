// Explicit browser-only demo. No remote database requests are made here.
const KEY = "qualify-demo-v1";
export function resetDemoData() {
  localStorage.removeItem(KEY);
}
export function resetDemoStudentAttempt() {
  const db = read();

  const student = db.studentReport.find(
    (row) => row.student_report_id === "demo-student",
  );

  if (student) {
    student.student_status = "not started";
    student.answers = {};
    student.marks_scored = 0;

    delete student.started_at;
    delete student.deadline;

    localStorage.setItem(KEY, JSON.stringify(db));
  }

  sessionStorage.removeItem("qualify-draft-demo-student");
  sessionStorage.removeItem("qualify-session-demo-student");
}
const user = {
  id: "demo-admin",
  email: "demo@qualify.local",
  user_metadata: { full_name: "Demo administrator" },
};
export function seedDemo() {
  const exams = ["active", "upcoming", "completed"].map((status, i) => ({
    exam_id: `demo-${status}`,
    title: [
      "Computer Science Fundamentals",
      "Programming Foundations",
      "Web Development Essentials",
    ][i],
    course: "Computer Science",
    exam_status: status,
    scheduled_date: new Date(
      Date.now() + [0, 2, -2][i] * 86400000,
    ).toISOString(),
    duration_minutes: 30,
    total_marks: 30,
    pass_mark: 15,
    created_by: user.id,
    total_questions: 3,
  }));
  const questions = exams.flatMap((e) =>
    [
      {
        question_text: "Which data structure follows first in, first out?",
        options: ["Stack", "Queue", "Tree", "Graph"],
        correct_option: 1,
      },
      {
        question_text: "What does CPU stand for?",
        options: [
          "Central Processing Unit",
          "Computer Personal Unit",
          "Central Program Utility",
          "Control Processing User",
        ],
        correct_option: 0,
      },
      {
        question_text: "Which protocol is used for secure web browsing?",
        options: ["FTP", "SMTP", "HTTP", "HTTPS"],
        correct_option: 3,
      },
    ].map((q, i) => ({
      ...q,
      question_id: `${e.exam_id}-q${i}`,
      exam_id: e.exam_id,
      marks: 10,
    })),
  );
  return {
    exams,
    questions,
    studentReport: [
      {
        student_report_id: "demo-student",
        exam_id: "demo-active",
        student_name: "Alex Morgan",
        email: "alex@example.test",
        roll_no: "QF-001",
        student_status: "not started",
        marks_scored: 0,
        answers: {},
      },
      {
        student_report_id: "demo-result",
        exam_id: "demo-completed",
        student_name: "Priya Sharma",
        email: "priya@example.test",
        roll_no: "QF-002",
        student_status: "submitted",
        marks_scored: 20,
        answers: { "demo-completed-q0": 1, "demo-completed-q1": 0 },
      },
    ],
  };
}
function read() {
  const saved = localStorage.getItem(KEY);
  if (saved) return JSON.parse(saved);
  const data = seedDemo();
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}
const listeners = new Set();
export function createDemoClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({ data: { session: { user } }, error: null }),
      signInWithPassword: async () => ({ data: { user }, error: null }),
      signOut: async () => {
        window.location.assign("/");
        return { error: null };
      },
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
    },
    channel() {
      return {
        on(event, filter, callback) {
          this.filter = filter;
          this.callback = callback;
          return this;
        },
        subscribe() {
          listeners.add(this);
          return this;
        },
      };
    },
    removeChannel(channel) {
      listeners.delete(channel);
    },
    from(table) {
      let action = "select",
        values,
        single = false,
        orderKey;
      const filters = [];
      return {
        select() {
          return this;
        },
        eq(key, value) {
          filters.push((row) => String(row[key]) === String(value));
          return this;
        },
        or(expression) {
          const parts = expression.split(",").map((s) => s.split(".eq."));
          filters.push((row) =>
            parts.some(([key, val]) => String(row[key]) === val),
          );
          return this;
        },
        order(key) {
          orderKey = key;
          return this;
        },
        single() {
          single = true;
          return this;
        },
        insert(rows) {
          action = "insert";
          values = Array.isArray(rows) ? rows : [rows];
          return this;
        },
        update(data) {
          action = "update";
          values = data;
          return this;
        },
        delete() {
          action = "delete";
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              const db = read();
              if (!db[table])
                throw new Error(`Unsupported demo table: ${table}`);
              let rows = db[table].filter((row) =>
                filters.every((f) => f(row)),
              );
              if (action === "insert") {
                const id = {
                  exams: "exam_id",
                  questions: "question_id",
                  studentReport: "student_report_id",
                }[table];
                rows = values.map((row) => ({
                  ...(id ? { [id]: crypto.randomUUID() } : {}),
                  ...row,
                }));
                db[table].push(...rows);
              }
              if (action === "update")
                rows.forEach((row) => Object.assign(row, values));
              if (action === "delete") {
                db[table] = db[table].filter((row) => !rows.includes(row));
                if (table === "exams")
                  for (const child of ["questions", "studentReport"])
                    db[child] = db[child].filter(
                      (row) => !rows.some((e) => e.exam_id === row.exam_id),
                    );
              }
              if (action !== "select") {
                localStorage.setItem(KEY, JSON.stringify(db));
                rows.forEach((row) =>
                  listeners.forEach((channel) => {
                    const filter = channel.filter;
                    if (filter.table !== table) return;
                    if (filter.filter) {
                      const [key, val] = filter.filter.split("=eq.");
                      if (String(row[key]) !== val) return;
                    }
                    channel.callback({
                      new: row,
                      eventType: action.toUpperCase(),
                    });
                  }),
                );
              }
              if (orderKey)
                rows.sort((a, b) =>
                  String(a[orderKey]).localeCompare(String(b[orderKey])),
                );
              return {
                data: single ? (rows[0] ?? null) : structuredClone(rows),
                error:
                  single && !rows.length
                    ? { message: "Record not found" }
                    : null,
              };
            })
            .then(resolve, reject);
        },
      };
    },
  };
}
