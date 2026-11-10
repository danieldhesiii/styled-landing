export type ReviewFeedback={message:string;at:string};
export function reviewFeedback(value:unknown):ReviewFeedback|null{
 if(!value||typeof value!=="object")return null;
 const v=value as ReviewFeedback;
 return typeof v.message==="string"&&v.message.trim()&&typeof v.at==="string"?{message:v.message,at:v.at}:null;
}
export function venueReviewLabel(active:boolean,draft?:{status:string;payload?:{review_feedback?:unknown}}|null){
 if(draft?.status==="submitted")return "Awaiting review";
 if(reviewFeedback(draft?.payload?.review_feedback))return "Changes requested";
 if(draft)return active?"Unpublished changes":"Draft";
 return active?"Published":"Draft";
}
export function feedbackInput(value:unknown){if(typeof value!=="string"||value.trim().length<5||value.length>2000||value.includes("\0"))throw Error("Explain the changes needed in 5 to 2,000 characters.");return value.trim();}
