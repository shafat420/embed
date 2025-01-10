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
    
    // Extract encrypted data
    const encryptedDataMatch = html.match(/var\s+ct\s*=\s*['"]([^'"]+)['"]/);
    const keyMatch = html.match(/\['slice'\]\((\d+,\s*\d+)\)/);
    
    if (!encryptedDataMatch || !keyMatch) {
      throw new Error('Could not find encrypted data or key');
    }

    const encryptedData = encryptedDataMatch[1];
    const [start, end] = keyMatch[1].split(',').map(n => parseInt(n.trim()));
    
    // Get the key from the encrypted data
    const key = encryptedData.slice(start, end);
    
    // Decrypt the data
    const decrypted = crypto.Rabbit.decrypt(encryptedData, key).toString(crypto.enc.Utf8);
    
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
