'use strict';
const filter=document.querySelector('#page-filter');
if(filter){const rows=[...document.querySelectorAll('#page-review tbody tr')];filter.addEventListener('input',()=>{const terms=filter.value.toLocaleLowerCase().trim().split(/\s+/);rows.forEach(row=>{row.hidden=!terms.every(term=>row.textContent.toLocaleLowerCase().includes(term));});document.querySelector('#page-count').textContent=rows.filter(row=>!row.hidden).length+' pages';});}
