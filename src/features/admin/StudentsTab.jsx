import React, { useState, useEffect } from "react";
import {
  FiSearch,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiX,
  FiCheck,
  FiUser,
  FiMail,
  FiBook,
  FiHash,
} from "react-icons/fi";
import "./css/StudentsTab.css";

const StudentsTab = () => {
  // Sample student data
  const [students, setStudents] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      rollNumber: "CS2021001",
      branch: "Computer Science",
      section: "A",
      course: "B.Tech",
      status: "active",
      joinedDate: "2021-08-15",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      rollNumber: "EC2021002",
      branch: "Electronics",
      section: "B",
      course: "B.Tech",
      status: "active",
      joinedDate: "2021-08-16",
    },
    // Add more sample data as needed
  ]);

  // State for UI controls
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    branch: "",
    section: "",
    status: "",
    course: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    rollNumber: "",
    branch: "",
    section: "",
    course: "",
    status: "active",
  });
  const [errors, setErrors] = useState({});

  // Constants for dropdowns
  const branches = [
    "Computer Science",
    "Electronics",
    "Mechanical",
    "Electrical",
    "Civil",
  ];
  const sections = ["A", "B", "C", "D"];
  const courses = ["B.Tech", "M.Tech", "PhD", "MCA", "MBA"];
  const statuses = ["active", "inactive"];

  // Pagination
  const studentsPerPage = 10;
  const totalPages = Math.ceil(students.length / studentsPerPage);

  // Filter and search students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilters =
      (filters.branch === "" || student.branch === filters.branch) &&
      (filters.section === "" || student.section === filters.section) &&
      (filters.course === "" || student.course === filters.course) &&
      (filters.status === "" || student.status === filters.status);

    return matchesSearch && matchesFilters;
  });

  // Get current students for pagination
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(
    indexOfFirstStudent,
    indexOfLastStudent
  );

  // Handle page change
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewStudent({ ...newStudent, [name]: value });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!newStudent.name.trim()) newErrors.name = "Name is required";
    if (!newStudent.email.trim()) newErrors.email = "Email is required";
    if (!newStudent.rollNumber.trim())
      newErrors.rollNumber = "Roll number is required";
    if (!newStudent.branch) newErrors.branch = "Branch is required";
    if (!newStudent.section) newErrors.section = "Section is required";
    if (!newStudent.course) newErrors.course = "Course is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add new student
  const handleAddStudent = () => {
    if (!validateForm()) return;

    const student = {
      id: students.length + 1,
      ...newStudent,
      joinedDate: new Date().toISOString().split("T")[0],
    };

    setStudents([...students, student]);
    setShowAddModal(false);
    setNewStudent({
      name: "",
      email: "",
      rollNumber: "",
      branch: "",
      section: "",
      course: "",
      status: "active",
    });
  };

  // Update student
  const handleUpdateStudent = () => {
    if (!validateForm()) return;

    setStudents(
      students.map((student) =>
        student.id === selectedStudent.id ? { ...selectedStudent } : student
      )
    );
    setSelectedStudent(null);
  };

  // Delete student
  const handleDeleteStudent = () => {
    setStudents(
      students.filter((student) => student.id !== selectedStudent.id)
    );
    setShowDeleteModal(false);
  };

  // Toggle student status
  const toggleStatus = (id) => {
    setStudents(
      students.map((student) =>
        student.id === id
          ? {
              ...student,
              status: student.status === "active" ? "inactive" : "active",
            }
          : student
      )
    );
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      branch: "",
      section: "",
      status: "",
      course: "",
    });
  };

  return (
    <div className="students-tab">
      <div className="students-header">
        <h2>
          <FiUser className="header-icon" />
          Student Management
        </h2>
        <button
          className="add-student-btn"
          onClick={() => setShowAddModal(true)}
        >
          <FiUserPlus />
          Add New Student
        </button>
      </div>

      {/* Search and Filter */}
      <div className="students-controls">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Branch</label>
            <select
              value={filters.branch}
              onChange={(e) =>
                setFilters({ ...filters, branch: e.target.value })
              }
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Section</label>
            <select
              value={filters.section}
              onChange={(e) =>
                setFilters({ ...filters, section: e.target.value })
              }
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Course</label>
            <select
              value={filters.course}
              onChange={(e) =>
                setFilters({ ...filters, course: e.target.value })
              }
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button className="reset-filters" onClick={resetFilters}>
            <FiX /> Reset
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="students-table-container">
        <table className="students-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roll No.</th>
              <th>Branch</th>
              <th>Section</th>
              <th>Course</th>
              <th>Joined Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentStudents.length > 0 ? (
              currentStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.rollNumber}</td>
                  <td>{student.branch}</td>
                  <td>{student.section}</td>
                  <td>{student.course}</td>
                  <td>{new Date(student.joinedDate).toLocaleDateString()}</td>
                  <td>
                    <div
                      className={`status-toggle ${student.status}`}
                      onClick={() => toggleStatus(student.id)}
                    >
                      <div className="toggle-circle"></div>
                      <span>
                        {student.status.charAt(0).toUpperCase() +
                          student.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowDeleteModal(true);
                      }}
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="no-results">
                <td colSpan="9">No students found matching your criteria</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredStudents.length > studentsPerPage && (
        <div className="pagination">
          <button
            onClick={() => paginate(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <FiChevronLeft />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
            <button
              key={number}
              onClick={() => paginate(number)}
              className={currentPage === number ? "active" : ""}
            >
              {number}
            </button>
          ))}

          <button
            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <FiChevronRight />
          </button>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Student</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={newStudent.name}
                  onChange={handleInputChange}
                  className={errors.name ? "error" : ""}
                />
                {errors.name && (
                  <span className="error-message">{errors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={newStudent.email}
                  onChange={handleInputChange}
                  className={errors.email ? "error" : ""}
                />
                {errors.email && (
                  <span className="error-message">{errors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label>Roll Number *</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={newStudent.rollNumber}
                  onChange={handleInputChange}
                  className={errors.rollNumber ? "error" : ""}
                />
                {errors.rollNumber && (
                  <span className="error-message">{errors.rollNumber}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Branch *</label>
                  <select
                    name="branch"
                    value={newStudent.branch}
                    onChange={handleInputChange}
                    className={errors.branch ? "error" : ""}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                  {errors.branch && (
                    <span className="error-message">{errors.branch}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Section *</label>
                  <select
                    name="section"
                    value={newStudent.section}
                    onChange={handleInputChange}
                    className={errors.section ? "error" : ""}
                  >
                    <option value="">Select Section</option>
                    {sections.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                  {errors.section && (
                    <span className="error-message">{errors.section}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Course *</label>
                  <select
                    name="course"
                    value={newStudent.course}
                    onChange={handleInputChange}
                    className={errors.course ? "error" : ""}
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                  {errors.course && (
                    <span className="error-message">{errors.course}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={newStudent.status}
                    onChange={handleInputChange}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button className="save-btn" onClick={handleAddStudent}>
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {selectedStudent && !showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Student</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedStudent(null)}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={selectedStudent.name}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={selectedStudent.email}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Roll Number *</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={selectedStudent.rollNumber}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      rollNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Branch *</label>
                  <select
                    name="branch"
                    value={selectedStudent.branch}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        branch: e.target.value,
                      })
                    }
                  >
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Section *</label>
                  <select
                    name="section"
                    value={selectedStudent.section}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        section: e.target.value,
                      })
                    }
                  >
                    {sections.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Course *</label>
                  <select
                    name="course"
                    value={selectedStudent.course}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        course: e.target.value,
                      })
                    }
                  >
                    {courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={selectedStudent.status}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        status: e.target.value,
                      })
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setSelectedStudent(null)}
              >
                Cancel
              </button>
              <button className="save-btn" onClick={handleUpdateStudent}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to delete student{" "}
                <strong>{selectedStudent?.name}</strong>?
              </p>
              <p>This action cannot be undone.</p>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="delete-confirm-btn"
                onClick={handleDeleteStudent}
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsTab;
