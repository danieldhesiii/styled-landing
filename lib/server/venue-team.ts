export async function verifiedVenueAccount(admin:any,email:unknown){
 if(typeof email!=="string"||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw Error("Enter the team member's existing account email.");
 const target=email.trim().toLowerCase();
 for(let page=1;page<=10;page++){
  const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});
  if(error)throw Error("Could not look up this account. Try again shortly.");
  const user=data.users.find((u:any)=>u.email?.toLowerCase()===target);
  if(user){if(user.is_anonymous||!user.email_confirmed_at)throw Error("Ask this person to confirm their account email first.");return user.id as string;}
  if(data.users.length<200)break;
 }
 throw Error("No verified account was found. Ask this person to create an account and confirm their email, then try again.");
}
