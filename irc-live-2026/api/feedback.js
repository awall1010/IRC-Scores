// IRC feedback intake. Requires Google Apps Script web app + shared secret in Vercel env.
// The sheet's write credentials and endpoint are never sent to clients.
const MAX_BYTES=4096;
module.exports=async function(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,message:'Method not allowed.'});}
  const origin=req.headers.origin||'';
  if(origin && !['https://irc-scores.vercel.app','https://www.irc-scores.vercel.app'].includes(origin))
    return res.status(403).json({ok:false,message:'Request not permitted.'});
  if(Number(req.headers['content-length']||0)>MAX_BYTES)return res.status(413).json({ok:false,message:'Feedback is too long.'});
  const data=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():req.body||{};
  if(data.website)return res.status(200).json({ok:true});
  const feedback=typeof data.feedback==='string'?data.feedback.trim():'';
  if(feedback.length<3||feedback.length>1200)return res.status(400).json({ok:false,message:'Please enter 3–1200 characters.'});
  const url=process.env.IRC_FEEDBACK_SCRIPT_URL;
  const secret=process.env.IRC_FEEDBACK_SECRET;
  if(!url||!secret)return res.status(503).json({ok:false,message:'Feedback is not available yet.'});
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),9000);
    let upstream;
    try{
      upstream=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({secret,feedback,source:'IRC Live Center'}),redirect:'follow',signal:controller.signal});
    }finally{clearTimeout(timeout)}
    if(!upstream.ok)throw new Error('Feedback endpoint returned '+upstream.status);
    const result=await upstream.json();
    if(result.ok!==true)throw new Error('Feedback was not saved');
    return res.status(200).json({ok:true});
  }catch(error){
    console.error('IRC feedback submission failed:',error.message);
    return res.status(502).json({ok:false,message:'Unable to send feedback right now. Please try again.'});
  }
};
