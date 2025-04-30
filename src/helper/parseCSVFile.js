import Papa from "papaparse";

export const parseCSVFile = (file, onSuccess, onError, setLoading) => {
  setLoading(true);

  Papa.parse(file, {
    header: true,
    complete: (results) => {
      const parsed = results.data
        .filter((q) => q.question)
        .map((q, i) => ({
          question_id: Date.now() + i,
          question_text: q.question || "",
          options: [q.option1, q.option2, q.option3, q.option4].filter(Boolean),
          correct_option: parseInt(q.correctAnswer) || 0,
          marks: parseInt(q.marks) || 1,
        }))
        .filter((q) => q.options.length > 0);

      onSuccess(parsed);
      setLoading(false);
    },
    error: () => {
      onError();
      setLoading(false);
    },
  });
};
