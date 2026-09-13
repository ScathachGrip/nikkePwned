use discord_rich_presence::{DiscordIpc, DiscordIpcClient, activity};
use std::sync::Mutex;

const DISCORD_APP_ID: &str = "632699411448725564";
const LARGE_IMAGE_URL: &str = "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_icon.png";

pub struct DiscordRpcState {
    pub client: Mutex<Option<DiscordIpcClient>>,
}

fn resolve_small_image_url(key: &str) -> &str {
    match key {
        "rpc_idle" => {
            "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_idle.png"
        }
        "rpc_llm" => {
            "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_llm.png"
        }
        "rpc_testing" => {
            "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_testing.png"
        }
        "rpc_maintain" => {
            "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_maintain.png"
        }
        "rpc_dd" => {
            "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_dd.webp"
        }
        url if url.starts_with("http") => url,
        _ => {
            "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_idle.png"
        }
    }
}

impl DiscordRpcState {
    pub fn new() -> Self {
        let state = Self {
            client: Mutex::new(None),
        };
        state.ensure_connected();
        state
    }

    fn ensure_connected(&self) {
        if let Ok(mut guard) = self.client.lock() {
            if guard.is_none() {
                match DiscordIpcClient::new(DISCORD_APP_ID) {
                    Ok(mut client) => match client.connect() {
                        Ok(_) => {
                            println!("🟢 Connected to Discord IPC");
                            *guard = Some(client);
                        }
                        Err(e) => {
                            eprintln!("⚠️ Discord IPC connect error: {:?}", e);
                        }
                    },
                    Err(e) => {
                        eprintln!("⚠️ Discord IPC creation error: {:?}", e);
                    }
                }
            }
        }
    }

    pub fn update(
        &self,
        details: &str,
        state: &str,
        small_image_key: Option<&str>,
        small_image_text: Option<&str>,
    ) {
        self.ensure_connected();

        if let Ok(mut guard) = self.client.lock() {
            if let Some(ref mut client) = *guard {
                let small_url = small_image_key.map(resolve_small_image_url);
                let mut assets = activity::Assets::new()
                    .large_image(LARGE_IMAGE_URL)
                    .large_text("v5.0.12");

                if let Some(url) = small_url {
                    assets = assets.small_image(url);
                }
                if let Some(text) = small_image_text {
                    assets = assets.small_text(text);
                }

                let buttons = vec![activity::Button::new(
                    "Learn More",
                    "https://github.com/ScathachGrip/nikkePwned",
                )];

                let act = activity::Activity::new()
                    .details(details)
                    .state(state)
                    .assets(assets)
                    .buttons(buttons);

                if let Err(err) = client.set_activity(act) {
                    eprintln!("⚠️ Failed to set Discord activity: {:?}", err);
                    let _ = client.close();
                    *guard = None;
                } else {
                    println!("🟢 Discord RPC updated: {} | {}", details, state);
                }
            }
        }
    }
}
