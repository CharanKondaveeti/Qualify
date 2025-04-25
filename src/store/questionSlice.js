import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  questions: [],
};

const questionSlice = createSlice({
  name: "question",
  initialState,
  reducers: {
    setQuestionsR: (state, action) => {
      state.questions = action.payload;
    },
    addQuestionR: (state, action) => {
      state.questions.push(action.payload);
    },
    removeQuestion: (state, action) => {
      state.questions = state.questions.filter(
        (question) => question.question_id !== action.payload
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
  },
});

export const { setQuestionsR, addQuestionR, removeQuestion, updateQuestion } =
  questionSlice.actions;
export default questionSlice.reducer;
