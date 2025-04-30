import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  newExam: {
    name: "",
    course: "",
    date: "",
    time: "",
    duration: "",
    totalMarks: "",
  },
  questions: [],
};

const newExamSlice = createSlice({
  name: "newExam",
  initialState,
  reducers: {
    setExamDetails: (state, action) => {
      state.newExam = { ...state.newExam, ...action.payload };
    },
    setQuestions: (state, action) => {
      state.questions = action.payload;
    },
    addQuestion: (state, action) => {
      state.questions.push(action.payload);
    },
    removeQuestion: (state, action) => {
      state.questions = state.questions.filter(
        (q) => q.question_id !== action.payload
      );
    },
    updateQuestion: (state, action) => {
      const { question_id, updatedQuestion } = action.payload;
      const index = state.questions.findIndex(
        (question) => question.question_id === question_id
      );
      if (index !== -1) {
        state.questions[index] = {
          ...state.questions[index],
          ...updatedQuestion,
        };
      }
    },
    resetExam: (state) => {
      state.newExam = {
        name: "",
        course: "",
        date: "",
        time: "",
        duration: "",
        totalMarks: "",
      };
      state.questions = [];
    },
  },
});

export const {
  setExamDetails,
  setQuestions,
  addQuestion,
  removeQuestion,
  updateQuestion,
  resetExam,
} = newExamSlice.actions;

export default newExamSlice.reducer;
