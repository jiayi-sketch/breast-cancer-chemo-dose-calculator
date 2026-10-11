// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import Foundation
import CryptoKit
import Security
import Darwin

final class SecureHistory {
    static let limit = 8 * 1024 * 1024
    private let directory: URL
    private let file: URL
    private let account: String
    init(testing: Bool, directoryOverride: URL? = nil) {
        directory = directoryOverride ?? (testing ? FileManager.default.temporaryDirectory.appendingPathComponent("ChemoDose-History-Test-" + UUID().uuidString) : FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("ChemoDose"))
        file = directory.appendingPathComponent("history-v1.dat")
        account = testing ? "history-test-" + directory.lastPathComponent : "history-v1"
    }
    func removeTestData() {
        guard account.hasPrefix("history-test-") else { return }
        let query: [String:Any] = [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:"org.chemodose.preview.history",kSecAttrAccount as String:account]
        SecItemDelete(query as CFDictionary)
        try? FileManager.default.removeItem(at:directory)
    }
    private func failure() -> NSError { NSError(domain:"ChemoDoseHistory",code:1) }
    private func locked<T>(_ action: () throws -> T) throws -> T {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories:true, attributes:[.posixPermissions:0o700])
        let fd = Darwin.open(directory.appendingPathComponent("history.lock").path, O_CREAT | O_RDWR, 0o600)
        guard fd >= 0 else { throw failure() }
        defer { Darwin.close(fd) }
        guard flock(fd, LOCK_EX) == 0 else { throw failure() }
        defer { flock(fd, LOCK_UN) }
        return try action()
    }
    private func key() throws -> SymmetricKey {
        let query: [String:Any] = [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:"org.chemodose.preview.history",kSecAttrAccount as String:account,kSecAttrSynchronizable as String:false]
        var read=query;read[kSecReturnData as String]=true;read[kSecMatchLimit as String]=kSecMatchLimitOne
        var result:CFTypeRef?
        let status=SecItemCopyMatching(read as CFDictionary,&result)
        if status == errSecSuccess, let data=result as? Data, data.count==32 {return SymmetricKey(data:data)}
        guard status == errSecItemNotFound, !FileManager.default.fileExists(atPath:file.path) else {throw failure()}
        let key=SymmetricKey(size:.bits256), data=key.withUnsafeBytes { Data($0) }
        var create=query;create[kSecValueData as String]=data;create[kSecAttrAccessible as String]=kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        guard SecItemAdd(create as CFDictionary,nil)==errSecSuccess else {throw failure()}
        return key
    }
    private func hash(_ data:Data)->String {SHA256.hash(data:data).map {String(format:"%02x",$0)}.joined()}
    private func readUnlocked() throws -> (String,String) {
        if !FileManager.default.fileExists(atPath:file.path) {return ("{\"schemaVersion\":1,\"autoSave\":true,\"records\":[]}","missing")}
        let size=(try FileManager.default.attributesOfItem(atPath:file.path)[.size] as? NSNumber)?.intValue ?? Int.max
        guard size<=Self.limit+65536 else {throw failure()}
        let sealed=try Data(contentsOf:file)
        guard sealed.count>4, sealed.prefix(4)==Data("CDH1".utf8) else {throw failure()}
        let box=try AES.GCM.SealedBox(combined:sealed.dropFirst(4))
        let plain=try AES.GCM.open(box,using:key())
        guard plain.count<=Self.limit, let content=String(data:plain,encoding:.utf8) else {throw failure()}
        return (content,hash(sealed))
    }
    func read() throws -> (String,String) {try locked {try readUnlocked()}}
    func write(_ content:String, revision:String) throws -> Bool {
        let plain=Data(content.utf8);guard plain.count<=Self.limit else {throw failure()}
        return try locked {
            let (_,current)=try readUnlocked();guard current==revision else {return false}
            guard let combined=try AES.GCM.seal(plain,using:key()).combined else {throw failure()}
            try (Data("CDH1".utf8)+combined).write(to:file,options:.atomic)
            try FileManager.default.setAttributes([.posixPermissions:0o600],ofItemAtPath:file.path)
            return true
        }
    }
}
