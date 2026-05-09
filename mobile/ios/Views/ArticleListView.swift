import SwiftUI

struct ArticleListView: View {
    let feed: Feed
    @State private var items: [Item] = []
    @State private var loading = false
    @State private var error: String?
    @EnvironmentObject var config: ConfigStore
    @State private var client = APIClient(baseURL: nil)

    var body: some View {
        List {
            if loading {
                ProgressView()
            } else if let error {
                Text(error).foregroundColor(.red)
            } else {
                ForEach(items) { item in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(item.title).font(.headline)
                        if let snippet = item.snippet { Text(snippet).font(.subheadline).foregroundColor(.secondary) }
                    }
                }
            }
        }
        .navigationTitle(feed.title)
        .task { await loadItems() }
        .onChange(of: config.serverURL) { newValue in
            client.updateBaseURL(newValue)
            Task { await loadItems() }
        }
        .onAppear { client.updateBaseURL(config.serverURL) }
    }

    private func loadItems() async {
        guard config.serverURL != nil else { return }
        loading = true; error = nil
        do {
            let response = try await client.getItems(scope: "feed", feedId: feed.id)
            items = response.items
        } catch {
            self.error = "Failed to load items"
        }
        loading = false
    }
}
