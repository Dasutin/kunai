import SwiftUI

struct RootView: View {
    @EnvironmentObject var config: ConfigStore
    @State private var client = APIClient(baseURL: nil)

    var body: some View {
        Group {
            if let server = config.serverURL {
                ContentShell(server: server)
            } else {
                OnboardingView(onSave: { urlString in
                    config.setServerURL(urlString)
                    client.updateBaseURL(config.serverURL)
                })
            }
        }
        .onChange(of: config.serverURL) { newValue in
            client.updateBaseURL(newValue)
        }
    }
}

struct ContentShell: View {
    let server: URL
    @State private var feeds: [Feed] = []
    @State private var loading = false
    @State private var error: String?
    @EnvironmentObject var config: ConfigStore
    @State private var client = APIClient(baseURL: nil)

    var body: some View {
        NavigationStack {
            VStack {
                if loading {
                    ProgressView("Loading feeds…")
                } else if let error {
                    Text(error).foregroundColor(.red).padding()
                    Button("Retry") { Task { await loadFeeds() } }
                } else {
                    FeedListView(feeds: feeds)
                }
            }
            .navigationTitle("Kunai")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Change Server") {
                        config.clear()
                    }
                }
            }
            .task { await loadFeeds() }
        }
        .onAppear { client.updateBaseURL(server) }
    }

    private func loadFeeds() async {
        guard config.serverURL != nil else { return }
        loading = true; error = nil
        do {
            feeds = try await client.getFeeds()
        } catch {
            self.error = describe(error)
        }
        loading = false
    }

    private func describe(_ error: Error) -> String {
        if let apiError = error as? APIClient.APIError {
            switch apiError {
            case .notConfigured: return "Server not configured."
            case .badURL: return "Invalid server URL."
            case .statusCode(let code, let body): return "Server error (status \(code)). " + (body ?? "")
            case .transport(let err):
                let nsErr = err as NSError
                switch nsErr.code {
                case -1022:
                    return "Connection blocked by iOS (ATS). Allow HTTP in App Transport Security or use HTTPS."
                case -1200: return "SSL error: certificate untrusted or mismatch."
                case -1201: return "SSL error: certificate expired or not yet valid."
                case -1202: return "SSL error: untrusted root. Install a trusted cert or trust your CA."
                case -1203: return "SSL error: hostname mismatch."
                case -1205: return "SSL error: handshake failed (TLS version/cipher?)."
                case -1206: return "SSL error: bad certificate chain."
                case -1009: return "No internet connection."
                case -1001: return "Request timed out."
                default:
                    return nsErr.localizedDescription
                }
            }
        }
        return error.localizedDescription
    }
}
