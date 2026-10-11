// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;using System.IO;using System.Text;using ChemoDose.Storage;
class HistoryTests {
 static void Check(bool value,string name){if(!value)throw new Exception(name);}
 static int Main(){string directory=Path.Combine(Path.GetTempPath(),"ChemoDose-History-Test-"+Guid.NewGuid().ToString("N"));try{
  var store=new HistoryStore(directory);var first=store.Read();Check(first.Revision=="missing","empty");
  string content="{\"schemaVersion\":1,\"autoSave\":true,\"records\":[{\"hospitalNumber\":\"SYNTHETIC-0000123\",\"ageYears\":45}]}";
  Check(store.Write(content,first.Revision),"write");string file=Path.Combine(directory,"history-v1.dat");byte[] encrypted=File.ReadAllBytes(file);Check(!Encoding.UTF8.GetString(encrypted).Contains("SYNTHETIC-0000123"),"encryption");
  var reopened=new HistoryStore(directory);var saved=reopened.Read();Check(saved.Content==content,"reopen");Check(!reopened.Write("{}",first.Revision),"conflict");
  encrypted[encrypted.Length-1]^=1;File.WriteAllBytes(file,encrypted);bool rejected=false;try{reopened.Read();}catch{rejected=true;}Check(rejected,"tamper");
  rejected=false;try{reopened.Write("{}",saved.Revision);}catch{rejected=true;}Check(rejected,"no overwrite");Check(Convert.ToBase64String(File.ReadAllBytes(file))==Convert.ToBase64String(encrypted),"preserved");Console.WriteLine("WINDOWS_HISTORY: 8 checks passed");return 0;
 }catch(Exception e){Console.Error.WriteLine(e.Message);return 1;}finally{if(Directory.Exists(directory))Directory.Delete(directory,true);}}
}
