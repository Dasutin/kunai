import Foundation
import Combine

final class ConfigStore: ObservableObject {
    @Published var serverURL: URL?
    private let key = "kunai.server.url"

    init() {
        if let saved = UserDefaults.standard.string(forKey: key), let url = URL(string: saved) {
            self.serverURL = url
        }
    }

    func setServerURL(_ urlString: String) {
        guard let url = URL(string: urlString), url.scheme?.hasPrefix("http") == true else { return }
        UserDefaults.standard.set(url.absoluteString, forKey: key)
        serverURL = url
    }

    func clear() {
        UserDefaults.standard.removeObject(forKey: key)
        serverURL = nil
    }
}
