// import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://bthxueiuichudrfwdfxb.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0aHh1ZWl1aWNodWRyZndkZnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NDY1MTMsImV4cCI6MjA2MTEyMjUxM30.9gjBWuDmnYT-FU6213FJ5ggfbhuQfWvWzPccH1JKuIw";
const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
