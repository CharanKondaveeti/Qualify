import { createClient } from "npm:@supabase/supabase-js@2.57.0";

// Requires RESEND_API_KEY, QUALIFY_EMAIL_FROM, QUALIFY_OTP_HMAC_SECRET,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY and QUALIFY_SITE_ORIGIN.
// JWT verification is disabled at the gateway because applicants have NO Auth user.
// Each action validates either the hashed applicant session or a verified Owner JWT.
const allowed = new Set(["https://qualifyexam.online","https://www.qualifyexam.online",
  "http://localhost:5173","http://localhost:4173","http://localhost:3000"]);
const encoder = new TextEncoder();
const respond = (origin: string, value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: {"content-type":"application/json","cache-control":"no-store","vary":"Origin",
    ...(allowed.has(origin)?{"access-control-allow-origin":origin}:{})}
});
const safe = (v: unknown) => String(v??"").replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"} as Record<string,string>)[c]);
const emailOK = (v:string)=>v.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const uuidOK = (v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const hex = (buffer: ArrayBuffer)=>Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,"0")).join("");
const hash = async(v:string)=>hex(await crypto.subtle.digest("SHA-256",encoder.encode(v)));
async function hmac(v:string) {
  const secret = Deno.env.get("QUALIFY_OTP_HMAC_SECRET");
  if(!secret || secret.length<32) throw Error("OTP email service not configured");
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return hex(await crypto.subtle.sign("HMAC",key,encoder.encode(v)));
}
function randomToken(){
  return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
}
function otp(){
  const n=new Uint32Array(1);
  do {crypto.getRandomValues(n);} while(n[0]>=4294000000);
  return String(n[0]%1000000).padStart(6,"0");
}
async function mail(to:string,subject:string,html:string){
  const key=Deno.env.get("RESEND_API_KEY"), from=Deno.env.get("QUALIFY_EMAIL_FROM");
  if(!key||!from)throw Error("Email delivery is not configured");
  const r=await fetch("https://api.resend.com/emails",{
    method:"POST",headers:{authorization:"Bearer "+key,"content-type":"application/json"},
    body:JSON.stringify({from,to,subject,html})
  });
  if(!r.ok)throw Error("Email delivery is unavailable");
}
const types=new Set(["school","junior_college","engineering_college","degree_college","polytechnic",
  "university","medical_pharmacy","coaching","other"]);
const sources=new Set(["manual","qualify","google_places","udise","aishe","state_directory"]);
function validate(raw:unknown,email:string){
  const o=(raw && typeof raw==="object" && !Array.isArray(raw)?raw:{}) as Record<string,unknown>;
  const get=(k:string)=>String(o[k]??"").trim();
  const name=get("name"), code=get("code").toLowerCase(), type=get("institution_type");
  const phone=get("official_phone"), address=get("address_line"), state=get("state"), district=get("district"),
    city=get("city"),postal=get("postal_code"),site=get("website"),details=get("details");
  const designation=get("super_admin_designation"),applicantName=get("applicant_name");
  if(name.length<3||name.length>160)throw Error("Enter the full official institution name");
  if(!/^[a-z0-9][a-z0-9-]{2,39}$/.test(code))throw Error("Enter a valid institution code");
  if(!types.has(type))throw Error("Select institution category");
  if(!/^[+0-9][0-9 ()-]{7,19}$/.test(phone))throw Error("Enter a valid institution phone number");
  if(address.length<8||address.length>250||[state,district,city].some(x=>x.length<2||x.length>80)||
     !/^[1-9][0-9]{5}$/.test(postal))throw Error("Enter the complete address and six-digit postal ZIP code");
  if(applicantName.length<2||applicantName.length>120||designation.length<2||designation.length>120)
    throw Error("Enter your name and your designation at the institution");
  if(site && (site.length>250||!/^https?:\/\//i.test(site)))throw Error("Enter a valid website URL");
  if(details.length>1500)throw Error("Verification notes are too long");
  const secondary=get("secondary_phone"),affiliation=get("affiliation"),registration=get("registration_number");
  if(secondary && !/^[+0-9][0-9 ()-]{7,19}$/.test(secondary))throw Error("Invalid alternate phone");
  if(affiliation.length>200||registration.length>100)throw Error("Affiliation details too long");
  const source=get("directory_source")||"manual",id=get("directory_id"),directoryName=get("directory_name");
  if(!sources.has(source)||id.length>160||directoryName.length>160)throw Error("Invalid directory details");
  return {name,code,website:site||null,details:details||null,
    profile_details:{institution_type:type,official_phone:phone,official_email:email,
      secondary_phone:secondary,address_line:address,state,district,city,postal_code:postal,
      website:site,affiliation,registration_number:registration,
      applicant_name:applicantName,super_admin_designation:designation,
      directory_source:source,directory_id:source==="manual"?"":id,
      directory_name:source==="manual"?"":directoryName}};
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin")||"";
  const headers={"access-control-allow-headers":"authorization,apikey,content-type,x-client-info,x-applicant-session",
    "access-control-allow-methods":"POST,OPTIONS","vary":"Origin","cache-control":"no-store",
    ...(allowed.has(origin)?{"access-control-allow-origin":origin}:{})};
  if(req.method==="OPTIONS")return new Response(null,{headers});
  if(req.method!=="POST")return respond(origin,{error:"Method not allowed"},405);
  if(origin && !allowed.has(origin))return respond(origin,{error:"Origin is not allowed"},403);
  const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!key)return respond(origin,{error:"Registration backend unavailable"},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  let a:Record<string,unknown>;
  try {a=await req.json();if(!a||Array.isArray(a)||typeof a!=="object")throw Error();}catch{
    return respond(origin,{error:"Invalid request"},400);
  }
  const action=String(a.action||"");
  const fail=(msg:string,status=400)=>respond(origin,{error:msg},status);
  async function session(){
    const token=req.headers.get("x-applicant-session")||"";
    if(!/^[0-9a-f]{64}$/.test(token))throw Error("Verify your email to continue");
    const {data,error}=await db.from("qualify_applicant_sessions").select("id,email,expires_at,revoked_at")
      .eq("token_hash",await hash(token)).maybeSingle();
    if(error)throw error;
    if(!data||data.revoked_at||Date.parse(data.expires_at)<=Date.now())throw Error("Verification session expired. Verify your email again.");
    return data;
  }
  async function owner(){
    const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
    if(!jwt||jwt===key)throw Error("Platform Owner sign-in required");
    const {data:{user},error}=await db.auth.getUser(jwt);
    if(error||!user||!user.email_confirmed_at)throw Error("Platform Owner sign-in required");
    const anon=Deno.env.get("SUPABASE_ANON_KEY")||key;
    const scoped=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},
      global:{headers:{Authorization:"Bearer "+jwt}}});
    const check=await scoped.rpc("qualify_is_platform_owner");
    if(check.error||check.data!==true)throw Error("Platform Owner access required");
    return {user,scoped};
  }
  async function sendActivation(app:Record<string,unknown>,userId:string){
    const token=randomToken();
    const {error}=await db.from("qualify_institution_activations").insert({
      application_id:app.id,user_id:userId,token_hash:await hash(token),
      expires_at:new Date(Date.now()+48*3600000).toISOString()
    });
    if(error)throw error;
    const site=(Deno.env.get("QUALIFY_SITE_ORIGIN")||"https://www.qualifyexam.online").replace(/\/$/,"");
    const link=site+"/activate#token="+token;
    await mail(String(app.applicant_email),"Activate your QUALIFY Super Admin account",
      "<p>Your institution "+safe(app.institution_name)+" has been approved.</p>"+
      "<p>Set your password using this one-time activation link (valid for 48 hours):</p>"+
      '<p><a href="'+safe(link)+'">Activate your account</a></p>'+
      "<p>Do not share this link. If it expires, contact the QUALIFY Platform Owner.</p>");
  }
  try {
    if(action==="request_otp"){
      const email=String(a.email||"").trim().toLowerCase();
      if(!emailOK(email))return fail("Enter a valid email address");
      const ip=(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown").trim();
      const ipHash=await hmac("ip:"+ip);
      const day=new Date(Date.now()-86400000).toISOString();
      const [{data:latest},{count:emailCount},{count:ipCount}]=await Promise.all([
        db.from("qualify_applicant_otps").select("sent_at").eq("email",email).order("sent_at",{ascending:false}).limit(1).maybeSingle(),
        db.from("qualify_applicant_otps").select("id",{head:true,count:"exact"}).eq("email",email).gte("sent_at",day),
        db.from("qualify_applicant_otps").select("id",{head:true,count:"exact"}).eq("ip_hash",ipHash).gte("sent_at",new Date(Date.now()-3600000).toISOString())
      ]);
      if(latest && Date.now()-Date.parse(latest.sent_at)<60000)return fail("Wait 60 seconds before requesting another code",429);
      if((emailCount||0)>=12||(ipCount||0)>=30)return fail("Too many verification requests. Try later.",429);
      const id=crypto.randomUUID(),code=otp();
      const {error}=await db.from("qualify_applicant_otps").insert({
        id,email,code_hash:await hmac(id+":"+code),ip_hash:ipHash,
        expires_at:new Date(Date.now()+600000).toISOString()
      });
      if(error)throw error;
      try {
        await mail(email,"Your QUALIFY registration verification code",
          "<p>Use this code to verify your email for institution registration:</p><h1>"+
          safe(code)+"</h1><p>Expires in 10 minutes. If you did not request it, ignore this email.</p>");
      }catch{
        await db.from("qualify_applicant_otps").delete().eq("id",id);
        return fail("Could not send the verification email. Try later.",503);
      }
      return respond(origin,{challengeId:id,message:"A six-digit verification code was sent to your email."});
    }
    if(action==="verify_otp"){
      const id=String(a.challengeId||""),code=String(a.code||"");
      if(!uuidOK(id)||!/^[0-9]{6}$/.test(code))return fail("Enter the six-digit verification code");
      const {data:email,error}=await db.rpc("qualify_applicant_verify_otp",{p_id:id,p_hash:await hmac(id+":"+code)});
      if(error)throw error;
      if(!email)return fail("Incorrect or expired code. You have at most five attempts.",400);
      const token=randomToken();
      const {error:sessionError}=await db.from("qualify_applicant_sessions").insert({
        email,token_hash:await hash(token),expires_at:new Date(Date.now()+86400000).toISOString()
      });
      if(sessionError)throw sessionError;
      return respond(origin,{sessionToken:token,email});
    }
    if(["status","submit","resubmit","delete"].includes(action)){
      const ss=await session();
      const {data:existing,error:findError}=await db.from("institution_applications")
        .select("id,institution_name,requested_code,status,review_notes,created_at,reviewed_at,profile_details,website,details")
        .eq("applicant_email",ss.email).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(findError)throw findError;
      if(action==="status")return respond(origin,{email:ss.email,application:existing||null});
      if(action==="delete"){
        if(!existing||existing.status!=="rejected")return fail("Only rejected applications can be deleted");
        await db.from("institution_audit").delete().eq("application_id",existing.id);
        const {error}=await db.from("institution_applications").delete().eq("id",existing.id).eq("status","rejected");
        if(error)throw error;
        await Promise.all([
          db.from("qualify_applicant_otps").delete().eq("email",ss.email),
          db.from("qualify_applicant_sessions").delete().eq("email",ss.email)
        ]);
        return respond(origin,{success:true});
      }
      if(action==="submit" && existing)return fail("You already have an application for this email. Check its status instead.",409);
      if(action==="resubmit" && existing?.status!=="rejected")return fail("Only rejected applications can be resubmitted",409);
      const form=validate(a.form,ss.email);
      // Institution codes must be globally unique among active institutions and pending applications.
      const [{data:used},{data:pending}]=await Promise.all([
        db.from("institutions").select("id").eq("code",form.code).limit(1).maybeSingle(),
        db.from("institution_applications").select("id").eq("requested_code",form.code).eq("status","pending").limit(1).maybeSingle()
      ]);
      if(used||(pending&&pending.id!==existing?.id))return fail("Institution code already in use or awaiting approval",409);
      if(action==="submit"){
        const {error}=await db.from("institution_applications").insert({
          applicant_user_id:null,applicant_email:ss.email,institution_name:form.name,
          requested_code:form.code,website:form.website,details:form.details,
          profile_details:form.profile_details,status:"pending"
        });
        if(error)throw error;
      }else{
        const {error}=await db.from("institution_applications").update({
          institution_name:form.name,requested_code:form.code,website:form.website,
          details:form.details,profile_details:form.profile_details,status:"pending",
          reviewed_by:null,reviewed_at:null,review_notes:null
        }).eq("id",existing!.id).eq("status","rejected");
        if(error)throw error;
      }
      return respond(origin,{success:true,message:"Application submitted for Platform Owner review."});
    }
    if(["approve","reject","resend_activation"].includes(action)){
      const {scoped}=await owner();
      const id=String(a.applicationId||"");
      if(!uuidOK(id))return fail("Invalid application");
      const {data:app,error:appError}=await db.from("institution_applications")
        .select("id,applicant_user_id,applicant_email,institution_name,status,profile_details")
        .eq("id",id).maybeSingle();
      if(appError)throw appError;
      if(!app)return fail("Application not found",404);
      if(action==="resend_activation"){
        if(app.status!=="approved"||!app.applicant_user_id)return fail("Application is not approved");
        await db.from("qualify_institution_activations").delete().eq("application_id",id).is("used_at",null);
        await sendActivation(app,app.applicant_user_id);
        return respond(origin,{success:true,message:"New activation link emailed."});
      }
      if(app.status!=="pending")return fail("Application already reviewed",409);
      const notes=String(a.notes||"").trim();
      if(notes.length>1500)return fail("Feedback is too long");
      if(action==="reject" && notes.length<5)return fail("A rejection reason of at least five characters is required");
      if(action==="reject"){
        const {error}=await scoped.rpc("qualify_review_institution_application",{
          p_application:id,p_approve:false,p_notes:notes
        });
        if(error)throw error;
        let emailed=true;
        try{await mail(app.applicant_email,"QUALIFY institution application needs changes",
          "<p>Your application for "+safe(app.institution_name)+" was not approved.</p><p>Reason: "+
          safe(notes)+"</p><p>Visit https://www.qualifyexam.online/application-status, verify your email, then edit and resubmit or delete your application.</p>");}
        catch{emailed=false;}
        return respond(origin,{success:true,emailed});
      }
      if(app.applicant_user_id)return fail("This application is already linked to an account");
      const randomPassword=randomToken()+"aB1!";
      const {data:created,error:createError}=await db.auth.admin.createUser({
        email:app.applicant_email,password:randomPassword,email_confirm:true,
        user_metadata:{full_name:String(app.profile_details?.applicant_name||"Institution Super Admin")}
      });
      if(createError||!created?.user)return fail("Could not create the Super Admin account. Check whether the email already exists.",409);
      const userId=created.user.id;
      try{
        const {error:linkError}=await db.from("institution_applications").update({applicant_user_id:userId}).eq("id",id).eq("status","pending");
        if(linkError)throw linkError;
        const {error:reviewError}=await scoped.rpc("qualify_review_institution_application",{
          p_application:id,p_approve:true,p_notes:notes
        });
        if(reviewError)throw reviewError;
      }catch(e){
        await db.from("institution_applications").update({applicant_user_id:null}).eq("id",id).eq("status","pending");
        await db.auth.admin.deleteUser(userId);
        throw e;
      }
      let emailed=true;
      try{await sendActivation(app,userId);}catch{emailed=false;}
      return respond(origin,{success:true,emailed,message:emailed
        ?"Institution approved. Password activation link emailed.":"Institution approved, but activation email failed. Use Resend activation in the approved tab."});
    }
    if(action==="activate"){
      const token=String(a.token||""),password=String(a.password||"");
      if(!/^[0-9a-f]{64}$/.test(token))return fail("Invalid activation link");
      if(password.length<12||password.length>128||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||
         !/[0-9]/.test(password)||!/[^a-zA-Z0-9]/.test(password))
        return fail("Use 12+ characters including uppercase, lowercase, number and symbol");
      const tokenHash=await hash(token);
      const {data:item,error}=await db.from("qualify_institution_activations")
        .select("id,user_id,application_id,expires_at,used_at").eq("token_hash",tokenHash).maybeSingle();
      if(error)throw error;
      if(!item||item.used_at||Date.parse(item.expires_at)<Date.now())return fail("Activation link is invalid, expired, or already used",410);
      // Claim the link once before updating credentials, blocking simultaneous reuse.
      const {data:claimed,error:claimError}=await db.from("qualify_institution_activations")
        .update({used_at:new Date().toISOString()}).eq("id",item.id).is("used_at",null)
        .gt("expires_at",new Date().toISOString()).select("id").maybeSingle();
      if(claimError)throw claimError;
      if(!claimed)return fail("Activation link already used",410);
      const {error:passwordError}=await db.auth.admin.updateUserById(item.user_id,{password});
      if(passwordError)throw Error("Could not set password. Ask the Platform Owner to resend activation.");
      return respond(origin,{success:true,message:"Your account is activated. You can now sign in."});
    }
    return fail("Invalid action");
  }catch(e){
    const msg=e instanceof Error?e.message:"Registration request failed";
    return fail(msg,/expired|Verify your email|sign-in required|Owner access/.test(msg)?401:400);
  }
});
