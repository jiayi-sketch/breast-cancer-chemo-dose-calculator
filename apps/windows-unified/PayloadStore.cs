// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;

namespace ChemoDose.Unified {
 public static class PayloadStore {
  public static string Hash(Stream stream) {
   using(var sha=SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();
  }
  public static bool Matches(string path,long length,string sha) {
   if(!File.Exists(path) || new FileInfo(path).Length != length) return false;
   using(var stream=File.OpenRead(path)) return Hash(stream) == sha;
  }
  public static void Extract(Assembly assembly,string resource,string path,long length,string sha) {
   if(Matches(path,length,sha)) return;
   using(var raw=assembly.GetManifestResourceStream(resource)) {
    if(raw==null) throw new InvalidDataException("Missing bundled component: "+resource);
    Expand(raw,path,length,sha);
   }
  }
  public static void Expand(Stream raw,string path,long length,string sha) {
   string temp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
   try {
     using(var gzip=new GZipStream(raw,CompressionMode.Decompress)) using(var output=File.Create(temp)) {
      byte[] buffer=new byte[65536]; int read; long total=0;
      while((read=gzip.Read(buffer,0,buffer.Length))>0) {
       total+=read; if(total>length) throw new InvalidDataException("Bundled component exceeds its declared length.");
       output.Write(buffer,0,read);
      }
     }
    if(!Matches(temp,length,sha)) throw new InvalidDataException("Bundled component failed SHA256 verification.");
    if(File.Exists(path)) File.Delete(path);
    File.Move(temp,path);
   } finally { if(File.Exists(temp)) File.Delete(temp); }
  }
 }
}
