// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import Foundation
let directory=FileManager.default.temporaryDirectory.appendingPathComponent("ChemoDose-History-Test-"+UUID().uuidString)
let store=SecureHistory(testing:true,directoryOverride:directory)
defer {store.removeTestData()}
func check(_ condition:Bool,_ name:String) throws {if !condition {throw NSError(domain:name,code:1)}}
do {
 let empty=try store.read();try check(empty.1=="missing","empty")
 let synthetic="{\"schemaVersion\":1,\"autoSave\":true,\"records\":[{\"hospitalNumber\":\"SYNTHETIC-0000123\",\"ageYears\":45}]}"
 let written=try store.write(synthetic,revision:empty.1);try check(written,"write")
 let file=directory.appendingPathComponent("history-v1.dat"),sealed=try Data(contentsOf:file)
 try check(sealed.range(of:Data("SYNTHETIC-0000123".utf8))==nil,"encrypted")
 let reopened=SecureHistory(testing:true,directoryOverride:directory),read=try reopened.read();try check(read.0==synthetic,"reopen")
 let conflict=try reopened.write("{}",revision:empty.1);try check(!conflict,"CAS")
 var corrupt=sealed;corrupt[corrupt.count-1] ^= 1;try corrupt.write(to:file)
 var rejected=false;do {_ = try reopened.read()}catch {rejected=true};try check(rejected,"tamper")
 var overwrite=false;do {_ = try reopened.write("{}",revision:read.1)}catch {overwrite=true};try check(overwrite,"no-overwrite")
 try check(try Data(contentsOf:file)==corrupt,"preserved")
 print("MAC_HISTORY_TEST: 7 checks passed (encrypted, reopen, CAS, tamper, preserved)")
}catch{print("MAC_HISTORY_TEST_FAILED: \(error)");exit(1)}
