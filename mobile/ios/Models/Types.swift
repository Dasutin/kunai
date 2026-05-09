import Foundation

struct Feed: Identifiable, Decodable {
    let id: Int
    let title: String
    let url: String
    let enabled: Bool
    let muted: Bool
    let folderId: String?
    let unreadCount: Int?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        title = (try? c.decode(String.self, forKey: .title)) ?? "Untitled"
        url = try c.decode(String.self, forKey: .url)
        enabled = try c.decodeBoolish(forKey: .enabled)
        muted = try c.decodeBoolish(forKey: .muted)
        folderId = try? c.decodeIfPresent(String.self, forKey: .folderId)
        unreadCount = try? c.decodeIfPresent(Int.self, forKey: .unreadCount)
    }
}

struct Item: Identifiable, Decodable {
    let id: Int
    let feedId: Int
    let title: String
    let link: String
    let snippet: String?
    let content: String?
    let imageUrl: String?
    let publishedAt: String?
    let feedTitle: String?
    let isRead: Bool
    let saved: Bool

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        feedId = try c.decode(Int.self, forKey: .feedId)
        title = (try? c.decode(String.self, forKey: .title)) ?? "Untitled"
        link = (try? c.decode(String.self, forKey: .link)) ?? "#"
        snippet = try? c.decodeIfPresent(String.self, forKey: .snippet)
        content = try? c.decodeIfPresent(String.self, forKey: .content)
        imageUrl = try? c.decodeIfPresent(String.self, forKey: .imageUrl)
        publishedAt = try? c.decodeIfPresent(String.self, forKey: .publishedAt)
        feedTitle = try? c.decodeIfPresent(String.self, forKey: .feedTitle)
        isRead = (try? c.decodeBoolish(forKey: .isRead)) ?? false
        saved = (try? c.decodeBoolish(forKey: .saved)) ?? false
    }
}

struct ItemListResponse: Decodable {
    let items: [Item]
    let nextCursor: String?
}

private extension KeyedDecodingContainer {
    func decodeBoolish(forKey key: K) throws -> Bool {
        if let b = try? decode(Bool.self, forKey: key) { return b }
        if let i = try? decode(Int.self, forKey: key) { return i != 0 }
        if let s = try? decode(String.self, forKey: key) {
            return ["true", "1", "yes"].contains(s.lowercased())
        }
        return false
    }
}
