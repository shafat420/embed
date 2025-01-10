const { spawn } = require('child_process');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const { embed_url, referrer } = req.query;

    if (!embed_url || !referrer) {
      return res.status(400).json({
        error: 'Missing required parameters: embed_url and referrer are required'
      });
    }

    // Call rabbit.js script for decryption
    const scriptPath = path.join(__dirname, 'rabbit.js');
    const child = spawn('node', [
      scriptPath,
      `--embed-url=${embed_url}`,
      `--referrer=${referrer}`
    ]);

    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      output += data;
    });

    child.stderr.on('data', (data) => {
      error += data;
    });

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(error || 'Decryption failed'));
        } else {
          resolve();
        }
      });
    });

    // Parse the output
    const result = JSON.parse(output);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
