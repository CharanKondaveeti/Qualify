import { configureStore } from "@reduxjs/toolkit";
import newExamReducer from "./newExamSlice";
// import allExamsReducer from "./AllExamsSlice";

export const store = configureStore({
  reducer: {
    newExam: newExamReducer,
    // exams: allExamsReducer,
  },
});
