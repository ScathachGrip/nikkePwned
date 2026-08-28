#![allow(dead_code)]

use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct MessageContent {
    r#type: String,
    text: Option<String>,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: Vec<MessageContent>,
}

#[derive(Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<Message>,
}

#[derive(Deserialize)]
struct Choice {
    message: MessageResponse,
}

#[derive(Deserialize)]
struct MessageResponse {
    content: Option<String>,
}

#[derive(Deserialize)]
struct OpenRouterResponse {
    choices: Option<Vec<Choice>>,
}

pub async fn query_openrouter_vision(
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<String, String> {
    if api_key.is_empty() {
        return Err("OpenRouter API key is empty".to_string());
    }

    let client = Client::new();
    let req_body = OpenRouterRequest {
        model: model.to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: vec![MessageContent {
                r#type: "text".to_string(),
                text: Some(prompt.to_string()),
            }],
        }],
    };

    let res = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {api_key}"))
        .header("HTTP-Referer", "https://github.com/ScathachGrip/nikkePwned")
        .header("X-Title", "nikkePwned")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {e}"))?;

    let parsed: OpenRouterResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    if let Some(choices) = parsed.choices {
        if let Some(first) = choices.first() {
            if let Some(ref text) = first.message.content {
                return Ok(text.clone());
            }
        }
    }

    Err("No response content from model".to_string())
}
