const crypto = require('crypto-js');
const fetch = require('node-fetch');

async function decryptEmbed(embedUrl, referrer) {
  try {
    const response = await fetch(embedUrl, {
      headers: {
        'Referer': referrer
      }
    });
    
    const data = await response.text();
    // Add your decryption logic here using the imported rabbit.js functionality
    // This is a placeholder response
    return {
      sources: [
        {
          file: embedUrl,
          type: "hls"
        }
      ],
      tracks: [],
      t: 1,
      server: 1
    };
  } catch (error) {
    throw new Error(`Failed to decrypt: ${error.message}`);
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
      error: error.message
    });
  }
};
