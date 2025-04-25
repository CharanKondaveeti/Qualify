// store/examSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  form: {
    name: "",
    course: "",
    date: "",
    time: "",
    duration: 60,
  },
};

const examSlice = createSlice({
  name: "exam",
  initialState,
  reducers: {
    updateForm: (state, action) => {
      state.form = { ...state.form, ...action.payload };
    },
    resetForm: () => initialState,
  },
});

export const { updateForm, resetForm } = examSlice.actions;
export default examSlice.reducer;
