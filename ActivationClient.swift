import Foundation

struct VerifyRequest: Encodable {
    let key: String
    let deviceId: String
}

struct VerifyResponse: Decodable {
    let valid: Bool
    let expiresAt: Double?
    let error: String?
}

enum ActivationError: LocalizedError {
    case badResponse
    case rejected(String)

    var errorDescription: String? {
        switch self {
        case .badResponse: return "The activation server returned an invalid response."
        case .rejected(let message): return message
        }
    }
}

final class ActivationClient {
    // Replace with your deployed HTTPS endpoint. Do not embed the admin token here.
    private let baseURL = URL(string: "https://YOUR-DOMAIN.example")!

    func verify(key: String, deviceId: String) async throws -> Date {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/verify"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        request.httpBody = try JSONEncoder().encode(
            VerifyRequest(key: key, deviceId: deviceId)
        )

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw ActivationError.badResponse
        }

        let result = try JSONDecoder().decode(VerifyResponse.self, from: data)
        guard result.valid, let timestamp = result.expiresAt else {
            throw ActivationError.rejected(result.error ?? "Activation failed.")
        }
        return Date(timeIntervalSince1970: timestamp / 1000)
    }
}
