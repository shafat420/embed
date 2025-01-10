const crypto = require('crypto-js');
const fetch = require('node-fetch');
const minimist = require('minimist');

async function decryptEmbed(embedUrl, referrer) {
  try {
    // URL decode parameters
    embedUrl = decodeURIComponent(embedUrl);
    referrer = decodeURIComponent(referrer);
    
    console.log('Fetching URL:', embedUrl);
    console.log('Using referrer:', referrer);

    // First request to get cookies and encrypted data
    const response = await fetch(embedUrl, {
      headers: {
        'Referer': referrer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site'
      }
    });

    const html = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers.raw(), null, 2));
    
    // Try multiple patterns to find encrypted data
    let encryptedData, keyMatch;
    
    // Pattern 1: Inside script tag with ct variable
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = scriptPattern.exec(html)) !== null) {
      const scriptContent = scriptMatch[1];
      
      // Try different variable patterns
      const patterns = [
        /var\s+ct\s*=\s*['"]([^'"]+)['"]/,
        /const\s+ct\s*=\s*['"]([^'"]+)['"]/,
        /let\s+ct\s*=\s*['"]([^'"]+)['"]/,
        /ct\s*=\s*['"]([^'"]+)['"]/,
        /var\s+data\s*=\s*['"]([^'"]+)['"]/,
        /const\s+data\s*=\s*['"]([^'"]+)['"]/,
        /var\s+_0x[a-f0-9]+\s*=\s*['"]([^'"]+)['"]/  // Obfuscated variable names
      ];

      for (const pattern of patterns) {
        const ctMatch = scriptContent.match(pattern);
        if (ctMatch) {
          encryptedData = ctMatch[1];
          // Look for key patterns
          const keyPatterns = [
            /\['slice'\]\((\d+,\s*\d+)\)/,
            /\.slice\((\d+,\s*\d+)\)/,
            /substring\((\d+,\s*\d+)\)/,
            /substr\((\d+,\s*\d+)\)/
          ];
          
          for (const keyPattern of keyPatterns) {
            const match = scriptContent.match(keyPattern);
            if (match) {
              keyMatch = match;
              console.log('Found key pattern:', match[0]);
              break;
            }
          }
          if (keyMatch) {
            console.log('Found encrypted data in script tag');
            break;
          }
        }
      }
      if (encryptedData && keyMatch) break;
    }

    // Pattern 2: Hidden input fields
    if (!encryptedData) {
      console.log('Trying hidden input fields...');
      const inputPatterns = [
        /<input[^>]+value="([^"]+)"[^>]+id="ct"/i,
        /<input[^>]+id="ct"[^>]+value="([^"]+)"/i,
        /<input[^>]+value="([^"]+)"[^>]+class="[^"]*ct[^"]*"/i,
        /<input[^>]+data-value="([^"]+)"/i
      ];

      for (const pattern of inputPatterns) {
        const match = html.match(pattern);
        if (match) {
          encryptedData = match[1];
          // Look for key in the surrounding HTML
          const keyPatterns = [
            /\.slice\((\d+,\s*\d+)\)/,
            /\['slice'\]\((\d+,\s*\d+)\)/,
            /substring\((\d+,\s*\d+)\)/,
            /substr\((\d+,\s*\d+)\)/
          ];
          
          for (const keyPattern of keyPatterns) {
            const match = html.match(keyPattern);
            if (match) {
              keyMatch = match;
              console.log('Found key pattern in HTML:', match[0]);
              break;
            }
          }
          if (keyMatch) {
            console.log('Found encrypted data in input field');
            break;
          }
        }
      }
    }

    // Pattern 3: data attributes
    if (!encryptedData) {
      console.log('Trying data attributes...');
      const dataPatterns = [
        /data-value="([^"]+)"/,
        /data-ct="([^"]+)"/,
        /data-encrypted="([^"]+)"/
      ];

      for (const pattern of dataPatterns) {
        const match = html.match(pattern);
        if (match) {
          encryptedData = match[1];
          const keyPatterns = [
            /\.slice\((\d+,\s*\d+)\)/,
            /\['slice'\]\((\d+,\s*\d+)\)/,
            /substring\((\d+,\s*\d+)\)/,
            /substr\((\d+,\s*\d+)\)/
          ];
          
          for (const keyPattern of keyPatterns) {
            const match = html.match(keyPattern);
            if (match) {
              keyMatch = match;
              console.log('Found key pattern in data attribute:', match[0]);
              break;
            }
          }
          if (keyMatch) {
            console.log('Found encrypted data in data attribute');
            break;
          }
        }
      }
    }

    // Pattern 4: Direct script variable assignment
    if (!encryptedData) {
      console.log('Trying direct script variables...');
      const scriptContent = html.replace(/\\n/g, '');
      const directPatterns = [
        /ct=['"]([^'"]+)['"]/,
        /data=['"]([^'"]+)['"]/,
        /encrypted=['"]([^'"]+)['"]/,
        /_0x[a-f0-9]+=\s*['"]([^'"]+)['"]/  // Obfuscated assignments
      ];

      for (const pattern of directPatterns) {
        const match = scriptContent.match(pattern);
        if (match) {
          encryptedData = match[1];
          const keyMatch = scriptContent.match(/\.(slice|substring|substr)\((\d+,\s*\d+)\)/);
          if (keyMatch) {
            keyMatch = [keyMatch[0], keyMatch[2]];
            console.log('Found key in direct assignment:', keyMatch[0]);
            break;
          }
        }
      }
    }
    
    // Debug output
    console.log('Found encrypted data:', !!encryptedData);
    console.log('Found key match:', !!keyMatch);
    
    if (!encryptedData || !keyMatch) {
      console.log('HTML Preview (first 1000 chars):', html.substring(0, 1000));
      console.log('HTML Preview (last 1000 chars):', html.substring(html.length - 1000));
      throw new Error('Could not find encrypted data or key');
    }

    // Parse key indices
    const [start, end] = keyMatch[1].split(',').map(n => parseInt(n.trim()));
    console.log('Key indices:', start, end);
    
    // Get key from encrypted data
    const key = encryptedData.slice(start, end);
    console.log('Key length:', key.length);
    
    // Try decryption with both Base64 and raw data
    let decrypted;
    try {
      console.log('Attempting direct decryption...');
      decrypted = crypto.Rabbit.decrypt(encryptedData, key);
      decrypted = decrypted.toString(crypto.enc.Utf8);
    } catch (e) {
      console.log('First decryption attempt failed, trying Base64...', e.message);
      try {
        const wordArray = crypto.enc.Base64.parse(encryptedData);
        decrypted = crypto.Rabbit.decrypt(wordArray, key);
        decrypted = decrypted.toString(crypto.enc.Utf8);
      } catch (e2) {
        console.log('Base64 decryption failed:', e2.message);
        throw e2;
      }
    }
    
    console.log('Decryption successful, parsing JSON...');
    
    // Parse and validate result
    const result = JSON.parse(decrypted);
    
    if (!result.sources || !Array.isArray(result.sources)) {
      console.log('Invalid result structure:', result);
      throw new Error('Invalid decrypted data format');
    }
    
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
