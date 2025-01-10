const crypto = require('crypto-js');
const fetch = require('node-fetch');
const tough = require('tough-cookie');
const cookieJar = new tough.CookieJar();

async function decryptEmbed(embedUrl, referrer) {
  try {
    // First request to get cookies and encrypted data
    const response = await fetch(embedUrl, {
      headers: {
        'Referer': referrer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const cookies = response.headers.raw()['set-cookie'];
    if (cookies) {
      for (const cookie of cookies) {
        await cookieJar.setCookie(cookie, embedUrl);
      }
    }

    const html = await response.text();
    
    // Log HTML for debugging
    console.log('HTML Response:', html);
    
    // Extract encrypted data - try multiple patterns
    let encryptedData, keyMatch;
    
    // Pattern 1: data-value attribute
    const pattern1 = html.match(/data-value="([^"]+)"/);
    
    // Pattern 2: JavaScript variable assignment
    const pattern2 = html.match(/var\s+ct\s*=\s*['"]([^'"]+)['"]/);
    
    // Pattern 3: hidden input field
    const pattern3 = html.match(/<input[^>]+value="([^"]+)"[^>]+id="[\w-]*ct[\w-]*"/i);
    
    // Pattern 4: direct script variable
    const pattern4 = html.match(/ct\s*=\s*['"]([^'"]+)['"]/);
    
    // Try all patterns
    const encryptedDataMatch = pattern1 || pattern2 || pattern3 || pattern4;
    
    // Try different key patterns
    const keyPattern1 = html.match(/\['slice'\]\((\d+,\s*\d+)\)/);
    const keyPattern2 = html.match(/\.slice\((\d+,\s*\d+)\)/);
    const keyPattern3 = html.match(/substring\((\d+,\s*\d+)\)/);
    
    keyMatch = keyPattern1 || keyPattern2 || keyPattern3;
    
    if (!encryptedDataMatch || !keyMatch) {
      console.error('Debug info:', {
        hasPattern1: !!pattern1,
        hasPattern2: !!pattern2,
        hasPattern3: !!pattern3,
        hasPattern4: !!pattern4,
        hasKeyPattern1: !!keyPattern1,
        hasKeyPattern2: !!keyPattern2,
        hasKeyPattern3: !!keyPattern3,
        htmlLength: html.length,
        htmlPreview: html.substring(0, 200) // First 200 chars
      });
      throw new Error('Could not find encrypted data or key');
    }

    encryptedData = encryptedDataMatch[1];
    const [start, end] = keyMatch[1].split(',').map(n => parseInt(n.trim()));
    
    // Get the key from the encrypted data
    const key = encryptedData.slice(start, end);
    
    console.log('Debug decryption:', {
      encryptedDataLength: encryptedData.length,
      keyIndices: [start, end],
      keyLength: key.length,
      key: key
    });
    
    // Decrypt the data using Rabbit algorithm
    let decrypted = crypto.Rabbit.decrypt(encryptedData, key);
    
    // Convert WordArray to string
    decrypted = decrypted.toString(crypto.enc.Utf8);
    
    try {
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
    } catch (e) {
      console.error('Failed to parse decrypted data:', decrypted);
      throw new Error('Failed to parse decrypted data: ' + e.message);
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  try {
    const { embed_url, referrer } = req.query;

    if (!embed_url || !referrer) {
      return res.status(400).json({
        error: 'Missing required parameters: embed_url and referrer are required'
      });
    }

    const result = await decryptEmbed(embed_url, referrer);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
