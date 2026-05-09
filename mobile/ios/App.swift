import SwiftUI

@main
struct KunaiApp: App {
    @StateObject private var configStore = ConfigStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(configStore)
        }
    }
}
