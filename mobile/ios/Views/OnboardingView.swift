import SwiftUI

struct OnboardingView: View {
    var onSave: (String) -> Void
    @State private var urlString: String = ""

    var body: some View {
        VStack(spacing: 16) {
            Text("Connect to your Kunai server")
                .font(.title2)
                .multilineTextAlignment(.center)

            TextField("http://server:3000", text: $urlString)
                .textContentType(.URL)
                .keyboardType(.URL)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)

            Button(action: { onSave(urlString) }) {
                Text("Save & Continue").bold()
            }
            .buttonStyle(.borderedProminent)
            .disabled(urlString.trimmingCharacters(in: .whitespaces).isEmpty)

            Spacer()
        }
        .padding()
    }
}
