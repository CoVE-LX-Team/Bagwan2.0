'use strict';
const practice = document.querySelector('#practice');
const kind = new URLSearchParams(location.search).get('activity') || 'ppe';
const encode = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ppe = [
  ['Check the approved task risk assessment before selecting PPE.','Yes','The hazards and approved procedure determine the protection required.'],
  ['An illustration alone establishes every item of PPE needed for a laboratory task.','No','A picture cannot replace task-specific instructions and risk assessment.'],
  ['Any glove is suitable for every chemical or biological hazard.','No','Protection depends on the task, the material and the specified glove.'],
  ['Inspect protective equipment for fit and condition before using it.','Yes','Damaged or unsuitable equipment may not provide the intended protection.'],
  ['A short task is a reason to skip the required eye protection.','No','The duration does not remove the hazard or change the approved control.'],
  ['Ask the supervisor when the PPE instructions are unclear.','Yes','Clarify the procedure before proceeding.']
];
const waste = [
  ['Used hypodermic needle','Sharps','This example is explicitly a sharp. Confirm the approved local container and procedure.'],
  ['Blood-contaminated plastic gloves with no sharps','Clinical or infectious waste','The detail to notice is blood contamination. Use the local waste procedure to check the stream and handling requirements.'],
  ['Human tissue from an anatomical specimen','Anatomical waste','The example describes anatomical material. Follow the approved local handling and disposal procedure.'],
  ['Residue explicitly identified as a cytotoxic medicine','Cytotoxic waste','Cytotoxic is specified. Ordinary expired medicines must not automatically be classified this way.'],
  ['An expired medicine with no information about the medicine','More information required','The medicine type and local disposal requirements must be established.']
];
const options = kind==='waste'?['Sharps','Clinical or infectious waste','Anatomical waste','Cytotoxic waste','More information required']:['Yes','No'];
const title = kind==='waste'?'Waste classification examples':kind==='interpreter'?'Finding an interpreter':'PPE selection decisions';
document.title=title+' · Bagwan 3.0';
practice.innerHTML='<p class="eyebrow">OPTIONAL PRACTICE</p><h1>'+title+'</h1>';
if(kind==='interpreter'){
  practice.insertAdjacentHTML('beforeend','<p>A patient has asked for a Korean interpreter for an appointment in Melbourne, postcode 3000. Search the NAATI directory. Record the credential you checked and the details you would still need before confirming a booking.</p><p><a class="button secondary" href="https://www.naati.com.au/online-directory/" target="_blank" rel="noopener">Open the NAATI directory</a></p><form id="reflection"><label for="credentials">Which credentials did you check and why?</label><textarea class="field-search" id="credentials" rows="4" required></textarea><label for="suitability">What would you confirm about suitability and availability?</label><textarea class="field-search" id="suitability" rows="4" required></textarea><label for="evidence">Record the source and the date you checked it</label><textarea class="field-search" id="evidence" rows="3" required></textarea><p class="result-count">Use public professional details in your notes. Download your reflection to discuss with a peer.</p><button class="button" type="submit">Download reflection</button><p id="reflection-status" role="status"></p></form>');
  practice.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const body=['Bagwan interpreter directory reflection','',...['credentials','suitability','evidence'].flatMap(id=>[document.querySelector('label[for="'+id+'"]').textContent,document.getElementById(id).value,''])].join('\n');const url=URL.createObjectURL(new Blob([body],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='bagwan-interpreter-reflection.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#reflection-status').textContent='Reflection downloaded. Discuss your reasoning with your facilitator.';});
}else if(['ppe','waste'].includes(kind)){
  const questions=kind==='waste'?waste:ppe;
  practice.insertAdjacentHTML('beforeend','<p>'+ (kind==='waste'?'Choose the waste category that fits each description. Select “More information required” when the description gives you too little information to decide.':'Consider whether each statement supports an appropriate PPE decision. Task-specific procedures still determine what to wear.')+'</p><form id="quiz">'+questions.map(([q],i)=>'<fieldset class="practice-item"><legend>'+encode(q)+'</legend><div class="practice-options">'+options.map(o=>'<label><input type="radio" name="q'+i+'" value="'+encode(o)+'">'+encode(o)+'</label>').join('')+'</div><p id="feedback-'+i+'" class="practice-feedback" hidden></p></fieldset>').join('')+'<div class="button-row"><button class="button" type="submit">Check my responses</button><button class="button secondary" type="reset">Try again</button></div><p id="quiz-status" role="status" tabindex="-1"></p></form>');
  const form=document.querySelector('#quiz');
  form.addEventListener('submit',event=>{event.preventDefault();const response=new FormData(form);let answered=0,correct=0;questions.forEach(([,answer,explanation],i)=>{const value=response.get('q'+i);const feedback=document.getElementById('feedback-'+i);feedback.hidden=false;if(value)answered++;if(value===answer)correct++;feedback.textContent=!value?'Choose a response, then check again.':(value===answer?'Correct. ':'Try '+answer+'. ')+explanation;});const status=document.getElementById('quiz-status');status.textContent=answered<questions.length?'You answered '+answered+' of '+questions.length+'. Complete the remaining responses.':correct+' of '+questions.length+' correct. Choose one example and explain which detail guided your answer.';status.focus();});
  form.addEventListener('reset',()=>{practice.querySelectorAll('.practice-feedback').forEach(p=>{p.hidden=true;p.textContent='';});document.getElementById('quiz-status').textContent='Responses cleared.';});
}else{
  practice.insertAdjacentHTML('beforeend','<p>This practice activity was not found. <a href="learning-guide.html">Return to the learning guide</a>.</p>');
}
