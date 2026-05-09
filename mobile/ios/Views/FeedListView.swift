import SwiftUI

struct FeedListView: View {
    let feeds: [Feed]

    var body: some View {
        List(feeds) { feed in
            NavigationLink(destination: ArticleListView(feed: feed)) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(feed.title).font(.headline)
                    Text(feed.url).font(.caption).foregroundColor(.secondary)
                }
            }
        }
    }
}
