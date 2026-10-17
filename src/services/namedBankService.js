import supabase, { isDemo } from "../lib/supabase";

function requireLiveInstitution(institutionId) {
  if (isDemo) {
    throw new Error("Question banks require real Supabase. Exit demo mode.");
  }

  if (!institutionId) {
    throw new Error("Select an institution first.");
  }
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export async function listNamedBanks(institutionId) {
  requireLiveInstitution(institutionId);

  return (
    unwrap(
      await supabase
        .from("qualify_named_banks")
        .select(
          "id,institution_id,owner_id,name,course,topic,visibility,created_at",
        )
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false }),
    ) || []
  );
}

export async function listBankQuestions(bankId) {
  if (!bankId) return [];

  const all = [];

  // Fetch in pages so Supabase's default row limit
  // never silently truncates a large question bank.
  for (let start = 0; ; start += 500) {
    const page =
      unwrap(
        await supabase
          .from("qualify_question_bank")
          .select(
            "id,bank_id,institution_id,owner_id,course,topic,difficulty,question_text,options,correct_option,marks,visibility",
          )
          .eq("bank_id", bankId)
          .order("id", { ascending: true })
          .range(start, start + 499),
      ) || [];

    all.push(...page);

    if (page.length < 500) return all;
  }
}

async function signedInUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw new Error("Please sign in again.");
  }

  return data.user;
}

export async function createNamedBank(institutionId, fields) {
  requireLiveInstitution(institutionId);

  const user = await signedInUser();
  const name = fields.name?.trim();

  if (!name || name.length > 120) {
    throw new Error("Enter a bank name (1–120 characters).");
  }

  return unwrap(
    await supabase
      .from("qualify_named_banks")
      .insert({
        institution_id: institutionId,
        owner_id: user.id,
        name,
        course: fields.course?.trim() || "",
        topic: fields.topic?.trim() || "",
        visibility:
          fields.visibility === "institution" ? "institution" : "private",
      })
      .select(
        "id,institution_id,owner_id,name,course,topic,visibility,created_at",
      )
      .single(),
  );
}

export async function updateNamedBank(bankId, fields) {
  const name = fields.name?.trim();

  if (!name || name.length > 120) {
    throw new Error("Enter a valid bank name.");
  }

  return unwrap(
    await supabase
      .from("qualify_named_banks")
      .update({
        name,
        course: fields.course?.trim() || "",
        topic: fields.topic?.trim() || "",
        visibility:
          fields.visibility === "institution" ? "institution" : "private",
      })
      .eq("id", bankId)
      .select("id")
      .single(),
  );
}

export async function deleteNamedBank(bankId) {
  // The database deletes reusable questions in this bank
  // atomically. Existing exam copies are unaffected.
  return unwrap(
    await supabase
      .from("qualify_named_banks")
      .delete()
      .eq("id", bankId)
      .select("id")
      .single(),
  );
}

function questionPayload(question, bank, ownerId, difficulty = "medium") {
  const text = String(question.question_text ?? "").trim();

  const options = Array.isArray(question.options)
    ? question.options.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const correct = Number(question.correct_option);
  const marks = Number(question.marks);

  if (
    !text ||
    options.length < 2 ||
    options.length > 6 ||
    !Number.isInteger(correct) ||
    correct < 0 ||
    correct >= options.length ||
    !Number.isSafeInteger(marks) ||
    marks < 1
  ) {
    throw new Error(
      "Enter a question, 2–6 valid options, a correct answer, and whole-number marks.",
    );
  }

  return {
    bank_id: bank.id,
    institution_id: bank.institution_id,
    owner_id: ownerId,
    visibility: bank.visibility,
    course: question.course ?? bank.course ?? "",
    topic: question.topic ?? bank.topic ?? "",
    difficulty: question.difficulty || difficulty,
    question_text: text,
    options,
    correct_option: correct,
    marks,
  };
}

export async function addBankQuestion(bank, question, difficulty) {
  const user = await signedInUser();

  const payload = questionPayload(question, bank, user.id, difficulty);

  return unwrap(await supabase.from("qualify_question_bank").insert(payload));
}

export async function updateBankQuestion(bank, question) {
  const payload = questionPayload(question, bank, bank.owner_id);

  const { question_text, options, correct_option, marks, difficulty } = payload;

  return unwrap(
    await supabase
      .from("qualify_question_bank")
      .update({
        question_text,
        options,
        correct_option,
        marks,
        difficulty,
      })
      .eq("bank_id", bank.id)
      .eq("id", question.id)
      .select("id")
      .single(),
  );
}

export async function deleteBankQuestion(bankId, questionId) {
  return unwrap(
    await supabase
      .from("qualify_question_bank")
      .delete()
      .eq("bank_id", bankId)
      .eq("id", questionId)
      .select("id")
      .single(),
  );
}

export async function importBankQuestions(bank, questions) {
  if (!questions.length) {
    throw new Error("The CSV contains no valid questions.");
  }

  const user = await signedInUser();

  const payload = questions.map((question) =>
    questionPayload(question, bank, user.id),
  );

  // Single database insert request, so validation happens
  // before writing any question rows.
  unwrap(await supabase.from("qualify_question_bank").insert(payload));

  return payload.length;
}
