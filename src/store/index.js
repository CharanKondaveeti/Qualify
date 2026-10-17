import { configureStore } from "@reduxjs/toolkit";
import newExamReducer from "./newExamSlice";

export const store = configureStore({
  reducer: {
    newExam: newExamReducer,
  },
});
