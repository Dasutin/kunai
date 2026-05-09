import Foundation

actor APIClient {
    enum APIError: Error {
        case notConfigured
        case badURL
        case statusCode(Int, String?)
        case transport(Error)
    }

    private var baseURL: URL?
    private let session: URLSession = .shared

    init(baseURL: URL?) {
        self.baseURL = baseURL
    }

    func updateBaseURL(_ url: URL?) {
        self.baseURL = url
    }

        private func request(path: String, queryItems: [URLQueryItem] = []) async throws -> Data {
                guard let baseURL else { throw APIError.notConfigured }
                var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)
                components?.queryItems = queryItems.isEmpty ? nil : queryItems
                guard let url = components?.url else { throw APIError.badURL }
                var request = URLRequest(url: url)
                request.timeoutInterval = 15
                do {
                    let (data, response) = try await session.data(for: request)
                    let status = (response as? HTTPURLResponse)?.statusCode ?? -1
                    if status != 200 {
                            let body = String(data: data, encoding: .utf8)
                            throw APIError.statusCode(status, body)
                    }
                    return data
                } catch {
                    throw APIError.transport(error)
                }
        }

    func getFeeds() async throws -> [Feed] {
        let data = try await request(path: "api/feeds")
        return try JSONDecoder().decode([Feed].self, from: data)
    }

    func getItems(scope: String = "newsfeed", feedId: Int? = nil, folderId: String? = nil) async throws -> ItemListResponse {
        var items: [URLQueryItem] = [URLQueryItem(name: "scope", value: scope)]
        if let feedId { items.append(URLQueryItem(name: "feedId", value: String(feedId))) }
        if let folderId { items.append(URLQueryItem(name: "folderId", value: folderId)) }
        let data = try await request(path: "api/items", queryItems: items)
        return try JSONDecoder().decode(ItemListResponse.self, from: data)
    }
}
