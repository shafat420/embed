use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Debug)]
pub struct EmbedSources {
    pub sources: Vec<Source>,
    pub tracks: Vec<Track>,
    pub t: u32,
    pub server: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Source {
    pub file: String,
    #[serde(rename = "type")]
    pub source_type: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Track {
    pub file: String,
    pub label: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<bool>,
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    // Parse query parameters
    let url = req.uri().query()
        .and_then(|q| q.split('&')
            .find(|p| p.starts_with("embed_url="))
            .map(|p| p.split('=').nth(1).unwrap_or("")))
        .ok_or_else(|| Error::from("Missing embed_url parameter"))?;

    let referrer = req.uri().query()
        .and_then(|q| q.split('&')
            .find(|p| p.starts_with("referrer="))
            .map(|p| p.split('=').nth(1).unwrap_or("")))
        .ok_or_else(|| Error::from("Missing referrer parameter"))?;

    // Call Node.js script for decryption
    let output = Command::new("node")
        .arg("rabbit.js")
        .arg(format!("--embed-url={}", url))
        .arg(format!("--referrer={}", referrer))
        .output()
        .map_err(|e| Error::from(format!("Failed to execute command: {}", e)))?;

    let parsed_output = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let embed_json: EmbedSources = serde_json::from_str(&parsed_output)
        .map_err(|e| Error::from(format!("Failed to parse JSON: {}", e)))?;

    // Return the response
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(Body::Text(serde_json::to_string(&embed_json)?))?)
}
