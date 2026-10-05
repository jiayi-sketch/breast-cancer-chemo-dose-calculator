using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Reflection.PortableExecutable;
using System.Reflection.Metadata;
using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text.Json;
class PeInspection {
 public static void Run(string[] args) {
  using var file=File.OpenRead(args[1]);using var pe=new PEReader(file);var h=pe.PEHeaders;
  if(h.CoffHeader.Machine!=Machine.I386 || h.PEHeader.Magic!=PEMagic.PE32 || h.PEHeader.MajorSubsystemVersion!=5 || h.PEHeader.MinorSubsystemVersion!=1 || h.PEHeader.Subsystem!=Subsystem.WindowsGui || (h.CorHeader.Flags&CorFlags.Requires32Bit)==0)throw new Exception("XP x86 PE header mismatch");
  var reader=pe.GetMetadataReader();if(reader.MetadataVersion!="v4.0.30319")throw new Exception("CLR metadata mismatch");
  var block=pe.GetSectionData(h.CorHeader.ResourcesDirectory.RelativeVirtualAddress).GetContent().ToArray();var results=new List<object>();
  var expected=new Dictionary<string,string>{{"engine.js",Path.Combine(args[2],"apps/windows-legacy/engine.es5.js")},{"LICENSE.txt",Path.Combine(args[2],"LICENSE")},{"Jint-LICENSE.txt",Path.Combine(args[2],"apps/windows-legacy/licenses/Jint-LICENSE.txt")},{"Jint.dll",args[3]}};
  foreach(var handle in reader.ManifestResources){var r=reader.GetManifestResource(handle);if(!r.Implementation.IsNil)throw new Exception("External resource");string name=reader.GetString(r.Name);int offset=checked((int)r.Offset),length=BinaryPrimitives.ReadInt32LittleEndian(block.AsSpan(offset,4));var bytes=block.AsSpan(offset+4,length).ToArray();if(!bytes.SequenceEqual(File.ReadAllBytes(expected[name])))throw new Exception("Resource mismatch: "+name);results.Add(new{name,size=length,sha256=Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant()});expected.Remove(name);}
  if(expected.Count!=0)throw new Exception("Missing resource");
  var refs=reader.AssemblyReferences.Select(v=>reader.GetAssemblyReference(v)).Select(v=>new{name=reader.GetString(v.Name),version=v.Version.ToString()}).ToArray();if(refs.Any(v=>v.name!="Jint"&&v.version!="4.0.0.0"))throw new Exception("Newer framework reference");
  Console.WriteLine(JsonSerializer.Serialize(new{passed=true,architecture="x86",subsystemVersion="5.01",runtime=reader.MetadataVersion,version=reader.GetAssemblyDefinition().Version.ToString(),references=refs,resources=results}));
 }
}
