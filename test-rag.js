const fs = require('fs');

async function testRAG() {
  const filePath = 'C:\\Users\\ojasw\\Downloads\\Consolidated and Standalone.pdf';
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  
  const formData = new FormData();
  formData.append('file', blob, 'Consolidated and Standalone.pdf');
  formData.append('query', 'What is the net profit?');
  formData.append('apiKey', 'dummy_key_to_bypass_initial_check'); 
  
  console.log('Sending request to http://localhost:3000/api/rag ...');
  const startTime = Date.now();
  
  try {
    const res = await fetch('http://localhost:3000/api/rag', {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Time taken: ${(Date.now() - startTime)/1000}s`);
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error('Error:', err);
  }
}

testRAG();
