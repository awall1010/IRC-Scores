// Paste into Extensions > Apps Script for the IRC FEEDBACK spreadsheet.
// Then set Script Properties: IRC_FEEDBACK_SECRET = same random secret as Vercel.
// Deploy as Web App: Execute as Me; Who has access: Anyone.
// Copy the /exec URL into Vercel env IRC_FEEDBACK_SCRIPT_URL.
const FEEDBACK_SPREADSHEET_ID='1kP1DJNpZskJw-6fN6I1q2LdcebassttI0a7aI943SvM';
function doPost(e) {
  function response(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  }
  try{
    const body=JSON.parse(e.postData.contents);
    const secret=PropertiesService.getScriptProperties().getProperty('IRC_FEEDBACK_SECRET');
    if(!secret||body.secret!==secret)return response({ok:false});
    const value=typeof body.feedback==='string'?body.feedback.trim():'';
    if(value.length<3||value.length>1200)return response({ok:false});
    // Prevent a submission starting with formula characters being evaluated as a Sheets formula.
    const safe=/^[=+@\-\t\r]/.test(value)?"'"+value:value;
    const lock=LockService.getScriptLock();
    lock.waitLock(5000);
    try{
      const sheet=SpreadsheetApp.openById(FEEDBACK_SPREADSHEET_ID).getSheetByName('Sheet1');
      if(!sheet)throw new Error('Sheet1 not found');
      sheet.appendRow([new Date(),safe,'IRC Live Center']);
    }finally{lock.releaseLock();}
    return response({ok:true});
  }catch(err){console.error('Feedback write failed: '+err.message);return response({ok:false});}
}
