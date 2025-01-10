# EMBED DECRYPT

A Rust-based API to decrypt encrypted embed sources, optimized for Vercel deployment.

<h2> Table of Contents </h2>

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Vercel Deployment](#vercel-deployment)
- [API Routes](#api-routes)
- [License](#license)


## Prerequisites
- [Node.js](https://nodejs.org)
- [Rust](https://www.rust-lang.org/tools/install)
- [Vercel CLI](https://vercel.com/cli) (for deployment)

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/eatmynerds/embed_decrypt.git
cd embed_decrypt
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
vercel dev
```

## Vercel Deployment

1. Install Vercel CLI if you haven't already:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy to Vercel:
```bash
vercel
```

4. For production deployment:
```bash
vercel --prod
```

## API Routes

### `GET /` 
Returns a welcome message.

#### Example Request:
```bash
curl -X GET "https://your-vercel-url.vercel.app/"
```

#### Example Response:
```
Welcome to the home page!
```

### `GET /embed`
Decrypts the embed source URL and returns decrypted video sources and tracks.

#### Request Parameters:
- `embed_url` - The URL of the encrypted embed source
- `referrer` - The referrer URL of the embed source

#### Example Request:
```bash
curl -X GET "https://your-vercel-url.vercel.app/embed?embed_url=https://pepepeyo.xyz/v2/embed-4/DcwrA8YHCpgF?z=&referrer=https://flixhq.to"
```

#### Example Response:
```json
{
  "sources": [
    {
      "file": "https://blornixcloud65.xyz/file1/29DMMWA8BSkTLenUu0onDu6c0Eb7JW2FOBTaVx~WSD7sirwxQfizCqyTnjjFXkKnE8T1xTYMKaXpENSYoRu2K6JXM2DCwJJNl4Y+iRMDtaERJJm3MoGfvnSSfC6lKjsuQYsbmBfsNNfTfunxkZP1ikcoVNVdbEEQxVjddYdcJlU=/NzIw/aW5kZXgubTN1OA==.m3u8",
      "type": "hls"
    }
  ],
  "tracks": [
    {
      "file": "https://cc.subsceness.xyz/85/be/85be56539a0253f73cd14c9315132252/ara-6.vtt",
      "label": "Arabic - Arabic",
      "kind": "captions"
    },
    {
      "file": "https://cc.subsceness.xyz/85/be/85be56539a0253f73cd14c9315132252/eng-2.vtt",
      "label": "English - English",
      "kind": "captions",
      "default": true
    },
    ...
  ],
  "t": 1,
  "server": 29
}
```

## License
This project is licensed under the [MIT License](./LICENSE).
