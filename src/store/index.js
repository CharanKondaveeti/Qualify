import { configureStore } from "@reduxjs/toolkit";
import newExamReducer from "../store/newExamSlice";
import questionReducer from "../store/questionSlice";
import allExamsReducer from "./AllExamsSlice";

export const store = configureStore({
  reducer: {
    newExam: newExamReducer,
    questions: questionReducer,
    exams: allExamsReducer,
  },
});
