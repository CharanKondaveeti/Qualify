import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();

  const { data: exams, error } = await supabase
    .from("exams")
    .select("exam_id, scheduled_date, duration_minutes, status");

  if (error || !exams) {
    console.error("Error fetching exams:", error?.message);
    return new Response("Error fetching exams", { status: 500 });
  }

  const updates = exams.map(async (exam) => {
    const { scheduled_date, duration_minutes, status, exam_id } = exam;

    if (!scheduled_date || !duration_minutes) {
      console.warn(`Skipping exam ${exam_id}: missing date or duration`);
      return;
    }

    const start = new Date(scheduled_date);
    const end = new Date(start.getTime() + duration_minutes * 60000);

    let newStatus = status;

    if (now < start) {
      newStatus = "upcoming";
    } else if (now >= start && now < end) {
      newStatus = "active";
    } else if (now >= end) {
      newStatus = "completed";
    }

    if (newStatus !== status) {
      const { error: updateError } = await supabase
        .from("exams")
        .update({ status: newStatus })
        .eq("exam_id", exam_id);

      if (updateError) {
        console.error(`Failed to update exam ${exam_id}:`, updateError.message);
      } else {
        console.log(`Updated exam ${exam_id} to status: ${newStatus}`);
      }
    }
  });

  await Promise.all(updates);

  return new Response(
    JSON.stringify({ success: true, updated: exams.length }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
