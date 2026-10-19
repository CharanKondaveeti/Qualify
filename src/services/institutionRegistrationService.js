// A verified applicant has a backend-managed session, not a Supabase Auth user.
import supabase from "../lib/supabase";
const KEY = "qualify-institution-applicant-session";
export function applicantSession() {
  try {return JSON.parse(sessionStorage.getItem(KEY)||"null");} catch {return null;}
}
export function saveApplicantSession(email,token){
  sessionStorage.setItem(KEY,JSON.stringify({email,token}));
}
export function clearApplicantSession(){sessionStorage.removeItem(KEY);}
export async function registrationAction(action,args={}){
  const token=applicantSession()?.token||"";
  const {data,error}=await supabase.functions.invoke("qualify-institution-registration",{
    body:{action,...args},headers:token?{"x-applicant-session":token}:{}
  });
  if (error) {
    const payload = await error.context?.json?.().catch(() => null);
    throw new Error(payload?.error || error.message || "Registration service unavailable");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export const requestRegistrationOtp = email => registrationAction("request_otp",{email});
export const verifyRegistrationOtp = async (challengeId,code) => {
  const data=await registrationAction("verify_otp",{challengeId,code});
  if(!data?.sessionToken)throw Error("Email verification failed");
  saveApplicantSession(data.email,data.sessionToken);
  return data;
};
export const getRegistrationStatus=()=>registrationAction("status");
export const submitRegistration=form=>registrationAction("submit",{form});
export const resubmitRegistration=form=>registrationAction("resubmit",{form});
export const deleteRegistration=()=>registrationAction("delete");
export const decideRegistration=(applicationId,approve,notes="")=>
  registrationAction(approve?"approve":"reject",{applicationId,notes});
export const resendRegistrationActivation=applicationId=>
  registrationAction("resend_activation",{applicationId});
export const activateRegistration=(token,password)=>
  registrationAction("activate",{token,password});
