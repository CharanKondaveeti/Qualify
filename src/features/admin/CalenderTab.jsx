import React, { useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiClock,
  FiBook,
} from "react-icons/fi";
import "./css/calenderTab.css";

const CalendarTab = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedExam, setSelectedExam] = useState(null);

  // ✅ Sample exam data (replace this with Supabase later)
  const exams = [
    {
      id: 1,
      name: "Math Final",
      course: "Mathematics",
      date: "2025-04-25T10:00:00Z",
      duration: "2 hours",
      status: "upcoming",
    },
    {
      id: 2,
      name: "Physics Midterm",
      course: "Physics",
      date: "2025-04-26T14:00:00Z",
      duration: "1.5 hours",
      status: "upcoming",
    },
    {
      id: 3,
      name: "Chemistry Quiz",
      course: "Chemistry",
      date: "2025-04-21T09:30:00Z",
      duration: "45 mins",
      status: "completed",
    },
  ];

  const getExamsForMonth = () => {
    if (!exams || !Array.isArray(exams)) return [];
    return exams.filter((exam) => {
      const examDate = new Date(exam.date);
      return (
        examDate.getMonth() === currentDate.getMonth() &&
        examDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const monthExams = getExamsForMonth();

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const calendarDays = [];

    // Previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      calendarDays.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i),
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const examOnDay = monthExams.find((exam) => {
        const examDate = new Date(exam.date);
        return examDate.getDate() === i;
      });

      calendarDays.push({
        day: i,
        isCurrentMonth: true,
        date,
        hasExam: !!examOnDay,
        exam: examOnDay,
      });
    }

    // Next month
    const daysToAdd = 42 - calendarDays.length;
    for (let i = 1; i <= daysToAdd; i++) {
      calendarDays.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return calendarDays;
  };

  const calendarDays = renderCalendar();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const changeMonth = (offset) => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="calendar-tab">
      <div className="calendar-header">
        <h2>
          <FiCalendar className="header-icon" />
          Exam Calendar
        </h2>

        <div className="month-navigation">
          <button onClick={() => changeMonth(-1)}>
            <FiChevronLeft />
          </button>

          <h3>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>

          <button onClick={() => changeMonth(1)}>
            <FiChevronRight />
          </button>

          <button className="today-btn" onClick={goToToday}>
            Today
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {dayNames.map((day) => (
          <div key={day} className="day-header">
            {day}
          </div>
        ))}

        {calendarDays.map((dayObj, index) => (
          <div
            key={index}
            className={`calendar-day ${
              dayObj.isCurrentMonth ? "" : "other-month"
            } ${
              dayObj.date.toDateString() === new Date().toDateString()
                ? "today"
                : ""
            }`}
            onClick={() => dayObj.hasExam && setSelectedExam(dayObj.exam)}
          >
            <div className="day-number">{dayObj.day}</div>
            {dayObj.hasExam && (
              <div className="exam-marker">
                <div className="exam-dot"></div>
                <div className="exam-title">{dayObj.exam.name}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedExam && (
        <div
          className="exam-popup-overlay"
          onClick={() => setSelectedExam(null)}
        >
          <div className="exam-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-popup"
              onClick={() => setSelectedExam(null)}
            >
              ×
            </button>

            <h3>{selectedExam.name}</h3>

            <div className="exam-detail">
              <FiBook className="detail-icon" />
              <span>{selectedExam.course}</span>
            </div>

            <div className="exam-detail">
              <FiCalendar className="detail-icon" />
              <span>
                {new Date(selectedExam.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="exam-detail">
              <FiClock className="detail-icon" />
              <span>{selectedExam.duration}</span>
            </div>

            <div className="exam-status">
              Status:{" "}
              <span className={`status-${selectedExam.status}`}>
                {selectedExam.status.charAt(0).toUpperCase() +
                  selectedExam.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTab;
