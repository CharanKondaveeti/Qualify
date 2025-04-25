import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getExams as fetchExamsFromAPI,
  deleteExam as deleteExamAPI,
} from "../services/admin";

export const fetchExams = createAsyncThunk("exams/fetchExams", async () => {
  const data = await fetchExamsFromAPI();
  return data;
});

export const deleteExam = createAsyncThunk(
  "exams/deleteExam",
  async (id, { dispatch }) => {
    await deleteExamAPI(id);
    dispatch(fetchExams());
  }
);

const examsSlice = createSlice({
  name: "exams",
  initialState: {
    exams: [],
    loading: false,
    error: null,
    searchQuery: "",
    activeFilter: "all",
  },
  reducers: {
    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
    },
    setActiveFilter(state, action) {
      state.activeFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExams.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.exams = action.payload;
        state.loading = false;
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { setSearchQuery, setActiveFilter } = examsSlice.actions;
export default examsSlice.reducer;
