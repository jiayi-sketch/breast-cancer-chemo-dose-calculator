// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text;
using System.Text.Json;
using ChemoDose.Unified;

static class Harness {
 static int checks;
 static void Check(bool valid,string label) { if(!valid) throw new Exception(label); checks++; }
 static void Route(int major,int minor,int build,int sp,ushort arch,bool web,bool compat,Edition expected) {
  Check(LaunchPolicy.Select(major,minor,build,sp,arch,web,compat)==expected,"routing "+major+"."+minor+"/"+build+"/"+arch+"/"+web+"/"+compat);
 }
 static int Main(string[] args) {
  Route(5,1,2600,3,0x14c,false,false,Edition.Legacy);
  Route(5,1,2600,2,0x14c,false,false,Edition.Unsupported);
  Route(5,2,3790,2,0x8664,false,false,Edition.Unsupported);
  Route(6,0,6002,2,0x14c,false,false,Edition.Unsupported);
  foreach(ushort arch in new ushort[]{0x14c,0x8664}) {
   Route(6,1,7601,1,arch,true,false,Edition.Legacy);
   Route(6,1,7600,0,arch,true,false,Edition.Unsupported);
   Route(6,2,9200,0,arch,true,false,Edition.Legacy);
   Route(6,3,9600,0,arch,true,false,Edition.Legacy);
  }
  Route(10,0,19045,0,0x14c,true,false,Edition.Legacy);
  Route(10,0,19044,0,0x8664,true,false,Edition.Legacy);
  Route(10,0,19045,0,0x8664,true,false,Edition.Modern);
  Route(10,0,26100,0,0x8664,true,false,Edition.Modern);
  Route(10,0,26100,0,0x8664,false,false,Edition.Legacy);
  Route(10,0,26100,0,0x8664,true,true,Edition.Legacy);
  Route(10,0,26100,0,0xaa64,true,false,Edition.Unsupported);
  Route(10,0,26100,0,0,true,false,Edition.Unsupported);
  Check(LaunchPolicy.Quote("")=="\"\"","empty argument");
  Check(LaunchPolicy.Quote("a b")=="\"a b\"","spaces argument");
  Check(LaunchPolicy.Quote("a\"b")=="\"a\\\"b\"","quote argument");
  Check(LaunchPolicy.Quote("C:\\folder with spaces\\")=="\"C:\\folder with spaces\\\\\"","trailing backslash argument");
  string directory=Path.Combine(Path.GetTempPath(),"ChemoDose-Unified-Test-"+Guid.NewGuid().ToString("N")); Directory.CreateDirectory(directory);
  try {
   string path=Path.Combine(directory,"payload");
   byte[] bytes=Encoding.UTF8.GetBytes("fictional component\nno clinical data");
   string sha=PayloadStore.Hash(new MemoryStream(bytes));
   byte[] gzip;
   using(var memory=new MemoryStream()) { using(var compressed=new GZipStream(memory,CompressionMode.Compress,true)) compressed.Write(bytes,0,bytes.Length); gzip=memory.ToArray(); }
   PayloadStore.Expand(new MemoryStream(gzip),path,bytes.Length,sha);
   Check(PayloadStore.Matches(path,bytes.Length,sha),"extract bytes");
   File.WriteAllText(path,"changed");
   Check(!PayloadStore.Matches(path,bytes.Length,sha),"detect damaged cached component");
   PayloadStore.Expand(new MemoryStream(gzip),path,bytes.Length,sha);
   Check(PayloadStore.Matches(path,bytes.Length,sha),"repair cache");
   foreach(var pair in new[]{(bytes.Length-1,sha),(bytes.Length+1,sha),(bytes.Length,new string('0',64))}) {
    bool failed=false;
    try { PayloadStore.Expand(new MemoryStream(gzip),path,pair.Item1,pair.Item2); } catch(InvalidDataException) { failed=true; }
    Check(failed,"reject invalid declared component");
    Check(PayloadStore.Matches(path,bytes.Length,sha),"failed extraction retains original component");
   }
   Check(Directory.GetFiles(directory,"*.tmp").Length==0,"failed extraction removes temporary files");
   if(args.Length==2) Inspect(args[0],args[1],directory);
  } finally { Directory.Delete(directory,true); }
  Console.WriteLine(JsonSerializer.Serialize(new { passed=true, checks, note="Routing/extraction and PE checks; not native Windows or clinical validation." })); return 0;
 }
 static void Inspect(string executable,string manifest,string directory) {
  using(var json=JsonDocument.Parse(File.ReadAllText(manifest))) using(var stream=File.OpenRead(executable)) using(var pe=new PEReader(stream)) {
   Check(pe.PEHeaders.CoffHeader.Machine==Machine.I386,"x86 PE machine");
   Check(pe.PEHeaders.PEHeader.MajorSubsystemVersion==5 && pe.PEHeaders.PEHeader.MinorSubsystemVersion==1,"XP subsystem baseline");
   Check(pe.PEHeaders.CorHeader.Flags.HasFlag(CorFlags.Requires32Bit),"32-bit launcher");
   var metadata=pe.GetMetadataReader();
   Check(metadata.MetadataVersion.StartsWith("v4.0.30319"),"CLR4 image");
   foreach(var handle in metadata.AssemblyReferences) {
    string name=metadata.GetString(metadata.GetAssemblyReference(handle).Name);
    Check(name=="mscorlib" || name=="System" || name=="System.Core" || name=="System.Windows.Forms","only Framework4 references: "+name);
   }
   var resources=pe.GetSectionData(pe.PEHeaders.CorHeader.ResourcesDirectory.RelativeVirtualAddress).GetContent();
   int payloads=0;
   foreach(var handle in metadata.ManifestResources) {
    var resource=metadata.GetManifestResource(handle); string name=metadata.GetString(resource.Name);
    foreach(var expected in json.RootElement.GetProperty("payloads").EnumerateArray()) if(expected.GetProperty("resource").GetString()==name) {
     int offset=checked((int)resource.Offset); byte[] content=resources.ToArray(); int length=BitConverter.ToInt32(content,offset);
     string target=Path.Combine(directory,expected.GetProperty("name").GetString());
     PayloadStore.Expand(new MemoryStream(content,offset+4,length,false),target,expected.GetProperty("size").GetInt64(),expected.GetProperty("sha256").GetString());
     Check(PayloadStore.Matches(target,expected.GetProperty("size").GetInt64(),expected.GetProperty("sha256").GetString()),"bundled original bytes: "+name); payloads++;
    }
   }
   Check(payloads==json.RootElement.GetProperty("payloads").GetArrayLength(),"all embedded components inspected");
  }
 }
}
