use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use serde::{Deserialize, Serialize};
use std::{process::Command, path::Path};

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

    // Get the current file's directory
    let current_dir = std::env::current_dir()
        .map_err(|e| Error::from(format!("Failed to get current directory: {}", e)))?;
    
    // Resolve path to rabbit.js
    let script_path = current_dir.join("api").join("rabbit.js");
    
    // Call Node.js script for decryption
    let output = Command::new("node")
        .arg(&script_path)
        .arg(format!("--embed-url={}", url))
        .arg(format!("--referrer={}", referrer))
        .current_dir(script_path.parent().unwrap()) // Set working directory to script's location
        .output()
        .map_err(|e| Error::from(format!("Failed to execute command: {}", e)))?;

    // Check for stderr output
    if !output.stderr.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("Script stderr: {}", stderr);
    }

    let parsed_output = String::from_utf8_lossy(&output.stdout).trim().to_string();
    println!("Script output: {}", parsed_output);

    let embed_json: EmbedSources = serde_json::from_str(&parsed_output)
        .map_err(|e| Error::from(format!("Failed to parse JSON: {}", e)))?;

    // Return the response
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(Body::Text(serde_json::to_string(&embed_json)?))?)
}
