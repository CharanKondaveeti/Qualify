// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import {
//   createExamInSupabase,
//   createQuestionsInSupabase,
// } from "../services/admin";

// export const createExam = createAsyncThunk(
//   "exam/createExam",
//   async (examData) => {
//     const { data } = await createExamInSupabase(examData);
//     return data[0];
//   }
// );

// export const createQuestions = createAsyncThunk(
//   "exam/createQuestions",
//   async ({ examId, questions }) => {
//     const questionsWithExam = questions.map((q) => ({
//       ...q,
//       exam_id: examId,
//     }));
//     await createQuestionsInSupabase(questionsWithExam);
//     return questionsWithExam;
//   }
// );

// const examSlice = createSlice({
//   name: "exam",
//   initialState: {
//     examDetails: {
//       title: "Demo Exam",
//       duration: 60,
//     },
//     questions: [],
//   },
//   reducers: {
//     setQuestions: (state, action) => {
//       state.questions = action.payload;
//     },
//     addQuestion: (state, action) => {
//       state.questions.push(action.payload);
//     },
//   },
//   extraReducers: (builder) => {
//     builder.addCase(createExam.fulfilled, (state, action) => {
//       state.examDetails = action.payload;
//     });
//   },
// });

// export const { setQuestions, addQuestion } = examSlice.actions;
// export default examSlice.reducer;
