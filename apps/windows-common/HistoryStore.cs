// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// C# 5 / .NET 4 compatible. Modern and compatibility modes share this file format.
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
namespace ChemoDose.Storage {
 public sealed class HistorySnapshot {
  public string Content,Revision;
  public HistorySnapshot(string content,string revision){Content=content;Revision=revision;}
 }
 public sealed class HistoryStore {
  public const int MaximumBytes=8*1024*1024;
  const string Empty="{\"schemaVersion\":1,\"autoSave\":true,\"records\":[]}";
  readonly string path,mutexName;
  public HistoryStore(string directory) {
   path=Path.Combine(directory,"history-v1.dat");
   mutexName="Local\\ChemoDoseHistory-"+Hash(Encoding.UTF8.GetBytes(Path.GetFullPath(path).ToUpperInvariant()));
  }
  static string Hash(byte[] bytes){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
  HistorySnapshot ReadUnlocked() {
   if(!File.Exists(path))return new HistorySnapshot(Empty,"missing");
   if(new FileInfo(path).Length>MaximumBytes+65536)throw new IOException("History file is too large.");
   byte[] sealedData=File.ReadAllBytes(path);
   if(sealedData.Length<5 || Encoding.ASCII.GetString(sealedData,0,4)!="CDH1")throw new IOException("Invalid history envelope.");
   byte[] encrypted=new byte[sealedData.Length-4];Buffer.BlockCopy(sealedData,4,encrypted,0,encrypted.Length);
   byte[] plain=Crypt(encrypted,false);
   try {if(plain.Length>MaximumBytes)throw new IOException("History file is too large.");return new HistorySnapshot(new UTF8Encoding(false,true).GetString(plain),Hash(sealedData));}
   finally {Array.Clear(plain,0,plain.Length);}
  }
  T Locked<T>(Func<T> action) {
   using(var mutex=new Mutex(false,mutexName)) {
    bool owned=false;
    try {try{owned=mutex.WaitOne(10000);}catch(AbandonedMutexException){owned=true;}
     if(!owned)throw new IOException("History is busy.");return action();
    } finally {if(owned)mutex.ReleaseMutex();}
   }
  }
  public HistorySnapshot Read(){return Locked(()=>ReadUnlocked());}
  public bool Write(string content,string expectedRevision) {
   if(content==null || content.Length>MaximumBytes)throw new IOException("History payload is too large.");
   byte[] plain=new UTF8Encoding(false,true).GetBytes(content);
   if(plain.Length>MaximumBytes){Array.Clear(plain,0,plain.Length);throw new IOException("History payload is too large.");}
   try {return Locked(()=>{
    var before=ReadUnlocked();if(before.Revision!=expectedRevision)return false;
    byte[] cipher=Crypt(plain,true),sealedData=new byte[cipher.Length+4];Buffer.BlockCopy(Encoding.ASCII.GetBytes("CDH1"),0,sealedData,0,4);Buffer.BlockCopy(cipher,0,sealedData,4,cipher.Length);
    Directory.CreateDirectory(Path.GetDirectoryName(path));string temp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
    try {using(var stream=new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.None)){stream.Write(sealedData,0,sealedData.Length);stream.Flush(true);}
     if(File.Exists(path))File.Replace(temp,path,null);else File.Move(temp,path);
    }finally{if(File.Exists(temp))File.Delete(temp);}return true;
   });}finally{Array.Clear(plain,0,plain.Length);}
  }
  [StructLayout(LayoutKind.Sequential)] struct Blob {public int Length;public IntPtr Data;}
  [DllImport("crypt32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool CryptProtectData(ref Blob input,string description,IntPtr entropy,IntPtr reserved,IntPtr prompt,int flags,out Blob output);
  [DllImport("crypt32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool CryptUnprotectData(ref Blob input,out IntPtr description,IntPtr entropy,IntPtr reserved,IntPtr prompt,int flags,out Blob output);
  [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
  static byte[] Crypt(byte[] input,bool protect) {
   var blob=new Blob {Length=input.Length,Data=Marshal.AllocHGlobal(input.Length)};var output=new Blob();IntPtr description=IntPtr.Zero;
   try {
    Marshal.Copy(input,0,blob.Data,input.Length);
    bool ok=protect?CryptProtectData(ref blob,"ChemoDose local history",IntPtr.Zero,IntPtr.Zero,IntPtr.Zero,1,out output):CryptUnprotectData(ref blob,out description,IntPtr.Zero,IntPtr.Zero,IntPtr.Zero,1,out output);
    if(!ok)throw new CryptographicException(Marshal.GetLastWin32Error());
    byte[] result=new byte[output.Length];Marshal.Copy(output.Data,result,0,result.Length);return result;
   }finally{
    for(int i=0;i<blob.Length;i++)Marshal.WriteByte(blob.Data,i,0);Marshal.FreeHGlobal(blob.Data);
    if(output.Data!=IntPtr.Zero)LocalFree(output.Data);if(description!=IntPtr.Zero)LocalFree(description);
   }
  }
 }
}
