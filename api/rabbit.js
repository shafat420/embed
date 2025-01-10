const crypto = require('crypto-js');
const fetch = require('node-fetch');
const minimist = require('minimist');

async function decryptEmbed(embedUrl, referrer) {
  try {
    // First request to get cookies and encrypted data
    const response = await fetch(embedUrl, {
      headers: {
        'Referer': referrer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    
    // Extract encrypted data from script
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let encryptedData, keyMatch;
    
    let scriptMatch;
    while ((scriptMatch = scriptPattern.exec(html)) !== null) {
      const scriptContent = scriptMatch[1];
      
      // Look for ct variable
      const ctMatch = scriptContent.match(/var\s+ct\s*=\s*['"]([^'"]+)['"]/);
      if (ctMatch) {
        encryptedData = ctMatch[1];
        // Look for key in the same script
        const sliceMatch = scriptContent.match(/\['slice'\]\((\d+,\s*\d+)\)/);
        if (sliceMatch) {
          keyMatch = sliceMatch;
          break;
        }
      }
    }

    if (!encryptedData || !keyMatch) {
      throw new Error('Could not find encrypted data or key');
    }

    // Parse key indices
    const [start, end] = keyMatch[1].split(',').map(n => parseInt(n.trim()));
    
    // Get key from encrypted data
    const key = encryptedData.slice(start, end);
    
    // Decrypt using Rabbit algorithm
    let decrypted = crypto.Rabbit.decrypt(encryptedData, key);
    decrypted = decrypted.toString(crypto.enc.Utf8);
    
    // Parse and return result
    const result = JSON.parse(decrypted);
    return {
      sources: result.sources.map(source => ({
        file: source.file,
        type: source.type || 'hls'
      })),
      tracks: result.tracks || [],
      t: result.t || 1,
      server: result.server || 1
    };
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

// Parse command line arguments
const argv = minimist(process.argv.slice(2));
const embedUrl = argv['embed-url'];
const referrer = argv['referrer'];

if (!embedUrl || !referrer) {
  console.error('Missing required parameters: --embed-url and --referrer are required');
  process.exit(1);
}

// Run decryption
decryptEmbed(embedUrl, referrer)
  .then(result => {
    console.log(JSON.stringify(result));
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
