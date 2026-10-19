import { createClient } from "npm:@supabase/supabase-js@2.57.0";
// Service secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
// QUALIFY_OTP_HMAC_SECRET (32+ random chars), QUALIFY_EMAIL_FROM, QUALIFY_SITE_ORIGIN.
// Only the exact production app origins may invoke this function from a browser.
// Browsers distinguish www.qualifyexam.online from qualifyexam.online.
// Keep the JWT and institution-level authorization checks below.
const allowedOrigins=new Set(["https://qualifyexam.online","https://www.qualifyexam.online"]);
// For failed/non-browser origins, no Access-Control-Allow-Origin is returned.
const corsHeaders=(requestOrigin)=>{
 const allowed=allowedOrigins.has(requestOrigin);
 return {
  ...(allowed?{"Access-Control-Allow-Origin":requestOrigin,"Vary":"Origin"}:{}),
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Cache-Control":"no-store"
 };
};
const emailOK=(v)=>v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const otp=()=>{const n=new Uint32Array(1);crypto.getRandomValues(n);return String(n[0]%1000000).padStart(6,"0")};
const tempPass=()=>{const a="abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";return Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>a[v%a.length]).join("")};
const safe=(v)=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function digest(value){
 const secret=Deno.env.get("QUALIFY_OTP_HMAC_SECRET");
 if(!secret||secret.length<32)throw Error("OTP service configuration missing");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const result=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value));
 return Array.from(new Uint8Array(result),n=>n.toString(16).padStart(2,"0")).join("");
}
async function mail(to,subject,html){
 const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("QUALIFY_EMAIL_FROM");
 if(!key||!from)throw Error("Email provider not configured");
 const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({from,to,subject,html})});
 if(!r.ok)throw Error("Email provider rejected delivery request ("+r.status+")");
}
Deno.serve(async(req)=>{
 const hdr=corsHeaders(req.headers.get("origin")||"");
 const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...hdr,"content-type":"application/json"}});
 const bad=(message,status=400)=>respond({error:message},status);
 if(req.method==="OPTIONS")return new Response(null,{headers:hdr});
 if(req.method!=="POST")return bad("Method not allowed",405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return bad("Onboarding service is not configured",503);
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!jwt)return bad("Login required",401);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:whoError}=await db.auth.getUser(jwt);
 if(whoError||!user||!user.email_confirmed_at)return bad("Verified login required",401);
 let args;
 try{args=await req.json()}catch{return bad("Invalid request")}
 if(!args||typeof args!=="object")return bad("Invalid request");
 try{
  if(args.action==="complete_password"){
   const pwd=String(args.password||"");
   if(pwd.length<12||pwd.length>128||!/[a-z]/.test(pwd)||!/[A-Z]/.test(pwd)||!/[0-9]/.test(pwd)||!/\W/.test(pwd))
    return bad("Use 12+ characters containing uppercase, lowercase, number and symbol");
   const {data:flag}=await db.from("qualify_staff_first_login").select("institution_id,invited_email,invite_id,completed_at").eq("user_id",user.id).maybeSingle();
   if(!flag||flag.completed_at||flag.invited_email.toLowerCase()!==user.email.toLowerCase())return bad("No pending first-login setup",403);
   const {error:pwError}=await db.auth.admin.updateUserById(user.id,{password:pwd});
   if(pwError)throw Error("Unable to change password");
   const {error:activateError}=await db.rpc("qualify_staff_activate",{p_invite:flag.invite_id,p_user:user.id,p_mode:"first_password_changed"});
   if(activateError)throw Error("Password changed. Staff activation needs administrator support.");
   return respond({success:true});
  }
  if(!["request","verify","list","cancel","remove"].includes(args.action))return bad("Invalid action");
  const institutionId=String(args.institutionId||"");
  if(!/^[0-9a-f-]{36}$/.test(institutionId))return bad("Invalid institution");
  const {data:member}=await db.from("institution_members").select("role").eq("institution_id",institutionId).eq("user_id",user.id).eq("role","institution_super_admin").eq("status","active").maybeSingle();
  const {data:institution}=await db.from("institutions").select("name,status").eq("id",institutionId).maybeSingle();
  if(!member||institution?.status!=="active")return bad("Only the institution Super Admin can manage staff OTPs",403);
  if(args.action==="list"){
   const {data,error}=await db.from("qualify_staff_otp_invites").select("id,staff_name,invited_email,status,created_at,expires_at,verified_at").eq("institution_id",institutionId).order("created_at",{ascending:false}).limit(50);
   if(error)throw error;
   const {data:removals,error:removalError}=await db.from("qualify_staff_removal_jobs")
     .select("user_id,email,created_at").eq("institution_id",institutionId).order("created_at",{ascending:false});
   if(removalError)throw removalError;
   return respond({items:data||[],removals:removals||[]});
  }
  if(args.action==="remove"){
   const staffId=String(args.staffId||"");
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffId))
     return bad("Choose a valid Staff Admin account");
   if(staffId===user.id)return bad("You cannot remove your own account",403);
   const anon=Deno.env.get("SUPABASE_ANON_KEY")||req.headers.get("apikey")||"";
   if(!anon)return bad("Staff removal service not configured",503);
   const scoped=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},
     global:{headers:{Authorization:"Bearer "+jwt}}});
   // Server-side transaction: membership, owned banks and personal onboarding records.
   // Preserves institutional exams/results and reassigns required authorship FKs.
   const {error:prepareError}=await scoped.rpc("qualify_prepare_staff_removal",{
     p_institution:institutionId,p_staff:staffId
   });
   if(prepareError)return bad(prepareError.message,403);
   // The account is now denied institution access even if Auth deletion fails.
   const {data:oldAccount,error:lookupError}=await db.auth.admin.getUserById(staffId);
   if(lookupError&&!/not found/i.test(lookupError.message))
     return bad("Staff access removed, but Auth cleanup needs retry. Use Retry removal.",503);
   if(oldAccount?.user){
     const {error:deleteError}=await db.auth.admin.deleteUser(staffId);
     if(deleteError)return bad("Staff access removed, but Auth account cleanup needs retry. Use Retry removal.",503);
   }
   const {error:finalizeError}=await scoped.rpc("qualify_finalize_staff_removal",{
     p_institution:institutionId,p_staff:staffId
   });
   if(finalizeError)return bad("Auth account removed, but cleanup confirmation needs retry. Use Retry removal.",503);
   return respond({success:true,message:"Staff access, personal data and Auth account permanently removed. Institution exam records are preserved."});
  }
  if(args.action==="cancel"){
   const inviteId=String(args.inviteId||"");
   if(!/^[0-9a-f-]{36}$/.test(inviteId))return bad("Invalid invitation");
   // Atomic conditional update: a verified or provisioned invitation cannot be cancelled.
   const {data:cancelled,error:cancelError}=await db.from("qualify_staff_otp_invites")
     .update({status:"cancelled",cancelled_at:new Date().toISOString(),cancelled_by:user.id,updated_at:new Date().toISOString()})
     .eq("id",inviteId).eq("institution_id",institutionId).eq("status","pending")
     .select("id").maybeSingle();
   if(cancelError)throw cancelError;
   if(!cancelled)return bad("This invitation is no longer pending",409);
   return respond({success:true,message:"Staff invitation cancelled. Its OTP can no longer be used."});
  }
  if(args.action==="request"){
   const email=String(args.email||"").trim().toLowerCase(),name=String(args.name||"").trim();
   if(!emailOK(email)||name.length<2||name.length>120)return bad("Enter valid staff name and email");
   // Existing members are never issued a new credential by this flow.
   const {data:known}=await db.rpc("qualify_staff_existing_auth_user",{p_email:email});
   if(known)return bad("This email already has a QUALIFY account. Staff accounts cannot be reused. The previous institution must Suspend & Remove the old account before new registration.",409);
   // Limit custom invitation emails to 20 per Super Admin every 24 hours.
   const {count:sentCount,error:quotaError}=await db.from("qualify_staff_otp_invites")
     .select("id",{count:"exact",head:true}).eq("requested_by",user.id)
     .gte("created_at",new Date(Date.now()-86400000).toISOString());
   if(quotaError)throw quotaError;
   if((sentCount||0)>=20)return bad("Daily staff invitation limit reached. Try again tomorrow.",429);
   const {data:pending}=await db.from("qualify_staff_otp_invites").select("id,created_at").eq("institution_id",institutionId).eq("invited_email",email).eq("status","pending").maybeSingle();
   if(pending){
    if(Date.now()-new Date(pending.created_at).getTime()<120000)return bad("Wait 2 minutes before resending an OTP");
    const {error:e}=await db.from("qualify_staff_otp_invites").update({status:"superseded"}).eq("id",pending.id).eq("status","pending");
    if(e)throw e;
   }
   const id=crypto.randomUUID(),code=otp(),hash=await digest(id+":"+code);
   const {error:insertError}=await db.from("qualify_staff_otp_invites").insert({
    id,institution_id:institutionId,invited_email:email,staff_name:name,otp_hash:hash,
    expires_at:new Date(Date.now()+600000).toISOString(),requested_by:user.id
   });
   if(insertError)throw Error("Could not create OTP request");
   try{
    await mail(email,"QUALIFY staff email verification","<p>"+safe(institution.name)+" has requested Staff Admin access.</p><p>Give this code to the authorized Super Admin:</p><h1>"+code+"</h1><p>Valid for 10 minutes. Ignore if unexpected.</p>");
   }catch{
    await db.from("qualify_staff_otp_invites").update({status:"failed"}).eq("id",id);
    return bad("Email delivery failed; no staff access was granted.",503);
   }
   return respond({success:true,id,message:"OTP sent to staff email"});
  }
  const inviteId=String(args.inviteId||""),code=String(args.otp||"");
  if(!/^[0-9a-f-]{36}$/.test(inviteId)||!/^[0-9]{6}$/.test(code))return bad("Enter the 6-digit OTP");
  const {data:inv}=await db.from("qualify_staff_otp_invites").select("id,institution_id,staff_name,invited_email,status").eq("id",inviteId).eq("institution_id",institutionId).maybeSingle();
  if(!inv||inv.status!=="pending")return bad("Invitation expired or already used",409);
  const {data:ok,error:verifyError}=await db.rpc("qualify_staff_verify_otp",{p_invite:inviteId,p_hash:await digest(inviteId+":"+code)});
  if(verifyError)throw verifyError;
  if(!ok)return bad("OTP incorrect, expired, or exceeded five attempts");
  const {data:existingUser,error:lookupError}=await db.rpc("qualify_staff_existing_auth_user",{p_email:inv.invited_email});
  if(lookupError)throw lookupError;
  if(existingUser)return bad("This email still belongs to another QUALIFY Auth account. The previous institution must permanently remove it before a fresh Staff Admin setup.",409);
  const password=tempPass();
  const {data:created,error:createError}=await db.auth.admin.createUser({email:inv.invited_email,password,email_confirm:true,user_metadata:{full_name:inv.staff_name}});
  if(createError||!created.user){
   await db.from("qualify_staff_otp_invites").update({status:"failed"}).eq("id",inviteId);
   return bad("Account could not be created; this address may already have an unverified account.",409);
  }
  await db.from("qualify_staff_otp_invites").update({status:"provisioning",provisioned_user_id:created.user.id}).eq("id",inviteId);
  const {error:setupError}=await db.from("qualify_staff_first_login").insert({
   user_id:created.user.id,institution_id:institutionId,invited_email:inv.invited_email,invite_id:inviteId
  });
  if(setupError)return bad("Account created but password setup needs support",503);
  try{
   await mail(inv.invited_email,"QUALIFY temporary Staff Admin password",
    "<p>Your staff account for "+safe(institution.name)+" was created.</p><p>Login: "+safe(inv.invited_email)+"</p><p>Temporary password: <strong>"+safe(password)+"</strong></p><p>Sign in at https://qualifyexam.online/login and change your password immediately. Institution access activates after you change it.</p>");
  }catch{
   await db.from("qualify_staff_otp_invites").update({status:"failed"}).eq("id",inviteId);
   return bad("Account created but credential email failed. Staff access has not been granted; contact support.",503);
  }
  await db.from("qualify_staff_otp_invites").update({status:"provisioned"}).eq("id",inviteId);
  return respond({success:true,existing:false,message:"Temporary password sent to staff email. Staff must change it before using QUALIFY."});
 }catch(e){
  return bad(e instanceof Error?e.message:"Onboarding request failed",500);
 }
});