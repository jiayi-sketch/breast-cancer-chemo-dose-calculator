// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;
using System.IO;
using System.Reflection;
using System.Text;
using Jint;
namespace ChemoDose.Legacy {
 public sealed class EngineBridge {
  private readonly Engine engine;
  public EngineBridge(string source) {
   engine = new Engine(o => o.LimitRecursion(120).MaxStatements(4000000).TimeoutInterval(TimeSpan.FromSeconds(30)));
   engine.SetValue("normalizeNfkc",new Func<string,string>(s=>s.Normalize(NormalizationForm.FormKC)));
   engine.Execute(source);
  }
  public string Call(string json) {
   engine.SetValue("requestJson",json);
   engine.Execute("var responseJson=JSON.stringify(legacyCall(JSON.parse(requestJson))); requestJson=null;");
   string result=engine.GetValue("responseJson").AsString();
   engine.Execute("responseJson=null;");
   return result;
  }
  public static string Resource(string name) {
   using(var s=Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
   using(var r=new StreamReader(s,Encoding.UTF8))return r.ReadToEnd();
  }
 }
}
