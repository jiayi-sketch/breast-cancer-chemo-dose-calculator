using System;
using System.IO;
using ChemoDose.Legacy;
class Program {
 static void Main(string[] args) {
  if(args[0]=="--inspect"){PeInspection.Run(args);return;}
  var bridge=new EngineBridge(File.ReadAllText(args[0]));
  foreach(var line in File.ReadLines(args[1])) {
   try { Console.WriteLine(bridge.Call(line)); }
   catch(Exception e){ Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new {exception=e.ToString()})); }
  }
 }
}
