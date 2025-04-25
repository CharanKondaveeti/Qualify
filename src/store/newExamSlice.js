import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  newExam: {
    name: "",
    course: "",
    date: "",
    time: "",
    duration: 60,
  },
};

const newExamSlice = createSlice({
  name: "exam",
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
    resetExam: (state) => {
      state.newExam = initialState.newExam;
      state.questions = [];
    },
  },
});

export const { setExamDetails, setQuestions, addQuestion, removeQuestion, resetExam } =
  newExamSlice.actions;

export default newExamSlice.reducer;
