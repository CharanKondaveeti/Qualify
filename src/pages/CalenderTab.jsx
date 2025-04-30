import React, { useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiClock,
  FiBook,
  FiX,
} from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import { getExams } from "../services/exam";
import "./css/calenderTab.css";

const CalendarTab = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedExams, setSelectedExams] = useState([]);

  const {
    data: exams = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["exams"],
    queryFn: getExams,
  });

  if (isLoading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading exams...</p>
      </div>
    );

  if (isError)
    return (
      <div className="error-container">
        <p>Error loading exams: {error.message}</p>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );

  const getExamsForMonth = () => {
    return exams.filter((exam) => {
      const examDate = new Date(exam.scheduled_date);
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
      const examsOnDate = monthExams.filter((exam) => {
        const examDate = new Date(exam.scheduled_date);
        return (
          examDate.getDate() === i &&
          examDate.getMonth() === month &&
          examDate.getFullYear() === year
        );
      });

      calendarDays.push({
        day: i,
        isCurrentMonth: true,
        date,
        hasExam: examsOnDate.length > 0,
        exams: examsOnDate,
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
        <div className="header-content">
          <div className="header-title">
            <FiCalendar className="header-icon" />
            <h2>Exam Calendar</h2>
          </div>

          <div className="month-navigation">
            <button
              className="nav-btn"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              <FiChevronLeft />
            </button>

            <h3 className="current-month">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>

            <button
              className="nav-btn"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              <FiChevronRight />
            </button>

            <button className="today-btn" onClick={goToToday}>
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-grid-container">
        <div className="day-names">
          {dayNames.map((day) => (
            <div key={day} className="day-name">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((dayObj, index) => (
            <div
              key={index}
              className={`calendar-day ${
                dayObj.isCurrentMonth ? "" : "other-month"
              } ${
                dayObj.date.toDateString() === new Date().toDateString()
                  ? "today"
                  : ""
              } ${dayObj.hasExam ? "has-exam" : ""}`}
              onClick={() => dayObj.hasExam && setSelectedExams(dayObj.exams)}
            >
              <div className="day-number">{dayObj.day}</div>
              {dayObj.hasExam && (
                <div className="exam-marker">
                  <div className="exam-dot"></div>
                  {dayObj.exams.length === 1 ? (
                    <div className="exam-title">{dayObj.exams[0].title}</div>
                  ) : (
                    <div className="exam-count">
                      {dayObj.exams.length} exams
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedExams.length > 0 && (
        <div
          className="exam-popup-overlay"
          onClick={() => setSelectedExams([])}
        >
          <div
            className="exam-popup compact"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-popup"
              onClick={() => setSelectedExams([])}
            >
              ×
            </button>
            <h3 className="popup-date">
              {new Date(selectedExams[0].scheduled_date).toLocaleDateString(
                "en-US",
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }
              )}
            </h3>

            <div className="compact-exam-list">
              {selectedExams.map((exam) => (
                <div key={exam.exam_id} className="compact-exam-card">
                  <div className="exam-time">
                    {new Date(exam.scheduled_date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="exam-main">
                    <div className="exam-title">{exam.title}</div>
                    <div className="exam-course">{exam.course}</div>
                  </div>
                  <div className={`exam-status status-${exam.exam_status}`}>
                    {exam.exam_status.charAt(0).toUpperCase() +
                      exam.exam_status.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTab;
