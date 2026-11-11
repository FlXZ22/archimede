use tower::Layer;
#[tokio::main]
async fn main() -> Result<(), vercel_runtime::Error> {
    let service = vercel_runtime::axum::VercelLayer::new().layer(archimede::api_router());
    vercel_runtime::run(service).await
}
